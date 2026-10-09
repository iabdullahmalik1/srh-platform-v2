"use client";

import * as React from "react";
import { Boxes, CircleCheck, Coins, Droplets, Gauge, Landmark, ListChecks, MapPinned, Moon, Pause, Percent, Play, Repeat, ShieldCheck, UserCheck, Users, Vault, Waves } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useDefiPositions, useSetDefiStatus, useTokenClasses } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Progress, Skeleton, Stat, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { ChainBadge, LiveDot, StatusBadge } from "@/components/domain/status";
import { CompanyLogo } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { FlowJoin, FlowLine } from "@/components/flows/flow";
import { cn, fmt, sum } from "@/lib/utils";

const KIND_META: Record<D.DefiPosition["kind"], { label: string; icon: React.ElementType }> = {
  lending: { label: "Lending", icon: Landmark },
  repo: { label: "Repo", icon: Repeat },
  amm: { label: "AMM", icon: Waves },
  vault: { label: "Vault", icon: Vault },
  collateral: { label: "Collateral", icon: Boxes },
};

const POLICY_CHECKS: { label: string; icon: React.ElementType }[] = [
  { label: "Investor whitelist", icon: ListChecks },
  { label: "Asset eligibility", icon: MapPinned },
  { label: "LTV limits", icon: Percent },
  { label: "Oracle health", icon: Gauge },
  { label: "Sharia overlay", icon: Moon },
];
const ORACLE = "Chainlink";

export default function DefiPage() {
  const { data, isPending, error, refetch } = useDefiPositions();
  const positions = data ?? [];
  const live = positions.filter((p) => p.status === "active");
  const utilised = live.filter((p) => p.tvlUsd > 0);
  const { data: assets } = useAssets();

  return (
    <>
      <PageHeader
        title="Permissioned DeFi gateway"
        description="Policy-checked access from tokenised assets to DeFi protocols."
      />
      <div className="flex flex-col gap-5">
        <GatewayDiagram positions={positions} loading={isPending} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total value locked" loading={isPending} value={fmt.money(sum(positions, (p) => p.tvlUsd), "USD", { compact: true })} sub="Across permitted protocols" icon={<Coins />} />
          <Stat label="Positions" loading={isPending} value={`${live.length} of ${positions.length}`} sub="Active" icon={<Droplets />} />
          <Stat label="Whitelisted investors" loading={isPending} value={fmt.num(sum(positions, (p) => p.whitelistedInvestors))} sub="Position-level whitelist entries" icon={<UserCheck />} />
          <Stat label="Average utilisation" loading={isPending} value={utilised.length ? fmt.pct(sum(utilised, (p) => p.utilizationPct) / utilised.length, 0) : "n/a"} sub="Active positions with liquidity" icon={<Gauge />} />
        </div>

        <section aria-labelledby="positions-heading">
          <h2 id="positions-heading" className="mb-3 text-[15px] font-semibold">Positions</h2>
          {error && !data ? (
            <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
          ) : isPending ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[300px] rounded-xl" />)}</div>
          ) : positions.length === 0 ? (
            <Card><EmptyState icon={<Droplets />} title="No DeFi positions for this tenant" description="Positions appear once the DeFi gateway module is enabled and a protocol is approved for an eligible tokenised asset." /></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {positions.map((p) => <PositionCard key={p.id} p={p} asset={assets?.find((a) => a.id === p.assetId)} />)}
            </div>
          )}
        </section>

        <ProofOfReserves />
      </div>
    </>
  );
}

/* ------------------------------- diagram ------------------------------- */
function GatewayDiagram({ positions, loading }: { positions: D.DefiPosition[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader icon={<ShieldCheck />} title="How the gateway works" description="Access is granted per investor, per asset and per protocol." />
      <CardBody>
        <div className="flex flex-col lg:flex-row lg:items-center">
          <div className="flex flex-col gap-2 lg:w-[210px] lg:shrink-0">
            <Node icon={<UserCheck />} title="Eligible investor" tip="KYC approved, whitelisted wallet and a permitted classification." />
            <Node icon={<Coins />} title="Eligible tokenised asset" tip="Approved for collateral or liquidity use by its policy pack." />
          </div>
          <FlowJoin />
          <div className="relative flex flex-col lg:w-[250px] lg:shrink-0">
            <div className="rounded-xl border border-brand/40 bg-brand-soft p-4">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-brand-ink"><ShieldCheck className="size-4" /> Permissioned gateway <LiveDot tone="brand" className="ml-auto" /></div>
              <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {POLICY_CHECKS.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-[12.5px] shadow-1"><c.icon className="size-3.5 shrink-0 text-muted" aria-hidden /><span className="truncate">{c.label}</span><CircleCheck className="ml-auto size-3.5 shrink-0 text-success" aria-label="Checked" /></li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-center">
              <FlowLine dir="y" tone="info" className="h-6" delay={0.6} />
              <Tip content="Prices, reserves and health factors are read from the oracle before every interaction.">
                <span tabIndex={0} className="inline-flex cursor-help items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-[12.5px] font-medium shadow-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <CompanyLogo name={ORACLE} size={22} className="rounded-full" />
                  {ORACLE}
                  <LiveDot />
                </span>
              </Tip>
            </div>
          </div>
          <FlowJoin delay={0.3} />
          <ul className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              : positions.map((p) => {
                  const M = KIND_META[p.kind];
                  const active = p.status === "active";
                  return (
                    <li key={p.id} className={cn("flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2", active ? "border-border bg-surface" : "border-dashed border-border-strong bg-surface-2")}>
                      <span className="relative shrink-0">
                        <CompanyLogo name={p.protocol} size={32} />
                        <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-surface text-muted shadow-1"><M.icon className="size-2.5" aria-hidden /></span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold" title={p.protocol}>{p.protocol}</span>
                        <span className="flex items-center gap-1.5 text-[11.5px] text-muted">{M.label}<span aria-hidden>·</span><span className="tabular">{fmt.money(p.tvlUsd, "USD", { compact: true })}</span></span>
                      </span>
                      <span className={cn("size-2 shrink-0 rounded-full", active ? "bg-success" : p.status === "paused" ? "bg-warning" : "bg-subtle")} aria-label={fmt.sentence(p.status)} title={fmt.sentence(p.status)} />
                    </li>
                  );
                })}
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}

function Node({ icon, title, tip }: { icon: React.ReactNode; title: string; tip: string }) {
  return (
    <Tip content={tip}>
      <div tabIndex={0} className="flex cursor-help items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-muted shadow-1 [&_svg]:size-4">{icon}</span>
        <span className="min-w-0 text-[13px] font-medium">{title}</span>
      </div>
    </Tip>
  );
}

/* ------------------------------- positions ----------------------------- */
function healthTone(h?: number) {
  if (h === undefined) return "text-muted";
  return h >= 1.5 ? "text-success" : h >= 1.2 ? "text-warning" : "text-danger";
}

function PositionCard({ p, asset }: { p: D.DefiPosition; asset?: D.Asset }) {
  const canConfigure = useCan("defi.configure");
  const setStatus = useSetDefiStatus();
  const [confirm, setConfirm] = React.useState(false);
  const M = KIND_META[p.kind];
  const active = p.status === "active";
  const run = (status: D.DefiPosition["status"]) => setStatus.mutate({ id: p.id, status }, { onSuccess: () => setConfirm(false) });

  const action = active ? (
    <Button size="sm" variant="secondary" disabled={!canConfigure} onClick={() => setConfirm(true)}><Pause /> Pause</Button>
  ) : (
    <Button size="sm" variant="primary" disabled={!canConfigure} isLoading={setStatus.isPending} loadingText="Activating…" onClick={() => run("active")}><Play /> Activate</Button>
  );

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="relative mt-0.5 shrink-0">
            <CompanyLogo name={p.protocol} size={36} />
            <span className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full bg-surface text-muted shadow-1"><M.icon className="size-3" aria-hidden /></span>
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold leading-5">{p.protocol}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone="outline">{M.label}</Badge>
              <span className="font-mono text-[12px] text-muted">{p.tokenSymbol}</span>
              <ChainBadge chain={p.chain} />
            </div>
          </div>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <CardBody className="flex flex-1 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
          <Metric label="TVL" value={fmt.money(p.tvlUsd, "USD", { compact: true })} />
          <Metric label="APY" value={fmt.pct(p.apyPct)} />
          <Metric label="Loan to value" value={p.ltvPct !== undefined ? fmt.pct(p.ltvPct, 0) : "n/a"} />
          <Metric label="Health factor" value={<span className={healthTone(p.healthFactor)}>{p.healthFactor !== undefined ? p.healthFactor.toFixed(2) : "n/a"}</span>} />
        </dl>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-muted">Utilisation</span>
            <span className="font-medium tabular">{fmt.pct(p.utilizationPct, 0)}</span>
          </div>
          <Progress value={p.utilizationPct} tone={p.utilizationPct >= 95 ? "warning" : "brand"} />
        </div>
        {asset && (
          <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-surface-2 p-2">
            <AssetThumb asset={asset} className="h-8 w-11 rounded-md" />
            <span className="min-w-0 truncate text-[12.5px] font-medium">{asset.name}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><Users className="size-3.5" aria-hidden /> <span className="tabular">{p.whitelistedInvestors}</span> whitelisted</span>
          <Tip content={`Oracle: ${p.oracle}`}><span tabIndex={0} className="inline-flex items-center gap-1.5"><CompanyLogo name={p.oracle} size={18} className="rounded-full" /><span className="max-w-[140px] truncate">{p.oracle}</span></span></Tip>
        </div>
        <div className="mt-auto flex justify-end border-t border-border pt-3">
          {canConfigure ? action : <Tip content="Changing a position needs the Platform admin role."><span tabIndex={0} className="inline-flex rounded-md">{action}</span></Tip>}
        </div>
      </CardBody>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          size="sm"
          title={`Pause ${p.protocol}?`}
          description="New deposits, borrows and swaps stop at the gateway. Existing positions stay in place and can be withdrawn."
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Keep active</Button></DialogClose>
              <Button variant="danger" isLoading={setStatus.isPending} loadingText="Pausing…" onClick={() => run("paused")}><Pause /> Pause position</Button>
            </>
          }
        />
      </Dialog>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular text-foreground">{value}</dd>
    </div>
  );
}

/* ---------------------------- proof of reserves ------------------------- */
const RESERVE_ASSETS = ["ast_vgld", "ast_tbill"];

function ProofOfReserves() {
  const { data: assets, isPending, error, refetch } = useAssets();
  const { data: tokens } = useTokenClasses();
  const items = (assets ?? []).filter((a) => RESERVE_ASSETS.includes(a.id));
  return (
    <Card>
      <CardHeader icon={<ShieldCheck />} title="Proof of reserves" description="Reserve value against tokens outstanding, attested by the oracle." />
      {error && !assets ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
      ) : items.length === 0 ? (
        <EmptyState title="No reserve-backed assets" description="Proof of reserves applies to commodity and treasury products. This tenant does not hold any yet." />
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {items.map((a) => {
            const tc = tokens?.find((t) => t.assetId === a.id);
            const outstanding = tc ? tc.canonicalSupply * a.valuation.navPerToken : undefined;
            const coverage = outstanding ? (a.valuation.nav / outstanding) * 100 : undefined;
            return (
              <div key={a.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetThumb asset={a} className="h-12 w-16" />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold">{a.name}</div>
                      <div className="truncate text-[12.5px] text-muted">{a.underlying.description}{a.underlying.location ? `, ${a.underlying.location}` : ""}</div>
                    </div>
                  </div>
                  {coverage !== undefined && <Badge tone={coverage >= 99.5 ? "success" : "warning"} dot>{coverage >= 99.5 ? "Fully backed" : "Coverage gap"}</Badge>}
                </div>
                {coverage !== undefined && <CoverageBar coverage={coverage} />}
                <dl className="grid grid-cols-3 gap-3 text-[12px]">
                  <Metric label="Reserve value" value={fmt.money(a.valuation.nav, a.valuation.currency, { compact: true })} />
                  <Metric label="Tokens outstanding" value={tc ? fmt.compact(tc.canonicalSupply) : "n/a"} />
                  <Metric label="Coverage" value={coverage !== undefined ? fmt.pct(coverage, 2) : "n/a"} />
                </dl>
                <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-surface-2 p-3 text-[12.5px] sm:grid-cols-2">
                  {a.underlying.metrics.map((m) => (
                    <li key={m.label} className="flex justify-between gap-3"><span className="text-muted">{m.label}</span><span className="font-medium tabular">{m.value}</span></li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
                  <span>{a.valuation.method} · {fmt.money(a.valuation.navPerToken, a.valuation.currency, { digits: 4 })} per token</span>
                  <span className="inline-flex items-center gap-1.5"><CompanyLogo name={a.valuation.oracle ?? a.underlying.appraiser ?? ORACLE} size={18} className="rounded-full" /> Attested {fmt.relative(a.valuation.lastUpdated)} <LiveDot /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Reserves against tokens outstanding, as two aligned bars. */
function CoverageBar({ coverage }: { coverage: number }) {
  const max = Math.max(100, coverage);
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={`Reserves cover ${fmt.pct(coverage, 2)} of tokens outstanding`}>
      {[
        { label: "Reserves", w: (coverage / max) * 100, cls: "bg-success" },
        { label: "Tokens", w: (100 / max) * 100, cls: "bg-brand" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-[11.5px] text-muted">
          <span className="w-14 shrink-0">{r.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3"><span className={cn("block h-full rounded-full", r.cls)} style={{ width: `${r.w}%` }} /></span>
        </div>
      ))}
    </div>
  );
}
