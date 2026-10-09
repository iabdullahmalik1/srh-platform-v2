import { mockAdapter as api } from "@/services/mock/adapter";
import { setSimulation } from "@/services/config";
import { getDb } from "@/services/mock/db";
import { stopEngine } from "@/services/mock/engine";
import personas from "@/mocks/data/personas.json";
import type * as D from "@/types/domain";
setSimulation({ latency: "fast", failureRate: 0, ambientEvents: false });
(async () => {
  for (const t of ["tnt_srh", "tnt_xyz", "tnt_ngt", "tnt_mrd"]) {
    api.setContext({ tenantId: t, actor: (personas as D.Persona[])[1] });
    const db = getDb();
    for (const inv of db.investors.filter((i) => i.tenantId === t)) for (const a of db.assets.filter((x) => x.tenantId === t)) {
      const r = await api.compliance.checkEligibility({ investorId: inv.id, assetId: a.id, amount: 100_000 } as never);
      if (r.decision !== "ALLOW") console.log(t, r.decision, inv.id, inv.name, inv.residency, inv.classification, a.id, "|", r.checks.filter((c) => c.outcome !== "pass").map((c) => c.ruleCode + " " + c.detail).join("; ").slice(0, 150));
    }
  }
  stopEngine(); process.exit(0);
})();
