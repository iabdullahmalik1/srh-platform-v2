"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Banknote, CalendarClock, Megaphone, Plus, Search, ShieldCheck, Wallet } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useIssuers, useOfferings, useTokenClasses } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { Card, EmptyState, ErrorState, Input, PageHeader, Progress, Segmented, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AssetThumb, FeatureCard } from "@/components/domain/media";
import { CompanyLogo } from "@/components/domain/logos";
import { Money, StatusBadge } from "@/components/domain/status";
import { TEMPLATE_META } from "@/lib/constants";
import { benefitLine } from "@/components/assets/template-media";
import { FlowStrip, type FlowStep } from "@/components/investor/flow-strip";
import { OfferingCard } from "@/components/investor/offering-card";
import { fmt } from "@/lib/utils";

const SETTLEMENT_LABEL: Record<D.Offering["settlement"], string> = { dvp: "DvP", atomic: "Atomic", async: "Asynchronous" };

export default function OfferingsPage() {
  const persona = usePersona();
  return persona.role === "investor" ? <Marketplace /> : (
    <React.Suspense>
      <StaffOfferings />
    </React.Suspense>
  );
}

/* ------------------------------- investor ------------------------------- */
type MarketFilter = "all" | "open" | "upcoming";

const HOW_IT_WORKS: FlowStep[] = [
  { icon: ShieldCheck, label: "Eligibility check", tip: "Your profile is checked against the product and jurisdiction rules before any payment is requested." },
  { icon: Banknote, label: "Pay by bank or stablecoin", tip: "Bank transfer, tokenised deposit or a regulated stablecoin, depending on the offering." },
  { icon: ArrowRightLeft, label: "Delivery versus payment", tip: "Cash and tokens settle together, so neither side is exposed." },
  { icon: Wallet, label: "Tokens in your wallet", tip: "Units are minted to your whitelisted wallet and recorded in the register." },
];

function Marketplace() {
  const { data: offerings, isPending, error, refetch } = useOfferings();
  const { data: assets } = useAssets();
  const { data: issuers } = useIssuers();
  const { data: tokens } = useTokenClasses();
  const [filter, setFilter] = React.useState<MarketFilter>("all");
  const assetOf = (id: string) => assets?.find((a) => a.id === id);
  const issuerOf = (a?: D.Asset) => (a ? issuers?.find((i) => i.id === a.issuerId) : undefined);
  const visible = React.useMemo(
    () => (offerings ?? []).filter((o) => o.status === "open" || o.status === "upcoming").sort((a, b) => (a.status === b.status ? new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime() : a.status === "open" ? -1 : 1)),
    [offerings],
  );
  const featured = visible.filter((o) => o.status === "open" && assetOf(o.assetId)?.media).slice(0, 3);
  const shown = visible.filter((o) => filter === "all" || o.status === filter);

  return (
    <>
      <PageHeader title="Marketplace" description="Offerings open now and opening soon." />
      {error && !offerings ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : isPending ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}</div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden"><Skeleton className="h-44 rounded-none" /><div className="flex flex-col gap-2 p-5"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="mt-3 h-14" /><Skeleton className="h-9" /></div></Card>
            ))}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <Card><EmptyState icon={<Megaphone />} title="No offerings are open right now" description="New offerings appear here when their window is scheduled." action={<Button asChild size="sm"><Link href="/orders">View my orders</Link></Button>} /></Card>
      ) : (
        <div className="flex flex-col gap-7">
          {featured.length >= 2 && (
            <section aria-label="Featured offerings" className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              {featured.map((o) => {
                const a = assetOf(o.assetId)!;
                const sponsor = issuerOf(a)?.sponsor ?? o.distributor;
                return (
                  <FeatureCard
                    key={o.id}
                    image={a.media!.gallery[1] ?? a.media!.cover}
                    title={benefitLine(a)}
                    href={`/orders/new?offering=${o.id}`}
                    cta={a.income.targetYieldPct ? `Subscribe · ${fmt.pct(a.income.targetYieldPct, 2)} target yield` : "Subscribe"}
                    logoName={sponsor}
                    eyebrow={sponsor}
                    className="w-[78%] shrink-0 snap-start sm:w-auto"
                  />
                );
              })}
            </section>
          )}

          <Card className="px-5 py-4">
            <FlowStrip steps={HOW_IT_WORKS} />
          </Card>

          <section aria-labelledby="all-h">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="all-h" className="text-[17px] font-semibold tracking-tight">All offerings</h2>
              <Segmented<MarketFilter>
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All", count: visible.length },
                  { value: "open", label: "Open", count: visible.filter((o) => o.status === "open").length },
                  { value: "upcoming", label: "Upcoming", count: visible.filter((o) => o.status === "upcoming").length },
                ]}
              />
            </div>
            {shown.length === 0 ? (
              <Card><EmptyState icon={<CalendarClock />} title="Nothing in this view" description="Switch to all offerings to see the full list." action={<Button size="sm" onClick={() => setFilter("all")}>Show all</Button>} /></Card>
            ) : (
              <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((o) => {
                  const a = assetOf(o.assetId);
                  return <OfferingCard key={o.id} offering={o} asset={a} issuer={issuerOf(a)} token={tokens?.filter((t) => t.assetId === o.assetId).map((t) => t.symbol).join(" + ")} />;
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

/* --------------------------------- staff -------------------------------- */
type Filter = "all" | "open" | "upcoming" | "closed" | "completed";

function StaffOfferings() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const persona = usePersona();
  const filter = (params.get("status") as Filter | null) ?? "all";
  const [search, setSearch] = React.useState("");
  const { data: offerings, isPending, error, refetch } = useOfferings();
  const { data: assets } = useAssets();
  const assetOf = React.useCallback((id: string) => assets?.find((a) => a.id === id), [assets]);

  const setFilter = (v: Filter) => {
    const next = new URLSearchParams(params.toString());
    if (v === "all") next.delete("status");
    else next.set("status", v);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const group = (o: D.Offering): Exclude<Filter, "all"> => (o.status === "allocating" ? "closed" : o.status);
  const counts = React.useMemo(() => {
    const o = offerings ?? [];
    return { all: o.length, open: o.filter((x) => group(x) === "open").length, upcoming: o.filter((x) => group(x) === "upcoming").length, closed: o.filter((x) => group(x) === "closed").length, completed: o.filter((x) => group(x) === "completed").length };
  }, [offerings]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (offerings ?? []).filter((o) => (filter === "all" || group(o) === filter) && (!q || `${o.name} ${assetOf(o.assetId)?.name ?? ""} ${o.distributor}`.toLowerCase().includes(q)));
  }, [offerings, filter, search, assetOf]);

  const columns: Column<D.Offering>[] = [
    {
      key: "name",
      header: "Offering",
      sort: (o) => o.name,
      cell: (o) => {
        const a = assetOf(o.assetId);
        return (
          <div className="flex min-w-0 items-center gap-3">
            {a ? <AssetThumb asset={a} /> : <Skeleton className="h-10 w-14 rounded-lg" />}
            <div className="min-w-0"><div className="max-w-[240px] truncate font-medium">{o.name}</div><div className="text-[12px] text-muted">{a ? TEMPLATE_META[a.template].label : ""} · {fmt.sentence(o.type)}</div></div>
          </div>
        );
      },
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} />, sort: (o) => o.status },
    { key: "price", header: "Price", align: "right", cell: (o) => <Money value={o.pricePerToken} currency={o.currency} digits={o.pricePerToken < 10 ? 4 : 2} />, sort: (o) => o.pricePerToken, hideBelow: "md" },
    {
      key: "raised",
      header: "Raised",
      cell: (o) => (
        <div className="w-40">
          <div className="mb-1 flex justify-between text-[12px] tabular"><span className="font-medium">{fmt.money(o.subscribed, o.currency, { compact: true })}</span><span className="text-muted">of {fmt.money(o.target, o.currency, { compact: true })}</span></div>
          <Progress value={o.target ? (o.subscribed / o.target) * 100 : 0} tone={o.subscribed >= o.target ? "success" : "brand"} />
        </div>
      ),
      sort: (o) => (o.target ? o.subscribed / o.target : 0),
    },
    { key: "investors", header: "Investors", align: "right", cell: (o) => fmt.num(o.investorsCount), sort: (o) => o.investorsCount, hideBelow: "md" },
    { key: "window", header: "Window", cell: (o) => <span className="text-muted">{fmt.date(o.opensAt)} to {fmt.date(o.closesAt)}</span>, sort: (o) => o.opensAt, hideBelow: "xl" },
    { key: "distributor", header: "Distributor", cell: (o) => <Tip content={o.distributor}><span tabIndex={0} className="inline-flex rounded-md"><CompanyLogo name={o.distributor} size={24} /></span></Tip>, sort: (o) => o.distributor, hideBelow: "xl" },
    { key: "settlement", header: "Settlement", cell: (o) => <span className="text-muted">{SETTLEMENT_LABEL[o.settlement]}</span>, hideBelow: "lg" },
  ];

  const open = offerings?.filter((o) => o.status === "open") ?? [];
  const avgSubscribed = open.length ? open.reduce((s, o) => s + (o.target ? o.subscribed / o.target : 0), 0) / open.length * 100 : 0;

  return (
    <>
      <PageHeader
        title="Offerings"
        description="Primary, follow-on and continuous offerings."
        actions={persona.role === "operations" && <Button asChild variant="primary"><Link href="/orders/new"><Plus /> New subscription</Link></Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Open now", v: isPending ? undefined : fmt.num(open.length) },
          { l: "Average raised to target", v: isPending ? undefined : fmt.pct(avgSubscribed, 0) },
          { l: "Upcoming", v: isPending ? undefined : fmt.num(counts.upcoming) },
          { l: "Investors subscribed", v: isPending ? undefined : fmt.num((offerings ?? []).reduce((s, o) => s + o.investorsCount, 0)) },
        ].map((s) => (
          <Card key={s.l} className="p-4">
            <div className="text-[12.5px] font-medium text-muted">{s.l}</div>
            {s.v === undefined ? <Skeleton className="mt-2.5 h-7 w-20" /> : <div className="mt-1.5 text-[22px] font-semibold tracking-tight tabular">{s.v}</div>}
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "open", label: "Open", count: counts.open },
              { value: "upcoming", label: "Upcoming", count: counts.upcoming },
              { value: "closed", label: "Closed or allocating", count: counts.closed },
              { value: "completed", label: "Completed", count: counts.completed },
            ]}
          />
          <div className="relative lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search offerings" placeholder="Offering, product or distributor" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={offerings ? rows : undefined}
          columns={columns}
          getRowId={(o) => o.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(o) => router.push(`/assets/${o.assetId}`)}
          defaultSort={{ key: "window", dir: "desc" }}
          caption="Offerings"
          empty={{ icon: <Megaphone />, title: "No offerings match", description: "Clear the status filter or search to see every offering.", action: <Button size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Button> }}
        />
      </Card>
    </>
  );
}
