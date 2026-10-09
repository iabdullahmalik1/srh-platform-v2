"use client";
import { RiskMeter } from "@/components/assets/asset-panels";
import { RISK_ORDER } from "@/lib/risk";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Layers, List, MapPin, PackagePlus, Percent, Search, Users, Wallet } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useIssuers, useTokenClasses } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Card, EmptyState, ErrorState, Input, NativeSelect, PageHeader, Segmented, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AssetCover, AssetThumb } from "@/components/domain/media";
import { CompanyLogo } from "@/components/domain/logos";
import { Money, StatusBadge } from "@/components/domain/status";
import { ChainGlyphs } from "@/components/assets/chain-glyphs";
import { TEMPLATE_META } from "@/lib/constants";
import { statusGroup, type StatusGroup } from "@/components/assets/meta";
import { fmt } from "@/lib/utils";

type View = "grid" | "table";

function AssetRegistry() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canWrite = useCan("assets.write");
  const status = (params.get("status") as StatusGroup | null) ?? "all";
  const template = (params.get("template") as D.AssetTemplate | null) ?? "";
  const view = (params.get("view") as View | null) ?? "grid";
  const [search, setSearch] = React.useState("");

  const { data: assets, isPending, error, refetch } = useAssets();
  const { data: tokens } = useTokenClasses();
  const { data: issuers } = useIssuers();
  const issuerOf = React.useCallback((a: D.Asset) => issuers?.find((i) => i.id === a.issuerId), [issuers]);

  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const chainsFor = React.useCallback((a: D.Asset) => {
    const set = new Set<D.Chain>();
    tokens?.filter((t) => t.assetId === a.id).forEach((t) => t.deployments.forEach((d) => set.add(d.chain)));
    return [...set];
  }, [tokens]);

  const counts = React.useMemo(() => {
    const a = assets ?? [];
    return {
      all: a.length,
      live: a.filter((x) => statusGroup(x.status) === "live").length,
      review: a.filter((x) => statusGroup(x.status) === "review").length,
      draft: a.filter((x) => statusGroup(x.status) === "draft").length,
    };
  }, [assets]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assets ?? []).filter((a) => {
      if (status !== "all" && statusGroup(a.status) !== status) return false;
      if (template && a.template !== template) return false;
      if (q && !`${a.name} ${a.shortName} ${a.id} ${a.legalEntity.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, status, template, search]);

  const clear = () => {
    setSearch("");
    router.replace(view === "table" ? `${pathname}?view=table` : pathname);
  };

  const columns: Column<D.Asset>[] = [
    {
      key: "name",
      header: "Product",
      sort: (a) => a.name,
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-3">
          <AssetThumb asset={a} />
          <div className="min-w-0">
            <div className="max-w-[280px] truncate font-medium">{a.name}</div>
            <div className="text-[12px] text-muted">{TEMPLATE_META[a.template].label}</div>
          </div>
        </div>
      ),
    },
    { key: "issuer", header: "Sponsor", cell: (a) => { const i = issuerOf(a); return i ? <Tip content={i.name}><span tabIndex={0} className="inline-flex max-w-[200px] items-center gap-2 rounded-md"><CompanyLogo name={i.sponsor} size={22} /><span className="truncate text-[12.5px] text-muted">{i.sponsor}</span></span></Tip> : <span className="text-subtle">…</span>; }, sort: (a) => issuerOf(a)?.sponsor ?? "", hideBelow: "xl" },
    { key: "jurisdiction", header: "Jurisdiction", cell: (a) => <span className="text-muted">{a.jurisdiction}</span>, sort: (a) => a.jurisdiction, hideBelow: "lg" },
    { key: "aum", header: "AUM", align: "right", cell: (a) => <Money value={a.aum} currency={a.valuation.currency} compact />, sort: (a) => a.aum },
    { key: "yield", header: "Target yield", align: "right", cell: (a) => (a.income.targetYieldPct ? fmt.pct(a.income.targetYieldPct, 2) : <span className="text-subtle">n/a</span>), sort: (a) => a.income.targetYieldPct, hideBelow: "md" },
    { key: "risk", header: "Risk", cell: (a) => <RiskMeter risk={a.riskProfile} />, sort: (a) => RISK_ORDER.indexOf(a.riskProfile ?? "medium"), hideBelow: "lg" },
    { key: "investors", header: "Investors", align: "right", cell: (a) => fmt.num(a.investorsCount), sort: (a) => a.investorsCount, hideBelow: "md" },
    { key: "chains", header: "Deployments", cell: (a) => <ChainGlyphs chains={chainsFor(a)} />, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} />, sort: (a) => a.status },
  ];

  return (
    <>
      <PageHeader
        title="Asset registry"
        description="Every product, from draft structure to live offering."
        actions={
          canWrite ? (
            <Button asChild variant="primary"><Link href="/assets/new"><PackagePlus /> Structure asset</Link></Button>
          ) : (
            <Tip content="Structuring products needs the Operations, Issuer admin or Platform admin role.">
              <span><Button variant="primary" disabled><PackagePlus /> Structure asset</Button></span>
            </Tip>
          )
        }
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented<StatusGroup>
            value={status}
            onChange={(v) => setParam("status", v === "all" ? undefined : v)}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "live", label: "Live", count: counts.live },
              { value: "review", label: "In review", count: counts.review },
              { value: "draft", label: "Draft or structuring", count: counts.draft },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input aria-label="Search products" placeholder="Product, entity or ID" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <NativeSelect aria-label="Filter by template" value={template} onChange={(e) => setParam("template", e.target.value || undefined)} className="sm:w-48">
              <option value="">All templates</option>
              {(Object.keys(TEMPLATE_META) as D.AssetTemplate[]).map((t) => <option key={t} value={t}>{TEMPLATE_META[t].label}</option>)}
            </NativeSelect>
            <Segmented<View>
              value={view}
              onChange={(v) => setParam("view", v === "grid" ? undefined : v)}
              options={[
                { value: "grid", label: <><LayoutGrid className="size-4" /><span className="sr-only">Card view</span></> },
                { value: "table", label: <><List className="size-4" /><span className="sr-only">Table view</span></> },
              ]}
              className="self-start sm:self-auto"
            />
          </div>
        </div>
      </Card>

      {view === "table" ? (
        <Card>
          <DataTable
            rows={assets ? filtered : undefined}
            columns={columns}
            getRowId={(a) => a.id}
            loading={isPending}
            error={error}
            onRetry={() => refetch()}
            onRowClick={(a) => router.push(`/assets/${a.id}`)}
            defaultSort={{ key: "aum", dir: "desc" }}
            caption="Products"
            empty={{ icon: <Layers />, title: "No products match these filters", description: "Clear the filters or structure a new product from a template.", action: <Button size="sm" onClick={clear}>Clear filters</Button> }}
          />
        </Card>
      ) : error && !assets ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-44 rounded-none" />
              <div className="flex flex-col gap-2 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="mt-2 h-10 w-full" /></div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Layers />} title="No products match these filters" description="Clear the filters or structure a new product from a template." action={<Button size="sm" onClick={clear}>Clear filters</Button>} />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.id}>
              <AssetCard asset={a} chains={chainsFor(a)} sponsor={issuerOf(a)?.sponsor} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AssetCard({ asset: a, chains, sponsor }: { asset: D.Asset; chains: D.Chain[]; sponsor?: string }) {
  const cur = a.valuation.currency;
  return (
    <Link
      href={`/assets/${a.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-1 transition-[box-shadow,transform,border-color] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative h-44">
        <AssetCover asset={a} overlay className="absolute inset-0 size-full" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-surface/95 shadow-1"><StatusBadge status={a.status} /></span>
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11.5px] font-medium text-white backdrop-blur-md">{TEMPLATE_META[a.template].label}</span>
        </div>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <h2 className="truncate text-[15.5px] font-semibold leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]" title={a.name}>{a.name}</h2>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-white/80"><MapPin className="size-3 shrink-0" />{a.underlying.location ?? a.jurisdiction}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <dl className="grid grid-cols-3 gap-2">
          {[
            { icon: Wallet, l: "AUM", v: a.aum ? fmt.money(a.aum, cur, { compact: true }) : "Pre-launch" },
            { icon: Percent, l: "Target yield", v: a.income.targetYieldPct ? fmt.pct(a.income.targetYieldPct, 2) : "In NAV" },
            { icon: Users, l: "Investors", v: fmt.num(a.investorsCount) },
          ].map((x) => (
            <div key={x.l} className="min-w-0 rounded-xl bg-surface-2 px-2.5 py-2">
              <dt className="flex items-center gap-1 text-[11px] text-muted"><x.icon className="size-3 shrink-0" /><span className="truncate">{x.l}</span></dt>
              <dd className="mt-0.5 truncate text-[14px] font-semibold tabular">{x.v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          {sponsor ? (
            <span className="flex min-w-0 items-center gap-2"><CompanyLogo name={sponsor} size={22} /><span className="truncate text-[12px] text-muted">{sponsor}</span></span>
          ) : <span />}
          {chains.length ? <ChainGlyphs chains={chains} /> : <span className="shrink-0 text-[12px] text-subtle">Not deployed</span>}
        </div>
      </div>
    </Link>
  );
}

export default function AssetsPage() {
  return (
    <React.Suspense>
      <AssetRegistry />
    </React.Suspense>
  );
}
