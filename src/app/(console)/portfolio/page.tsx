"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Banknote, CalendarClock, Eye, Layers, Lock, Store, TrendingUp, Wallet, Workflow } from "lucide-react";
import { useAssets, useOrders } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { usePortfolio, usePortfolioInvestorId } from "@/components/investor/use-portfolio";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SERIES } from "@/components/domain/charts";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { NetworkField } from "@/components/domain/network-field";
import { AssetThumb } from "@/components/domain/media";
import { StageBadge } from "@/components/domain/status";
import { AllocationBar } from "@/components/investor/allocation-bar";
import { IncomeTimeline } from "@/components/investor/income-timeline";
import { PositionCard } from "@/components/investor/position-card";
import { cn, fmt } from "@/lib/utils";

export default function PortfolioPage() {
  const persona = usePersona();
  const investorView = persona.role === "investor";
  const investorId = usePortfolioInvestorId();
  const { positions, totalUsd, costUsd, gainUsd, income, distributionsLoaded, loading, error, retry } = usePortfolio(investorId);
  const holdingsQ = { data: loading ? undefined : positions };
  const distributions = distributionsLoaded;
  const gainPct = costUsd ? (gainUsd / costUsd) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Portfolio"
        description={investorView ? `${persona.organization !== "Individual" ? persona.organization + ". " : ""}Holdings at current value.` : "Investor portfolio, holdings at current value."}
        actions={<Button asChild variant="primary"><Link href="/offerings"><Store /> Browse the marketplace</Link></Button>}
      />
      {!investorView && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-info/25 bg-info-soft px-4 py-2.5 text-[13px] text-info">
          <Eye className="size-4 shrink-0" /> Previewing as Ahmed Al Mansoori
        </div>
      )}

      {error && !holdingsQ.data ? (
        <Card><ErrorState error={error} onRetry={retry} /></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl bg-navy-2 text-white shadow-2">
            <NetworkField className="absolute inset-0 size-full opacity-45" density={30} linkDistance={110} />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,var(--navy-2)_30%,color-mix(in_oklab,var(--navy-2)_55%,transparent))]" />
            <div className="relative grid grid-cols-1 gap-8 p-5 md:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
              <div className="flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-[13px] text-navy-text"><Wallet className="size-4" /> Portfolio value</div>
                  {loading ? <Skeleton className="mt-3 h-12 w-64 opacity-20" /> : (
                    <div className="mt-2 text-[36px] font-semibold leading-none tracking-[-0.03em] tabular sm:text-[46px]">{fmt.money(totalUsd, "USD")}</div>
                  )}
                  {!loading && positions.length > 0 && (
                    <Tip content="Unrealised, against cost basis, USD equivalent">
                      <span tabIndex={0} className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium tabular", gainUsd >= 0 ? "bg-success/20 text-[color-mix(in_oklab,var(--success)_60%,white)]" : "bg-danger/20 text-white")}>
                        <TrendingUp className="size-3.5" />{gainUsd >= 0 ? "+" : ""}{fmt.money(gainUsd, "USD")} · {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(2)}%
                      </span>
                    </Tip>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Banknote, l: "Income paid", v: fmt.money(income.received, "USD", { compact: true }) },
                    { icon: CalendarClock, l: "Income due", v: fmt.money(income.next12, "USD", { compact: true }) },
                    { icon: Layers, l: "Products", v: String(positions.length), extra: positions.some((p) => p.lockedUntil) ? <Lock className="size-3 text-navy-muted" /> : null },
                  ].map((x) => (
                    <div key={x.l} className="min-w-0 rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
                      <dt className="flex items-center gap-1.5 truncate text-[11.5px] text-navy-muted"><x.icon className="hidden size-3.5 shrink-0 sm:block" /><span className="truncate">{x.l}</span></dt>
                      <dd className="mt-1 flex items-center gap-1.5 text-[17px] font-semibold tabular sm:text-[19px]">{loading ? <Skeleton className="h-6 w-16 opacity-20" /> : x.v}{!loading && x.extra}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-col justify-end">
                <div className="mb-3 text-[13px] text-navy-text">Allocation</div>
                {loading ? <Skeleton className="h-24 opacity-20" /> : positions.length ? (
                  <AllocationBar items={positions.map((p, i) => ({ key: p.id, label: p.asset.name, value: p.usd, color: SERIES[i % SERIES.length] }))} />
                ) : (
                  <p className="text-[13px] text-navy-muted">Appears after your first investment.</p>
                )}
              </div>
            </div>
          </section>

          {/* Positions */}
          <section aria-labelledby="pos-h">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 id="pos-h" className="text-[17px] font-semibold tracking-tight">Positions</h2>
              <Link href="/markets" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground">Trade <ArrowUpRight className="size-3.5" /></Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[320px] rounded-2xl sm:col-span-2" />
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[320px] rounded-2xl" />)}
              </div>
            ) : positions.length === 0 ? (
              <Card><EmptyState icon={<Wallet />} title="No holdings yet" description="Tokens appear here once your first subscription is minted." action={<Button asChild size="sm" variant="primary"><Link href="/offerings">Browse the marketplace</Link></Button>} /></Card>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {positions.map((p, i) => (
                  <li key={p.id} className={cn("min-w-0", i === 0 && positions.length > 2 && "sm:col-span-2")}>
                    <PositionCard p={p} featured={i === 0 && positions.length > 2} href={`/markets?token=${p.h.tokenClassId}`} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Income and orders */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader icon={<CalendarClock />} title="Upcoming income" description="Estimated for your units" />
              <div className="px-5 pb-6 pt-2">
                {!distributions || loading ? <Skeleton className="h-24" /> : income.upcoming.length === 0 ? (
                  <EmptyState icon={<CalendarClock />} title="No payments scheduled" description="Accumulating products reinvest income into NAV." className="py-6" />
                ) : (
                  <IncomeTimeline events={income.upcoming} />
                )}
              </div>
            </Card>
            <PendingOrders investorId={investorId} />
          </div>

        </div>
      )}
    </>
  );
}

function PendingOrders({ investorId }: { investorId: string }) {
  const { data, isPending, error, refetch } = useOrders();
  const { data: assets } = useAssets();
  const pending = (data ?? []).filter((o) => o.investorId === investorId && (o.status === "active" || o.status === "exception" || o.status === "manual-review")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Card className="min-w-0">
      <CardHeader icon={<Workflow />} title="Orders in progress" action={<Button asChild variant="ghost" size="sm"><Link href="/orders">All orders <ArrowUpRight /></Link></Button>} />
      {error && !data ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? (
        <div className="flex flex-col gap-2 p-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : pending.length === 0 ? (
        <EmptyState icon={<Workflow />} title="No orders in progress" description="New subscriptions show here until tokens reach your wallet." className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {pending.slice(0, 4).map((o) => {
            const a = assets?.find((x) => x.id === o.assetId);
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
                  {a ? <AssetThumb asset={a} className="size-11 rounded-xl" /> : <Skeleton className="size-11 rounded-xl" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium">{a?.name ?? o.assetId}</span>
                      <span className="shrink-0 text-[13.5px] font-semibold tabular">{fmt.money(o.amount, o.currency, { compact: o.amount >= 1e5 })}</span>
                    </span>
                    <span className="mt-1.5 flex items-center justify-between gap-2">
                      <LifecycleRail order={o} variant="compact" />
                      <StageBadge stage={o.stage} status={o.status} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
