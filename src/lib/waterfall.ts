import type * as D from "@/types/domain";
import { fmt } from "@/lib/utils";

type ClassRow = { name: string; symbol: string; tier: D.TokenTier; targetReturnPct: number };
const TIERS: D.TokenTier[] = ["senior", "mezzanine", "junior", "ordinary"];

/** Waterfall implied by the class ranks: costs first, then classes from senior to ordinary. */
export function waterfallFor(classes: ClassRow[]): D.WaterfallStep[] {
  const sorted = [...classes].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier));
  return [
    { label: "Asset costs", detail: "Operating costs, taxes and insurance of the underlying asset" },
    { label: "Issuer expenses", detail: "Trustee, audit, registrar and platform fees" },
    ...sorted.map((c) => ({ label: `${c.name} (${c.symbol})`, detail: c.tier === "ordinary" ? "All remaining income" : `${fmt.pct(c.targetReturnPct, 2)} a year before lower classes` })),
  ];
}
