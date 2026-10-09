"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Eye, Info, ListChecks, ShieldAlert, UserRoundCog, X } from "lucide-react";
import type * as D from "@/types/domain";
import { useApprovals, useDecideApproval } from "@/hooks/api";
import { useCan, usePersona } from "@/hooks/session";
import { Badge, Card, CardBody, CopyText, EmptyState, ErrorState, Field, KeyValue, PageHeader, Segmented, Skeleton, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { PersonAvatar, PersonName } from "@/components/domain/logos";
import { IconTile, SystemAvatar, isSystemName } from "@/components/visual/bits";
import { APPROVAL_ICON } from "@/components/visual/icons";
import { ApprovalDots, ApprovalTimeline } from "@/components/visual/approval-timeline";
import { RiskBadge, StatusBadge } from "@/components/domain/status";
import { ROLE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

type StatusFilter = "pending" | "executed" | "approved" | "rejected" | "all";
const FILTERS: StatusFilter[] = ["pending", "executed", "approved", "rejected", "all"];

const TYPE_LABEL: Record<D.ApprovalType, string> = {
  mint: "Mint",
  burn: "Burn",
  pause: "Pause",
  freeze: "Freeze",
  "forced-transfer": "Forced transfer",
  "config-change": "Configuration",
  "treasury-movement": "Treasury movement",
  distribution: "Distribution",
  "policy-change": "Policy change",
  "asset-launch": "Asset launch",
  "verification-override": "Verification override",
  "manual-valuation": "Manual valuation",
  "listing-override": "Listing stage",
};

const SIGNER_ROLES: D.Role[] = ["operations", "platform-admin"];

function roleLabel(r: D.ApprovalStep["role"]) {
  return r === "authorized-signer" ? "Authorised signer" : ROLE_META[r].label;
}

function objectHref(ap: D.Approval): string | undefined {
  switch (ap.objectType) {
    case "Order": return `/orders/${ap.objectId}`;
    case "Asset": return `/assets/${ap.objectId}`;
    case "TokenClass": return `/tokens/${ap.objectId}`;
    case "Distribution": return "/servicing";
    case "CustodyAccount": return "/custody";
    default: return undefined;
  }
}

function subscribeMedia(cb: () => void) {
  const m = window.matchMedia("(min-width: 1024px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function useIsDesktop() {
  return React.useSyncExternalStore(subscribeMedia, () => window.matchMedia("(min-width: 1024px)").matches, () => true);
}

function ApprovalsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const rawStatus = params.get("status") as StatusFilter | null;
  const status: StatusFilter = rawStatus && FILTERS.includes(rawStatus) ? rawStatus : "pending";
  const selectedId = params.get("id");
  const isDesktop = useIsDesktop();
  const { data, isPending, error, refetch } = useApprovals();

  const setParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  const counts = React.useMemo(() => {
    const a = data ?? [];
    return { all: a.length, pending: a.filter((x) => x.status === "pending").length, executed: a.filter((x) => x.status === "executed").length, approved: a.filter((x) => x.status === "approved").length, rejected: a.filter((x) => x.status === "rejected").length };
  }, [data]);

  const list = React.useMemo(() => (data ?? []).filter((a) => status === "all" || a.status === status).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)), [data, status]);
  const selected = (data ?? []).find((a) => a.id === selectedId);
  const desktopSelected = selected && list.some((a) => a.id === selected.id) ? selected : list[0];

  return (
    <>
      <PageHeader
        title={<span className="inline-flex items-center gap-2">Approvals <Tip content="Each step is role-bound, and no one can approve two steps of the same request."><Info className="size-4 text-subtle" tabIndex={0} aria-label="Approval rules" /></Tip></span>}
        description="Sensitive actions wait for every required approver."
      />
      <div className="mb-4">
        <Segmented<StatusFilter>
          value={status}
          onChange={(v) => setParams({ status: v === "pending" ? undefined : v, id: undefined })}
          options={[
            { value: "pending", label: "Pending", count: data ? counts.pending : undefined },
            { value: "executed", label: "Executed", count: data ? counts.executed : undefined },
            { value: "approved", label: "Approved", count: data ? counts.approved : undefined },
            { value: "rejected", label: "Rejected", count: data ? counts.rejected : undefined },
            { value: "all", label: "All", count: data ? counts.all : undefined },
          ]}
        />
      </div>

      {error && !data ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="self-start overflow-hidden">
            {isPending ? (
              <ul className="divide-y divide-border">{Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /><Skeleton className="mt-2 h-5 w-32" /></li>)}</ul>
            ) : list.length === 0 ? (
              <EmptyState icon={<ListChecks />} title={status === "pending" ? "Nothing waiting for approval" : "No requests in this view"} description={status === "pending" ? "New requests appear here as soon as they are raised." : "Choose another status to see more requests."} action={status !== "all" ? <Button size="sm" onClick={() => setParams({ status: "all", id: undefined })}>Show all requests</Button> : undefined} />
            ) : (
              <ul className="divide-y divide-border" aria-label="Approval requests">
                {list.map((a) => {
                  const next = a.status === "pending" ? a.steps.find((s) => !s.decision) : undefined;
                  const active = isDesktop && desktopSelected?.id === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setParams({ id: a.id })}
                        aria-current={active || undefined}
                        className={cn("relative flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none", active && "bg-surface-2 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand")}
                      >
                        <span className="flex items-start gap-3">
                          <IconTile icon={APPROVAL_ICON[a.type]} tone={a.risk === "high" ? "danger" : a.risk === "medium" ? "warning" : "neutral"} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-medium leading-snug">{a.title}</span>
                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge tone="outline">{TYPE_LABEL[a.type]}</Badge>
                              <RiskBadge risk={a.risk} />
                              {status === "all" && <StatusBadge status={a.status} />}
                            </span>
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-12 text-[12px] text-muted">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            {isSystemName(a.requestedBy) ? <SystemAvatar name={a.requestedBy} size={18} /> : <PersonAvatar name={a.requestedBy} size={18} />}
                            <span className="truncate">{a.requestedBy} · {fmt.relative(a.requestedAt)}</span>
                          </span>
                          {next ? <span className="inline-flex items-center gap-1.5 font-medium text-brand-ink"><ApprovalDots steps={a.steps} /><UserRoundCog className="size-3.5" aria-hidden /> {roleLabel(next.role)}</span> : <ApprovalDots steps={a.steps} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {isDesktop && (
            <div className="min-w-0">
              {isPending ? (
                <Card className="p-5"><Skeleton className="h-6 w-2/3" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-6 h-40" /><Skeleton className="mt-4 h-32" /></Card>
              ) : desktopSelected ? (
                <Card className="lg:sticky lg:top-20"><CardBody><ApprovalDetail ap={desktopSelected} /></CardBody></Card>
              ) : (
                <Card><EmptyState icon={<Eye />} title="Select a request" description="Details, approval steps and the decision area appear here." /></Card>
              )}
            </div>
          )}
        </div>
      )}

      {!isDesktop && (
        <Dialog open={!!selected} onOpenChange={(o) => !o && setParams({ id: undefined })}>
          {selected && (
            <SheetContent title={selected.title} description={<span className="flex flex-wrap items-center gap-1.5"><StatusBadge status={selected.status} /><RiskBadge risk={selected.risk} /></span>}>
              <ApprovalDetail ap={selected} inSheet />
            </SheetContent>
          )}
        </Dialog>
      )}
    </>
  );
}

function ApprovalDetail({ ap, inSheet }: { ap: D.Approval; inSheet?: boolean }) {
  const href = objectHref(ap);
  const payload = Object.entries(ap.payload);
  return (
    <div className="flex flex-col gap-5">
      {!inSheet && (
        <div>
          <div className="flex items-start gap-3">
            <IconTile icon={APPROVAL_ICON[ap.type]} size="lg" tone={ap.risk === "high" ? "danger" : ap.risk === "medium" ? "warning" : "neutral"} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={ap.status} />
                <Badge tone="outline">{TYPE_LABEL[ap.type]}</Badge>
                <RiskBadge risk={ap.risk} />
              </div>
              <h2 className="mt-1.5 text-[18px] font-semibold leading-snug">{ap.title}</h2>
            </div>
          </div>
        </div>
      )}
      <p className="text-[13.5px] leading-relaxed text-muted">{ap.summary}</p>

      <KeyValue
        items={[
          { label: "Requested by", value: isSystemName(ap.requestedBy) ? <span className="inline-flex items-center gap-2"><SystemAvatar name={ap.requestedBy} size={24} />{ap.requestedBy}</span> : <PersonName name={ap.requestedBy} size={24} /> },
          { label: "Requested", value: fmt.dateTime(ap.requestedAt) },
          { label: "Object", value: href ? <Link href={href} className="inline-flex items-center gap-1 text-brand-ink hover:underline">{ap.objectType} <span className="font-mono text-[12.5px]">{ap.objectId}</span><ArrowUpRight className="size-3.5" /></Link> : <span>{ap.objectType} <span className="font-mono text-[12.5px] text-muted">{ap.objectId}</span></span> },
          { label: "Request ID", value: <CopyText value={ap.id} display={ap.id} /> },
          ...(ap.txHash ? [{ label: "Executed on-chain", value: <CopyText value={ap.txHash} /> }] : []),
        ]}
      />

      {payload.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold">Request payload</h3>
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <KeyValue
              items={payload.map(([k, v]) => ({
                label: fmt.sentence(k.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()),
                value: k === "orderId" ? <Link href={`/orders/${v}`} className="font-mono text-[12.5px] text-brand-ink hover:underline">{v}</Link> : typeof v === "string" && v.startsWith("0x") ? <CopyText value={v} /> : <span className="tabular">{String(v)}</span>,
              }))}
            />
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">Approval steps</h3>
          <span className="inline-flex items-center gap-2 text-[12px] text-muted tabular"><ApprovalDots steps={ap.steps} />{ap.steps.filter((s) => s.decision === "approved").length} of {ap.steps.length}</span>
        </div>
        <ApprovalTimeline steps={ap.steps} />
      </div>

      <DecisionArea ap={ap} />
    </div>
  );
}

function DecisionArea({ ap }: { ap: D.Approval }) {
  const persona = usePersona();
  const canDecide = useCan("approvals.decide");
  const decide = useDecideApproval();
  const [comment, setComment] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const [choice, setChoice] = React.useState<"approved" | "rejected">();

  React.useEffect(() => {
    setComment("");
    setErr(undefined);
  }, [ap.id]);

  if (ap.status !== "pending") {
    return (
      <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] text-muted">
        {ap.status === "executed" ? "All approvals were collected and the action was executed. This record is closed." : ap.status === "rejected" ? "This request was rejected. Raise a new request if the action is still needed." : "This request is approved and waiting for execution."}
      </div>
    );
  }

  if (!canDecide) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] text-muted">
        <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>You have read-only access. {ROLE_META[persona.role].label} users can review approvals but not decide them.</span>
      </div>
    );
  }

  const idx = ap.steps.findIndex((s) => !s.decision);
  const step = ap.steps[idx];
  const roleOk = !!step && (step.role === persona.role || (step.role === "authorized-signer" && SIGNER_ROLES.includes(persona.role)));
  const requester = ap.requestedBy === persona.name;
  const sod = requester || (!!step && ap.steps.some((s) => s.decision === "approved" && s.approver === persona.name));
  const blocked = !roleOk || sod;
  const last = idx === ap.steps.length - 1;

  const submit = (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !comment.trim()) {
      setErr("Add a reason for the rejection. It is stored in the audit trail.");
      document.getElementById(`comment-${ap.id}`)?.focus();
      return;
    }
    setChoice(decision);
    decide.mutate({ id: ap.id, decision, comment: comment.trim() }, { onSuccess: () => { setComment(""); setErr(undefined); } });
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold">Your decision</h3>
        {step && <span className="text-[12px] text-muted">Step {idx + 1} of {ap.steps.length}: {step.label}</span>}
      </div>
      {!roleOk && step && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
          <UserRoundCog className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>This step needs {step.role === "authorized-signer" ? "an authorised signer (Operations or Platform admin)" : ROLE_META[step.role as D.Role].label}. Switch persona from the account menu.</span>
        </p>
      )}
      {roleOk && sod && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{requester ? "Segregation of duties: you raised this request, so another user must decide it." : `Segregation of duties: you approved an earlier step of this request, so another ${ROLE_META[persona.role].label.toLowerCase()} user must take this step.`}</span>
        </p>
      )}
      <Field label="Comment" htmlFor={`comment-${ap.id}`} error={err} hint="Required when rejecting. Stored with the decision.">
        <Textarea
          id={`comment-${ap.id}`}
          value={comment}
          disabled={blocked}
          aria-invalid={!!err}
          onChange={(e) => { setComment(e.target.value); setErr(undefined); }}
          placeholder={step?.role === "compliance-officer" ? "Holder eligibility re-checked against the policy pack." : "Checked against the allocation report."}
        />
      </Field>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={blocked || decide.isPending} isLoading={decide.isPending && choice === "rejected"} loadingText="Rejecting…" onClick={() => submit("rejected")}>
          <X /> Reject
        </Button>
        <Button variant="primary" disabled={blocked || decide.isPending} isLoading={decide.isPending && choice === "approved"} loadingText="Approving…" onClick={() => submit("approved")}>
          <Check /> {last ? "Approve and execute" : "Approve"}
        </Button>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <React.Suspense>
      <ApprovalsView />
    </React.Suspense>
  );
}
