"use client";

import { useMemo } from "react";
import type { Persona, Tenant } from "@/types/domain";
import personas from "@/mocks/data/personas.json";
import tenantsSeed from "@/mocks/data/tenants.json";
import { useSession } from "@/stores/session";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/constants";
import { useTenant } from "./api";

/** Identity directory. In production this comes from the identity provider session. */
export const PERSONAS = personas as Persona[];
export const TENANTS_SEED = tenantsSeed as unknown as Tenant[];

export function usePersona(): Persona {
  const id = useSession((s) => s.personaId);
  return useMemo(() => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0], [id]);
}

/** Current tenant with live data (brand edits, module changes), falling back to seed for instant paint. */
export function useCurrentTenant(): Tenant {
  const id = useSession((s) => s.tenantId);
  const { data } = useTenant(id);
  return data ?? TENANTS_SEED.find((t) => t.id === id) ?? TENANTS_SEED[0];
}

export function useCan(p: Permission) {
  const persona = usePersona();
  return ROLE_PERMISSIONS[persona.role].includes(p);
}
