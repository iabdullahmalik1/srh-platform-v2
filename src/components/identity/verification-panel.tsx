"use client";

import * as React from "react";
import { Building2, CircleAlert, CircleCheck, CircleDashed, CircleX, Clock3, Landmark, Mail, ShieldCheck, Undo2, UserCheck, Users } from "lucide-react";
import type * as D from "@/types/domain";
import { useUpdateVerification } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, Field, KeyValue, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { CompanyLogo, CompanyName } from "@/components/domain/logos";
import { cn, fmt } from "@/lib/utils";

const STATUS: Record<D.VerificationStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; icon: React.ElementType }> = {
  passed: { label: "Passed", tone: "success", icon: CircleCheck },
  overridden: { label: "Approved manually", tone: "info", icon: UserCheck },
  waived: { label: "Waived", tone: "neutral", icon: Undo2 },
  pending: { label: "Pending", tone: "warning", icon: Clock3 },
  missing: { label: "Not provided", tone: "warning", icon: CircleDashed },
  failed: { label: "Failed", tone: "danger", icon: CircleX },
};
const OPEN: D.VerificationStatus[] = ["pending", "missing", "failed"];

export function VerificationPanel({ inv }: { inv: D.Investor }) {
  const canOverride = useCan("overrides.decide");
  const canRequest = useCan("investors.write");
  const m = useUpdateVerification();
  const [dialog, setDialog] = React.useState<{ item: D.VerificationItem; action: "approve" | "waive" }>();
  const [reason, setReason] = React.useState("");
  const items = inv.verification ?? [];
  if (!items.length) return <Card><EmptyState icon={<ShieldCheck />} title="No checklist on file" description="Checks appear here once onboarding starts." /></Card>;
  const open = items.filter((v) => OPEN.includes(v.status));
  return (
    <Card>
      <CardHeader
        icon={<ShieldCheck />}
        title="Verification checklist"
        description={open.length ? `${open.length} outstanding. The account is open; orders wait for review until these are clear.` : "Every item is clear."}
        action={<Badge tone={open.length ? "warning" : "success"} dot>{items.length - open.length} of {items.length} clear</Badge>}
      />
      <ul className="divide-y divide-border">
        {items.map((v) => {
          const st = STATUS[v.status];
          const Icon = st.icon;
          const actionable = OPEN.includes(v.status) && !v.pendingApprovalId;
          return (
            <li key={v.key} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", st.tone === "success" ? "bg-success-soft text-success" : st.tone === "danger" ? "bg-danger-soft text-danger" : st.tone === "warning" ? "bg-warning-soft text-warning" : st.tone === "info" ? "bg-info-soft text-info" : "bg-surface-3 text-muted")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium">{v.label}</div>
                  <div className="text-[12px] text-muted">
                    {v.overriddenBy ? `${st.label} by ${v.overriddenBy}${v.at ? `, ${fmt.date(v.at)}` : ""}. ${v.overrideReason ?? ""}` : v.detail ?? (v.provider ? `Checked by ${v.provider}` : st.label)}
                    {v.pendingApprovalId && " Waiting for a second approver."}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-11 sm:pl-0">
                {v.provider && !v.overriddenBy && <span className="hidden items-center gap-1.5 text-[12px] text-muted md:inline-flex"><CompanyLogo name={v.provider} size={18} />{v.provider}</span>}
                <Badge tone={st.tone}>{v.pendingApprovalId ? "Awaiting approval" : st.label}</Badge>
                {actionable && canRequest && v.status === "missing" && (
                  <Button size="sm" variant="ghost" onClick={() => m.mutate({ investorId: inv.id, key: v.key, action: "request", reason: "" })}><Mail /> Request</Button>
                )}
                {actionable && canOverride && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setReason(""); setDialog({ item: v, action: "approve" }); }}>Approve manually</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReason(""); setDialog({ item: v, action: "waive" }); }}>Waive</Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent
          size="sm"
          title={dialog?.action === "waive" ? "Waive this requirement?" : "Approve manually?"}
          description={dialog ? `${inv.name}: ${dialog.item.label}` : undefined}
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant="primary" disabled={!reason.trim()} isLoading={m.isPending} onClick={() => dialog && m.mutate({ investorId: inv.id, key: dialog.item.key, action: dialog.action, reason }, { onSuccess: () => setDialog(undefined) })}>
                {dialog?.action === "waive" ? "Waive" : "Approve"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {dialog && ["sanctions", "pep", "wallet-risk", "source-of-funds", "identity-document", "beneficial-owners"].includes(dialog.item.key) && (
              <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning"><CircleAlert className="mt-0.5 size-4 shrink-0" />A second approver confirms this one before it takes effect.</p>
            )}
            <Field label="Reason" htmlFor="ovr-reason" hint="Kept in the audit trail with your name.">
              <Textarea id="ovr-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={dialog?.item.key === "bank-account" ? "Statement shows the same person with the name in a different order" : "What you checked and how"} />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function CompanyPanel({ inv }: { inv: D.Investor }) {
  const c = inv.company;
  if (!c) return <Card><EmptyState icon={<Building2 />} title="No company profile" description="Registry details are captured during company onboarding." /></Card>;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader icon={<Building2 />} title="Company" description={c.registry} />
        <CardBody>
          <KeyValue items={[
            { label: "Legal form", value: c.legalForm },
            { label: "Registration", value: inv.registrationNumber ?? "Not provided" },
            { label: "Jurisdiction", value: c.jurisdiction },
            { label: "Incorporated", value: c.incorporatedAt ? fmt.date(c.incorporatedAt) : "Not provided" },
            { label: "Industry", value: c.industry ?? "Not provided" },
            { label: "Registered address", value: <span className="whitespace-normal">{c.registeredAddress ?? "Not provided"}</span> },
          ]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader icon={<Landmark />} title="Settlement bank accounts" />
        {c.bankAccounts.length ? (
          <ul className="divide-y divide-border">
            {c.bankAccounts.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <CompanyName name={b.bank} size={28} sub={<CopyText value={b.iban} display={b.iban} className="text-[11.5px]" />} className="min-w-0 flex-1" />
                <span className="text-[12px] text-muted">{b.currency} · {b.swift}</span>
                <Badge tone={b.verified ? "success" : "warning"}>{b.verified ? b.method ?? "Verified" : "Not verified"}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Landmark />} title="No bank account yet" description="Distributions are held until an account in the company's name is verified." className="py-8" />
        )}
      </Card>
      <Card>
        <CardHeader icon={<Users />} title="Directors" />
        <ul className="divide-y divide-border">
          {c.directors.length ? c.directors.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]"><span>{d.name}<span className="ml-2 text-muted">{d.role}</span></span><Badge tone={d.verified ? "success" : "warning"}>{d.verified ? "Verified" : "Pending"}</Badge></li>
          )) : <li className="px-5 py-3 text-[13px] text-muted">None recorded</li>}
        </ul>
      </Card>
      <Card>
        <CardHeader icon={<UserCheck />} title="Authorised signatories" />
        <ul className="divide-y divide-border">
          {c.signatories.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]"><span className="min-w-0">{d.name}<span className="ml-2 text-muted">{d.title}</span></span><Badge tone={d.verified ? "success" : "warning"}>{d.verified ? "Verified" : "Pending"}</Badge></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
