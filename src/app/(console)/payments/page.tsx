"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpen,
  CalendarClock,
  CircleCheck,
  Clock,
  Coins,
  Cpu,
  Globe,
  Landmark,
  Link2,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import type * as D from "@/types/domain";
import { useLedger, usePayments } from "@/hooks/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, Input, KeyValue, NativeSelect, PageHeader, Segmented, Skeleton, Stat, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { BarList, SERIES } from "@/components/domain/charts";
import { Money, RailBadge, StatusBadge } from "@/components/domain/status";
import { CompanyLogo, CompanyName, RailLogo } from "@/components/domain/logos";
import { SrhMark } from "@/components/brand/srh-logo";
import { Fact, FlowJoin, FlowLine, FlowNode, InfoTip } from "@/components/flows/flow";
import { AsyncDiagram, AtomicDiagram, DvpDiagram, LegLegend } from "@/components/flows/settlement";
import { DebitCredit } from "@/components/flows/ledger";
import { Party, PartyMark, useParties, type PartyIndex } from "@/components/flows/party";
import { RAIL_META, STAGE_META } from "@/lib/constants";
import { cn, fmt, groupBy, sum } from "@/lib/utils";
import { toUsd, withinDays } from "./_lib";

type Direction = "all" | "inbound" | "outbound";
type Tab = "payments" | "rails" | "ledger" | "models";
const TABS: Tab[] = ["payments", "rails", "ledger", "models"];
const STATUSES: D.Payment["status"][] = ["instructed", "pending", "confirmed", "reconciled", "failed", "returned"];

function PaymentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "payments";
  const { data: payments, isPending, error, refetch } = usePayments();

  const setTab = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v === "payments") next.delete("tab");
    else next.set("tab", v);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const stats = React.useMemo(() => {
    const p = payments ?? [];
    const settled = (x: D.Payment) => x.status === "confirmed" || x.status === "reconciled";
    const inbound30 = p.filter((x) => x.direction === "inbound" && settled(x) && withinDays(x.confirmedAt ?? x.createdAt, 30));
    const pendingIn = p.filter((x) => x.direction === "inbound" && (x.status === "pending" || x.status === "instructed"));
    const dist90 = p.filter((x) => x.direction === "outbound" && x.purpose === "distribution" && withinDays(x.createdAt, 90));
    const settledAll = p.filter(settled);
    const totalSettled = sum(settledAll, (x) => toUsd(x.amount, x.currency));
    const digital = sum(settledAll.filter((x) => RAIL_META[x.rail].kind === "digital"), (x) => toUsd(x.amount, x.currency));
    return {
      inbound30: sum(inbound30, (x) => toUsd(x.amount, x.currency)),
      inbound30n: inbound30.length,
      pendingIn: sum(pendingIn, (x) => toUsd(x.amount, x.currency)),
      pendingInN: pendingIn.length,
      dist90: sum(dist90, (x) => toUsd(x.amount, x.currency)),
      dist90n: dist90.length,
      digitalShare: totalSettled ? (digital / totalSettled) * 100 : 0,
    };
  }, [payments]);

  return (
    <>
      <PageHeader title="Payments and settlement" description="Fiat and digital rails, one orchestrator, one ledger." />

      {error && !payments ? null : (
        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat label="Inbound confirmed, 30 days" icon={<ArrowDownLeft />} loading={isPending} value={fmt.money(stats.inbound30, "USD", { compact: true })} sub={`${stats.inbound30n} payments · USD equivalent`} />
          <Stat label="Pending inbound" icon={<Timer />} loading={isPending} value={fmt.money(stats.pendingIn, "USD", { compact: true })} sub={`${stats.pendingInN} awaiting funds`} />
          <Stat label="Distributions paid, 90 days" icon={<ArrowUpRight />} loading={isPending} value={fmt.money(stats.dist90, "USD", { compact: true })} sub={`${stats.dist90n} outbound runs`} />
          <Stat label="Settled on digital rails" icon={<Zap />} loading={isPending} value={fmt.pct(stats.digitalShare)} sub="Share of settled value" />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="payments" count={payments?.length}>Payments</TabsTrigger>
          <TabsTrigger value="rails">Rails</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="models">Settlement models</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <PaymentsTable payments={payments} loading={isPending} error={error} onRetry={() => refetch()} />
        </TabsContent>
        <TabsContent value="rails">
          <RailsPanel payments={payments} loading={isPending} error={error} onRetry={() => refetch()} />
        </TabsContent>
        <TabsContent value="ledger">
          <LedgerPanel />
        </TabsContent>
        <TabsContent value="models">
          <SettlementModels />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* --------------------------------- payments -------------------------------- */

function DirectionCell({ d }: { d: D.Payment["direction"] }) {
  return d === "inbound" ? (
    <span className="inline-flex items-center gap-1.5"><span className="grid size-5 place-items-center rounded-full bg-success-soft"><ArrowDownLeft className="size-3.5 text-success" aria-hidden /></span> Inbound</span>
  ) : (
    <span className="inline-flex items-center gap-1.5"><span className="grid size-5 place-items-center rounded-full bg-info-soft"><ArrowUpRight className="size-3.5 text-info" aria-hidden /></span> Outbound</span>
  );
}

function PaymentsTable({ payments, loading, error, onRetry }: { payments?: D.Payment[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const [direction, setDirection] = React.useState<Direction>("all");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<D.Payment | null>(null);
  const parties = useParties();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (payments ?? []).filter((p) => {
      if (direction !== "all" && p.direction !== direction) return false;
      if (status && p.status !== status) return false;
      if (q && !`${p.reference} ${p.counterparty} ${p.orderId ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, direction, status, search]);

  const counts = React.useMemo(() => {
    const p = payments ?? [];
    return { all: p.length, inbound: p.filter((x) => x.direction === "inbound").length, outbound: p.filter((x) => x.direction === "outbound").length };
  }, [payments]);

  const columns: Column<D.Payment>[] = [
    { key: "reference", header: "Reference", cell: (p) => <span className="font-mono text-[12.5px] font-medium">{p.reference}</span>, sort: (p) => p.reference },
    { key: "direction", header: "Direction", cell: (p) => <DirectionCell d={p.direction} />, sort: (p) => p.direction, hideBelow: "sm" },
    { key: "purpose", header: "Purpose", cell: (p) => fmt.sentence(p.purpose), sort: (p) => p.purpose, hideBelow: "md" },
    { key: "counterparty", header: "Counterparty", cell: (p) => <Party name={p.counterparty} parties={parties} size={26} className="max-w-[230px]" />, sort: (p) => p.counterparty, hideBelow: "lg" },
    {
      key: "rail",
      header: "Rail",
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <RailBadge rail={p.rail} />
          <Tip content={p.bank}><span className="inline-flex"><CompanyLogo name={p.bank} size={20} /></span></Tip>
        </span>
      ),
      sort: (p) => p.rail,
      hideBelow: "md",
    },
    { key: "amount", header: "Amount", align: "right", cell: (p) => <Money value={p.amount} currency={p.currency} />, sort: (p) => toUsd(p.amount, p.currency) },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} />, sort: (p) => p.status },
    { key: "created", header: "Created", align: "right", cell: (p) => <span className="text-muted">{fmt.relative(p.createdAt)}</span>, sort: (p) => p.createdAt, hideBelow: "xl" },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Direction>
          value={direction}
          onChange={setDirection}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "inbound", label: <><ArrowDownLeft className="size-3.5 text-success" aria-hidden />Inbound</>, count: counts.inbound },
            { value: "outbound", label: <><ArrowUpRight className="size-3.5 text-info" aria-hidden />Outbound</>, count: counts.outbound },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search payments" placeholder="Reference, counterparty or order" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <NativeSelect aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{fmt.sentence(s)}</option>)}
          </NativeSelect>
        </div>
      </div>
      <DataTable
        rows={payments ? filtered : undefined}
        columns={columns}
        getRowId={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={setSelected}
        defaultSort={{ key: "created", dir: "desc" }}
        caption="Payments"
        empty={{ icon: <Banknote />, title: "No payments match these filters", description: "Change the direction or status filter, or clear the search.", action: <Button size="sm" onClick={() => { setDirection("all"); setStatus(""); setSearch(""); }}>Clear filters</Button> }}
      />
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && <PaymentSheet p={selected} parties={parties} />}
      </Dialog>
    </Card>
  );
}

/** Route of one payment: who pays, over which rail and bank, to whom. */
function RouteStrip({ p, parties }: { p: D.Payment; parties: PartyIndex }) {
  const party = { mark: <PartyMark name={p.counterparty} parties={parties} size={36} className="rounded-full" />, label: p.counterparty };
  const rail = { mark: <span className="grid size-9 place-items-center rounded-full bg-surface ring-1 ring-border"><RailLogo rail={p.rail} size={26} /></span>, label: RAIL_META[p.rail].label };
  const bank = { mark: <CompanyLogo name={p.bank} size={36} />, label: p.bank };
  const srh = { mark: <span className="grid size-9 place-items-center rounded-[9px] bg-white ring-1 ring-border"><SrhMark size={24} /></span>, label: "SRH ledger" };
  const steps = p.direction === "inbound" ? [party, rail, bank, srh] : [srh, bank, rail, party];
  const failed = p.status === "failed" || p.status === "returned";
  return (
    <div className="mb-5 flex items-start" role="img" aria-label={steps.map((s) => s.label).join(" to ")}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-[76px]">
            {s.mark}
            <span className="line-clamp-2 text-[11px] leading-tight text-muted">{s.label}</span>
          </div>
          {i < steps.length - 1 && <FlowLine tone={failed ? "danger" : "brand"} pulse={!failed} delay={i * 0.3} arrow className="mt-1.5 min-w-3 flex-1" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function PaymentSheet({ p, parties }: { p: D.Payment; parties: PartyIndex }) {
  const steps = [
    { label: "Instructed", at: p.createdAt, done: true },
    { label: "Funds confirmed", at: p.confirmedAt, done: ["confirmed", "reconciled"].includes(p.status) },
    { label: "Reconciled to ledger", at: undefined as string | undefined, done: p.status === "reconciled" },
  ];
  const failed = p.status === "failed" || p.status === "returned";
  return (
    <SheetContent
      title={<span className="font-mono">{p.reference}</span>}
      description={<span className="flex flex-wrap items-center gap-2"><DirectionCell d={p.direction} /><span aria-hidden>·</span>{fmt.sentence(p.purpose)}<StatusBadge status={p.status} /></span>}
    >
      <RouteStrip p={p} parties={parties} />

      <div className="mb-5 rounded-xl border border-border bg-surface-2 p-4">
        <div className="text-[12px] text-muted">Amount</div>
        <div className="mt-0.5 text-[26px] font-semibold tracking-tight"><Money value={p.amount} currency={p.currency} digits={2} /></div>
        {p.currency !== "USD" && <div className="text-[12px] text-muted tabular">About {fmt.money(toUsd(p.amount, p.currency), "USD")} at indicative rates</div>}
      </div>

      <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Payment progress">
        {steps.map((s, i) => {
          const stuck = failed && i === 1;
          return (
            <li key={s.label} className={cn("rounded-lg border px-2.5 py-2", s.done ? "border-success/30 bg-success-soft" : stuck ? "border-danger/30 bg-danger-soft" : "border-border bg-surface")}>
              <span className="flex items-center gap-1.5 text-[12px] font-medium">
                {s.done ? <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden /> : <Clock className={cn("size-3.5 shrink-0", stuck ? "text-danger" : "text-subtle")} aria-hidden />}
                <span className="truncate">{s.label}</span>
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-muted tabular">{s.at ? fmt.dateTime(s.at) : s.done ? "Done" : stuck ? fmt.sentence(p.status) : "Waiting"}</span>
            </li>
          );
        })}
      </ol>

      <KeyValue
        items={[
          { label: "Rail", value: <span className="inline-flex items-center gap-2"><RailBadge rail={p.rail} /><span className="text-[12px] font-normal text-muted">{RAIL_META[p.rail].eta}</span></span> },
          { label: "Provider", value: <CompanyName name={p.provider} size={22} /> },
          { label: "Counterparty", value: <Party name={p.counterparty} parties={parties} size={22} /> },
          { label: "Bank", value: <CompanyName name={p.bank} size={22} /> },
          { label: "Created", value: fmt.dateTime(p.createdAt) },
          { label: "Confirmed", value: p.confirmedAt ? fmt.dateTime(p.confirmedAt) : "Awaiting funds" },
          ...(p.fxRate ? [{ label: "FX rate", value: <span className="tabular">{p.fxRate}</span> }] : []),
          { label: "Linked order", value: p.orderId ? <Link href={`/orders/${p.orderId}`} className="font-mono text-[12.5px] text-brand-ink hover:underline">{p.orderId}</Link> : <span className="text-muted">None</span> },
          { label: "Payment ID", value: <CopyText value={p.id} display={p.id} /> },
          { label: "On-chain transfer", value: p.txHash ? <CopyText value={p.txHash} /> : <span className="text-muted">{RAIL_META[p.rail].kind === "digital" ? "Pending" : "Not applicable on fiat rails"}</span> },
        ]}
      />
    </SheetContent>
  );
}

/* ----------------------------------- rails --------------------------------- */

const SPEED: { key: string; label: string; icon: React.ElementType; tone: string }[] = [
  { key: "Seconds", label: "Seconds", icon: Zap, tone: "text-success" },
  { key: "Same day", label: "Same day", icon: Clock, tone: "text-info" },
  { key: "T+1", label: "T+1", icon: CalendarClock, tone: "text-warning" },
];
const speedOf = (eta: string) => SPEED.find((s) => s.key === eta) ?? SPEED[2];

function RailsPanel({ payments, loading, error, onRetry }: { payments?: D.Payment[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const byRail = React.useMemo(() => {
    const g = groupBy(payments ?? [], (p) => p.rail);
    return (Object.keys(RAIL_META) as D.PaymentRail[]).map((rail) => {
      const list = g[rail] ?? [];
      const providers = groupBy(list, (p) => p.provider);
      const provider = Object.entries(providers).sort((a, b) => b[1].length - a[1].length)[0]?.[0];
      return { rail, count: list.length, volume: sum(list, (p) => toUsd(p.amount, p.currency)), provider };
    });
  }, [payments]);

  if (error && !payments) return <Card><ErrorState error={error} onRetry={onRetry} /></Card>;

  const used = byRail.filter((r) => r.count > 0).sort((a, b) => b.volume - a.volume);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<Timer />} title="Time to settle" action={<LegendKinds />} />
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {SPEED.map((s) => {
            const rails = (Object.keys(RAIL_META) as D.PaymentRail[]).filter((r) => speedOf(RAIL_META[r].eta).key === s.key);
            return (
              <div key={s.key} className="flex flex-col gap-3 p-4">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold"><s.icon className={cn("size-4", s.tone)} aria-hidden />{s.label}</span>
                <ul className="flex flex-wrap gap-2">
                  {rails.map((r) => (
                    <li key={r}>
                      <Tip content={RAIL_META[r].description}>
                        <span tabIndex={0} className={cn("inline-flex h-8 items-center gap-2 rounded-full border pl-1 pr-3 text-[12.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", RAIL_META[r].kind === "digital" ? "border-info/25 bg-info-soft/60" : "border-border bg-surface-2")}>
                          <RailLogo rail={r} size={22} />
                          {RAIL_META[r].label}
                        </span>
                      </Tip>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="self-start">
          <CardHeader title="Volume by rail" description="All payments, USD equivalent" />
          <CardBody>
            {loading ? <Skeleton className="h-56" /> : used.length ? (
              <BarList items={used.map((r, i) => ({ key: r.rail, label: <span className="inline-flex items-center gap-2"><RailLogo rail={r.rail} size={16} />{RAIL_META[r.rail].label}</span>, value: r.volume, color: SERIES[i % SERIES.length] }))} />
            ) : (
              <EmptyState className="py-8" title="No payment volume yet" description="Volume appears here once the first payment is instructed." />
            )}
          </CardBody>
        </Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
            : byRail.map((r) => {
                const m = RAIL_META[r.rail];
                const sp = speedOf(m.eta);
                const digital = m.kind === "digital";
                return (
                  <Card key={r.rail} className="flex flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", digital ? "bg-info-soft" : "bg-surface-2 ring-1 ring-border")}>
                          <RailLogo rail={r.rail} size={30} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-[14px] font-semibold">{m.label}<InfoTip content={m.description} label={`About ${m.label}`} /></div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Fact icon={sp.icon} tone={sp.key === "Seconds" ? "success" : sp.key === "Same day" ? "info" : "warning"}>{m.eta}</Fact>
                            <Fact icon={digital ? Coins : Landmark}>{digital ? "On-chain" : "Bank rail"}</Fact>
                          </div>
                        </div>
                      </div>
                      <Badge tone={digital ? "info" : "outline"}>{digital ? "Digital" : "Fiat"}</Badge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[12px]">
                      <div><dt className="text-muted">Payments</dt><dd className="mt-0.5 text-[15px] font-semibold tabular text-foreground">{r.count}</dd></div>
                      <div><dt className="text-muted">Volume</dt><dd className="mt-0.5 text-[15px] font-semibold tabular text-foreground">{r.count ? fmt.money(r.volume, "USD", { compact: true }) : "None"}</dd></div>
                    </dl>
                    <div className="mt-3 min-w-0 text-[12.5px]">
                      {r.provider ? <CompanyName name={r.provider} size={22} /> : <span className="text-muted">Not connected for this tenant</span>}
                    </div>
                  </Card>
                );
              })}
        </div>
      </div>
    </div>
  );
}

function LegendKinds() {
  return (
    <span className="hidden items-center gap-3 text-[11.5px] text-muted sm:inline-flex">
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" aria-hidden />Digital</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-border-strong" aria-hidden />Fiat</span>
    </span>
  );
}

/* ---------------------------------- ledger --------------------------------- */

const LEDGER_PAGE = 6;

function LedgerPanel() {
  const { data, isPending, error, refetch } = useLedger();
  const [shown, setShown] = React.useState(LEDGER_PAGE);
  const journals = React.useMemo(() => {
    const g = groupBy(data ?? [], (e) => e.journalId);
    return Object.entries(g)
      .map(([id, lines]) => ({ id, lines, at: lines[0].at, memo: lines[0].memo, ref: lines.find((l) => l.ref)?.ref, currency: lines[0].currency, debit: sum(lines, (l) => l.debit), credit: sum(lines, (l) => l.credit) }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [data]);

  if (error && !data) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending) return <div className="flex flex-col gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  if (!journals.length) return <Card><EmptyState icon={<BookOpen />} title="No journal entries yet" description="Entries are posted when payments settle and tokens are minted." /></Card>;

  const balanced = journals.filter((j) => Math.abs(j.debit - j.credit) < 0.005).length;
  const totalDr = sum(journals, (j) => toUsd(j.debit, j.currency));

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success"><Scale className="size-5" aria-hidden /></span>
          <span>
            <span className="block text-[14px] font-semibold">Debits equal credits</span>
            <span className="block text-[12.5px] text-muted tabular">{journals.length} journals · {data!.length} lines · {fmt.money(totalDr, "USD", { compact: true })} posted</span>
          </span>
        </span>
        <Badge tone={balanced === journals.length ? "success" : "warning"} dot className="ml-auto">{balanced} of {journals.length} balanced</Badge>
      </Card>
      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
      {journals.slice(0, shown).map((j) => {
        const ok = Math.abs(j.debit - j.credit) < 0.005;
        return (
          <Card key={j.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-medium">{j.memo}</span>
                  {j.ref && (j.ref.startsWith("ord_") ? (
                    <Link href={`/orders/${j.ref}`} className="font-mono text-[12px] text-brand-ink hover:underline">{j.ref}</Link>
                  ) : (
                    <span className="font-mono text-[12px] text-muted">{j.ref}</span>
                  ))}
                </div>
                <div className="text-[12px] text-muted"><span className="font-mono">{j.id}</span> · {fmt.dateTime(j.at)}</div>
              </div>
              <Badge tone={ok ? "success" : "danger"} dot>{ok ? "Balanced" : "Out of balance"}</Badge>
            </div>
            <DebitCredit lines={j.lines} />
          </Card>
        );
      })}
      </div>
      {shown < journals.length && (
        <Button variant="secondary" className="self-center" onClick={() => setShown((n) => n + LEDGER_PAGE)}>
          Show more journals <span className="text-muted tabular">({journals.length - shown})</span>
        </Button>
      )}
    </div>
  );
}

/* ----------------------------- settlement models --------------------------- */

const MODELS = [
  {
    key: "dvp",
    title: "Delivery versus payment",
    line: "Both legs release together, or neither does.",
    detail: "Tokens are delivered only when payment is confirmed, and payment is released only when delivery is certain. Used when cash arrives on a fiat rail and tokens move on-chain.",
    diagram: DvpDiagram,
    facts: [
      { icon: Timer, text: "Minutes to T+1", tone: "info" as const },
      { icon: ShieldCheck, text: "No principal risk", tone: "success" as const },
      { icon: Landmark, text: "Fiat or digital cash", tone: "muted" as const },
    ],
  },
  {
    key: "atomic",
    title: "Atomic on-chain",
    line: "One transaction swaps cash and token.",
    detail: "Both legs are on-chain and settle in a single transaction. If either transfer fails, the whole transaction reverts. Needs a stablecoin or tokenised deposit on the same chain as the token.",
    diagram: AtomicDiagram,
    facts: [
      { icon: Zap, text: "Final in seconds", tone: "success" as const },
      { icon: ShieldCheck, text: "Reverts as a whole", tone: "success" as const },
      { icon: Link2, text: "Same-chain cash", tone: "muted" as const },
    ],
  },
  {
    key: "async",
    title: "Asynchronous",
    line: "Cash first, units later, matched afterwards.",
    detail: "Used for cross-border wires, cut-off times and products that strike NAV after the dealing deadline. Each leg is tracked and reconciled separately.",
    diagram: AsyncDiagram,
    facts: [
      { icon: CalendarClock, text: "T+1 or later", tone: "warning" as const },
      { icon: Scale, text: "Reconciled after", tone: "info" as const },
      { icon: Globe, text: "Cross-border, NAV funds", tone: "muted" as const },
    ],
  },
];

const STAGE_ICON: Partial<Record<D.OrderStage, React.ElementType>> = { submitted: Banknote, "payment-confirmed": CircleCheck, settled: Lock, minted: Cpu };

function SettlementModels() {
  const flow: D.OrderStage[] = ["submitted", "payment-confirmed", "settled", "minted"];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><LegLegend /></div>
      <div className="-mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {MODELS.map((m) => (
          <Card key={m.key} className="flex flex-col overflow-hidden">
            <div className="border-b border-border bg-surface-2 px-4 pb-2 pt-3">
              <m.diagram />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{m.title}</h3>
                <InfoTip content={m.detail} label={`About ${m.title}`} />
              </div>
              <p className="mt-1 text-[13px] text-muted">{m.line}</p>
              <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {m.facts.map((f) => <li key={f.text}><Fact icon={f.icon} tone={f.tone}>{f.text}</Fact></li>)}
              </ul>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Separate lifecycle stages" description="Each stage has its own state, owner and audit record." />
        <CardBody>
          <ol className="flex flex-col lg:flex-row lg:items-stretch">
            {flow.map((s, i) => (
              <React.Fragment key={s}>
                <li className="min-w-0 lg:flex-1">
                  <FlowNode icon={STAGE_ICON[s] ?? Banknote} title={STAGE_META[s].label} sub={STAGE_META[s].system} tip={STAGE_META[s].description} tone={i === flow.length - 1 ? "primary" : "muted"} className="h-full" />
                </li>
                {i < flow.length - 1 && <li aria-hidden className="flex justify-center"><FlowJoin delay={i * 0.3} /></li>}
              </React.Fragment>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <React.Suspense>
      <PaymentsView />
    </React.Suspense>
  );
}
