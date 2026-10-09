/**
 * Reference implementation of the compliance decision layer:
 *   Global core rules + Jurisdiction policy packs + Product rules + Offering rules + Investor rules
 * -> ALLOW / REJECT / MANUAL_REVIEW
 *
 * In production this runs server-side. It lives here so the mock adapter produces
 * decisions that are consistent with the data on screen.
 */
import type * as D from "@/types/domain";
import { CLASSIFICATION_LABEL, COUNTRY_NAME } from "@/lib/constants";
import { fmt } from "@/lib/utils";

interface EvalInput {
  investor: D.Investor;
  asset: D.Asset;
  offering?: D.Offering;
  amount?: number;
  wallet?: D.Wallet;
  packs: D.PolicyPack[];
  existingTokens: number;
  maxSupply?: number;
}

function enabled(packs: D.PolicyPack[], code: string) {
  for (const p of packs) {
    const r = p.rules.find((x) => x.code === code);
    if (r) return r.enabled;
  }
  return true;
}

export function evaluateEligibility(input: EvalInput): Omit<D.EligibilityResult, "id" | "evaluatedAt" | "durationMs"> {
  const { investor: inv, asset, offering, amount, wallet, packs } = input;
  const checks: D.EligibilityCheck[] = [];
  const add = (ruleCode: string, rule: string, layer: D.RuleLayer, outcome: D.EligibilityCheck["outcome"], detail: string) => {
    if (!enabled(packs, ruleCode)) {
      checks.push({ ruleCode, rule, layer, outcome: "pass", detail: "Rule disabled in active policy pack" });
      return;
    }
    checks.push({ ruleCode, rule, layer, outcome, detail });
  };

  // Global core
  const idStatus = inv.type === "entity" ? inv.kybStatus ?? inv.kycStatus : inv.kycStatus;
  add("G-001", inv.type === "entity" ? "KYB approved" : "KYC approved", "global", idStatus === "approved" ? "pass" : idStatus === "in-review" || idStatus === "pending" ? "review" : "fail",
    idStatus === "approved" ? `Verified by ${inv.kycProvider}` : `Identity status is ${idStatus}`);
  if (inv.profileComplete === false) {
    const open = (inv.verification ?? []).filter((v) => v.status === "missing" || v.status === "failed" || v.status === "pending").map((v) => v.label.toLowerCase());
    checks.push({ ruleCode: "G-007", rule: "Profile complete", layer: "global", outcome: "review", detail: open.length ? `Outstanding: ${open.slice(0, 3).join(", ")}` : "Profile items outstanding" });
  }
  add("G-002", "Sanctions screening", "global", inv.sanctionsHit ? "fail" : "pass", inv.sanctionsHit ? "Confirmed match on consolidated list" : "No match across UN, OFAC, EU, UK HMT and UAE lists");
  const pepUbo = inv.beneficialOwners.some((b) => b.pep);
  add("G-003", "PEP status", "global", inv.pep || pepUbo ? "review" : "pass", inv.pep ? "Investor is a PEP. Enhanced due diligence sign-off required." : pepUbo ? "A beneficial owner is a PEP" : "Not a PEP");
  add("G-004", "AML risk rating", "global", inv.amlRisk === "high" ? "review" : "pass", `AML risk rated ${inv.amlRisk}`);
  if (wallet) {
    const ok = wallet.whitelisted && wallet.riskScore < 60;
    add("G-005", "Wallet eligibility", "global", ok ? "pass" : wallet.riskScore >= 60 ? "fail" : "review",
      `${fmt.hash(wallet.address)} on ${wallet.chain}, risk score ${wallet.riskScore}, ${wallet.whitelisted ? "whitelisted" : "not whitelisted"}`);
  }
  const globalBlocked = ["KP", "IR", "SY", "CU"];
  add("G-006", "Platform blocked jurisdictions", "global", globalBlocked.includes(inv.residency) ? "fail" : "pass", `Residency ${COUNTRY_NAME[inv.residency] ?? inv.residency}`);

  // Jurisdiction and product
  const blocked = asset.rules.blockedCountries.includes(inv.residency);
  add("J-010", "Product jurisdiction restrictions", "jurisdiction", blocked ? "fail" : "pass",
    blocked ? `${COUNTRY_NAME[inv.residency] ?? inv.residency} residents are excluded from this product (${asset.jurisdiction} offering terms)` : `${COUNTRY_NAME[inv.residency] ?? inv.residency} permitted`);
  const clsOk = asset.rules.eligibleClassifications.includes(inv.classification);
  add("P-020", "Investor classification", "product", clsOk ? "pass" : "fail",
    clsOk ? `${CLASSIFICATION_LABEL[inv.classification]} is eligible` : `${CLASSIFICATION_LABEL[inv.classification]} investors are not eligible. Requires ${asset.rules.eligibleClassifications.map((c) => CLASSIFICATION_LABEL[c]).join(", ")}`);
  if (inv.classification !== "retail" && inv.accreditationExpiresAt) {
    const expires = new Date(inv.accreditationExpiresAt).getTime();
    const lockupEnd = Date.now() + asset.rules.lockupDays * 86_400_000;
    add("I-030", "Professional status in date", "investor", expires < Date.now() ? "fail" : expires < lockupEnd && asset.rules.lockupDays > 0 ? "review" : "pass",
      expires < Date.now() ? `Expired ${fmt.date(inv.accreditationExpiresAt)}` : `Valid until ${fmt.date(inv.accreditationExpiresAt)}`);
  }

  // Offering
  if (offering) {
    add("O-040", "Offering open", "offering", offering.status === "open" ? "pass" : "fail", `Offering status is ${offering.status}`);
    if (amount !== undefined) {
      const okMin = amount >= offering.minTicket;
      const okMax = amount <= offering.maxTicket;
      add("O-041", "Ticket size", "offering", okMin && okMax ? "pass" : "fail",
        okMin && okMax ? `${fmt.money(amount, offering.currency)} within ${fmt.money(offering.minTicket, offering.currency)} to ${fmt.money(offering.maxTicket, offering.currency)}` : !okMin ? `Below minimum ticket of ${fmt.money(offering.minTicket, offering.currency)}` : `Above maximum ticket of ${fmt.money(offering.maxTicket, offering.currency)}`);
      const remaining = offering.target - offering.subscribed;
      add("O-042", "Offering capacity", "offering", amount <= remaining ? "pass" : "review", amount <= remaining ? `${fmt.money(remaining, offering.currency, { compact: true })} capacity remaining` : "Oversubscribed. Pro-rata scaling will apply.");
    }
  }

  // Holding limit
  if (amount !== undefined && input.maxSupply) {
    const price = offering?.pricePerToken ?? asset.valuation.navPerToken;
    const pct = ((input.existingTokens + amount / price) / input.maxSupply) * 100;
    add("P-021", "Holding limit", "product", pct <= asset.rules.holdingLimitPct ? "pass" : "fail", `Post-trade holding ${pct.toFixed(2)}% against a ${asset.rules.holdingLimitPct}% limit`);
  }
  if (asset.rules.lockupDays > 0) add("P-022", "Lock-up period", "product", "pass", `${asset.rules.lockupDays} day lock-up applied to minted tokens`);

  const decision: D.Decision = checks.some((c) => c.outcome === "fail") ? "REJECT" : checks.some((c) => c.outcome === "review") ? "MANUAL_REVIEW" : "ALLOW";
  const version = packs.map((p) => `${p.id.replace("pol_", "")}@${p.version}`).join(", ");
  return { investorId: inv.id, assetId: asset.id, offeringId: offering?.id, decision, checks, policyVersion: version };
}

/** Regulatory capability engine: is this operator legally allowed to switch this function on? */
export function evaluateCapability(req: D.CapabilityRequest, tenant: D.Tenant, asset: D.Asset): D.CapabilityResult {
  const steps: D.CapabilityCheckStep[] = [];
  const activity: D.RegulatedActivity =
    req.capability === "secondary-trading" ? "marketplace-operation"
      : req.capability === "custody" ? "custody"
      : req.capability === "transfer-agency" ? "transfer-agency"
      : req.capability === "defi-access" ? "brokerage"
      : "distribution";

  const licences = tenant.licences.filter((l) => l.activities.includes(activity));
  const jurisMatch = licences.some((l) => l.jurisdiction === asset.jurisdiction || (l.jurisdiction.startsWith("AE") && asset.jurisdiction.startsWith("AE")));
  steps.push({ step: "Check jurisdiction", outcome: jurisMatch || licences.length === 0 ? "pass" : "review", detail: `Product booked in ${asset.jurisdiction}; operator licensed in ${tenant.licences.map((l) => l.jurisdiction).join(", ")}` });
  steps.push({ step: "Check asset type", outcome: "pass", detail: `${asset.template} is supported by the ${req.capability} template` });
  const instrumentOk = !(req.capability === "defi-access" && asset.template === "sukuk");
  steps.push({ step: "Check instrument", outcome: instrumentOk ? "pass" : "fail", detail: instrumentOk ? `${asset.instrument.type} permitted` : "Sharia overlay SH-02 forbids interest-bearing collateral use" });
  const catOk = asset.rules.eligibleClassifications.includes(req.investorCategory);
  steps.push({ step: "Check investor category", outcome: catOk ? "pass" : "fail", detail: catOk ? `${CLASSIFICATION_LABEL[req.investorCategory]} permitted for this product` : `${CLASSIFICATION_LABEL[req.investorCategory]} not permitted for this product` });
  if (req.tradingModel) {
    const tmOk = req.tradingModel !== "amm" || req.capability === "defi-access";
    steps.push({ step: "Check trading model", outcome: tmOk ? "pass" : "review", detail: tmOk ? `${req.tradingModel} supported` : "AMM trading of restricted securities requires a regulator no-objection" });
  }
  const resp = tenant.responsibilities.find((r) => r.activity === activity);
  steps.push({ step: "Check operator", outcome: resp && !/not enabled|not applicable/i.test(resp.entity) ? "pass" : "fail", detail: resp ? `${fmt.titleCase(activity)} operated by ${resp.entity} (${resp.type.replace("-", " ")})` : "No responsible entity configured" });
  const active = licences.find((l) => l.status === "active");
  const pending = licences.find((l) => l.status === "pending");
  const external = resp?.type === "external-provider";
  steps.push({
    step: "Check regulatory permission",
    outcome: active || external ? "pass" : pending ? "review" : "fail",
    detail: active ? `${active.holder} holds ${active.regulator} ${active.reference}` : external ? `Delegated to licensed external provider: ${resp?.entity}` : pending ? `${pending.holder} application ${pending.reference} is pending with ${pending.regulator}` : `No licence covering ${activity.replace("-", " ")} held by ${tenant.name}`,
  });
  const decision = steps.some((s) => s.outcome === "fail") ? "REJECT" : steps.some((s) => s.outcome === "review") ? "COMPLIANCE_REVIEW" : "ENABLE";
  return { decision, steps, evaluatedAt: new Date().toISOString() };
}
