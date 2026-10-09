import type { Asset, InternalRules, RiskProfile } from "@/types/domain";

export const RISK_META: Record<RiskProfile, { label: string; short: string; tone: "success" | "info" | "warning" | "danger"; level: number; explain: string }> = {
  "very-low": { label: "Very low", short: "Very low", tone: "success", level: 1, explain: "Capital preservation. Returns close to cash or government bills." },
  low: { label: "Low", short: "Low", tone: "info", level: 2, explain: "Steady contracted income with modest price movement." },
  medium: { label: "Medium", short: "Medium", tone: "warning", level: 3, explain: "Higher income or price exposure. Values can move in either direction." },
  high: { label: "High (opportunistic)", short: "High", tone: "danger", level: 4, explain: "Growth or high-yield strategies. Larger swings and longer lock-ups." },
};

export const RISK_ORDER: RiskProfile[] = ["very-low", "low", "medium", "high"];

export const DEFAULT_BANDS: InternalRules["riskBands"] = { veryLowMax: 4.5, lowMax: 7, mediumMax: 10 };

/** Risk band from the target return, using the bands set in internal rules. */
export function riskForReturn(targetPct: number, bands: InternalRules["riskBands"] = DEFAULT_BANDS): RiskProfile {
  if (targetPct <= bands.veryLowMax) return "very-low";
  if (targetPct <= bands.lowMax) return "low";
  if (targetPct <= bands.mediumMax) return "medium";
  return "high";
}

/** Risk band for a product. Commodities carry price risk even with no yield, so they start at medium. */
export function assetRisk(a: Pick<Asset, "template" | "income">, bands: InternalRules["riskBands"] = DEFAULT_BANDS): RiskProfile {
  if (a.template === "commodity") return "medium";
  return riskForReturn(a.income.targetYieldPct, bands);
}
