/**
 * Mock runtime: request context, simulated network, audit chain and event bus.
 */
import type * as D from "@/types/domain";
import { simulation } from "@/services/config";
import { ApiError } from "@/services/errors";
import { randomHex, sleep, uid } from "@/lib/utils";
import { getDb, persist } from "./db";
import type { RequestContext } from "@/services/contracts";

let ctx: RequestContext | null = null;

export function setCtx(next: RequestContext) {
  ctx = next;
}

export function getCtx(): RequestContext {
  if (ctx) return ctx;
  const db = getDb();
  ctx = { tenantId: db.tenants[0].id, actor: db.personas[0] };
  return ctx;
}

const PROFILES = {
  fast: { read: [60, 160], write: [120, 260] },
  realistic: { read: [280, 720], write: [600, 1400] },
  slow: { read: [1200, 2200], write: [2000, 3600] },
} as const;

/** Wraps a handler with latency, failure injection, persistence and defensive cloning. */
export async function simulate<T>(op: string, fn: () => T | Promise<T>, kind: "read" | "write" = "read"): Promise<T> {
  const [min, max] = PROFILES[simulation.latency][kind];
  await sleep(min + Math.random() * (max - min));
  if (simulation.failureRate > 0 && Math.random() < simulation.failureRate) {
    throw new ApiError(
      kind === "write" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      kind === "write" ? `${op} timed out waiting for the upstream provider. No changes were applied. Retry is safe (idempotent).` : `Could not load ${op}. The service did not respond in time.`,
      { status: kind === "write" ? 504 : 503 },
    );
  }
  const result = await fn();
  if (kind === "write") persist();
  return result === undefined ? result : structuredClone(result);
}

export function notFound(what: string, id: string): never {
  throw new ApiError("NOT_FOUND", `${what} ${id} was not found.`, { status: 404 });
}

export function forbidden(message: string): never {
  throw new ApiError("FORBIDDEN", message, { status: 403 });
}

export function invalid(message: string, details?: Record<string, string>): never {
  throw new ApiError("VALIDATION_FAILED", message, { status: 422, details });
}

/* ------------------------------ audit chain ----------------------------- */

function chainHash(input: string) {
  // FNV-1a 64-bit folded into a 256-bit looking digest. Stand-in for SHA-256 on the server.
  let h1 = 0xcbf29ce4, h2 = 0x84222325;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193 + i) >>> 0;
  }
  const seg = (n: number) => n.toString(16).padStart(8, "0");
  return "0x" + [h1, h2, h1 ^ h2, (h1 + h2) >>> 0, h1 >>> 3, h2 >>> 5, (h1 * 31) >>> 0, (h2 * 17) >>> 0].map(seg).join("");
}

export function writeAudit(e: {
  action: string;
  objectType: string;
  objectId: string;
  reason: string;
  previousState?: string;
  newState?: string;
  approvedBy?: string;
  provider?: string;
  txHash?: string;
  system?: string;
}) {
  const db = getDb();
  const c = getCtx();
  const prevHash = db.audit[0]?.hash ?? "0x" + "0".repeat(64);
  const at = new Date().toISOString();
  const actor = e.system ? { name: e.system, role: "system" as const, organization: "SRH Inc" } : { name: c.actor.name, role: c.actor.role, organization: c.actor.organization };
  const body = JSON.stringify({ ...e, at, actor, prevHash });
  const ev: D.AuditEvent = {
    id: uid("aud"),
    tenantId: c.tenantId,
    at,
    actor,
    action: e.action,
    objectType: e.objectType,
    objectId: e.objectId,
    reason: e.reason,
    previousState: e.previousState,
    newState: e.newState,
    approvedBy: e.approvedBy,
    provider: e.provider,
    txHash: e.txHash,
    ip: e.system ? "10.20.0.1" : "94.200.13.77",
    prevHash,
    hash: chainHash(body),
  };
  db.audit.unshift(ev);
  return ev;
}

/* ------------------------------- event bus ------------------------------ */

type Listener = (e: D.PlatformEvent) => void;
const listeners = new Set<Listener>();

export function onEvent(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emit(e: Omit<D.PlatformEvent, "id" | "at">) {
  const db = getDb();
  const ev: D.PlatformEvent = { ...e, id: uid("evt"), at: new Date().toISOString() };
  db.events.unshift(ev);
  if (db.events.length > 200) db.events.length = 200;
  persist();
  listeners.forEach((l) => {
    try {
      l(structuredClone(ev));
    } catch {
      /* listener errors must not break the engine */
    }
  });
  return ev;
}

export const txHash = () => "0x" + randomHex(64);
