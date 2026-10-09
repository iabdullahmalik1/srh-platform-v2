/**
 * Canonical domain model for the SRH Tokenization Operating System.
 *
 * The model follows the brief's separation principle:
 *   Underlying Asset -> Legal Entity / SPV / Fund -> Financial Product -> Instrument
 *   -> Offering -> Share / Token Class -> Blockchain Deployment(s)
 *
 * These types are the contract between the UI and the backend. The mock adapter
 * and the HTTP adapter both return exactly these shapes.
 */

export type ID = string;
export type ISODate = string;

export type Currency = "USD" | "AED" | "EUR" | "GBP" | "SAR" | "SGD" | "PKR";

export type Chain = "ethereum" | "polygon" | "solana" | "base" | "avalanche";

export type JurisdictionCode =
  | "AE-ADGM"
  | "AE-DIFC"
  | "AE-VARA"
  | "AE-SCA"
  | "SA"
  | "BH"
  | "QA"
  | "SG"
  | "HK"
  | "GB"
  | "EU-LU"
  | "EU"
  | "KY"
  | "VG"
  | "JE"
  | "US"
  | "PK"
  | "CH";

export interface Jurisdiction {
  code: JurisdictionCode;
  name: string;
  regulator: string;
  country: string;
}

/* ------------------------------------------------------------------ */
/* Platform, tenancy and regulatory capability                         */
/* ------------------------------------------------------------------ */

export type DeploymentModel = "own-platform" | "white-label" | "headless" | "dedicated";

export type ModuleKey =
  | "identity"
  | "compliance"
  | "assets"
  | "tokenization"
  | "primary-market"
  | "payments"
  | "custody"
  | "registry"
  | "servicing"
  | "secondary-market"
  | "defi";

/** Regulated activities. Responsibility is tracked per activity, not per platform. */
export type RegulatedActivity =
  | "issuance"
  | "distribution"
  | "brokerage"
  | "custody"
  | "transfer-agency"
  | "payment-handling"
  | "marketplace-operation"
  | "fund-management"
  | "settlement"
  | "compliance"
  | "asset-servicing";

export type ResponsibilityType = "platform-entity" | "customer-entity" | "external-provider";

export interface ActivityResponsibility {
  activity: RegulatedActivity;
  entity: string;
  type: ResponsibilityType;
  licenceId?: ID;
}

export interface Licence {
  id: ID;
  holder: string;
  regulator: string;
  jurisdiction: JurisdictionCode;
  activities: RegulatedActivity[];
  reference: string;
  status: "active" | "pending" | "suspended" | "expired";
  grantedAt: ISODate;
  expiresAt: ISODate;
}

export interface Tenant {
  id: ID;
  name: string;
  shortName: string;
  deploymentModel: DeploymentModel;
  domain: string;
  brand: { primary: string; primaryHover: string; accentSoft: string; monogram: string; logo?: string };
  hosting: string;
  dataResidency: string;
  modules: ModuleKey[];
  licences: Licence[];
  responsibilities: ActivityResponsibility[];
  apiKeys: { id: ID; label: string; prefix: string; scopes: string[]; createdAt: ISODate; lastUsedAt: ISODate }[];
  createdAt: ISODate;
}

export type Role =
  | "platform-admin"
  | "operations"
  | "compliance-officer"
  | "issuer-admin"
  | "investor"
  | "auditor";

export interface Persona {
  id: ID;
  name: string;
  email: string;
  role: Role;
  title: string;
  organization: string;
  initials: string;
  /** Path to the profile photo, relative to the site root. */
  avatar?: string;
  /** For investor personas acting for a company: the investor record they sign for. */
  actsFor?: ID;
}

/* ------------------------------------------------------------------ */
/* Party & identity                                                    */
/* ------------------------------------------------------------------ */

export type InvestorType = "individual" | "entity";

export type InvestorClassification =
  | "retail"
  | "professional"
  | "accredited"
  | "qualified-purchaser"
  | "institutional"
  | "market-counterparty";

export type KycStatus = "not-started" | "pending" | "in-review" | "approved" | "rejected" | "expired";

export type RiskLevel = "low" | "medium" | "high";

export type WalletType = "custodial" | "mpc" | "multisig" | "self-custody";

export interface Wallet {
  id: ID;
  label: string;
  address: string;
  chain: Chain;
  type: WalletType;
  custodian?: string;
  whitelisted: boolean;
  riskScore: number; // 0..100, provider wallet analytics
  addedAt: ISODate;
}

export interface BeneficialOwner {
  id: ID;
  name: string;
  ownershipPct: number;
  nationality: string;
  pep: boolean;
  verified: boolean;
}

export type InvestorDocumentKind =
  | "passport"
  | "national-id"
  | "residence-id"
  | "driving-licence"
  | "proof-of-address"
  | "bank-statement"
  | "incorporation"
  | "trade-licence"
  | "memorandum"
  | "register-of-directors"
  | "register-of-members"
  | "register-of-beneficial-owners"
  | "good-standing"
  | "tax-certificate"
  | "accreditation-letter"
  | "source-of-funds"
  | "w8-ben"
  | "board-resolution"
  | "authorised-signatories";

export interface InvestorDocument {
  id: ID;
  name: string;
  kind: InvestorDocumentKind;
  status: "verified" | "pending" | "rejected" | "expired" | "missing" | "waived";
  uploadedAt: ISODate;
}

/** One verification requirement on an investor file. Staff can approve it manually or waive it. */
export type VerificationStatus = "passed" | "failed" | "pending" | "missing" | "waived" | "overridden";

export type VerificationKey =
  | "identity-document"
  | "liveness"
  | "address"
  | "bank-account"
  | "source-of-funds"
  | "sanctions"
  | "pep"
  | "adverse-media"
  | "wallet-risk"
  | "classification"
  | "company-registry"
  | "company-documents"
  | "beneficial-owners"
  | "directors"
  | "signatories";

export interface VerificationItem {
  key: VerificationKey;
  label: string;
  status: VerificationStatus;
  provider?: string;
  detail?: string;
  /** Who approved or waived it manually, and why. */
  overriddenBy?: string;
  overrideReason?: string;
  at?: ISODate;
  /** Set while a dual-approval override is waiting for the second approver. */
  pendingApprovalId?: ID;
}

export type RiskProfile = "very-low" | "low" | "medium" | "high";

export interface InvestorInterests {
  assetTypes: AssetTemplate[];
  regions: string[];
  risk: RiskProfile;
  goal: "income" | "growth" | "preservation";
  ticket?: number;
}

export interface CompanyProfile {
  jurisdiction: string; // ISO country or free-zone code, e.g. AE-ADGM, GB, SG
  registry: string; // e.g. "Companies House", "ACRA", "ADGM Registration Authority"
  legalForm: string;
  incorporatedAt?: ISODate;
  registeredAddress?: string;
  website?: string;
  industry?: string;
  directors: { name: string; role: string; verified: boolean }[];
  signatories: { name: string; title: string; email: string; verified: boolean }[];
  bankAccounts: { id: ID; bank: string; iban: string; swift: string; currency: Currency; verified: boolean; method?: string }[];
}

export interface Investor {
  id: ID;
  tenantId: ID;
  type: InvestorType;
  name: string;
  email: string;
  phone?: string;
  country: string; // ISO alpha-2
  residency: string;
  citizenship?: string;
  entityType?: "corporate" | "fund" | "family-office" | "trust" | "bank" | "sovereign" | "pension";
  registrationNumber?: string;
  classification: InvestorClassification;
  accreditationExpiresAt?: ISODate;
  kycStatus: KycStatus;
  kybStatus?: KycStatus;
  kycProvider: string;
  amlRisk: RiskLevel;
  pep: boolean;
  sanctionsHit: boolean;
  adverseMedia: boolean;
  wallets: Wallet[];
  beneficialOwners: BeneficialOwner[];
  documents: InvestorDocument[];
  totalInvested: number;
  holdingsCount: number;
  onboardedAt: ISODate;
  lastReviewedAt: ISODate;
  relationshipManager: string;
  tags: string[];
  /** Profile photo for individuals. */
  avatar?: string;
  /** Company logo for entities. */
  logo?: string;
  /** Requirement-by-requirement verification state; drives manual override in the back office. */
  verification?: VerificationItem[];
  /** True once every mandatory item is passed, approved manually or waived. */
  profileComplete?: boolean;
  interests?: InvestorInterests;
  company?: CompanyProfile;
}

export interface NewInvestorInput {
  type: InvestorType;
  name: string;
  email: string;
  phone?: string;
  country: string;
  residency: string;
  citizenship?: string;
  entityType?: Investor["entityType"];
  registrationNumber?: string;
  classification: InvestorClassification;
  wallet?: { address: string; chain: Chain; type: WalletType; custodian?: string };
  beneficialOwners?: Omit<BeneficialOwner, "id" | "verified">[];
  documents: InvestorDocument["kind"][];
  /** Requirements the applicant skipped; the account opens and staff can complete or waive them. */
  skipped?: VerificationKey[];
  interests?: InvestorInterests;
  company?: Omit<CompanyProfile, "bankAccounts"> & { bankAccounts: Omit<CompanyProfile["bankAccounts"][number], "id">[] };
  idDocumentLabel?: string;
}

/* ------------------------------------------------------------------ */
/* Compliance                                                          */
/* ------------------------------------------------------------------ */

export type RuleLayer = "global" | "jurisdiction" | "product" | "offering" | "investor";

export type Decision = "ALLOW" | "REJECT" | "MANUAL_REVIEW";

export interface PolicyRule {
  id: ID;
  code: string;
  name: string;
  layer: RuleLayer;
  description: string;
  enabled: boolean;
  severity: "block" | "review" | "info";
  params?: Record<string, string | number | boolean | string[]>;
}

export interface PolicyPack {
  id: ID;
  jurisdiction: JurisdictionCode;
  name: string;
  regulator: string;
  version: string;
  status: "active" | "draft" | "retired";
  effectiveFrom: ISODate;
  rules: PolicyRule[];
  updatedAt: ISODate;
  updatedBy: string;
}

export interface EligibilityCheck {
  ruleCode: string;
  rule: string;
  layer: RuleLayer;
  outcome: "pass" | "fail" | "review";
  detail: string;
}

export interface EligibilityResult {
  id: ID;
  investorId: ID;
  offeringId?: ID;
  assetId: ID;
  decision: Decision;
  checks: EligibilityCheck[];
  policyVersion: string;
  evaluatedAt: ISODate;
  durationMs: number;
}

export type AlertType = "sanctions" | "pep" | "adverse-media" | "wallet-risk" | "transaction-monitoring";

export interface ScreeningAlert {
  id: ID;
  investorId: ID;
  investorName: string;
  type: AlertType;
  severity: RiskLevel;
  status: "open" | "escalated" | "cleared" | "confirmed";
  provider: string;
  matchScore: number;
  summary: string;
  detail: string;
  createdAt: ISODate;
  assignee?: string;
  resolvedAt?: ISODate;
  resolutionNote?: string;
}

export interface CapabilityCheckStep {
  step: string;
  outcome: "pass" | "fail" | "review";
  detail: string;
}

export interface CapabilityRequest {
  tenantId: ID;
  capability: "secondary-trading" | "defi-access" | "primary-distribution" | "custody" | "transfer-agency";
  assetId: ID;
  investorCategory: InvestorClassification;
  tradingModel?: "order-book" | "rfq" | "otc" | "auction" | "amm";
}

export interface CapabilityResult {
  decision: "ENABLE" | "REJECT" | "COMPLIANCE_REVIEW";
  steps: CapabilityCheckStep[];
  evaluatedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Asset & product structuring                                         */
/* ------------------------------------------------------------------ */

export type AssetTemplate =
  | "real-estate"
  | "spv-shares"
  | "private-credit"
  | "treasury-fund"
  | "bond"
  | "sukuk"
  | "private-equity"
  | "commodity"
  | "receivables"
  | "infrastructure";

export type LegalStructure = "SPV" | "Fund" | "Trust" | "Corporate" | "Sukuk SPV";

export type InstrumentType = "equity" | "debt" | "fund-unit" | "note" | "revenue-share" | "sukuk-certificate";

export type OwnershipModel = "on-chain" | "transfer-agent" | "custodian" | "csd" | "hybrid";

export type AssetStatus = "draft" | "structuring" | "in-review" | "approved" | "live" | "matured";

export interface ShareClass {
  id: ID;
  name: string;
  currency: Currency;
  managementFeeBps: number;
  performanceFeeBps?: number;
  minInvestment: number;
  eligibleClassifications: InvestorClassification[];
  tokenClassId?: ID;
}

export type DocumentVisibility = "public" | "holders" | "internal";

export interface AssetDocument {
  id: ID;
  name: string;
  kind: "offering-memorandum" | "term-sheet" | "spv-constitution" | "valuation-report" | "legal-opinion" | "audit-report" | "prospectus" | "sharia-opinion" | "title-deed" | "insurance" | "investor-report" | "vault-certificate" | "technical-report" | "other";
  version: string;
  status: "final" | "draft" | "signed";
  updatedAt: ISODate;
  hash: string;
  /** Who can see it: everyone, token holders of this asset, or staff only. */
  visibility?: DocumentVisibility;
  sizeKb?: number;
  uploadedBy?: string;
}

/** Debt terms. A 0% coupon is a zero-coupon instrument issued at a discount to face value. */
export interface DebtTerms {
  faceValue: number;
  couponPct: number;
  couponFrequency: "annual" | "semi-annual" | "quarterly" | "monthly" | "none";
  issueDate: ISODate;
  maturity: ISODate;
  yieldPct: number;
  issuePrice: number;
  dayCount: "30/360" | "ACT/360" | "ACT/365";
  amortising?: boolean;
}

export interface Tokenomics {
  allocation: { label: string; pct: number }[];
  fees: { label: string; value: string }[];
  lockups: { label: string; detail: string }[];
  distributionPolicy: string;
  redemption: string;
  transferRules: string;
}

export interface WaterfallStep {
  label: string;
  detail: string;
  tokenClassId?: ID;
}

export interface Asset {
  id: ID;
  tenantId: ID;
  name: string;
  shortName: string;
  template: AssetTemplate;
  status: AssetStatus;
  issuerId: ID;
  description: string;
  underlying: { description: string; location?: string; appraisedValue: number; appraiser?: string; metrics: { label: string; value: string }[] };
  legalEntity: { name: string; structure: LegalStructure; jurisdiction: JurisdictionCode; registrationNumber: string };
  instrument: { type: InstrumentType; couponPct?: number; maturity?: ISODate; seniority?: "senior" | "mezzanine" | "junior"; votingRights: boolean };
  valuation: { method: string; nav: number; navPerToken: number; currency: Currency; frequency: "daily" | "monthly" | "quarterly"; lastUpdated: ISODate; oracle?: string };
  income: { type: string; frequency: "monthly" | "quarterly" | "semi-annual" | "annual" | "daily-accrual"; targetYieldPct: number };
  servicer: string;
  ownershipModel: OwnershipModel;
  shareClasses: ShareClass[];
  tokenClassIds: ID[];
  documents: AssetDocument[];
  jurisdiction: JurisdictionCode;
  policyPackIds: ID[];
  rules: { lockupDays: number; holdingLimitPct: number; minInvestment: number; maxInvestors?: number; eligibleClassifications: InvestorClassification[]; blockedCountries: string[] };
  aum: number;
  investorsCount: number;
  navHistory: { date: ISODate; nav: number }[];
  createdAt: ISODate;
  launchedAt?: ISODate;
  visual: "tower" | "logistics" | "treasury" | "credit" | "gold" | "solar" | "sukuk" | "growth" | "receivables";
  /** Photography: a cover image and an optional gallery, paths relative to the site root. */
  media?: { cover: string; gallery: string[]; videos?: { youtubeId: string; title: string; source: string }[]; credits?: string };
  /** Regulatory regimes the product is structured under, beyond its home jurisdiction. */
  regimes?: JurisdictionCode[];
  debt?: DebtTerms;
  tokenomics?: Tokenomics;
  waterfall?: WaterfallStep[];
  /** Where valuations come from: an automated oracle or the manual valuation desk. */
  oracleMode?: "automated" | "manual";
  /** Type-specific facts captured in the structuring journey. */
  profile?: { label: string; value: string }[];
  sponsorName?: string;
  highlights?: string[];
  /** Risk band from target return, using the bands in internal rules. Set by the API. */
  riskProfile?: RiskProfile;
}

export interface Issuer {
  id: ID;
  name: string;
  type: "spv" | "fund" | "corporate" | "trust";
  jurisdiction: JurisdictionCode;
  registrationNumber: string;
  sponsor: string;
  contact: string;
  kybStatus: KycStatus;
  assetsCount: number;
  createdAt: ISODate;
  logo?: string;
  /** Licensed parties around the issuer: administrator, trustee, custodian, auditor, legal counsel. */
  serviceProviders?: { role: string; name: string; licence?: string }[];
  licence?: string;
}

export interface NewAssetInput {
  template: AssetTemplate;
  name: string;
  shortName: string;
  description: string;
  issuerId: ID;
  underlying: { description: string; location?: string; appraisedValue: number };
  legalEntity: { name: string; structure: LegalStructure; jurisdiction: JurisdictionCode };
  instrument: { type: InstrumentType; couponPct?: number; maturity?: ISODate; votingRights: boolean };
  debt?: Omit<DebtTerms, "issuePrice">;
  regimes?: JurisdictionCode[];
  profile?: { label: string; value: string }[];
  tokenClasses?: { name: string; symbol: string; tier: TokenTier; targetReturnPct: number; supply: number }[];
  waterfall?: WaterfallStep[];
  documents?: { name: string; kind: AssetDocument["kind"]; visibility: DocumentVisibility }[];
  oracleMode?: "automated" | "manual";
  valuation: { method: string; frequency: "daily" | "monthly" | "quarterly"; currency: Currency };
  income: { type: string; frequency: Asset["income"]["frequency"]; targetYieldPct: number };
  servicer: string;
  ownershipModel: OwnershipModel;
  rules: Asset["rules"];
  token: { symbol: string; standard: TokenStandard; decimals: number; chains: Chain[]; controls: TokenClass["controls"] };
  offering: { target: number; pricePerToken: number; minTicket: number; currency: Currency; rails: PaymentRail[] };
}

/* ------------------------------------------------------------------ */
/* Tokenization                                                        */
/* ------------------------------------------------------------------ */

export type TokenStandard = "ERC-3643" | "ERC-1400" | "ERC-20 Permissioned" | "SPL Token-2022" | "ERC-7518";

export interface ChainDeployment {
  id: ID;
  chain: Chain;
  contractAddress: string;
  supply: number;
  holders: number;
  status: "live" | "pending" | "paused" | "deploying";
  deployedAt: ISODate;
  lastBlock: number;
  gasSpendUsd: number;
}

export type TokenTier = "senior" | "mezzanine" | "junior" | "ordinary";

export interface IssuanceCheck {
  key: string;
  label: string;
  status: "verified" | "pending" | "waived";
  by?: string;
  at?: ISODate;
  note?: string;
}

export interface TokenClass {
  id: ID;
  assetId: ID;
  shareClassId?: ID;
  /** Position in the distribution waterfall when an asset has several token classes. */
  tier?: TokenTier;
  targetReturnPct?: number;
  rights?: string;
  /** Manual issuance verification. Minting waits until every check is verified or waived. */
  issuance?: { status: "verified" | "pending"; checks: IssuanceCheck[]; verifiedBy?: string; verifiedAt?: ISODate };
  symbol: string;
  name: string;
  standard: TokenStandard;
  decimals: number;
  canonicalSupply: number;
  maxSupply?: number;
  status: "active" | "paused" | "frozen";
  deployments: ChainDeployment[];
  controls: { pausable: boolean; freezable: boolean; forcedTransfer: boolean; recovery: boolean; mintable: boolean; burnable: boolean };
  identityRegistry: string;
  complianceModule: string;
  createdAt: ISODate;
}

export type TokenOperation = "mint" | "burn" | "pause" | "unpause" | "freeze" | "unfreeze" | "forced-transfer" | "recovery";

/* ------------------------------------------------------------------ */
/* Primary market, orders, payments, settlement                        */
/* ------------------------------------------------------------------ */

export type PaymentRail = "swift" | "sepa" | "ach" | "local-rail" | "usdc" | "usdt" | "tokenized-deposit" | "aed-stablecoin" | "card";

export interface Offering {
  id: ID;
  assetId: ID;
  tenantId: ID;
  name: string;
  type: "primary" | "follow-on" | "continuous";
  status: "upcoming" | "open" | "closed" | "allocating" | "completed";
  opensAt: ISODate;
  closesAt: ISODate;
  pricePerToken: number;
  currency: Currency;
  target: number;
  subscribed: number;
  minTicket: number;
  maxTicket: number;
  investorsCount: number;
  eligibleJurisdictions: string[];
  eligibleClassifications: InvestorClassification[];
  rails: PaymentRail[];
  settlement: "dvp" | "async" | "atomic";
  distributor: string;
}

/** Order, payment, settlement and minting are separate lifecycle stages. */
export type OrderStage =
  | "submitted"
  | "eligibility"
  | "payment-instructed"
  | "payment-confirmed"
  | "allocated"
  | "settled"
  | "minted"
  | "reconciled";

export type OrderStatus = "active" | "completed" | "rejected" | "cancelled" | "exception" | "manual-review";

export interface StageEvent {
  stage: OrderStage;
  at: ISODate;
  actor: string;
  note?: string;
  ref?: string;
}

export interface Order {
  id: ID;
  tenantId: ID;
  offeringId: ID;
  assetId: ID;
  investorId: ID;
  investorName: string;
  side: "subscribe" | "redeem";
  amount: number;
  currency: Currency;
  tokens: number;
  pricePerToken: number;
  rail: PaymentRail;
  settlement: "dvp" | "async" | "atomic";
  chain: Chain;
  stage: OrderStage;
  status: OrderStatus;
  history: StageEvent[];
  eligibility?: EligibilityResult;
  paymentId?: ID;
  mintTxHash?: string;
  idempotencyKey: string;
  exceptionReason?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface NewSubscriptionInput {
  offeringId: ID;
  investorId: ID;
  amount: number;
  rail: PaymentRail;
  chain: Chain;
  walletId: ID;
}

export interface Payment {
  id: ID;
  tenantId: ID;
  orderId?: ID;
  direction: "inbound" | "outbound";
  purpose: "subscription" | "redemption" | "distribution" | "fee" | "treasury";
  rail: PaymentRail;
  amount: number;
  currency: Currency;
  fxRate?: number;
  status: "instructed" | "pending" | "confirmed" | "failed" | "reconciled" | "returned";
  reference: string;
  counterparty: string;
  bank: string;
  provider: string;
  createdAt: ISODate;
  confirmedAt?: ISODate;
  txHash?: string;
}

/* ------------------------------------------------------------------ */
/* Ownership, ledger and reconciliation                                */
/* ------------------------------------------------------------------ */

export interface Holding {
  id: ID;
  investorId: ID;
  investorName: string;
  assetId: ID;
  tokenClassId: ID;
  chain: Chain;
  walletAddress: string;
  quantity: number;
  costBasis: number;
  legalOwner: string;
  beneficialOwner: string;
  custodian?: string;
  nominee?: string;
  lockedUntil?: ISODate;
  frozen: boolean;
  acquiredAt: ISODate;
}

export type RecordSource = "blockchain" | "transfer-agent" | "custodian" | "csd" | "bank" | "accounting";

export interface ReconciliationBreak {
  id: ID;
  assetId: ID;
  tokenClassId: ID;
  type: "position-mismatch" | "cash-mismatch" | "unmatched-transfer" | "missing-mint" | "duplicate-event" | "stale-oracle";
  severity: RiskLevel;
  status: "open" | "investigating" | "resolved";
  authoritativeSource: RecordSource;
  values: { source: RecordSource; value: number }[];
  difference: number;
  unit: "tokens" | "USD";
  description: string;
  detectedAt: ISODate;
  resolvedAt?: ISODate;
  resolution?: string;
  assignee?: string;
}

export interface ReconciliationRun {
  id: ID;
  startedAt: ISODate;
  finishedAt: ISODate;
  scope: string;
  recordsCompared: number;
  matched: number;
  breaks: number;
  status: "clean" | "breaks-found" | "running";
}

export interface LedgerEntry {
  id: ID;
  journalId: ID;
  at: ISODate;
  account: string;
  debit: number;
  credit: number;
  currency: Currency;
  memo: string;
  ref?: string;
}

/* ------------------------------------------------------------------ */
/* Asset servicing                                                     */
/* ------------------------------------------------------------------ */

export type DistributionType = "dividend" | "coupon" | "rental-income" | "interest" | "principal" | "redemption" | "fee";

export interface Distribution {
  id: ID;
  assetId: ID;
  type: DistributionType;
  status: "scheduled" | "calculated" | "pending-approval" | "approved" | "paying" | "paid";
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  perToken: number;
  currency: Currency;
  recordDate: ISODate;
  paymentDate: ISODate;
  rail: PaymentRail;
  holdersCount: number;
  paidCount: number;
}

export interface CorporateAction {
  id: ID;
  assetId: ID;
  kind: "vote" | "split" | "maturity" | "redemption-window" | "nav-update" | "notice" | "distribution" | "coupon" | "tender-offer" | "buyback";
  title: string;
  status: "scheduled" | "open" | "closed" | "executed";
  effectiveDate: ISODate;
  detail: string;
  votes?: { for: number; against: number; abstain: number; quorumPct: number };
}

/* ------------------------------------------------------------------ */
/* Secondary market & DeFi                                             */
/* ------------------------------------------------------------------ */

export type Venue = "srh-ats" | "rfq-desk" | "otc" | "external-mtf" | "institutional-dex";

export interface MarketOrder {
  id: ID;
  tokenClassId: ID;
  assetId: ID;
  side: "buy" | "sell";
  type: "limit" | "rfq" | "block";
  quantity: number;
  price: number;
  filled: number;
  status: "open" | "partially-filled" | "filled" | "cancelled" | "blocked";
  venue: Venue;
  investorId: ID;
  investorName: string;
  createdAt: ISODate;
  complianceDecision?: Decision;
}

export interface Trade {
  id: ID;
  tokenClassId: ID;
  assetId: ID;
  quantity: number;
  price: number;
  buyer: string;
  seller: string;
  venue: Venue;
  settlement: "dvp" | "atomic" | "async";
  status: "matched" | "compliance-check" | "settling" | "settled" | "failed";
  executedAt: ISODate;
  txHash?: string;
}

export interface PreTradeCheck {
  decision: Decision;
  checks: { name: string; outcome: "pass" | "fail" | "review"; detail: string }[];
}

export interface RfqQuote {
  id: ID;
  dealer: string;
  price: number;
  quantity: number;
  expiresInSec: number;
}

export interface DefiPosition {
  id: ID;
  protocol: string;
  kind: "lending" | "repo" | "amm" | "vault" | "collateral";
  assetId: ID;
  tokenSymbol: string;
  chain: Chain;
  tvlUsd: number;
  apyPct: number;
  utilizationPct: number;
  ltvPct?: number;
  permissioned: boolean;
  whitelistedInvestors: number;
  status: "active" | "paused" | "pending-approval";
  oracle: string;
  healthFactor?: number;
}

/* ------------------------------------------------------------------ */
/* Custody, providers, approvals, audit                                */
/* ------------------------------------------------------------------ */

export type ProviderCategory = "kyc" | "kyb" | "aml" | "custody" | "payments" | "banking" | "market" | "oracle" | "blockchain" | "tokenization";

export interface Provider {
  id: ID;
  name: string;
  category: ProviderCategory;
  adapter: string;
  status: "operational" | "degraded" | "outage" | "disabled";
  latencyMs: number;
  uptimePct: number;
  region: string;
  lastSyncAt: ISODate;
  usedBy: ModuleKey[];
  logo?: string;
  /** Automated integration, or a manual desk used where no automated provider covers the region or flow. */
  mode?: "automated" | "manual";
  coverage?: string[];
  service?: string;
  website?: string;
}

export interface CustodyAccount {
  id: ID;
  custodian: string;
  type: "omnibus" | "segregated" | "mpc-vault" | "hsm-vault";
  label: string;
  chain: Chain;
  address: string;
  balanceUsd: number;
  assetsHeld: number;
  signingPolicy: { quorum: number; signers: number; dailyLimitUsd: number; whitelistOnly: boolean };
  status: "active" | "frozen";
}

export type ApprovalType =
  | "mint"
  | "burn"
  | "pause"
  | "freeze"
  | "forced-transfer"
  | "config-change"
  | "treasury-movement"
  | "distribution"
  | "policy-change"
  | "asset-launch"
  | "verification-override"
  | "manual-valuation"
  | "listing-override";

export interface ApprovalStep {
  role: Role | "authorized-signer";
  label: string;
  approver?: string;
  decision?: "approved" | "rejected";
  at?: ISODate;
  comment?: string;
}

export interface Approval {
  id: ID;
  tenantId: ID;
  type: ApprovalType;
  title: string;
  summary: string;
  objectType: string;
  objectId: ID;
  requestedBy: string;
  requestedAt: ISODate;
  risk: RiskLevel;
  status: "pending" | "approved" | "rejected" | "executed";
  steps: ApprovalStep[];
  payload: Record<string, string | number>;
  txHash?: string;
}

export interface AuditEvent {
  id: ID;
  tenantId: ID;
  at: ISODate;
  actor: { name: string; role: Role | "system"; organization: string };
  action: string;
  objectType: string;
  objectId: ID;
  reason: string;
  previousState?: string;
  newState?: string;
  approvedBy?: string;
  provider?: string;
  txHash?: string;
  ip: string;
  hash: string;
  prevHash: string;
}

/* ------------------------------------------------------------------ */
/* Events and analytics                                                */
/* ------------------------------------------------------------------ */

export type PlatformEventType =
  | "order.submitted"
  | "order.eligibility_passed"
  | "order.eligibility_review"
  | "order.rejected"
  | "payment.instructed"
  | "payment.confirmed"
  | "order.allocated"
  | "settlement.completed"
  | "token.minted"
  | "ledger.reconciled"
  | "screening.alert"
  | "approval.requested"
  | "approval.completed"
  | "distribution.paid"
  | "recon.break_detected"
  | "provider.degraded"
  | "nav.updated"
  | "trade.settled";

export interface PlatformEvent {
  id: ID;
  type: PlatformEventType;
  at: ISODate;
  title: string;
  detail: string;
  objectType: string;
  objectId: ID;
  href?: string;
  severity: "info" | "success" | "warning" | "critical";
}

export interface DashboardSummary {
  aumUsd: number;
  aumChangePct: number;
  liveAssets: number;
  investors: number;
  verifiedInvestors: number;
  openOrders: number;
  pendingApprovals: number;
  openAlerts: number;
  openBreaks: number;
  settledVolume30d: number;
  distributions90d: number;
  aumSeries: { date: ISODate; value: number }[];
  volumeSeries: { date: ISODate; primary: number; secondary: number }[];
  aumByTemplate: { template: AssetTemplate; value: number }[];
  supplyByChain: { chain: Chain; value: number }[];
  pipeline: Record<OrderStage, number>;
}

/** Platform-level thresholds and authorities, editable by authorised staff. The engine reads these values. */
export interface InternalRules {
  mintApprovalThresholdUsd: number;
  issuanceVerificationRequired: boolean;
  incompleteProfilesGoToReview: boolean;
  autoApproveMaxAmlRisk: RiskLevel;
  dualApprovalForHighRiskOverrides: boolean;
  overrideRoles: { verification: Role[]; listing: Role[]; valuation: Role[] };
  riskBands: { veryLowMax: number; lowMax: number; mediumMax: number };
  card: { enabled: boolean; retailLimitUsd: number; professionalLimitUsd: number; feePct: number; threeDSecure: boolean };
  manualValuationTolerancePct: number;
  updatedAt: ISODate;
  updatedBy: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Investor home screen: which widgets show, in what order. */
export type HomeWidgetKey = "summary" | "recommended" | "income" | "watchlist" | "activity" | "markets" | "documents" | "learn";
export interface HomeLayout {
  order: HomeWidgetKey[];
  hidden: HomeWidgetKey[];
}
