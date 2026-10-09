"use client";

import { useRouteId } from "@/hooks/route-id";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, Ban, CalendarClock, ChartLine, CircleCheck, Coins, Download, FileText, Gauge, Info, Landmark, Layers, Lock, MapPin, PieChart, Scale, Send, ShieldCheck, ShoppingCart, UserCog, Users, Vote, Wallet, Workflow } from "lucide-react";
import type * as D from "@/types/domain";
import { useAsset, useCorporateActions, useDistributions, useHoldings, useIssuers, useOfferings, useOrders, useSubmitAsset, useTokenClasses } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, KeyValue, Progress, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AssetCover } from "@/components/domain/media";
import { CompanyLogo, CompanyName } from "@/components/domain/logos";
import { AssetGallery } from "@/components/assets/gallery";
import { Counterparty, CounterpartyAvatar } from "@/components/investor/counterparty";
import { CanonicalChain } from "@/components/domain/canonical-chain";
import { BarList, SERIES, TrendArea } from "@/components/domain/charts";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { ChainBadge, ClassificationBadge, Money, RailBadge, StageBadge, StatusBadge } from "@/components/domain/status";
import { COUNTRY_NAME, TEMPLATE_META } from "@/lib/constants";
import { DISTRIBUTION_TYPE_LABEL, DOCUMENT_KIND_LABEL, INCOME_FREQUENCY_LABEL, INSTRUMENT_LABEL, OWNERSHIP_META, OWNERSHIP_ORDER, navDigits } from "@/components/assets/meta";
import { cn, fmt, sum } from "@/lib/utils";
import { AssetRiskBadge, CashFlowsTab, DocumentUploadButton, DocumentVisibilityControl, IssuancePanel, ServiceProvidersCard, StageOverrideButton, TokenomicsTab, ValuationButton, VISIBILITY_META } from "@/components/assets/asset-panels";
import { usePersona } from "@/hooks/session";
import { VideoEmbed } from "@/components/assets/video";

const TABS = ["overview", "structure", "tokenomics", "cash-flows", "token", "cap-table", "documents", "servicing", "orders"] as const;
type Tab = (typeof TABS)[number];

function AssetDetail() {
  const id = useRouteId();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "overview";

  const { data: asset, isPending, error, refetch } = useAsset(id);
  const { data: tokens } = useTokenClasses();
  const { data: offerings } = useOfferings();
  const canWrite = useCan("assets.write");
  const canSubscribe = useCan("orders.subscribe");
  const submit = useSubmitAsset();
  const { data: issuers } = useIssuers();

  const assetTokens = tokens?.filter((t) => t.assetId === id) ?? [];
  const token = assetTokens[0];
  const staff = usePersona().role !== "investor";
  const assetOfferings = offerings?.filter((o) => o.assetId === id) ?? [];
  const openOffering = assetOfferings.find((o) => o.status === "open");
  const offering = openOffering ?? assetOfferings[0];

  const setTab = (t: string) => {
    const next = new URLSearchParams(params.toString());
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  if (error && !asset) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending || !asset) return <DetailSkeleton />;

  const submittable = asset.status === "draft" || asset.status === "structuring";
  const cur = asset.valuation.currency;
  const issuer = issuers?.find((i) => i.id === asset.issuerId);

  return (
    <>
      <Link href={staff ? "/assets" : "/offerings"} className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {staff ? "Asset registry" : "Marketplace"}
      </Link>

      <section className="relative mb-4 flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl bg-navy-2 shadow-2 animate-enter md:min-h-[400px]">
        <AssetCover asset={asset} priority className="absolute inset-0 size-full" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_12_24/0.45)_0%,rgb(8_12_24/0.05)_30%,rgb(8_12_24/0.35)_60%,rgb(8_12_24/0.9)_100%)]" />
        <div className="relative flex flex-wrap items-center gap-2 p-4 md:p-6">
          <span className="rounded-full bg-surface/95 shadow-1"><StatusBadge status={asset.status} /></span>
          <HeroChip icon={<Layers className="size-3.5" />}>{TEMPLATE_META[asset.template].label}</HeroChip>
          {token && <HeroChip icon={<Coins className="size-3.5" />}>{assetTokens.map((t) => t.symbol).join(" + ")} · {token.standard}</HeroChip>}
          <span className="rounded-full bg-surface/95 shadow-1"><AssetRiskBadge risk={asset.riskProfile} /></span>
          {asset.underlying.location && <HeroChip icon={<MapPin className="size-3.5" />}>{asset.underlying.location}</HeroChip>}
          <HeroChip className="hidden sm:inline-flex" icon={<Landmark className="size-3.5" />}>{asset.legalEntity.structure} · {asset.jurisdiction}</HeroChip>
        </div>
        <div className="relative flex flex-col gap-4 p-4 pt-10 text-white md:p-6">
          <div className="flex flex-col gap-2">
            {issuer && (
              <span className="flex items-center gap-2 text-[13px] text-white/85"><CompanyLogo name={issuer.sponsor} size={24} />{issuer.sponsor}</span>
            )}
            <h1 className="max-w-3xl text-[24px] font-semibold leading-tight tracking-tight [text-shadow:0_1px_3px_rgb(0_0_0/0.35)] md:text-[32px]">{asset.name}</h1>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            {[
              { l: "NAV", v: fmt.money(asset.valuation.nav, cur, { compact: true }), tip: `Updated ${fmt.relative(asset.valuation.lastUpdated)}` },
              { l: "NAV per token", v: fmt.money(asset.valuation.navPerToken, cur, { digits: navDigits(asset.valuation.navPerToken) }), tip: `${fmt.sentence(asset.valuation.frequency)} valuation` },
              { l: "Target yield", v: asset.income.targetYieldPct ? fmt.pct(asset.income.targetYieldPct, 2) : "In NAV", tip: INCOME_FREQUENCY_LABEL[asset.income.frequency] },
              { l: "AUM", v: fmt.money(asset.aum, cur, { compact: true }), tip: asset.launchedAt ? `Since ${fmt.date(asset.launchedAt)}` : "Not launched" },
              { l: "Investors", v: fmt.num(asset.investorsCount), tip: asset.rules.maxInvestors ? `Cap ${fmt.num(asset.rules.maxInvestors)}` : "No investor cap" },
            ].map((m) => (
              <Tip key={m.l} content={m.tip}>
                <div tabIndex={0} className="min-w-0 rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur-md sm:min-w-[120px] sm:px-3.5">
                  <dt className="truncate text-[11px] text-white/70 sm:text-[11.5px]">{m.l}</dt>
                  <dd className="truncate text-[15px] font-semibold tabular sm:text-[16px] md:text-[18px]">{m.v}</dd>
                </div>
              </Tip>
            ))}
          </dl>
        </div>
      </section>

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <AssetGallery asset={asset} className="min-w-0" />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {submittable && (
            canWrite ? (
              <SubmitDialog asset={asset} pending={submit.isPending} onConfirm={(done) => submit.mutate(asset.id, { onSuccess: done })} />
            ) : (
              <Tip content="Submitting for launch needs the Operations, Issuer admin or Platform admin role."><span><Button variant="primary" disabled><Send /> Submit for launch approval</Button></span></Tip>
            )
          )}
          {openOffering && canSubscribe && (
            <Button asChild variant={submittable ? "secondary" : "primary"}><Link href={`/orders/new?offering=${openOffering.id}`}><ShoppingCart /> Subscribe</Link></Button>
          )}
          {token && staff && <Button asChild variant="secondary"><Link href={`/tokens/${token.id}`}><Coins /> View token</Link></Button>}
          {staff && <ValuationButton asset={asset} />}
          {staff && <StageOverrideButton asset={asset} />}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="tokenomics">Tokenomics</TabsTrigger>
          {asset.debt && <TabsTrigger value="cash-flows">Cash flows</TabsTrigger>}
          <TabsTrigger value="token">Token</TabsTrigger>
          {staff && <TabsTrigger value="cap-table">Cap table</TabsTrigger>}
          <TabsTrigger value="documents" count={asset.documents.length}>Documents</TabsTrigger>
          <TabsTrigger value="servicing">Servicing</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab asset={asset} /></TabsContent>
        <TabsContent value="structure"><StructureTab asset={asset} token={token} offering={offering} issuer={issuer} /></TabsContent>
        <TabsContent value="tokenomics"><TokenomicsTab asset={asset} tokens={assetTokens} /></TabsContent>
        <TabsContent value="cash-flows"><CashFlowsTab asset={asset} /></TabsContent>
        <TabsContent value="token"><div className="flex flex-col gap-5">{assetTokens.length ? assetTokens.map((t) => <React.Fragment key={t.id}><TokenTab asset={asset} token={t} tokensLoading={!tokens} />{staff && <IssuancePanel token={t} />}</React.Fragment>) : <TokenTab asset={asset} tokensLoading={!tokens} />}</div></TabsContent>
        <TabsContent value="cap-table"><CapTableTab asset={asset} token={token} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab asset={asset} /></TabsContent>
        <TabsContent value="servicing"><ServicingTab asset={asset} /></TabsContent>
        <TabsContent value="orders"><OrdersTab asset={asset} /></TabsContent>
      </Tabs>
    </>
  );
}

function HeroChip({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-[24px] max-w-full items-center gap-1.5 truncate rounded-full bg-black/35 px-2.5 text-[12px] font-medium text-white ring-1 ring-white/15 backdrop-blur-md", className)}>{icon}<span className="truncate">{children}</span></span>;
}

/* --------------------------------- actions -------------------------------- */
function SubmitDialog({ asset, pending, onConfirm }: { asset: D.Asset; pending: boolean; onConfirm: (done: () => void) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}><Send /> Submit for launch approval</Button>
      <DialogContent
        size="sm"
        title="Submit for launch approval?"
        description={`${asset.name} moves to review. Compliance approves the product, then a platform admin confirms the regulatory permission before token contracts deploy and the offering opens.`}
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Keep as draft</Button></DialogClose>
            <Button variant="primary" isLoading={pending} loadingText="Submitting…" onClick={() => onConfirm(() => setOpen(false))}>Submit for launch approval</Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2 text-[13px]">
          <li className="flex gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />Legal entity, instrument and rules are locked while in review.</li>
          <li className="flex gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />An approval request appears in the approvals queue.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- overview -------------------------------- */
function IconRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 pt-px">
        <span className="block text-[11.5px] text-muted">{label}</span>
        <span className="block text-[13px] font-medium">{children}</span>
      </span>
    </li>
  );
}

function OverviewTab({ asset }: { asset: D.Asset }) {
  const { data: issuers } = useIssuers();
  const issuer = issuers?.find((i) => i.id === asset.issuerId);
  const cur = asset.valuation.currency;
  const metricsBase = asset.underlying.metrics.length
    ? asset.underlying.metrics
    : [{ label: "Appraised value", value: fmt.money(asset.underlying.appraisedValue, cur, { compact: true }) }, ...(asset.underlying.location ? [{ label: "Location", value: asset.underlying.location }] : [])];
  const metrics = metricsBase;
  const first = asset.navHistory[0]?.nav;
  const last = asset.navHistory[asset.navHistory.length - 1]?.nav;
  const change = first && last ? ((last - first) / first) * 100 : 0;
  const parties = [
    { role: "Sponsor", name: issuer?.sponsor, sub: issuer?.name },
    { role: "Servicer", name: asset.servicer },
    { role: "Appraiser", name: asset.underlying.appraiser },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader title="Underlying asset" description={asset.underlying.description} action={<Badge tone="outline"><Money value={asset.underlying.appraisedValue} currency={cur} compact /> appraised</Badge>} />
          <CardBody>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-xl bg-surface-2 px-3.5 py-3">
                  <dt className="text-[12px] text-muted">{m.label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular">{m.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-3">
              {parties.map((p) => (
                <li key={p.role} className="min-w-0">
                  <div className="mb-1.5 text-[11.5px] text-muted">{p.role}</div>
                  {p.name ? <CompanyName name={p.name} sub={p.sub} size={30} className="max-w-full" /> : p.role === "Sponsor" ? <Skeleton className="h-8 w-40" /> : <span className="text-[13px] text-subtle">Not appointed</span>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        {(asset.media?.videos?.length || asset.profile?.length || asset.highlights?.length) ? (
          <Card>
            <CardHeader title={asset.media?.videos?.length ? "Watch and key facts" : "Key facts"} />
            <CardBody className={cn("grid grid-cols-1 gap-5", asset.media?.videos?.length && "lg:grid-cols-2")}>
              {asset.media?.videos?.slice(0, 1).map((v) => <VideoEmbed key={v.youtubeId} youtubeId={v.youtubeId} title={v.title} source={v.source} />)}
              <div className="flex flex-col gap-3">
                {asset.highlights?.length ? <ul className="flex flex-wrap gap-1.5">{asset.highlights.map((h) => <li key={h}><Badge tone="brand"><CircleCheck className="size-3" />{h}</Badge></li>)}</ul> : null}
                {asset.profile?.length ? <KeyValue cols={2} items={asset.profile.map((p) => ({ label: p.label, value: <span className="whitespace-normal">{p.value}</span> }))} /> : null}
                {asset.media?.credits && <p className="text-[11.5px] text-subtle">Images: {asset.media.credits}</p>}
              </div>
            </CardBody>
          </Card>
        ) : null}
        <Card>
          <CardHeader
            title="NAV per token"
            description={cur}
            action={asset.navHistory.length > 1 && <Badge tone={change >= 0 ? "success" : "danger"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}% over period</Badge>}
          />
          <CardBody>
            {asset.navHistory.length > 1 ? (
              <TrendArea data={asset.navHistory} dataKey="nav" name="NAV per token" height={220} format={(v) => fmt.money(v, cur, { digits: navDigits(v) })} />
            ) : (
              <EmptyState icon={<CalendarClock />} title="One valuation point so far" description="History fills in as the valuation agent publishes." className="py-10" />
            )}
          </CardBody>
        </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader title="Valuation and income" />
          <CardBody>
            <ul className="flex flex-col gap-3.5">
              <IconRow icon={<Gauge />} label="Valuation method">{asset.valuation.method}</IconRow>
              <IconRow icon={<CalendarClock />} label="Frequency">{fmt.sentence(asset.valuation.frequency)}</IconRow>
              <IconRow icon={<ChartLine />} label="Price source">{asset.oracleMode === "manual" ? `Valuation desk, ${asset.underlying.appraiser ?? "independent valuer"}` : asset.valuation.oracle ?? "Administrator feed"}</IconRow>
              <IconRow icon={<Coins />} label="Income">{asset.income.type}, {INCOME_FREQUENCY_LABEL[asset.income.frequency].toLowerCase()}</IconRow>
              <IconRow icon={<FileText />} label="Instrument">{INSTRUMENT_LABEL[asset.instrument.type]}{asset.instrument.couponPct ? `, ${asset.instrument.couponPct}% coupon` : ""}{asset.instrument.maturity ? ` to ${fmt.date(asset.instrument.maturity)}` : ""}</IconRow>
              <IconRow icon={<UserCog />} label="Servicer">{asset.servicer}</IconRow>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ShieldCheck />} title="Compliance rules" />
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Lock, l: "Lock-up", v: asset.rules.lockupDays ? `${fmt.num(asset.rules.lockupDays)} days` : "None" },
                { icon: Scale, l: "Holding limit", v: `${asset.rules.holdingLimitPct}%` },
                { icon: Wallet, l: "Minimum", v: fmt.money(asset.rules.minInvestment, cur, { compact: true }) },
                { icon: Users, l: "Investor cap", v: asset.rules.maxInvestors ? fmt.num(asset.rules.maxInvestors) : "None" },
              ].map((x) => (
                <div key={x.l} className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted"><x.icon className="size-3.5" />{x.l}</div>
                  <div className="mt-0.5 text-[14px] font-semibold tabular">{x.v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted"><CircleCheck className="size-3.5 text-success" /> Eligible</div>
              <div className="flex flex-wrap gap-1.5">{asset.rules.eligibleClassifications.map((c) => <ClassificationBadge key={c} c={c} />)}</div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted"><Ban className="size-3.5 text-danger" /> Blocked countries</div>
              {asset.rules.blockedCountries.length ? (
                <div className="flex flex-wrap gap-1.5">{asset.rules.blockedCountries.map((c) => <Badge key={c} tone="danger">{COUNTRY_NAME[c] ?? c}</Badge>)}</div>
              ) : (
                <span className="text-[13px] text-muted">None at product level</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
              {asset.policyPackIds.map((p) => <Badge key={p} tone="outline"><ShieldCheck className="size-3" />{p}</Badge>)}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------- structure ------------------------------- */
function StructureTab({ asset, token, offering, issuer }: { asset: D.Asset; token?: D.TokenClass; offering?: D.Offering; issuer?: D.Issuer }) {
  const active = OWNERSHIP_META[asset.ownershipModel];
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<Layers />} title="Canonical structure" description="Legal title sits with the entity and its register." />
        <CardBody><CanonicalChain asset={asset} token={token} offering={offering} /></CardBody>
      </Card>
      <Card>
        <CardHeader title="Authoritative record" description={<span className="inline-flex items-center gap-1.5">{active.label}<Tip content={active.detail}><span tabIndex={0} className="inline-grid size-4 place-items-center rounded-full text-subtle hover:text-foreground"><Info className="size-3.5" /></span></Tip></span>} />
        <CardBody>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {OWNERSHIP_ORDER.map((m) => {
              const on = m === asset.ownershipModel;
              return (
                <li key={m} aria-current={on ? "true" : undefined} className={cn("relative rounded-xl border p-3.5 transition-colors", on ? "border-brand bg-brand-soft" : "border-border bg-surface opacity-70")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[13px] font-semibold", on ? "text-brand-ink" : "text-foreground")}>{OWNERSHIP_META[m].label}</span>
                    {on && <CircleCheck className="size-4 shrink-0 text-brand" aria-label="Active" />}
                  </div>
                  {on && <p className="mt-1 text-[12.5px] text-muted">{OWNERSHIP_META[m].description}</p>}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Legal entity" />
        <CardBody>
          <KeyValue
            cols={3}
            items={[
              { label: "Name", value: <span className="whitespace-normal">{asset.legalEntity.name}</span> },
              { label: "Structure", value: asset.legalEntity.structure },
              { label: "Jurisdiction", value: asset.legalEntity.jurisdiction },
              { label: "Registration", value: asset.legalEntity.registrationNumber },
              { label: "Voting rights", value: asset.instrument.votingRights ? "Yes" : "No" },
              { label: "Share classes", value: asset.shareClasses.map((s) => s.name).join(", ") || "None" },
              { label: "Regulatory regimes", value: <span className="whitespace-normal">{(asset.regimes ?? [asset.jurisdiction]).join(", ")}</span> },
              { label: "Valuation source", value: asset.oracleMode === "manual" ? "Valuation desk (maker-checker)" : asset.valuation.oracle ?? "Administrator feed" },
              { label: "Sponsor", value: asset.sponsorName ?? issuer?.sponsor ?? "Not set" },
            ]}
          />
        </CardBody>
      </Card>
      <ServiceProvidersCard issuer={issuer} />
    </div>
  );
}

/* ---------------------------------- token ---------------------------------- */
function TokenTab({ asset, token, tokensLoading }: { asset: D.Asset; token?: D.TokenClass; tokensLoading: boolean }) {
  const router = useRouter();
  if (tokensLoading) return <div className="flex flex-col gap-5"><Skeleton className="h-36" /><Skeleton className="h-48" /></div>;
  if (!token) return <Card><EmptyState icon={<Coins />} title="No token class yet" description={`A canonical token class is created when ${asset.shortName} is structured with a token step.`} /></Card>;
  const columns: Column<D.ChainDeployment>[] = [
    { key: "chain", header: "Chain", cell: (d) => <ChainBadge chain={d.chain} /> },
    { key: "contract", header: "Contract", cell: (d) => (d.contractAddress === "pending" ? <span className="text-subtle">Pending</span> : <CopyText value={d.contractAddress} />) },
    { key: "supply", header: "Supply", align: "right", cell: (d) => fmt.num(d.supply), sort: (d) => d.supply },
    { key: "holders", header: "Holders", align: "right", cell: (d) => fmt.num(d.holders), sort: (d) => d.holders, hideBelow: "sm" },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          icon={<Coins />}
          title={`${token.symbol} · ${token.name}`}
          description="Canonical token class. Every chain deployment reconciles to its supply."
          action={<Button asChild variant="ghost" size="sm"><Link href={`/tokens/${token.id}`} aria-label="Open in token factory"><span className="hidden sm:inline">Open in token factory</span><span className="sm:hidden">Open</span> <ArrowUpRight /></Link></Button>}
        />
        <CardBody>
          <KeyValue
            cols={3}
            items={[
              { label: "Standard", value: token.standard },
              { label: "Status", value: <StatusBadge status={token.status} /> },
              { label: "Canonical supply", value: <span className="tabular">{fmt.num(token.canonicalSupply)}</span> },
              { label: "Maximum supply", value: token.maxSupply ? <span className="tabular">{fmt.num(token.maxSupply)}</span> : "Uncapped" },
              { label: "Decimals", value: token.decimals },
              { label: "Holders", value: <span className="tabular">{fmt.num(sum(token.deployments, (d) => d.holders))}</span> },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Deployments" description={`${token.deployments.length} ${token.deployments.length === 1 ? "chain" : "chains"}`} />
        <DataTable
          rows={token.deployments}
          columns={columns}
          getRowId={(d) => d.id}
          onRowClick={() => router.push(`/tokens/${token.id}`)}
          caption="Token deployments"
          empty={{ title: "No deployments", description: "Add a deployment from the token factory." }}
        />
      </Card>
    </div>
  );
}

/* --------------------------------- cap table ------------------------------- */
function CapTableTab({ asset, token }: { asset: D.Asset; token?: D.TokenClass }) {
  const { data: holdings, isPending, error, refetch } = useHoldings({ filters: { assetId: asset.id } });
  const supply = token?.canonicalSupply || sum(holdings ?? [], (h) => h.quantity) || 1;
  const byInvestor = React.useMemo(() => {
    const m = new Map<string, { name: string; qty: number }>();
    (holdings ?? []).forEach((h) => {
      const cur = m.get(h.investorId) ?? { name: h.investorName, qty: 0 };
      cur.qty += h.quantity;
      m.set(h.investorId, cur);
    });
    return [...m.entries()].sort((a, b) => b[1].qty - a[1].qty);
  }, [holdings]);

  const columns: Column<D.Holding>[] = [
    { key: "holder", header: "Holder", cell: (h) => <Counterparty name={h.investorName} sub={<CopyText value={h.walletAddress} className="text-[11.5px]" />} />, sort: (h) => h.investorName },
    { key: "chain", header: "Chain", cell: (h) => <ChainBadge chain={h.chain} compact />, hideBelow: "md" },
    { key: "qty", header: "Quantity", align: "right", cell: (h) => fmt.num(h.quantity), sort: (h) => h.quantity },
    { key: "pct", header: "% of supply", align: "right", cell: (h) => fmt.pct((h.quantity / supply) * 100, 2), sort: (h) => h.quantity },
    { key: "legal", header: "Legal owner", cell: (h) => h.legalOwner, hideBelow: "lg" },
    { key: "beneficial", header: "Beneficial owner", cell: (h) => h.beneficialOwner, hideBelow: "lg" },
    { key: "custodian", header: "Custodian", cell: (h) => (h.custodian ? <CompanyName name={h.custodian} size={22} /> : <span className="text-subtle">Self-custody</span>), hideBelow: "xl" },
    { key: "flags", header: "Restrictions", cell: (h) => (h.frozen ? <Badge tone="info">Frozen</Badge> : h.lockedUntil && new Date(h.lockedUntil) > new Date() ? <Badge tone="warning">Locked to {fmt.dateShort(h.lockedUntil)}</Badge> : <span className="text-subtle">None</span>), hideBelow: "md" },
  ];

  const chainSplit = React.useMemo(() => {
    const m = new Map<D.Chain, number>();
    (holdings ?? []).forEach((h) => m.set(h.chain, (m.get(h.chain) ?? 0) + h.quantity));
    return [...m.entries()];
  }, [holdings]);
  const held = sum(holdings ?? [], (h) => h.quantity);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Largest holders" description="Top six by quantity, all chains combined" />
          <CardBody>
            {isPending ? (
              <div className="flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : error && !holdings ? (
              <ErrorState error={error} onRetry={() => refetch()} className="py-6" />
            ) : byInvestor.length === 0 ? (
              <EmptyState icon={<PieChart />} title="No positions" description="Nothing to rank until the first subscription mints." className="py-8" />
            ) : (
              <BarList items={byInvestor.slice(0, 6).map(([k, v], i) => ({ key: k, label: <span className="inline-flex items-center gap-2"><CounterpartyAvatar name={v.name} size={20} tip={false} />{v.name}</span>, value: v.qty, color: SERIES[i % SERIES.length] }))} format={(v) => fmt.compact(v)} />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Register summary" description="Positions reconcile to the canonical token class" />
          <CardBody>
            {isPending ? (
              <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <>
                <KeyValue
                  items={[
                    { label: "Holders", value: <span className="tabular">{fmt.num(byInvestor.length)}</span> },
                    { label: "Wallet positions", value: <span className="tabular">{fmt.num(holdings?.length ?? 0)}</span> },
                    { label: "Units held", value: <span className="tabular">{fmt.num(held)}</span> },
                    { label: "Canonical supply", value: token ? <span className="tabular">{fmt.num(token.canonicalSupply)}</span> : "No token class" },
                  ]}
                />
                {chainSplit.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    {chainSplit.map(([c, q]) => (
                      <span key={c} className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                        <ChainBadge chain={c} compact />
                        <span className="text-[12px] text-muted tabular">{fmt.pct((q / (held || 1)) * 100)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
      <Card className="min-w-0">
        <CardHeader title="Holders" description={token ? `Positions against ${fmt.num(token.canonicalSupply)} ${token.symbol} canonical supply` : "Positions by wallet"} />
        <DataTable
          rows={holdings}
          columns={columns}
          getRowId={(h) => h.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          defaultSort={{ key: "qty", dir: "desc" }}
          pageSize={10}
          caption="Cap table"
          empty={{ icon: <PieChart />, title: "No holders yet", description: "Positions appear once the first subscription mints and reconciles." }}
        />
      </Card>
    </div>
  );
}

/* --------------------------------- documents ------------------------------- */
function downloadDocument(asset: D.Asset, d: D.AssetDocument) {
  const body = [
    `${d.name}`,
    ``,
    `Product: ${asset.name}`,
    `Legal entity: ${asset.legalEntity.name}`,
    `Document kind: ${DOCUMENT_KIND_LABEL[d.kind]}`,
    `Version: ${d.version}`,
    `Status: ${fmt.sentence(d.status)}`,
    `Last updated: ${fmt.dateTime(d.updatedAt)}`,
    `Content hash (SHA-256): ${d.hash}`,
    ``,
    `This is a metadata receipt generated in the console. In production the document service returns a short-lived signed URL for the original file, and the hash above lets you verify the file you receive.`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${asset.shortName}-${d.kind}-${d.version}.txt`.replace(/\s+/g, "-").toLowerCase();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Downloaded ${d.name}`, { description: "Metadata receipt. Originals are served as signed URLs by the document service." });
}

function DocumentsTab({ asset }: { asset: D.Asset }) {
  const columns: Column<D.AssetDocument>[] = [
    { key: "name", header: "Document", cell: (d) => <span className="flex items-center gap-2 font-medium"><FileText className="size-4 shrink-0 text-subtle" />{d.name}</span>, sort: (d) => d.name },
    { key: "kind", header: "Kind", cell: (d) => <span className="text-muted">{DOCUMENT_KIND_LABEL[d.kind]}</span>, hideBelow: "md" },
    { key: "version", header: "Version", cell: (d) => <span className="tabular">{d.version}</span>, hideBelow: "sm" },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
    { key: "updated", header: "Updated", cell: (d) => <span className="text-muted">{fmt.date(d.updatedAt)}</span>, sort: (d) => d.updatedAt, hideBelow: "lg" },
    { key: "vis", header: "Visible to", cell: (d) => <DocumentVisibilityControl asset={asset} doc={d} />, sort: (d) => d.visibility ?? "holders" },
    { key: "hash", header: "Hash", cell: (d) => <CopyText value={d.hash} />, hideBelow: "xl" },
    { key: "dl", header: "File", align: "right", cell: (d) => <Button size="sm" variant="ghost" onClick={() => downloadDocument(asset, d)} aria-label={`Download ${d.name}`}><Download /> <span className="hidden sm:inline">Download</span></Button> },
  ];
  return (
    <Card>
      <CardHeader title="Documents" description={`Every version is hashed. ${asset.documents.filter((d) => (d.visibility ?? "holders") === "public").length} public, ${asset.documents.filter((d) => (d.visibility ?? "holders") === "holders").length} for ${VISIBILITY_META.holders.label.toLowerCase()}, ${asset.documents.filter((d) => d.visibility === "internal").length} internal.`} action={<DocumentUploadButton asset={asset} />} />
      <DataTable
        rows={asset.documents}
        columns={columns}
        getRowId={(d) => d.id}
        defaultSort={{ key: "updated", dir: "desc" }}
        caption="Product documents"
        empty={{ icon: <FileText />, title: "No documents yet", description: "Upload the offering memorandum and constitutional documents before submitting for launch approval." }}
      />
    </Card>
  );
}

/* --------------------------------- servicing ------------------------------- */
function ServicingTab({ asset }: { asset: D.Asset }) {
  const dist = useDistributions(asset.id);
  const actions = useCorporateActions(asset.id);
  const columns: Column<D.Distribution>[] = [
    { key: "type", header: "Type", cell: (d) => <span className="font-medium">{DISTRIBUTION_TYPE_LABEL[d.type]}</span> },
    { key: "record", header: "Record date", cell: (d) => fmt.date(d.recordDate), sort: (d) => d.recordDate, hideBelow: "md" },
    { key: "pay", header: "Payment date", cell: (d) => fmt.date(d.paymentDate), sort: (d) => d.paymentDate },
    { key: "net", header: "Net amount", align: "right", cell: (d) => <Money value={d.netAmount} currency={d.currency} />, sort: (d) => d.netAmount },
    { key: "per", header: "Per token", align: "right", cell: (d) => <Money value={d.perToken} currency={d.currency} digits={4} />, hideBelow: "lg" },
    { key: "rail", header: "Rail", cell: (d) => <RailBadge rail={d.rail} />, hideBelow: "lg" },
    { key: "paid", header: "Paid", align: "right", cell: (d) => `${d.paidCount} of ${d.holdersCount}`, hideBelow: "sm" },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} /> },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card className="min-w-0">
        <CardHeader title="Distributions" description="Calculated from the register at record date" action={<Button asChild variant="ghost" size="sm"><Link href="/servicing" aria-label="Open servicing"><span className="hidden sm:inline">Open servicing</span><span className="sm:hidden">Open</span> <ArrowUpRight /></Link></Button>} />
        <DataTable
          rows={dist.data}
          columns={columns}
          getRowId={(d) => d.id}
          loading={dist.isPending}
          error={dist.error}
          onRetry={() => dist.refetch()}
          defaultSort={{ key: "pay", dir: "desc" }}
          pageSize={8}
          caption="Distributions"
          empty={{ icon: <CalendarClock />, title: "No distributions", description: `${asset.shortName} has not declared income yet.` }}
        />
      </Card>
      <Card>
        <CardHeader title="Corporate actions" description="Votes, maturities, redemption windows and notices" />
        {actions.isPending ? (
          <div className="flex flex-col gap-3 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : actions.error && !actions.data ? (
          <ErrorState error={actions.error} onRetry={() => actions.refetch()} className="py-8" />
        ) : !actions.data?.length ? (
          <EmptyState icon={<Vote />} title="No corporate actions" description="Votes, NAV updates and notices appear here." className="py-10" />
        ) : (
          <ul className="divide-y divide-border">
            {actions.data.map((c) => {
              const cast = c.votes ? c.votes.for + c.votes.against + c.votes.abstain : 0;
              return (
                <li key={c.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{c.title}</div>
                      <div className="text-[12px] text-muted">{fmt.sentence(c.kind)} · effective {fmt.date(c.effectiveDate)}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">{c.detail}</p>
                  {c.votes && (
                    <div className="mt-2">
                      <Progress value={cast} tone={cast >= c.votes.quorumPct ? "success" : "warning"} />
                      <div className="mt-1 flex justify-between text-[11.5px] text-muted tabular"><span>{cast.toFixed(1)}% voted, {c.votes.for}% for</span><span>Quorum {c.votes.quorumPct}%</span></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------- orders --------------------------------- */
function OrdersTab({ asset }: { asset: D.Asset }) {
  const router = useRouter();
  const { data, isPending, error, refetch } = useOrders({ filters: { assetId: asset.id } });
  const columns: Column<D.Order>[] = [
    { key: "id", header: "Order", cell: (o) => <span className="font-mono text-[12.5px] font-medium">{o.id}</span>, sort: (o) => o.id },
    { key: "investor", header: "Investor", cell: (o) => <Counterparty name={o.investorName} size={24} />, sort: (o) => o.investorName, hideBelow: "sm" },
    { key: "amount", header: "Amount", align: "right", cell: (o) => <Money value={o.amount} currency={o.currency} />, sort: (o) => o.amount },
    { key: "lifecycle", header: "Lifecycle", cell: (o) => <LifecycleRail order={o} variant="compact" />, hideBelow: "md" },
    { key: "stage", header: "Status", cell: (o) => <StageBadge stage={o.stage} status={o.status} /> },
    { key: "updated", header: "Updated", align: "right", cell: (o) => <span className="text-muted">{fmt.relative(o.updatedAt)}</span>, sort: (o) => o.updatedAt, hideBelow: "lg" },
  ];
  return (
    <Card>
      <CardHeader title="Subscriptions" description="Orders against every offering of this product" action={<Button asChild variant="ghost" size="sm"><Link href={`/orders?asset=${asset.id}`} aria-label="Open in order lifecycle"><span className="hidden sm:inline">Open in order lifecycle</span><span className="sm:hidden">Open</span> <ArrowUpRight /></Link></Button>} />
      <DataTable
        rows={data}
        columns={columns}
        getRowId={(o) => o.id}
        loading={isPending}
        error={error}
        onRetry={() => refetch()}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        defaultSort={{ key: "updated", dir: "desc" }}
        pageSize={10}
        caption="Orders for this product"
        empty={{ icon: <Workflow />, title: "No orders yet", description: "Subscriptions appear here once the offering opens." }}
      />
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[340px] w-full rounded-2xl md:h-[400px]" />
      <div className="flex gap-2.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-32 rounded-xl" />)}</div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}

export default function AssetDetailPage() {
  return (
    <React.Suspense fallback={<DetailSkeleton />}>
      <AssetDetail />
    </React.Suspense>
  );
}
