import type * as D from "@/types/domain";

/** Where the authoritative ownership record lives for a product. */
export const OWNERSHIP_META: Record<D.OwnershipModel, { label: string; short: string; description: string; detail: string }> = {
  "on-chain": {
    label: "On-chain register",
    short: "On-chain",
    description: "The token ledger is the legal register of ownership.",
    detail: "A transfer on the canonical deployment changes legal title. The registry mirrors chain state and reconciliation treats the chain as the source of truth.",
  },
  "transfer-agent": {
    label: "Transfer agent",
    short: "Transfer agent",
    description: "A regulated transfer agent keeps the legal register; tokens mirror it.",
    detail: "Token movements are instructions to the transfer agent. The agent's register wins in any reconciliation break.",
  },
  custodian: {
    label: "Custodian",
    short: "Custodian",
    description: "A custodian holds the asset and its books record beneficial ownership.",
    detail: "Investors hold beneficial interests through the custodian. Tokens evidence entitlement and reconcile to custody statements.",
  },
  csd: {
    label: "Central securities depository",
    short: "CSD",
    description: "The CSD is the register of record; tokens are a digital twin.",
    detail: "Settlement finality happens at the CSD. Chain positions reconcile daily against CSD participant accounts.",
  },
  hybrid: {
    label: "Hybrid",
    short: "Hybrid",
    description: "Chain and an off-chain register are both maintained, with a defined precedence.",
    detail: "Primary issuance records at the administrator, while secondary transfers settle on-chain. The policy states which source wins for each event type.",
  },
};

export const OWNERSHIP_ORDER: D.OwnershipModel[] = ["on-chain", "transfer-agent", "custodian", "csd", "hybrid"];

export const INSTRUMENT_LABEL: Record<D.InstrumentType, string> = {
  equity: "Equity",
  debt: "Debt",
  "fund-unit": "Fund unit",
  note: "Note",
  "revenue-share": "Revenue share",
  "sukuk-certificate": "Sukuk certificate",
};

export const INCOME_FREQUENCY_LABEL: Record<D.Asset["income"]["frequency"], string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-annual",
  annual: "Annual",
  "daily-accrual": "Daily accrual",
};

export const DOCUMENT_KIND_LABEL: Record<D.AssetDocument["kind"], string> = {
  "offering-memorandum": "Offering memorandum",
  "term-sheet": "Term sheet",
  "spv-constitution": "Constitutional documents",
  "valuation-report": "Valuation report",
  "legal-opinion": "Legal opinion",
  "audit-report": "Audit report",
  prospectus: "Prospectus",
  "sharia-opinion": "Sharia opinion",
  "title-deed": "Title deed",
  insurance: "Insurance certificate",
  "investor-report": "Investor report",
  "vault-certificate": "Vault certificate",
  "technical-report": "Technical report",
  other: "Document",
};

export const DISTRIBUTION_TYPE_LABEL: Record<D.DistributionType, string> = {
  dividend: "Dividend",
  coupon: "Coupon",
  "rental-income": "Rental income",
  interest: "Interest",
  principal: "Principal",
  redemption: "Redemption",
  fee: "Fee",
};

export const TOKEN_STANDARDS: { value: D.TokenStandard; description: string; family: "evm" | "solana" }[] = [
  { value: "ERC-3643", description: "Permissioned token with on-chain identity registry and compliance module", family: "evm" },
  { value: "ERC-1400", description: "Partitioned security token with document and controller hooks", family: "evm" },
  { value: "ERC-20 Permissioned", description: "ERC-20 with allowlist transfer hook", family: "evm" },
  { value: "SPL Token-2022", description: "Solana token with transfer hook and confidential extensions", family: "solana" },
  { value: "ERC-7518", description: "Semi-fungible token with partitions and payout hooks", family: "evm" },
];

export const CHAINS: D.Chain[] = ["ethereum", "polygon", "base", "avalanche", "solana"];

export const CLASSIFICATIONS: D.InvestorClassification[] = ["retail", "professional", "accredited", "qualified-purchaser", "institutional", "market-counterparty"];

export type StatusGroup = "all" | "live" | "review" | "draft";
export function statusGroup(s: D.AssetStatus): Exclude<StatusGroup, "all"> | "other" {
  if (s === "live") return "live";
  if (s === "in-review" || s === "approved") return "review";
  if (s === "draft" || s === "structuring") return "draft";
  return "other";
}

/** Contract address format per chain family. */
export function isValidAddress(chain: D.Chain, v: string) {
  return chain === "solana" ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) : /^0x[a-fA-F0-9]{40}$/.test(v);
}

/** Investors in a product: days until a date, rounded up, never negative. */
export function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function navDigits(v: number) {
  return v < 10 ? 4 : 2;
}
