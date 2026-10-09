"use client";

/**
 * React Query bindings for every API capability.
 * Components never call `api` directly; they use these hooks so caching,
 * loading, error and invalidation behaviour is consistent across modules.
 */
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import type * as D from "@/types/domain";
import { api, errorMessage } from "@/services/api";
import { ApiError } from "@/services/errors";
import type { AssetDocumentInput, CorporateActionInput, DistributionInput, EligibilityInput, ListParams, MarketOrderInput, TokenOperationInput, ValuationInput, VerificationAction } from "@/services/contracts";

export const qk = {
  dashboard: ["dashboard"] as const,
  tenants: ["tenants"] as const,
  tenant: (id: string) => ["tenant", id] as const,
  personas: ["personas"] as const,
  jurisdictions: ["jurisdictions"] as const,
  investors: (p?: ListParams) => ["investors", p ?? {}] as const,
  investor: (id: string) => ["investor", id] as const,
  issuers: ["issuers"] as const,
  policyPacks: ["policy-packs"] as const,
  alerts: (p?: ListParams) => ["alerts", p ?? {}] as const,
  assets: (p?: ListParams) => ["assets", p ?? {}] as const,
  asset: (id: string) => ["asset", id] as const,
  offerings: ["offerings"] as const,
  offering: (id: string) => ["offering", id] as const,
  corporateActions: (assetId?: string) => ["corporate-actions", assetId ?? "all"] as const,
  orders: (p?: ListParams) => ["orders", p ?? {}] as const,
  order: (id: string) => ["order", id] as const,
  payments: (p?: ListParams) => ["payments", p ?? {}] as const,
  ledger: ["ledger"] as const,
  tokenClasses: ["token-classes"] as const,
  tokenClass: (id: string) => ["token-class", id] as const,
  holdings: (p?: ListParams) => ["holdings", p ?? {}] as const,
  breaks: ["breaks"] as const,
  runs: ["recon-runs"] as const,
  distributions: (assetId?: string) => ["distributions", assetId ?? "all"] as const,
  marketOrders: (tc?: string) => ["market-orders", tc ?? "all"] as const,
  trades: (tc?: string) => ["trades", tc ?? "all"] as const,
  defi: ["defi"] as const,
  custody: ["custody-accounts"] as const,
  providers: ["providers"] as const,
  approvals: (p?: ListParams) => ["approvals", p ?? {}] as const,
  audit: (p?: ListParams) => ["audit", p ?? {}] as const,
  events: ["events"] as const,
  rules: ["internal-rules"] as const,
  homeLayout: (id: string) => ["home-layout", id] as const,
};

/** Query keys that hold reference data and do not need refreshing on platform events. */
export const STATIC_KEYS = new Set(["tenants", "personas", "jurisdictions", "policy-packs"]);

type MutOpts<TData, TVars> = {
  success?: string | ((d: TData, v: TVars) => string);
  invalidate?: (QueryKey | ((d: TData, v: TVars) => QueryKey))[];
  silent?: boolean;
};

function useApiMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>, opts: MutOpts<TData, TVars> = {}) {
  const qc = useQueryClient();
  return useMutation<TData, ApiError | Error, TVars>({
    mutationFn: fn,
    onSuccess: (d, v) => {
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: typeof k === "function" ? k(d, v) : k }));
      qc.invalidateQueries({ queryKey: qk.dashboard });
      if (opts.success && !opts.silent) toast.success(typeof opts.success === "function" ? opts.success(d, v) : opts.success);
    },
    onError: (e, v) => {
      if (opts.silent) return;
      const retry = e instanceof ApiError && e.retryable;
      toast.error(errorMessage(e), {
        description: e instanceof ApiError ? `${e.code} · ${e.requestId}` : undefined,
        action: retry ? { label: "Retry", onClick: () => void fn(v).then(() => opts.invalidate?.forEach((k) => typeof k !== "function" && qc.invalidateQueries({ queryKey: k }))).catch(() => toast.error("Retry failed. Try again shortly.")) } : undefined,
      });
    },
  });
}

/* --------------------------------- platform -------------------------------- */
export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: api.platform.dashboard });
export const useTenants = () => useQuery({ queryKey: qk.tenants, queryFn: api.platform.listTenants, staleTime: Infinity });
export const useTenant = (id: string) => useQuery({ queryKey: qk.tenant(id), queryFn: () => api.platform.getTenant(id), enabled: !!id });
export const usePersonas = () => useQuery({ queryKey: qk.personas, queryFn: api.platform.listPersonas, staleTime: Infinity });
export const useJurisdictions = () => useQuery({ queryKey: qk.jurisdictions, queryFn: api.platform.listJurisdictions, staleTime: Infinity });
export const useUpdateModules = () =>
  useApiMutation((v: { id: string; modules: D.ModuleKey[] }) => api.platform.updateModules(v.id, v.modules), { success: "Module entitlements updated", invalidate: [qk.tenants, (d) => qk.tenant(d.id)] });
export const useUpdateBrand = () =>
  useApiMutation((v: { id: string; patch: Parameters<typeof api.platform.updateBrand>[1] }) => api.platform.updateBrand(v.id, v.patch), { success: "Branding published", invalidate: [qk.tenants, (d) => qk.tenant(d.id)] });
export const useCreateApiKey = () => useApiMutation((v: { label: string; scopes: string[] }) => api.platform.createApiKey(v.label, v.scopes), { success: "API key created", invalidate: [qk.tenants, (d) => qk.tenant(d.tenant.id)] });
export const useCapabilityCheck = () => useApiMutation((req: D.CapabilityRequest) => api.platform.checkCapability(req), { silent: false });

/* --------------------------------- identity -------------------------------- */
export const useInvestors = (p?: ListParams) => useQuery({ queryKey: qk.investors(p), queryFn: () => api.identity.listInvestors(p), placeholderData: (prev) => prev });
export const useInvestor = (id: string) => useQuery({ queryKey: qk.investor(id), queryFn: () => api.identity.getInvestor(id), enabled: !!id });
export const useIssuers = () => useQuery({ queryKey: qk.issuers, queryFn: api.identity.listIssuers });
export const useCreateInvestor = () => useApiMutation((input: D.NewInvestorInput) => api.identity.createInvestor(input), { success: (d) => `${d.name} submitted for verification`, invalidate: [["investors"]] });
export const useDecideKyc = () =>
  useApiMutation((v: { id: string; decision: "approved" | "rejected"; note: string }) => api.identity.decideKyc(v.id, v.decision, v.note), { success: (d, v) => `${d.name} ${v.decision}`, invalidate: [["investors"], (d) => qk.investor(d.id)] });
export const useAddWallet = () =>
  useApiMutation((v: { investorId: string; wallet: Pick<D.Wallet, "address" | "chain" | "type" | "label" | "custodian"> }) => api.identity.addWallet(v.investorId, v.wallet), { success: "Wallet linked. Risk screening complete.", invalidate: [(d) => qk.investor(d.id)] });
export const useSetWhitelist = () =>
  useApiMutation((v: { investorId: string; walletId: string; whitelisted: boolean }) => api.identity.setWalletWhitelist(v.investorId, v.walletId, v.whitelisted), { success: (_d, v) => (v.whitelisted ? "Wallet added to identity registry" : "Wallet removed from identity registry"), invalidate: [(d) => qk.investor(d.id)] });

/* -------------------------------- compliance ------------------------------- */
export const usePolicyPacks = () => useQuery({ queryKey: qk.policyPacks, queryFn: api.compliance.listPolicyPacks });
export const useToggleRule = () =>
  useApiMutation((v: { packId: string; ruleId: string; enabled: boolean }) => api.compliance.toggleRule(v.packId, v.ruleId, v.enabled), { success: (_d, v) => (v.enabled ? "Rule enabled" : "Rule disabled"), invalidate: [qk.policyPacks] });
export const useCheckEligibility = () => useApiMutation((input: EligibilityInput) => api.compliance.checkEligibility(input));
export const useAlerts = (p?: ListParams, enabled = true) => useQuery({ queryKey: qk.alerts(p), queryFn: () => api.compliance.listAlerts(p), enabled });
export const useResolveAlert = () =>
  useApiMutation((v: { id: string; status: "cleared" | "confirmed" | "escalated"; note: string }) => api.compliance.resolveAlert(v.id, v.status, v.note), { success: (_d, v) => `Alert ${v.status}`, invalidate: [["alerts"]] });

/* ---------------------------------- assets --------------------------------- */
export const useAssets = (p?: ListParams) => useQuery({ queryKey: qk.assets(p), queryFn: () => api.assets.listAssets(p), placeholderData: (prev) => prev });
export const useAsset = (id: string) => useQuery({ queryKey: qk.asset(id), queryFn: () => api.assets.getAsset(id), enabled: !!id });
export const useCreateAsset = () => useApiMutation((input: D.NewAssetInput) => api.assets.createAsset(input), { success: (d) => `${d.name} created as draft`, invalidate: [["assets"], qk.tokenClasses, qk.offerings] });
export const useSubmitAsset = () => useApiMutation((id: string) => api.assets.submitForReview(id), { success: "Submitted for launch approval", invalidate: [["assets"], (d) => qk.asset(d.id), ["approvals"]] });
export const useOfferings = () => useQuery({ queryKey: qk.offerings, queryFn: api.assets.listOfferings });
export const useOffering = (id: string) => useQuery({ queryKey: qk.offering(id), queryFn: () => api.assets.getOffering(id), enabled: !!id });
export const useCorporateActions = (assetId?: string) => useQuery({ queryKey: qk.corporateActions(assetId), queryFn: () => api.assets.listCorporateActions(assetId) });

/* ---------------------------------- orders --------------------------------- */
export const useOrders = (p?: ListParams) => useQuery({ queryKey: qk.orders(p), queryFn: () => api.orders.listOrders(p), placeholderData: (prev) => prev });
export const useOrder = (id: string) =>
  useQuery({ queryKey: qk.order(id), queryFn: () => api.orders.getOrder(id), enabled: !!id, refetchInterval: (q) => (q.state.data?.status === "active" ? 5000 : false) });
export const useSubscribe = () => useApiMutation((input: D.NewSubscriptionInput) => api.orders.subscribe(input), { success: (d) => `Order ${d.id} received`, invalidate: [["orders"], qk.offerings] });
export const useAdvanceOrder = () => useApiMutation((v: { id: string; note?: string }) => api.orders.advance(v.id, v.note), { success: "Order advanced", invalidate: [["orders"], (d) => qk.order(d.id), ["payments"]] });
export const useResolveOrderException = () =>
  useApiMutation((v: { id: string; action: "retry" | "approve" | "refund"; note: string }) => api.orders.resolveException(v.id, v.action, v.note), { success: (_d, v) => (v.action === "refund" ? "Refund initiated" : "Exception resolved, order resumed"), invalidate: [["orders"], (d) => qk.order(d.id)] });
export const useCancelOrder = () => useApiMutation((v: { id: string; reason: string }) => api.orders.cancel(v.id, v.reason), { success: "Order cancelled", invalidate: [["orders"], (d) => qk.order(d.id)] });

/* --------------------------------- payments -------------------------------- */
export const usePayments = (p?: ListParams) => useQuery({ queryKey: qk.payments(p), queryFn: () => api.payments.listPayments(p), placeholderData: (prev) => prev });
export const useLedger = () => useQuery({ queryKey: qk.ledger, queryFn: api.payments.listLedger });

/* ---------------------------------- tokens --------------------------------- */
export const useTokenClasses = () => useQuery({ queryKey: qk.tokenClasses, queryFn: api.tokens.listTokenClasses });
export const useTokenClass = (id: string) => useQuery({ queryKey: qk.tokenClass(id), queryFn: () => api.tokens.getTokenClass(id), enabled: !!id });
export const useTokenOperation = () => useApiMutation((input: TokenOperationInput) => api.tokens.requestOperation(input), { success: "Request sent for approval", invalidate: [["approvals"]] });
export const useDeployChain = () => useApiMutation((v: { tokenClassId: string; chain: D.Chain }) => api.tokens.deployToChain(v.tokenClassId, v.chain), { success: "Deployment request sent for approval", invalidate: [["approvals"]] });

/* --------------------------------- registry -------------------------------- */
export const useHoldings = (p?: ListParams) => useQuery({ queryKey: qk.holdings(p), queryFn: () => api.registry.listHoldings(p), placeholderData: (prev) => prev });
export const useBreaks = (enabled = true) => useQuery({ queryKey: qk.breaks, queryFn: api.registry.listBreaks, enabled });
export const useResolveBreak = () => useApiMutation((v: { id: string; resolution: string }) => api.registry.resolveBreak(v.id, v.resolution), { success: "Break resolved", invalidate: [qk.breaks] });
export const useRunRecon = () => useApiMutation(() => api.registry.runReconciliation(), { success: (d) => (d.breaks ? `Run complete: ${d.breaks} open breaks` : "Run complete: all sources agree"), invalidate: [qk.runs, qk.breaks] });
export const useReconRuns = () => useQuery({ queryKey: qk.runs, queryFn: api.registry.listRuns });

/* --------------------------------- servicing ------------------------------- */
export const useDistributions = (assetId?: string) => useQuery({ queryKey: qk.distributions(assetId), queryFn: () => api.servicing.listDistributions(assetId) });
export const useCalculateDistribution = () => useApiMutation((input: DistributionInput) => api.servicing.calculateDistribution(input), { success: "Distribution calculated", invalidate: [["distributions"]] });
export const useSubmitDistribution = () => useApiMutation((id: string) => api.servicing.submitDistribution(id), { success: "Sent for approval", invalidate: [["distributions"], ["approvals"]] });
export const useCastVote = () => useApiMutation((v: { id: string; choice: "for" | "against" | "abstain" }) => api.servicing.castVote(v.id, v.choice), { success: "Vote recorded on-chain", invalidate: [["corporate-actions"]] });

/* ---------------------------------- markets -------------------------------- */
export const useMarketOrders = (tc?: string) => useQuery({ queryKey: qk.marketOrders(tc), queryFn: () => api.markets.listOrders(tc) });
export const useTrades = (tc?: string) => useQuery({ queryKey: qk.trades(tc), queryFn: () => api.markets.listTrades(tc) });
export const usePreTradeCheck = () => useApiMutation((input: MarketOrderInput) => api.markets.preTradeCheck(input));
export const usePlaceOrder = () => useApiMutation((input: MarketOrderInput) => api.markets.placeOrder(input), { success: "Order placed", invalidate: [["market-orders"], ["trades"]] });
export const useRequestQuotes = () => useApiMutation((input: MarketOrderInput) => api.markets.requestQuotes(input));
export const useAcceptQuote = () => useApiMutation((v: { input: MarketOrderInput; quote: D.RfqQuote }) => api.markets.acceptQuote(v.input, v.quote), { success: (d) => `Executed with ${d.buyer === d.seller ? "dealer" : d.venue}. Settling via DvP.`, invalidate: [["trades"]] });

/* ------------------------------- defi, custody ----------------------------- */
export const useDefiPositions = () => useQuery({ queryKey: qk.defi, queryFn: api.defi.listPositions });
export const useSetDefiStatus = () => useApiMutation((v: { id: string; status: D.DefiPosition["status"] }) => api.defi.setPositionStatus(v.id, v.status), { success: (d) => `${d.protocol} is now ${d.status}`, invalidate: [qk.defi] });
export const useCustodyAccounts = () => useQuery({ queryKey: qk.custody, queryFn: api.custody.listAccounts });
export const useProviders = () => useQuery({ queryKey: qk.providers, queryFn: api.custody.listProviders });
export const useTestProvider = () => useApiMutation((id: string) => api.custody.testProvider(id), { success: (d) => `${d.name} responded in ${d.latencyMs} ms`, invalidate: [qk.providers] });

/* ------------------------------ approvals, audit --------------------------- */
export const useApprovals = (p?: ListParams, enabled = true) => useQuery({ queryKey: qk.approvals(p), queryFn: () => api.approvals.listApprovals(p), enabled });
export const useDecideApproval = () =>
  useApiMutation((v: { id: string; decision: "approved" | "rejected"; comment: string }) => api.approvals.decide(v.id, v.decision, v.comment), {
    success: (d, v) => (d.status === "executed" ? "All approvals collected. Executed." : v.decision === "approved" ? "Approval recorded. Waiting for next approver." : "Request rejected"),
    invalidate: [["approvals"], ["orders"], ["token-classes"], ["distributions"], ["holdings"], ["investor"], ["investors"], ["asset"], ["assets"], ["corporate-actions"]],
  });
export const useAudit = (p?: ListParams) => useQuery({ queryKey: qk.audit(p), queryFn: () => api.audit.listEvents(p), placeholderData: (prev) => prev });
export const useVerifyChain = () => useApiMutation(() => api.audit.verifyChain(), { success: (d) => (d.valid ? `Hash chain intact across ${d.checked} records` : "Hash chain broken. Investigate immediately.") });
export const useRecentEvents = () => useQuery({ queryKey: qk.events, queryFn: api.events.recent });

/* ------------------------- V2: overrides, rules, valuation ----------------------- */
export const useInternalRules = (enabled = true) => useQuery({ queryKey: qk.rules, queryFn: api.platform.getInternalRules, enabled });
export const useUpdateInternalRules = () =>
  useApiMutation((patch: Partial<Omit<D.InternalRules, "updatedAt" | "updatedBy">>) => api.platform.updateInternalRules(patch), { success: "Rules saved", invalidate: [qk.rules] });
export const useUpdateVerification = () =>
  useApiMutation((v: { investorId: string; key: D.VerificationKey; action: VerificationAction; reason: string }) => api.identity.updateVerification(v.investorId, v.key, v.action, v.reason), {
    success: (d, v) => (d.approval ? "Sent to a second approver" : v.action === "approve" ? "Approved manually" : v.action === "waive" ? "Requirement waived" : v.action === "submit" ? "Sent for review" : "Request sent to the investor"),
    invalidate: [(_d, v) => qk.investor(v.investorId), ["investors"], ["approvals"]],
  });
export const useUpdateInterests = () =>
  useApiMutation((v: { investorId: string; interests: D.InvestorInterests }) => api.identity.updateInterests(v.investorId, v.interests), { success: "Preferences saved", invalidate: [(d) => qk.investor(d.id)] });
export const useHomeLayout = (investorId: string) => useQuery({ queryKey: qk.homeLayout(investorId), queryFn: () => api.identity.getHomeLayout(investorId), enabled: !!investorId });
export const useSaveHomeLayout = () =>
  useApiMutation((v: { investorId: string; layout: D.HomeLayout }) => api.identity.saveHomeLayout(v.investorId, v.layout), { silent: true, invalidate: [(_d, v) => qk.homeLayout(v.investorId)] });
export const useOverrideListingStage = () =>
  useApiMutation((v: { assetId: string; to: D.AssetStatus; reason: string }) => api.assets.overrideListingStage(v.assetId, v.to, v.reason), { success: "Stage change sent for approval", invalidate: [["approvals"]] });
export const useEnterValuation = () => useApiMutation((input: ValuationInput) => api.assets.enterValuation(input), { success: "Valuation sent to the checker", invalidate: [["approvals"]] });
export const useUploadAssetDocument = () =>
  useApiMutation((v: { assetId: string; doc: AssetDocumentInput }) => api.assets.uploadDocument(v.assetId, v.doc), { success: "Document uploaded", invalidate: [(d) => qk.asset(d.id), ["assets"]] });
export const useSetDocumentVisibility = () =>
  useApiMutation((v: { assetId: string; documentId: string; visibility: D.DocumentVisibility }) => api.assets.setDocumentVisibility(v.assetId, v.documentId, v.visibility), { success: "Visibility updated", invalidate: [(d) => qk.asset(d.id)] });
export const useCreateCorporateAction = () =>
  useApiMutation((input: CorporateActionInput) => api.assets.createCorporateAction(input), { success: "Corporate action scheduled", invalidate: [["corporate-actions"]] });
export const useVerifyIssuance = () =>
  useApiMutation((v: { tokenClassId: string; key: string; action: "verify" | "waive"; note: string }) => api.tokens.verifyIssuance(v.tokenClassId, v.key, v.action, v.note), {
    success: (d) => (d.issuance?.status === "verified" ? `${d.symbol} issuance verified` : "Check recorded"),
    invalidate: [qk.tokenClasses, (d) => qk.tokenClass(d.id), ["orders"]],
  });
