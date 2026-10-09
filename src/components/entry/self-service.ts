import type { Persona } from "@/types/domain";
import { api } from "@/services/api";
import { useSession } from "@/stores/session";
import { PERSONAS } from "@/hooks/session";

/**
 * Public applications are created by the onboarding service, not by a console user.
 * The mock enforces console permissions, so the request runs under a service identity on
 * the SRH platform and the session context is restored afterwards. A production backend
 * exposes this as a public self-registration endpoint with its own rate limits and captcha.
 */
const ONBOARDING_SERVICE: Persona = {
  id: "svc_onboarding",
  name: "Self-service onboarding",
  email: "onboarding@srh.inc",
  role: "operations",
  title: "Onboarding service",
  organization: "SRH Markets Ltd",
  initials: "SO",
};

export async function asOnboardingService<T>(fn: () => Promise<T>): Promise<T> {
  api.setContext({ tenantId: "tnt_srh", actor: ONBOARDING_SERVICE });
  try {
    return await fn();
  } finally {
    const s = useSession.getState();
    api.setContext({ tenantId: s.tenantId, actor: PERSONAS.find((p) => p.id === s.personaId) ?? PERSONAS[0] });
  }
}
