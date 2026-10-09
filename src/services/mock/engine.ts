/**
 * Event-driven lifecycle engine (mock).
 *
 * Order -> Eligibility -> Payment Instruction -> Payment Confirmation -> Allocation
 *       -> Settlement -> Mint -> Reconciliation
 *
 * Each transition is a separate state, written to the order history, the audit chain
 * and the event bus. Transitions are idempotent: a stage is only applied if the order
 * is still in the expected previous stage.
 */
import type * as D from "@/types/domain";
import { ORDER_STAGES, RAIL_META, STAGE_META } from "@/lib/constants";
import { simulation } from "@/services/config";
import { fmt, uid } from "@/lib/utils";
import { getDb, persist } from "./db";
import { emit, txHash, writeAudit } from "./runtime";
import { evaluateEligibility } from "./rules";

const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Orders at or above this amount need four-eyes approval before minting. Set in Internal rules. */
const mintThreshold = () => getDb().internalRules?.mintApprovalThresholdUsd ?? 1_000_000;

/** Payment provider by rail and currency. */
export function providerForRail(rail: D.PaymentRail, ccy?: D.Currency) {
  return rail === "usdc" ? "Circle (USDC)" : rail === "usdt" ? "Fireblocks Network (USDT)" : rail === "aed-stablecoin" ? "AE Coin" : rail === "tokenized-deposit" ? "Meridian Bank tokenised deposits" : rail === "card" ? "Checkout.com" : rail === "sepa" || ccy === "GBP" || ccy === "EUR" ? "HSBC" : "Emirates NBD";
}

const STAGE_EVENT: Record<D.OrderStage, D.PlatformEventType> = {
  submitted: "order.submitted",
  eligibility: "order.eligibility_passed",
  "payment-instructed": "payment.instructed",
  "payment-confirmed": "payment.confirmed",
  allocated: "order.allocated",
  settled: "settlement.completed",
  minted: "token.minted",
  reconciled: "ledger.reconciled",
};

function nextStage(s: D.OrderStage): D.OrderStage | null {
  const i = ORDER_STAGES.indexOf(s);
  return i < ORDER_STAGES.length - 1 ? ORDER_STAGES[i + 1] : null;
}

function findOrder(id: string) {
  return getDb().orders.find((o) => o.id === id);
}

function assetName(o: D.Order) {
  return getDb().assets.find((a) => a.id === o.assetId)?.shortName ?? o.assetId;
}

export function applyStage(o: D.Order, stage: D.OrderStage, actor: string, note?: string, ref?: string) {
  const prev = o.stage;
  o.stage = stage;
  o.updatedAt = new Date().toISOString();
  o.history.push({ stage, at: o.updatedAt, actor, note, ref });
  if (stage === "reconciled") o.status = "completed";
  writeAudit({ action: "order." + stage.replace("-", "_"), objectType: "Order", objectId: o.id, reason: STAGE_META[stage].description, previousState: prev, newState: stage, system: actor, txHash: ref?.startsWith("0x") ? ref : undefined });
  emit({
    type: STAGE_EVENT[stage],
    title: STAGE_META[stage].label,
    detail: `${o.investorName} · ${assetName(o)} · ${fmt.money(o.amount, o.currency)}`,
    objectType: "Order",
    objectId: o.id,
    href: `/orders/${o.id}`,
    severity: stage === "minted" || stage === "payment-confirmed" || stage === "reconciled" ? "success" : "info",
  });
  persist();
}

function later(orderId: string, ms: number, fn: () => void) {
  const existing = timers.get(orderId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    timers.delete(orderId);
    fn();
  }, ms);
  timers.set(orderId, t);
}

function speed(ms: number) {
  return simulation.latency === "fast" ? ms * 0.4 : simulation.latency === "slow" ? ms * 1.8 : ms;
}

/* ---------------------------- stage handlers ---------------------------- */

export function runEligibility(o: D.Order) {
  const db = getDb();
  const investor = db.investors.find((i) => i.id === o.investorId)!;
  const asset = db.assets.find((a) => a.id === o.assetId)!;
  const offering = db.offerings.find((x) => x.id === o.offeringId);
  const wallet = investor.wallets.find((w) => w.chain === o.chain) ?? investor.wallets[0];
  const tc = db.tokenClasses.find((t) => t.assetId === asset.id);
  const existing = db.holdings.filter((h) => h.investorId === investor.id && h.assetId === asset.id).reduce((s, h) => s + h.quantity, 0);
  const t0 = performance.now();
  const r = evaluateEligibility({ investor, asset, offering, amount: o.amount, wallet, packs: db.policyPacks.filter((p) => asset.policyPackIds.includes(p.id) && p.status === "active"), existingTokens: existing, maxSupply: tc?.maxSupply ?? tc?.canonicalSupply });
  o.eligibility = { ...r, id: uid("elg"), evaluatedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - t0 + 38) };
  const passed = r.checks.filter((c) => c.outcome === "pass").length;
  if (r.decision === "REJECT") {
    o.status = "rejected";
    const fail = r.checks.find((c) => c.outcome === "fail");
    o.exceptionReason = fail ? `${fail.rule}: ${fail.detail}` : "Rejected by policy";
    o.history.push({ stage: "eligibility", at: new Date().toISOString(), actor: "Compliance engine", note: "Rejected. " + o.exceptionReason });
    o.stage = "eligibility";
    o.updatedAt = new Date().toISOString();
    writeAudit({ action: "order.rejected", objectType: "Order", objectId: o.id, reason: o.exceptionReason, previousState: "submitted", newState: "rejected", system: "Compliance engine", provider: "ComplyAdvantage" });
    emit({ type: "order.rejected", title: "Order rejected by policy", detail: `${o.investorName} · ${o.exceptionReason}`, objectType: "Order", objectId: o.id, href: `/orders/${o.id}`, severity: "warning" });
    persist();
    return;
  }
  if (r.decision === "MANUAL_REVIEW") {
    o.status = "manual-review";
    const rev = r.checks.find((c) => c.outcome === "review");
    o.exceptionReason = rev ? `${rev.rule}: ${rev.detail}` : "Manual review required";
    o.stage = "eligibility";
    o.updatedAt = new Date().toISOString();
    o.history.push({ stage: "eligibility", at: o.updatedAt, actor: "Compliance engine", note: "Routed to manual review. " + o.exceptionReason });
    writeAudit({ action: "order.manual_review", objectType: "Order", objectId: o.id, reason: o.exceptionReason, previousState: "submitted", newState: "manual-review", system: "Compliance engine" });
    emit({ type: "order.eligibility_review", title: "Order needs compliance review", detail: `${o.investorName} · ${o.exceptionReason}`, objectType: "Order", objectId: o.id, href: `/orders/${o.id}`, severity: "warning" });
    persist();
    return;
  }
  applyStage(o, "eligibility", "Compliance engine", `${passed} of ${r.checks.length} rules passed`);
}

function instructPayment(o: D.Order) {
  const db = getDb();
  const p: D.Payment = {
    id: uid("pay"), tenantId: o.tenantId, orderId: o.id, direction: "inbound", purpose: "subscription", rail: o.rail, amount: o.amount, currency: o.currency,
    status: "pending", reference: "SRH-" + o.id.slice(4).toUpperCase() + "-" + Math.random().toString(16).slice(2, 6).toUpperCase(), counterparty: o.investorName,
    bank: providerForRail(o.rail, o.currency), provider: providerForRail(o.rail, o.currency),
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(p);
  o.paymentId = p.id;
  applyStage(o, "payment-instructed", "Payment orchestrator", `${RAIL_META[o.rail].label} instruction issued. Reference ${p.reference}`, p.reference);
}

function confirmPayment(o: D.Order, actor = o.rail === "card" ? "Checkout.com webhook (3-D Secure passed)" : RAIL_META[o.rail].kind === "digital" ? `${providerForRail(o.rail)} webhook` : `${providerForRail(o.rail, o.currency)} webhook (camt.054)`) {
  const db = getDb();
  const p = db.payments.find((x) => x.id === o.paymentId);
  if (p) {
    p.status = "confirmed";
    p.confirmedAt = new Date().toISOString();
    if (RAIL_META[o.rail].kind === "digital") p.txHash = txHash();
  }
  applyStage(o, "payment-confirmed", actor, `${fmt.money(o.amount, o.currency)} received and matched`, p?.txHash ?? p?.reference);
}

function allocate(o: D.Order) {
  const db = getDb();
  const off = db.offerings.find((x) => x.id === o.offeringId);
  if (off) {
    off.subscribed += o.amount;
    off.investorsCount += 1;
  }
  applyStage(o, "allocated", "Allocation service", `${fmt.num(o.tokens)} units allocated at ${fmt.money(o.pricePerToken, o.currency, { digits: 4 })}`);
}

function settle(o: D.Order) {
  applyStage(o, "settled", "Settlement engine", o.settlement === "dvp" ? "Delivery versus payment instruction completed" : o.settlement === "atomic" ? "Atomic swap settled on-chain" : "Cash leg released to issuer account");
}

export function mintTokens(o: D.Order, approvedBy?: string) {
  const db = getDb();
  const tc = db.tokenClasses.find((t) => t.assetId === o.assetId);
  const hash = txHash();
  if (tc) {
    tc.canonicalSupply += o.tokens;
    const dep = tc.deployments.find((d) => d.chain === o.chain) ?? tc.deployments[0];
    dep.supply += o.tokens;
    const inv = db.investors.find((i) => i.id === o.investorId)!;
    const wallet = inv.wallets.find((w) => w.chain === dep.chain) ?? inv.wallets[0];
    let h = db.holdings.find((x) => x.investorId === o.investorId && x.tokenClassId === tc.id && x.chain === dep.chain);
    const asset = db.assets.find((a) => a.id === o.assetId)!;
    if (!h) {
      h = {
        id: uid("hld"), investorId: inv.id, investorName: inv.name, assetId: asset.id, tokenClassId: tc.id, chain: dep.chain, walletAddress: wallet.address, quantity: 0, costBasis: 0,
        legalOwner: asset.ownershipModel === "custodian" || asset.ownershipModel === "csd" ? (wallet.custodian ?? "Komainu") + " (nominee)" : inv.name,
        beneficialOwner: inv.name, custodian: wallet.custodian, frozen: false, acquiredAt: new Date().toISOString(),
        lockedUntil: asset.rules.lockupDays ? new Date(Date.now() + asset.rules.lockupDays * 86_400_000).toISOString() : undefined,
      };
      db.holdings.unshift(h);
      dep.holders += 1;
    }
    h.quantity += o.tokens;
    h.costBasis += o.amount;
    inv.totalInvested += o.amount;
    inv.holdingsCount = db.holdings.filter((x) => x.investorId === inv.id).length;
    asset.aum += o.amount;
    asset.investorsCount = new Set(db.holdings.filter((x) => x.assetId === asset.id).map((x) => x.investorId)).size;
  }
  o.mintTxHash = hash;
  applyStage(o, "minted", "Blockchain transaction manager", `${fmt.num(o.tokens)} ${tc?.symbol ?? ""} minted on ${o.chain}${approvedBy ? ` (approved by ${approvedBy})` : ""}`, hash);
}

function reconcile(o: D.Order) {
  const db = getDb();
  const p = db.payments.find((x) => x.id === o.paymentId);
  if (p) p.status = "reconciled";
  const j = uid("jrn");
  const at = new Date().toISOString();
  db.ledger.unshift(
    { id: uid("led"), journalId: j, at, account: "2100 Subscriptions pending allocation", debit: o.amount, credit: 0, currency: o.currency, memo: "Settled to issuer", ref: o.id },
    { id: uid("led"), journalId: j, at, account: "2200 Issuer proceeds payable", debit: 0, credit: o.amount, currency: o.currency, memo: "Settled to issuer", ref: o.id },
  );
  applyStage(o, "reconciled", "Reconciliation engine", "Blockchain, register, custodian, bank and ledger agree");
}

/** Minting waits until the token class has passed manual issuance verification. */
function issuanceBlocked(o: D.Order) {
  const db = getDb();
  const tc = db.tokenClasses.find((t) => t.assetId === o.assetId);
  if (!db.internalRules?.issuanceVerificationRequired || !tc?.issuance || tc.issuance.status === "verified") return false;
  o.status = "exception";
  o.exceptionReason = `Issuance verification for ${tc.symbol} is not complete. Minting resumes once every check is verified or waived.`;
  o.updatedAt = new Date().toISOString();
  writeAudit({ action: "order.mint_held", objectType: "Order", objectId: o.id, reason: o.exceptionReason, previousState: "settled", newState: "exception", system: "Settlement engine" });
  persist();
  return true;
}

function requestMintApproval(o: D.Order) {
  const db = getDb();
  if (db.approvals.some((a) => a.payload.orderId === o.id && a.status === "pending")) return;
  const tc = db.tokenClasses.find((t) => t.assetId === o.assetId);
  const ap: D.Approval = {
    id: uid("apr"), tenantId: o.tenantId, type: "mint", title: `Mint ${fmt.num(o.tokens)} ${tc?.symbol ?? ""} for ${o.investorName}`,
    summary: `Order ${o.id} exceeds the ${fmt.money(mintThreshold())} auto-mint threshold. Four-eyes approval and HSM signing required.`,
    objectType: "Order", objectId: o.id, requestedBy: "Settlement engine", requestedAt: new Date().toISOString(), risk: o.amount > 5_000_000 ? "high" : "medium", status: "pending",
    steps: [{ role: "operations", label: "Operations approval" }, { role: "compliance-officer", label: "Compliance approval" }, { role: "authorized-signer", label: "Authorised signer (HSM quorum 3 of 5)" }],
    payload: { orderId: o.id, chain: o.chain, amount: fmt.num(o.tokens) },
  };
  db.approvals.unshift(ap);
  writeAudit({ action: "approval.requested", objectType: "Approval", objectId: ap.id, reason: ap.title, newState: "pending", system: "Settlement engine" });
  emit({ type: "approval.requested", title: "Mint approval required", detail: ap.title, objectType: "Approval", objectId: ap.id, href: "/approvals", severity: "info" });
  persist();
}

/* ------------------------------ scheduling ------------------------------ */

/** Moves an order forward automatically, the way provider webhooks and services would. */
export function schedule(orderId: string) {
  const o = findOrder(orderId);
  if (!o || o.status !== "active") return;
  switch (o.stage) {
    case "submitted":
      return later(o.id, speed(1600), () => { runEligibility(o); schedule(o.id); });
    case "eligibility":
      return later(o.id, speed(900), () => { instructPayment(o); schedule(o.id); });
    case "payment-instructed":
      return later(o.id, speed(RAIL_META[o.rail].kind === "digital" || o.rail === "card" ? 4200 : 22_000), () => { if (o.stage === "payment-instructed" && o.status === "active") { confirmPayment(o); schedule(o.id); } });
    case "payment-confirmed":
      return later(o.id, speed(2400), () => { allocate(o); schedule(o.id); });
    case "allocated":
      return later(o.id, speed(2600), () => { settle(o); schedule(o.id); });
    case "settled":
      if (issuanceBlocked(o)) return;
      if (o.amount >= mintThreshold()) return requestMintApproval(o);
      return later(o.id, speed(3200), () => { mintTokens(o); schedule(o.id); });
    case "minted":
      return later(o.id, speed(3000), () => { reconcile(o); });
    default:
      return;
  }
}

/** Manual operator action. Applies the next stage now. */
export function advanceNow(o: D.Order, note?: string) {
  const t = timers.get(o.id);
  if (t) clearTimeout(t);
  timers.delete(o.id);
  const next = nextStage(o.stage);
  if (!next) return;
  if (o.stage === "submitted") runEligibility(o);
  else if (next === "payment-instructed") instructPayment(o);
  else if (next === "payment-confirmed") confirmPayment(o, "Operations (manual receipt match)" + (note ? `: ${note}` : ""));
  else if (next === "allocated") allocate(o);
  else if (next === "settled") settle(o);
  else if (next === "minted") {
    if (issuanceBlocked(o)) return;
    if (o.amount >= mintThreshold()) requestMintApproval(o);
    else mintTokens(o);
  } else if (next === "reconciled") reconcile(o);
}

let started = false;
let ambientTimer: ReturnType<typeof setInterval> | null = null;

/** Resume in-session orders after a reload and start ambient activity. */
export function startEngine() {
  if (started || typeof window === "undefined") return;
  started = true;
  const db = getDb();
  db.orders.filter((o) => o.status === "active" && o.idempotencyKey.startsWith("idem_live")).forEach((o) => schedule(o.id));
  ambientTimer = setInterval(ambientTick, 38_000);
}

export function stopEngine() {
  if (ambientTimer) clearInterval(ambientTimer);
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  started = false;
}

let tick = 0;
function ambientTick() {
  if (!simulation.ambientEvents) return;
  const db = getDb();
  tick++;
  if (tick % 3 === 0) {
    const a = db.assets.find((x) => x.id === "ast_tbill");
    if (a) {
      const prev = a.valuation.navPerToken;
      a.valuation.navPerToken = Math.round((prev * (1 + a.income.targetYieldPct / 100 / 365 / 24)) * 1e6) / 1e6;
      a.valuation.lastUpdated = new Date().toISOString();
      emit({ type: "nav.updated", title: "NAV published on-chain", detail: `${a.shortName} NAV ${a.valuation.navPerToken.toFixed(4)} pushed by Chainlink to 4 deployments`, objectType: "Asset", objectId: a.id, href: `/assets/${a.id}`, severity: "info" });
      persist();
    }
    return;
  }
  const candidates = db.orders.filter((o) => o.status === "active" && !o.idempotencyKey.startsWith("idem_live") && ["payment-instructed", "payment-confirmed", "allocated", "settled", "minted"].includes(o.stage) && !(o.stage === "settled" && o.amount >= mintThreshold()));
  if (!candidates.length) return;
  const o = candidates[Math.floor(Math.random() * candidates.length)];
  advanceNow(o);
}
