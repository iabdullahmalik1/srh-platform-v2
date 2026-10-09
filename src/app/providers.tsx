"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { api } from "@/services/api";
import { setSimulation } from "@/services/config";
import { ApiError } from "@/services/errors";
import { useSession } from "@/stores/session";
import { useEvents } from "@/stores/events";
import { PERSONAS, useCurrentTenant } from "@/hooks/session";
import { STATIC_KEYS } from "@/hooks/api";
import { TooltipProvider } from "@/components/ui/primitives";
import { withBase } from "@/lib/assets";
import type { PlatformEvent } from "@/types/domain";

let browserClient: QueryClient | undefined;
function getQueryClient() {
  const make = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 20_000,
          refetchOnWindowFocus: false,
          retry: (count, e) => (e instanceof ApiError ? e.retryable && count < 2 : count < 1),
          retryDelay: (n) => Math.min(800 * 2 ** n, 4000),
        },
        mutations: { retry: false },
      },
    });
  if (typeof window === "undefined") return make();
  browserClient ??= make();
  return browserClient;
}

/** Keeps the API request context (tenant, acting persona) in sync with the session. */
function ContextSync() {
  const tenantId = useSession((s) => s.tenantId);
  const personaId = useSession((s) => s.personaId);
  const latency = useSession((s) => s.latency);
  const failureRate = useSession((s) => s.failureRate);
  const ambientEvents = useSession((s) => s.ambientEvents);
  // Set synchronously so the first queries carry the right context.
  const actor = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];
  api.setContext({ tenantId, actor });
  setSimulation({ latency, failureRate, ambientEvents });
  return null;
}

/** Drops cached records when the acting persona or tenant changes, so one identity never sees another's data while queries refetch. */
function IdentityCacheReset() {
  const qc = useQueryClient();
  const tenantId = useSession((s) => s.tenantId);
  const personaId = useSession((s) => s.personaId);
  const prev = React.useRef(`${tenantId}|${personaId}`);
  React.useEffect(() => {
    const key = `${tenantId}|${personaId}`;
    if (prev.current === key) return;
    prev.current = key;
    qc.resetQueries({ predicate: (q) => !STATIC_KEYS.has(String(q.queryKey[0])) });
  }, [qc, tenantId, personaId]);
  return null;
}

function ThemeSync() {
  const theme = useSession((s) => s.theme);
  const tenant = useCurrentTenant();
  React.useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a1222" : "#f6f5f8");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", tenant.brand.primary);
    root.style.setProperty("--brand-hover", tenant.brand.primaryHover);
    root.dataset.tenant = tenant.id;
  }, [tenant]);
  return null;
}

const TOAST_TYPES = new Set(["token.minted", "order.rejected", "order.eligibility_review", "payment.confirmed", "approval.completed", "distribution.paid", "recon.break_detected", "trade.settled", "ledger.reconciled"]);

/** Subscribes to the platform event stream: feeds the notification centre, pulses rows, refreshes data. */
function EventBridge() {
  const qc = useQueryClient();
  const push = useEvents((s) => s.push);
  React.useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsub = api.events.subscribe((e: PlatformEvent) => {
      push(e);
      // No toast for a record the viewer is already watching (its detail page or the live confirmation screen).
      const path = window.location.pathname;
      const watching = (!!e.objectId && path.includes(e.objectId)) || (e.objectType === "Order" && path.replace(/\/$/, "").endsWith("/orders/new"));
      if (TOAST_TYPES.has(e.type) && !watching) {
        const fn = e.severity === "success" ? toast.success : e.severity === "warning" || e.severity === "critical" ? toast.warning : toast.info;
        fn(e.title, { description: e.detail, action: e.href ? { label: "View", onClick: () => window.location.assign(withBase(e.href!)) } : undefined });
      }
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => qc.invalidateQueries({ predicate: (q) => !STATIC_KEYS.has(String(q.queryKey[0])) }), 120);
    });
    return () => {
      unsub();
      if (pending) clearTimeout(pending);
    };
  }, [qc, push]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <TooltipProvider delayDuration={500} skipDelayDuration={300}>
        <ContextSync />
        <IdentityCacheReset />
        <ThemeSync />
        <EventBridge />
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-2 !font-sans",
              description: "!text-muted",
              actionButton: "!bg-brand !text-white",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
