"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, BadgeCheck, BookUser, Boxes, Building2, Database, Landmark, Link2, Lock, Scale, Snowflake, UserRound, Users, Wallet } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useHoldings, useTokenClasses } from "@/hooks/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, CardBody, CardHeader, CopyText, ErrorState, NativeSelect, PageHeader, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { BarList } from "@/components/domain/charts";
import { ChainBadge } from "@/components/domain/status";
import { CompanyLogo, CompanyName, NetworkLogo } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { FlowJoin, InfoTip } from "@/components/flows/flow";
import { Party, PartyMark, useParties, type PartyIndex } from "@/components/flows/party";
import { cn, fmt } from "@/lib/utils";

const OWNERSHIP: Record<D.OwnershipModel, { label: string; record: string; icon: React.ComponentType<{ className?: string }>; explain: string }> = {
  "on-chain": {
    label: "On-chain register",
    record: "Blockchain",
    icon: Link2,
    explain: "The token contract is the legal register. A transfer on-chain is a transfer of title, so the indexer view is the authoritative record.",
  },
  "transfer-agent": {
    label: "Transfer agent register",
    record: "Transfer agent",
    icon: BookUser,
    explain: "The transfer agent keeps the legal register of members. Tokens mirror that register, and any difference is resolved in favour of the transfer agent.",
  },
  custodian: {
    label: "Custodian records",
    record: "Custodian",
    icon: Building2,
    explain: "The custodian holds the asset and its books are authoritative. Tokens represent entitlements recorded by the custodian for each client.",
  },
  csd: {
    label: "Central securities depository",
    record: "CSD",
    icon: Landmark,
    explain: "The instrument is held in a CSD. The CSD account is authoritative and tokens are a digital twin reconciled against it every day.",
  },
  hybrid: {
    label: "Hybrid register",
    record: "Transfer agent, mirrored on-chain",
    icon: Database,
    explain: "The transfer agent register is authoritative for legal title, and the chain is the operational record for transfers. Both are reconciled continuously.",
  },
};

function RegistryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const assetId = params.get("asset") ?? "ast_wpk";

  const { data: assets, isPending: assetsPending, error: assetsError, refetch: refetchAssets } = useAssets();
  const live = React.useMemo(() => (assets ?? []).filter((a) => a.status === "live"), [assets]);
  const asset = live.find((a) => a.id === assetId);
  const { data: tokenClasses } = useTokenClasses();
  const tc = tokenClasses?.find((t) => t.assetId === assetId);
  const { data: holdings, isPending, error, refetch } = useHoldings({ filters: { assetId } });
  const parties = useParties();

  const setAsset = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v && v !== "ast_wpk") next.set("asset", v);
    else next.delete("asset");
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const supply = tc?.canonicalSupply ?? 0;
  const rows = holdings;
  const differs = (h: D.Holding) => h.legalOwner !== h.beneficialOwner || h.legalOwner !== h.investorName || !!h.custodian || !!h.nominee;
  const differing = (rows ?? []).filter(differs).length;
  const example = (rows ?? []).find((h) => h.legalOwner !== h.beneficialOwner) ?? (rows ?? []).find(differs) ?? rows?.[0];
  const top = React.useMemo(() => [...(rows ?? [])].sort((a, b) => b.quantity - a.quantity).slice(0, 8), [rows]);
  const now = Date.now();

  const columns: Column<D.Holding>[] = [
    { key: "holder", header: "Holder", cell: (h) => <Party name={h.investorName} id={h.investorId} parties={parties} size={28} className="max-w-[190px]" />, sort: (h) => h.investorName },
    {
      key: "qty",
      header: "Quantity",
      align: "right",
      cell: (h) => (
        <div>
          <div className="font-medium">{fmt.num(h.quantity)}</div>
          <div className="text-[12px] text-muted">{supply ? `${fmt.pct((h.quantity / supply) * 100, 2)} of supply` : "Supply not available"}</div>
        </div>
      ),
      sort: (h) => h.quantity,
    },
    {
      key: "owners",
      header: "Legal and beneficial owner",
      cell: (h) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5"><span className="w-[70px] shrink-0 text-[11.5px] text-muted">Legal</span><OwnerCell value={h.legalOwner} differs={h.legalOwner !== h.investorName} parties={parties} /></span>
          <span className="flex items-center gap-1.5"><span className="w-[70px] shrink-0 text-[11.5px] text-muted">Beneficial</span><OwnerCell value={h.beneficialOwner} differs={h.beneficialOwner !== h.legalOwner} parties={parties} /></span>
        </div>
      ),
      sort: (h) => h.legalOwner,
      hideBelow: "lg",
      className: "py-2",
    },
    {
      key: "custodian",
      header: "Custodian or nominee",
      cell: (h) =>
        h.custodian || h.nominee ? (
          <CompanyName name={h.custodian ?? h.nominee!} size={24} sub={h.custodian && h.nominee ? h.nominee : h.custodian ? "Custodian" : "Nominee"} className="max-w-[180px]" />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted"><Wallet className="size-4" aria-hidden /> Direct</span>
        ),
      sort: (h) => h.custodian ?? h.nominee ?? "",
      hideBelow: "xl",
    },
    {
      key: "wallet",
      header: "Chain and wallet",
      cell: (h) => (
        <div className="flex flex-col items-start gap-0.5">
          <ChainBadge chain={h.chain} />
          <CopyText value={h.walletAddress} />
        </div>
      ),
      sort: (h) => h.chain,
      hideBelow: "md",
    },
    {
      key: "transfer",
      header: "Transfer status",
      cell: (h) => {
        const locked = !!h.lockedUntil && new Date(h.lockedUntil).getTime() > now;
        if (!locked && !h.frozen) return <Badge tone="success" dot>Transferable</Badge>;
        return (
          <span className="inline-flex flex-wrap gap-1">
            {h.frozen && <Badge tone="info"><Snowflake className="size-3" aria-hidden /> Frozen</Badge>}
            {locked && <Badge tone="warning"><Lock className="size-3" aria-hidden /> Locked until {fmt.date(h.lockedUntil!)}</Badge>}
          </span>
        );
      },
      sort: (h) => (h.frozen ? 2 : 0) + (h.lockedUntil && new Date(h.lockedUntil).getTime() > now ? 1 : 0),
    },
  ];

  const model = asset ? OWNERSHIP[asset.ownershipModel] : undefined;

  return (
    <>
      <PageHeader
        title="Investor register"
        description="Holders of record for each live product."
        actions={
          <>
            <NativeSelect aria-label="Select product" value={assetId} onChange={(e) => setAsset(e.target.value)} className="w-[min(100vw-32px,260px)]" disabled={assetsPending}>
              {assetsPending && <option value={assetId}>Loading products…</option>}
              {live.map((a) => <option key={a.id} value={a.id}>{a.shortName}</option>)}
            </NativeSelect>
            <Button asChild variant="secondary"><Link href="/registry/reconciliation"><Scale /> Reconciliation</Link></Button>
          </>
        }
      />

      {assetsError && !assets ? (
        <Card><ErrorState error={assetsError} onRetry={() => refetchAssets()} /></Card>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {!asset || !model ? (
                assetsPending ? <Skeleton className="h-24" /> : <p className="text-[13px] text-muted">This product is not live, so it has no register yet. Select a live product.</p>
              ) : (
                <div className="flex min-w-0 gap-4">
                  <AssetThumb asset={asset} className="h-16 w-24 rounded-xl" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[16px] font-semibold">{asset.name}</h2>
                      {tc && <Badge tone="outline">{tc.symbol}</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tip content={model.explain}>
                        <span tabIndex={0} className="inline-flex h-7 cursor-help items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 text-[12.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <model.icon className="size-3.5 text-muted" />
                          {model.label}
                        </span>
                      </Tip>
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-info/30 bg-info-soft px-2.5 text-[12.5px] font-medium text-info" title="Authoritative record">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        {model.record}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-3 gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div>
                  <dt className="text-[12px] text-muted">Holders</dt>
                  <dd className="mt-1 text-[20px] font-semibold tabular">{rows ? rows.length : <Skeleton className="h-6 w-10" />}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">Canonical supply</dt>
                  <dd className="mt-1 text-[20px] font-semibold tabular">{tokenClasses ? (tc ? fmt.compact(tc.canonicalSupply) : "None") : <Skeleton className="h-6 w-16" />}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">Deployments</dt>
                  <dd className="mt-1 text-[20px] font-semibold tabular">{tokenClasses ? (tc?.deployments.length ?? 0) : <Skeleton className="h-6 w-8" />}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:items-start">
            <Card className="overflow-hidden">
              <CardHeader title="Three views of ownership" description="One position, up to three different parties." />
              <CardBody>
                {isPending ? (
                  <Skeleton className="h-24" />
                ) : example ? (
                  <OwnershipViews h={example} parties={parties} />
                ) : (
                  <p className="py-4 text-center text-[13px] text-muted">No positions in this register yet.</p>
                )}
              </CardBody>
              {rows && rows.length > 0 && (
                <div className="flex items-center gap-3 border-t border-border bg-surface-2 px-5 py-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${differing} of ${rows.length} positions have separate legal, beneficial or wallet parties`}>
                    <div className="h-full rounded-full bg-info" style={{ width: `${(differing / rows.length) * 100}%` }} />
                  </div>
                  <span className="shrink-0 text-[12.5px] text-muted"><span className="font-semibold text-foreground tabular">{differing}</span> of {rows.length} positions held through another party</span>
                </div>
              )}
            </Card>
            <Card>
              <CardHeader icon={<Boxes />} title="Largest positions" description="Top 8 by quantity" />
              <CardBody>
                {isPending ? (
                  <div className="flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
                ) : error && !rows ? (
                  <ErrorState className="py-6" error={error} onRetry={() => refetch()} />
                ) : top.length ? (
                  <BarList items={top.map((h) => ({ key: h.id, label: <span className="inline-flex min-w-0 items-center gap-2"><PartyMark name={h.investorName} id={h.investorId} parties={parties} size={18} className="rounded-full" /><span className="truncate">{h.investorName}</span></span>, value: h.quantity }))} format={(v) => fmt.compact(v)} />
                ) : (
                  <p className="py-6 text-center text-[13px] text-muted">No positions to rank yet.</p>
                )}
              </CardBody>
              {asset && (
                <div className="border-t border-border px-5 py-3">
                  <Link href={`/assets/${asset.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-ink hover:underline">Open product <ArrowUpRight className="size-3.5" /></Link>
                </div>
              )}
            </Card>
          </div>

          <Card className="min-w-0">
            <CardHeader title="Positions" description={tc ? `${tc.symbol} holdings across ${tc.deployments.length} deployment${tc.deployments.length === 1 ? "" : "s"}` : "Holdings by investor"} />
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(h) => h.id}
              loading={isPending}
              error={error}
              onRetry={() => refetch()}
              defaultSort={{ key: "qty", dir: "desc" }}
              caption="Investor register"
              rowClassName={(h) => (h.frozen ? "bg-info-soft/40" : undefined)}
              empty={{ icon: <Users />, title: "No holders yet", description: "Positions appear once the first subscription for this product is minted.", action: <Button asChild size="sm"><Link href="/orders">Open order lifecycle</Link></Button> }}
            />
          </Card>
        </div>
      )}
    </>
  );
}

function OwnerCell({ value, differs, parties }: { value: string; differs: boolean; parties: PartyIndex }) {
  return (
    <span className={cn("inline-flex max-w-[170px] items-center gap-1.5", differs && "font-medium")}>
      <PartyMark name={value} parties={parties} size={18} className="rounded-full" />
      <span className="truncate">{value}</span>
      {differs && <span className="size-1.5 shrink-0 rounded-full bg-info" aria-label="Differs from holder" title="Differs from the investor of record" />}
    </span>
  );
}

const VIEWS = [
  { key: "legal", icon: Scale, title: "Legal owner", tip: "The party in whose name title is registered. Often a nominee or custodian for institutional clients." },
  { key: "beneficial", icon: UserRound, title: "Beneficial owner", tip: "The party that receives the economic benefit and is screened as the ultimate beneficial owner." },
  { key: "wallet", icon: Wallet, title: "Blockchain holder", tip: "The wallet that holds the tokens on-chain. It can be an omnibus or MPC wallet run by a custodian." },
];

/** Live example from the register: legal owner, beneficial owner and wallet side by side. */
function OwnershipViews({ h, parties }: { h: D.Holding; parties: PartyIndex }) {
  const controller = h.custodian ?? h.nominee;
  const marks: Record<string, { mark: React.ReactNode; name: string; sub: string }> = {
    legal: { mark: <PartyMark name={h.legalOwner} parties={parties} size={40} className="rounded-full" />, name: h.legalOwner, sub: h.legalOwner === h.investorName ? "Investor of record" : "Registered name" },
    beneficial: { mark: <PartyMark name={h.beneficialOwner} id={h.beneficialOwner === h.investorName ? h.investorId : undefined} parties={parties} size={40} className="rounded-full" />, name: h.beneficialOwner, sub: "Economic owner" },
    wallet: {
      mark: (
        <span className="relative inline-flex">
          {controller ? <CompanyLogo name={controller} size={40} /> : <span className="grid size-10 place-items-center rounded-full bg-surface-3 text-muted"><Wallet className="size-5" aria-hidden /></span>}
          <span className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5"><NetworkLogo chain={h.chain} size={16} /></span>
        </span>
      ),
      name: controller ?? "Investor wallet",
      sub: `${h.walletAddress.slice(0, 6)}…${h.walletAddress.slice(-4)}`,
    },
  };
  return (
    <ol className="flex flex-col sm:flex-row sm:items-stretch" aria-label="Ownership views for one position">
      {VIEWS.map((v, i) => {
        const m = marks[v.key];
        return (
          <React.Fragment key={v.key}>
            <li className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:flex-col sm:items-start">
              {m.mark}
              <span className="min-w-0 flex-1 sm:w-full">
                <span className="flex items-center gap-1 text-[11.5px] font-medium text-muted"><v.icon className="size-3.5" aria-hidden />{v.title}<InfoTip content={v.tip} label={`About ${v.title.toLowerCase()}`} className="size-4" /></span>
                <span className="block truncate text-[13px] font-semibold" title={m.name}>{m.name}</span>
                <span className="block truncate text-[12px] text-muted">{m.sub}</span>
              </span>
            </li>
            {i < VIEWS.length - 1 && <li aria-hidden className="flex justify-center"><FlowJoin bp="sm" tone="info" delay={i * 0.4} /></li>}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export default function RegistryPage() {
  return (
    <React.Suspense>
      <RegistryView />
    </React.Suspense>
  );
}
