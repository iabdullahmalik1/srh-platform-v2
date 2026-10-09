/**
 * In-browser mock database seeded from src/mocks/data/*.json.
 * Mutations persist to localStorage so a demo survives reloads. Reset from Settings > Simulation.
 */
import type * as D from "@/types/domain";
import { evaluateEligibility } from "./rules";

import tenants from "@/mocks/data/tenants.json";
import personas from "@/mocks/data/personas.json";
import jurisdictions from "@/mocks/data/jurisdictions.json";
import providers from "@/mocks/data/providers.json";
import investors from "@/mocks/data/investors.json";
import issuers from "@/mocks/data/issuers.json";
import assets from "@/mocks/data/assets.json";
import tokenClasses from "@/mocks/data/tokenClasses.json";
import offerings from "@/mocks/data/offerings.json";
import orders from "@/mocks/data/orders.json";
import payments from "@/mocks/data/payments.json";
import holdings from "@/mocks/data/holdings.json";
import distributions from "@/mocks/data/distributions.json";
import corporateActions from "@/mocks/data/corporateActions.json";
import reconBreaks from "@/mocks/data/reconBreaks.json";
import reconRuns from "@/mocks/data/reconRuns.json";
import ledger from "@/mocks/data/ledger.json";
import policyPacks from "@/mocks/data/policyPacks.json";
import screeningAlerts from "@/mocks/data/screeningAlerts.json";
import custodyAccounts from "@/mocks/data/custodyAccounts.json";
import approvals from "@/mocks/data/approvals.json";
import marketOrders from "@/mocks/data/marketOrders.json";
import trades from "@/mocks/data/trades.json";
import defiPositions from "@/mocks/data/defiPositions.json";
import audit from "@/mocks/data/audit.json";
import events from "@/mocks/data/events.json";
import internalRules from "@/mocks/data/internalRules.json";

export interface MockDb {
  version: number;
  tenants: D.Tenant[];
  personas: D.Persona[];
  jurisdictions: D.Jurisdiction[];
  providers: D.Provider[];
  investors: D.Investor[];
  issuers: D.Issuer[];
  assets: D.Asset[];
  tokenClasses: D.TokenClass[];
  offerings: D.Offering[];
  orders: D.Order[];
  payments: D.Payment[];
  holdings: D.Holding[];
  distributions: D.Distribution[];
  corporateActions: D.CorporateAction[];
  reconBreaks: D.ReconciliationBreak[];
  reconRuns: D.ReconciliationRun[];
  ledger: D.LedgerEntry[];
  policyPacks: D.PolicyPack[];
  screeningAlerts: D.ScreeningAlert[];
  custodyAccounts: D.CustodyAccount[];
  approvals: D.Approval[];
  marketOrders: D.MarketOrder[];
  trades: D.Trade[];
  defiPositions: D.DefiPosition[];
  audit: D.AuditEvent[];
  events: D.PlatformEvent[];
  internalRules: D.InternalRules;
  /** Investor home layout, per investor id. */
  homeLayouts: Record<string, D.HomeLayout>;
}

const DB_VERSION = 1;
const STORAGE_KEY = "srh2.mockdb";

function seed(): MockDb {
  const s = {
    version: DB_VERSION,
    tenants, personas, jurisdictions, providers, investors, issuers, assets, tokenClasses, offerings, orders, payments, holdings,
    distributions, corporateActions, reconBreaks, reconRuns, ledger, policyPacks, screeningAlerts, custodyAccounts, approvals,
    marketOrders, trades, defiPositions, audit, events, internalRules, homeLayouts: {},
  } as unknown as MockDb;
  const out = structuredClone(s);
  backfillEligibility(out);
  return out;
}

/**
 * Seed orders that are past intake carry the decision that let them through, evaluated against the
 * live policy packs with the position as it stood at order time. Only a decision that agrees with the
 * order's recorded outcome is attached, so history never contradicts itself.
 */
function backfillEligibility(d: MockDb) {
  const expected = (o: D.Order): D.Decision => (o.status === "rejected" ? "REJECT" : o.status === "manual-review" ? "MANUAL_REVIEW" : "ALLOW");
  for (const o of d.orders) {
    if (o.eligibility || (o.stage === "submitted" && o.status === "active")) continue;
    const investor = d.investors.find((i) => i.id === o.investorId);
    const asset = d.assets.find((a) => a.id === o.assetId);
    if (!investor || !asset) continue;
    const live = d.offerings.find((x) => x.id === o.offeringId);
    // The offering as it stood when the order came in: open, with room for this ticket.
    const offering = live && { ...live, status: "open" as const, subscribed: Math.max(0, Math.min(live.subscribed, live.target - o.amount)) };
    const wallet = investor.wallets.find((w) => w.chain === o.chain) ?? investor.wallets[0];
    const tc = d.tokenClasses.find((t) => t.assetId === asset.id);
    const packs = d.policyPacks.filter((p) => asset.policyPackIds.includes(p.id) && p.status === "active");
    let r = evaluateEligibility({ investor, asset, offering, amount: o.amount, wallet, packs, existingTokens: 0, maxSupply: tc?.maxSupply ?? tc?.canonicalSupply });
    // An order that went on past eligibility had its review items cleared by compliance at the time.
    if (r.decision === "MANUAL_REVIEW" && expected(o) === "ALLOW") {
      r = { ...r, decision: "ALLOW", checks: r.checks.map((c) => (c.outcome === "review" ? { ...c, outcome: "pass" as const, detail: `${c.detail}. Cleared by compliance` } : c)) };
    }
    if (r.decision !== expected(o)) continue;
    const at = o.history.find((h) => h.stage === "eligibility")?.at ?? o.createdAt;
    o.eligibility = { ...r, id: `elg_${o.id.slice(4)}`, evaluatedAt: at, durationMs: 40 + (o.amount % 37) };
  }
}

let db: MockDb | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getDb(): MockDb {
  if (db) return db;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDb;
        if (parsed.version === DB_VERSION) {
          db = parsed;
          return db;
        }
      }
    } catch {
      /* storage unavailable or corrupted: fall back to seed */
    }
  }
  db = seed();
  return db;
}

export function persist() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* quota exceeded or private mode: keep in memory only */
    }
  }, 250);
}

export function resetDb() {
  db = seed();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
