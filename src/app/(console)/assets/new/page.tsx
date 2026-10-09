"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Check, CircleAlert, CircleCheck, Coins, FileSignature, Gauge, Info, Landmark, Layers, Megaphone, Package, Pencil, Send, UserCog, X } from "lucide-react";
import type * as D from "@/types/domain";
import { useAsset, useCreateAsset, useIssuers, useJurisdictions, useSubmitAsset, useTokenClasses } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { useWorkflows, type AssetDraft } from "@/stores/workflows";
import { Badge, Card, CardBody, CardHeader, Checkbox, Field, Input, NativeSelect, PageHeader, Skeleton, Switch, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Stepper } from "@/components/ui/stepper";
import { AssetCover } from "@/components/domain/media";
import { CompanyName, RailLogo } from "@/components/domain/logos";
import { TEMPLATE_COVER } from "@/components/assets/template-media";
import { ChainBadge, ClassificationBadge, RailBadge, StatusBadge } from "@/components/domain/status";
import { CHAINS, CLASSIFICATIONS, INCOME_FREQUENCY_LABEL, INSTRUMENT_LABEL, OWNERSHIP_META, OWNERSHIP_ORDER, TOKEN_STANDARDS } from "@/components/assets/meta";
import { applyTemplate, TEMPLATE_VISUAL } from "@/components/assets/template-defaults";
import { CURRENCIES, firstInvalidStep, hasCoupon, INSTRUMENTS, STRUCTURES, toInput, validateStep, type Errors } from "@/components/assets/asset-schema";
import { ChoiceCard, NumberInput } from "@/components/assets/form-bits";
import { DebtTermsFields, DocumentsCard, ProductFactsCard, RegimesField, TokenClassesCard } from "@/components/assets/wizard-v2";
import { CLASSIFICATION_LABEL, COUNTRY_NAME, RAIL_META, TEMPLATE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const STEPS = ["Template", "Product", "Economics", "Compliance", "Token", "Offering", "Review"];

type Patch = <K extends keyof D.NewAssetInput>(k: K, v: Partial<D.NewAssetInput[K]>) => void;
type StepProps = { draft: AssetDraft; set: (p: AssetDraft) => void; patch: Patch; errors: Errors };

function useDraft() {
  const { asset, setAsset } = useWorkflows();
  const draft = asset.draft;
  const set = React.useCallback((p: AssetDraft) => setAsset(p), [setAsset]);
  const patch: Patch = React.useCallback(
    (k, v) => setAsset({ [k]: { ...((draft[k as keyof AssetDraft] as object | undefined) ?? {}), ...v } } as AssetDraft),
    [draft, setAsset],
  );
  return { draft, set, patch };
}

export default function StructureAssetPage() {
  const { asset, setAsset, resetAsset, completeAsset } = useWorkflows();
  const { step, createdAssetId } = asset;
  const { draft, set, patch } = useDraft();
  const { data: tokens } = useTokenClasses();
  const takenSymbols = React.useMemo(() => tokens?.map((t) => t.symbol.toUpperCase()) ?? [], [tokens]);
  const [attempted, setAttempted] = React.useState<Record<number, boolean>>({});
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  const current = !draft.template && step > 0 ? 0 : step;
  const errors = attempted[current] ? validateStep(current, draft, { takenSymbols }) : {};

  const go = (n: number) => {
    setAsset({}, n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const e = validateStep(current, draft, { takenSymbols });
    if (Object.keys(e).length) {
      setAttempted((a) => ({ ...a, [current]: true }));
      requestAnimationFrame(() => document.getElementById(Object.keys(e)[0])?.focus());
      return;
    }
    go(current + 1);
  };
  const discard = () => {
    resetAsset();
    setAttempted({});
  };

  const props: StepProps = { draft, set, patch, errors };

  return (
    <>
      <Link href="/assets" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Asset registry
      </Link>
      <PageHeader
        title="Structure a product"
        description="Compose a product from a template. Drafts save as you go."
        actions={hydrated && (current > 0 || draft.template) && !createdAssetId ? <DiscardDialog onConfirm={discard} /> : undefined}
      />
      <Stepper steps={STEPS} current={createdAssetId ? STEPS.length : current} className="mb-6" />
      {!hydrated ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : createdAssetId ? (
        <Created assetId={createdAssetId} onNew={discard} />
      ) : (
        <>
          {current === 0 && <StepTemplate {...props} />}
          {current === 1 && <StepProduct {...props} />}
          {current === 2 && <StepInstrument {...props} />}
          {current === 3 && <StepCompliance {...props} />}
          {current === 4 && <StepToken {...props} />}
          {current === 5 && <StepOffering {...props} />}
          {current === 6 && <StepReview draft={draft} goTo={go} takenSymbols={takenSymbols} onCreated={completeAsset} />}
          {current < 6 && (
            <WizardFooter
              back={current > 0 ? () => go(current - 1) : undefined}
              next={{ label: current === 5 ? "Review product" : "Continue", onClick: next }}
              invalid={Object.keys(errors).length > 0}
            />
          )}
        </>
      )}
    </>
  );
}

/* ------------------------------- step 0 ------------------------------- */
const DEFAULT_ROWS: { k: "legal" | "instrument" | "income" | "valuation" | "token" | "servicing"; l: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { k: "legal", l: "Legal structure", icon: Building2 },
  { k: "instrument", l: "Instrument", icon: FileSignature },
  { k: "income", l: "Income", icon: Coins },
  { k: "valuation", l: "Valuation", icon: Gauge },
  { k: "token", l: "Token", icon: Layers },
  { k: "servicing", l: "Servicing", icon: UserCog },
];

function StepTemplate({ draft, set, errors }: StepProps) {
  const pick = (t: D.AssetTemplate) => {
    if (t === draft.template) return;
    set(applyTemplate(t, draft));
  };
  return (
    <>
      <p className="mb-4 flex items-center gap-2 text-[13px] text-muted">
        Pick the closest template. Every default stays editable.
        <Tip content="Changing template later resets the economics, rules, token and offering steps.">
          <span tabIndex={0} className="inline-grid size-5 place-items-center rounded-full text-subtle hover:text-foreground"><Info className="size-4" /></span>
        </Tip>
      </p>
      {errors.template && <p id="template-error" role="alert" className="mb-3 flex items-center gap-1.5 text-[12.5px] text-danger"><CircleAlert className="size-4" />{errors.template}</p>}
      <div role="radiogroup" aria-label="Template" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(TEMPLATE_META) as D.AssetTemplate[]).map((t, i) => {
          const m = TEMPLATE_META[t];
          const selected = draft.template === t;
          return (
            <button
              key={t}
              id={i === 0 ? "template" : undefined}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick(t)}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border bg-surface text-left shadow-1 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "border-brand ring-2 ring-brand/25" : "border-border",
              )}
            >
              <div className="relative h-32">
                <AssetCover asset={{ name: m.label, visual: TEMPLATE_VISUAL[t], media: { cover: TEMPLATE_COVER[t], gallery: [] } }} overlay className="absolute inset-0 size-full" />
                <span className={cn("absolute right-3 top-3 grid size-6 place-items-center rounded-full border-2 transition-colors", selected ? "border-brand bg-brand text-white" : "border-white/80 bg-black/20 backdrop-blur-sm")}>{selected && <Check className="size-3.5" strokeWidth={3} />}</span>
                <div className="absolute inset-x-4 bottom-3 text-white">
                  <div className="text-[15px] font-semibold leading-tight">{m.label}</div>
                  <div className="truncate text-[12px] text-white/80">{m.description}</div>
                </div>
              </div>
              <ul className="flex flex-col gap-2 p-4 text-[12.5px]">
                {DEFAULT_ROWS.map((r) => (
                  <li key={r.k} className="flex items-center gap-2.5" title={r.l}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-muted"><r.icon className="size-3.5" /></span>
                    <span className="sr-only">{r.l}: </span>
                    <span className="min-w-0 truncate font-medium">{m[r.k]}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------- step 1 ------------------------------- */
function StepProduct({ draft, set, patch, errors }: StepProps) {
  const issuers = useIssuers();
  const jurisdictions = useJurisdictions();
  const cur = draft.valuation?.currency ?? "USD";
  const chooseIssuer = (id: string) => {
    const iss = issuers.data?.find((i) => i.id === id);
    set({ issuerId: id || undefined });
    if (iss) patch("legalEntity", { name: draft.legalEntity?.name || iss.name, jurisdiction: draft.legalEntity?.jurisdiction || iss.jurisdiction });
  };
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader icon={<Package />} title="Financial product" description="What investors subscribe to" />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Field label="Product name" htmlFor="name" error={errors.name} required>
              <Input id="name" value={draft.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Whitworth Park Student Residences" aria-invalid={!!errors.name} />
            </Field>
            <Field label="Short name" htmlFor="shortName" error={errors.shortName} hint="Shown in tables and order lists" required>
              <Input id="shortName" value={draft.shortName ?? ""} onChange={(e) => set({ shortName: e.target.value })} placeholder="Whitworth Park" aria-invalid={!!errors.shortName} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description} hint="Two or three plain sentences for the offering page" required>
            <Textarea id="description" value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Income interest in university halls of residence, with quarterly rental distributions." aria-invalid={!!errors.description} />
          </Field>
          <Field label="Issuer" htmlFor="issuerId" error={errors.issuerId} hint={issuers.isError ? "Issuers could not be loaded. Reload the page to try again." : undefined} required>
            <NativeSelect id="issuerId" value={draft.issuerId ?? ""} onChange={(e) => chooseIssuer(e.target.value)} aria-invalid={!!errors.issuerId} disabled={issuers.isPending}>
              <option value="">{issuers.isPending ? "Loading issuers…" : "Choose an issuer"}</option>
              {issuers.data?.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.jurisdiction})</option>)}
            </NativeSelect>
          </Field>
        </CardBody>
      </Card>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader icon={<Building2 />} title="Legal entity" description="Holds legal title to the underlying asset" />
          <CardBody className="flex flex-col gap-4">
            <Field label="Legal entity name" htmlFor="legalEntity.name" error={errors["legalEntity.name"]} required>
              <Input id="legalEntity.name" value={draft.legalEntity?.name ?? ""} onChange={(e) => patch("legalEntity", { name: e.target.value })} placeholder="Whitworth Park Residences SPV Ltd" aria-invalid={!!errors["legalEntity.name"]} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Structure" htmlFor="legalEntity.structure" error={errors["legalEntity.structure"]} required>
                <NativeSelect id="legalEntity.structure" value={draft.legalEntity?.structure ?? ""} onChange={(e) => patch("legalEntity", { structure: e.target.value as D.LegalStructure })}>
                  <option value="">Choose a structure</option>
                  {STRUCTURES.map((s) => <option key={s} value={s}>{s}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Jurisdiction" htmlFor="legalEntity.jurisdiction" error={errors["legalEntity.jurisdiction"]} required>
                <NativeSelect id="legalEntity.jurisdiction" value={draft.legalEntity?.jurisdiction ?? ""} onChange={(e) => patch("legalEntity", { jurisdiction: e.target.value as D.JurisdictionCode })} aria-invalid={!!errors["legalEntity.jurisdiction"]} disabled={jurisdictions.isPending}>
                  <option value="">{jurisdictions.isPending ? "Loading…" : "Choose a jurisdiction"}</option>
                  {jurisdictions.data?.map((j) => <option key={j.code} value={j.code}>{j.name} ({j.regulator})</option>)}
                </NativeSelect>
              </Field>
            </div>
            <RegimesField draft={draft} set={set} jurisdictions={jurisdictions.data} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Landmark />} title="Underlying asset" />
          <CardBody className="flex flex-col gap-4">
            <Field label="Description" htmlFor="underlying.description" error={errors["underlying.description"]} required>
              <Input id="underlying.description" value={draft.underlying?.description ?? ""} onChange={(e) => patch("underlying", { description: e.target.value })} placeholder="1,243 rooms in eight residential blocks" aria-invalid={!!errors["underlying.description"]} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor="underlying.location" hint="Optional for financial assets">
                <Input id="underlying.location" value={draft.underlying?.location ?? ""} onChange={(e) => patch("underlying", { location: e.target.value })} placeholder="Oxford Road, Manchester" />
              </Field>
              <Field label={`Appraised value (${cur})`} htmlFor="underlying.appraisedValue" error={errors["underlying.appraisedValue"]} required>
                <NumberInput id="underlying.appraisedValue" value={draft.underlying?.appraisedValue} onValueChange={(v) => patch("underlying", { appraisedValue: v })} invalid={!!errors["underlying.appraisedValue"]} placeholder="68,000,000" />
              </Field>
            </div>
          </CardBody>
        </Card>
        <ProductFactsCard draft={draft} set={set} />
      </div>
    </div>
  );
}

/* ------------------------------- step 2 ------------------------------- */
function StepInstrument({ draft, set, patch, errors }: StepProps) {
  const coupon = hasCoupon(draft.instrument?.type);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={<FileSignature />} title="Instrument" description="The legal claim investors hold" />
          <CardBody className="flex flex-col gap-4">
            <Field label="Instrument type" htmlFor="instrument.type" error={errors["instrument.type"]} required>
              <NativeSelect id="instrument.type" value={draft.instrument?.type ?? ""} onChange={(e) => patch("instrument", { type: e.target.value as D.InstrumentType })}>
                <option value="">Choose a type</option>
                {INSTRUMENTS.map((t) => <option key={t} value={t}>{INSTRUMENT_LABEL[t]}</option>)}
              </NativeSelect>
            </Field>
            {coupon && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={draft.instrument?.type === "sukuk-certificate" ? "Profit rate" : "Coupon"} htmlFor="instrument.couponPct" error={errors["instrument.couponPct"]} required>
                  <NumberInput id="instrument.couponPct" value={draft.instrument?.couponPct} onValueChange={(v) => patch("instrument", { couponPct: v })} invalid={!!errors["instrument.couponPct"]} suffix="% p.a." placeholder="8.5" />
                </Field>
                <Field label="Maturity date" htmlFor="instrument.maturity" error={errors["instrument.maturity"]} required>
                  <Input id="instrument.maturity" type="date" value={draft.instrument?.maturity?.slice(0, 10) ?? ""} onChange={(e) => patch("instrument", { maturity: e.target.value || undefined })} aria-invalid={!!errors["instrument.maturity"]} />
                </Field>
              </div>
            )}
            {coupon && <DebtTermsFields draft={draft} set={set} />}
            <label htmlFor="voting" className="flex items-center justify-between gap-4 rounded-lg border border-border px-3.5 py-3">
              <span>
                <span className="block text-[13px] font-medium">Voting rights</span>
                <span className="block text-[12px] text-muted">Holders vote on corporate actions, weighted by canonical supply</span>
              </span>
              <Switch id="voting" label="Voting rights" checked={!!draft.instrument?.votingRights} onCheckedChange={(v) => patch("instrument", { votingRights: v })} />
            </label>
            <Field label="Servicer" htmlFor="servicer" error={errors.servicer} hint="Collects income and services the asset" required>
              <Input id="servicer" value={draft.servicer ?? ""} onChange={(e) => set({ servicer: e.target.value })} aria-invalid={!!errors.servicer} />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Valuation and income" />
          <CardBody className="flex flex-col gap-4">
            <Field label="Valuation method" htmlFor="valuation.method" error={errors["valuation.method"]} required>
              <Input id="valuation.method" value={draft.valuation?.method ?? ""} onChange={(e) => patch("valuation", { method: e.target.value })} aria-invalid={!!errors["valuation.method"]} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Valuation frequency" htmlFor="valuation.frequency" error={errors["valuation.frequency"]} required>
                <NativeSelect id="valuation.frequency" value={draft.valuation?.frequency ?? ""} onChange={(e) => patch("valuation", { frequency: e.target.value as D.NewAssetInput["valuation"]["frequency"] })}>
                  <option value="">Choose</option>
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </NativeSelect>
              </Field>
              <Field label="Currency" htmlFor="valuation.currency" error={errors["valuation.currency"]} hint="Also used for the offering" required>
                <NativeSelect id="valuation.currency" value={draft.valuation?.currency ?? ""} onChange={(e) => { const c = e.target.value as D.Currency; patch("valuation", { currency: c }); if (draft.offering) set({ offering: { ...draft.offering, currency: c } }); }}>
                  <option value="">Choose</option>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Valuation source" htmlFor="oracleMode" hint={(draft.oracleMode ?? "automated") === "manual" ? "Values are entered by the valuation desk and checked by a second person." : "Values arrive from a price feed or the administrator's system."}>
              <NativeSelect id="oracleMode" value={draft.oracleMode ?? "automated"} onChange={(e) => set({ oracleMode: e.target.value as "automated" | "manual" })}>
                <option value="automated">Automated feed (Chainlink or administrator)</option>
                <option value="manual">Valuation desk (manual entry)</option>
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Income type" htmlFor="income.type" error={errors["income.type"]} required>
                <Input id="income.type" value={draft.income?.type ?? ""} onChange={(e) => patch("income", { type: e.target.value })} aria-invalid={!!errors["income.type"]} />
              </Field>
              <Field label="Income frequency" htmlFor="income.frequency" error={errors["income.frequency"]} required>
                <NativeSelect id="income.frequency" value={draft.income?.frequency ?? ""} onChange={(e) => patch("income", { frequency: e.target.value as D.Asset["income"]["frequency"] })}>
                  <option value="">Choose</option>
                  {(Object.keys(INCOME_FREQUENCY_LABEL) as D.Asset["income"]["frequency"][]).map((f) => <option key={f} value={f}>{INCOME_FREQUENCY_LABEL[f]}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Target yield" htmlFor="income.targetYieldPct" error={errors["income.targetYieldPct"]} hint="Enter 0 for non-distributing products" required>
              <NumberInput id="income.targetYieldPct" value={draft.income?.targetYieldPct} onValueChange={(v) => patch("income", { targetYieldPct: v })} invalid={!!errors["income.targetYieldPct"]} suffix="% p.a." className="sm:max-w-[200px]" />
            </Field>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Authoritative ownership record" description="Wins any reconciliation break." />
        <CardBody>
          {errors.ownershipModel && <p id="ownershipModel-error" role="alert" className="mb-3 flex items-center gap-1.5 text-[12.5px] text-danger"><CircleAlert className="size-4" />{errors.ownershipModel}</p>}
          <div role="radiogroup" aria-label="Ownership model" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {OWNERSHIP_ORDER.map((m, i) => (
              <ChoiceCard key={m} id={i === 0 ? "ownershipModel" : undefined} selected={draft.ownershipModel === m} onClick={() => set({ ownershipModel: m })}>
                <span className="block text-[13px] font-semibold">{OWNERSHIP_META[m].label}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{OWNERSHIP_META[m].description}</span>
              </ChoiceCard>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------- step 3 ------------------------------- */
function StepCompliance({ draft, set, patch, errors }: StepProps) {
  const rules = draft.rules;
  const classes = rules?.eligibleClassifications ?? [];
  const blocked = rules?.blockedCountries ?? [];
  const cur = draft.valuation?.currency ?? "USD";
  const toggleClass = (c: D.InvestorClassification, on: boolean) => patch("rules", { eligibleClassifications: on ? [...classes, c] : classes.filter((x) => x !== c) });
  const remaining = Object.keys(COUNTRY_NAME).filter((c) => !blocked.includes(c)).sort((a, b) => COUNTRY_NAME[a].localeCompare(COUNTRY_NAME[b]));
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="Who can invest" />
        <CardBody className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium">Eligible investor classifications <span className="text-muted">(required)</span></legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CLASSIFICATIONS.map((c, i) => (
                <label key={c} htmlFor={i === 0 ? "rules.eligibleClassifications" : `cls-${c}`} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] transition-colors", classes.includes(c) ? "border-brand/40 bg-brand-soft" : "border-border hover:border-border-strong")}>
                  <Checkbox id={i === 0 ? "rules.eligibleClassifications" : `cls-${c}`} checked={classes.includes(c)} onCheckedChange={(v) => toggleClass(c, v)} />
                  {CLASSIFICATION_LABEL[c]}
                </label>
              ))}
            </div>
            {errors["rules.eligibleClassifications"] && <p role="alert" className="mt-2 flex items-center gap-1 text-[12px] text-danger"><CircleAlert className="size-3.5" />{errors["rules.eligibleClassifications"]}</p>}
            {classes.includes("retail") && <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">Retail access needs a prospectus or an exemption in each target jurisdiction. Compliance checks this at launch approval.</p>}
          </fieldset>
          <div>
            <div className="mb-2 text-[12.5px] font-medium">Blocked countries</div>
            <div className="flex flex-wrap gap-1.5">
              {blocked.length === 0 && <span className="text-[12.5px] text-muted">No product-level blocks. Jurisdiction packs still apply.</span>}
              {blocked.map((c) => (
                <span key={c} className="inline-flex h-7 items-center gap-1 rounded-full bg-danger-soft pl-2.5 pr-1 text-[12px] font-medium text-danger">
                  {COUNTRY_NAME[c] ?? c}
                  <button type="button" onClick={() => patch("rules", { blockedCountries: blocked.filter((x) => x !== c) })} className="grid size-5 place-items-center rounded-full hover:bg-danger/10" aria-label={`Remove ${COUNTRY_NAME[c] ?? c}`}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <NativeSelect aria-label="Add a blocked country" className="mt-2.5 sm:max-w-xs" value="" onChange={(e) => e.target.value && patch("rules", { blockedCountries: [...blocked, e.target.value] })}>
              <option value="">Add a country…</option>
              {remaining.map((c) => <option key={c} value={c}>{COUNTRY_NAME[c]}</option>)}
            </NativeSelect>
          </div>
        </CardBody>
      </Card>
      <Card className="self-start">
        <CardHeader title="Holding and transfer limits" description="Enforced on every transfer" />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lock-up" htmlFor="rules.lockupDays" error={errors["rules.lockupDays"]} hint="0 for no lock-up" required>
              <NumberInput id="rules.lockupDays" integer value={rules?.lockupDays} onValueChange={(v) => patch("rules", { lockupDays: v })} invalid={!!errors["rules.lockupDays"]} suffix="days" />
            </Field>
            <Field label="Holding limit per investor" htmlFor="rules.holdingLimitPct" error={errors["rules.holdingLimitPct"]} required>
              <NumberInput id="rules.holdingLimitPct" value={rules?.holdingLimitPct} onValueChange={(v) => patch("rules", { holdingLimitPct: v })} invalid={!!errors["rules.holdingLimitPct"]} suffix="%" />
            </Field>
          </div>
          <Field label={`Minimum investment (${cur})`} htmlFor="rules.minInvestment" error={errors["rules.minInvestment"]} required>
            <NumberInput id="rules.minInvestment" value={rules?.minInvestment} onValueChange={(v) => patch("rules", { minInvestment: v })} invalid={!!errors["rules.minInvestment"]} />
          </Field>
          <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[12.5px] text-muted"><ShieldCheckIcon /> Jurisdiction packs and the global core always apply.</p>
        </CardBody>
      </Card>
      <div className="xl:col-span-2"><DocumentsCard draft={draft} set={set} /></div>
    </div>
  );
}

/* ------------------------------- step 4 ------------------------------- */
const CONTROL_META: { k: keyof D.TokenClass["controls"]; label: string; hint: string }[] = [
  { k: "pausable", label: "Pausable", hint: "Halt all transfers on a deployment" },
  { k: "freezable", label: "Freezable", hint: "Freeze a wallet or a partial balance" },
  { k: "forcedTransfer", label: "Forced transfer", hint: "Move tokens under court order or regulator instruction" },
  { k: "recovery", label: "Recovery", hint: "Reissue to a new wallet after verified key loss" },
  { k: "mintable", label: "Mintable", hint: "Issue new units after subscriptions settle" },
  { k: "burnable", label: "Burnable", hint: "Cancel units on redemption or maturity" },
];

function StepToken({ draft, set, patch, errors }: StepProps) {
  const t = draft.token;
  const chains = t?.chains ?? [];
  const controls = t?.controls ?? { pausable: true, freezable: true, forcedTransfer: true, recovery: true, mintable: true, burnable: true };
  const suggestion = (draft.shortName ?? draft.name ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const toggleChain = (c: D.Chain) => patch("token", { chains: chains.includes(c) ? chains.filter((x) => x !== c) : [...chains, c] });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info-soft px-4 py-3 text-[13px]">
        <Layers className="mt-0.5 size-4 shrink-0 text-info" />
        <p><span className="font-medium">The token represents the product.</span> <span className="text-muted">Each class has one canonical supply; every chain deployment reconciles to it.</span></p>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader icon={<Coins />} title="Token class" />
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Field label="Symbol" htmlFor="token.symbol" error={errors["token.symbol"]} hint="2 to 8 capital letters or digits" required>
                <div className="flex gap-2">
                  <Input id="token.symbol" value={t?.symbol ?? ""} onChange={(e) => patch("token", { symbol: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder={suggestion || "WPKS"} className="font-mono uppercase" maxLength={8} aria-invalid={!!errors["token.symbol"]} />
                  {suggestion.length >= 2 && !t?.symbol && <Button type="button" size="md" variant="secondary" onClick={() => patch("token", { symbol: suggestion })}>Use {suggestion}</Button>}
                </div>
              </Field>
              <Field label="Decimals" htmlFor="token.decimals" error={errors["token.decimals"]} required>
                <NumberInput id="token.decimals" integer value={t?.decimals} onValueChange={(v) => patch("token", { decimals: v })} invalid={!!errors["token.decimals"]} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium">Standard <span className="text-muted">(required)</span></legend>
              <div role="radiogroup" aria-label="Token standard" className="flex flex-col gap-2">
                {TOKEN_STANDARDS.map((s, i) => (
                  <ChoiceCard key={s.value} id={i === 0 ? "token.standard" : undefined} selected={t?.standard === s.value} onClick={() => patch("token", { standard: s.value })}>
                    <span className="flex items-center gap-2 text-[13px] font-semibold">{s.value}<Badge tone={s.family === "solana" ? "info" : "outline"}>{s.family === "solana" ? "Solana" : "EVM"}</Badge></span>
                    <span className="mt-0.5 block text-[12px] text-muted">{s.description}</span>
                  </ChoiceCard>
                ))}
              </div>
              {errors["token.standard"] && <p role="alert" className="mt-2 flex items-center gap-1 text-[12px] text-danger"><CircleAlert className="size-3.5" />{errors["token.standard"]}</p>}
            </fieldset>
          </CardBody>
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Deployments" description="Chains at launch. Add more later." />
            <CardBody>
              <div role="group" aria-label="Chains" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CHAINS.map((c, i) => (
                  <ChoiceCard key={c} id={i === 0 ? "token.chains" : undefined} role="checkbox" indicator="check" selected={chains.includes(c)} onClick={() => toggleChain(c)}>
                    <span className="flex items-center justify-between gap-2">
                      <ChainBadge chain={c} />
                      <span className="text-[11.5px] text-muted">{c === "solana" ? "SPL" : "EVM"}</span>
                    </span>
                  </ChoiceCard>
                ))}
              </div>
              {errors["token.chains"] && <p role="alert" className="mt-3 flex items-start gap-1.5 text-[12.5px] text-danger"><CircleAlert className="mt-0.5 size-3.5 shrink-0" />{errors["token.chains"]}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Issuer controls" description="Every use needs multi-party approval." />
            <ul className="divide-y divide-border">
              {CONTROL_META.map((c) => (
                <li key={c.k}>
                  <label htmlFor={`ctl-${c.k}`} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span>
                      <span className="block text-[13px] font-medium">{c.label}</span>
                      <span className="block text-[12px] text-muted">{c.hint}</span>
                    </span>
                    <Switch id={`ctl-${c.k}`} label={c.label} checked={controls[c.k]} onCheckedChange={(v) => patch("token", { controls: { ...controls, [c.k]: v } })} />
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <TokenClassesCard draft={draft} set={set} />
    </div>
  );
}

/* ------------------------------- step 5 ------------------------------- */
function StepOffering({ draft, patch, errors }: StepProps) {
  const o = draft.offering;
  const cur = o?.currency ?? draft.valuation?.currency ?? "USD";
  const rails = o?.rails ?? [];
  const maxSupply = o?.target && o?.pricePerToken ? Math.floor(o.target / o.pricePerToken) : undefined;
  const toggleRail = (r: D.PaymentRail) => patch("offering", { rails: rails.includes(r) ? rails.filter((x) => x !== r) : [...rails, r] });
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<Megaphone />} title="Primary offering" description="Opens after launch approval." />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Target raise" htmlFor="offering.target" error={errors["offering.target"]} required>
              <NumberInput id="offering.target" value={o?.target} onValueChange={(v) => patch("offering", { target: v })} invalid={!!errors["offering.target"]} prefix={cur} />
            </Field>
            <Field label="Price per token" htmlFor="offering.pricePerToken" error={errors["offering.pricePerToken"]} required>
              <NumberInput id="offering.pricePerToken" value={o?.pricePerToken} onValueChange={(v) => patch("offering", { pricePerToken: v })} invalid={!!errors["offering.pricePerToken"]} prefix={cur} />
            </Field>
            <Field label="Minimum ticket" htmlFor="offering.minTicket" error={errors["offering.minTicket"]} required>
              <NumberInput id="offering.minTicket" value={o?.minTicket} onValueChange={(v) => patch("offering", { minTicket: v })} invalid={!!errors["offering.minTicket"]} prefix={cur} />
            </Field>
            <Field label="Currency" htmlFor="offering.currency" error={errors["offering.currency"]} required>
              <NativeSelect id="offering.currency" value={o?.currency ?? ""} onChange={(e) => patch("offering", { currency: e.target.value as D.Currency })}>
                <option value="">Choose</option>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium">Payment rails <span className="text-muted">(required)</span></legend>
            <div role="group" aria-label="Payment rails" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(RAIL_META) as D.PaymentRail[]).map((r, i) => (
                <ChoiceCard key={r} id={i === 0 ? "offering.rails" : undefined} role="checkbox" indicator="check" selected={rails.includes(r)} onClick={() => toggleRail(r)}>
                  <span className="flex items-center gap-2 text-[13px] font-medium"><RailLogo rail={r} size={18} />{RAIL_META[r].label}<span className="ml-auto text-[11.5px] font-normal text-muted">{RAIL_META[r].eta}</span></span>
                </ChoiceCard>
              ))}
            </div>
            {errors["offering.rails"] && <p role="alert" className="mt-2 flex items-center gap-1 text-[12px] text-danger"><CircleAlert className="size-3.5" />{errors["offering.rails"]}</p>}
          </fieldset>
        </CardBody>
      </Card>
      <Card className="self-start">
        <CardHeader title="Derived supply" description="Calculated from the target raise and price" />
        <CardBody>
          <div className="text-[12px] text-muted">Maximum supply</div>
          <div className="mt-1 text-[28px] font-semibold tracking-tight tabular">{maxSupply !== undefined ? fmt.num(maxSupply) : "…"}</div>
          <div className="text-[12.5px] text-muted">{draft.token?.symbol || "Token"} units across all deployments</div>
          <dl className="mt-5 flex flex-col gap-2.5 border-t border-border pt-4 text-[13px]">
            <SummaryRow k="Minimum ticket in units" v={o?.minTicket && o?.pricePerToken ? fmt.num(Math.ceil(o.minTicket / o.pricePerToken)) : "…"} />
            <SummaryRow k="Investors at minimum ticket" v={o?.minTicket && o?.target ? `up to ${fmt.num(Math.floor(o.target / o.minTicket))}` : "…"} />
            <SummaryRow k="Product minimum" v={draft.rules?.minInvestment ? fmt.money(draft.rules.minInvestment, cur) : "…"} />
            <SummaryRow k="Deployments" v={draft.token?.chains?.length ? <span className="flex flex-wrap justify-end gap-2">{draft.token.chains.map((c) => <ChainBadge key={c} chain={c} compact />)}</span> : "…"} />
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------- step 6 ------------------------------- */
function StepReview({ draft, goTo, takenSymbols, onCreated }: { draft: AssetDraft; goTo: (n: number) => void; takenSymbols: string[]; onCreated: (id: string) => void }) {
  const create = useCreateAsset();
  const canWrite = useCan("assets.write");
  const { data: issuers } = useIssuers();
  const invalidAt = firstInvalidStep(draft, { takenSymbols });
  const cur = draft.offering?.currency ?? draft.valuation?.currency ?? "USD";
  const issuer = issuers?.find((i) => i.id === draft.issuerId);
  const maxSupply = draft.offering?.target && draft.offering?.pricePerToken ? Math.floor(draft.offering.target / draft.offering.pricePerToken) : 0;
  const ins = draft.instrument;

  const sections: { title: string; step: number; items: { label: string; value: React.ReactNode }[] }[] = [
    { title: "Template", step: 0, items: [{ label: "Template", value: draft.template ? TEMPLATE_META[draft.template].label : "…" }] },
    {
      title: "Product and legal", step: 1, items: [
        { label: "Product", value: draft.name ?? "…" },
        { label: "Short name", value: draft.shortName ?? "…" },
        { label: "Issuer", value: issuer ? <CompanyName name={issuer.sponsor} sub={issuer.name} size={26} /> : "…" },
        { label: "Legal entity", value: `${draft.legalEntity?.name ?? "…"} (${draft.legalEntity?.structure ?? "…"}, ${draft.legalEntity?.jurisdiction ?? "…"})` },
        { label: "Underlying", value: draft.underlying?.description ?? "…" },
        { label: "Appraised value", value: draft.underlying?.appraisedValue ? fmt.money(draft.underlying.appraisedValue, cur) : "…" },
      ],
    },
    {
      title: "Instrument and economics", step: 2, items: [
        { label: "Instrument", value: ins?.type ? `${INSTRUMENT_LABEL[ins.type]}${hasCoupon(ins.type) && ins.couponPct ? `, ${ins.couponPct}% to ${ins.maturity ? fmt.date(ins.maturity) : "…"}` : ""}` : "…" },
        { label: "Voting rights", value: ins?.votingRights ? "Yes" : "No" },
        { label: "Valuation", value: draft.valuation ? `${draft.valuation.method}, ${draft.valuation.frequency}` : "…" },
        { label: "Income", value: draft.income ? `${draft.income.type}, ${INCOME_FREQUENCY_LABEL[draft.income.frequency]?.toLowerCase()}, ${fmt.pct(draft.income.targetYieldPct ?? 0, 2)} target` : "…" },
        { label: "Servicer", value: draft.servicer ?? "…" },
        { label: "Authoritative record", value: draft.ownershipModel ? OWNERSHIP_META[draft.ownershipModel].label : "…" },
      ],
    },
    {
      title: "Compliance rules", step: 3, items: [
        { label: "Eligible", value: <span className="flex flex-wrap gap-1">{draft.rules?.eligibleClassifications?.map((c) => <ClassificationBadge key={c} c={c} />)}</span> },
        { label: "Blocked countries", value: draft.rules?.blockedCountries?.length ? draft.rules.blockedCountries.map((c) => COUNTRY_NAME[c] ?? c).join(", ") : "None" },
        { label: "Lock-up", value: draft.rules?.lockupDays ? `${draft.rules.lockupDays} days` : "None" },
        { label: "Holding limit", value: draft.rules?.holdingLimitPct !== undefined ? `${draft.rules.holdingLimitPct}%` : "…" },
        { label: "Minimum investment", value: draft.rules?.minInvestment ? fmt.money(draft.rules.minInvestment, cur) : "…" },
      ],
    },
    {
      title: "Token and deployment", step: 4, items: [
        { label: "Token", value: <span className="font-mono">{draft.token?.symbol || "…"}</span> },
        { label: "Standard", value: `${draft.token?.standard ?? "…"}, ${draft.token?.decimals ?? "…"} decimals` },
        { label: "Chains", value: <span className="flex flex-wrap gap-2">{draft.token?.chains?.map((c) => <ChainBadge key={c} chain={c} />)}</span> },
        { label: "Controls", value: draft.token?.controls ? CONTROL_META.filter((c) => draft.token!.controls[c.k]).map((c) => c.label).join(", ") || "None" : "…" },
      ],
    },
    {
      title: "Offering", step: 5, items: [
        { label: "Target raise", value: draft.offering?.target ? fmt.money(draft.offering.target, cur) : "…" },
        { label: "Price per token", value: draft.offering?.pricePerToken ? fmt.money(draft.offering.pricePerToken, cur, { digits: draft.offering.pricePerToken < 10 ? 4 : 2 }) : "…" },
        { label: "Maximum supply", value: maxSupply ? fmt.num(maxSupply) : "…" },
        { label: "Minimum ticket", value: draft.offering?.minTicket ? fmt.money(draft.offering.minTicket, cur) : "…" },
        { label: "Rails", value: <span className="flex flex-wrap gap-1">{draft.offering?.rails?.map((r) => <RailBadge key={r} rail={r} />)}</span> },
      ],
    },
  ];

  const nodes = [
    { icon: Landmark, label: "Underlying asset", value: draft.underlying?.description },
    { icon: Building2, label: "Legal entity", value: draft.legalEntity?.name },
    { icon: Package, label: "Financial product", value: draft.name },
    { icon: FileSignature, label: "Instrument", value: ins?.type ? INSTRUMENT_LABEL[ins.type] : undefined },
    { icon: Megaphone, label: "Offering", value: draft.offering?.target ? `${fmt.money(draft.offering.target, cur, { compact: true })} primary` : undefined },
    { icon: Layers, label: "Token class", value: draft.token?.symbol ? `${draft.token.symbol} · ${draft.token.standard}` : undefined },
  ];

  const submit = () => create.mutate(toInput(draft), { onSuccess: (a) => onCreated(a.id) });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader title={s.title} action={<Button size="sm" variant="ghost" onClick={() => goTo(s.step)}><Pencil /> Edit</Button>} />
            <CardBody className="py-4">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {s.items.map((i) => (
                  <div key={i.label} className="min-w-0">
                    <dt className="text-[12px] text-muted">{i.label}</dt>
                    <dd className="mt-0.5 break-words text-[13.5px] font-medium">{i.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-5 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardHeader title="Canonical structure" description="How the product will be recorded" />
          <CardBody>
            <ol className="flex flex-col">
              {nodes.map((n, i) => (
                <li key={n.label} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < nodes.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-border-strong" />}
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted"><n.icon className="size-4" /></span>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-[11.5px] text-muted">{n.label}</div>
                    <div className="truncate text-[13px] font-medium">{n.value || "…"}</div>
                  </div>
                </li>
              ))}
            </ol>
            {!!draft.token?.chains?.length && (
              <div className="mt-3 rounded-lg border border-dashed border-border-strong p-3">
                <div className="mb-2 text-[11.5px] text-muted">Deployments reconcile to one canonical supply</div>
                <div className="flex flex-wrap gap-2">{draft.token.chains.map((c) => <span key={c} className="rounded-md bg-surface-2 px-2 py-1"><ChainBadge chain={c} /></span>)}</div>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-3">
            {invalidAt >= 0 && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-[12.5px] text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>The {STEPS[invalidAt].toLowerCase()} step has missing or invalid values. <button type="button" className="font-medium underline underline-offset-2" onClick={() => goTo(invalidAt)}>Go to {STEPS[invalidAt].toLowerCase()}</button></span>
              </div>
            )}
            {!canWrite && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">Creating products needs the Operations, Issuer admin or Platform admin role. Switch persona from the account menu.</p>}
            <p className="flex items-center gap-2 text-[12.5px] text-muted"><Info className="size-4 shrink-0" />Saved as a draft. Nothing deploys before launch approval.</p>
            <Button variant="primary" size="lg" disabled={invalidAt >= 0 || !canWrite} isLoading={create.isPending} loadingText="Creating product…" onClick={submit}>
              Create product <ArrowRight />
            </Button>
            <Button variant="ghost" onClick={() => goTo(5)}><ArrowLeft /> Back</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- created ------------------------------- */
function Created({ assetId, onNew }: { assetId: string; onNew: () => void }) {
  const { data: asset, isPending } = useAsset(assetId);
  const submit = useSubmitAsset();
  const canWrite = useCan("assets.write");
  const submitted = asset && asset.status !== "draft" && asset.status !== "structuring";
  return (
    <Card className="overflow-hidden">
      {asset ? <AssetCover asset={asset} overlay className="h-40" /> : <Skeleton className="h-40 rounded-none" />}
      <CardBody className="flex flex-col gap-5 p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CircleCheck className="size-5 text-success" />
              <h2 className="text-[20px] font-semibold">{submitted ? "Submitted for launch approval" : "Product created as draft"}</h2>
              {asset && <StatusBadge status={asset.status} />}
            </div>
            <p className="mt-1 max-w-2xl text-[13.5px] text-muted">
              {isPending ? "Loading product…" : submitted
                ? `${asset!.name} is in review. Compliance approves first, then a platform admin confirms the regulatory permission. Track it in approvals.`
                : `${asset?.name ?? "The product"} is saved with its canonical token class and an upcoming offering. Submit it for launch approval when the documents are in place.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href={`/assets/${assetId}`}>Open product</Link></Button>
            {submitted ? (
              <Button asChild variant="primary"><Link href="/approvals">Open approvals <ArrowRight /></Link></Button>
            ) : (
              <Button variant="primary" disabled={!asset || !canWrite} isLoading={submit.isPending} loadingText="Submitting…" onClick={() => submit.mutate(assetId)}>
                <Send /> Submit for launch approval
              </Button>
            )}
            <Button variant="ghost" onClick={onNew}>Structure another</Button>
          </div>
        </div>
        {asset && (
          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-[13px] md:grid-cols-4">
            <div><dt className="text-muted">Template</dt><dd className="font-medium">{TEMPLATE_META[asset.template].label}</dd></div>
            <div><dt className="text-muted">Token class</dt><dd className="font-mono font-medium">{asset.tokenClassIds[0]?.replace("tok_", "").toUpperCase()}</dd></div>
            <div><dt className="text-muted">Jurisdiction</dt><dd className="font-medium">{asset.jurisdiction}</dd></div>
            <div><dt className="text-muted">Authoritative record</dt><dd className="font-medium">{OWNERSHIP_META[asset.ownershipModel].label}</dd></div>
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

/* -------------------------------- shared -------------------------------- */
function ShieldCheckIcon() {
  return <CircleCheck className="size-4 shrink-0 text-success" />;
}

function DiscardDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost">Discard draft</Button></DialogTrigger>
      <DialogContent
        size="sm"
        title="Discard this draft?"
        description="Every value entered in this wizard is removed. Products already created are not affected."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Keep editing</Button></DialogClose>
            <DialogClose asChild><Button variant="danger" onClick={onConfirm}>Discard draft</Button></DialogClose>
          </>
        }
      />
    </Dialog>
  );
}

function SummaryRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium tabular">{v}</dd>
    </div>
  );
}

function WizardFooter({ back, next, invalid }: { back?: () => void; next: { label: string; onClick: () => void }; invalid?: boolean }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      {back ? <Button variant="ghost" onClick={back}><ArrowLeft /> Back</Button> : <span />}
      <div className="flex items-center gap-3">
        {invalid && <span className="hidden text-[12.5px] text-danger sm:inline">Fix the highlighted fields to continue.</span>}
        <Button variant="primary" onClick={next.onClick}>{next.label} <ArrowRight /></Button>
      </div>
    </div>
  );
}
