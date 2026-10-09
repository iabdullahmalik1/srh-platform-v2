import { apiConfig } from "@/services/config";
import { ApiError, type ApiErrorCode } from "@/services/errors";
import type { RequestContext } from "@/services/contracts";
import { uid } from "@/lib/utils";

let context: RequestContext | null = null;
let tokenProvider: () => Promise<string | null> = async () => null;

export function setHttpContext(ctx: RequestContext) {
  context = ctx;
}

/** Plug in the real auth (OIDC, session cookie, etc). */
export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

type Query = Record<string, string | number | boolean | undefined>;

function toQuery(q?: Query) {
  if (!q) return "";
  const s = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v !== undefined && v !== "" && s.set(k, String(v)));
  const str = s.toString();
  return str ? `?${str}` : "";
}

const STATUS_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "FORBIDDEN",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  502: "UPSTREAM_UNAVAILABLE",
  503: "UPSTREAM_UNAVAILABLE",
  504: "UPSTREAM_TIMEOUT",
};

export async function request<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, opts?: { query?: Query; body?: unknown; idempotent?: boolean }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
  const token = await tokenProvider();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (context) {
    headers["X-Tenant-Id"] = context.tenantId;
    headers["X-Acting-Role"] = context.actor.role;
  }
  // Every mutation carries an idempotency key so retries are safe.
  if (method !== "GET") headers["Idempotency-Key"] = uid("idem");
  try {
    const res = await fetch(`${apiConfig.baseUrl}${path}${toQuery(opts?.query)}`, {
      method,
      headers,
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      credentials: "include",
    });
    const requestId = res.headers.get("X-Request-Id") ?? undefined;
    if (!res.ok) {
      let payload: { code?: ApiErrorCode; message?: string; details?: Record<string, string> } = {};
      try {
        payload = await res.json();
      } catch {
        /* non JSON error body */
      }
      throw new ApiError(payload.code ?? STATUS_CODE[res.status] ?? "UNKNOWN", payload.message ?? `Request failed with status ${res.status}`, { status: res.status, details: payload.details, requestId });
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") throw new ApiError("UPSTREAM_TIMEOUT", "The request timed out.", { status: 504 });
    throw new ApiError("NETWORK", "Network error. Check your connection and try again.", { status: 0 });
  } finally {
    clearTimeout(timer);
  }
}

export const http = {
  get: <T,>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T,>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  put: <T,>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  del: <T,>(path: string) => request<T>("DELETE", path),
};
