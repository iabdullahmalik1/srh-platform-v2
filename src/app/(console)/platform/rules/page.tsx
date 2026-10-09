"use client";

import * as React from "react";
import { BadgeCheck, CreditCard, Gauge, LineChart, RotateCcw, Save, ShieldCheck, UserCheck } from "lucide-react";
import type * as D from "@/types/domain";
import { useInternalRules, useUpdateInternalRules } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, ErrorState, Field, NativeSelect, PageHeader, Skeleton, Switch } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/assets/form-bits";
import { RISK_META, RISK_ORDER } from "@/lib/risk";
import { ROLE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

type Editable = Omit<D.InternalRules, "updatedAt" | "updatedBy">;
const OVERRIDE_ROLES: D.Role[] = ["platform-admin", "compliance-officer", "operations", "issuer-admin"];

export default function InternalRulesPage() {
  const { data, isPending, error, refetch } = useInternalRules();
  const save = useUpdateInternalRules();
  const canWrite = useCan("rules.write");
  const [draft, setDraft] = React.useState<Editable>();
  const [loadedAt, setLoadedAt] = React.useState<string>();
  if (data && data.updatedAt !== loadedAt) {
    setLoadedAt(data.updatedAt);
    const { updatedAt: _u, updatedBy: _b, ...rest } = data;
    setDraft(rest);
  }
  if (error && !data) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending || !draft || !data) return <div className="flex flex-col gap-5"><Skeleton className="h-12 w-72" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  const set = (p: Partial<Editable>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const dirty = JSON.stringify(draft) !== JSON.stringify((({ updatedAt: _u, updatedBy: _b, ...r }) => r)(data));
  const ro = !canWrite;
  const toggleRole = (area: keyof Editable["overrideRoles"], r: D.Role) => {
    const cur = draft.overrideRoles[area];
    set({ overrideRoles: { ...draft.overrideRoles, [area]: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] } });
  };
  const b = draft.riskBands;
  const max = Math.max(14, b.mediumMax + 4);

  return (
    <>
      <PageHeader
        title="Internal rules"
        description={`Thresholds and authorities the platform applies. Last changed by ${data.updatedBy}, ${fmt.date(data.updatedAt)}.`}
        actions={
          canWrite ? (
            <>
              <Button variant="ghost" disabled={!dirty} onClick={() => setLoadedAt(undefined)}><RotateCcw /> Discard</Button>
              <Button variant="primary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate(draft)}><Save /> Save rules</Button>
            </>
          ) : (
            <Badge tone="neutral">Read only for your role</Badge>
          )
        }
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={<BadgeCheck />} title="Issuance and minting" />
          <CardBody className="flex flex-col gap-4">
            <Row label="Manual issuance verification" hint="Tokens cannot be minted until every issuance check is verified or waived.">
              <Switch label="Manual issuance verification" checked={draft.issuanceVerificationRequired} disabled={ro} onCheckedChange={(v) => set({ issuanceVerificationRequired: v })} />
            </Row>
            <Field label="Orders needing four-eyes approval before minting" htmlFor="mint-th" hint="Orders at or above this amount wait for operations, compliance and an authorised signer.">
              <NumberInput id="mint-th" value={draft.mintApprovalThresholdUsd} disabled={ro} onValueChange={(v) => set({ mintApprovalThresholdUsd: v ?? 0 })} prefix="USD" className="sm:max-w-[260px]" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<ShieldCheck />} title="Onboarding and orders" />
          <CardBody className="flex flex-col gap-4">
            <Row label="Accounts with items outstanding go to review" hint="Investors can browse and place orders. Their orders wait for compliance until the profile is complete or the items are waived.">
              <Switch label="Incomplete profiles go to review" checked={draft.incompleteProfilesGoToReview} disabled={ro} onCheckedChange={(v) => set({ incompleteProfilesGoToReview: v })} />
            </Row>
            <Field label="Highest AML risk approved without review" htmlFor="aml-max">
              <NativeSelect id="aml-max" value={draft.autoApproveMaxAmlRisk} disabled={ro} onChange={(e) => set({ autoApproveMaxAmlRisk: e.target.value as D.RiskLevel })} className="sm:max-w-[260px]">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </NativeSelect>
            </Field>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader icon={<UserCheck />} title="Manual overrides" description="Who can approve or waive a requirement by hand. Every override is recorded with the person and the reason." />
          <CardBody className="flex flex-col gap-5">
            <Row label="Second approver for high-risk overrides" hint="Sanctions, PEP, wallet risk, source of funds, identity documents and beneficial owners.">
              <Switch label="Dual approval" checked={draft.dualApprovalForHighRiskOverrides} disabled={ro} onCheckedChange={(v) => set({ dualApprovalForHighRiskOverrides: v })} />
            </Row>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {([
                ["verification", "KYC, KYB and document checks"],
                ["listing", "Moving products between listing stages"],
                ["valuation", "Entering valuations"],
              ] as const).map(([area, label]) => (
                <fieldset key={area} className="rounded-xl border border-border p-3.5">
                  <legend className="px-1 text-[12.5px] font-medium">{label}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {OVERRIDE_ROLES.map((r) => {
                      const on = draft.overrideRoles[area].includes(r);
                      return (
                        <button key={r} type="button" aria-pressed={on} disabled={ro} onClick={() => toggleRole(area, r)}
                          className={cn("h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:cursor-default", on ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted hover:bg-surface-2")}>
                          {ROLE_META[r].label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Gauge />} title="Risk profile bands" description="Products are placed in a band by their target return. Commodities start at Medium." />
          <CardBody className="flex flex-col gap-4">
            <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
              <span className="bg-success" style={{ width: `${(b.veryLowMax / max) * 100}%` }} />
              <span className="bg-info" style={{ width: `${((b.lowMax - b.veryLowMax) / max) * 100}%` }} />
              <span className="bg-warning" style={{ width: `${((b.mediumMax - b.lowMax) / max) * 100}%` }} />
              <span className="flex-1 bg-danger" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([["veryLowMax", "very-low"], ["lowMax", "low"], ["mediumMax", "medium"]] as const).map(([k, r]) => (
                <Field key={k} label={`${RISK_META[r].label} up to`} htmlFor={`band-${k}`}>
                  <NumberInput id={`band-${k}`} value={b[k]} disabled={ro} onValueChange={(v) => set({ riskBands: { ...b, [k]: v ?? 0 } })} suffix="%" />
                </Field>
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
              {RISK_ORDER.map((r) => <li key={r}><span className="font-medium text-foreground">{RISK_META[r].label}:</span> {RISK_META[r].explain}</li>)}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<CreditCard />} title="Card payments" description="Visa, Mastercard, American Express, Apple Pay and Google Pay" />
          <CardBody className="flex flex-col gap-4">
            <Row label="Accept card payments" hint="Shown at checkout on offerings that list the card rail.">
              <Switch label="Accept card payments" checked={draft.card.enabled} disabled={ro} onCheckedChange={(v) => set({ card: { ...draft.card, enabled: v } })} />
            </Row>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Retail limit per order" htmlFor="card-retail"><NumberInput id="card-retail" value={draft.card.retailLimitUsd} disabled={ro || !draft.card.enabled} onValueChange={(v) => set({ card: { ...draft.card, retailLimitUsd: v ?? 0 } })} prefix="USD" /></Field>
              <Field label="Professional limit" htmlFor="card-pro"><NumberInput id="card-pro" value={draft.card.professionalLimitUsd} disabled={ro || !draft.card.enabled} onValueChange={(v) => set({ card: { ...draft.card, professionalLimitUsd: v ?? 0 } })} prefix="USD" /></Field>
              <Field label="Card fee passed on" htmlFor="card-fee"><NumberInput id="card-fee" value={draft.card.feePct} disabled={ro || !draft.card.enabled} onValueChange={(v) => set({ card: { ...draft.card, feePct: v ?? 0 } })} suffix="%" /></Field>
            </div>
            <Row label="Require 3-D Secure" hint="Strong customer authentication on every card payment.">
              <Switch label="Require 3-D Secure" checked={draft.card.threeDSecure} disabled={ro || !draft.card.enabled} onCheckedChange={(v) => set({ card: { ...draft.card, threeDSecure: v } })} />
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<LineChart />} title="Manual valuations" />
          <CardBody>
            <Field label="Change that needs a second-line approver" htmlFor="val-tol" hint="A manual valuation that moves the price by more than this goes to a platform admin as well as the checker.">
              <NumberInput id="val-tol" value={draft.manualValuationTolerancePct} disabled={ro} onValueChange={(v) => set({ manualValuationTolerancePct: v ?? 0 })} suffix="%" className="sm:max-w-[200px]" />
            </Field>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium">{label}</div>
        {hint && <div className="text-[12.5px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
