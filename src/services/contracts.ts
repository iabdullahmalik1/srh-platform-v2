/**
 * Platform API contract.
 *
 * The UI talks only to this interface (through `api` in services/api.ts).
 * Two adapters implement it:
 *   - services/mock/adapter.ts  in-browser simulation with latency, failures, events and audit
 *   - services/http/adapter.ts  REST client for the real backend (see services/http/endpoints.ts)
 *
 * Switch with NEXT_PUBLIC_API_MODE=mock | http.
 */
import type * as D from "@/types/domain";

export interface RequestContext {
  tenantId: D.ID;
  actor: D.Persona;
}

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, string | undefined>;
}

export interface TokenOperationInput {
  tokenClassId: D.ID;
  operation: D.TokenOperation;
  chain: D.Chain;
  amount?: number;
  fromWallet?: string;
  toWallet?: string;
  reason: string;
}

export interface DistributionInput {
  assetId: D.ID;
  type: D.DistributionType;
  grossAmount: number;
  recordDate: D.ISODate;
  paymentDate: D.ISODate;
  rail: D.PaymentRail;
}

export interface MarketOrderInput {
  tokenClassId: D.ID;
  investorId: D.ID;
  side: "buy" | "sell";
  type: "limit" | "rfq" | "block";
  quantity: number;
  price: number;
  venue: D.Venue;
}

export interface EligibilityInput {
  investorId: D.ID;
  assetId: D.ID;
  offeringId?: D.ID;
  amount?: number;
  walletId?: D.ID;
}

export type VerificationAction = "approve" | "waive" | "request" | "submit";

export interface ValuationInput {
  assetId: D.ID;
  navPerToken: number;
  source: string;
  note: string;
}

export interface AssetDocumentInput {
  name: string;
  kind: D.AssetDocument["kind"];
  visibility: D.DocumentVisibility;
  sizeKb?: number;
}

export interface CorporateActionInput {
  assetId: D.ID;
  kind: D.CorporateAction["kind"];
  title: string;
  detail: string;
  effectiveDate: D.ISODate;
}

export type Unsubscribe = () => void;

export interface PlatformApi {
  setContext(ctx: RequestContext): void;

  platform: {
    listTenants(): Promise<D.Tenant[]>;
    getTenant(id: D.ID): Promise<D.Tenant>;
    updateModules(id: D.ID, modules: D.ModuleKey[]): Promise<D.Tenant>;
    updateBrand(id: D.ID, brand: Partial<D.Tenant["brand"]> & { name?: string; domain?: string }): Promise<D.Tenant>;
    createApiKey(label: string, scopes: string[]): Promise<{ key: string; tenant: D.Tenant }>;
    listPersonas(): Promise<D.Persona[]>;
    listJurisdictions(): Promise<D.Jurisdiction[]>;
    checkCapability(req: D.CapabilityRequest): Promise<D.CapabilityResult>;
    dashboard(): Promise<D.DashboardSummary>;
    getInternalRules(): Promise<D.InternalRules>;
    updateInternalRules(patch: Partial<Omit<D.InternalRules, "updatedAt" | "updatedBy">>): Promise<D.InternalRules>;
  };

  identity: {
    listInvestors(params?: ListParams): Promise<D.Paginated<D.Investor>>;
    getInvestor(id: D.ID): Promise<D.Investor>;
    createInvestor(input: D.NewInvestorInput): Promise<D.Investor>;
    decideKyc(id: D.ID, decision: "approved" | "rejected", note: string): Promise<D.Investor>;
    addWallet(investorId: D.ID, wallet: Pick<D.Wallet, "address" | "chain" | "type" | "label" | "custodian">): Promise<D.Investor>;
    setWalletWhitelist(investorId: D.ID, walletId: D.ID, whitelisted: boolean): Promise<D.Investor>;
    listIssuers(): Promise<D.Issuer[]>;
    /** Approve manually, waive, request from the investor, or (investor) submit an outstanding item. High-risk items may return a pending approval. */
    updateVerification(investorId: D.ID, key: D.VerificationKey, action: VerificationAction, reason: string): Promise<{ investor: D.Investor; approval?: D.Approval }>;
    updateInterests(investorId: D.ID, interests: D.InvestorInterests): Promise<D.Investor>;
    getHomeLayout(investorId: D.ID): Promise<D.HomeLayout | null>;
    saveHomeLayout(investorId: D.ID, layout: D.HomeLayout): Promise<D.HomeLayout>;
  };

  compliance: {
    listPolicyPacks(): Promise<D.PolicyPack[]>;
    toggleRule(packId: D.ID, ruleId: D.ID, enabled: boolean): Promise<D.PolicyPack>;
    checkEligibility(input: EligibilityInput): Promise<D.EligibilityResult>;
    listAlerts(params?: ListParams): Promise<D.ScreeningAlert[]>;
    resolveAlert(id: D.ID, status: "cleared" | "confirmed" | "escalated", note: string): Promise<D.ScreeningAlert>;
  };

  assets: {
    listAssets(params?: ListParams): Promise<D.Asset[]>;
    getAsset(id: D.ID): Promise<D.Asset>;
    createAsset(input: D.NewAssetInput): Promise<D.Asset>;
    submitForReview(id: D.ID): Promise<D.Asset>;
    listOfferings(): Promise<D.Offering[]>;
    getOffering(id: D.ID): Promise<D.Offering>;
    listCorporateActions(assetId?: D.ID): Promise<D.CorporateAction[]>;
    /** Moves a product between listing stages with a recorded reason, through maker-checker approval. */
    overrideListingStage(assetId: D.ID, to: D.AssetStatus, reason: string): Promise<D.Approval>;
    /** Manual valuation entry for assets without an automated feed. */
    enterValuation(input: ValuationInput): Promise<D.Approval>;
    uploadDocument(assetId: D.ID, doc: AssetDocumentInput): Promise<D.Asset>;
    setDocumentVisibility(assetId: D.ID, documentId: D.ID, visibility: D.DocumentVisibility): Promise<D.Asset>;
    createCorporateAction(input: CorporateActionInput): Promise<D.CorporateAction>;
  };

  orders: {
    listOrders(params?: ListParams): Promise<D.Order[]>;
    getOrder(id: D.ID): Promise<D.Order>;
    subscribe(input: D.NewSubscriptionInput): Promise<D.Order>;
    advance(id: D.ID, note?: string): Promise<D.Order>;
    resolveException(id: D.ID, action: "retry" | "approve" | "refund", note: string): Promise<D.Order>;
    cancel(id: D.ID, reason: string): Promise<D.Order>;
  };

  payments: {
    listPayments(params?: ListParams): Promise<D.Payment[]>;
    listLedger(): Promise<D.LedgerEntry[]>;
  };

  tokens: {
    listTokenClasses(): Promise<D.TokenClass[]>;
    getTokenClass(id: D.ID): Promise<D.TokenClass>;
    requestOperation(input: TokenOperationInput): Promise<D.Approval>;
    deployToChain(tokenClassId: D.ID, chain: D.Chain): Promise<D.Approval>;
    verifyIssuance(tokenClassId: D.ID, checkKey: string, action: "verify" | "waive", note: string): Promise<D.TokenClass>;
  };

  registry: {
    listHoldings(params?: ListParams): Promise<D.Holding[]>;
    listBreaks(): Promise<D.ReconciliationBreak[]>;
    resolveBreak(id: D.ID, resolution: string): Promise<D.ReconciliationBreak>;
    runReconciliation(): Promise<D.ReconciliationRun>;
    listRuns(): Promise<D.ReconciliationRun[]>;
  };

  servicing: {
    listDistributions(assetId?: D.ID): Promise<D.Distribution[]>;
    calculateDistribution(input: DistributionInput): Promise<D.Distribution>;
    submitDistribution(id: D.ID): Promise<D.Approval>;
    castVote(actionId: D.ID, choice: "for" | "against" | "abstain"): Promise<D.CorporateAction>;
  };

  markets: {
    listOrders(tokenClassId?: D.ID): Promise<D.MarketOrder[]>;
    listTrades(tokenClassId?: D.ID): Promise<D.Trade[]>;
    preTradeCheck(input: MarketOrderInput): Promise<D.PreTradeCheck>;
    placeOrder(input: MarketOrderInput): Promise<D.MarketOrder>;
    requestQuotes(input: MarketOrderInput): Promise<D.RfqQuote[]>;
    acceptQuote(input: MarketOrderInput, quote: D.RfqQuote): Promise<D.Trade>;
  };

  defi: {
    listPositions(): Promise<D.DefiPosition[]>;
    setPositionStatus(id: D.ID, status: D.DefiPosition["status"]): Promise<D.DefiPosition>;
  };

  custody: {
    listAccounts(): Promise<D.CustodyAccount[]>;
    listProviders(): Promise<D.Provider[]>;
    testProvider(id: D.ID): Promise<D.Provider>;
  };

  approvals: {
    listApprovals(params?: ListParams): Promise<D.Approval[]>;
    decide(id: D.ID, decision: "approved" | "rejected", comment: string): Promise<D.Approval>;
  };

  audit: {
    listEvents(params?: ListParams): Promise<D.Paginated<D.AuditEvent>>;
    verifyChain(): Promise<{ valid: boolean; checked: number; headHash: string }>;
  };

  events: {
    recent(): Promise<D.PlatformEvent[]>;
    subscribe(handler: (e: D.PlatformEvent) => void): Unsubscribe;
  };
}
