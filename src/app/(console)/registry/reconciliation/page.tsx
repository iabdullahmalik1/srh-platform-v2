"use client";

import * as React from "react";
import { Blocks, BookOpen, BookUser, Building2, CircleCheck, Clock, History, Landmark, LoaderCircle, Lock, Network, Play, Scale, ShieldCheck, TriangleAlert, Vault, X } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useBreaks, useReconRuns, useResolveBreak, useRunRecon } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Field, PageHeader, Skeleton, Stat, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { RiskBadge, StatusBadge } from "@/components/domain/status";
import { PersonAvatar, PersonName } from "@/components/domain/logos";
import { SourceHub, type HubSource } from "@/components/flows/source-hub";
import { cn, fmt } from "@/lib/utils";

const SOURCES: { key: D.RecordSource; label: string }[] = [
  { key: "blockchain", label: "Blockchain indexer" },
  { key: "transfer-agent", label: "Transfer agent register" },
  { key: "custodian", label: "Custodian statements" },
  { key: "bank", label: "Bank statements" },
  { key: "accounting", label: "General ledger" },
];
const SOURCE_LABEL: Record<D.RecordSource, string> = { blockchain: "Blockchain", "transfer-agent": "Transfer agent", custodian: "Custodian", csd: "CSD", bank: "Bank", accounting: "General ledger" };
const SOURCE_ICON: Record<D.RecordSource, React.ElementType> = { blockchain: Blocks, "transfer-agent": BookUser, custodian: Vault, csd: Building2, bank: Landmark, accounting: BookOpen };
const TYPE_LABEL: Record<D.ReconciliationBreak["type"], string> = {
  "position-mismatch": "Position mismatch",
  "cash-mismatch": "Cash mismatch",
  "unmatched-transfer": "Unmatched transfer",
  "missing-mint": "Missing mint",
  "duplicate-event": "Duplicate event",
  "stale-oracle": "Stale oracle",
};
const SEV_ORDER: Record<D.RiskLevel, number> = { high: 0, medium: 1, low: 2 };

function fmtValue(v: number, unit: D.ReconciliationBreak["unit"]) {
  return unit === "USD" ? fmt.money(v, "USD", { digits: 2 }) : `${fmt.num(v)} tokens`;
}
function fmtDelta(v: number, unit: D.ReconciliationBreak["unit"]) {
  const s = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${s}${unit === "USD" ? fmt.money(Math.abs(v), "USD", { digits: 2 }) : fmt.num(Math.abs(v))}`;
}

export default function ReconciliationPage() {
  const { data: breaks, isPending, error, refetch } = useBreaks();
  const { data: runs, isPending: runsPending, error: runsError, refetch: refetchRuns } = useReconRuns();
  const { data: assets } = useAssets();
  const canResolve = useCan("recon.resolve");
  const run = useRunRecon();
  const [panel, setPanel] = React.useState(false);

  const assetName = React.useCallback((id: string) => assets?.find((a) => a.id === id)?.shortName ?? id, [assets]);
  const open = React.useMemo(() => (breaks ?? []).filter((b) => b.status !== "resolved").sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.detectedAt.localeCompare(a.detectedAt)), [breaks]);
  const resolved = React.useMemo(() => (breaks ?? []).filter((b) => b.status === "resolved"), [breaks]);
  const last = runs?.[0];
  const [focusId, setFocusId] = React.useState<string>();
  const focus = open.find((b) => b.id === focusId) ?? open[0];
  const hubRef = React.useRef<HTMLDivElement>(null);
  const showOnMap = (id: string) => {
    setFocusId(id);
    hubRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  };

  const start = () => {
    setPanel(true);
    run.mutate();
  };

  const runButton = (
    <Button variant="primary" onClick={start} isLoading={run.isPending} loadingText="Reconciling…" disabled={!canResolve}>
      <Play /> Run reconciliation
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Five sources compared. The authoritative source decides."
        actions={canResolve ? runButton : <Tip content="Running reconciliation needs the Operations or Platform admin role. Switch persona from the account menu."><span tabIndex={0}>{runButton}</span></Tip>}
      />

      {panel && <RunPanel pending={run.isPending} result={run.data} failed={run.isError} onClose={() => setPanel(false)} />}

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Open breaks" icon={<Scale />} loading={isPending} value={open.length} sub={breaks ? `${breaks.filter((b) => b.status === "investigating").length} under investigation` : undefined} />
        <Stat label="High severity" icon={<TriangleAlert />} loading={isPending} value={<span className={cn(open.some((b) => b.severity === "high") && "text-danger")}>{open.filter((b) => b.severity === "high").length}</span>} sub="Blocks settlement for the asset" />
        <Stat label="Last run" icon={<Clock />} loading={runsPending} value={last ? <StatusBadge status={last.status} className="h-7 px-3 text-[13px]" /> : "None"} sub={last ? fmt.relative(last.finishedAt) : "No runs recorded"} />
        <Stat label="Records compared, last run" icon={<ShieldCheck />} loading={runsPending} value={last ? fmt.num(last.recordsCompared) : "None"} sub={last ? `${fmt.num(last.matched)} matched` : undefined} />
      </div>

      <div ref={hubRef} className="mb-5 scroll-mt-20">
      <Card className="overflow-hidden">
        <CardHeader
          icon={<Network />}
          title="Source map"
          description={focus ? `${TYPE_LABEL[focus.type]} on ${assetName(focus.assetId)}` : "All sources agree on every live token class."}
          action={focus ? <RiskBadge risk={focus.severity} /> : breaks ? <Badge tone="success" dot>Clean</Badge> : undefined}
        />
        <div className="p-4 sm:p-5">
          {isPending ? <Skeleton className="h-48" /> : <SourceHub sources={hubSources(focus)} center={{ icon: Scale, title: "Reconciliation engine", sub: focus ? `Difference ${fmtValue(focus.difference, focus.unit)}` : last ? `${fmt.num(last.recordsCompared)} records compared` : "Waiting for the first run", aside: focus ? <Badge tone="danger" dot>{fmtValue(focus.difference, focus.unit)}</Badge> : <Badge tone="success" dot>Matched</Badge> }} />}
          {open.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Break shown on the map">
              {open.map((b) => (
                <button
                  key={b.id}
                  role="radio"
                  aria-checked={focus?.id === b.id}
                  onClick={() => setFocusId(b.id)}
                  className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors", focus?.id === b.id ? "border-brand/50 bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted hover:text-foreground")}
                >
                  <span className={cn("size-1.5 rounded-full", b.severity === "high" ? "bg-danger" : b.severity === "medium" ? "bg-warning" : "bg-subtle")} aria-hidden />
                  {TYPE_LABEL[b.type]} · {assetName(b.assetId)}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
      </div>

      <section aria-labelledby="open-breaks" className="mb-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="open-breaks" className="text-[15px] font-semibold">Open breaks</h2>
          {breaks && <span className="text-[12.5px] text-muted">Sorted by severity, then most recent</span>}
        </div>
        {error && !breaks ? (
          <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
        ) : isPending ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
        ) : open.length === 0 ? (
          <Card><EmptyState icon={<CircleCheck />} title="All sources agree" description="There are no open breaks. Run reconciliation again after the next settlement batch." action={canResolve ? <Button size="sm" onClick={start} isLoading={run.isPending}>Run reconciliation</Button> : undefined} /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {open.map((b) => <BreakCard key={b.id} b={b} asset={assetName(b.assetId)} canResolve={canResolve} focused={focus?.id === b.id} onShow={() => showOnMap(b.id)} />)}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader icon={<History />} title="Recent runs" description="Every run compares all live token classes across five sources" />
          <RunsTable runs={runs} loading={runsPending} error={runsError} onRetry={() => refetchRuns()} />
        </Card>
        <Card className="min-w-0">
          <CardHeader icon={<Lock />} title="Resolved breaks" description="Immutable history. Resolutions cannot be edited or deleted." />
          <ResolvedTable rows={breaks ? resolved : undefined} loading={isPending} error={error} onRetry={() => refetch()} assetName={assetName} />
        </Card>
      </div>
    </>
  );
}

/* --------------------------------- source map ------------------------------ */

function hubSources(b?: D.ReconciliationBreak): HubSource[] {
  const keys: D.RecordSource[] = SOURCES.map((s) => s.key);
  if (b && b.values.some((v) => v.source === "csd")) keys.splice(3, 0, "csd");
  const auth = b?.values.find((v) => v.source === b.authoritativeSource);
  return keys.map((k) => {
    const label = SOURCES.find((s) => s.key === k)?.label ?? SOURCE_LABEL[k];
    const v = b?.values.find((x) => x.source === k);
    if (!b) return { key: k, label, icon: SOURCE_ICON[k], state: "agrees", edge: "Agrees", value: "Matched" };
    if (!v) return { key: k, label, icon: SOURCE_ICON[k], state: "idle", value: <span className="text-[12px] font-normal text-muted">Not in scope</span>, tip: `${SOURCE_LABEL[k]} does not hold this record.` };
    if (k === b.authoritativeSource) return { key: k, label, icon: SOURCE_ICON[k], state: "authoritative", value: fmtValue(v.value, b.unit), edge: "Authoritative", tip: `${SOURCE_LABEL[k]} is the authoritative record for this break.` };
    const delta = auth ? v.value - auth.value : 0;
    return { key: k, label, icon: SOURCE_ICON[k], state: delta === 0 ? "agrees" : "break", value: fmtValue(v.value, b.unit), edge: delta === 0 ? "Agrees" : fmtDelta(delta, b.unit) };
  });
}

/* --------------------------------- run panel ------------------------------- */

function RunPanel({ pending, result, failed, onClose }: { pending: boolean; result?: D.ReconciliationRun; failed: boolean; onClose: () => void }) {
  // The panel ticks through each source at a readable pace. While the request is
  // in flight it holds on the last source; once the result arrives it finishes.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (pending) setTick(0);
  }, [pending]);
  React.useEffect(() => {
    if (failed) return;
    const cap = pending ? SOURCES.length - 1 : SOURCES.length;
    if (tick >= cap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setTick((n) => n + 1), reduce ? 30 : 420);
    return () => clearTimeout(t);
  }, [tick, pending, failed]);
  const doneCount = tick;
  const running = !failed && tick < SOURCES.length;

  return (
    <Card className="mb-5 overflow-hidden animate-enter" role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h3 className="text-[14px] font-semibold">{running ? "Reconciliation in progress" : failed ? "Reconciliation did not finish" : "Reconciliation complete"}</h3>
          <p className="text-[12.5px] text-muted">
            {running
              ? "Pulling records from each source and matching positions and cash."
              : failed
                ? "One of the sources did not respond. Run reconciliation again."
                : result
                  ? `${fmt.num(result.recordsCompared)} records compared, ${fmt.num(result.matched)} matched, ${result.breaks} open break${result.breaks === 1 ? "" : "s"}.`
                  : "Done."}
          </p>
        </div>
        {!running && <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close run summary"><X /></Button>}
      </div>
      <ol className="grid grid-cols-1 gap-px bg-border sm:grid-cols-5">
        {SOURCES.map((s, i) => {
          const state = i < doneCount ? "done" : failed && i === doneCount ? "failed" : i === doneCount && running ? "active" : "waiting";
          return (
            <li key={s.key} className={cn("flex items-center gap-2.5 bg-surface px-4 py-3 transition-colors duration-300", state === "done" && "bg-success-soft/50")}>
              {(() => { const Icon = SOURCE_ICON[s.key]; return <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300", state === "done" ? "bg-success text-white" : state === "active" ? "bg-brand-soft text-brand-ink" : state === "failed" ? "bg-danger-soft text-danger" : "bg-surface-3 text-subtle")}><Icon className="size-4" aria-hidden />{state === "active" && <LoaderCircle className="absolute -right-1 -top-1 size-3.5 animate-spin rounded-full bg-surface text-brand" aria-hidden />}{state === "done" && <CircleCheck className="absolute -right-1 -top-1 size-3.5 rounded-full bg-surface text-success" aria-hidden />}{state === "failed" && <TriangleAlert className="absolute -right-1 -top-1 size-3.5 rounded-full bg-surface text-danger" aria-hidden />}</span>; })()}
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-medium">{s.label}</div>
                <div className="text-[11.5px] text-muted">{state === "done" ? "Matched" : state === "active" ? "Comparing…" : state === "failed" ? "No response" : "Waiting"}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/* --------------------------------- break card ------------------------------ */

function BreakCard({ b, asset, canResolve, focused, onShow }: { b: D.ReconciliationBreak; asset: string; canResolve: boolean; focused?: boolean; onShow: () => void }) {
  const auth = b.values.find((v) => v.source === b.authoritativeSource);
  const resolveBtn = <ResolveDialog b={b} disabled={!canResolve} />;
  return (
    <Card className={cn("flex flex-col transition-shadow", b.severity === "high" && "border-danger/30", focused && "ring-2 ring-brand/25")}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">{TYPE_LABEL[b.type]}</span>
            <RiskBadge risk={b.severity} />
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">{asset} · <span className="font-mono">{b.id}</span></div>
        </div>
        <div className="flex items-center gap-1.5">
          <Tip content="Show on the source map"><Button size="icon-sm" variant="ghost" onClick={onShow} aria-label="Show on the source map"><Network /></Button></Tip>
          {canResolve ? resolveBtn : <Tip content="Resolving breaks needs the Operations or Platform admin role. Switch persona from the account menu."><span tabIndex={0}>{resolveBtn}</span></Tip>}
        </div>
      </div>
      <p className="px-5 pt-2 text-[13px] leading-relaxed">{b.description}</p>
      <div className="mt-3 px-5">
        <ul className="flex flex-wrap gap-2">
          {b.values.map((v) => {
            const isAuth = v.source === b.authoritativeSource;
            const delta = auth ? v.value - auth.value : 0;
            return (
              <li key={v.source} className={cn("min-w-0 rounded-lg border px-3 py-2", isAuth ? "border-info/50 bg-info-soft" : delta !== 0 ? "border-danger/30 bg-danger-soft/40" : "border-border bg-surface-2")}>
                <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  {(() => { const Icon = SOURCE_ICON[v.source]; return <Icon className="size-3.5" aria-hidden />; })()}
                  {SOURCE_LABEL[v.source]}
                  {isAuth && <Badge tone="info" className="h-[18px] px-1.5 text-[10.5px]">Authoritative</Badge>}
                </div>
                <div className="mt-0.5 text-[13px] font-medium tabular">{fmtValue(v.value, b.unit)}</div>
                {!isAuth && <div className={cn("text-[11.5px] tabular", delta !== 0 ? "text-danger" : "text-success")}>{delta !== 0 ? fmtDelta(delta, b.unit) : "Agrees"}</div>}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-auto pt-4">
        <dl className="grid grid-cols-3 gap-3 border-t border-border px-5 py-3 text-[12px]">
          <div className="min-w-0"><dt className="text-muted">Difference</dt><dd className="mt-0.5 truncate font-medium tabular text-danger">{fmtValue(b.difference, b.unit)}</dd></div>
          <div className="min-w-0"><dt className="text-muted">Detected</dt><dd className="mt-0.5 truncate font-medium" title={fmt.dateTime(b.detectedAt)}>{fmt.relative(b.detectedAt)}</dd></div>
          <div className="min-w-0"><dt className="text-muted">Assignee</dt><dd className="mt-0.5 flex min-w-0 items-center gap-1.5 font-medium">{b.assignee ? <><PersonAvatar name={b.assignee} size={18} /><span className="truncate">{b.assignee}</span></> : <span className="text-muted">Unassigned</span>}</dd></div>
        </dl>
      </div>
    </Card>
  );
}

function ResolveDialog({ b, disabled }: { b: D.ReconciliationBreak; disabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const resolve = useResolveBreak();
  const submit = () => {
    if (note.trim().length < 10) return setErr("Describe the resolution in at least 10 characters. It becomes part of the immutable history.");
    resolve.mutate({ id: b.id, resolution: note.trim() }, { onSuccess: () => { setOpen(false); setNote(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}><CircleCheck /> Resolve</Button>
      <DialogContent
        title={`Resolve ${TYPE_LABEL[b.type].toLowerCase()}`}
        description={`Authoritative source: ${SOURCE_LABEL[b.authoritativeSource]}. The resolution is stored with the break and cannot be changed later.`}
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Keep open</Button></DialogClose>
            <Button variant="primary" onClick={submit} isLoading={resolve.isPending} loadingText="Resolving…">Resolve break</Button>
          </>
        }
      >
        <p className="mb-4 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] text-muted">{b.description}</p>
        <Field label="Resolution note" htmlFor={`res-${b.id}`} error={err} required hint="Say what was corrected, in which system, and the reference.">
          <Textarea
            id={`res-${b.id}`}
            value={note}
            aria-invalid={!!err}
            onChange={(e) => { setNote(e.target.value); setErr(undefined); }}
            placeholder="Burned 2,000 WPKS on Polygon to match the transfer agent register, tx 0x…"
          />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- tables --------------------------------- */

function RunsTable({ runs, loading, error, onRetry }: { runs?: D.ReconciliationRun[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const columns: Column<D.ReconciliationRun>[] = [
    { key: "started", header: "Started", cell: (r) => <span title={fmt.dateTime(r.startedAt)}>{fmt.dateTime(r.startedAt)}</span>, sort: (r) => r.startedAt },
    { key: "duration", header: "Duration", align: "right", cell: (r) => `${Math.max(1, Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000))} s`, hideBelow: "md" },
    { key: "compared", header: "Compared", align: "right", cell: (r) => fmt.num(r.recordsCompared), sort: (r) => r.recordsCompared, hideBelow: "sm" },
    { key: "matched", header: "Matched", align: "right", cell: (r) => fmt.num(r.matched), sort: (r) => r.matched, hideBelow: "lg" },
    { key: "breaks", header: "Breaks", align: "right", cell: (r) => <span className={cn(r.breaks > 0 && "font-medium text-warning")}>{r.breaks}</span>, sort: (r) => r.breaks },
    { key: "status", header: "Result", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <DataTable
      rows={runs}
      columns={columns}
      getRowId={(r) => r.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pageSize={8}
      defaultSort={{ key: "started", dir: "desc" }}
      caption="Reconciliation runs"
      empty={{ icon: <History />, title: "No runs yet", description: "Run reconciliation to compare all sources for the first time." }}
    />
  );
}

function ResolvedTable({ rows, loading, error, onRetry, assetName }: { rows?: D.ReconciliationBreak[]; loading: boolean; error: unknown; onRetry: () => void; assetName: (id: string) => string }) {
  const columns: Column<D.ReconciliationBreak>[] = [
    { key: "break", header: "Break", cell: (b) => <div className="min-w-0"><div className="font-medium">{TYPE_LABEL[b.type]}</div><div className="text-[12px] text-muted">{assetName(b.assetId)} · {fmtValue(b.difference, b.unit)}</div></div>, sort: (b) => b.type },
    { key: "resolution", header: "Resolution", cell: (b) => <p className="max-w-[340px] whitespace-normal text-[12.5px] text-muted">{b.resolution ?? "No note recorded"}</p>, className: "py-2.5" },
    { key: "by", header: "Resolved by", cell: (b) => (b.assignee ? <PersonName name={b.assignee} size={24} /> : <span className="inline-flex items-center gap-1.5 text-muted"><ShieldCheck className="size-4" aria-hidden />System</span>), hideBelow: "lg" },
    { key: "resolved", header: "Resolved", align: "right", cell: (b) => <span className="text-muted" title={b.resolvedAt ? fmt.dateTime(b.resolvedAt) : undefined}>{b.resolvedAt ? fmt.relative(b.resolvedAt) : "Unknown"}</span>, sort: (b) => b.resolvedAt ?? "", hideBelow: "sm" },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(b) => b.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      pageSize={8}
      defaultSort={{ key: "resolved", dir: "desc" }}
      caption="Resolved breaks"
      empty={{ icon: <Lock />, title: "No resolved breaks yet", description: "Resolved breaks are kept here permanently with their resolution note." }}
    />
  );
}
