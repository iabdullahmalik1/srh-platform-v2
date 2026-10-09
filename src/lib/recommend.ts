import type * as D from "@/types/domain";
import { TEMPLATE_META } from "@/lib/constants";
import { RISK_META } from "@/lib/risk";

export interface Recommendation {
  offering: D.Offering;
  asset: D.Asset;
  score: number;
  reasons: string[];
}

const GCC = new Set(["AE", "SA", "BH", "QA", "KW", "OM"]);
const regionsOf = (a: D.Asset): string[] => {
  const codes: string[] = [a.jurisdiction, ...(a.regimes ?? [])].map((j): string => (j.startsWith("AE") ? "AE" : j.startsWith("EU") ? "EU" : j));
  const out = new Set<string>();
  codes.forEach((c) => {
    if (GCC.has(c)) out.add("GCC");
    if (c === "GB") out.add("United Kingdom");
    if (c === "EU" || c === "LU" || c === "CH") out.add("Europe");
    if (c === "SG" || c === "HK" || c === "PK") out.add("Asia");
  });
  if (/United Kingdom|Manchester|London/.test(a.underlying.location ?? "")) out.add("United Kingdom");
  out.add("Global");
  return [...out];
};

/**
 * Ranks open and upcoming offerings for an investor: product type and risk appetite count most,
 * then income or growth goal and region. Products the investor cannot buy are left out.
 */
export function recommend(investor: D.Investor | undefined, offerings: D.Offering[], assets: D.Asset[], heldAssetIds: Set<string>, limit = 3): Recommendation[] {
  const i = investor?.interests;
  const out: Recommendation[] = [];
  for (const o of offerings) {
    if (o.status !== "open" && o.status !== "upcoming") continue;
    const a = assets.find((x) => x.id === o.assetId);
    if (!a) continue;
    if (investor && (!o.eligibleClassifications.includes(investor.classification) || a.rules.blockedCountries.includes(investor.residency))) continue;
    let score = o.status === "open" ? 1 : 0;
    const reasons: string[] = [];
    if (i?.assetTypes.includes(a.template)) {
      score += 3;
      reasons.push(`Matches your interest in ${TEMPLATE_META[a.template].label.toLowerCase()}`);
    }
    if (i && a.riskProfile) {
      const d = Math.abs(RISK_META[a.riskProfile].level - RISK_META[i.risk].level);
      if (d === 0) { score += 2; reasons.push("Fits your risk appetite"); }
      else if (d === 1) score += 1;
      else score -= 2;
    }
    if (i?.goal === "income" && a.income.targetYieldPct > 0 && a.income.frequency !== "daily-accrual") { score += 1; reasons.push(`Pays ${a.income.frequency.replace("-", " ")} income`); }
    if (i?.goal === "growth" && (a.template === "private-equity" || a.template === "commodity")) { score += 1; reasons.push("Built for growth"); }
    if (i?.goal === "preservation" && a.riskProfile === "very-low") { score += 1; reasons.push("Capital preservation"); }
    const r = regionsOf(a).find((x) => i?.regions.includes(x) && x !== "Global");
    if (r) { score += 1; reasons.push(`In ${r === "GCC" ? "the GCC" : r === "United Kingdom" ? "the UK" : r}`); }
    if (i?.ticket && o.minTicket > i.ticket) score -= 1;
    if (heldAssetIds.has(a.id)) { score -= 1; reasons.push("You already hold this"); }
    if (!reasons.length) reasons.push(o.status === "open" ? "Open for subscription" : "Opening soon");
    out.push({ offering: o, asset: a, score, reasons: reasons.slice(0, 3) });
  }
  return out.sort((x, y) => y.score - x.score || y.offering.subscribed / y.offering.target - x.offering.subscribed / x.offering.target).slice(0, limit);
}
