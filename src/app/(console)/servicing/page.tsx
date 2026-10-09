"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { ArrowRight, ArrowUpRight, Banknote, Bell, Calculator, CalendarCheck, CalendarClock, CircleCheck, Coins, DoorOpen, HandCoins, LineChart, Percent, Plus, Send, ShieldCheck, Split, Undo2, Vote } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useCalculateDistribution, useCastVote, useCorporateActions, useDistributions, useHoldings, useSubmitDistribution } from "@/hooks/api";
import { useCan, usePersona } from "@/hooks/session";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, Field, Input, NativeSelect, PageHeader, Progress, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Sparkline } from "@/components/domain/charts";
import { Money, RailBadge, StatusBadge } from "@/components/domain/status";
import { RAIL_META, ROLE_META, TEMPLATE_META } from "@/lib/constants";
import { CompanyLogo, RailLogo } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { FlowLine } from "@/components/flows/flow";
import { DistributionWaterfall } from "@/components/flows/waterfall";
import { PartyStack, useParties } from "@/components/flows/party";
import { cn, fmt } from "@/lib/utils";

type Tab = "distributions" | "actions" | "nav";
const TABS: Tab[] = ["distributions", "actions", "nav"];
const DIST_TYPES = ["dividend", "coupon", "rental-income", "interest", "principal", "redemption", "fee"] as const satisfies readonly D.DistributionType[];
const RAILS = Object.keys(RAIL_META) as [D.PaymentRail, ...D.PaymentRail[]];

function ServicingView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "distributions";
  const canWrite = useCan("servicing.write");

  const setTab = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v === "distributions") next.delete("tab");
    else next.set("tab", v);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const newBtn = <NewDistributionDialog disabled={!canWrite} />;

  return (
    <>
      <PageHeader
        title="Asset servicing"
        description="Distributions, corporate actions and valuation for live products."
        actions={canWrite ? newBtn : <Tip content="Creating distributions needs the Operations or Issuer admin role. Switch persona from the account menu."><span tabIndex={0}>{newBtn}</span></Tip>}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="actions">Corporate actions</TabsTrigger>
          <TabsTrigger value="nav">NAV and valuation</TabsTrigger>
        </TabsList>
        <TabsContent value="distributions"><DistributionsPanel canWrite={canWrite} /></TabsContent>
        <TabsContent value="actions"><CorporateActionsPanel /></TabsContent>
        <TabsContent value="nav"><NavPanel /></TabsContent>
      </Tabs>
    </>
  );
}

/* ------------------------------- distributions ----------------------------- */

function DistributionsPanel({ canWrite }: { canWrite: boolean }) {
  const { data, isPending, error, refetch } = useDistributions();
  const { data: assets } = useAssets();
  const submit = useSubmitDistribution();
  const assetName = React.useCallback((id: string) => assets?.find((a) => a.id === id)?.shortName ?? id, [assets]);
  const assetOf = React.useCallback((id: string) => assets?.find((a) => a.id === id), [assets]);

  const columns: Column<D.Distribution>[] = [
    {
      key: "asset",
      header: "Product",
      cell: (d) => {
        const a = assetOf(d.assetId);
        return (
          <div className="flex min-w-0 items-center gap-3">
            {a && <AssetThumb asset={a} className="h-9 w-12" />}
            <div className="min-w-0"><div className="truncate font-medium">{assetName(d.assetId)}</div><div className="text-[12px] text-muted">{fmt.sentence(d.type)}</div></div>
          </div>
        );
      },
      sort: (d) => assetName(d.assetId),
    },
    { key: "gross", header: "Gross", align: "right", cell: (d) => <Money value={d.grossAmount} currency={d.currency} />, sort: (d) => d.grossAmount, hideBelow: "xl" },
    { key: "wht", header: "Withholding tax", align: "right", cell: (d) => (d.withholdingTax ? <Money value={d.withholdingTax} currency={d.currency} /> : <span className="text-muted">None</span>), sort: (d) => d.withholdingTax, className: "hidden 2xl:table-cell" },
    { key: "net", header: "Net", align: "right", cell: (d) => <Money value={d.netAmount} currency={d.currency} className="font-medium" />, sort: (d) => d.netAmount },
    { key: "per", header: "Per token", align: "right", cell: (d) => <span className="tabular">{fmt.money(d.perToken, d.currency, { digits: 4 })}</span>, sort: (d) => d.perToken, className: "hidden 2xl:table-cell" },
    { key: "record", header: "Record date", cell: (d) => fmt.date(d.recordDate), sort: (d) => d.recordDate, className: "hidden 2xl:table-cell" },
    { key: "payment", header: "Payment date", cell: (d) => fmt.date(d.paymentDate), sort: (d) => d.paymentDate, hideBelow: "md" },
    { key: "rail", header: "Rail", cell: (d) => <RailBadge rail={d.rail} />, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} />, sort: (d) => d.status },
    {
      key: "paid",
      header: "Paid",
      cell: (d) => (
        <div className="flex w-28 items-center gap-2">
          <Progress value={d.holdersCount ? (d.paidCount / d.holdersCount) * 100 : 0} tone={d.paidCount === d.holdersCount && d.holdersCount > 0 ? "success" : "brand"} />
          <span className="shrink-0 text-[12px] text-muted tabular">{d.paidCount}/{d.holdersCount}</span>
        </div>
      ),
      sort: (d) => (d.holdersCount ? d.paidCount / d.holdersCount : 0),
      hideBelow: "md",
    },
    {
      key: "action",
      header: "Next step",
      align: "right",
      cell: (d) =>
        d.status === "calculated" && canWrite ? (
          <Button size="sm" variant="tonal" isLoading={submit.isPending && submit.variables === d.id} loadingText="Submitting…" onClick={(e) => { e.stopPropagation(); submit.mutate(d.id); }}>
            <Send /> Submit for approval
          </Button>
        ) : d.status === "pending-approval" ? (
          <Link href="/approvals" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-ink hover:underline">Approvals <ArrowUpRight className="size-3.5" /></Link>
        ) : null,
    },
  ];

  const upcoming = React.useMemo(() => {
    const list = [...(data ?? [])].filter((d) => d.status !== "paid").sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
    return list[0] ?? [...(data ?? [])].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0];
  }, [data]);

  return (
    <div className="flex flex-col gap-5">
    {(isPending || (data && data.length > 0)) && (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          <CardHeader
            icon={<Banknote />}
            title={upcoming && upcoming.status !== "paid" ? "Next payment" : "Latest payment"}
            description={upcoming ? `${assetName(upcoming.assetId)} · ${fmt.sentence(upcoming.type)} · ${fmt.date(upcoming.paymentDate)}` : undefined}
            action={upcoming ? <RailBadge rail={upcoming.rail} /> : undefined}
          />
          <CardBody>
            {isPending || !upcoming ? <Skeleton className="h-40" /> : <UpcomingWaterfall d={upcoming} />}
          </CardBody>
        </Card>
        <DistributionPipeline items={data} loading={isPending} />
      </div>
    )}
    <Card>
      <DataTable
        rows={data}
        columns={columns}
        getRowId={(d) => d.id}
        loading={isPending}
        error={error}
        onRetry={() => refetch()}
        defaultSort={{ key: "payment", dir: "desc" }}
        caption="Distributions"
        empty={{ icon: <CalendarClock />, title: "No distributions yet", description: "Create a distribution to calculate the payout for the current record date.", action: canWrite ? <NewDistributionDialog /> : undefined }}
      />
    </Card>
    </div>
  );
}

function HoldersStack({ assetId }: { assetId: string }) {
  const { data } = useHoldings({ filters: { assetId } });
  const parties = useParties();
  if (!data?.length) return undefined;
  const names = [...data].filter((h) => !h.frozen).sort((a, b) => b.quantity - a.quantity).map((h) => ({ name: h.investorName, id: h.investorId }));
  return <PartyStack names={names} parties={parties} max={5} size={26} />;
}

function UpcomingWaterfall({ d }: { d: D.Distribution }) {
  return (
    <DistributionWaterfall
      gross={d.grossAmount}
      withholding={d.withholdingTax}
      net={d.netAmount}
      currency={d.currency}
      holders={d.holdersCount}
      perToken={d.perToken}
      holdersVisual={<HoldersStack assetId={d.assetId} />}
      compact
    />
  );
}

const PIPELINE: { status: D.Distribution["status"]; label: string; icon: React.ElementType }[] = [
  { status: "scheduled", label: "Scheduled", icon: CalendarClock },
  { status: "calculated", label: "Calculated", icon: Calculator },
  { status: "pending-approval", label: "Approval", icon: ShieldCheck },
  { status: "approved", label: "Approved", icon: CircleCheck },
  { status: "paying", label: "Paying", icon: Send },
  { status: "paid", label: "Paid", icon: Banknote },
];

/** Count of distributions at each stage, as a left to right flow. */
function DistributionPipeline({ items, loading }: { items?: D.Distribution[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader icon={<CalendarCheck />} title="Distribution pipeline" description="Every payout is calculated, approved, then paid." />
      <CardBody>
        {loading ? (
          <Skeleton className="h-28" />
        ) : (
          <ol className="grid grid-cols-3 gap-y-4 sm:flex sm:items-start" aria-label="Distributions by stage">
            {PIPELINE.map((p, i) => {
              const n = (items ?? []).filter((d) => d.status === p.status).length;
              const total = (items ?? []).filter((d) => d.status === p.status).reduce((s, d) => s + d.netAmount, 0);
              return (
                <React.Fragment key={p.status}>
                  <li className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:w-[72px] sm:shrink-0">
                    <span className={cn("relative grid size-11 place-items-center rounded-full border", n ? (p.status === "paid" ? "border-success/40 bg-success-soft text-success" : p.status === "pending-approval" ? "border-warning/40 bg-warning-soft text-warning" : "border-brand/40 bg-brand-soft text-brand-ink") : "border-border bg-surface-2 text-subtle")}>
                      <p.icon className="size-4" aria-hidden />
                      {n > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10.5px] font-semibold text-surface tabular">{n}</span>}
                    </span>
                    <span className="text-[12px] font-medium">{p.label}</span>
                    <span className="text-[11px] text-muted tabular">{n ? fmt.compact(total) : "None"}</span>
                  </li>
                  {i < PIPELINE.length - 1 && <li aria-hidden className="hidden min-w-3 flex-1 sm:flex"><FlowLine tone={n ? "brand" : "muted"} pulse={n > 0} delay={i * 0.25} className="mt-2.5 w-full" /></li>}
                </React.Fragment>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

const schema = z
  .object({
    assetId: z.string().min(1, "Choose a product"),
    type: z.enum(DIST_TYPES),
    grossAmount: z.number({ error: "Enter the gross amount" }).positive("Gross amount must be greater than zero"),
    recordDate: z.string().min(1, "Choose the record date"),
    paymentDate: z.string().min(1, "Choose the payment date"),
    rail: z.enum(RAILS),
  })
  .refine((v) => !v.recordDate || !v.paymentDate || v.paymentDate >= v.recordDate, { path: ["paymentDate"], message: "Payment date must be on or after the record date" });

type FormState = { assetId: string; type: D.DistributionType; gross: string; recordDate: string; paymentDate: string; rail: D.PaymentRail };

function defaultType(a?: D.Asset): D.DistributionType {
  if (!a) return "dividend";
  if (a.template === "real-estate") return "rental-income";
  if (a.template === "bond" || a.template === "sukuk") return "coupon";
  if (a.template === "private-credit" || a.template === "receivables" || a.template === "treasury-fund") return "interest";
  return "dividend";
}
const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

function NewDistributionDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const { data: assets } = useAssets();
  const eligible = React.useMemo(() => (assets ?? []).filter((a) => a.status === "live" && a.income.targetYieldPct > 0), [assets]);
  const calc = useCalculateDistribution();
  const submit = useSubmitDistribution();
  const blank = React.useCallback((): FormState => ({ assetId: "", type: "dividend", gross: "", recordDate: isoDay(7), paymentDate: isoDay(12), rail: "swift" }), []);
  const [form, setForm] = React.useState<FormState>(blank);
  const [errors, setErrors] = React.useState<Partial<Record<string, string>>>({});
  const [result, setResult] = React.useState<D.Distribution | null>(null);
  const [approval, setApproval] = React.useState<D.Approval | null>(null);

  const reset = () => { setForm(blank()); setErrors({}); setResult(null); setApproval(null); calc.reset(); submit.reset(); };
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k === "gross" ? "grossAmount" : k]: undefined })); };
  const asset = eligible.find((a) => a.id === form.assetId);

  const onCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = form.gross.trim() === "" ? NaN : Number(form.gross.replace(/,/g, ""));
    const parsed = schema.safeParse({ assetId: form.assetId, type: form.type, grossAmount: gross, recordDate: form.recordDate, paymentDate: form.paymentDate, rail: form.rail });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { const k = String(i.path[0]); if (!errs[k]) errs[k] = i.message; });
      setErrors(errs);
      const first = ["assetId", "type", "grossAmount", "recordDate", "paymentDate", "rail"].find((k) => errs[k]);
      if (first) document.getElementById(`dist-${first}`)?.focus();
      return;
    }
    const v = parsed.data;
    calc.mutate(
      { assetId: v.assetId, type: v.type, grossAmount: v.grossAmount, recordDate: new Date(`${v.recordDate}T00:00:00Z`).toISOString(), paymentDate: new Date(`${v.paymentDate}T00:00:00Z`).toISOString(), rail: v.rail },
      { onSuccess: (d) => setResult(d) },
    );
  };

  const footer = approval ? (
    <>
      <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
      <Button asChild variant="primary"><Link href="/approvals">Open approvals <ArrowRight /></Link></Button>
    </>
  ) : result ? (
    <>
      <Button variant="ghost" onClick={() => { setResult(null); calc.reset(); }}>Edit inputs</Button>
      <Button variant="primary" isLoading={submit.isPending} loadingText="Submitting…" onClick={() => submit.mutate(result.id, { onSuccess: (ap) => setApproval(ap) })}>
        <Send /> Submit for approval
      </Button>
    </>
  ) : (
    <>
      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
      <Button variant="primary" type="submit" form="new-distribution" isLoading={calc.isPending} loadingText="Calculating…">Calculate distribution</Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button variant="primary" disabled={disabled} onClick={() => setOpen(true)}><Plus /> New distribution</Button>
      <DialogContent
        size="lg"
        title={approval ? "Sent for approval" : result ? "Distribution calculated" : "New distribution"}
        description={approval ? "Operations and Compliance approve before any payment leaves." : result ? "Check the waterfall, then submit it for approval." : "The engine calculates entitlements from the investor register at the record date."}
        footer={footer}
      >
        {approval ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-success-soft text-success"><CircleCheck className="size-5" /></span>
            <div className="text-[14px] font-semibold">{approval.title}</div>
            <p className="mt-1 max-w-sm text-[13px] text-muted">{approval.summary}</p>
            <p className="mt-2 font-mono text-[12px] text-subtle">{approval.id}</p>
          </div>
        ) : result ? (
          <Waterfall d={result} asset={asset} />
        ) : (
          <form id="new-distribution" onSubmit={onCalculate} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product" htmlFor="dist-assetId" error={errors.assetId} required hint="Live products that pay income" className="sm:col-span-2">
              <NativeSelect id="dist-assetId" value={form.assetId} aria-invalid={!!errors.assetId} onChange={(e) => { const a = eligible.find((x) => x.id === e.target.value); set("assetId", e.target.value); if (a) set("type", defaultType(a)); }}>
                <option value="">{assets ? "Choose a product" : "Loading products…"}</option>
                {eligible.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Type" htmlFor="dist-type" error={errors.type} required>
              <NativeSelect id="dist-type" value={form.type} onChange={(e) => set("type", e.target.value as D.DistributionType)}>
                {DIST_TYPES.map((t) => <option key={t} value={t}>{fmt.sentence(t)}</option>)}
              </NativeSelect>
            </Field>
            <Field label={`Gross amount${asset ? ` (${asset.valuation.currency})` : ""}`} htmlFor="dist-grossAmount" error={errors.grossAmount} required>
              <Input id="dist-grossAmount" inputMode="decimal" autoComplete="off" placeholder="1,250,000" value={form.gross} aria-invalid={!!errors.grossAmount} onChange={(e) => set("gross", e.target.value)} className="tabular" />
            </Field>
            <Field label="Record date" htmlFor="dist-recordDate" error={errors.recordDate} required hint="Holders on this date are entitled">
              <Input id="dist-recordDate" type="date" value={form.recordDate} aria-invalid={!!errors.recordDate} onChange={(e) => set("recordDate", e.target.value)} />
            </Field>
            <Field label="Payment date" htmlFor="dist-paymentDate" error={errors.paymentDate} required>
              <Input id="dist-paymentDate" type="date" value={form.paymentDate} aria-invalid={!!errors.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} />
            </Field>
            <Field label="Payment rail" error={errors.rail} required hint={RAIL_META[form.rail].description} className="sm:col-span-2">
              <div role="radiogroup" aria-label="Payment rail" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RAILS.map((r, i) => {
                  const on = form.rail === r;
                  return (
                    <button
                      key={r}
                      id={i === 0 ? "dist-rail" : undefined}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set("rail", r)}
                      className={cn("flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-brand ring-2 ring-brand/15" : "border-border hover:border-border-strong")}
                    >
                      <RailLogo rail={r} size={22} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">{RAIL_META[r].label}</span>
                        <span className="block text-[11px] text-muted">{RAIL_META[r].eta}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Waterfall({ d, asset }: { d: D.Distribution; asset?: D.Asset }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {asset && <AssetThumb asset={asset} className="h-10 w-14" />}
        <div className="min-w-0 text-[12.5px]">
          <div className="truncate text-[13.5px] font-semibold">{asset?.name ?? d.assetId}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-muted">
            <span>{fmt.sentence(d.type)}</span><span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden />Record {fmt.date(d.recordDate)}</span><span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><RailLogo rail={d.rail} size={14} />Paid {fmt.date(d.paymentDate)}</span>
          </div>
        </div>
      </div>
      <DistributionWaterfall gross={d.grossAmount} withholding={d.withholdingTax} net={d.netAmount} currency={d.currency} holders={d.holdersCount} perToken={d.perToken} holdersVisual={<HoldersStack assetId={d.assetId} />} />
      <p className="text-[12px] text-muted">Frozen positions are excluded from the payout.</p>
    </div>
  );
}

/* ----------------------------- corporate actions --------------------------- */

const KIND_ICON: Record<D.CorporateAction["kind"], React.ComponentType<{ className?: string }>> = {
  vote: Vote,
  split: Split,
  maturity: CalendarCheck,
  "redemption-window": DoorOpen,
  "nav-update": LineChart,
  notice: Bell,
  distribution: Coins,
  coupon: Percent,
  "tender-offer": HandCoins,
  buyback: Undo2,
};

function CorporateActionsPanel() {
  const { data, isPending, error, refetch } = useCorporateActions();
  const { data: assets } = useAssets();
  const persona = usePersona();
  const vote = useCastVote();
  const readOnly = !useCan("votes.cast");
  const assetName = (id: string) => assets?.find((a) => a.id === id)?.name ?? id;
  const assetOf = (id: string) => assets?.find((a) => a.id === id);

  if (error && !data) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending) return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>;
  if (!data?.length) return <Card><EmptyState icon={<CalendarClock />} title="No corporate actions" description="Votes, maturities, redemption windows and notices appear here when scheduled." /></Card>;

  const sorted = [...data].sort((a, b) => (a.status === "open" ? -1 : 0) - (b.status === "open" ? -1 : 0) || b.effectiveDate.localeCompare(a.effectiveDate));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {sorted.map((ca) => {
        const Icon = KIND_ICON[ca.kind];
        return (
          <Card key={ca.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-3 text-muted"><Icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-[14px] font-semibold leading-snug">{ca.title}</h3>
                  <StatusBadge status={ca.status} />
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted">{ca.kind === "nav-update" ? "NAV update" : fmt.sentence(ca.kind)} · effective {fmt.date(ca.effectiveDate)}</div>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2.5">
              {assetOf(ca.assetId) && <AssetThumb asset={assetOf(ca.assetId)!} className="h-7 w-10 rounded-md" />}
              <span className="truncate text-[12.5px] font-medium">{assetName(ca.assetId)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted" title={ca.detail}>{ca.detail}</p>
            {ca.votes && <VoteTally votes={ca.votes} />}
            {ca.kind === "vote" && ca.status === "open" && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="mr-1 text-[12.5px] text-muted">Cast vote</span>
                {(["for", "against", "abstain"] as const).map((c) => {
                  const btn = (
                    <Button
                      key={c}
                      size="sm"
                      variant={c === "for" ? "tonal" : "secondary"}
                      disabled={readOnly || (vote.isPending && vote.variables?.id === ca.id)}
                      isLoading={vote.isPending && vote.variables?.id === ca.id && vote.variables?.choice === c}
                      onClick={() => vote.mutate({ id: ca.id, choice: c })}
                    >
                      {c === "for" ? "Vote for" : c === "against" ? "Vote against" : "Abstain"}
                    </Button>
                  );
                  return readOnly ? <Tip key={c} content={`The ${ROLE_META[persona.role].label} role has read-only access.`}><span tabIndex={0}>{btn}</span></Tip> : btn;
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function VoteTally({ votes }: { votes: NonNullable<D.CorporateAction["votes"]> }) {
  const turnout = votes.for + votes.against + votes.abstain;
  const met = turnout >= votes.quorumPct;
  const parts = [
    { k: "For", v: votes.for, cls: "bg-success" },
    { k: "Against", v: votes.against, cls: "bg-danger" },
    { k: "Abstain", v: votes.abstain, cls: "bg-subtle" },
  ];
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-muted">Turnout <span className="font-medium tabular text-foreground">{fmt.pct(turnout)}</span> of supply</span>
        <Badge tone={met ? "success" : "warning"}>{met ? "Quorum met" : `Quorum ${fmt.pct(votes.quorumPct, 0)} not met`}</Badge>
      </div>
      <div className="relative pb-5 pt-1">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`For ${votes.for}%, against ${votes.against}%, abstain ${votes.abstain}%, quorum ${votes.quorumPct}%`}>
          {parts.map((p) => <div key={p.k} className={cn("h-full transition-[width] duration-500", p.cls)} style={{ width: `${Math.min(100, p.v)}%` }} />)}
        </div>
        <div className="absolute top-0 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${votes.quorumPct}%` }} aria-hidden />
        <span className="absolute top-[20px] -translate-x-1/2 whitespace-nowrap text-[11px] text-muted" style={{ left: `${votes.quorumPct}%` }} aria-hidden>Quorum {fmt.pct(votes.quorumPct, 0)}</span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {parts.map((p) => (
          <li key={p.k} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", p.cls)} aria-hidden />
            <span className="text-muted">{p.k}</span>
            <span className="font-medium tabular">{fmt.pct(p.v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------ NAV ---------------------------------- */

function NavPanel() {
  const { data, isPending, error, refetch } = useAssets();
  const live = (data ?? []).filter((a) => a.status === "live");
  if (error && !data) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending) return <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>;
  if (!live.length) return <Card><EmptyState icon={<LineChart />} title="No live products" description="Valuation appears once a product is launched." action={<Button asChild size="sm"><Link href="/assets">Open asset registry</Link></Button>} /></Card>;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {live.map((a) => {
        const hist = [...a.navHistory].sort((x, y) => x.date.localeCompare(y.date));
        const first = hist[0]?.nav;
        const lastNav = hist[hist.length - 1]?.nav;
        const change = first && lastNav ? ((lastNav - first) / first) * 100 : 0;
        return (
          <Card key={a.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
              <AssetThumb asset={a} className="h-10 w-14" />
              <div className="min-w-0">
                <Link href={`/assets/${a.id}`} className="block truncate text-[14px] font-semibold hover:underline">{a.name}</Link>
                <div className="text-[12px] text-muted">{TEMPLATE_META[a.template].label}</div>
              </div>
              </div>
              <Badge tone="outline">{fmt.sentence(a.valuation.frequency)}</Badge>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-[12px] text-muted">NAV per token</div>
                <div className="text-[24px] font-semibold tracking-tight tabular">{fmt.money(a.valuation.navPerToken, a.valuation.currency, { digits: a.valuation.navPerToken < 10 ? 4 : 2 })}</div>
              </div>
              {hist.length > 1 && <span className={cn("pb-1 text-[12.5px] font-medium tabular", change >= 0 ? "text-success" : "text-danger")}>{change >= 0 ? "+" : ""}{fmt.pct(change, 2)}</span>}
            </div>
            <div className="mt-2">
              {hist.length > 1 ? <Sparkline data={hist} dataKey="nav" height={48} /> : <div className="grid h-12 place-items-center rounded-lg bg-surface-2 text-[12px] text-muted">One valuation point so far</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-[12px]">
              <div className="col-span-2 min-w-0"><dt className="text-muted">Method</dt><dd className="truncate font-medium" title={a.valuation.method}>{a.valuation.method}</dd></div>
              <div className="min-w-0"><dt className="text-muted">Source</dt><dd className="flex min-w-0 items-center gap-1.5 font-medium"><CompanyLogo name={a.valuation.oracle ?? a.servicer} size={16} className="rounded-full" /><span className="truncate" title={a.valuation.oracle ?? `${a.servicer} strike`}>{a.valuation.oracle ?? "Servicer strike"}</span></dd></div>
              <div className="min-w-0"><dt className="text-muted">Last updated</dt><dd className="font-medium" title={fmt.dateTime(a.valuation.lastUpdated)}>{fmt.relative(a.valuation.lastUpdated)}</dd></div>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

export default function ServicingPage() {
  return (
    <React.Suspense>
      <ServicingView />
    </React.Suspense>
  );
}
