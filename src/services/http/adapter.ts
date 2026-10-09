/**
 * REST adapter for the production backend.
 * Paths follow the API-first principle in the brief (POST /investors, /kyc, /eligibility/check,
 * /assets, /offerings, /subscriptions, /payments, /settlements, /tokens, /transfers, /redemptions).
 * Adjust paths here only; no UI code changes are needed.
 */
import type * as D from "@/types/domain";
import type { ListParams, PlatformApi } from "@/services/contracts";
import { apiConfig } from "@/services/config";
import { http, setHttpContext } from "./client";

const list = (p?: ListParams) => ({ q: p?.search, page: p?.page, pageSize: p?.pageSize, sort: p?.sort, ...(p?.filters ?? {}) });

export const httpAdapter: PlatformApi = {
  setContext: (ctx) => setHttpContext(ctx),

  platform: {
    listTenants: () => http.get("/tenants"),
    getTenant: (id) => http.get(`/tenants/${id}`),
    updateModules: (id, modules) => http.put(`/tenants/${id}/modules`, { modules }),
    updateBrand: (id, brand) => http.patch(`/tenants/${id}/brand`, brand),
    createApiKey: (label, scopes) => http.post("/api-keys", { label, scopes }),
    listPersonas: () => http.get("/me/roles"),
    listJurisdictions: () => http.get("/reference/jurisdictions"),
    checkCapability: (req) => http.post("/capabilities/check", req),
    dashboard: () => http.get("/analytics/dashboard"),
    getInternalRules: () => http.get("/settings/rules"),
    updateInternalRules: (patch) => http.patch("/settings/rules", patch),
  },

  identity: {
    listInvestors: (p) => http.get("/investors", list(p)),
    getInvestor: (id) => http.get(`/investors/${id}`),
    createInvestor: (input) => http.post("/investors", input),
    decideKyc: (id, decision, note) => http.post(`/kyc/${id}/decision`, { decision, note }),
    addWallet: (investorId, wallet) => http.post(`/investors/${investorId}/wallets`, wallet),
    setWalletWhitelist: (investorId, walletId, whitelisted) => http.put(`/investors/${investorId}/wallets/${walletId}/whitelist`, { whitelisted }),
    listIssuers: () => http.get("/issuers"),
    updateVerification: (investorId, key, action, reason) => http.post(`/investors/${investorId}/verification/${key}`, { action, reason }),
    updateInterests: (investorId, interests) => http.put(`/investors/${investorId}/interests`, interests),
    getHomeLayout: (investorId) => http.get(`/investors/${investorId}/home-layout`),
    saveHomeLayout: (investorId, layout) => http.put(`/investors/${investorId}/home-layout`, layout),
  },

  compliance: {
    listPolicyPacks: () => http.get("/policy-packs"),
    toggleRule: (packId, ruleId, enabled) => http.patch(`/policy-packs/${packId}/rules/${ruleId}`, { enabled }),
    checkEligibility: (input) => http.post("/eligibility/check", input),
    listAlerts: (p) => http.get("/screening/alerts", list(p)),
    resolveAlert: (id, status, note) => http.post(`/screening/alerts/${id}/resolution`, { status, note }),
  },

  assets: {
    listAssets: (p) => http.get("/assets", list(p)),
    getAsset: (id) => http.get(`/assets/${id}`),
    createAsset: (input) => http.post("/assets", input),
    submitForReview: (id) => http.post(`/assets/${id}/submit`),
    listOfferings: () => http.get("/offerings"),
    getOffering: (id) => http.get(`/offerings/${id}`),
    listCorporateActions: (assetId) => http.get("/corporate-actions", { assetId }),
    overrideListingStage: (assetId, to, reason) => http.post(`/assets/${assetId}/stage-override`, { to, reason }),
    enterValuation: (input) => http.post(`/assets/${input.assetId}/valuations`, input),
    uploadDocument: (assetId, doc) => http.post(`/assets/${assetId}/documents`, doc),
    setDocumentVisibility: (assetId, documentId, visibility) => http.patch(`/assets/${assetId}/documents/${documentId}`, { visibility }),
    createCorporateAction: (input) => http.post("/corporate-actions", input),
  },

  orders: {
    listOrders: (p) => http.get("/subscriptions", list(p)),
    getOrder: (id) => http.get(`/subscriptions/${id}`),
    subscribe: (input) => http.post("/subscriptions", input),
    advance: (id, note) => http.post(`/subscriptions/${id}/advance`, { note }),
    resolveException: (id, action, note) => http.post(`/subscriptions/${id}/exceptions/resolve`, { action, note }),
    cancel: (id, reason) => http.post(`/subscriptions/${id}/cancel`, { reason }),
  },

  payments: {
    listPayments: (p) => http.get("/payments", list(p)),
    listLedger: () => http.get("/ledger/entries"),
  },

  tokens: {
    listTokenClasses: () => http.get("/tokens"),
    getTokenClass: (id) => http.get(`/tokens/${id}`),
    requestOperation: (input) => http.post(`/tokens/${input.tokenClassId}/operations`, input),
    deployToChain: (tokenClassId, chain) => http.post(`/tokens/${tokenClassId}/deployments`, { chain }),
    verifyIssuance: (tokenClassId, checkKey, action, note) => http.post(`/tokens/${tokenClassId}/issuance/${checkKey}`, { action, note }),
  },

  registry: {
    listHoldings: (p) => http.get("/registry/holdings", list(p)),
    listBreaks: () => http.get("/reconciliation/breaks"),
    resolveBreak: (id, resolution) => http.post(`/reconciliation/breaks/${id}/resolve`, { resolution }),
    runReconciliation: () => http.post("/reconciliation/runs"),
    listRuns: () => http.get("/reconciliation/runs"),
  },

  servicing: {
    listDistributions: (assetId) => http.get("/distributions", { assetId }),
    calculateDistribution: (input) => http.post("/distributions", input),
    submitDistribution: (id) => http.post(`/distributions/${id}/submit`),
    castVote: (actionId, choice) => http.post(`/corporate-actions/${actionId}/votes`, { choice }),
  },

  markets: {
    listOrders: (tokenClassId) => http.get("/markets/orders", { tokenClassId }),
    listTrades: (tokenClassId) => http.get("/markets/trades", { tokenClassId }),
    preTradeCheck: (input) => http.post("/transfers/pre-check", input),
    placeOrder: (input) => http.post("/markets/orders", input),
    requestQuotes: (input) => http.post("/markets/rfq", input),
    acceptQuote: (input, quote) => http.post(`/markets/rfq/${quote.id}/accept`, input),
  },

  defi: {
    listPositions: () => http.get("/defi/positions"),
    setPositionStatus: (id, status) => http.patch(`/defi/positions/${id}`, { status }),
  },

  custody: {
    listAccounts: () => http.get("/custody/accounts"),
    listProviders: () => http.get("/integrations/providers"),
    testProvider: (id) => http.post(`/integrations/providers/${id}/test`),
  },

  approvals: {
    listApprovals: (p) => http.get("/approvals", list(p)),
    decide: (id, decision, comment) => http.post(`/approvals/${id}/decisions`, { decision, comment }),
  },

  audit: {
    listEvents: (p) => http.get("/audit/events", list(p)),
    verifyChain: () => http.post("/audit/verify"),
  },

  events: {
    recent: () => http.get<D.PlatformEvent[]>("/events", { limit: 60 }),
    subscribe: (handler) => {
      if (typeof window === "undefined" || typeof EventSource === "undefined") return () => {};
      const es = new EventSource(apiConfig.eventsUrl, { withCredentials: true });
      es.onmessage = (m) => {
        try {
          handler(JSON.parse(m.data) as D.PlatformEvent);
        } catch {
          /* ignore malformed frames */
        }
      };
      return () => es.close();
    },
  },
};
