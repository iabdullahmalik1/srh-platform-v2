"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Workflow } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useOrders } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Card, Input, PageHeader, Segmented, NativeSelect } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LifecycleRail, PipelineRail } from "@/components/domain/lifecycle-rail";
import { ChainBadge, Money, RailBadge, StageBadge } from "@/components/domain/status";
import { CompanyName, PersonName } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { avatarFor } from "@/lib/assets";
import { ORDER_STAGES } from "@/lib/constants";
import { fmt } from "@/lib/utils";

type StatusFilter = "all" | "active" | "exception" | "completed" | "rejected";

function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const persona = usePersona();
  const investorView = persona.role === "investor";
  const stage = (params.get("stage") as D.OrderStage | null) ?? undefined;
  const status = (params.get("status") as StatusFilter | null) ?? "all";
  const assetId = params.get("asset") ?? "";
  const [search, setSearch] = React.useState("");

  const { data: orders, isPending, error, refetch } = useOrders();
  const { data: assets } = useAssets();
  const assetName = React.useCallback((id: string) => assets?.find((a) => a.id === id)?.shortName ?? id, [assets]);
  const assetOf = React.useCallback((id: string) => assets?.find((a) => a.id === id), [assets]);

  // URL reflects filter state so views can be shared and survive reloads.
  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const pipeline = React.useMemo(() => {
    const p = Object.fromEntries(ORDER_STAGES.map((s) => [s, 0])) as Record<D.OrderStage, number>;
    orders?.forEach((o) => {
      if (o.status === "active" || o.status === "exception" || o.status === "manual-review") p[o.stage]++;
      else if (o.status === "completed" && Date.now() - new Date(o.updatedAt).getTime() < 7 * 86_400_000) p.reconciled++;
    });
    return p;
  }, [orders]);

  const filtered = React.useMemo(() => {
    return (orders ?? []).filter((o) => {
      if (stage && !(o.stage === stage && (o.status !== "completed" || stage === "reconciled"))) return false;
      if (assetId && o.assetId !== assetId) return false;
      if (status === "active" && o.status !== "active") return false;
      if (status === "exception" && o.status !== "exception" && o.status !== "manual-review") return false;
      if (status === "completed" && o.status !== "completed") return false;
      if (status === "rejected" && o.status !== "rejected" && o.status !== "cancelled") return false;
      if (search && !`${o.id} ${o.investorName}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, stage, status, assetId, search]);

  const counts = React.useMemo(() => {
    const o = orders ?? [];
    return {
      all: o.length,
      active: o.filter((x) => x.status === "active").length,
      exception: o.filter((x) => x.status === "exception" || x.status === "manual-review").length,
      completed: o.filter((x) => x.status === "completed").length,
      rejected: o.filter((x) => x.status === "rejected" || x.status === "cancelled").length,
    };
  }, [orders]);

  const columns: Column<D.Order>[] = [
    { key: "id", header: "Order", cell: (o) => <span className="font-mono text-[12.5px] font-medium">{o.id}</span>, sort: (o) => o.id },
    ...(!investorView ? [{ key: "investor", header: "Investor", cell: (o: D.Order) => <InvestorCell name={o.investorName} />, sort: (o: D.Order) => o.investorName }] : []),
    {
      key: "asset",
      header: "Product",
      cell: (o) => {
        const a = assetOf(o.assetId);
        return (
          <span className="inline-flex min-w-0 items-center gap-2.5">
            {a ? <AssetThumb asset={a} className="h-8 w-11 rounded-md" /> : <span className="h-8 w-11 shrink-0 rounded-md bg-surface-3" />}
            <span className="truncate">{assetName(o.assetId)}</span>
          </span>
        );
      },
      sort: (o) => assetName(o.assetId),
      hideBelow: "md",
    },
    { key: "amount", header: "Amount", align: "right", cell: (o) => <Money value={o.amount} currency={o.currency} />, sort: (o) => o.amount },
    { key: "rail", header: "Rail", cell: (o) => <RailBadge rail={o.rail} />, hideBelow: "lg" },
    { key: "chain", header: "Chain", cell: (o) => <ChainBadge chain={o.chain} compact />, hideBelow: "2xl" },
    { key: "lifecycle", header: "Lifecycle", cell: (o) => <LifecycleRail order={o} variant="compact" />, hideBelow: "md" },
    { key: "stage", header: "Status", cell: (o) => <StageBadge stage={o.stage} status={o.status} /> },
    { key: "updated", header: "Updated", align: "right", cell: (o) => <span className="text-muted">{fmt.relative(o.updatedAt)}</span>, sort: (o) => o.updatedAt, hideBelow: "sm" },
  ];

  return (
    <>
      <PageHeader
        title={investorView ? "My orders" : "Order lifecycle"}
        description={investorView ? "From payment to tokens in your wallet." : "Eight event-driven stages. Select one to filter."}
        actions={(persona.role === "operations" || investorView) && <Button asChild variant="primary"><Link href="/orders/new"><Plus /> {investorView ? "Subscribe" : "New subscription"}</Link></Button>}
      />
      {!investorView && (
        <Card className="mb-5 p-5 pt-6">
          <PipelineRail pipeline={pipeline} active={stage} onSelect={(s) => setParam("stage", stage === s ? undefined : s)} />
        </Card>
      )}
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented<StatusFilter>
            value={status}
            onChange={(v) => setParam("status", v === "all" ? undefined : v)}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "In flight", count: counts.active },
              { value: "exception", label: "Exceptions", count: counts.exception },
              { value: "completed", label: "Completed", count: counts.completed },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input aria-label="Search orders" placeholder="Order number or investor" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <NativeSelect aria-label="Filter by product" value={assetId} onChange={(e) => setParam("asset", e.target.value || undefined)} className="sm:w-52">
              <option value="">All products</option>
              {assets?.map((a) => <option key={a.id} value={a.id}>{a.shortName}</option>)}
            </NativeSelect>
          </div>
        </div>
        {stage && (
          <div className="flex items-center justify-between border-b border-border bg-surface-2 px-5 py-2 text-[12.5px]">
            <span>Showing orders at stage <strong className="font-medium">{stage.replace("-", " ")}</strong></span>
            <button className="font-medium text-brand-ink hover:underline" onClick={() => setParam("stage")}>Clear stage</button>
          </div>
        )}
        <DataTable
          rows={orders ? filtered : undefined}
          columns={columns}
          getRowId={(o) => o.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(o) => router.push(`/orders/${o.id}`)}
          defaultSort={{ key: "updated", dir: "desc" }}
          caption="Orders"
          empty={{ icon: <Workflow />, title: "No orders match these filters", description: "Clear the stage or status filter, or start a new subscription.", action: <Button size="sm" onClick={() => router.replace(pathname)}>Clear filters</Button> }}
        />
      </Card>
    </>
  );
}

/** Photo for individual investors, generated mark for entities. */
function InvestorCell({ name }: { name: string }) {
  return avatarFor(name) ? <PersonName name={name} size={26} /> : <CompanyName name={name} size={26} />;
}

export default function OrdersPage() {
  return (
    <React.Suspense>
      <OrdersView />
    </React.Suspense>
  );
}
