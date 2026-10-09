/**
 * Mock implementation of PlatformApi. Every method:
 *   1. runs through simulate() for latency and optional failure injection
 *   2. enforces tenant scoping and role permissions the way the backend will
 *   3. writes an audit record and emits platform events for state changes
 */
import type * as D from "@/types/domain";
import type { ListParams, MarketOrderInput, PlatformApi, RequestContext, VerificationAction } from "@/services/contracts";
import { ApiError } from "@/services/errors";
import { MODULE_META, ROLE_META, ROLE_PERMISSIONS, type Permission } from "@/lib/constants";
import { fmt, randomHex, sum, uid } from "@/lib/utils";
import { getDb, persist } from "./db";
import { PERSONA_INVESTOR } from "@/lib/directory";
import { emit, forbidden, getCtx, invalid, notFound, onEvent, setCtx, simulate, txHash, writeAudit } from "./runtime";
import { evaluateCapability, evaluateEligibility } from "./rules";
import { advanceNow, mintTokens, schedule, startEngine } from "./engine";
import { assetRisk } from "@/lib/risk";
import { priceAtYield } from "@/lib/debt";


function requirePermission(p: Permission) {
  const { actor } = getCtx();
  if (!ROLE_PERMISSIONS[actor.role].includes(p)) {
    forbidden(`${ROLE_META[actor.role].label} role cannot perform this action (${p}).`);
  }
}

const tenantId = () => getCtx().tenantId;
const tenantAssets = () => getDb().assets.filter((a) => a.tenantId === tenantId());
const tenantAssetIds = () => new Set(tenantAssets().map((a) => a.id));
const scopedInvestorId = () => PERSONA_INVESTOR[getCtx().actor.id];

/** Writes to a module the tenant has not licensed are refused, like the backend's entitlement check. */
function requireModule(m: D.ModuleKey) {
  const t = getDb().tenants.find((x) => x.id === tenantId());
  if (t && !t.modules.includes(m)) forbidden(`${MODULE_META[m].label} is not enabled for ${t.name}.`);
}

/** Records of another tenant are reported as not found, because the backend scopes every query by tenant. */
function inTenant<T extends { tenantId: D.ID }>(what: string, id: D.ID, rec: T | undefined): T {
  if (!rec || rec.tenantId !== tenantId()) notFound(what, id);
  return rec;
}
const findAsset = (id: D.ID) => inTenant("Asset", id, getDb().assets.find((a) => a.id === id));
const findInvestor = (id: D.ID) => inTenant("Investor", id, getDb().investors.find((i) => i.id === id));
const findOrder = (id: D.ID) => inTenant("Order", id, getDb().orders.find((o) => o.id === id));
function findTokenClass(id: D.ID) {
  const tc = getDb().tokenClasses.find((t) => t.id === id);
  if (!tc || !tenantAssetIds().has(tc.assetId)) notFound("Token class", id);
  return tc;
}
function inTenantAsset<T extends { assetId: D.ID }>(what: string, id: D.ID, rec: T | undefined): T {
  if (!rec || !tenantAssetIds().has(rec.assetId)) notFound(what, id);
  return rec;
}

/** An investor signed in to the portal reads and acts only for its own investor record. */
function requireSelf(investorId: D.ID) {
  const own = scopedInvestorId();
  if (own && investorId !== own) forbidden("Investors can only view and act on their own account.");
}

/** Back-office records are not exposed to the investor portal. */
function staffOnly() {
  if (scopedInvestorId()) forbidden("This information is not available in the investor portal.");
}

/** Investors see public documents, and token-holder documents only for products they hold. Internal documents stay in the back office. */
function forViewer(raw: D.Asset): D.Asset {
  const a = { ...raw, riskProfile: assetRisk(raw, getDb().internalRules?.riskBands) };
  const own = scopedInvestorId();
  if (!own) return a;
  const holds = getDb().holdings.some((h) => h.investorId === own && h.assetId === a.id);
  return { ...a, documents: a.documents.filter((d) => (d.visibility ?? "holders") === "public" || ((d.visibility ?? "holders") === "holders" && holds)) };
}

/** Other participants stay anonymous to an investor, as on any regulated venue. */
const MASKED = "Market participant";
const maskName = (name: string) => (scopedInvestorId() && name !== getCtx().actor.name ? MASKED : name);

/** Events an investor may see: only those about the investor's own orders and trades. */
function visibleEvent(e: D.PlatformEvent) {
  const own = scopedInvestorId();
  if (!own) return true;
  const db = getDb();
  if (e.objectType === "Order") return db.orders.some((o) => o.id === e.objectId && o.investorId === own);
  if (e.objectType === "Trade") return db.trades.some((t) => t.id === e.objectId && (t.buyer === getCtx().actor.name || t.seller === getCtx().actor.name));
  return false;
}

function matches(text: string, search?: string) {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

function paginate<T>(items: T[], p?: ListParams): D.Paginated<T> {
  const page = p?.page ?? 1;
  const pageSize = p?.pageSize ?? 25;
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

function dashboard(): D.DashboardSummary {
  const db = getDb();
  const tid = tenantId();
  const assets = db.assets.filter((a) => a.tenantId === tid);
  const ids = new Set(assets.map((a) => a.id));
  const live = assets.filter((a) => a.status === "live");
  const aum = sum(live, (a) => a.aum * (a.valuation.currency === "SAR" ? 0.2666 : 1));
  const investors = db.investors.filter((i) => i.tenantId === tid);
  const orders = db.orders.filter((o) => o.tenantId === tid);
  const now = Date.now();
  const months = 12;
  const aumSeries = Array.from({ length: months }, (_, k) => {
    const t = now - (months - 1 - k) * 30 * 86_400_000;
    const growth = Math.pow((k + 1) / months, 1.35);
    return { date: new Date(t).toISOString(), value: Math.round(aum * (0.18 + 0.82 * growth) * (1 + Math.sin(k * 1.7) * 0.015)) };
  });
  aumSeries[aumSeries.length - 1].value = Math.round(aum);
  const volumeSeries = Array.from({ length: 14 }, (_, k) => {
    const day = now - (13 - k) * 86_400_000;
    const dayOrders = orders.filter((o) => Math.abs(new Date(o.createdAt).getTime() - day) < 43_200_000 && o.status !== "rejected");
    const base = sum(dayOrders, (o) => o.amount);
    return { date: new Date(day).toISOString(), primary: Math.round(base + aum * 0.0012 * (1.2 + Math.sin(k))), secondary: Math.round(aum * 0.0006 * (1.1 + Math.cos(k * 1.3))) };
  });
  const byTemplate = new Map<D.AssetTemplate, number>();
  live.forEach((a) => byTemplate.set(a.template, (byTemplate.get(a.template) ?? 0) + a.aum * (a.valuation.currency === "SAR" ? 0.2666 : 1)));
  const byChain = new Map<D.Chain, number>();
  db.tokenClasses.filter((t) => ids.has(t.assetId)).forEach((t) => {
    const nav = db.assets.find((a) => a.id === t.assetId)!.valuation.navPerToken;
    t.deployments.forEach((d) => byChain.set(d.chain, (byChain.get(d.chain) ?? 0) + d.supply * nav));
  });
  const pipeline = { submitted: 0, eligibility: 0, "payment-instructed": 0, "payment-confirmed": 0, allocated: 0, settled: 0, minted: 0, reconciled: 0 } as Record<D.OrderStage, number>;
  orders.filter((o) => o.status === "active" || o.status === "exception" || o.status === "manual-review").forEach((o) => pipeline[o.stage]++);
  pipeline.reconciled = orders.filter((o) => o.stage === "reconciled" && now - new Date(o.updatedAt).getTime() < 7 * 86_400_000).length;
  return {
    aumUsd: aum,
    aumChangePct: 6.4,
    liveAssets: live.length,
    investors: investors.length,
    verifiedInvestors: investors.filter((i) => i.kycStatus === "approved").length,
    openOrders: orders.filter((o) => o.status === "active" || o.status === "manual-review" || o.status === "exception").length,
    pendingApprovals: db.approvals.filter((a) => a.tenantId === tid && a.status === "pending").length,
    openAlerts: db.screeningAlerts.filter((a) => (a.status === "open" || a.status === "escalated") && investors.some((i) => i.id === a.investorId)).length,
    openBreaks: db.reconBreaks.filter((b) => ids.has(b.assetId) && b.status !== "resolved").length,
    settledVolume30d: sum(orders.filter((o) => o.stage === "reconciled" && now - new Date(o.updatedAt).getTime() < 30 * 86_400_000), (o) => o.amount),
    distributions90d: sum(db.distributions.filter((d) => ids.has(d.assetId) && d.status === "paid" && now - new Date(d.paymentDate).getTime() < 90 * 86_400_000), (d) => d.netAmount),
    aumSeries,
    volumeSeries,
    aumByTemplate: [...byTemplate.entries()].map(([template, value]) => ({ template, value })).sort((a, b) => b.value - a.value),
    supplyByChain: [...byChain.entries()].map(([chain, value]) => ({ chain, value })).sort((a, b) => b.value - a.value),
    pipeline,
  };
}

/* ------------------------------ approvals ------------------------------- */

/** When the requester holds the first step's role, the request itself is that step (maker). Every later step needs someone else (checker). */
function withMakerStep(steps: D.ApprovalStep[]): D.ApprovalStep[] {
  const { actor } = getCtx();
  if (steps[0]?.role !== actor.role) return steps;
  return [{ ...steps[0], approver: actor.name, decision: "approved", at: new Date().toISOString(), comment: "Raised the request" }, ...steps.slice(1)];
}

function executeApproval(ap: D.Approval) {
  const db = getDb();
  ap.status = "executed";
  const needsChain = ["mint", "burn", "pause", "freeze", "forced-transfer", "treasury-movement", "config-change"].includes(ap.type);
  if (needsChain) ap.txHash = txHash();
  const approvers = ap.steps.map((s) => s.approver).filter(Boolean).join(", ");

  if (ap.type === "mint" && ap.payload.orderId) {
    const o = db.orders.find((x) => x.id === ap.payload.orderId);
    if (o && o.stage === "settled") {
      mintTokens(o, approvers);
      schedule(o.id);
    }
  } else if (ap.type === "mint" || ap.type === "burn") {
    const tc = db.tokenClasses.find((t) => t.id === ap.objectId);
    const amt = Number(String(ap.payload.amount).replace(/,/g, "")) || 0;
    if (tc) {
      const dep = tc.deployments.find((d) => d.chain === ap.payload.chain) ?? tc.deployments[0];
      const delta = ap.type === "mint" ? amt : -amt;
      tc.canonicalSupply += delta;
      dep.supply += delta;
    }
  } else if (ap.type === "pause") {
    const tc = db.tokenClasses.find((t) => t.id === ap.objectId);
    if (tc) {
      const dep = tc.deployments.find((d) => d.chain === ap.payload.chain);
      if (dep) dep.status = dep.status === "paused" ? "live" : "paused";
      else tc.status = tc.status === "paused" ? "active" : "paused";
      if (tc.deployments.every((d) => d.status === "paused")) tc.status = "paused";
    }
  } else if (ap.type === "freeze") {
    db.holdings.filter((h) => h.investorId === ap.objectId || h.walletAddress === ap.payload.wallet).forEach((h) => (h.frozen = true));
  } else if (ap.type === "config-change" && ap.payload.deployChain) {
    const tc = db.tokenClasses.find((t) => t.id === ap.objectId);
    if (tc && !tc.deployments.some((d) => d.chain === ap.payload.deployChain)) {
      const chain = ap.payload.deployChain as D.Chain;
      tc.deployments.push({ id: uid("dep"), chain, contractAddress: chain === "solana" ? randomHex(44) : "0x" + randomHex(40), supply: 0, holders: 0, status: "live", deployedAt: new Date().toISOString(), lastBlock: 1, gasSpendUsd: 312.4 });
    }
  } else if (ap.type === "distribution") {
    const d = db.distributions.find((x) => x.id === ap.objectId);
    if (d) {
      d.status = "paying";
      setTimeout(() => {
        d.status = "paid";
        d.paidCount = d.holdersCount;
        const asset = db.assets.find((a) => a.id === d.assetId);
        db.payments.unshift({ id: uid("pay"), tenantId: asset?.tenantId ?? tenantId(), direction: "outbound", purpose: "distribution", rail: d.rail, amount: d.netAmount, currency: d.currency, status: "confirmed", reference: "DST-" + randomHex(6).toUpperCase(), counterparty: `${d.holdersCount} holders`, bank: "Emirates NBD", provider: "Emirates NBD", createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString() });
        writeAudit({ action: "distribution.paid", objectType: "Distribution", objectId: d.id, reason: `Paid to ${d.holdersCount} holders`, previousState: "paying", newState: "paid", system: "Distribution engine" });
        emit({ type: "distribution.paid", title: "Distribution paid", detail: `${asset?.shortName} · ${fmt.money(d.netAmount, d.currency)} to ${d.holdersCount} holders`, objectType: "Distribution", objectId: d.id, href: "/servicing", severity: "success" });
        persist();
      }, 3500);
    }
  } else if (ap.type === "verification-override") {
    const inv = db.investors.find((i) => i.id === ap.objectId);
    if (inv) applyVerification(inv, ap.payload.item as D.VerificationKey, ap.payload.action === "waive" ? "waive" : "approve", String(ap.payload.reason ?? ap.summary), approvers);
  } else if (ap.type === "manual-valuation") {
    const a = db.assets.find((x) => x.id === ap.objectId);
    const to = Number(ap.payload.to);
    if (a && to > 0) {
      const supply = sum(db.tokenClasses.filter((t) => t.assetId === a.id), (t) => t.canonicalSupply);
      a.valuation.navPerToken = to;
      if (supply) a.valuation.nav = Math.round(to * supply);
      if (a.status === "live") a.aum = a.valuation.nav;
      a.valuation.lastUpdated = new Date().toISOString();
      a.navHistory = [...a.navHistory, { date: a.valuation.lastUpdated, nav: to }];
      db.corporateActions.unshift({ id: uid("ca"), assetId: a.id, kind: "nav-update", title: `Valuation updated to ${to}`, status: "executed", effectiveDate: a.valuation.lastUpdated, detail: `Source: ${ap.payload.source}. Entered and checked through the valuation desk.` });
      emit({ type: "nav.updated", title: "Valuation published", detail: `${a.shortName} ${fmt.money(to, a.valuation.currency)} per unit`, objectType: "Asset", objectId: a.id, href: `/assets/${a.id}`, severity: "info" });
    }
  } else if (ap.type === "listing-override") {
    const a = db.assets.find((x) => x.id === ap.objectId);
    if (a) {
      a.status = ap.payload.to as D.AssetStatus;
      if (a.status === "live" && !a.launchedAt) a.launchedAt = new Date().toISOString();
    }
  } else if (ap.type === "asset-launch") {
    const a = db.assets.find((x) => x.id === ap.objectId);
    if (a) a.status = "approved";
  } else if (ap.type === "policy-change") {
    const pack = db.policyPacks.find((p) => p.id === ap.objectId);
    const r = pack?.rules.find((x) => x.code === ap.payload.rule);
    if (pack && r && r.params) {
      r.params.maxScore = Number(ap.payload.to);
      pack.version = pack.version.replace(/\.(\d+)\.(\d+)$/, (_m, a, b) => `.${Number(a) + 1}.0`);
      pack.updatedAt = new Date().toISOString();
    }
  }
  writeAudit({ action: "approval.executed", objectType: ap.objectType, objectId: ap.objectId, reason: ap.title, previousState: "approved", newState: "executed", approvedBy: approvers, txHash: ap.txHash, system: "Approval workflow", provider: needsChain ? "Thales Luna HSM" : undefined });
  emit({ type: "approval.completed", title: "Approval executed", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "success" });
}

/** Pre-trade compliance for a secondary order. The order ticket shows it, and placing or executing re-runs it. */
function runPreTrade(input: MarketOrderInput): D.PreTradeCheck {
  const db = getDb();
  requireSelf(input.investorId);
  const tc = findTokenClass(input.tokenClassId);
  const a = db.assets.find((x) => x.id === tc.assetId)!;
  const inv = findInvestor(input.investorId);
  const tenant = db.tenants.find((t) => t.id === a.tenantId)!;
  const held = sum(db.holdings.filter((h) => h.investorId === inv.id && h.tokenClassId === tc.id), (h) => h.quantity);
  const locked = db.holdings.some((h) => h.investorId === inv.id && h.tokenClassId === tc.id && h.lockedUntil && new Date(h.lockedUntil) > new Date());
  const frozen = db.holdings.some((h) => h.investorId === inv.id && h.tokenClassId === tc.id && h.frozen);
  const elig = evaluateEligibility({ investor: inv, asset: a, packs: db.policyPacks.filter((p) => a.policyPackIds.includes(p.id) && p.status === "active"), existingTokens: input.side === "buy" ? held : 0, amount: input.side === "buy" ? input.quantity * input.price : undefined, maxSupply: tc.canonicalSupply });
  const venue = evaluateCapability({ tenantId: tenant.id, capability: "secondary-trading", assetId: a.id, investorCategory: inv.classification, tradingModel: input.type === "rfq" ? "rfq" : input.venue === "otc" ? "otc" : "order-book" }, tenant, a);
  const checks: D.PreTradeCheck["checks"] = [
    { name: input.side === "buy" ? "Buyer eligibility" : "Seller eligibility", outcome: elig.decision === "ALLOW" ? "pass" : elig.decision === "REJECT" ? "fail" : "review", detail: elig.checks.find((c) => c.outcome !== "pass")?.detail ?? `${elig.checks.length} rules passed` },
    { name: "Jurisdiction", outcome: a.rules.blockedCountries.includes(inv.residency) ? "fail" : "pass", detail: `Residency ${inv.residency}` },
    { name: "Transfer restrictions", outcome: frozen ? "fail" : "pass", detail: frozen ? "Position is frozen" : "No restrictions on position" },
    { name: "Lock-up", outcome: input.side === "sell" && locked ? "fail" : "pass", detail: input.side === "sell" && locked ? "Position is within its lock-up period" : "Not in lock-up" },
    { name: "Holding limits", outcome: elig.checks.find((c) => c.ruleCode === "P-021")?.outcome ?? "pass", detail: elig.checks.find((c) => c.ruleCode === "P-021")?.detail ?? "Within limit" },
    { name: "Sufficient balance", outcome: input.side === "sell" && held < input.quantity ? "fail" : "pass", detail: input.side === "sell" ? `Holds ${fmt.num(held)} ${tc.symbol}` : "Not applicable to buy orders" },
    { name: "Venue permissions", outcome: venue.decision === "ENABLE" ? "pass" : venue.decision === "REJECT" ? "fail" : "review", detail: venue.steps[venue.steps.length - 1].detail },
    { name: "Wallet eligibility", outcome: inv.wallets.some((w) => w.whitelisted && w.riskScore < 60) ? "pass" : "fail", detail: inv.wallets.some((w) => w.whitelisted) ? "Whitelisted wallet available" : "No whitelisted wallet" },
  ];
  const decision: D.Decision = checks.some((c) => c.outcome === "fail") ? "REJECT" : checks.some((c) => c.outcome === "review") ? "MANUAL_REVIEW" : "ALLOW";
  return { decision, checks };
}

/** Placing or executing re-runs the pre-trade check on the server; a failed check is refused. */
function requirePreTrade(input: MarketOrderInput) {
  const check = runPreTrade(input);
  if (check.decision === "REJECT") {
    const failed = check.checks.filter((c) => c.outcome === "fail").map((c) => `${c.name}: ${c.detail}`).join("; ");
    throw new ApiError("POLICY_REJECTED", `The pre-trade check rejected this order. ${failed}.`, { status: 422 });
  }
  return check;
}

/* ------------------------- verification overrides ----------------------- */

/** Items where a manual override carries more risk and, by internal rule, needs a second approver. */
const HIGH_RISK_ITEMS: D.VerificationKey[] = ["sanctions", "pep", "wallet-risk", "source-of-funds", "identity-document", "beneficial-owners"];
const CLEAR: D.VerificationStatus[] = ["passed", "waived", "overridden"];

function refreshProfile(inv: D.Investor) {
  if (!inv.verification) return;
  inv.profileComplete = inv.verification.every((v) => CLEAR.includes(v.status));
}

function applyVerification(inv: D.Investor, key: D.VerificationKey, action: "approve" | "waive", reason: string, by: string) {
  const item = inv.verification?.find((v) => v.key === key) ?? notFound("Verification item", key);
  const prev = item.status;
  item.status = action === "approve" ? "overridden" : "waived";
  item.overriddenBy = by;
  item.overrideReason = reason;
  item.at = new Date().toISOString();
  item.pendingApprovalId = undefined;
  if (key === "address") inv.documents.filter((d) => d.kind === "proof-of-address" && d.status !== "verified").forEach((d) => (d.status = action === "approve" ? "verified" : "waived"));
  if (key === "bank-account") inv.documents.filter((d) => d.kind === "bank-statement" && d.status === "rejected").forEach((d) => (d.status = "verified"));
  refreshProfile(inv);
  writeAudit({ action: `verification.${action === "approve" ? "overridden" : "waived"}`, objectType: "Investor", objectId: inv.id, reason: `${item.label}: ${reason}`, previousState: prev, newState: item.status, approvedBy: by });
  emit({ type: "screening.alert", title: action === "approve" ? "Verification approved manually" : "Verification waived", detail: `${inv.name} · ${item.label}`, objectType: "Investor", objectId: inv.id, href: `/identity/investors/${inv.id}`, severity: "info" });
  return item;
}

/** The checklist a new account starts with. Anything the applicant skipped is "missing" and shows in the back office. */
function initialVerification(input: D.NewInvestorInput): D.VerificationItem[] {
  const skipped = new Set(input.skipped ?? []);
  const st = (k: D.VerificationKey): D.VerificationStatus => (skipped.has(k) ? "missing" : "pending");
  const kyb = input.type === "entity";
  const items: [D.VerificationKey, string][] = kyb
    ? [["company-registry", "Company registry record"], ["company-documents", "Company documents"], ["beneficial-owners", "Beneficial owners identified and verified"], ["directors", "Directors verified"], ["signatories", "Authorised signatories verified"], ["bank-account", "Settlement bank account"], ["sanctions", "Sanctions screening (entity and owners)"], ["pep", "PEP screening of owners"], ["wallet-risk", "Wallet risk"]]
    : [["identity-document", `${input.idDocumentLabel ?? "Identity document"} verified`], ["liveness", "Liveness and face match"], ["address", "Proof of address"], ["bank-account", "Bank account in investor's name"], ["source-of-funds", "Source of funds"], ["sanctions", "Sanctions screening"], ["pep", "PEP screening"], ["adverse-media", "Adverse media"], ["wallet-risk", "Wallet risk"], ["classification", "Investor classification"]];
  return items
    .filter(([k]) => k !== "wallet-risk" || !!input.wallet)
    .map(([key, label]) => ({ key, label, status: st(key), detail: skipped.has(key) ? "Not provided at registration" : undefined }));
}

const usdRate = (c: D.Currency) => ({ USD: 1, AED: 0.2723, SAR: 0.2666, GBP: 1.27, EUR: 1.08, SGD: 0.74, PKR: 0.0036 })[c] ?? 1;

/* ------------------------------- adapter -------------------------------- */

export const mockAdapter: PlatformApi = {
  setContext(next: RequestContext) {
    setCtx(next);
    startEngine();
  },

  platform: {
    listTenants: () => simulate("tenants", () => getDb().tenants),
    getTenant: (id) => simulate("tenant", () => getDb().tenants.find((t) => t.id === id) ?? notFound("Tenant", id)),
    updateModules: (id, modules) =>
      simulate("modules", () => {
        requirePermission("platform.configure");
        const t = getDb().tenants.find((x) => x.id === id) ?? notFound("Tenant", id);
        const prev = t.modules.join(", ");
        t.modules = modules;
        writeAudit({ action: "tenant.modules_updated", objectType: "Tenant", objectId: id, reason: "Module entitlement change", previousState: prev, newState: modules.join(", ") });
        return t;
      }, "write"),
    updateBrand: (id, patch) =>
      simulate("brand", () => {
        requirePermission("platform.configure");
        const t = getDb().tenants.find((x) => x.id === id) ?? notFound("Tenant", id);
        const { name, domain, ...brand } = patch;
        if (name) t.name = name;
        if (domain) t.domain = domain;
        t.brand = { ...t.brand, ...brand };
        writeAudit({ action: "tenant.brand_updated", objectType: "Tenant", objectId: id, reason: "White-label branding updated", newState: JSON.stringify(patch) });
        return t;
      }, "write"),
    createApiKey: (label, scopes) =>
      simulate("api key", () => {
        requirePermission("platform.configure");
        const t = getDb().tenants.find((x) => x.id === tenantId())!;
        const secret = `${t.shortName.toLowerCase()}_live_${randomHex(32)}`;
        t.apiKeys.unshift({ id: uid("key"), label, prefix: secret.slice(0, 13), scopes, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() });
        writeAudit({ action: "apikey.created", objectType: "ApiKey", objectId: t.apiKeys[0].id, reason: label, newState: scopes.join(" ") });
        return { key: secret, tenant: t };
      }, "write"),
    listPersonas: () => simulate("personas", () => getDb().personas),
    listJurisdictions: () => simulate("jurisdictions", () => getDb().jurisdictions),
    checkCapability: (req) =>
      simulate("capability", () => {
        const db = getDb();
        const t = db.tenants.find((x) => x.id === req.tenantId) ?? notFound("Tenant", req.tenantId);
        const a = db.assets.find((x) => x.id === req.assetId) ?? notFound("Asset", req.assetId);
        const r = evaluateCapability(req, t, a);
        writeAudit({ action: "capability.evaluated", objectType: "Tenant", objectId: t.id, reason: `${req.capability} for ${a.shortName}`, newState: r.decision, system: "Regulatory capability engine" });
        return r;
      }),
    dashboard: () =>
      simulate("dashboard", () => {
        staffOnly();
        return dashboard();
      }),
    getInternalRules: () =>
      simulate("internal rules", () => {
        const r = getDb().internalRules;
        // The investor portal only needs the public parts: card limits and risk bands.
        if (scopedInvestorId()) return { ...r, mintApprovalThresholdUsd: 0, overrideRoles: { verification: [], listing: [], valuation: [] }, autoApproveMaxAmlRisk: "low", updatedBy: "" };
        return r;
      }),
    updateInternalRules: (patch) =>
      simulate("internal rules", () => {
        requirePermission("rules.write");
        const db = getDb();
        const prev = db.internalRules;
        const next: D.InternalRules = { ...prev, ...patch, updatedAt: new Date().toISOString(), updatedBy: getCtx().actor.name };
        const b = next.riskBands;
        if (!(b.veryLowMax < b.lowMax && b.lowMax < b.mediumMax)) invalid("Risk bands must increase: Very low < Low < Medium.", { riskBands: "Out of order" });
        if (next.mintApprovalThresholdUsd < 0 || next.card.retailLimitUsd < 0 || next.card.professionalLimitUsd < 0) invalid("Limits cannot be negative.");
        const changed = Object.keys(patch).filter((k) => JSON.stringify((prev as unknown as Record<string, unknown>)[k]) !== JSON.stringify((patch as Record<string, unknown>)[k]));
        db.internalRules = next;
        writeAudit({ action: "rules.updated", objectType: "InternalRules", objectId: "rules", reason: changed.length ? `Changed: ${changed.join(", ")}` : "Saved without changes", previousState: JSON.stringify(Object.fromEntries(changed.map((k) => [k, (prev as unknown as Record<string, unknown>)[k]]))), newState: JSON.stringify(Object.fromEntries(changed.map((k) => [k, (patch as Record<string, unknown>)[k]]))) });
        return next;
      }, "write"),
  },

  identity: {
    listInvestors: (p) =>
      simulate("investors", () => {
        const f = p?.filters ?? {};
        const items = getDb().investors.filter(
          (i) =>
            i.tenantId === tenantId() &&
            (!scopedInvestorId() || i.id === scopedInvestorId()) &&
            matches(`${i.name} ${i.email} ${i.id} ${i.country}`, p?.search) &&
            (!f.kyc || (i.type === "entity" ? i.kybStatus ?? i.kycStatus : i.kycStatus) === f.kyc) &&
            (!f.type || i.type === f.type) &&
            (!f.classification || i.classification === f.classification) &&
            (!f.risk || i.amlRisk === f.risk),
        );
        return paginate(items, { ...p, pageSize: p?.pageSize ?? 100 });
      }),
    getInvestor: (id) =>
      simulate("investor", () => {
        requireSelf(id);
        return findInvestor(id);
      }),
    createInvestor: (input) =>
      simulate("investor", () => {
        requirePermission("investors.write");
        requireModule("identity");
        const db = getDb();
        if (db.investors.some((i) => i.email.toLowerCase() === input.email.toLowerCase())) invalid("An investor with this email already exists.", { email: "Already registered" });
        const inv: D.Investor = {
          id: uid("inv"), tenantId: tenantId(), type: input.type, name: input.name, email: input.email, phone: input.phone, country: input.country, residency: input.residency,
          citizenship: input.citizenship, entityType: input.entityType, registrationNumber: input.registrationNumber, classification: input.classification,
          accreditationExpiresAt: input.classification !== "retail" ? new Date(Date.now() + 365 * 86_400_000).toISOString() : undefined,
          kycStatus: input.type === "individual" ? "in-review" : "approved", kybStatus: input.type === "entity" ? "in-review" : undefined, kycProvider: "Sumsub",
          amlRisk: "low", pep: false, sanctionsHit: false, adverseMedia: false,
          wallets: input.wallet ? [{ id: uid("wal"), label: "Primary", address: input.wallet.address, chain: input.wallet.chain, type: input.wallet.type, custodian: input.wallet.custodian, whitelisted: false, riskScore: 9, addedAt: new Date().toISOString() }] : [],
          beneficialOwners: (input.beneficialOwners ?? []).map((b) => ({ ...b, id: uid("ubo"), verified: false })),
          documents: input.documents.map((k) => ({ id: uid("doc"), name: fmt.sentence(k), kind: k, status: "pending", uploadedAt: new Date().toISOString() })),
          totalInvested: 0, holdingsCount: 0, onboardedAt: new Date().toISOString(), lastReviewedAt: new Date().toISOString(), relationshipManager: getCtx().actor.name, tags: ["New"],
          interests: input.interests,
          company: input.company ? { ...input.company, bankAccounts: input.company.bankAccounts.map((b) => ({ ...b, id: uid("bnk") })) } : undefined,
        };
        inv.verification = initialVerification(input);
        refreshProfile(inv);
        if (inv.profileComplete === false) inv.kycStatus = input.type === "individual" ? "pending" : inv.kycStatus;
        if (input.type === "entity" && inv.profileComplete === false) inv.kybStatus = "pending";
        db.investors.unshift(inv);
        writeAudit({ action: "investor.created", objectType: "Investor", objectId: inv.id, reason: "Investor onboarding submitted", newState: "in-review", provider: "Sumsub" });
        emit({ type: "screening.alert", title: "Onboarding submitted", detail: `${inv.name} sent to Sumsub and ComplyAdvantage`, objectType: "Investor", objectId: inv.id, href: `/identity/investors/${inv.id}`, severity: "info" });
        // Provider callbacks arrive asynchronously
        setTimeout(() => {
          inv.documents.forEach((d) => (d.status = d.status === "missing" ? "missing" : "verified"));
          inv.verification?.forEach((v) => { if (v.status === "pending" && ["identity-document", "liveness", "sanctions", "pep", "adverse-media", "wallet-risk", "company-registry"].includes(v.key)) v.status = "passed"; });
          refreshProfile(inv);
          inv.wallets.forEach((w) => (w.whitelisted = true));
          writeAudit({ action: "kyc.provider_result", objectType: "Investor", objectId: inv.id, reason: "Documents verified, liveness passed, no screening hits", previousState: "pending", newState: "verified", system: "Sumsub webhook", provider: "Sumsub" });
          emit({ type: "screening.alert", title: "Identity checks passed", detail: `${inv.name}: documents verified, no sanctions or PEP hits. Awaiting compliance sign-off.`, objectType: "Investor", objectId: inv.id, href: `/identity/investors/${inv.id}`, severity: "success" });
          persist();
        }, 6000);
        return inv;
      }, "write"),
    decideKyc: (id, decision, note) =>
      simulate("KYC decision", () => {
        requirePermission("kyc.decide");
        requireModule("identity");
        const inv = findInvestor(id);
        const prev = inv.type === "entity" ? inv.kybStatus : inv.kycStatus;
        if (inv.type === "entity") inv.kybStatus = decision;
        else inv.kycStatus = decision;
        inv.lastReviewedAt = new Date().toISOString();
        inv.tags = inv.tags.filter((t) => t !== "New");
        if (decision === "approved") {
          inv.verification?.forEach((v) => { if (v.status === "pending" && !v.pendingApprovalId) { v.status = "passed"; v.at = inv.lastReviewedAt; } });
          inv.beneficialOwners.forEach((b) => (b.verified = true));
          inv.company?.directors.forEach((d) => (d.verified = true));
          inv.company?.signatories.forEach((d) => (d.verified = true));
          inv.company?.bankAccounts.forEach((d) => (d.verified = true));
          refreshProfile(inv);
        }
        writeAudit({ action: `kyc.${decision}`, objectType: "Investor", objectId: id, reason: note || "Compliance decision", previousState: prev, newState: decision });
        emit({ type: "screening.alert", title: decision === "approved" ? "Investor approved" : "Investor rejected", detail: `${inv.name} · ${note || "Compliance decision"}`, objectType: "Investor", objectId: id, href: `/identity/investors/${id}`, severity: decision === "approved" ? "success" : "warning" });
        return inv;
      }, "write"),
    addWallet: (investorId, w) =>
      simulate("wallet", () => {
        requirePermission("investors.write");
        requireModule("identity");
        const inv = findInvestor(investorId);
        if (inv.wallets.some((x) => x.address.toLowerCase() === w.address.toLowerCase())) invalid("This wallet is already linked to the investor.");
        const risk = Math.floor(Math.random() * 30) + 3;
        inv.wallets.push({ ...w, id: uid("wal"), whitelisted: false, riskScore: risk, addedAt: new Date().toISOString() });
        writeAudit({ action: "wallet.added", objectType: "Investor", objectId: investorId, reason: `Wallet ${fmt.hash(w.address)} on ${w.chain}`, newState: `risk ${risk}`, provider: "Chainalysis" });
        return inv;
      }, "write"),
    setWalletWhitelist: (investorId, walletId, whitelisted) =>
      simulate("wallet", () => {
        requirePermission("compliance.decide");
        requireModule("identity");
        const inv = findInvestor(investorId);
        const w = inv.wallets.find((x) => x.id === walletId) ?? notFound("Wallet", walletId);
        if (whitelisted && w.riskScore >= 60) invalid(`Wallet risk score ${w.riskScore} is above the policy threshold of 60.`);
        w.whitelisted = whitelisted;
        writeAudit({ action: whitelisted ? "wallet.whitelisted" : "wallet.removed_from_whitelist", objectType: "Wallet", objectId: walletId, reason: `Identity registry update on ${w.chain}`, previousState: String(!whitelisted), newState: String(whitelisted), txHash: txHash() });
        return inv;
      }, "write"),
    listIssuers: () => simulate("issuers", () => {
      const ids = new Set(tenantAssets().map((a) => a.issuerId));
      return getDb().issuers.filter((i) => ids.has(i.id) || tenantId() === "tnt_srh");
    }),
    updateVerification: (investorId, key, action: VerificationAction, reason) =>
      simulate("verification", () => {
        requireModule("identity");
        const db = getDb();
        const inv = findInvestor(investorId);
        const item = inv.verification?.find((v) => v.key === key) ?? notFound("Verification item", key);
        const { actor } = getCtx();
        if (action === "submit") {
          requireSelf(investorId);
          if (!["missing", "failed"].includes(item.status)) invalid("This item is not outstanding.");
          item.status = "pending";
          item.detail = "Submitted by the investor, awaiting review";
          item.at = new Date().toISOString();
          writeAudit({ action: "verification.submitted", objectType: "Investor", objectId: inv.id, reason: item.label, previousState: "missing", newState: "pending" });
          emit({ type: "screening.alert", title: "Document received", detail: `${inv.name} · ${item.label}`, objectType: "Investor", objectId: inv.id, href: `/identity/investors/${inv.id}`, severity: "info" });
          return { investor: inv };
        }
        staffOnly();
        if (action === "request") {
          requirePermission("investors.write");
          item.detail = `Requested from the investor by ${actor.name}`;
          item.at = new Date().toISOString();
          writeAudit({ action: "verification.requested", objectType: "Investor", objectId: inv.id, reason: `${item.label}: ${reason || "Please provide"}`, newState: item.status });
          return { investor: inv };
        }
        const roles = db.internalRules.overrideRoles.verification;
        if (!roles.includes(actor.role)) forbidden(`Manual verification overrides need the ${roles.map((r) => ROLE_META[r].label).join(" or ")} role.`);
        if (!reason.trim()) invalid("Record why this item is being approved or waived. It is kept in the audit trail.", { reason: "Required" });
        if (CLEAR.includes(item.status)) invalid("This item is already clear.");
        if (item.pendingApprovalId) invalid("A second approval for this item is already pending.");
        const high = HIGH_RISK_ITEMS.includes(key) || inv.amlRisk === "high";
        if (high && db.internalRules.dualApprovalForHighRiskOverrides) {
          const ap: D.Approval = {
            id: uid("apr"), tenantId: inv.tenantId, type: "verification-override", title: `${action === "waive" ? "Waive" : "Approve manually"}: ${item.label.toLowerCase()}`,
            summary: `${inv.name}: ${reason}`, objectType: "Investor", objectId: inv.id, requestedBy: actor.name, requestedAt: new Date().toISOString(), risk: "high", status: "pending",
            steps: withMakerStep([{ role: actor.role, label: "Requester" }, { role: actor.role === "operations" ? "compliance-officer" : "operations", label: "Second approver" }]),
            payload: { item: key, action, reason },
          };
          db.approvals.unshift(ap);
          item.pendingApprovalId = ap.id;
          writeAudit({ action: "verification.override_requested", objectType: "Investor", objectId: inv.id, reason: `${item.label}: ${reason}`, previousState: item.status, newState: "pending approval" });
          emit({ type: "approval.requested", title: "Override needs a second approver", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "warning" });
          return { investor: inv, approval: ap };
        }
        applyVerification(inv, key, action, reason, actor.name);
        return { investor: inv };
      }, "write"),
    updateInterests: (investorId, interests) =>
      simulate("interests", () => {
        requireSelf(investorId);
        const inv = findInvestor(investorId);
        inv.interests = interests;
        writeAudit({ action: "investor.interests_updated", objectType: "Investor", objectId: investorId, reason: "Investment preferences updated", newState: interests.assetTypes.join(", ") });
        return inv;
      }, "write"),
    getHomeLayout: (investorId) =>
      simulate("home layout", () => {
        requireSelf(investorId);
        return getDb().homeLayouts?.[investorId] ?? null;
      }),
    saveHomeLayout: (investorId, layout) =>
      simulate("home layout", () => {
        requireSelf(investorId);
        const db = getDb();
        db.homeLayouts = { ...(db.homeLayouts ?? {}), [investorId]: layout };
        return layout;
      }, "write"),
  },

  compliance: {
    listPolicyPacks: () => simulate("policy packs", () => getDb().policyPacks),
    toggleRule: (packId, ruleId, enabled) =>
      simulate("policy rule", () => {
        requirePermission("policy.write");
        requireModule("compliance");
        const pack = getDb().policyPacks.find((p) => p.id === packId) ?? notFound("Policy pack", packId);
        const r = pack.rules.find((x) => x.id === ruleId) ?? notFound("Rule", ruleId);
        r.enabled = enabled;
        pack.updatedAt = new Date().toISOString();
        pack.updatedBy = getCtx().actor.name;
        writeAudit({ action: enabled ? "policy.rule_enabled" : "policy.rule_disabled", objectType: "PolicyPack", objectId: packId, reason: `${r.code} ${r.name}`, previousState: String(!enabled), newState: String(enabled) });
        return pack;
      }, "write"),
    checkEligibility: (input) =>
      simulate("eligibility", () => {
        const db = getDb();
        requireSelf(input.investorId);
        const investor = findInvestor(input.investorId);
        const asset = findAsset(input.assetId);
        const offering = input.offeringId ? db.offerings.find((o) => o.id === input.offeringId) : db.offerings.find((o) => o.assetId === asset.id);
        const wallet = input.walletId ? investor.wallets.find((w) => w.id === input.walletId) : investor.wallets[0];
        const tc = db.tokenClasses.find((t) => t.assetId === asset.id);
        const existing = sum(db.holdings.filter((h) => h.investorId === investor.id && h.assetId === asset.id), (h) => h.quantity);
        const t0 = performance.now();
        const r = evaluateEligibility({ investor, asset, offering, amount: input.amount, wallet, packs: db.policyPacks.filter((p) => asset.policyPackIds.includes(p.id) && p.status === "active"), existingTokens: existing, maxSupply: tc?.maxSupply ?? tc?.canonicalSupply });
        const result: D.EligibilityResult = { ...r, id: uid("elg"), evaluatedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - t0 + 41) };
        writeAudit({ action: "eligibility.evaluated", objectType: "Investor", objectId: investor.id, reason: `Eligibility for ${asset.shortName}`, newState: result.decision, system: "Compliance engine" });
        return result;
      }),
    listAlerts: (p) =>
      simulate("alerts", () => {
        staffOnly();
        return getDb().screeningAlerts.filter((a) => getDb().investors.some((i) => i.id === a.investorId && i.tenantId === tenantId()) && matches(`${a.investorName} ${a.summary} ${a.id}`, p?.search) && (!p?.filters?.status || a.status === p.filters.status));
      }),
    resolveAlert: (id, status, note) =>
      simulate("alert", () => {
        requirePermission("compliance.decide");
        requireModule("compliance");
        if (!note.trim()) invalid("Add a resolution note. It is stored in the audit trail.", { note: "Required" });
        const db = getDb();
        const a = db.screeningAlerts.find((x) => x.id === id && db.investors.some((i) => i.id === x.investorId && i.tenantId === tenantId())) ?? notFound("Alert", id);
        const prev = a.status;
        a.status = status;
        a.resolutionNote = note;
        a.assignee = getCtx().actor.name;
        if (status !== "escalated") a.resolvedAt = new Date().toISOString();
        if (status === "confirmed") {
          const inv = db.investors.find((i) => i.id === a.investorId);
          if (inv && a.type === "sanctions") inv.sanctionsHit = true;
        }
        writeAudit({ action: `screening.alert_${status}`, objectType: "ScreeningAlert", objectId: id, reason: note, previousState: prev, newState: status, provider: a.provider });
        return a;
      }, "write"),
  },

  assets: {
    listAssets: (p) => simulate("assets", () => tenantAssets().filter((a) => matches(`${a.name} ${a.shortName} ${a.id}`, p?.search) && (!p?.filters?.status || a.status === p.filters.status) && (!p?.filters?.template || a.template === p.filters.template)).map(forViewer)),
    getAsset: (id) => simulate("asset", () => forViewer(findAsset(id))),
    createAsset: (input) =>
      simulate("asset", () => {
        requirePermission("assets.write");
        requireModule("assets");
        const db = getDb();
        if (db.tokenClasses.some((t) => t.symbol.toLowerCase() === input.token.symbol.toLowerCase())) invalid(`Token symbol ${input.token.symbol} is already in use.`, { symbol: "Taken" });
        const id = uid("ast");
        const tcId = "tok_" + input.token.symbol.toLowerCase();
        const scId = uid("scl");
        for (const x of input.tokenClasses ?? []) if (db.tokenClasses.some((t) => t.symbol.toLowerCase() === x.symbol.toLowerCase()) || x.symbol.toLowerCase() === input.token.symbol.toLowerCase()) invalid(`Token symbol ${x.symbol} is already in use.`);
        const debt: D.DebtTerms | undefined = input.debt ? { ...input.debt, issuePrice: priceAtYield({ ...input.debt, issuePrice: 0 }, input.debt.yieldPct) } : undefined;
        const unitPrice = debt ? Math.round((debt.issuePrice / debt.faceValue) * input.offering.pricePerToken * 100) / 100 : input.offering.pricePerToken;
        const extraIds = (input.tokenClasses ?? []).map((x) => "tok_" + x.symbol.toLowerCase());
        const now = new Date().toISOString();
        const checks = (): D.IssuanceCheck[] => [
          { key: "legal-docs", label: "Offering documents signed and filed", status: "pending" },
          { key: "spv", label: "Issuer entity incorporated, registry extract on file", status: "pending" },
          { key: "title", label: input.template === "commodity" ? "Vault certificate and bar list reconciled" : input.template === "real-estate" || input.template === "spv-shares" ? "Title or lease registered in the SPV's name" : "Assets held by the custodian", status: "pending" },
          { key: "valuation", label: "Independent valuation on file", status: "pending" },
          { key: "regulator", label: "Regulatory approval or exemption confirmed", status: "pending" },
          { key: "contract", label: "Token contract configuration reviewed (supply, controls, identity registry)", status: "pending" },
        ];
        const asset: D.Asset = {
          id, tenantId: tenantId(), name: input.name, shortName: input.shortName, template: input.template, status: "draft", issuerId: input.issuerId, description: input.description,
          underlying: { ...input.underlying, metrics: [] },
          legalEntity: { ...input.legalEntity, registrationNumber: "Pending" },
          instrument: { ...input.instrument },
          valuation: { method: input.valuation.method, nav: 0, navPerToken: unitPrice, currency: input.valuation.currency, frequency: input.valuation.frequency, lastUpdated: now, oracle: input.oracleMode === "manual" ? undefined : "Chainlink" },
          income: input.income, servicer: input.servicer, ownershipModel: input.ownershipModel,
          shareClasses: [{ id: scId, name: "Ordinary", currency: input.offering.currency, managementFeeBps: 75, minInvestment: input.offering.minTicket, eligibleClassifications: input.rules.eligibleClassifications, tokenClassId: tcId }],
          tokenClassIds: [tcId, ...extraIds], jurisdiction: input.legalEntity.jurisdiction, rules: input.rules, aum: 0, investorsCount: 0,
          documents: (input.documents ?? []).map((d) => ({ id: uid("adoc"), name: d.name, kind: d.kind, version: "v1.0", status: "draft" as const, updatedAt: now, hash: "0x" + randomHex(64), visibility: d.visibility, uploadedBy: getCtx().actor.name })),
          policyPackIds: Array.from(new Set(["pol_global", ...[input.legalEntity.jurisdiction, ...(input.regimes ?? [])].map((j) => ({ "AE-ADGM": "pol_adgm", "AE-DIFC": "pol_difc", "AE-VARA": "pol_vara", SA: "pol_cma", "EU-LU": "pol_eu", CH: "pol_ch", BH: "pol_cbb", GB: "pol_uk", US: "pol_us" } as Record<string, string>)[j]).filter(Boolean) as string[], ...(input.template === "sukuk" ? ["pol_sharia"] : [])])),
          navHistory: [{ date: now, nav: unitPrice }], createdAt: now,
          debt, regimes: input.regimes, profile: input.profile, oracleMode: input.oracleMode,
          waterfall: input.waterfall?.map((w) => { const m = w.label.match(/\(([A-Z0-9]{2,8})\)$/); return m ? { ...w, tokenClassId: "tok_" + m[1].toLowerCase() } : w; }),
          tokenomics: {
            allocation: input.tokenClasses?.length ? [{ label: `${input.token.symbol} (main class)`, pct: 70 }, ...input.tokenClasses.map((x) => ({ label: x.symbol, pct: Math.round(30 / input.tokenClasses!.length) }))] : [{ label: "Offered to investors", pct: 100 }],
            fees: [{ label: "Subscription fee", value: "Set at launch" }, { label: "Management fee", value: "0.75% a year" }],
            lockups: input.rules.lockupDays ? [{ label: "All investors", detail: `${input.rules.lockupDays} days from subscription` }] : [{ label: "None", detail: "Transfers allowed from issue" }],
            distributionPolicy: input.income.targetYieldPct ? `${input.income.type}, ${input.income.frequency.replace("-", " ")}.` : "No distributions.",
            redemption: input.instrument.maturity ? `Repaid at face value on ${input.instrument.maturity.slice(0, 10)}.` : "Set in the offering documents.",
            transferRules: `Transfers between verified, whitelisted wallets only. Holding limit ${input.rules.holdingLimitPct}% per investor.`,
          },
          visual: input.template === "real-estate" ? "tower" : input.template === "commodity" ? "gold" : input.template === "treasury-fund" ? "treasury" : input.template === "sukuk" ? "sukuk" : input.template === "private-equity" ? "growth" : input.template === "receivables" ? "receivables" : "credit",
        };
        db.assets.unshift(asset);
        db.tokenClasses.unshift({
          id: tcId, assetId: id, shareClassId: scId, symbol: input.token.symbol, name: input.name, standard: input.token.standard, decimals: input.token.decimals, canonicalSupply: 0,
          maxSupply: Math.round(input.offering.target / input.offering.pricePerToken), status: "active",
          deployments: input.token.chains.map((chain) => ({ id: uid("dep"), chain, contractAddress: "pending", supply: 0, holders: 0, status: "pending", deployedAt: new Date().toISOString(), lastBlock: 0, gasSpendUsd: 0 })),
          controls: input.token.controls, identityRegistry: "pending", complianceModule: "pending", createdAt: now,
          tier: input.tokenClasses?.length ? "senior" : undefined, targetReturnPct: input.tokenClasses?.length ? input.income.targetYieldPct : undefined,
          issuance: { status: "pending", checks: checks() },
        });
        (input.tokenClasses ?? []).forEach((x, k) => {
          db.tokenClasses.unshift({
            id: extraIds[k], assetId: id, symbol: x.symbol, name: x.name, standard: input.token.standard, decimals: input.token.decimals, canonicalSupply: 0, maxSupply: x.supply || undefined, status: "active",
            deployments: input.token.chains.map((chain) => ({ id: uid("dep"), chain, contractAddress: "pending", supply: 0, holders: 0, status: "pending", deployedAt: now, lastBlock: 0, gasSpendUsd: 0 })),
            controls: input.token.controls, identityRegistry: "pending", complianceModule: "pending", createdAt: now, tier: x.tier, targetReturnPct: x.targetReturnPct,
            issuance: { status: "pending", checks: checks() },
          });
        });
        db.offerings.unshift({
          id: uid("off"), assetId: id, tenantId: tenantId(), name: `${input.shortName} primary offering`, type: "primary", status: "upcoming", opensAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          closesAt: new Date(Date.now() + 74 * 86_400_000).toISOString(), pricePerToken: unitPrice, currency: input.offering.currency, target: input.offering.target, subscribed: 0,
          minTicket: input.offering.minTicket, maxTicket: Math.max(input.offering.minTicket * 50, input.offering.target / 5), investorsCount: 0, eligibleJurisdictions: ["AE", "SA", "BH", "SG", "GB", "CH"].filter((c) => !input.rules.blockedCountries.includes(c)),
          eligibleClassifications: input.rules.eligibleClassifications, rails: input.offering.rails, settlement: "dvp", distributor: db.tenants.find((t) => t.id === tenantId())!.name,
        });
        writeAudit({ action: "asset.created", objectType: "Asset", objectId: id, reason: `${input.template} product structured from template`, newState: "draft" });
        emit({ type: "approval.requested", title: "New product drafted", detail: `${input.name} (${input.token.symbol}) created from the ${input.template} template`, objectType: "Asset", objectId: id, href: `/assets/${id}`, severity: "info" });
        return asset;
      }, "write"),
    submitForReview: (id) =>
      simulate("asset", () => {
        requirePermission("assets.write");
        requireModule("assets");
        const db = getDb();
        const a = findAsset(id);
        if (a.status !== "draft" && a.status !== "structuring") invalid(`Only draft products can be submitted. Current status is ${a.status}.`);
        const prev = a.status;
        a.status = "in-review";
        const ap: D.Approval = {
          id: uid("apr"), tenantId: a.tenantId, type: "asset-launch", title: `Launch ${a.name}`, summary: "Deploy token contracts and open the primary offering.", objectType: "Asset", objectId: a.id,
          requestedBy: getCtx().actor.name, requestedAt: new Date().toISOString(), risk: "high", status: "pending",
          steps: withMakerStep([{ role: "compliance-officer", label: "Compliance approval" }, { role: "platform-admin", label: "Regulatory permission confirmed" }]), payload: { chains: db.tokenClasses.find((t) => t.assetId === id)?.deployments.map((d) => d.chain).join(", ") ?? "" },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: "asset.submitted", objectType: "Asset", objectId: id, reason: "Submitted for compliance review", previousState: prev, newState: "in-review" });
        emit({ type: "approval.requested", title: "Launch approval requested", detail: a.name, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "info" });
        return a;
      }, "write"),
    listOfferings: () => simulate("offerings", () => getDb().offerings.filter((o) => o.tenantId === tenantId())),
    getOffering: (id) => simulate("offering", () => inTenant("Offering", id, getDb().offerings.find((o) => o.id === id))),
    listCorporateActions: (assetId) => simulate("corporate actions", () => getDb().corporateActions.filter((c) => tenantAssetIds().has(c.assetId) && (!assetId || c.assetId === assetId))),
    overrideListingStage: (assetId, to, reason) =>
      simulate("listing stage", () => {
        requirePermission("listing.override");
        if (!getDb().internalRules.overrideRoles.listing.includes(getCtx().actor.role)) forbidden("Your role is not authorised to change listing stages under the internal rules.");
        requireModule("assets");
        const db = getDb();
        const a = findAsset(assetId);
        if (a.status === to) invalid(`The product is already ${to}.`);
        if (!reason.trim()) invalid("Record the reason for moving the stage manually.", { reason: "Required" });
        if (db.approvals.some((x) => x.type === "listing-override" && x.objectId === assetId && x.status === "pending")) invalid("A stage change for this product is already waiting for approval.");
        const { actor } = getCtx();
        const ap: D.Approval = {
          id: uid("apr"), tenantId: a.tenantId, type: "listing-override", title: `Move ${a.shortName} from ${a.status} to ${to}`, summary: reason,
          objectType: "Asset", objectId: a.id, requestedBy: actor.name, requestedAt: new Date().toISOString(), risk: to === "live" ? "high" : "medium", status: "pending",
          steps: withMakerStep([{ role: actor.role, label: "Requester" }, { role: actor.role === "compliance-officer" ? "platform-admin" : "compliance-officer", label: "Compliance approval" }]),
          payload: { from: a.status, to },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: "asset.stage_override_requested", objectType: "Asset", objectId: a.id, reason, previousState: a.status, newState: `${to} (pending approval)` });
        emit({ type: "approval.requested", title: "Stage change requested", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "info" });
        return ap;
      }, "write"),
    enterValuation: (input) =>
      simulate("valuation", () => {
        requirePermission("valuation.enter");
        if (!getDb().internalRules.overrideRoles.valuation.includes(getCtx().actor.role)) forbidden("Your role is not authorised to enter valuations under the internal rules.");
        requireModule("assets");
        const db = getDb();
        const a = findAsset(input.assetId);
        if (!(input.navPerToken > 0)) invalid("Enter a value per unit greater than zero.", { navPerToken: "Required" });
        if (!input.source.trim()) invalid("Name the source of the valuation.", { source: "Required" });
        const from = a.valuation.navPerToken;
        const changePct = from ? ((input.navPerToken - from) / from) * 100 : 0;
        const tol = db.internalRules.manualValuationTolerancePct;
        const outside = Math.abs(changePct) > tol;
        const { actor } = getCtx();
        const ap: D.Approval = {
          id: uid("apr"), tenantId: a.tenantId, type: "manual-valuation", title: `Valuation for ${a.shortName}: ${input.navPerToken}`,
          summary: `${input.source}. Moves from ${from} to ${input.navPerToken} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%).${input.note ? " " + input.note : ""}`,
          objectType: "Asset", objectId: a.id, requestedBy: actor.name, requestedAt: new Date().toISOString(), risk: outside ? "high" : "low", status: "pending",
          steps: withMakerStep([{ role: actor.role, label: "Entered by" }, { role: "compliance-officer", label: "Checker" }, ...(outside ? [{ role: "platform-admin" as const, label: `Outside ${tol}% tolerance: second line` }] : [])]),
          payload: { from, to: input.navPerToken, source: input.source },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: "valuation.entered", objectType: "Asset", objectId: a.id, reason: ap.summary, previousState: String(from), newState: `${input.navPerToken} (pending check)` });
        emit({ type: "approval.requested", title: "Valuation awaiting check", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: outside ? "warning" : "info" });
        return ap;
      }, "write"),
    uploadDocument: (assetId, doc) =>
      simulate("document", () => {
        requirePermission("documents.write");
        const a = findAsset(assetId);
        if (!doc.name.trim()) invalid("Give the document a name.", { name: "Required" });
        a.documents.unshift({ id: uid("adoc"), name: doc.name, kind: doc.kind, version: "v1.0", status: "final", updatedAt: new Date().toISOString(), hash: "0x" + randomHex(64), visibility: doc.visibility, sizeKb: doc.sizeKb, uploadedBy: getCtx().actor.name });
        writeAudit({ action: "document.uploaded", objectType: "Asset", objectId: a.id, reason: doc.name, newState: doc.visibility });
        return a;
      }, "write"),
    setDocumentVisibility: (assetId, documentId, visibility) =>
      simulate("document", () => {
        requirePermission("documents.write");
        const a = findAsset(assetId);
        const d = a.documents.find((x) => x.id === documentId) ?? notFound("Document", documentId);
        const prev = d.visibility ?? "holders";
        d.visibility = visibility;
        writeAudit({ action: "document.visibility_changed", objectType: "Asset", objectId: a.id, reason: d.name, previousState: prev, newState: visibility });
        return a;
      }, "write"),
    createCorporateAction: (input) =>
      simulate("corporate action", () => {
        requirePermission("servicing.write");
        requireModule("servicing");
        findAsset(input.assetId);
        if (!input.title.trim()) invalid("Add a title.", { title: "Required" });
        const ca: D.CorporateAction = { id: uid("ca"), assetId: input.assetId, kind: input.kind, title: input.title, detail: input.detail, effectiveDate: input.effectiveDate, status: input.kind === "vote" || input.kind === "tender-offer" ? "open" : "scheduled", votes: input.kind === "vote" ? { for: 0, against: 0, abstain: 0, quorumPct: 30 } : undefined };
        getDb().corporateActions.unshift(ca);
        writeAudit({ action: "corporate_action.created", objectType: "CorporateAction", objectId: ca.id, reason: ca.title, newState: ca.status });
        emit({ type: "approval.requested", title: "Corporate action scheduled", detail: ca.title, objectType: "Asset", objectId: input.assetId, href: "/servicing", severity: "info" });
        return ca;
      }, "write"),
  },

  orders: {
    listOrders: (p) =>
      simulate("orders", () => {
        const inv = scopedInvestorId();
        const f = p?.filters ?? {};
        return getDb().orders.filter(
          (o) =>
            o.tenantId === tenantId() &&
            (!inv || o.investorId === inv) &&
            (!f.investorId || o.investorId === f.investorId) &&
            (!f.assetId || o.assetId === f.assetId) &&
            (!f.status || o.status === f.status) &&
            (!f.stage || o.stage === f.stage) &&
            matches(`${o.id} ${o.investorName}`, p?.search),
        );
      }),
    getOrder: (id) =>
      simulate("order", () => {
        const o = findOrder(id);
        const own = scopedInvestorId();
        if (own && o.investorId !== own) notFound("Order", id);
        return o;
      }),
    subscribe: (input) =>
      simulate("subscription", () => {
        requirePermission("orders.subscribe");
        requireModule("primary-market");
        requireSelf(input.investorId);
        const db = getDb();
        const off = inTenant("Offering", input.offeringId, db.offerings.find((o) => o.id === input.offeringId));
        const inv = findInvestor(input.investorId);
        if (off.status !== "open") invalid(`${off.name} is ${off.status}. Subscriptions are closed.`);
        if (input.amount < off.minTicket) invalid(`Minimum subscription is ${fmt.money(off.minTicket, off.currency)}.`, { amount: "Below minimum" });
        if (input.amount > off.maxTicket) invalid(`Maximum subscription is ${fmt.money(off.maxTicket, off.currency)}.`, { amount: "Above maximum" });
        if (!off.rails.includes(input.rail)) invalid(`${input.rail} is not accepted for this offering.`);
        if (input.rail === "card") {
          const card = db.internalRules.card;
          if (!card.enabled) invalid("Card payments are switched off.");
          const limit = inv.classification === "retail" ? card.retailLimitUsd : card.professionalLimitUsd;
          if (input.amount * usdRate(off.currency) > limit) invalid(`Card payments are limited to ${fmt.money(limit)} per order. Use a bank transfer or stablecoin for larger amounts.`, { amount: "Above card limit" });
        }
        const now = new Date().toISOString();
        const o: D.Order = {
          id: "ord_" + (50_000 + Math.floor(Math.random() * 49_999)), tenantId: off.tenantId, offeringId: off.id, assetId: off.assetId, investorId: inv.id, investorName: inv.name, side: "subscribe",
          amount: input.amount, currency: off.currency, tokens: Math.round((input.amount / off.pricePerToken) * 100) / 100, pricePerToken: off.pricePerToken, rail: input.rail, settlement: off.settlement,
          chain: input.chain, stage: "submitted", status: "active", history: [{ stage: "submitted", at: now, actor: getCtx().actor.role === "investor" ? "Investor portal" : `${getCtx().actor.name} (on behalf)`, note: `Idempotency key idem_live_${randomHex(10)}` }],
          idempotencyKey: "idem_live_" + randomHex(12), createdAt: now, updatedAt: now,
        };
        db.orders.unshift(o);
        writeAudit({ action: "order.submitted", objectType: "Order", objectId: o.id, reason: `Subscription to ${off.name}`, newState: "submitted" });
        emit({ type: "order.submitted", title: "Order received", detail: `${inv.name} · ${fmt.money(o.amount, o.currency)}`, objectType: "Order", objectId: o.id, href: `/orders/${o.id}`, severity: "info" });
        schedule(o.id);
        return o;
      }, "write"),
    advance: (id, note) =>
      simulate("order", () => {
        requirePermission("orders.operate");
        requireModule("primary-market");
        const o = findOrder(id);
        if (o.status !== "active") invalid(`Order is ${o.status}. Resolve the exception first.`);
        if (o.stage === "reconciled") invalid("Order is already reconciled.");
        advanceNow(o, note);
        schedule(o.id);
        return o;
      }, "write"),
    resolveException: (id, action, note) =>
      simulate("order", () => {
        requirePermission(action === "approve" ? "compliance.decide" : "orders.operate");
        requireModule("primary-market");
        const o = findOrder(id);
        const prev = o.status;
        if (action === "refund") {
          o.status = "cancelled";
          o.exceptionReason = `Refunded: ${note}`;
        } else {
          o.status = "active";
          o.exceptionReason = undefined;
          if (o.stage === "eligibility" && prev === "manual-review") {
            o.history.push({ stage: "eligibility", at: new Date().toISOString(), actor: getCtx().actor.name, note: `Manual review approved: ${note}` });
          }
          schedule(o.id);
        }
        writeAudit({ action: `order.exception_${action}`, objectType: "Order", objectId: id, reason: note, previousState: prev, newState: o.status });
        return o;
      }, "write"),
    cancel: (id, reason) =>
      simulate("order", () => {
        requirePermission("orders.operate");
        requireModule("primary-market");
        const o = findOrder(id);
        if (["minted", "reconciled"].includes(o.stage)) invalid("Tokens are already minted. Use a redemption instead.");
        const prev = o.status;
        o.status = "cancelled";
        o.exceptionReason = reason;
        o.updatedAt = new Date().toISOString();
        writeAudit({ action: "order.cancelled", objectType: "Order", objectId: id, reason, previousState: prev, newState: "cancelled" });
        return o;
      }, "write"),
  },

  payments: {
    listPayments: (p) =>
      simulate("payments", () => {
        const own = scopedInvestorId();
        const ownOrders = new Set(own ? getDb().orders.filter((o) => o.investorId === own).map((o) => o.id) : []);
        return getDb().payments.filter((x) => x.tenantId === tenantId() && (!own || (!!x.orderId && ownOrders.has(x.orderId))) && (!p?.filters?.status || x.status === p.filters.status) && (!p?.filters?.direction || x.direction === p.filters.direction) && matches(`${x.reference} ${x.counterparty}`, p?.search));
      }),
    listLedger: () =>
      simulate("ledger", () => {
        staffOnly();
        return getDb().ledger;
      }),
  },

  tokens: {
    listTokenClasses: () => simulate("token classes", () => getDb().tokenClasses.filter((t) => tenantAssetIds().has(t.assetId))),
    getTokenClass: (id) => simulate("token class", () => findTokenClass(id)),
    requestOperation: (input) =>
      simulate("token operation", () => {
        requirePermission("tokens.request");
        requireModule("tokenization");
        const db = getDb();
        const tc = findTokenClass(input.tokenClassId);
        if (!input.reason.trim()) invalid("A reason is required for every token operation.", { reason: "Required" });
        if ((input.operation === "mint" || input.operation === "burn" || input.operation === "forced-transfer") && !(input.amount && input.amount > 0)) invalid("Enter an amount greater than zero.", { amount: "Required" });
        if (input.operation === "burn" && input.amount! > tc.canonicalSupply) invalid("Burn amount exceeds canonical supply.");
        if (input.operation === "mint" && db.internalRules.issuanceVerificationRequired && tc.issuance && tc.issuance.status !== "verified") {
          const open = tc.issuance.checks.filter((c) => c.status === "pending").map((c) => c.label.toLowerCase());
          invalid(`Issuance verification is not complete for ${tc.symbol}. Outstanding: ${open.join("; ")}.`);
        }
        const type: D.ApprovalType = input.operation === "unpause" ? "pause" : input.operation === "unfreeze" ? "freeze" : input.operation === "recovery" ? "forced-transfer" : (input.operation as D.ApprovalType);
        const high = input.operation === "forced-transfer" || input.operation === "recovery" || input.operation === "freeze";
        const ap: D.Approval = {
          id: uid("apr"), tenantId: tenantId(), type,
          title: `${fmt.sentence(input.operation)}${input.amount ? " " + fmt.num(input.amount) : ""} ${tc.symbol} on ${input.chain}`,
          summary: input.reason, objectType: "TokenClass", objectId: tc.id, requestedBy: getCtx().actor.name, requestedAt: new Date().toISOString(), risk: high ? "high" : "medium", status: "pending",
          steps: withMakerStep([
            { role: "operations", label: "Operations approval" },
            { role: "compliance-officer", label: "Compliance approval" },
            ...(high ? [{ role: "platform-admin" as const, label: "Legal sign-off" }] : []),
            { role: "authorized-signer" as const, label: "Authorised signer (HSM quorum 3 of 5)" },
          ]),
          payload: { chain: input.chain, ...(input.amount ? { amount: fmt.num(input.amount) } : {}), ...(input.fromWallet ? { from: input.fromWallet } : {}), ...(input.toWallet ? { to: input.toWallet } : {}) },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: `token.${input.operation}_requested`, objectType: "TokenClass", objectId: tc.id, reason: input.reason, newState: "pending approval" });
        emit({ type: "approval.requested", title: "Token operation requested", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: high ? "warning" : "info" });
        return ap;
      }, "write"),
    deployToChain: (tokenClassId, chain) =>
      simulate("deployment", () => {
        requirePermission("tokens.request");
        requireModule("tokenization");
        const db = getDb();
        const tc = findTokenClass(tokenClassId);
        if (tc.deployments.some((d) => d.chain === chain)) invalid(`${tc.symbol} is already deployed on ${chain}.`);
        const ap: D.Approval = {
          id: uid("apr"), tenantId: tenantId(), type: "config-change", title: `Deploy ${tc.symbol} on ${chain}`, summary: "Factory deployment of token, identity registry and compliance module. Supply stays reconciled to the canonical token class.",
          objectType: "TokenClass", objectId: tc.id, requestedBy: getCtx().actor.name, requestedAt: new Date().toISOString(), risk: "medium", status: "pending",
          steps: withMakerStep([{ role: "platform-admin", label: "Platform approval" }, { role: "compliance-officer", label: "Compliance approval" }, { role: "authorized-signer", label: "Authorised signer" }]), payload: { deployChain: chain },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: "token.deployment_requested", objectType: "TokenClass", objectId: tc.id, reason: `New deployment on ${chain}`, newState: "pending approval" });
        return ap;
      }, "write"),
    verifyIssuance: (tokenClassId, checkKey, action, note) =>
      simulate("issuance check", () => {
        requirePermission("issuance.verify");
        requireModule("tokenization");
        const tc = findTokenClass(tokenClassId);
        const { actor } = getCtx();
        if (!tc.issuance) tc.issuance = { status: "pending", checks: [] };
        const c = tc.issuance.checks.find((x) => x.key === checkKey) ?? notFound("Issuance check", checkKey);
        if (c.status !== "pending") invalid("This check is already complete.");
        if (action === "waive" && !note.trim()) invalid("Record why this check is waived.", { note: "Required" });
        c.status = action === "verify" ? "verified" : "waived";
        c.by = actor.name;
        c.at = new Date().toISOString();
        c.note = note || c.note;
        writeAudit({ action: `issuance.check_${c.status}`, objectType: "TokenClass", objectId: tc.id, reason: `${c.label}${note ? ": " + note : ""}`, previousState: "pending", newState: c.status });
        if (tc.issuance.checks.every((x) => x.status !== "pending")) {
          tc.issuance.status = "verified";
          tc.issuance.verifiedBy = actor.name;
          tc.issuance.verifiedAt = c.at;
          writeAudit({ action: "issuance.verified", objectType: "TokenClass", objectId: tc.id, reason: `All issuance checks complete for ${tc.symbol}`, previousState: "pending", newState: "verified" });
          emit({ type: "approval.completed", title: "Issuance verified", detail: `${tc.symbol} can now be minted`, objectType: "TokenClass", objectId: tc.id, href: `/tokens/${tc.id}`, severity: "success" });
          // Orders held for verification resume
          getDb().orders.filter((o) => o.assetId === tc.assetId && o.status === "exception" && o.exceptionReason?.startsWith("Issuance verification")).forEach((o) => { o.status = "active"; o.exceptionReason = undefined; schedule(o.id); });
        }
        return tc;
      }, "write"),
  },

  registry: {
    listHoldings: (p) =>
      simulate("holdings", () => {
        const inv = scopedInvestorId();
        const ids = tenantAssetIds();
        return getDb().holdings.filter((h) => ids.has(h.assetId) && (!inv || h.investorId === inv) && (!p?.filters?.assetId || h.assetId === p.filters.assetId) && (!p?.filters?.investorId || h.investorId === p.filters.investorId) && matches(`${h.investorName} ${h.walletAddress}`, p?.search));
      }),
    listBreaks: () =>
      simulate("breaks", () => {
        staffOnly();
        return getDb().reconBreaks.filter((b) => tenantAssetIds().has(b.assetId));
      }),
    resolveBreak: (id, resolution) =>
      simulate("break", () => {
        requirePermission("recon.resolve");
        requireModule("registry");
        if (!resolution.trim()) invalid("Describe the resolution. It becomes part of the immutable reconciliation history.", { resolution: "Required" });
        const b = inTenantAsset("Break", id, getDb().reconBreaks.find((x) => x.id === id));
        const prev = b.status;
        b.status = "resolved";
        b.resolution = resolution;
        b.resolvedAt = new Date().toISOString();
        b.assignee = getCtx().actor.name;
        writeAudit({ action: "recon.break_resolved", objectType: "ReconciliationBreak", objectId: id, reason: resolution, previousState: prev, newState: "resolved" });
        return b;
      }, "write"),
    runReconciliation: () =>
      simulate("reconciliation", async () => {
        requirePermission("recon.resolve");
        requireModule("registry");
        const db = getDb();
        const ids = tenantAssetIds();
        const open = db.reconBreaks.filter((b) => ids.has(b.assetId) && b.status !== "resolved").length;
        const compared = 18_000 + Math.floor(Math.random() * 6000);
        const run: D.ReconciliationRun = { id: uid("rcr"), startedAt: new Date(Date.now() - 2400).toISOString(), finishedAt: new Date().toISOString(), scope: "All live token classes x blockchain, transfer agent, custodian, bank, ledger", recordsCompared: compared, matched: compared - open, breaks: open, status: open ? "breaks-found" : "clean" };
        db.reconRuns.unshift(run);
        writeAudit({ action: "recon.run_completed", objectType: "ReconciliationRun", objectId: run.id, reason: `${compared} records compared`, newState: run.status, system: "Reconciliation engine" });
        emit({ type: open ? "recon.break_detected" : "ledger.reconciled", title: open ? `Reconciliation found ${open} open breaks` : "Reconciliation clean", detail: `${fmt.num(compared)} records compared across 5 sources`, objectType: "ReconciliationRun", objectId: run.id, href: "/registry/reconciliation", severity: open ? "warning" : "success" });
        return run;
      }, "write"),
    listRuns: () =>
      simulate("runs", () => {
        staffOnly();
        return getDb().reconRuns;
      }),
  },

  servicing: {
    listDistributions: (assetId) =>
      simulate("distributions", () => {
        // Investors see payouts only for products they hold.
        const own = scopedInvestorId();
        const held = own ? new Set(getDb().holdings.filter((h) => h.investorId === own).map((h) => h.assetId)) : undefined;
        return getDb()
          .distributions.filter((d) => tenantAssetIds().has(d.assetId) && (!held || held.has(d.assetId)) && (!assetId || d.assetId === assetId))
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
      }),
    calculateDistribution: (input) =>
      simulate("distribution", () => {
        requirePermission("servicing.write");
        requireModule("servicing");
        if (!(input.grossAmount > 0)) invalid("Gross amount must be greater than zero.", { grossAmount: "Required" });
        if (new Date(input.paymentDate) < new Date(input.recordDate)) invalid("Payment date must be on or after the record date.", { paymentDate: "Before record date" });
        const db = getDb();
        const a = findAsset(input.assetId);
        const tc = db.tokenClasses.find((t) => t.assetId === a.id);
        const holders = db.holdings.filter((h) => h.assetId === a.id && !h.frozen);
        const wht = a.jurisdiction === "SA" ? Math.round(input.grossAmount * 0.05 * 100) / 100 : 0;
        const d: D.Distribution = {
          id: uid("dst"), assetId: a.id, type: input.type, status: "calculated", grossAmount: input.grossAmount, withholdingTax: wht, netAmount: input.grossAmount - wht,
          perToken: tc && tc.canonicalSupply ? Math.round((input.grossAmount / tc.canonicalSupply) * 1e6) / 1e6 : 0, currency: a.valuation.currency, recordDate: input.recordDate, paymentDate: input.paymentDate, rail: input.rail, holdersCount: holders.length, paidCount: 0,
        };
        db.distributions.unshift(d);
        writeAudit({ action: "distribution.calculated", objectType: "Distribution", objectId: d.id, reason: `${input.type} for ${a.shortName}`, newState: "calculated" });
        return d;
      }, "write"),
    submitDistribution: (id) =>
      simulate("distribution", () => {
        requirePermission("servicing.write");
        requireModule("servicing");
        const db = getDb();
        const d = inTenantAsset("Distribution", id, db.distributions.find((x) => x.id === id));
        if (d.status !== "calculated" && d.status !== "scheduled") invalid(`Distribution is ${d.status}.`);
        d.status = "pending-approval";
        const a = db.assets.find((x) => x.id === d.assetId);
        const ap: D.Approval = {
          id: uid("apr"), tenantId: tenantId(), type: "distribution", title: `Approve ${fmt.sentence(d.type)} distribution, ${a?.shortName}`, summary: `${fmt.money(d.netAmount, d.currency)} net to ${d.holdersCount} holders via ${d.rail.toUpperCase()}.`,
          objectType: "Distribution", objectId: d.id, requestedBy: getCtx().actor.name, requestedAt: new Date().toISOString(), risk: "medium", status: "pending",
          steps: withMakerStep([{ role: "operations", label: "Operations approval" }, { role: "compliance-officer", label: "Compliance approval" }]), payload: { amount: fmt.dec(d.netAmount), holders: d.holdersCount },
        };
        db.approvals.unshift(ap);
        writeAudit({ action: "distribution.submitted", objectType: "Distribution", objectId: id, reason: "Submitted for approval", previousState: "calculated", newState: "pending-approval" });
        emit({ type: "approval.requested", title: "Distribution awaiting approval", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "info" });
        return ap;
      }, "write"),
    castVote: (actionId, choice) =>
      simulate("vote", () => {
        requirePermission("votes.cast");
        requireModule("servicing");
        const ca = inTenantAsset("Corporate action", actionId, getDb().corporateActions.find((c) => c.id === actionId));
        if (ca.status !== "open" || !ca.votes) invalid("Voting is not open for this action.");
        ca.votes[choice] = Math.round((ca.votes[choice] + 0.4) * 10) / 10;
        writeAudit({ action: "vote.cast", objectType: "CorporateAction", objectId: actionId, reason: ca.title, newState: choice, txHash: txHash() });
        return ca;
      }, "write"),
  },

  markets: {
    listOrders: (tokenClassId) =>
      simulate("order book", () => {
        const own = scopedInvestorId();
        return getDb().marketOrders
          .filter((m) => tenantAssetIds().has(m.assetId) && (!tokenClassId || m.tokenClassId === tokenClassId))
          .map((m) => (own && m.investorId !== own ? { ...m, investorId: "", investorName: MASKED } : m));
      }),
    listTrades: (tokenClassId) =>
      simulate("trades", () =>
        getDb().trades
          .filter((t) => tenantAssetIds().has(t.assetId) && (!tokenClassId || t.tokenClassId === tokenClassId))
          .map((t) => (scopedInvestorId() ? { ...t, buyer: maskName(t.buyer), seller: maskName(t.seller) } : t)),
      ),
    preTradeCheck: (input) => simulate("pre-trade check", () => runPreTrade(input)),
    placeOrder: (input) =>
      simulate("order", () => {
        requirePermission("markets.trade");
        requireModule("secondary-market");
        requireSelf(input.investorId);
        const db = getDb();
        const tc = findTokenClass(input.tokenClassId);
        const inv = findInvestor(input.investorId);
        if (!(input.quantity > 0) || !(input.price > 0)) invalid("Quantity and price must be greater than zero.");
        const check = requirePreTrade(input);
        const m: D.MarketOrder = { id: uid("mo"), tokenClassId: tc.id, assetId: tc.assetId, side: input.side, type: input.type, quantity: input.quantity, price: input.price, filled: 0, status: "open", venue: input.venue, investorId: inv.id, investorName: inv.name, createdAt: new Date().toISOString(), complianceDecision: check.decision };
        db.marketOrders.unshift(m);
        writeAudit({ action: "market.order_placed", objectType: "MarketOrder", objectId: m.id, reason: `${input.side} ${input.quantity} ${tc.symbol} @ ${input.price}`, newState: "open" });
        // An order held for compliance review rests in the book and is not matched until it is cleared.
        const opposite = check.decision === "ALLOW" && db.marketOrders.find((x) => x.tokenClassId === tc.id && x.status === "open" && x.complianceDecision !== "MANUAL_REVIEW" && x.side !== input.side && (input.side === "buy" ? x.price <= input.price : x.price >= input.price) && x.id !== m.id);
        if (opposite) {
          setTimeout(() => {
            const qty = Math.min(opposite.quantity - opposite.filled, m.quantity);
            m.filled = qty;
            m.status = qty >= m.quantity ? "filled" : "partially-filled";
            opposite.filled += qty;
            if (opposite.filled >= opposite.quantity) opposite.status = "filled";
            const t: D.Trade = { id: uid("trd"), tokenClassId: tc.id, assetId: tc.assetId, quantity: qty, price: opposite.price, buyer: input.side === "buy" ? inv.name : opposite.investorName, seller: input.side === "sell" ? inv.name : opposite.investorName, venue: m.venue, settlement: "atomic", status: "settled", executedAt: new Date().toISOString(), txHash: txHash() };
            db.trades.unshift(t);
            writeAudit({ action: "trade.settled", objectType: "Trade", objectId: t.id, reason: `${qty} ${tc.symbol} @ ${opposite.price}`, newState: "settled", txHash: t.txHash, system: "Settlement engine" });
            emit({ type: "trade.settled", title: "Trade matched and settled", detail: `${fmt.num(qty)} ${tc.symbol} @ ${opposite.price} · atomic DvP`, objectType: "Trade", objectId: t.id, href: "/markets", severity: "success" });
            persist();
          }, 2200);
        }
        return m;
      }, "write"),
    requestQuotes: (input) =>
      simulate("RFQ", () => {
        requirePermission("markets.trade");
        const db = getDb();
        const tc = findTokenClass(input.tokenClassId);
        const nav = db.assets.find((a) => a.id === tc.assetId)!.valuation.navPerToken;
        const dir = input.side === "buy" ? 1 : -1;
        return ["SRH Principal Desk", "Archax RFQ", "Emirates NBD Capital", "HSBC Markets"].map((dealer, i) => ({
          id: uid("qte"), dealer, price: Math.round(nav * (1 + dir * (0.0015 + i * 0.0012 + Math.random() * 0.001)) * 10_000) / 10_000, quantity: input.quantity, expiresInSec: 30 - i * 4,
        }));
      }),
    acceptQuote: (input, quote) =>
      simulate("RFQ execution", () => {
        requirePermission("markets.trade");
        requireModule("secondary-market");
        requireSelf(input.investorId);
        const db = getDb();
        const tc = findTokenClass(input.tokenClassId);
        const inv = findInvestor(input.investorId);
        if (requirePreTrade({ ...input, quantity: quote.quantity, price: quote.price }).decision !== "ALLOW") invalid("The pre-trade check needs compliance review, so this quote cannot be executed now. Place a limit order instead.");
        const t: D.Trade = { id: uid("trd"), tokenClassId: tc.id, assetId: tc.assetId, quantity: quote.quantity, price: quote.price, buyer: input.side === "buy" ? inv.name : quote.dealer, seller: input.side === "sell" ? inv.name : quote.dealer, venue: "rfq-desk", settlement: "dvp", status: "settling", executedAt: new Date().toISOString() };
        db.trades.unshift(t);
        writeAudit({ action: "trade.executed", objectType: "Trade", objectId: t.id, reason: `RFQ with ${quote.dealer}`, newState: "settling" });
        setTimeout(() => {
          t.status = "settled";
          t.txHash = txHash();
          emit({ type: "trade.settled", title: "RFQ trade settled", detail: `${fmt.num(t.quantity)} ${tc.symbol} @ ${t.price} with ${quote.dealer}`, objectType: "Trade", objectId: t.id, href: "/markets", severity: "success" });
          persist();
        }, 3000);
        return t;
      }, "write"),
  },

  defi: {
    listPositions: () =>
      simulate("DeFi positions", () => {
        staffOnly();
        return getDb().defiPositions.filter((d) => tenantAssetIds().has(d.assetId));
      }),
    setPositionStatus: (id, status) =>
      simulate("DeFi position", () => {
        requirePermission("defi.configure");
        requireModule("defi");
        const d = inTenantAsset("Position", id, getDb().defiPositions.find((x) => x.id === id));
        if (getDb().assets.find((x) => x.id === d.assetId)?.template === "sukuk" && d.kind === "repo" && status === "active") invalid("Sharia overlay SH-02 blocks interest-bearing repo for sukuk certificates.");
        const prev = d.status;
        d.status = status;
        writeAudit({ action: "defi.status_changed", objectType: "DefiPosition", objectId: id, reason: d.protocol, previousState: prev, newState: status, txHash: txHash() });
        return d;
      }, "write"),
  },

  custody: {
    listAccounts: () =>
      simulate("custody accounts", () => {
        staffOnly();
        return getDb().custodyAccounts;
      }),
    listProviders: () => simulate("providers", () => getDb().providers),
    testProvider: (id) =>
      simulate("provider test", () => {
        requirePermission("providers.test");
        const p = getDb().providers.find((x) => x.id === id) ?? notFound("Provider", id);
        p.latencyMs = Math.max(30, Math.round(p.latencyMs * (0.7 + Math.random() * 0.5)));
        p.lastSyncAt = new Date().toISOString();
        if (p.status === "degraded" && p.latencyMs < 1000) p.status = "operational";
        return p;
      }, "write"),
  },

  approvals: {
    listApprovals: (p) =>
      simulate("approvals", () => {
        staffOnly();
        return getDb().approvals.filter((a) => a.tenantId === tenantId() && (!p?.filters?.status || a.status === p.filters.status));
      }),
    decide: (id, decision, comment) =>
      simulate("approval", () => {
        requirePermission("approvals.decide");
        const db = getDb();
        const ap = inTenant("Approval", id, db.approvals.find((a) => a.id === id));
        if (ap.status !== "pending") invalid(`This request is already ${ap.status}.`);
        const { actor } = getCtx();
        if (ap.requestedBy === actor.name) forbidden("Segregation of duties: you raised this request, so another user must decide it.");
        const step = ap.steps.find((s) => !s.decision)!;
        const signerRoles = ["operations", "platform-admin"];
        const roleOk = step.role === actor.role || (step.role === "authorized-signer" && signerRoles.includes(actor.role));
        if (!roleOk) forbidden(`The next step needs ${step.role === "authorized-signer" ? "an authorised signer" : ROLE_META[step.role as D.Role].label}. Switch persona to continue.`);
        if (ap.steps.some((s) => s.approver === actor.name && s.decision === "approved")) forbidden("Segregation of duties: you already approved an earlier step of this request.");
        if (decision === "rejected" && !comment.trim()) invalid("Add a reason for the rejection.", { comment: "Required" });
        step.approver = step.role === "authorized-signer" ? `${actor.name} + HSM quorum 3/5` : actor.name;
        step.decision = decision;
        step.at = new Date().toISOString();
        step.comment = comment || undefined;
        writeAudit({ action: `approval.${decision}`, objectType: ap.objectType, objectId: ap.objectId, reason: `${ap.title}: ${step.label}`, previousState: "pending", newState: decision, approvedBy: actor.name });
        if (decision === "rejected") {
          ap.status = "rejected";
          if (ap.type === "distribution") {
            const d = db.distributions.find((x) => x.id === ap.objectId);
            if (d) d.status = "calculated";
          }
        } else if (ap.steps.every((s) => s.decision === "approved")) {
          executeApproval(ap);
        }
        return ap;
      }, "write"),
  },

  audit: {
    listEvents: (p) =>
      simulate("audit", () => {
        staffOnly();
        const f = p?.filters ?? {};
        const items = getDb().audit.filter(
          (e) => (e.tenantId === tenantId() || tenantId() === "tnt_srh") && (!f.objectType || e.objectType === f.objectType) && (!f.role || e.actor.role === f.role) && matches(`${e.action} ${e.objectId} ${e.actor.name} ${e.reason}`, p?.search),
        );
        return paginate(items, p);
      }),
    verifyChain: () =>
      simulate("chain verification", () => {
        staffOnly();
        const a = getDb().audit;
        let valid = true;
        for (let i = 0; i < a.length - 1; i++) if (a[i].prevHash !== a[i + 1].hash) { valid = false; break; }
        return { valid, checked: a.length, headHash: a[0]?.hash ?? "" };
      }),
  },

  events: {
    recent: () => simulate("events", () => getDb().events.filter(visibleEvent).slice(0, 60)),
    subscribe: (handler) =>
      onEvent((e) => {
        if (visibleEvent(e)) handler(e);
      }),
  },
};

