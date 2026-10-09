import type {
  AssetTemplate,
  Chain,
  DeploymentModel,
  InvestorClassification,
  KycStatus,
  ModuleKey,
  OrderStage,
  PaymentRail,
  RegulatedActivity,
  Role,
} from "@/types/domain";

export const ORDER_STAGES: OrderStage[] = [
  "submitted",
  "eligibility",
  "payment-instructed",
  "payment-confirmed",
  "allocated",
  "settled",
  "minted",
  "reconciled",
];

export const STAGE_META: Record<OrderStage, { label: string; short: string; description: string; system: string }> = {
  submitted: { label: "Order received", short: "Order", description: "Subscription captured with an idempotency key.", system: "Order service" },
  eligibility: { label: "Eligibility", short: "Eligibility", description: "Global, jurisdiction, product, offering and investor rules evaluated.", system: "Compliance engine" },
  "payment-instructed": { label: "Payment instructed", short: "Instructed", description: "Payment instruction issued on the selected rail.", system: "Payment orchestrator" },
  "payment-confirmed": { label: "Payment confirmed", short: "Paid", description: "Funds received and matched to the instruction.", system: "Bank or stablecoin adapter" },
  allocated: { label: "Allocated", short: "Allocated", description: "Units allocated against the offering book.", system: "Allocation service" },
  settled: { label: "Settled", short: "Settled", description: "Cash leg settled to the issuer, DvP where available.", system: "Settlement engine" },
  minted: { label: "Tokens minted", short: "Minted", description: "Tokens minted to the investor wallet on the target chain.", system: "Blockchain transaction manager" },
  reconciled: { label: "Reconciled", short: "Reconciled", description: "Chain, registry, custodian, bank and ledger agree.", system: "Reconciliation engine" },
};

export const TEMPLATE_META: Record<
  AssetTemplate,
  { label: string; description: string; legal: string; instrument: string; income: string; valuation: string; token: string; servicing: string }
> = {
  "real-estate": { label: "Real estate", description: "Income-producing property held in an SPV", legal: "SPV", instrument: "Equity", income: "Rental distributions", valuation: "Independent property valuation", token: "Restricted security token", servicing: "Property manager" },
  "spv-shares": { label: "SPV shares", description: "Shares in a special purpose vehicle that owns the asset", legal: "SPV", instrument: "Equity", income: "Dividends from SPV profits", valuation: "Net asset value of the SPV", token: "Tokenised SPV share", servicing: "Corporate services provider" },
  "private-credit": { label: "Private credit", description: "Loan portfolios and direct lending", legal: "SPV", instrument: "Debt", income: "Interest plus principal", valuation: "Amortised cost / loan valuation", token: "Tokenised debt instrument", servicing: "Loan servicer" },
  "treasury-fund": { label: "Treasury fund", description: "Short-dated government securities", legal: "Fund", instrument: "Fund share", income: "Yield / distributions", valuation: "Daily NAV", token: "Tokenised fund share", servicing: "Fund administrator" },
  bond: { label: "Bond", description: "Fixed income securities", legal: "SPV or issuer", instrument: "Debt", income: "Fixed coupon", valuation: "Evaluated pricing", token: "Tokenised bond", servicing: "Paying agent" },
  sukuk: { label: "Sukuk", description: "Sharia-compliant certificates", legal: "Sukuk SPV", instrument: "Sukuk certificate", income: "Periodic distribution", valuation: "Mark to model", token: "Tokenised sukuk certificate", servicing: "Sukuk agent" },
  "private-equity": { label: "Private equity", description: "Fund interests and feeder units", legal: "Fund", instrument: "Fund unit", income: "Distributions on exit", valuation: "Quarterly fair value", token: "Tokenised fund unit", servicing: "AIFM administrator" },
  commodity: { label: "Commodity", description: "Physically backed commodities", legal: "Trust", instrument: "Fund unit", income: "Non-distributing", valuation: "Spot reference price", token: "Asset-backed token", servicing: "Vault operator" },
  receivables: { label: "Receivables", description: "Trade and invoice receivables", legal: "SPV", instrument: "Note", income: "Interest", valuation: "Amortised cost", token: "Tokenised note", servicing: "Receivables servicer" },
  infrastructure: { label: "Infrastructure", description: "Energy, transport and utility projects", legal: "SPV", instrument: "Note", income: "Contracted revenue", valuation: "Discounted cash flow", token: "Tokenised project note", servicing: "Project agent" },
};

export const CHAIN_META: Record<Chain, { label: string; color: string; explorer: string; short: string }> = {
  ethereum: { label: "Ethereum", color: "#627EEA", explorer: "https://etherscan.io", short: "ETH" },
  polygon: { label: "Polygon", color: "#8247E5", explorer: "https://polygonscan.com", short: "POL" },
  solana: { label: "Solana", color: "#14B8A6", explorer: "https://solscan.io", short: "SOL" },
  base: { label: "Base", color: "#2563EB", explorer: "https://basescan.org", short: "BASE" },
  avalanche: { label: "Avalanche", color: "#E84142", explorer: "https://snowtrace.io", short: "AVAX" },
};

export const RAIL_META: Record<PaymentRail, { label: string; kind: "fiat" | "digital"; eta: string; description: string }> = {
  swift: { label: "SWIFT", kind: "fiat", eta: "T+1", description: "Cross-border wire via correspondent banks" },
  sepa: { label: "SEPA", kind: "fiat", eta: "Same day", description: "Euro credit transfer" },
  ach: { label: "ACH", kind: "fiat", eta: "T+1", description: "US domestic transfer" },
  "local-rail": { label: "Local rail", kind: "fiat", eta: "Same day", description: "Domestic instant payment system" },
  usdc: { label: "USDC", kind: "digital", eta: "Seconds", description: "Regulated USD stablecoin" },
  usdt: { label: "USDT", kind: "digital", eta: "Seconds", description: "USD stablecoin" },
  "tokenized-deposit": { label: "Tokenised deposit", kind: "digital", eta: "Seconds", description: "Bank-issued tokenised deposit" },
  "aed-stablecoin": { label: "AED stablecoin", kind: "digital", eta: "Seconds", description: "Licensed dirham-backed stablecoin" },
  card: { label: "Card", kind: "fiat", eta: "Instant", description: "Visa, Mastercard, Amex, Apple Pay and Google Pay" },
};

export const CLASSIFICATION_LABEL: Record<InvestorClassification, string> = {
  retail: "Retail",
  professional: "Professional",
  accredited: "Accredited",
  "qualified-purchaser": "Qualified purchaser",
  institutional: "Institutional",
  "market-counterparty": "Market counterparty",
};

export const KYC_LABEL: Record<KycStatus, string> = {
  "not-started": "Not started",
  pending: "Pending",
  "in-review": "In review",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  "platform-admin": { label: "Platform admin", description: "Configures tenants, modules, integrations, keys and internal rules" },
  operations: { label: "Operations", description: "Runs onboarding, orders, settlement, valuations, servicing and reconciliation" },
  "compliance-officer": { label: "Compliance officer", description: "Owns KYC and KYB decisions, overrides, policy, screening and issuance verification" },
  "issuer-admin": { label: "Issuer admin", description: "Structures its own products, documents, valuations and distributions" },
  investor: { label: "Investor", description: "Individual or company account that subscribes, holds and trades" },
  auditor: { label: "Auditor", description: "Read-only access to records, documents and the audit trail" },
};

export const DEPLOYMENT_META: Record<DeploymentModel, { label: string; description: string }> = {
  "own-platform": { label: "Own regulated platform", description: "Operated under SRH brand and regulatory structure (Model A)" },
  "white-label": { label: "White-label SaaS", description: "Licensed customer's brand, licences and investors on SRH infrastructure (Model B)" },
  headless: { label: "Headless API", description: "Customer apps call SRH APIs; no SRH user interface" },
  dedicated: { label: "Dedicated deployment", description: "Isolated VPC, dedicated databases, customer-managed keys" },
};

export const MODULE_META: Record<ModuleKey, { label: string; description: string }> = {
  identity: { label: "Identity & Investors", description: "Users, organisations, KYC, KYB, wallets, eligibility" },
  compliance: { label: "Compliance", description: "Screening, policy engine, transfer restrictions, reporting" },
  assets: { label: "Asset Structuring", description: "Asset registry, SPVs, instruments, templates, documents" },
  tokenization: { label: "Tokenization", description: "Token factory, deployments, mint, burn, pause, freeze" },
  "primary-market": { label: "Primary Market", description: "Offerings, subscriptions, allocation, issuance" },
  payments: { label: "Payments & Settlement", description: "Fiat and digital rails, DvP, reconciliation" },
  custody: { label: "Custody & Wallets", description: "Custodian adapters, MPC, HSM, signing policies" },
  registry: { label: "Ownership & Registry", description: "Investor register, cap table, reconciliation" },
  servicing: { label: "Asset Servicing", description: "Distributions, NAV, corporate actions, voting" },
  "secondary-market": { label: "Secondary Markets", description: "Order book, RFQ, OTC, venue integration" },
  defi: { label: "DeFi Gateway", description: "Permissioned lending, repo, AMMs, vaults" },
};

export const ACTIVITY_LABEL: Record<RegulatedActivity, string> = {
  issuance: "Issuance",
  distribution: "Distribution",
  brokerage: "Brokerage",
  custody: "Custody",
  "transfer-agency": "Transfer agency",
  "payment-handling": "Payment handling",
  "marketplace-operation": "Marketplace operation",
  "fund-management": "Fund management",
  settlement: "Settlement",
  compliance: "Compliance",
  "asset-servicing": "Asset servicing",
};

export const COUNTRY_NAME: Record<string, string> = {
  AE: "United Arab Emirates", SA: "Saudi Arabia", BH: "Bahrain", KW: "Kuwait", QA: "Qatar", OM: "Oman", GB: "United Kingdom", SG: "Singapore",
  CH: "Switzerland", LU: "Luxembourg", DE: "Germany", FR: "France", PK: "Pakistan", US: "United States", KY: "Cayman Islands", IN: "India",
  JO: "Jordan", EG: "Egypt", CA: "Canada", JP: "Japan", SE: "Sweden", BG: "Bulgaria", KP: "North Korea", IR: "Iran", SY: "Syria", CU: "Cuba",
  HK: "Hong Kong", VG: "British Virgin Islands", JE: "Jersey", NL: "Netherlands", IE: "Ireland", AU: "Australia", MY: "Malaysia", ID: "Indonesia", TR: "Turkey", ZA: "South Africa", NG: "Nigeria", KE: "Kenya",
};

/** Role based access. Mutations check these on the client; the backend must enforce the same policy. */
export type Permission =
  | "investors.write"
  | "kyc.decide"
  | "compliance.decide"
  | "policy.write"
  | "assets.write"
  | "orders.operate"
  | "orders.subscribe"
  | "tokens.request"
  | "approvals.decide"
  | "servicing.write"
  | "recon.resolve"
  | "markets.trade"
  | "platform.configure"
  | "defi.configure"
  | "votes.cast"
  | "providers.test"
  | "overrides.decide"
  | "listing.override"
  | "valuation.enter"
  | "issuance.verify"
  | "rules.write"
  | "documents.write";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  "platform-admin": ["investors.write", "assets.write", "tokens.request", "approvals.decide", "platform.configure", "defi.configure", "orders.operate", "recon.resolve", "markets.trade", "votes.cast", "providers.test", "listing.override", "rules.write", "documents.write"],
  operations: ["investors.write", "assets.write", "orders.operate", "orders.subscribe", "tokens.request", "approvals.decide", "servicing.write", "recon.resolve", "markets.trade", "votes.cast", "providers.test", "valuation.enter", "issuance.verify", "documents.write", "listing.override"],
  "compliance-officer": ["kyc.decide", "compliance.decide", "policy.write", "approvals.decide", "investors.write", "votes.cast", "overrides.decide", "listing.override", "issuance.verify", "rules.write"],
  "issuer-admin": ["assets.write", "servicing.write", "approvals.decide", "votes.cast", "valuation.enter", "documents.write"],
  investor: ["orders.subscribe", "markets.trade", "votes.cast"],
  auditor: [],
};
