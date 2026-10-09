"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, Coins, Network, Search, Users } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useTokenClasses } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, Input, NativeSelect, PageHeader, Skeleton, Stat } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status";
import { ChainGlyphs } from "@/components/assets/chain-glyphs";
import { TOKEN_STANDARDS } from "@/components/assets/meta";
import { AssetThumb } from "@/components/domain/media";
import { TokenModelFlow } from "@/components/flows/token-model";
import { fmt, sum } from "@/lib/utils";

export default function TokensPage() {
  const router = useRouter();
  const { data: tokens, isPending, error, refetch } = useTokenClasses();
  const { data: assets } = useAssets();
  const canWrite = useCan("assets.write");
  const [search, setSearch] = React.useState("");
  const [standard, setStandard] = React.useState<D.TokenStandard | "">("");
  const assetOf = React.useCallback((id: string) => assets?.find((a) => a.id === id), [assets]);
  const assetName = React.useCallback((id: string) => assetOf(id)?.shortName, [assetOf]);
  const [exampleId, setExampleId] = React.useState<string>();
  const example = React.useMemo(() => {
    const t = tokens ?? [];
    return t.find((x) => x.id === exampleId) ?? [...t].sort((a, b) => b.deployments.length - a.deployments.length || b.canonicalSupply - a.canonicalSupply)[0];
  }, [tokens, exampleId]);

  const stats = React.useMemo(() => {
    const t = tokens ?? [];
    const deployments = t.flatMap((x) => x.deployments);
    return {
      classes: t.length,
      deployments: deployments.length,
      live: deployments.filter((d) => d.status === "live").length,
      holders: sum(deployments, (d) => d.holders),
      chains: new Set(deployments.map((d) => d.chain)).size,
    };
  }, [tokens]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tokens ?? []).filter((t) => (!standard || t.standard === standard) && (!q || `${t.symbol} ${t.name} ${t.id}`.toLowerCase().includes(q)));
  }, [tokens, search, standard]);

  const columns: Column<D.TokenClass>[] = [
    {
      key: "symbol",
      header: "Token class",
      sort: (t) => t.symbol,
      cell: (t) => (
        <div className="flex min-w-0 items-center gap-3">
          {assetOf(t.assetId) ? <AssetThumb asset={assetOf(t.assetId)!} className="h-9 w-12" /> : <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg bg-navy-2 font-mono text-[10.5px] font-semibold text-white">{t.symbol.slice(0, 4)}</span>}
          <div className="min-w-0">
            <div className="font-mono text-[13px] font-semibold">{t.symbol}</div>
            <div className="max-w-[260px] truncate text-[12px] text-muted">{assetName(t.assetId) ?? t.name}</div>
          </div>
        </div>
      ),
    },
    { key: "standard", header: "Standard", cell: (t) => <span className="text-muted">{t.standard}</span>, sort: (t) => t.standard, hideBelow: "md" },
    { key: "supply", header: "Canonical supply", align: "right", cell: (t) => fmt.num(t.canonicalSupply), sort: (t) => t.canonicalSupply },
    { key: "deployments", header: "Deployments", cell: (t) => <ChainGlyphs chains={t.deployments.map((d) => d.chain)} />, sort: (t) => t.deployments.length, hideBelow: "sm" },
    { key: "holders", header: "Holders", align: "right", cell: (t) => fmt.num(sum(t.deployments, (d) => d.holders)), sort: (t) => sum(t.deployments, (d) => d.holders), hideBelow: "md" },
    { key: "created", header: "Created", cell: (t) => <span className="text-muted">{fmt.date(t.createdAt)}</span>, sort: (t) => t.createdAt, hideBelow: "xl" },
    { key: "issuance", header: "Issuance", cell: (t) => (t.issuance ? <Badge tone={t.issuance.status === "verified" ? "success" : "warning"} dot>{t.issuance.status === "verified" ? "Verified" : `${t.issuance.checks.filter((c) => c.status !== "pending").length} of ${t.issuance.checks.length} checks`}</Badge> : <span className="text-subtle">n/a</span>), sort: (t) => t.issuance?.status ?? "", hideBelow: "lg" },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} />, sort: (t) => t.status },
  ];

  return (
    <>
      <PageHeader title="Token factory" description="Canonical token classes and their chain deployments." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Token classes" value={fmt.num(stats.classes)} loading={isPending} icon={<Coins />} />
        <Stat label="Deployments" value={fmt.num(stats.deployments)} sub={`${stats.live} live`} loading={isPending} icon={<Boxes />} />
        <Stat label="Holders" value={fmt.num(stats.holders)} sub="Wallet positions across chains" loading={isPending} icon={<Users />} />
        <Stat label="Chains" value={fmt.num(stats.chains)} loading={isPending} icon={<Network />} />
      </div>

      <Card className="mb-5">
        <CardHeader
          title="How tokens relate to products"
          description="The token represents the product. It is not the product."
          action={canWrite ? <Button variant="ghost" size="sm" onClick={() => router.push("/assets/new")}><span className="hidden sm:inline">Structure a product</span><span className="sm:hidden">New</span> <ArrowRight /></Button> : undefined}
        />
        <CardBody className="flex flex-col gap-3">
          {example ? <TokenModelFlow token={example} asset={assetOf(example.assetId)} /> : <Skeleton className="h-16" />}
          {tokens && tokens.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Example token class">
              {tokens.map((t) => (
                <button key={t.id} role="radio" aria-checked={example?.id === t.id} onClick={() => setExampleId(t.id)} className={`h-6 rounded-full border px-2 font-mono text-[11.5px] font-medium transition-colors ${example?.id === t.id ? "border-brand/50 bg-brand-soft text-brand-ink" : "border-border text-muted hover:text-foreground"}`}>
                  {t.symbol}
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="min-w-0">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search token classes" placeholder="Symbol or name" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <NativeSelect aria-label="Filter by standard" value={standard} onChange={(e) => setStandard(e.target.value as D.TokenStandard | "")} className="sm:w-52">
            <option value="">All standards</option>
            {TOKEN_STANDARDS.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
          </NativeSelect>
        </div>
        <DataTable
          rows={tokens ? rows : undefined}
          columns={columns}
          getRowId={(t) => t.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(t) => router.push(`/tokens/${t.id}`)}
          defaultSort={{ key: "supply", dir: "desc" }}
          caption="Token classes"
          empty={{ icon: <Coins />, title: "No token classes match", description: "Clear the search or standard filter. New token classes are created when a product is structured.", action: <Button size="sm" onClick={() => { setSearch(""); setStandard(""); }}>Clear filters</Button> }}
        />
      </Card>
    </>
  );
}
