"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog as DialogP } from "radix-ui";
import { Lock, ShieldOff, Network } from "lucide-react";
import { useSession } from "@/stores/session";
import { useCurrentTenant, usePersona } from "@/hooks/session";
import { cn } from "@/lib/utils";
import { MODULE_META, ROLE_META } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { SrhMark, SrhSplash } from "@/components/brand/srh-logo";
import { asset } from "@/lib/assets";
import { SidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { EXTRA_ROUTES, matchNav } from "./nav";

function useHydrated() {
  const [h, setH] = React.useState(false);
  React.useEffect(() => {
    if (useSession.persist.hasHydrated()) setH(true);
    return useSession.persist.onFinishHydration(() => setH(true));
  }, []);
  return h;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const signedIn = useSession((s) => s.signedIn);
  const collapsed = useSession((s) => s.sidebarCollapsed);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && !signedIn) router.replace("/");
  }, [hydrated, signedIn, router]);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  if (!hydrated || !signedIn) return <SrhSplash />;

  return (
    <CommandPalette>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-2">
        Skip to content
      </a>
      <div aria-hidden className="app-backdrop" />
      <div className="relative z-10 flex min-h-dvh">
        <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col bg-navy-2 transition-[width] duration-300 ease-[var(--ease-standard)] lg:flex", collapsed ? "w-[68px]" : "w-[260px]")}>
          <SidebarNav collapsed={collapsed} />
          <SidebarFooter collapsed={collapsed} />
        </aside>
        <DialogP.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogP.Portal>
            <DialogP.Overlay className="fixed inset-0 z-50 bg-[rgb(8_12_24/0.5)] lg:hidden" />
            <DialogP.Content className="fixed inset-y-0 left-0 z-50 flex w-[284px] max-w-[85vw] flex-col bg-navy-2 shadow-3 data-[state=open]:animate-[sheet-in-l_300ms_var(--ease-decel)] lg:hidden">
              <DialogP.Title className="sr-only">Navigation</DialogP.Title>
              <DialogP.Description className="sr-only">Primary navigation</DialogP.Description>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter collapsed={false} />
            </DialogP.Content>
          </DialogP.Portal>
        </DialogP.Root>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
          <HeadlessBanner />
          <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 pt-6 md:px-6 lg:px-8">
            <RouteGate>{children}</RouteGate>
          </main>
        </div>
      </div>
    </CommandPalette>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("border-t border-white/[0.06] px-4 py-3 text-[11px] text-navy-muted", collapsed && "px-2 text-center")}>
      {collapsed ? (
        <SrhMark size={24} className="mx-auto opacity-90" />
      ) : (
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/brand/srh-lockup-light.png")} alt="SRH Inc" className="h-6 w-auto opacity-90" />
          <span className="leading-tight">Tokenization OS<br />v0.9 · sandbox</span>
        </div>
      )}
    </div>
  );
}

function HeadlessBanner() {
  const tenant = useCurrentTenant();
  if (tenant.deploymentModel !== "headless" && tenant.deploymentModel !== "dedicated") return null;
  return (
    <div className="border-b border-info/20 bg-info-soft px-4 py-2 text-[12.5px] text-info md:px-8">
      <span className="inline-flex items-center gap-2">
        <Network className="size-3.5" />
        {tenant.deploymentModel === "headless"
          ? `${tenant.name} consumes SRH through APIs only. This is the SRH operator view of its API activity; ${tenant.shortName} customers never see this interface.`
          : `${tenant.name} runs a dedicated deployment: ${tenant.hosting}. Data residency: ${tenant.dataResidency}.`}
      </span>
    </div>
  );
}

/** Enforces module entitlements (regulation-aware platform) and role access per route. */
function RouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const persona = usePersona();
  const extra = EXTRA_ROUTES.find((r) => pathname.startsWith(r.prefix));
  const nav = matchNav(pathname);
  const moduleKey = extra?.module ?? nav?.module;
  const roles = extra?.roles ?? nav?.roles;

  if (roles && !roles.includes(persona.role)) {
    return (
      <EmptyState
        icon={<ShieldOff />}
        title={`Not available to the ${ROLE_META[persona.role].label} role`}
        description="Access is controlled by role and attribute based policies. Switch persona from the account menu to explore this area."
        action={<Button asChild variant="secondary"><Link href={persona.role === "investor" ? "/home" : "/overview"}>Go to home</Link></Button>}
        className="py-24"
      />
    );
  }
  if (moduleKey && !tenant.modules.includes(moduleKey)) {
    return (
      <EmptyState
        icon={<Lock />}
        title={`${MODULE_META[moduleKey].label} is not enabled for ${tenant.name}`}
        description={`${MODULE_META[moduleKey].description}. Modules are licensed independently, so each customer deploys only what it needs. A platform admin can enable it under Tenant & licences.`}
        action={<Button asChild variant="secondary"><Link href="/platform">Review module entitlements</Link></Button>}
        className="py-24"
      />
    );
  }
  return <>{children}</>;
}
