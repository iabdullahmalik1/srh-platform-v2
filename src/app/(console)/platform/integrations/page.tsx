"use client";

import * as React from "react";
import { Activity, Clock, Database, Globe, Plug, PlugZap, Fingerprint, Vault, Banknote, ChartCandlestick, UsersRound, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type * as D from "@/types/domain";
import { useProviders, useTestProvider } from "@/hooks/api";
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/status";
import { CompanyLogo } from "@/components/domain/logos";
import { SrhMark } from "@/components/brand/srh-logo";
import { useCan, useCurrentTenant } from "@/hooks/session";
import { IconTile, TenantLogo } from "@/components/visual/bits";
import { PROVIDER_ICON } from "@/components/visual/icons";
import { MODULE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const CATEGORY_META: Record<D.ProviderCategory, { label: string; description: string }> = {
  kyc: { label: "KYC", description: "Identity verification for individuals" },
  kyb: { label: "KYB and registries", description: "Company verification and official registry lookups" },
  aml: { label: "AML and sanctions", description: "Screening, PEP, adverse media and wallet analytics" },
  custody: { label: "Custody", description: "Qualified custodians, MPC and HSM signing" },
  banking: { label: "Banking", description: "Accounts, statements and cash confirmation" },
  payments: { label: "Payments", description: "Fiat rails, stablecoins and tokenised deposits" },
  oracle: { label: "Oracles", description: "NAV, pricing and proof of reserves" },
  market: { label: "Market infrastructure", description: "Venues, brokers and transfer agents" },
  blockchain: { label: "Blockchain", description: "Node providers, indexers and transaction relay" },
  tokenization: { label: "Tokenisation and transfer agency", description: "Token standards, issuance engines and registrars" },
};
const ORDER: D.ProviderCategory[] = ["kyc", "kyb", "aml", "custody", "tokenization", "banking", "payments", "oracle", "market", "blockchain"];

const DOMAINS: { domain: string; covers: string; iface: string; icon: LucideIcon; categories: D.ProviderCategory[] }[] = [
  { domain: "Identity and compliance", covers: "KYC, KYB, AML, sanctions, PEP, wallet risk", iface: "identity.verify", icon: Fingerprint, categories: ["kyc", "kyb", "aml"] },
  { domain: "Custody and wallets", covers: "Custodians, MPC wallets, HSM, signing policies", iface: "custody.sign", icon: Vault, categories: ["custody"] },
  { domain: "Payments and banking", covers: "Banks, payment processors, stablecoin and tokenised deposit rails", iface: "payments.instruct", icon: Banknote, categories: ["banking", "payments"] },
  { domain: "Market infrastructure", covers: "ATS and MTF venues, brokers, transfer agents, CSDs", iface: "markets.route", icon: ChartCandlestick, categories: ["market", "blockchain"] },
  { domain: "Data and oracles", covers: "NAV, reference prices, FX, proof of reserves", iface: "oracle.price", icon: Database, categories: ["oracle"] },
];

const STATUS_DOT: Record<D.Provider["status"], string> = { operational: "bg-success", degraded: "bg-warning", outage: "bg-danger", disabled: "bg-border-strong" };

export default function IntegrationsPage() {
  const { data, isPending, error, refetch } = useProviders();
  const groups = ORDER.map((c) => ({ c, items: (data ?? []).filter((p) => p.category === c) })).filter((g) => g.items.length > 0);
  const degraded = (data ?? []).filter((p) => p.status === "degraded" || p.status === "outage");

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Licensed providers behind stable interfaces. Each category also has a manual desk, so a country or case without an automated provider still goes through."
        actions={degraded.length > 0 && <Badge tone="warning" dot>{degraded.length} provider{degraded.length > 1 ? "s" : ""} need attention</Badge>}
      />
      <div className="flex flex-col gap-6">
        <Architecture providers={data} loading={isPending} />

        {error && !data ? (
          <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
        ) : isPending ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[230px] rounded-xl" />)}</div>
        ) : groups.length === 0 ? (
          <Card><EmptyState icon={<Plug />} title="No providers connected" description="Connect a provider adapter to start routing identity, payment or custody calls." /></Card>
        ) : (
          groups.map((g) => (
            <section key={g.c} aria-labelledby={`cat-${g.c}`}>
              <div className="mb-3 flex items-center gap-2.5">
                <IconTile icon={PROVIDER_ICON[g.c]} size="sm" />
                <h2 id={`cat-${g.c}`} className="text-[15px] font-semibold">{CATEGORY_META[g.c].label}</h2>
                <span className="hidden text-[12.5px] text-muted sm:inline">{CATEGORY_META[g.c].description}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...g.items].sort((a, b) => (a.mode === "manual" ? 1 : 0) - (b.mode === "manual" ? 1 : 0)).map((p) => <ProviderCard key={p.id} p={p} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

function ProviderCard({ p }: { p: D.Provider }) {
  const test = useTestProvider();
  const canTest = useCan("providers.test");
  const latencyTone = p.latencyMs > 1000 ? "text-danger" : p.latencyMs > 600 ? "text-warning" : "text-foreground";
  const manual = p.mode === "manual";
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {manual ? <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-muted"><UsersRound className="size-5" /></span> : <CompanyLogo name={p.name} logo={p.logo} size={40} />}
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold">{p.name}</h3>
            <div className="mt-0.5 truncate text-[12px] text-muted">{p.service ?? p.adapter}</div>
          </div>
        </div>
        {manual ? <Badge tone="info">Manual</Badge> : <StatusBadge status={p.status} />}
      </div>
      <CardBody className="flex flex-1 flex-col gap-3.5 pt-3.5">
        <dl className="grid grid-cols-3 gap-3 text-[12px]">
          {manual ? (
            <>
              <div><dt className="text-muted">Turnaround</dt><dd className="mt-0.5 text-[15px] font-semibold">Same day</dd></div>
              <div><dt className="text-muted">Handled by</dt><dd className="mt-0.5 text-[13px] font-medium">Staff queue</dd></div>
            </>
          ) : (
            <>
              <div><dt className="text-muted">Latency</dt><dd className={cn("mt-0.5 text-[15px] font-semibold tabular", latencyTone)}>{p.latencyMs} ms</dd></div>
              <div><dt className="text-muted">Uptime</dt><dd className="mt-0.5 text-[15px] font-semibold tabular">{p.uptimePct.toFixed(2)}%</dd></div>
            </>
          )}
          <div className="min-w-0"><dt className="text-muted">Region</dt><dd className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-medium"><Globe className="size-3.5 shrink-0 text-subtle" />{p.region}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {p.usedBy.map((m) => <Badge key={m} tone="outline">{MODULE_META[m].label}</Badge>)}
          {p.coverage?.slice(0, 4).map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            {test.data && !test.isPending ? <><Activity className="size-3.5 text-success" /> Responded in {test.data.latencyMs} ms</> : <><Clock className="size-3.5" /> Synced {fmt.relative(p.lastSyncAt)}</>}
          </span>
          {manual ? (
            <span className="text-[12px] text-muted">Used where no automated provider covers the case</span>
          ) : canTest ? (
            <Button size="sm" variant="secondary" isLoading={test.isPending} loadingText="Testing…" onClick={() => test.mutate(p.id)}><PlugZap /> Test connection</Button>
          ) : (
            <Tip content="Testing a connection needs the Operations or Platform admin role."><span tabIndex={0} className="inline-flex rounded-lg"><Button size="sm" variant="secondary" disabled><PlugZap /> Test connection</Button></span></Tip>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------ architecture ------------------------------ */
function Architecture({ providers, loading }: { providers?: D.Provider[]; loading: boolean }) {
  const tenant = useCurrentTenant();
  const reduce = useReducedMotion();
  return (
    <Card>
      <CardHeader icon={<Plug />} title="Integration architecture" description="Workflows call internal interfaces; adapters translate per provider" />
      <div className="flex flex-col items-center gap-0 p-4 md:p-6">
        <div className="flex w-full max-w-xl flex-col items-stretch gap-0 sm:flex-row sm:items-center sm:justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-navy-4 bg-navy-2 px-3.5 py-2.5 text-white sm:flex-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white"><SrhMark size={24} /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">Platform workflows</span>
              <span className="flex items-center gap-1.5 truncate text-[11.5px] text-navy-text"><TenantLogo tenant={tenant} size={14} /> {tenant.shortName}</span>
            </span>
          </div>
          <Bus vertical className="h-5 sm:hidden" reduce={!!reduce} />
          <Bus className="hidden w-10 sm:block" reduce={!!reduce} />
          <div className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-3.5 py-2.5 sm:flex-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white"><Plug className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold">Adapter layer</span>
              <span className="block truncate text-[11.5px] text-muted">{providers ? `${providers.length} adapters` : "Adapters"} · stable interfaces</span>
            </span>
          </div>
        </div>
        <Bus vertical className="h-6" reduce={!!reduce} />
        <div className="relative w-full">
          <span aria-hidden className="absolute inset-x-[10%] top-0 hidden h-px bg-border-strong xl:block" />
          <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:pt-5">
            {DOMAINS.map((d, i) => {
              const items = (providers ?? []).filter((p) => d.categories.includes(p.category));
              return (
                <motion.li
                  key={d.domain}
                  className="relative flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : 0.1 + i * 0.06, ease: [0.2, 0, 0, 1] }}
                >
                  <span aria-hidden className="absolute -top-5 left-1/2 hidden h-5 w-px bg-border-strong xl:block" />
                  <div className="flex items-start gap-2.5">
                    <IconTile icon={d.icon} size="sm" className="bg-surface shadow-1" />
                    <Tip content={d.covers}>
                      <span tabIndex={0} className="min-w-0">
                        <span className="block text-[12.5px] font-semibold leading-tight">{d.domain}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">{d.iface}</span>
                      </span>
                    </Tip>
                  </div>
                  {loading ? (
                    <Skeleton className="h-9" />
                  ) : items.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {items.filter((p) => p.mode !== "manual").map((p) => (
                        <li key={p.id}>
                          <Tip content={`${p.name} · ${fmt.sentence(p.status)} · ${p.latencyMs} ms`}>
                            <span tabIndex={0} className="relative inline-block rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <CompanyLogo name={p.name} logo={p.logo} size={34} />
                              <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface-2", STATUS_DOT[p.status])} aria-label={p.status} />
                            </span>
                          </Tip>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[12px] text-muted">No provider connected</span>
                  )}
                  <span className="mt-auto text-[11.5px] text-muted tabular">{items.length} connected</span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Bus({ vertical, className, reduce }: { vertical?: boolean; className?: string; reduce: boolean }) {
  return (
    <span aria-hidden className={cn("relative flex shrink-0 items-center justify-center", className)}>
      <span className={cn("absolute bg-border-strong", vertical ? "inset-y-0 left-1/2 w-px" : "inset-x-0 top-1/2 h-px")} />
      {!reduce && (
        <motion.span
          className="absolute size-1.5 rounded-full bg-brand"
          style={vertical ? { left: "calc(50% - 3px)" } : { top: "calc(50% - 3px)" }}
          animate={vertical ? { top: ["0%", "85%"], opacity: [0, 1, 0] } : { left: ["0%", "85%"], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  );
}
