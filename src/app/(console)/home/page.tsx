"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowRightLeft, ArrowUp, Banknote, CalendarClock, ChartLine, FileText, GraduationCap, Heart, LayoutGrid, RotateCcw, ShieldCheck, Sparkles, TrendingUp, Wallet, Workflow } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useHomeLayout, useInvestor, useOfferings, useOrders, useSaveHomeLayout, useTokenClasses, useUpdateInterests } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, Switch } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger, SheetContent } from "@/components/ui/overlays";
import { AssetCover, AssetThumb } from "@/components/domain/media";
import { Sparkline } from "@/components/domain/charts";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { StageBadge } from "@/components/domain/status";
import { NetworkField } from "@/components/domain/network-field";
import { IncomeTimeline } from "@/components/investor/income-timeline";
import { FlowStrip, type FlowStep } from "@/components/investor/flow-strip";
import { usePortfolio, usePortfolioInvestorId } from "@/components/investor/use-portfolio";
import { RiskMeter, VISIBILITY_META } from "@/components/assets/asset-panels";
import { VideoEmbed } from "@/components/assets/video";
import { DOCUMENT_KIND_LABEL, daysUntil } from "@/components/assets/meta";
import { recommend } from "@/lib/recommend";
import { RISK_META, RISK_ORDER } from "@/lib/risk";
import { TEMPLATE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const WIDGETS: Record<D.HomeWidgetKey, { label: string; description: string; icon: React.ElementType }> = {
  summary: { label: "Portfolio summary", description: "Value, gain and income due", icon: Wallet },
  recommended: { label: "Recommended for you", description: "Based on your interests and risk appetite", icon: Sparkles },
  income: { label: "Upcoming income", description: "Payments due on your units", icon: CalendarClock },
  activity: { label: "Orders in progress", description: "Subscriptions on their way to your wallet", icon: Workflow },
  markets: { label: "Prices", description: "Gold, Treasury bills and listed products", icon: ChartLine },
  watchlist: { label: "Opening soon", description: "Offerings you can register for", icon: Heart },
  documents: { label: "Latest documents", description: "Reports for products you hold", icon: FileText },
  learn: { label: "How it works", description: "From eligibility check to tokens in your wallet", icon: GraduationCap },
};
const DEFAULT: D.HomeLayout = { order: ["summary", "recommended", "income", "activity", "markets", "watchlist", "documents", "learn"], hidden: [] };

export default function InvestorHomePage() {
  const persona = usePersona();
  const investorId = usePortfolioInvestorId();
  const { data: saved, isPending } = useHomeLayout(investorId);
  const save = useSaveHomeLayout();
  const [layout, setLayout] = React.useState<D.HomeLayout>();
  const current = layout ?? saved ?? DEFAULT;
  const order = [...current.order, ...DEFAULT.order.filter((k) => !current.order.includes(k))];
  const visible = order.filter((k) => !current.hidden.includes(k));
  const update = (next: D.HomeLayout) => {
    setLayout(next);
    save.mutate({ investorId, layout: next });
  };
  const first = persona.role === "investor" ? persona.name.split(" ")[0] : "Ahmed";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${first}`}
        description={persona.role === "investor" && persona.organization !== "Individual" ? `Investing for ${persona.organization}` : "Your digital assets at a glance."}
        actions={<CustomiseSheet layout={{ order, hidden: current.hidden }} onChange={update} />}
      />
      {isPending && !layout ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Skeleton className="h-48 lg:col-span-2" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={<LayoutGrid />} title="Your home is empty" description="Choose the sections you want to see." action={<Button size="sm" onClick={() => update(DEFAULT)}>Show all sections</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {visible.map((k) => (
            <div key={k} className={cn("min-w-0", (k === "summary" || k === "recommended" || k === "learn") && "lg:col-span-2")}>
              <Widget k={k} investorId={investorId} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Widget({ k, investorId }: { k: D.HomeWidgetKey; investorId: string }) {
  switch (k) {
    case "summary": return <SummaryWidget investorId={investorId} />;
    case "recommended": return <RecommendedWidget investorId={investorId} />;
    case "income": return <IncomeWidget investorId={investorId} />;
    case "activity": return <ActivityWidget investorId={investorId} />;
    case "markets": return <MarketsWidget />;
    case "watchlist": return <OpeningSoonWidget />;
    case "documents": return <DocumentsWidget investorId={investorId} />;
    case "learn": return <LearnWidget />;
  }
}

/* -------------------------------- widgets -------------------------------- */

function SummaryWidget({ investorId }: { investorId: string }) {
  const { positions, totalUsd, costUsd, gainUsd, income, loading } = usePortfolio(investorId);
  const pct = costUsd ? (gainUsd / costUsd) * 100 : 0;
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy-2 text-white shadow-2">
      <NetworkField className="absolute inset-0 size-full opacity-40" density={24} linkDistance={110} />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,var(--navy-2)_35%,color-mix(in_oklab,var(--navy-2)_55%,transparent))]" />
      <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-navy-text"><Wallet className="size-4" /> Portfolio value</div>
          {loading ? <Skeleton className="mt-3 h-11 w-56 opacity-20" /> : <div className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.03em] tabular sm:text-[42px]">{fmt.money(totalUsd, "USD")}</div>}
          {!loading && positions.length > 0 && (
            <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium tabular", gainUsd >= 0 ? "bg-success/20 text-[color-mix(in_oklab,var(--success)_60%,white)]" : "bg-danger/20 text-white")}>
              <TrendingUp className="size-3.5" />{gainUsd >= 0 ? "+" : ""}{fmt.money(gainUsd, "USD")} · {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {[
            { l: "Products", v: String(positions.length) },
            { l: "Income paid", v: fmt.money(income.received, "USD", { compact: true }) },
            { l: "Income due", v: fmt.money(income.next12, "USD", { compact: true }) },
          ].map((x) => (
            <div key={x.l} className="min-w-[96px] rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10">
              <div className="text-[11.5px] text-navy-muted">{x.l}</div>
              <div className="text-[17px] font-semibold tabular">{loading ? "…" : x.v}</div>
            </div>
          ))}
          <Button asChild variant="primary"><Link href="/portfolio">Open portfolio <ArrowRight /></Link></Button>
        </div>
      </div>
    </section>
  );
}

function RecommendedWidget({ investorId }: { investorId: string }) {
  const { data: investor } = useInvestor(investorId);
  const { data: offerings } = useOfferings();
  const { data: assets } = useAssets();
  const { data: tokens } = useTokenClasses();
  const { positions } = usePortfolio(investorId);
  const held = React.useMemo(() => new Set(positions.map((p) => p.asset.id)), [positions]);
  const recs = offerings && assets ? recommend(investor, offerings, assets, held, 3) : undefined;
  return (
    <Card>
      <CardHeader icon={<Sparkles />} title="Recommended for you" description={investor?.interests ? `Based on your interest in ${investor.interests.assetTypes.slice(0, 3).map((t) => TEMPLATE_META[t].label.toLowerCase()).join(", ")} and a ${RISK_META[investor.interests.risk].label.toLowerCase()} risk appetite` : "Tell us what you are looking for to see better matches"} action={investor && <InterestsDialog investor={investor} />} />
      <CardBody>
        {!recs ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        ) : recs.length === 0 ? (
          <EmptyState icon={<Sparkles />} title="Nothing to suggest yet" description="New offerings that suit you will appear here." className="py-8" />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recs.map((r) => {
              const symbols = tokens?.filter((t) => t.assetId === r.asset.id).map((t) => t.symbol).join(" + ");
              return (
                <li key={r.offering.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-2">
                  <Link href={`/assets/${r.asset.id}`} className="relative block h-36">
                    <AssetCover asset={r.asset} overlay className="absolute inset-0 size-full" />
                    <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2 py-0.5 text-[11.5px] font-medium shadow-1">{TEMPLATE_META[r.asset.template].label}</span>
                    {symbols && <span className="absolute right-3 top-3 rounded-md bg-black/45 px-1.5 py-0.5 font-mono text-[11px] text-white backdrop-blur">{symbols}</span>}
                  </Link>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div>
                      <h3 className="text-[14.5px] font-semibold leading-snug">{r.asset.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                        <span className="tabular">{r.asset.income.targetYieldPct ? `${fmt.pct(r.asset.income.targetYieldPct, 2)} target` : "Value follows the underlying"}</span>
                        <RiskMeter risk={r.asset.riskProfile} />
                      </div>
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {r.reasons.map((x) => <li key={x}><Badge tone={x.startsWith("You already") ? "neutral" : "brand"}>{x}</Badge></li>)}
                    </ul>
                    <div className="mt-auto flex gap-2 pt-1">
                      <Button asChild size="sm" variant="secondary"><Link href={`/assets/${r.asset.id}`}>Details</Link></Button>
                      {r.offering.status === "open" ? (
                        <Button asChild size="sm" variant="primary" className="flex-1"><Link href={`/orders/new?offering=${r.offering.id}`}>Invest from {fmt.money(r.offering.minTicket, r.offering.currency, { compact: true })}</Link></Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="flex-1" disabled>Opens in {daysUntil(r.offering.opensAt)} days</Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

const INTEREST_TYPES: D.AssetTemplate[] = ["real-estate", "spv-shares", "treasury-fund", "commodity", "sukuk", "bond", "private-credit", "private-equity", "infrastructure"];
const REGIONS = ["GCC", "United Kingdom", "Europe", "Asia", "Global"];

function InterestsDialog({ investor }: { investor: D.Investor }) {
  const m = useUpdateInterests();
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState<D.InvestorInterests>(investor.interests ?? { assetTypes: [], regions: [], risk: "medium", goal: "income" });
  const toggle = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const chip = (on: boolean) => cn("h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors", on ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface hover:bg-surface-2");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(investor.interests ?? { assetTypes: [], regions: [], risk: "medium", goal: "income" }); }}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Heart /> Your interests</Button>
      <DialogContent size="md" title="Your interests" description="Used to order recommendations. It does not change what you are eligible for."
        footer={<><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button variant="primary" isLoading={m.isPending} onClick={() => m.mutate({ investorId: investor.id, interests: v }, { onSuccess: () => setOpen(false) })}>Save</Button></>}>
        <div className="flex flex-col gap-5">
          <fieldset><legend className="mb-2 text-[12.5px] font-medium">Products</legend>
            <div className="flex flex-wrap gap-1.5">{INTEREST_TYPES.map((t) => <button key={t} type="button" aria-pressed={v.assetTypes.includes(t)} className={chip(v.assetTypes.includes(t))} onClick={() => setV({ ...v, assetTypes: toggle(v.assetTypes, t) })}>{TEMPLATE_META[t].label}</button>)}</div>
          </fieldset>
          <fieldset><legend className="mb-2 text-[12.5px] font-medium">Risk appetite</legend>
            <div className="flex flex-wrap gap-1.5">{RISK_ORDER.map((r) => <button key={r} type="button" role="radio" aria-checked={v.risk === r} className={chip(v.risk === r)} onClick={() => setV({ ...v, risk: r })}>{RISK_META[r].label}</button>)}</div>
          </fieldset>
          <fieldset><legend className="mb-2 text-[12.5px] font-medium">Main goal</legend>
            <div className="flex flex-wrap gap-1.5">{(["income", "growth", "preservation"] as const).map((g) => <button key={g} type="button" role="radio" aria-checked={v.goal === g} className={chip(v.goal === g)} onClick={() => setV({ ...v, goal: g })}>{fmt.sentence(g)}</button>)}</div>
          </fieldset>
          <fieldset><legend className="mb-2 text-[12.5px] font-medium">Regions</legend>
            <div className="flex flex-wrap gap-1.5">{REGIONS.map((r) => <button key={r} type="button" aria-pressed={v.regions.includes(r)} className={chip(v.regions.includes(r))} onClick={() => setV({ ...v, regions: toggle(v.regions, r) })}>{r}</button>)}</div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncomeWidget({ investorId }: { investorId: string }) {
  const { income, loading, distributionsLoaded } = usePortfolio(investorId);
  return (
    <Card className="h-full">
      <CardHeader icon={<CalendarClock />} title="Upcoming income" description="Estimated for your units" />
      <div className="px-5 pb-6 pt-2">
        {loading || !distributionsLoaded ? <Skeleton className="h-24" /> : income.upcoming.length === 0 ? (
          <EmptyState icon={<Banknote />} title="No payments scheduled" description="Accumulating products add income to their value instead." className="py-6" />
        ) : <IncomeTimeline events={income.upcoming} />}
      </div>
    </Card>
  );
}

function ActivityWidget({ investorId }: { investorId: string }) {
  const { data, isPending } = useOrders();
  const { data: assets } = useAssets();
  const pending = (data ?? []).filter((o) => o.investorId === investorId && ["active", "exception", "manual-review"].includes(o.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Card className="h-full">
      <CardHeader icon={<Workflow />} title="Orders in progress" action={<Button asChild variant="ghost" size="sm"><Link href="/orders">All orders</Link></Button>} />
      {isPending ? <div className="flex flex-col gap-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : pending.length === 0 ? (
        <EmptyState icon={<Workflow />} title="Nothing in progress" description="New subscriptions show here until tokens reach your wallet." className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {pending.slice(0, 4).map((o) => {
            const a = assets?.find((x) => x.id === o.assetId);
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  {a ? <AssetThumb asset={a} className="size-10 rounded-xl" /> : <Skeleton className="size-10 rounded-xl" />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-[13.5px] font-medium">{a?.shortName ?? o.assetId}</span><span className="shrink-0 text-[13px] font-semibold tabular">{fmt.money(o.amount, o.currency, { compact: o.amount >= 1e5 })}</span></span>
                    <span className="mt-1 flex items-center justify-between gap-2"><LifecycleRail order={o} variant="compact" /><StageBadge stage={o.stage} status={o.status} /></span>
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

function MarketsWidget() {
  const { data: assets } = useAssets();
  const rows = (assets ?? []).filter((a) => ["ast_vgld", "ast_tbill", "ast_ads", "ast_acred"].includes(a.id) && a.navHistory.length > 2);
  return (
    <Card className="h-full">
      <CardHeader icon={<ChartLine />} title="Prices" description="Latest values and the last year" />
      {!assets ? <div className="p-4"><Skeleton className="h-40" /></div> : (
        <ul className="divide-y divide-border">
          {rows.map((a) => {
            const h = a.navHistory;
            const first = h[0].nav, last = h[h.length - 1].nav;
            const ch = ((last - first) / first) * 100;
            return (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{a.id === "ast_vgld" ? "Gold, per gram" : a.shortName}</span>
                    <span className="block text-[12px] text-muted">{a.id === "ast_tbill" ? `Yield ${fmt.pct(a.income.targetYieldPct, 2)}` : TEMPLATE_META[a.template].label}</span>
                  </span>
                  <Sparkline data={h} height={32} color={ch >= 0 ? "var(--success)" : "var(--danger)"} />
                  <span className="text-right">
                    <span className="block text-[13.5px] font-semibold tabular">{fmt.money(last, a.valuation.currency, { digits: last < 10 ? 4 : 2 })}</span>
                    <span className={cn("inline-flex items-center gap-0.5 text-[12px] tabular", ch >= 0 ? "text-success" : "text-danger")}>{ch >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{fmt.pct(Math.abs(ch), 1)}</span>
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

function OpeningSoonWidget() {
  const { data: offerings } = useOfferings();
  const { data: assets } = useAssets();
  const soon = (offerings ?? []).filter((o) => o.status === "upcoming" || (o.status === "open" && daysUntil(o.closesAt) <= 45 && o.type !== "continuous")).sort((a, b) => a.opensAt.localeCompare(b.opensAt)).slice(0, 4);
  return (
    <Card className="h-full">
      <CardHeader icon={<Heart />} title="Opening soon and closing soon" action={<Button asChild variant="ghost" size="sm"><Link href="/offerings">Marketplace</Link></Button>} />
      {!offerings ? <div className="p-4"><Skeleton className="h-32" /></div> : soon.length === 0 ? <EmptyState icon={<Heart />} title="Nothing scheduled" description="New offerings appear here first." className="py-8" /> : (
        <ul className="divide-y divide-border">
          {soon.map((o) => {
            const a = assets?.find((x) => x.id === o.assetId);
            const up = o.status === "upcoming";
            return (
              <li key={o.id}>
                <Link href={a ? `/assets/${a.id}` : "/offerings"} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  {a ? <AssetThumb asset={a} className="size-10 rounded-xl" /> : <Skeleton className="size-10 rounded-xl" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a?.name ?? o.name}</span><span className="block text-[12px] text-muted">From {fmt.money(o.minTicket, o.currency, { compact: true })}</span></span>
                  <Badge tone={up ? "info" : "warning"}>{up ? `Opens in ${daysUntil(o.opensAt)} days` : `Closes in ${daysUntil(o.closesAt)} days`}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function DocumentsWidget({ investorId }: { investorId: string }) {
  const { positions, loading } = usePortfolio(investorId);
  const docs = React.useMemo(() => {
    const seen = new Set<string>();
    return positions.flatMap((p) => (seen.has(p.asset.id) ? [] : (seen.add(p.asset.id), p.asset.documents.map((d) => ({ d, a: p.asset }))))).sort((x, y) => y.d.updatedAt.localeCompare(x.d.updatedAt)).slice(0, 5);
  }, [positions]);
  return (
    <Card className="h-full">
      <CardHeader icon={<FileText />} title="Latest documents" description="For products you hold" />
      {loading ? <div className="p-4"><Skeleton className="h-32" /></div> : docs.length === 0 ? <EmptyState icon={<FileText />} title="No documents yet" description="Reports for your products appear here." className="py-8" /> : (
        <ul className="divide-y divide-border">
          {docs.map(({ d, a }) => (
            <li key={d.id}>
              <Link href={`/assets/${a.id}?tab=documents`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted"><FileText className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{d.name}</span><span className="block truncate text-[12px] text-muted">{a.shortName} · {DOCUMENT_KIND_LABEL[d.kind]} · {fmt.date(d.updatedAt)}</span></span>
                <Badge tone={VISIBILITY_META[d.visibility ?? "holders"].tone}>{VISIBILITY_META[d.visibility ?? "holders"].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const STEPS: FlowStep[] = [
  { icon: ShieldCheck, label: "Eligibility check", tip: "Your profile is checked against the product and jurisdiction rules before any payment." },
  { icon: Banknote, label: "Pay by bank, card or stablecoin", tip: "Depending on the offering." },
  { icon: ArrowRightLeft, label: "Delivery versus payment", tip: "Cash and tokens settle together." },
  { icon: Wallet, label: "Tokens in your wallet", tip: "Recorded in the register and on-chain." },
];

function LearnWidget() {
  const { data: assets } = useAssets();
  const v = assets?.flatMap((a) => (a.media?.videos ?? []).map((x) => ({ ...x, a })))[0];
  return (
    <Card>
      <CardHeader icon={<GraduationCap />} title="How it works" />
      <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col gap-4">
          <FlowStrip steps={STEPS} className="sm:flex-col sm:items-stretch" />
          <p className="text-[13px] text-muted">Each product is a regulated security or fund unit held through a legal entity. The token is your record of ownership: it moves only between verified wallets and pays income to whoever holds it on the record date.</p>
        </div>
        {v ? <VideoEmbed youtubeId={v.youtubeId} title={v.title} source={v.source} /> : <div className="hidden lg:block" />}
      </CardBody>
    </Card>
  );
}

/* ------------------------------- customise ------------------------------- */

function CustomiseSheet({ layout, onChange }: { layout: D.HomeLayout; onChange: (l: D.HomeLayout) => void }) {
  const move = (k: D.HomeWidgetKey, dir: -1 | 1) => {
    const o = [...layout.order];
    const i = o.indexOf(k);
    const j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    onChange({ ...layout, order: o });
  };
  const toggle = (k: D.HomeWidgetKey, on: boolean) => onChange({ ...layout, hidden: on ? layout.hidden.filter((x) => x !== k) : [...layout.hidden, k] });
  return (
    <Dialog>
      <DialogTriggerButton />
      <SheetContent title="Customise home" description="Show, hide and reorder sections. Saved to your account." footer={<Button variant="ghost" onClick={() => onChange(DEFAULT)}><RotateCcw /> Reset to default</Button>}>
        <ul className="flex flex-col gap-2">
          {layout.order.map((k, i) => {
            const W = WIDGETS[k];
            const on = !layout.hidden.includes(k);
            return (
              <li key={k} className={cn("flex items-center gap-3 rounded-xl border border-border px-3 py-2.5", !on && "opacity-60")}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted"><W.icon className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{W.label}</span><span className="block truncate text-[12px] text-muted">{W.description}</span></span>
                <Button size="icon-sm" variant="ghost" aria-label={`Move ${W.label} up`} disabled={i === 0} onClick={() => move(k, -1)}><ArrowUp /></Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Move ${W.label} down`} disabled={i === layout.order.length - 1} onClick={() => move(k, 1)}><ArrowDown /></Button>
                <Switch label={`Show ${W.label}`} checked={on} onCheckedChange={(v) => toggle(k, v)} />
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Dialog>
  );
}

function DialogTriggerButton() {
  return (
    <DialogTrigger asChild>
      <Button variant="secondary"><LayoutGrid /> Customise</Button>
    </DialogTrigger>
  );
}
