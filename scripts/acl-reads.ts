import { mockAdapter as api } from "@/services/mock/adapter";
import { setSimulation } from "@/services/config";
import { stopEngine } from "@/services/mock/engine";
import personas from "@/mocks/data/personas.json";
import type * as D from "@/types/domain";
setSimulation({ latency: "fast", failureRate: 0, ambientEvents: false });
const P = personas as D.Persona[];
const reads: Record<string, () => Promise<unknown>> = {
  dashboard: () => api.platform.dashboard(), approvals: () => api.approvals.listApprovals(), alerts: () => api.compliance.listAlerts(),
  payments: () => api.payments.listPayments(), ledger: () => api.payments.listLedger(), breaks: () => api.registry.listBreaks(), runs: () => api.registry.listRuns(),
  audit: () => api.audit.listEvents(), verify: () => api.audit.verifyChain(), custody: () => api.custody.listAccounts(), defi: () => api.defi.listPositions(),
  holdings: () => api.registry.listHoldings(), orders: () => api.orders.listOrders(), distributions: () => api.servicing.listDistributions(), offerings: () => api.assets.listOfferings(),
};
(async () => {
  for (const id of ["usr_inv", "usr_aud", "usr_ops"]) {
    api.setContext({ tenantId: "tnt_srh", actor: P.find((p) => p.id === id)! });
    const row: string[] = [];
    for (const [k, f] of Object.entries(reads)) {
      try { const r = (await f()) as unknown; row.push(`${k}:${Array.isArray(r) ? r.length : (r as { items?: unknown[] })?.items?.length ?? "ok"}`); } catch (e) { row.push(`${k}:${(e as { status?: number }).status}`); }
    }
    console.log(id, row.join(" "));
  }
  stopEngine(); process.exit(0);
})();
