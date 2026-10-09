"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Globe2, Layers, Search, ShieldCheck } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useIssuers, useJurisdictions } from "@/hooks/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Card, EmptyState, ErrorState, Input, KeyValue, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { AssetThumb } from "@/components/domain/media";
import { CompanyLogo, CompanyName } from "@/components/domain/logos";
import { MetricTile } from "@/components/visual/bits";
import { Money, StatusBadge } from "@/components/domain/status";
import { TEMPLATE_META } from "@/lib/constants";
import { fmt } from "@/lib/utils";

const ISSUER_TYPE: Record<D.Issuer["type"], string> = { spv: "SPV", fund: "Fund", corporate: "Corporate", trust: "Trust" };

export default function IssuersPage() {
  const { data, isPending, error, refetch } = useIssuers();
  const { data: jurisdictions } = useJurisdictions();
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<D.Issuer | null>(null);
  const jName = (c: D.JurisdictionCode) => jurisdictions?.find((j) => j.code === c);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return data?.filter((i) => !q || `${i.name} ${i.sponsor} ${i.registrationNumber} ${i.jurisdiction}`.toLowerCase().includes(q));
  }, [data, search]);

  const columns: Column<D.Issuer>[] = [
    {
      key: "name",
      header: "Issuer",
      sort: (i) => i.name,
      cell: (i) => (
        <span className="block max-w-[300px]"><CompanyName name={i.name} logo={i.logo} sub={ISSUER_TYPE[i.type]} size={32} /></span>
      ),
    },
    { key: "type", header: "Type", cell: (i) => ISSUER_TYPE[i.type], sort: (i) => i.type, hideBelow: "md" },
    { key: "jurisdiction", header: "Jurisdiction", cell: (i) => <span title={jName(i.jurisdiction)?.regulator}>{i.jurisdiction}</span>, sort: (i) => i.jurisdiction, hideBelow: "sm" },
    { key: "reg", header: "Registration number", cell: (i) => <span className="font-mono text-[12px] text-muted">{i.registrationNumber}</span>, hideBelow: "lg" },
    { key: "sponsor", header: "Sponsor", cell: (i) => <span className="block max-w-[220px]"><CompanyName name={i.sponsor} size={22} /></span>, sort: (i) => i.sponsor, hideBelow: "lg" },
    { key: "kyb", header: "KYB", cell: (i) => <StatusBadge status={i.kybStatus} />, sort: (i) => i.kybStatus },
    { key: "assets", header: "Products", align: "right", cell: (i) => i.assetsCount, sort: (i) => i.assetsCount, hideBelow: "sm" },
  ];

  return (
    <>
      <PageHeader title="Issuers" description="Entities that issue products. KYB is required before launch." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile icon={Building2} tone="info" label="Issuers" loading={isPending} value={data?.length ?? 0} />
        <MetricTile icon={ShieldCheck} label="KYB approved" loading={isPending} value={data?.filter((i) => i.kybStatus === "approved").length ?? 0} ring={{ value: data?.length ? (data.filter((i) => i.kybStatus === "approved").length / data.length) * 100 : 0, tone: "success" }} />
        <MetricTile icon={Globe2} tone="brand" label="Jurisdictions" loading={isPending} value={data ? new Set(data.map((i) => i.jurisdiction)).size : 0} />
        <MetricTile icon={Layers} tone="neutral" label="Products" loading={isPending} value={data?.reduce((s, i) => s + i.assetsCount, 0) ?? 0} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-muted">{data ? <><span className="font-medium text-foreground tabular">{rows?.length ?? 0}</span> of <span className="tabular">{data.length}</span> issuers</> : <Skeleton className="h-4 w-24" />}</div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search issuers" placeholder="Name, sponsor or number" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(i) => i.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={setSelected}
          defaultSort={{ key: "name", dir: "asc" }}
          caption="Issuers"
          empty={search ? { icon: <Building2 />, title: "No issuers match this search", description: "Search by issuer name, sponsor, jurisdiction or registration number.", action: <Button size="sm" onClick={() => setSearch("")}>Clear search</Button> } : { icon: <Building2 />, title: "No issuers yet", description: "Issuers are created when the first product is structured for them.", action: <Button asChild size="sm"><Link href="/assets/new">Structure asset</Link></Button> }}
        />
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        {selected && <IssuerSheet issuer={selected} regulator={jName(selected.jurisdiction)?.regulator} jurisdictionName={jName(selected.jurisdiction)?.name} />}
      </Dialog>
    </>
  );
}

function IssuerSheet({ issuer, regulator, jurisdictionName }: { issuer: D.Issuer; regulator?: string; jurisdictionName?: string }) {
  const { data: assets, isPending, error, refetch } = useAssets();
  const products = (assets ?? []).filter((a) => a.issuerId === issuer.id);
  return (
    <SheetContent
      title={<span className="flex items-center gap-3"><CompanyLogo name={issuer.name} logo={issuer.logo} size={40} /><span className="min-w-0">{issuer.name}</span></span>}
      description={<span className="flex flex-wrap items-center gap-2">{ISSUER_TYPE[issuer.type]} · {issuer.jurisdiction} <StatusBadge status={issuer.kybStatus} /></span>}
    >
      <div className="flex flex-col gap-6">
        <KeyValue
          items={[
            { label: "Jurisdiction", value: jurisdictionName ? `${jurisdictionName} (${issuer.jurisdiction})` : issuer.jurisdiction },
            { label: "Regulator", value: regulator ?? "Not recorded" },
            { label: "Registration number", value: <span className="font-mono text-[12.5px]">{issuer.registrationNumber}</span> },
            { label: "Legal form", value: ISSUER_TYPE[issuer.type] },
            { label: "Sponsor", value: <CompanyName name={issuer.sponsor} size={22} /> },
            { label: "Contact", value: <a className="hover:underline" href={`mailto:${issuer.contact}`}>{issuer.contact}</a> },
            { label: "KYB status", value: <StatusBadge status={issuer.kybStatus} /> },
            { label: "Onboarded", value: fmt.date(issuer.createdAt) },
          ]}
        />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold">Products</h3>
            {assets && <span className="text-[12.5px] text-muted tabular">{products.length}</span>}
          </div>
          {error && !assets ? (
            <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
          ) : isPending ? (
            <div className="flex flex-col gap-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : !products.length ? (
            <Card><EmptyState icon={<Layers />} title="No products for this tenant" description="Products from this issuer appear here once they are structured on this tenant." className="py-8" /></Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {products.map((a) => (
                <li key={a.id}>
                  <Link href={`/assets/${a.id}`} className="group flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-1">
                    <AssetThumb asset={a} className="h-[72px] w-20 rounded-none" />
                    <span className="min-w-0 flex-1 py-2">
                      <span className="block truncate text-[13.5px] font-medium">{a.name}</span>
                      <span className="block text-[12px] text-muted">{TEMPLATE_META[a.template].label} · {a.legalEntity.structure}</span>
                      <span className="mt-1 flex items-center gap-2"><StatusBadge status={a.status} /><span className="text-[12px] text-muted"><Money value={a.aum} currency={a.valuation.currency} compact /></span></span>
                    </span>
                    <ArrowUpRight className="mr-3 size-4 shrink-0 text-subtle transition-colors group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SheetContent>
  );
}
