/* Temporary QA script: exercises every mock adapter mutation per persona. Delete after use. */
import { mockAdapter as api } from "@/services/mock/adapter";
import { setSimulation } from "@/services/config";
import { resetDb, getDb } from "@/services/mock/db";
import { stopEngine } from "@/services/mock/engine";
import personas from "@/mocks/data/personas.json";
import type * as D from "@/types/domain";

setSimulation({ latency: "fast", failureRate: 0, ambientEvents: false });
const P = personas as D.Persona[];
const as = (id: string, tenantId = "tnt_srh") => api.setContext({ tenantId, actor: P.find((p) => p.id === id)! });

async function outcome(fn: () => Promise<unknown>) {
  try {
    await fn();
    return "ok";
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return String(err.status ?? "ERR") + (err.status === 403 ? "" : `:${(err.message ?? "").slice(0, 50)}`);
  }
}

const muts: Record<string, () => Promise<unknown>> = {
  updateModules: () => api.platform.updateModules("tnt_xyz", getDb().tenants.find((t) => t.id === "tnt_xyz")!.modules),
  updateBrand: () => api.platform.updateBrand("tnt_srh", { tagline: "x" } as never),
  createApiKey: () => api.platform.createApiKey("qa", ["read"]),
  createInvestor: () => api.identity.createInvestor({ type: "individual", name: "QA " + Math.random(), email: `qa${Math.random()}@x.io`, country: "AE", residency: "AE", classification: "professional", documents: [] } as never),
  decideKyc: () => api.identity.decideKyc("inv_ryc787", "approved", "qa"),
  addWallet: () => api.identity.addWallet("inv_ryc787", { address: "0x" + Math.random().toString(16).slice(2).padEnd(40, "0"), chain: "ethereum", type: "self-custody", label: "qa" } as never),
  setWalletWhitelist: () => api.identity.setWalletWhitelist("inv_ryc787", getDb().investors.find((i) => i.id === "inv_ryc787")!.wallets[0].id, true),
  toggleRule: () => { const p = getDb().policyPacks[0]; return api.compliance.toggleRule(p.id, p.rules[0].id, p.rules[0].enabled); },
  resolveAlert: () => api.compliance.resolveAlert(getDb().screeningAlerts.find((a) => a.status === "open")!.id, "escalated", "qa"),
  createAsset: () => api.assets.createAsset({ name: "QA", shortName: "QA", template: "real-estate", issuerId: "iss_x", description: "", underlying: {}, legalEntity: { jurisdiction: "AE" }, instrument: {}, valuation: { method: "x", currency: "USD", frequency: "monthly" }, income: {}, servicer: "", ownershipModel: "direct", offering: { pricePerToken: 1, currency: "USD", minTicket: 1, target: 100, rails: ["swift"] }, rules: { eligibleClassifications: [], blockedCountries: [] }, token: { symbol: "QA" + Math.floor(Math.random() * 1e6), standard: "erc-3643", decimals: 0, chains: ["ethereum"], controls: [] } } as never),
  submitForReview: () => api.assets.submitForReview(getDb().assets.find((a) => a.tenantId === "tnt_srh" && (a.status === "draft" || a.status === "structuring"))?.id ?? "none"),
  subscribe: () => { const o = getDb().offerings.find((x) => x.tenantId === "tnt_srh" && x.status === "open")!; return api.orders.subscribe({ offeringId: o.id, investorId: "inv_ahmed", amount: o.minTicket, rail: o.rails[0], chain: "ethereum" } as never); },
  subscribeOther: () => { const o = getDb().offerings.find((x) => x.tenantId === "tnt_srh" && x.status === "open")!; return api.orders.subscribe({ offeringId: o.id, investorId: "inv_ryc787", amount: o.minTicket, rail: o.rails[0], chain: "ethereum" } as never); },
  advance: () => api.orders.advance(getDb().orders.find((o) => o.tenantId === "tnt_srh" && o.status === "active" && o.stage !== "reconciled")!.id),
  resolveException: () => api.orders.resolveException(getDb().orders.find((o) => o.status === "exception")?.id ?? "none", "retry", "qa"),
  cancel: () => api.orders.cancel(getDb().orders.find((o) => o.tenantId === "tnt_srh" && o.status === "active" && !["minted", "reconciled"].includes(o.stage))!.id, "qa"),
  requestOperation: () => api.tokens.requestOperation({ tokenClassId: "tok_srht", operation: "mint", amount: 10, chain: "ethereum", reason: "qa" } as never),
  deployToChain: () => api.tokens.deployToChain("tok_srht", "base" as D.Chain),
  resolveBreak: () => api.registry.resolveBreak(getDb().reconBreaks.find((b) => b.status !== "resolved")!.id, "qa"),
  runReconciliation: () => api.registry.runReconciliation(),
  calculateDistribution: () => api.servicing.calculateDistribution({ assetId: "ast_jalp", type: "rental-income", grossAmount: 100, recordDate: "2026-10-01", paymentDate: "2026-10-10", rail: "swift" } as never),
  submitDistribution: () => api.servicing.submitDistribution(getDb().distributions.find((d) => d.status === "calculated" || d.status === "scheduled")?.id ?? "none"),
  castVote: () => api.servicing.castVote(getDb().corporateActions.find((c) => c.status === "open" && c.votes)?.id ?? "none", "for"),
  placeOrder: () => api.markets.placeOrder({ tokenClassId: "tok_srht", investorId: "inv_ahmed", side: "buy", type: "limit", quantity: 1, price: 1, venue: "srh-ats" } as never),
  placeOrderOther: () => api.markets.placeOrder({ tokenClassId: "tok_srht", investorId: "inv_ryc787", side: "buy", type: "limit", quantity: 1, price: 1, venue: "srh-ats" } as never),
  acceptQuote: () => api.markets.acceptQuote({ tokenClassId: "tok_srht", investorId: "inv_ahmed", side: "buy", type: "rfq", quantity: 1, price: 1, venue: "otc" } as never, { id: "q", dealer: "D", price: 1, quantity: 1, expiresInSec: 30 }),
  setPositionStatus: () => { const d = getDb().defiPositions.find((x) => x.status === "active")!; return api.defi.setPositionStatus(d.id, "active"); },
  testProvider: () => api.custody.testProvider(getDb().providers[0].id),
  decideApproval: () => api.approvals.decide("apr_301", "approved", "qa"),
};

async function main() {
  const ids = P.map((p) => p.id);
  const rows: string[] = [];
  rows.push(["mutation", ...ids].join("\t"));
  for (const [name, fn] of Object.entries(muts)) {
    const cells: string[] = [];
    for (const id of ids) {
      resetDb();
      as(id);
      cells.push(await outcome(fn));
    }
    rows.push([name, ...cells].join("\t"));
  }
  console.log(rows.join("\n"));

  // Investor data isolation
  resetDb();
  as("usr_inv");
  const r: Record<string, string> = {};
  r.listOrders = String((await api.orders.listOrders()).every((o) => o.investorId === "inv_ahmed"));
  r.getOtherOrder = await outcome(() => api.orders.getOrder("ord_40423"));
  r.getOtherSrhOrder = await outcome(() => api.orders.getOrder(getDb().orders.find((o) => o.tenantId === "tnt_srh" && o.investorId !== "inv_ahmed")!.id));
  r.getOtherInvestor = await outcome(() => api.identity.getInvestor("inv_ryc787"));
  r.getSelf = await outcome(() => api.identity.getInvestor("inv_ahmed"));
  r.listInvestorsCount = String((await api.identity.listInvestors()).items.length);
  r.holdingsOnlyOwn = String((await api.registry.listHoldings()).every((h) => h.investorId === "inv_ahmed"));
  r.marketNames = [...new Set((await api.markets.listOrders()).map((m) => m.investorName))].slice(0, 4).join("|");
  r.tradeNames = [...new Set((await api.markets.listTrades()).flatMap((t) => [t.buyer, t.seller]))].slice(0, 4).join("|");
  r.eligOther = await outcome(() => api.compliance.checkEligibility({ investorId: "inv_ryc787", assetId: "ast_jalp" } as never));
  r.preTradeOther = await outcome(() => api.markets.preTradeCheck({ tokenClassId: "tok_srht", investorId: "inv_ryc787", side: "buy", type: "limit", quantity: 1, price: 1, venue: "srh-ats" } as never));
  r.eventsVisible = String((await api.events.recent()).length);
  console.log("\nINVESTOR", JSON.stringify(r, null, 1));

  // Tenant isolation
  resetDb();
  as("usr_ops", "tnt_xyz");
  const t: Record<string, string> = {};
  t.getSrhOrder = await outcome(() => api.orders.getOrder("ord_40395"));
  t.getSrhAsset = await outcome(() => api.assets.getAsset("ast_jalp"));
  t.getSrhInvestor = await outcome(() => api.identity.getInvestor("inv_ryc787"));
  t.decideSrhApproval = await outcome(() => api.approvals.decide("apr_301", "approved", "qa"));
  t.alertsCrossTenant = String((await api.compliance.listAlerts()).filter((a) => getDb().investors.find((i) => i.id === a.investorId)?.tenantId !== "tnt_xyz").length);
  console.log("\nTENANT xyz as ops", JSON.stringify(t, null, 1));

  // Modules: Talara has no secondary-market, defi; Meridian lacks identity, assets, primary-market, servicing
  resetDb();
  const m: Record<string, string> = {};
  as("usr_ops", "tnt_xyz");
  m.xyzPlaceOrder = await outcome(() => api.markets.placeOrder({ tokenClassId: "tok_xmcr", investorId: "inv_shca89", side: "buy", type: "limit", quantity: 1, price: 1, venue: "srh-ats" } as never));
  as("usr_ops", "tnt_mrd");
  m.mrdCreateAsset = await outcome(muts.createAsset);
  m.mrdCreateInvestor = await outcome(muts.createInvestor);
  as("usr_adm", "tnt_xyz");
  m.xyzDefi = await outcome(muts.setPositionStatus);
  console.log("\nMODULES", JSON.stringify(m, null, 1));

  // SoD
  resetDb();
  as("usr_ops");
  const ap = await api.tokens.requestOperation({ tokenClassId: "tok_srht", operation: "mint", amount: 10, chain: "ethereum", reason: "qa" } as never);
  const s: Record<string, string> = {};
  s.requesterApprovesOwn = await outcome(() => api.approvals.decide(ap.id, "approved", "qa"));
  as("usr_cco");
  s.ccoStep = await outcome(() => api.approvals.decide(ap.id, "approved", "qa"));
  as("usr_ops");
  s.requesterSigns = await outcome(() => api.approvals.decide(ap.id, "approved", "qa"));
  as("usr_adm");
  s.adminSigns = await outcome(() => api.approvals.decide(ap.id, "approved", "qa"));
  s.finalStatus = getDb().approvals.find((a) => a.id === ap.id)!.status;
  // mint >= 1m via subscription
  resetDb();
  as("usr_ops");
  const off = getDb().offerings.find((x) => x.tenantId === "tnt_srh" && x.status === "open" && x.maxTicket >= 1_000_000)!;
  const ord = await api.orders.subscribe({ offeringId: off.id, investorId: "inv_ahmed", amount: Math.max(1_000_000, off.minTicket), rail: off.rails[0], chain: "ethereum" } as never);
  for (let i = 0; i < 8; i++) { try { await api.orders.advance(ord.id); } catch (e) { s["advance" + i] = (e as Error).message.slice(0, 60); break; } }
  const o2 = getDb().orders.find((o) => o.id === ord.id)!;
  s.bigOrderStage = `${o2.stage}/${o2.status}`;
  const mintAp = getDb().approvals.find((a) => a.payload.orderId === ord.id);
  s.mintApproval = mintAp ? mintAp.status : "none";
  if (mintAp) {
    as("usr_ops"); s.mA1 = await outcome(() => api.approvals.decide(mintAp.id, "approved", "qa"));
    as("usr_ops"); s.mA1again = await outcome(() => api.approvals.decide(mintAp.id, "approved", "qa"));
    as("usr_cco"); s.mA2 = await outcome(() => api.approvals.decide(mintAp.id, "approved", "qa"));
    as("usr_iss"); s.mA3iss = await outcome(() => api.approvals.decide(mintAp.id, "approved", "qa"));
    as("usr_adm"); s.mA3 = await outcome(() => api.approvals.decide(mintAp.id, "approved", "qa"));
    s.afterMint = getDb().orders.find((o) => o.id === ord.id)!.stage;
  }
  console.log("\nSOD", JSON.stringify(s, null, 1));
  stopEngine();
  process.exit(0);
}
main();
