"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPLOYMENT_META } from "@/lib/constants";
import { useSession } from "@/stores/session";
import { useCurrentTenant, usePersona } from "@/hooks/session";
import { useApprovals, useAlerts, useBreaks, useOrders, useTenants } from "@/hooks/api";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/overlays";
import { CONSOLE_NAV, INVESTOR_NAV, matchNav, type NavItem } from "./nav";
import type { Tenant } from "@/types/domain";
import { SrhMark } from "@/components/brand/srh-logo";
import { CompanyLogo } from "@/components/domain/logos";

export function TenantMark({ tenant, size = 32 }: { tenant: Pick<Tenant, "id" | "brand" | "shortName" | "name">; size?: number }) {
  if (tenant.id === "tnt_srh") return <SrhMark size={size} />;
  return <CompanyLogo name={tenant.name} logo={tenant.brand.logo} size={size} />;
}

function TenantSwitcher({ collapsed }: { collapsed: boolean }) {
  const tenant = useCurrentTenant();
  const { data: tenants } = useTenants();
  const setTenant = useSession((s) => s.setTenant);
  const qc = useQueryClient();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-white/40", collapsed && "justify-center")} aria-label="Switch tenant">
          <TenantMark tenant={tenant} size={34} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-white">{tenant.name}</span>
                <span className="block truncate text-[11.5px] text-navy-muted">{DEPLOYMENT_META[tenant.deploymentModel].label}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-navy-muted" />
            </>
          )}
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-[300px]">
        <MenuLabel>Operate the platform as</MenuLabel>
        {(tenants ?? []).map((t) => (
          <MenuItem
            key={t.id}
            onSelect={() => {
              if (t.id === tenant.id) return;
              setTenant(t.id);
              qc.resetQueries({ predicate: (q) => !["tenants", "personas", "jurisdictions"].includes(String(q.queryKey[0])) });
            }}
            className="items-start py-2.5"
          >
            <TenantMark tenant={t} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-foreground">{t.name}</span>
              <span className="block text-[11.5px] leading-4 text-muted">{DEPLOYMENT_META[t.deploymentModel].description}</span>
            </span>
            {t.id === tenant.id && <Check className="mt-1 !text-brand" />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function useBadges(staff: boolean) {
  const { data: approvals } = useApprovals({ filters: { status: "pending" } }, staff);
  const { data: alerts } = useAlerts(undefined, staff);
  const { data: breaks } = useBreaks(staff);
  const { data: orders } = useOrders();
  return {
    approvals: approvals?.length ?? 0,
    alerts: alerts?.filter((a) => a.status === "open" || a.status === "escalated").length ?? 0,
    breaks: breaks?.filter((b) => b.status !== "resolved").length ?? 0,
    orders: orders?.filter((o) => o.status === "active" || o.status === "exception" || o.status === "manual-review").length ?? 0,
  };
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const persona = usePersona();
  const tenant = useCurrentTenant();
  const badges = useBadges(persona.role !== "investor");
  const groups = persona.role === "investor" ? INVESTOR_NAV : CONSOLE_NAV;
  const active = matchNav(pathname)?.href;

  return (
    <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col">
      <div className="px-2 pb-2 pt-3">
        <TenantSwitcher collapsed={collapsed} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin [scrollbar-color:var(--navy-4)_transparent]">
        {groups.map((g, gi) => {
          const items = g.items.filter((i) => !i.roles || i.roles.includes(persona.role));
          if (!items.length) return null;
          return (
            <div key={gi} className="mt-3 first:mt-1">
              {g.label && !collapsed && <div className="px-2.5 pb-1 pt-1 text-[11px] font-medium text-navy-muted/80">{g.label}</div>}
              {g.label && collapsed && <div className="mx-3 my-2 h-px bg-white/[0.07]" />}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={active === item.href} collapsed={collapsed} locked={!!item.module && !tenant.modules.includes(item.module)} count={item.badge ? badges[item.badge] : 0} onNavigate={onNavigate} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function NavLink({ item, active, collapsed, locked, count, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; locked: boolean; count: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-white/40",
          active ? "bg-white/[0.09] font-medium text-white" : "text-navy-text hover:bg-white/[0.05] hover:text-white",
          collapsed && "justify-center px-0",
          locked && "opacity-55",
        )}
      >
        {active && <span aria-hidden className="absolute left-0 top-2 h-5 w-[3px] rounded-r-full bg-brand" />}
        <Icon className={cn("size-[17px] shrink-0", active ? "text-white" : "text-navy-muted group-hover:text-navy-text")} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!collapsed && locked && <Lock className="size-3.5 text-navy-muted" aria-label="Module not licensed" />}
        {!collapsed && !locked && count > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular", item.badge === "alerts" || item.badge === "breaks" ? "bg-brand text-white" : "bg-white/10 text-navy-text")}>{count}</span>}
        {collapsed && !locked && count > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />}
      </Link>
    </li>
  );
}
