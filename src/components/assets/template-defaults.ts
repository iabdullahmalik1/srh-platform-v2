import type * as D from "@/types/domain";
import type { AssetDraft } from "@/stores/workflows";

const isoDate = (yearsAhead: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsAhead);
  return d.toISOString().slice(0, 10);
};

type Defaults = {
  structure: D.LegalStructure;
  instrument: D.NewAssetInput["instrument"];
  valuation: Omit<D.NewAssetInput["valuation"], "currency">;
  income: D.NewAssetInput["income"];
  servicer: string;
  ownershipModel: D.OwnershipModel;
  rules: Omit<D.NewAssetInput["rules"], "blockedCountries">;
  token: Omit<D.NewAssetInput["token"], "symbol">;
  offering: Omit<D.NewAssetInput["offering"], "currency">;
};

const CONTROLS_FULL: D.TokenClass["controls"] = { pausable: true, freezable: true, forcedTransfer: true, recovery: true, mintable: true, burnable: true };

const PROFESSIONAL: D.InvestorClassification[] = ["professional", "accredited", "institutional"];

/** Sensible starting points per template. Every value can be changed in later steps. */
export const TEMPLATE_DEFAULTS: Record<D.AssetTemplate, Defaults> = {
  "real-estate": {
    structure: "SPV",
    instrument: { type: "equity", votingRights: true },
    valuation: { method: "Independent property valuation (income approach)", frequency: "quarterly" },
    income: { type: "Rental distributions", frequency: "quarterly", targetYieldPct: 7.5 },
    servicer: "Appointed property manager",
    ownershipModel: "transfer-agent",
    rules: { lockupDays: 180, holdingLimitPct: 10, minInvestment: 25_000, eligibleClassifications: PROFESSIONAL },
    token: { standard: "ERC-3643", decimals: 0, chains: ["ethereum", "polygon"], controls: CONTROLS_FULL },
    offering: { target: 50_000_000, pricePerToken: 10, minTicket: 25_000, rails: ["swift", "usdc"] },
  },
  "spv-shares": {
    structure: "SPV",
    instrument: { type: "equity", votingRights: true },
    valuation: { method: "Net asset value of the SPV, property at independent valuation", frequency: "quarterly" },
    income: { type: "Dividends from net rental income", frequency: "quarterly", targetYieldPct: 7 },
    servicer: "Appointed corporate services provider",
    ownershipModel: "transfer-agent",
    rules: { lockupDays: 90, holdingLimitPct: 20, minInvestment: 2_000, eligibleClassifications: ["retail", "professional", "accredited", "institutional"] },
    token: { standard: "ERC-3643", decimals: 0, chains: ["polygon"], controls: CONTROLS_FULL },
    offering: { target: 2_500_000, pricePerToken: 10, minTicket: 2_000, rails: ["card", "local-rail", "aed-stablecoin"] },
  },
  infrastructure: {
    structure: "SPV",
    instrument: { type: "note", couponPct: 7.25, maturity: isoDate(10), votingRights: false },
    valuation: { method: "Discounted cash flow on contracted revenue", frequency: "quarterly" },
    income: { type: "Contracted revenue, interest plus amortisation", frequency: "semi-annual", targetYieldPct: 7.25 },
    servicer: "Appointed project agent",
    ownershipModel: "csd",
    rules: { lockupDays: 0, holdingLimitPct: 20, minInvestment: 100_000, eligibleClassifications: ["professional", "institutional", "market-counterparty"] },
    token: { standard: "ERC-1400", decimals: 0, chains: ["ethereum"], controls: CONTROLS_FULL },
    offering: { target: 150_000_000, pricePerToken: 1_000, minTicket: 100_000, rails: ["swift", "usdc"] },
  },
  "private-credit": {
    structure: "SPV",
    instrument: { type: "debt", couponPct: 9.5, maturity: isoDate(3), votingRights: false },
    valuation: { method: "Amortised cost with expected credit loss", frequency: "monthly" },
    income: { type: "Interest plus principal", frequency: "monthly", targetYieldPct: 9.5 },
    servicer: "Appointed loan servicer",
    ownershipModel: "on-chain",
    rules: { lockupDays: 90, holdingLimitPct: 15, minInvestment: 50_000, eligibleClassifications: ["professional", "institutional", "market-counterparty"] },
    token: { standard: "ERC-3643", decimals: 2, chains: ["ethereum", "avalanche"], controls: CONTROLS_FULL },
    offering: { target: 40_000_000, pricePerToken: 100, minTicket: 50_000, rails: ["swift", "usdc", "tokenized-deposit"] },
  },
  "treasury-fund": {
    structure: "Fund",
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "Daily NAV (amortised cost plus accrued yield)", frequency: "daily" },
    income: { type: "Accumulating yield", frequency: "daily-accrual", targetYieldPct: 4.4 },
    servicer: "Appointed fund administrator",
    ownershipModel: "hybrid",
    rules: { lockupDays: 0, holdingLimitPct: 20, minInvestment: 10_000, eligibleClassifications: ["professional", "accredited", "qualified-purchaser", "institutional", "market-counterparty"] },
    token: { standard: "ERC-3643", decimals: 6, chains: ["ethereum", "polygon", "base"], controls: CONTROLS_FULL },
    offering: { target: 250_000_000, pricePerToken: 1, minTicket: 10_000, rails: ["usdc", "usdt", "swift", "tokenized-deposit"] },
  },
  bond: {
    structure: "Corporate",
    instrument: { type: "debt", couponPct: 6, maturity: isoDate(5), votingRights: false },
    valuation: { method: "Evaluated pricing from independent vendor", frequency: "daily" },
    income: { type: "Fixed coupon", frequency: "semi-annual", targetYieldPct: 6 },
    servicer: "Appointed paying agent",
    ownershipModel: "csd",
    rules: { lockupDays: 0, holdingLimitPct: 25, minInvestment: 100_000, eligibleClassifications: ["professional", "institutional", "market-counterparty"] },
    token: { standard: "ERC-1400", decimals: 0, chains: ["ethereum"], controls: CONTROLS_FULL },
    offering: { target: 100_000_000, pricePerToken: 1_000, minTicket: 100_000, rails: ["swift", "sepa"] },
  },
  sukuk: {
    structure: "Sukuk SPV",
    instrument: { type: "sukuk-certificate", couponPct: 5.95, maturity: isoDate(5), votingRights: false },
    valuation: { method: "Mark to model against sovereign sukuk curve", frequency: "monthly" },
    income: { type: "Periodic profit distribution", frequency: "semi-annual", targetYieldPct: 5.95 },
    servicer: "Appointed sukuk agent",
    ownershipModel: "csd",
    rules: { lockupDays: 0, holdingLimitPct: 20, minInvestment: 50_000, eligibleClassifications: PROFESSIONAL },
    token: { standard: "ERC-1400", decimals: 0, chains: ["ethereum", "base"], controls: { ...CONTROLS_FULL, mintable: false } },
    offering: { target: 75_000_000, pricePerToken: 1_000, minTicket: 50_000, rails: ["swift", "aed-stablecoin"] },
  },
  "private-equity": {
    structure: "Fund",
    instrument: { type: "fund-unit", votingRights: true },
    valuation: { method: "Quarterly fair value (IPEV guidelines)", frequency: "quarterly" },
    income: { type: "Distributions on exit", frequency: "annual", targetYieldPct: 0 },
    servicer: "Appointed AIFM administrator",
    ownershipModel: "transfer-agent",
    rules: { lockupDays: 365, holdingLimitPct: 15, minInvestment: 125_000, eligibleClassifications: ["accredited", "qualified-purchaser", "institutional"] },
    token: { standard: "ERC-3643", decimals: 0, chains: ["ethereum"], controls: CONTROLS_FULL },
    offering: { target: 60_000_000, pricePerToken: 1, minTicket: 125_000, rails: ["swift", "usdc"] },
  },
  commodity: {
    structure: "Trust",
    instrument: { type: "fund-unit", votingRights: false },
    valuation: { method: "LBMA spot reference price", frequency: "daily" },
    income: { type: "Non-distributing", frequency: "annual", targetYieldPct: 0 },
    servicer: "Appointed vault operator",
    ownershipModel: "custodian",
    rules: { lockupDays: 0, holdingLimitPct: 25, minInvestment: 5_000, eligibleClassifications: ["retail", "professional", "accredited", "institutional"] },
    token: { standard: "ERC-3643", decimals: 4, chains: ["ethereum"], controls: CONTROLS_FULL },
    offering: { target: 30_000_000, pricePerToken: 100, minTicket: 5_000, rails: ["swift", "usdc", "aed-stablecoin"] },
  },
  receivables: {
    structure: "SPV",
    instrument: { type: "note", couponPct: 8, maturity: isoDate(1), votingRights: false },
    valuation: { method: "Amortised cost", frequency: "monthly" },
    income: { type: "Interest", frequency: "monthly", targetYieldPct: 8 },
    servicer: "Appointed receivables servicer",
    ownershipModel: "on-chain",
    rules: { lockupDays: 30, holdingLimitPct: 20, minInvestment: 25_000, eligibleClassifications: ["professional", "institutional"] },
    token: { standard: "ERC-7518", decimals: 2, chains: ["ethereum"], controls: CONTROLS_FULL },
    offering: { target: 15_000_000, pricePerToken: 100, minTicket: 25_000, rails: ["swift", "usdc"] },
  },
};

export const TEMPLATE_VISUAL: Record<D.AssetTemplate, D.Asset["visual"]> = {
  "real-estate": "tower",
  "private-credit": "credit",
  "treasury-fund": "treasury",
  bond: "credit",
  sukuk: "sukuk",
  "private-equity": "growth",
  commodity: "gold",
  receivables: "receivables",
  "spv-shares": "tower",
  infrastructure: "solar",
};

/** Applies a template to a draft. Product identity (name, issuer, entity name) is kept. */
export function applyTemplate(template: D.AssetTemplate, draft: AssetDraft): AssetDraft {
  const t = TEMPLATE_DEFAULTS[template];
  const currency: D.Currency = draft.valuation?.currency ?? draft.offering?.currency ?? "USD";
  return {
    template,
    legalEntity: { name: draft.legalEntity?.name ?? "", jurisdiction: draft.legalEntity?.jurisdiction ?? ("" as D.JurisdictionCode), structure: t.structure },
    instrument: { ...t.instrument },
    valuation: { ...t.valuation, currency },
    income: { ...t.income },
    servicer: t.servicer,
    ownershipModel: t.ownershipModel,
    rules: { ...t.rules, eligibleClassifications: [...t.rules.eligibleClassifications], blockedCountries: draft.rules?.blockedCountries ?? ["KP", "IR", "SY"] },
    token: { ...t.token, chains: [...t.token.chains], controls: { ...t.token.controls }, symbol: draft.token?.symbol ?? "" },
    offering: { ...t.offering, rails: [...t.offering.rails], currency },
  };
}
