"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ListChecks, Siren, Scale, TriangleAlert, PackagePlus, ShoppingCart, Activity, Plug, Info, CircleCheck } from "lucide-react";
import { useApprovals, useAlerts, useBreaks, useDashboard, useOrders, useProviders, useRecentEvents } from "@/hooks/api";
import { useCurrentTenant, usePersona } from "@/hooks/session";
import { useEvents } from "@/stores/events";
import { PageHeader, Card, CardHeader, CardBody, Skeleton, ErrorState, Badge, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PipelineRail } from "@/components/domain/lifecycle-rail";
import { BarList, GroupedBars, TrendArea, SERIES } from "@/components/domain/charts";
import { NetworkField } from "@/components/domain/network-field";
import { EventRow } from "@/components/shell/notifications";
import { ChainBadge, LiveDot, StatusBadge } from "@/components/domain/status";
import { CompanyLogo, PersonAvatar } from "@/components/domain/logos";
import { AvatarStack, IconTile, TenantLogo, isSystemName } from "@/components/visual/bits";
import { PROVIDER_ICON } from "@/components/visual/icons";
import { CHAIN_META, TEMPLATE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function OverviewPage() {
  const { data, isPending, error, refetch } = useDashboard();
  const persona = usePersona();
  const tenant = useCurrentTenant();
  const router = useRouter();

  return (
    <>
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><TenantLogo tenant={tenant} size={18} /> {tenant.name} · {fmt.date(new Date().toISOString())}</span>}
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar name={persona.name} src={persona.avatar} size={40} className="ring-2 ring-surface shadow-1" />
            <span className="min-w-0">{greeting()}, {persona.name.split(" ")[0]}</span>
          </span>
        }
        description="Position, settlement pipeline and open decisions."
        actions={
          <>
            <Button asChild variant="secondary"><Link href="/assets/new"><PackagePlus /> Structure asset</Link></Button>
            {persona.role === "operations" && <Button asChild variant="primary"><Link href="/orders/new"><ShoppingCart /> New subscription</Link></Button>}
          </>
        }
      />

      {error && !data ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Position band: the page's one living background */}
          <section className="relative overflow-hidden rounded-2xl bg-navy-2 text-white shadow-2">
            <NetworkField className="absolute inset-0 size-full opacity-60" density={40} color="225, 37, 27" linkDistance={110} />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--navy-2)_30%,transparent)]" />
            <div className="relative grid grid-cols-1 gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-navy-text">
                    Assets under administration <LiveDot tone="brand" />
                  </div>
                  {isPending ? <Skeleton className="mt-3 h-12 w-56 opacity-20" /> : (
                    <div className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.03em] tabular md:text-[48px]">{fmt.money(data!.aumUsd, "USD", { compact: true })}</div>
                  )}
                  {!isPending && <div className="mt-2 text-[13px] text-navy-text"><span className="font-medium text-[#5fd3a8]">+{data!.aumChangePct}%</span> over 30 days · USD equivalent at current NAV</div>}
                </div>
                <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
                  {[
                    { l: "Live products", v: data?.liveAssets },
                    { l: "Verified investors", v: data ? `${data.verifiedInvestors}/${data.investors}` : undefined },
                    { l: "Settled, 30 days", v: data ? fmt.money(data.settledVolume30d, "USD", { compact: true }) : undefined },
                  ].map((s) => (
                    <div key={s.l}>
                      <dt className="text-[12px] text-navy-muted">{s.l}</dt>
                      <dd className="mt-1 text-[18px] font-semibold tabular">{s.v ?? <Skeleton className="h-6 w-14 opacity-20" />}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="min-w-0 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06] [--border:rgb(255_255_255/0.07)] [--subtle-foreground:#8090ad]">
                {isPending ? <Skeleton className="h-[200px] w-full opacity-10" /> : <TrendArea data={data!.aumSeries} dataKey="value" name="AUA" height={200} color="#ff5a4d" xFormat={(d) => new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(d))} />}
              </div>
            </div>
          </section>

          {/* Signature: settlement pipeline */}
          <Card>
            <CardHeader
              icon={<Activity />}
              title={<span className="inline-flex items-center gap-1.5">Settlement pipeline <Tip content="Order, payment, settlement and minting are separate, auditable states. Select a stage to open its orders."><Info className="size-3.5 text-subtle" tabIndex={0} aria-label="About the pipeline" /></Tip></span>}
              description="Orders in flight by stage"
              action={<Button asChild variant="ghost" size="sm"><Link href="/orders">Open lifecycle <ArrowUpRight /></Link></Button>}
            />
            <CardBody className="pt-6">
              {isPending ? <Skeleton className="h-20 w-full" /> : <PipelineRail pipeline={data!.pipeline} onSelect={(s) => router.push(`/orders?stage=${s}`)} />}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <AttentionCard />
            <Card className="xl:col-span-2">
              <CardHeader title="Subscription and secondary volume" description="Daily notional, 14 days, USD" />
              <CardBody>
                {isPending ? <Skeleton className="h-[240px]" /> : <GroupedBars data={data!.volumeSeries} series={[{ key: "primary", name: "Primary subscriptions" }, { key: "secondary", name: "Secondary trades" }]} height={220} />}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader title="AUA by asset class" description="Live products at current valuation" />
              <CardBody>
                {isPending ? <Skeleton className="h-40" /> : <BarList items={data!.aumByTemplate.map((x, i) => ({ key: x.template, label: TEMPLATE_META[x.template].label, value: x.value, color: SERIES[i % SERIES.length] }))} />}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Token value by chain" description="One canonical supply, many deployments" />
              <CardBody>
                {isPending ? <Skeleton className="h-40" /> : (
                  <BarList items={data!.supplyByChain.map((x) => ({ key: x.chain, label: <ChainBadge chain={x.chain} />, value: x.value, color: SERIES[(["ethereum", "polygon", "base", "solana", "avalanche"] as const).indexOf(x.chain)] ?? CHAIN_META[x.chain].color }))} />
                )}
              </CardBody>
            </Card>
            <EventFeedCard />
          </div>
          <ProviderStrip />
        </div>
      )}
    </>
  );
}

function AttentionCard() {
  const { data: approvals } = useApprovals({ filters: { status: "pending" } });
  const { data: alerts } = useAlerts();
  const { data: breaks } = useBreaks();
  const { data: orders } = useOrders();
  const exceptions = orders?.filter((o) => o.status === "exception" || o.status === "manual-review") ?? [];
  const openAlerts = alerts?.filter((a) => a.status === "open" || a.status === "escalated") ?? [];
  const openBreaks = breaks?.filter((b) => b.status !== "resolved") ?? [];
  const uniq = <T,>(xs: T[]) => [...new Set(xs)];
  const rows = [
    { href: "/approvals", icon: ListChecks, label: "Approvals waiting", n: approvals?.length, detail: approvals?.[0]?.title, parties: uniq((approvals ?? []).map((a) => a.requestedBy)).map((name) => ({ name, system: isSystemName(name) })) },
    { href: "/compliance/screening", icon: Siren, label: "Screening alerts", n: openAlerts.length, detail: openAlerts[0] ? `${openAlerts[0].investorName}: ${openAlerts[0].summary}` : undefined, urgent: openAlerts.some((a) => a.severity === "high"), parties: uniq(openAlerts.map((a) => a.investorName)).map((name) => ({ name })) },
    { href: "/registry/reconciliation", icon: Scale, label: "Reconciliation breaks", n: openBreaks.length, detail: openBreaks[0]?.description, urgent: openBreaks.some((b) => b.severity === "high"), parties: uniq(openBreaks.map((b) => b.assignee).filter((x): x is string => !!x)).map((name) => ({ name, type: "individual" as const })) },
    { href: "/orders?status=exception", icon: TriangleAlert, label: "Order exceptions", n: exceptions.length, detail: exceptions[0]?.exceptionReason, parties: uniq(exceptions.map((o) => o.investorName)).map((name) => ({ name })) },
  ];
  return (
    <Card>
      <CardHeader title="Needs a decision" description="Blocking settlement or exposing risk" />
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
              <IconTile icon={r.icon} tone={r.urgent ? "danger" : r.n ? "warning" : "neutral"} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  {r.label}
                  {r.urgent && <Badge tone="danger">High</Badge>}
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-2">
                  {r.n === undefined ? (
                    <span className="text-[12.5px] text-muted">Loading…</span>
                  ) : r.parties.length ? (
                    <>
                      <AvatarStack parties={r.parties} max={3} size={22} />
                      <span className="min-w-0 truncate text-[12px] text-muted">{r.detail}</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12.5px] text-success"><CircleCheck className="size-3.5" /> Clear</span>
                  )}
                </span>
              </span>
              <span className="text-[20px] font-semibold tabular">{r.n ?? "…"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EventFeedCard() {
  const live = useEvents((s) => s.live);
  const { data } = useRecentEvents();
  const items = React.useMemo(() => {
    const seen = new Set<string>();
    return [...live, ...(data ?? [])].filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 7);
  }, [live, data]);
  return (
    <Card className="lg:col-span-2 xl:col-span-1">
      <CardHeader title={<span className="inline-flex items-center gap-2">Event stream <LiveDot /></span>} description="Every state change, as it happens" />
      <div className="p-1.5">{items.length ? items.map((e) => <EventRow key={e.id} e={e} compact />) : Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-2 h-11" />)}</div>
    </Card>
  );
}

function ProviderStrip() {
  const { data } = useProviders();
  const issues = (data ?? []).filter((p) => p.status !== "operational").length;
  return (
    <Card>
      <CardHeader
        icon={<Plug />}
        title="Provider adapters"
        description={data ? `${data.length - issues} of ${data.length} operational` : "Swappable behind stable interfaces"}
        action={<Button asChild variant="ghost" size="sm"><Link href="/platform/integrations">Integrations <ArrowUpRight /></Link></Button>}
      />
      <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {data ? data.slice(0, 8).map((p) => {
          const Icon = PROVIDER_ICON[p.category];
          return (
            <li key={p.id} className="flex min-w-0 items-center gap-3 bg-surface px-5 py-3">
              <span className="relative shrink-0">
                <CompanyLogo name={p.name} logo={p.logo} size={34} />
                <span aria-label={p.status} className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface", p.status === "operational" ? "bg-success" : p.status === "degraded" ? "bg-warning" : p.status === "outage" ? "bg-danger" : "bg-border-strong")} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" title={p.name}>{p.name}</div>
                <div className="truncate text-[12px] text-muted"><Icon className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />{p.category.length <= 3 ? p.category.toUpperCase() : fmt.sentence(p.category)} · <span className="tabular">{p.latencyMs} ms</span></div>
              </div>
              {p.status !== "operational" && <StatusBadge status={p.status} />}
            </li>
          );
        }) : Array.from({ length: 4 }).map((_, i) => <li key={i} className="bg-surface p-3"><Skeleton className="h-10" /></li>)}
      </ul>
    </Card>
  );
}
