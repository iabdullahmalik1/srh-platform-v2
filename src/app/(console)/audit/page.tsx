"use client";

import * as React from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CircleDot, Download, History, Link2, Lock, Search, ShieldCheck, ShieldX } from "lucide-react";
import type * as D from "@/types/domain";
import { useAudit, useVerifyChain } from "@/hooks/api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, CardHeader, CopyText, Input, NativeSelect, PageHeader, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { ROLE_META } from "@/lib/constants";
import { CompanyName } from "@/components/domain/logos";
import { ActorAvatar } from "@/components/visual/bits";
import { OBJECT_ICON } from "@/components/visual/icons";
import { FlowDiagram } from "@/components/visual/flow";
import { cn, fmt } from "@/lib/utils";

const OBJECT_TYPES = ["Order", "Investor", "Approval", "TokenClass", "PolicyPack", "ScreeningAlert", "Asset", "Tenant", "Distribution", "ReconciliationBreak"];
const ROLES: (D.Role | "system")[] = ["system", "platform-admin", "operations", "compliance-officer", "issuer-admin", "investor", "auditor"];
const PAGE_SIZE = 50;

function roleLabel(r: D.Role | "system") {
  return r === "system" ? "System" : ROLE_META[r].label;
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function StateChange({ prev, next }: { prev?: string; next?: string }) {
  if (!prev && !next) return <span className="text-muted">None</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
      <span className="max-w-[120px] truncate text-muted" title={prev}>{prev ?? "none"}</span>
      <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-label="to" />
      <span className="max-w-[120px] truncate font-medium text-foreground" title={next}>{next ?? "none"}</span>
    </span>
  );
}

function csvCell(v: unknown) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AuditPage() {
  const [search, setSearch] = React.useState("");
  const [objectType, setObjectType] = React.useState("");
  const [role, setRole] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<D.AuditEvent | null>(null);
  const q = useDebounced(search.trim());

  React.useEffect(() => setPage(1), [q, objectType, role]);

  const { data, isPending, isFetching, error, refetch } = useAudit({ search: q || undefined, filters: { objectType: objectType || undefined, role: role || undefined }, page, pageSize: PAGE_SIZE });
  const verify = useVerifyChain();

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  const exportCsv = () => {
    if (!data?.items.length) return;
    const head = ["id", "at", "actor", "role", "organisation", "action", "object_type", "object_id", "reason", "previous_state", "new_state", "approved_by", "provider", "tx_hash", "ip", "hash", "prev_hash"];
    const rows = data.items.map((e) => [e.id, e.at, e.actor.name, e.actor.role, e.actor.organization, e.action, e.objectType, e.objectId, e.reason, e.previousState, e.newState, e.approvedBy, e.provider, e.txHash, e.ip, e.hash, e.prevHash].map(csvCell).join(","));
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const columns: Column<D.AuditEvent>[] = [
    { key: "at", header: "Time", cell: (e) => <div className="tabular" title={e.at}><div>{fmt.date(e.at)}</div><div className="text-[12px] text-muted">{fmt.time(e.at)}</div></div> },
    {
      key: "actor",
      header: "Actor",
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ActorAvatar actor={e.actor} size={30} />
          <div className="min-w-0">
            <div className="max-w-[170px] truncate font-medium">{e.actor.name}</div>
            <div className="max-w-[170px] truncate text-[12px] text-muted">{roleLabel(e.actor.role)} · {e.actor.organization}</div>
          </div>
        </div>
      ),
    },
    { key: "action", header: "Action and reason", cell: (e) => <div className="min-w-0"><div className="font-mono text-[12px]">{e.action}</div><div className="max-w-[220px] truncate text-[12px] text-muted" title={e.reason}>{e.reason}</div></div> },
    { key: "object", header: "Object", cell: (e) => { const Icon = OBJECT_ICON[e.objectType] ?? CircleDot; return <div className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-muted" aria-hidden /><div><div className="text-[12.5px]">{e.objectType.replace(/([a-z])([A-Z])/g, "$1 $2")}</div><div className="font-mono text-[11.5px] text-muted">{e.objectId}</div></div></div>; }, hideBelow: "md" },
    { key: "state", header: "State change", cell: (e) => <StateChange prev={e.previousState} next={e.newState} />, hideBelow: "lg" },
    { key: "provider", header: "Provider", cell: (e) => (e.provider ? <span className="block max-w-[160px]"><CompanyName name={e.provider} size={22} /></span> : <span className="text-muted">None</span>), hideBelow: "xl" },
  ];

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Append-only, hash-chained record of every state change."
        actions={
          <>
            {verify.data && (
              <Badge tone={verify.data.valid ? "success" : "danger"} className="h-8 px-3 text-[12.5px]">
                {verify.data.valid ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldX className="size-3.5" aria-hidden />}
                {verify.data.valid ? `Intact across ${fmt.num(verify.data.checked)} records` : "Hash chain broken"}
              </Badge>
            )}
            <Button variant="secondary" onClick={() => verify.mutate()} isLoading={verify.isPending} loadingText="Verifying…"><Link2 /> Verify hash chain</Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!data?.items.length}><Download /> Export CSV</Button>
          </>
        }
      />

      {verify.data && (
        <div className={cn("mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-[12.5px]", verify.data.valid ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft")} role="status">
          <span className={cn("font-medium", verify.data.valid ? "text-success" : "text-danger")}>{verify.data.valid ? "Hash chain verified." : "Hash chain verification failed. Investigate immediately."}</span>
          <span className="text-muted">{fmt.num(verify.data.checked)} records checked. Head hash</span>
          <CopyText value={verify.data.headHash} lead={10} tail={8} />
        </div>
      )}

      {data && data.items.length > 0 && page === 1 && !q && !objectType && !role && (
        <Card className="mb-4">
          <CardHeader
            icon={<Lock />}
            title={<span className="inline-flex items-center gap-1.5">Latest links in the chain <Tip content="Each record's hash covers its fields and the previous record's hash, so any edit breaks every link after it."><span tabIndex={0} className="inline-flex"><Link2 className="size-3.5 text-subtle" aria-label="How the chain works" /></span></Tip></span>}
            description="Newest on the right"
            action={verify.data ? <Badge tone={verify.data.valid ? "success" : "danger"} dot>{verify.data.valid ? "Verified" : "Broken"}</Badge> : undefined}
          />
          <div className="p-4">
            <FlowDiagram
              breakpoint="md"
              compact
              label="Latest hash-chained records"
              nodes={data.items.slice(0, 4).reverse().map((e) => ({
                key: e.id,
                label: <span className="block truncate font-mono text-[12px]">{e.action}</span>,
                sub: <span className="font-mono">{fmt.hash(e.hash, 6, 4)}</span>,
                media: <ActorAvatar actor={e.actor} size={30} />,
                status: verify.data ? (verify.data.valid ? ("pass" as const) : ("fail" as const)) : undefined,
                tip: `${e.actor.name} · ${fmt.dateTime(e.at)}`,
              }))}
            />
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-2 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search audit trail" placeholder="Action, object, actor or reason" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <NativeSelect aria-label="Filter by object type" value={objectType} onChange={(e) => setObjectType(e.target.value)} className="md:w-52">
            <option value="">All object types</option>
            {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/([a-z])([A-Z])/g, "$1 $2")}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} className="md:w-48">
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </NativeSelect>
          {(search || objectType || role) && <Button variant="ghost" size="sm" className="md:ml-auto" onClick={() => { setSearch(""); setObjectType(""); setRole(""); }}>Clear filters</Button>}
        </div>
        <div className={cn("transition-opacity duration-150", isFetching && !isPending && "opacity-60")}>
          <DataTable
            rows={data?.items}
            columns={columns}
            getRowId={(e) => e.id}
            loading={isPending}
            error={error}
            onRetry={() => refetch()}
            onRowClick={setSelected}
            pageSize={PAGE_SIZE}
            caption="Audit events"
            empty={{ icon: <History />, title: "No audit records match", description: "Change the search or filters to see more records.", action: <Button size="sm" onClick={() => { setSearch(""); setObjectType(""); setRole(""); }}>Clear filters</Button> }}
          />
        </div>
        {data && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-[12.5px] text-muted">
            <span className="tabular">Records {fmt.num(from)} to {fmt.num(to)} of {fmt.num(total)}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft /></Button>
              <span className="px-1 tabular">Page {page} of {pages}</span>
              <Button variant="ghost" size="icon-sm" disabled={page >= pages || isFetching} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight /></Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && <AuditSheet e={selected} />}
      </Dialog>
    </>
  );
}

function AuditSheet({ e }: { e: D.AuditEvent }) {
  const none = <span className="font-normal text-muted">Not recorded</span>;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Who performed it", value: <span className="inline-flex items-center gap-2"><ActorAvatar actor={e.actor} size={22} />{e.actor.name}</span> },
    { label: "What action", value: <span className="font-mono text-[12.5px]">{e.action}</span> },
    { label: "Which organisation", value: e.actor.organization },
    { label: "Which role", value: roleLabel(e.actor.role) },
    { label: "Which object", value: <span>{e.objectType} <span className="font-mono text-[12.5px] text-muted">{e.objectId}</span></span> },
    { label: "When", value: <span className="tabular">{fmt.dateTime(e.at)} <span className="font-normal text-muted">({e.at})</span></span> },
    { label: "Why", value: <span className="whitespace-normal">{e.reason}</span> },
    { label: "Previous state", value: e.previousState ? <span className="font-mono text-[12.5px]">{e.previousState}</span> : none },
    { label: "New state", value: e.newState ? <span className="font-mono text-[12.5px]">{e.newState}</span> : none },
    { label: "Who approved", value: e.approvedBy ? <span className="whitespace-normal">{e.approvedBy}</span> : <span className="font-normal text-muted">No approval required</span> },
    { label: "External provider", value: e.provider ? <CompanyName name={e.provider} size={22} /> : <span className="font-normal text-muted">None involved</span> },
    { label: "Blockchain transaction", value: e.txHash ? <CopyText value={e.txHash} lead={10} tail={8} /> : <span className="font-normal text-muted">No on-chain transaction</span> },
    { label: "IP address", value: <span className="font-mono text-[12.5px]">{e.ip}</span> },
    { label: "Record hash", value: <CopyText value={e.hash} lead={10} tail={8} /> },
    { label: "Previous hash", value: <CopyText value={e.prevHash} lead={10} tail={8} /> },
  ];
  return (
    <SheetContent title={<span className="flex items-center gap-3"><ActorAvatar actor={e.actor} size={36} /><span className="min-w-0 break-all font-mono text-[15px]">{e.action}</span></span>} description={<span className="flex flex-wrap items-center gap-2"><StateChange prev={e.previousState} next={e.newState} /><span className="font-mono text-[12px] text-subtle">{e.id}</span></span>}>
      <dl className="divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 gap-0.5 px-4 py-2.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-3">
            <dt className="text-[12.5px] text-muted">{r.label}</dt>
            <dd className="min-w-0 break-words text-[13px] font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[12px] text-muted">This record is append-only. Its hash covers every field above and the previous record&apos;s hash, so any change breaks the chain.</p>
    </SheetContent>
  );
}
