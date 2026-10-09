"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, CircleCheck, Flag as FlagIcon, ShieldAlert, Siren, TriangleAlert, Search, ArrowUpFromLine } from "lucide-react";
import type * as D from "@/types/domain";
import { useAlerts, useResolveAlert } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, Field, Input, KeyValue, PageHeader, Segmented, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { StatusBadge } from "@/components/domain/status";
import { CompanyLogo, CompanyName, PersonName } from "@/components/domain/logos";
import { IconTile, MetricTile, PartyAvatar, ProgressRing } from "@/components/visual/bits";
import { ALERT_ICON } from "@/components/visual/icons";
import { cn, fmt } from "@/lib/utils";

type StatusFilter = "all" | D.ScreeningAlert["status"];

const TYPE_LABEL: Record<D.AlertType, string> = {
  sanctions: "Sanctions",
  pep: "PEP",
  "adverse-media": "Adverse media",
  "wallet-risk": "Wallet risk",
  "transaction-monitoring": "Transaction monitoring",
};

function SeverityBadge({ severity }: { severity: D.RiskLevel }) {
  return <Badge tone={severity === "high" ? "danger" : severity === "medium" ? "warning" : "neutral"} dot>{fmt.sentence(severity)}</Badge>;
}

function MatchScore({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <span className={cn("absolute inset-y-0 left-0 rounded-full", score >= 85 ? "bg-danger" : score >= 60 ? "bg-warning" : "bg-info")} style={{ width: `${score}%` }} />
      </span>
      <span className="w-7 text-right text-[12.5px] font-medium tabular">{score}</span>
    </span>
  );
}

export default function ScreeningPage() {
  const { data, isPending, error, refetch } = useAlerts();
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = data?.find((a) => a.id === selectedId) ?? null;

  const stats = React.useMemo(() => {
    const a = data ?? [];
    const cutoff = Date.now() - 30 * 86_400_000;
    return {
      open: a.filter((x) => x.status === "open").length,
      escalated: a.filter((x) => x.status === "escalated").length,
      high: a.filter((x) => x.severity === "high" && (x.status === "open" || x.status === "escalated")).length,
      cleared: a.filter((x) => x.status === "cleared" && new Date(x.resolvedAt ?? x.createdAt).getTime() >= cutoff).length,
    };
  }, [data]);

  const searched = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((a) => !q || `${a.investorName} ${a.summary} ${a.provider} ${a.id}`.toLowerCase().includes(q));
  }, [data, search]);
  const rows = React.useMemo(() => searched.filter((a) => status === "all" || a.status === status), [searched, status]);
  const count = (s: D.ScreeningAlert["status"]) => searched.filter((a) => a.status === s).length;

  const columns: Column<D.ScreeningAlert>[] = [
    {
      key: "investor",
      header: "Investor",
      sort: (a) => a.investorName,
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-3">
          <PartyAvatar name={a.investorName} size={34} />
          <span className="min-w-0">
            <span className="block max-w-[240px] truncate font-medium">{a.investorName}</span>
            <span className="block max-w-[240px] truncate text-[12px] text-muted">{a.summary}</span>
          </span>
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (a) => { const Icon = ALERT_ICON[a.type]; return <span className="inline-flex items-center gap-2"><Icon className="size-4 shrink-0 text-muted" aria-hidden />{TYPE_LABEL[a.type]}</span>; }, sort: (a) => a.type, hideBelow: "md" },
    { key: "severity", header: "Severity", cell: (a) => <SeverityBadge severity={a.severity} />, sort: (a) => ({ low: 0, medium: 1, high: 2 })[a.severity] },
    { key: "score", header: "Match score", cell: (a) => <MatchScore score={a.matchScore} />, sort: (a) => a.matchScore, hideBelow: "sm" },
    { key: "provider", header: "Provider", cell: (a) => <Tip content={a.provider}><span tabIndex={0} className="inline-flex rounded-md"><CompanyLogo name={a.provider} size={26} /></span></Tip>, sort: (a) => a.provider, hideBelow: "xl" },
    { key: "status", header: "Status", cell: (a) => <StatusBadge status={a.status} />, sort: (a) => a.status, hideBelow: "sm" },
    { key: "created", header: "Created", align: "right", cell: (a) => <span className="text-muted">{fmt.relative(a.createdAt)}</span>, sort: (a) => a.createdAt, hideBelow: "lg" },
  ];

  return (
    <>
      <PageHeader title="Screening" description="Provider alerts awaiting review. Every resolution is audited." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Open" icon={Siren} tone="info" loading={isPending} value={stats.open} sub="First review" />
        <MetricTile label="Escalated" icon={ArrowUpFromLine} tone="warning" loading={isPending} value={stats.escalated} sub="With the MLRO" />
        <MetricTile label="High severity" icon={TriangleAlert} tone={stats.high ? "danger" : "neutral"} loading={isPending} value={<span className={stats.high ? "text-danger" : undefined}>{stats.high}</span>} sub="Open or escalated" />
        <MetricTile label="Cleared, 30 days" icon={CircleCheck} tone="success" loading={isPending} value={stats.cleared} sub="False positives" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: searched.length },
              { value: "open", label: "Open", count: count("open") },
              { value: "escalated", label: "Escalated", count: count("escalated") },
              { value: "cleared", label: "Cleared", count: count("cleared") },
              { value: "confirmed", label: "Confirmed", count: count("confirmed") },
            ]}
          />
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search alerts" placeholder="Investor, summary or provider" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={data ? rows : undefined}
          columns={columns}
          getRowId={(a) => a.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(a) => setSelectedId(a.id)}
          defaultSort={{ key: "created", dir: "desc" }}
          caption="Screening alerts"
          rowClassName={(a) => (a.severity === "high" && (a.status === "open" || a.status === "escalated") ? "shadow-[inset_3px_0_0_var(--danger)]" : undefined)}
          empty={
            status === "all" && !search
              ? { icon: <ShieldAlert />, title: "No screening alerts", description: "Alerts from ComplyAdvantage and Chainalysis appear here when a check needs review." }
              : { icon: <ShieldAlert />, title: "No alerts match these filters", description: "Choose another status or clear the search.", action: <Button size="sm" onClick={() => { setStatus("all"); setSearch(""); }}>Clear filters</Button> }
          }
        />
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
        {selected && <AlertSheet alert={selected} onDone={() => setSelectedId(null)} />}
      </Dialog>
    </>
  );
}

function AlertSheet({ alert, onDone }: { alert: D.ScreeningAlert; onDone: () => void }) {
  const canDecide = useCan("compliance.decide");
  const resolve = useResolveAlert();
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const closed = alert.status === "cleared" || alert.status === "confirmed";
  const pendingAction = resolve.isPending ? resolve.variables?.status : undefined;

  const run = (status: "cleared" | "escalated" | "confirmed") => {
    if (!note.trim()) {
      setErr("Add a resolution note. It is stored with the decision in the audit trail.");
      return document.getElementById("alert-note")?.focus();
    }
    resolve.mutate({ id: alert.id, status, note: note.trim() }, { onSuccess: () => { setNote(""); onDone(); } });
  };

  return (
    <SheetContent
      title={alert.summary}
      description={<span className="flex flex-wrap items-center gap-2">{React.createElement(ALERT_ICON[alert.type], { className: "size-4", "aria-hidden": true })}{TYPE_LABEL[alert.type]} · <SeverityBadge severity={alert.severity} /> <StatusBadge status={alert.status} /></span>}
      footer={
        !closed ? (
          <>
            <Button variant="ghost" onClick={() => run("cleared")} disabled={!canDecide || resolve.isPending} isLoading={pendingAction === "cleared"} loadingText="Clearing…"><CircleCheck /> Clear as false positive</Button>
            {alert.status !== "escalated" && <Button variant="secondary" onClick={() => run("escalated")} disabled={!canDecide || resolve.isPending} isLoading={pendingAction === "escalated"} loadingText="Escalating…"><ArrowUpFromLine /> Escalate</Button>}
            <Button variant="danger" onClick={() => run("confirmed")} disabled={!canDecide || resolve.isPending} isLoading={pendingAction === "confirmed"} loadingText="Confirming…"><FlagIcon /> Confirm match</Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <Link href={`/identity/investors/${alert.investorId}`} className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface-2">
          <PartyAvatar name={alert.investorName} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{alert.investorName}</span>
            <span className="block text-[12px] text-muted">Open investor profile</span>
          </span>
          <ArrowUpRight className="size-4 text-subtle transition-colors group-hover:text-foreground" />
        </Link>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-2 p-4">
          <ProgressRing value={alert.matchScore} size={64} stroke={6} tone={alert.matchScore >= 85 ? "danger" : alert.matchScore >= 60 ? "warning" : "info"} label={`Match score ${alert.matchScore} of 100`}>
            <span className="text-[16px]">{alert.matchScore}</span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold">{alert.matchScore >= 85 ? "Strong match" : alert.matchScore >= 60 ? "Partial match" : "Weak match"}</div>
            <p className="text-[12.5px] text-muted">{alert.matchScore >= 85 ? "Confirm unless identifying data clearly differs." : alert.matchScore >= 60 ? "Compare date of birth, nationality and identifiers." : "Often a false positive."}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <IconTile icon={ALERT_ICON[alert.type]} tone={alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warning" : "neutral"} />
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-muted">Detail from {alert.provider}</div>
            <p className="text-[13.5px] leading-relaxed">{alert.detail}</p>
          </div>
        </div>
        <KeyValue
          items={[
            { label: "Provider", value: <CompanyName name={alert.provider} size={22} /> },
            { label: "Created", value: fmt.dateTime(alert.createdAt) },
            { label: "Assignee", value: alert.assignee ? <PersonName name={alert.assignee} size={22} /> : <span className="text-muted">Unassigned</span> },
            ...(alert.resolvedAt ? [{ label: "Resolved", value: fmt.dateTime(alert.resolvedAt) }] : []),
            { label: "Alert ID", value: <span className="font-mono text-[12.5px]">{alert.id}</span> },
          ]}
        />
        {alert.resolutionNote && (
          <div>
            <div className="mb-1 text-[12px] text-muted">{closed ? "Resolution note" : "Latest note"}</div>
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px]">{alert.resolutionNote}</p>
          </div>
        )}
        {!closed && (
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <h3 className="text-[14px] font-semibold">Resolve</h3>
            {!canDecide && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">Resolving screening alerts needs the Compliance officer role. Switch persona from the account menu.</p>
            )}
            <Field label="Resolution note" htmlFor="alert-note" error={err} required hint="State the evidence behind the decision.">
              <Textarea id="alert-note" value={note} disabled={!canDecide} onChange={(e) => { setNote(e.target.value); setErr(undefined); }} aria-invalid={!!err}
                placeholder="Date of birth and nationality differ from the designated person. Passport number verified against the issuing authority." />
            </Field>
          </div>
        )}
      </div>
    </SheetContent>
  );
}
