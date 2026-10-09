"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ID } from "@/types/domain";
import type { LatencyProfile } from "@/services/config";

export type ThemePref = "light" | "dark" | "system";

interface SessionState {
  signedIn: boolean;
  tenantId: ID;
  personaId: ID;
  theme: ThemePref;
  sidebarCollapsed: boolean;
  latency: LatencyProfile;
  failureRate: number;
  ambientEvents: boolean;
  signIn: (personaId: ID, tenantId: ID) => void;
  signOut: () => void;
  setTenant: (id: ID) => void;
  setPersona: (id: ID) => void;
  setTheme: (t: ThemePref) => void;
  toggleSidebar: () => void;
  setSimulation: (s: Partial<Pick<SessionState, "latency" | "failureRate" | "ambientEvents">>) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = "__srh_probe";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  }
});

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      signedIn: false,
      tenantId: "tnt_srh",
      personaId: "usr_ops",
      theme: "system",
      sidebarCollapsed: false,
      latency: "realistic",
      failureRate: 0,
      ambientEvents: true,
      signIn: (personaId, tenantId) => set({ signedIn: true, personaId, tenantId }),
      signOut: () => set({ signedIn: false }),
      setTenant: (tenantId) => set({ tenantId }),
      setPersona: (personaId) => set({ personaId }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSimulation: (s) => set(s),
    }),
    { name: "srh2.session", storage: safeStorage, version: 1 },
  ),
);
