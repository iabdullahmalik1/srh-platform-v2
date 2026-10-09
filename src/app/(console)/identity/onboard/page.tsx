"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Building2, Check, CircleAlert, FileText, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, Upload, UserRound, Wallet as WalletIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { useCreateInvestor, useInvestor } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { useWorkflows } from "@/stores/workflows";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, Field, Input, NativeSelect, PageHeader, Progress, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { Stepper } from "@/components/ui/stepper";
import { ChainBadge, ClassificationBadge, StatusBadge } from "@/components/domain/status";
import { CompanyLogo } from "@/components/domain/logos";
import { PartyAvatar } from "@/components/visual/bits";
import { FlowDiagram } from "@/components/visual/flow";
import {
  CHAINS, COUNTRY_OPTIONS, CUSTODIANS, DOC_LABEL, ENTITY_TYPE_LABEL, IdentityStatusBadge, WALLET_TYPE_LABEL, countryName, custodianRequired, walletAddressError,
} from "@/components/identity/shared";
import { CHAIN_META, CLASSIFICATION_LABEL } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";
import { KYB_OPTIONS, kybFor, kycFor } from "@/lib/kyc-countries";

/** Identity provider used for a country: national digital ID where it exists, otherwise Sumsub. */
const idProvider = (country?: string) => kycFor(country).ids.find((i) => i.digital)?.digital?.name ?? (country === "PK" ? "SRH manual review desk" : "Sumsub");

const STEPS = ["Type and classification", "Identity details", "Wallet", "Documents", "Review", "Submitted"];

type Draft = Partial<D.NewInvestorInput>;
type Owner = NonNullable<D.NewInvestorInput["beneficialOwners"]>[number];

const CLASSIFICATION_HELP: Record<D.InvestorClassification, string> = {
  retail: "Default category. Access is limited to products open to the public.",
  professional: "Meets the regulator's wealth or experience tests. Most private placements are open.",
  accredited: "Meets income or net worth thresholds for private offerings under US-style rules.",
  "qualified-purchaser": "Holds at least USD 5m in investments. Eligible for qualified purchaser funds.",
  institutional: "Regulated financial institution, fund, pension or sovereign entity.",
  "market-counterparty": "Bank, broker or dealer dealing on its own account.",
};

type DocReq = { kind: D.InvestorDocument["kind"]; label: string; required: boolean };

/** Documents follow the investor's country (identity) or the company's registry (KYB). */
function requiredDocs(draft: Draft): DocReq[] {
  if (draft.type === "entity") {
    const reg = kybFor(draft.company?.jurisdiction ?? draft.country);
    return [...reg.docs, { kind: "source-of-funds", label: "Source of funds or wealth", required: true }];
  }
  const k = kycFor(draft.residency || draft.citizenship);
  const id = k.ids.find((x) => !x.digital) ?? k.ids[0];
  return [
    { kind: id.kind, label: id.label, required: true },
    { kind: "proof-of-address", label: `Proof of address (${k.address[0].toLowerCase()})`, required: true },
    { kind: "source-of-funds", label: "Source of funds", required: true },
    ...(draft.classification && draft.classification !== "retail" ? [{ kind: "accreditation-letter" as const, label: "Professional investor attestation", required: true }] : []),
  ];
}

/** Requirements not uploaded yet are recorded as outstanding on the new account. */
function skippedFor(draft: Draft): D.VerificationKey[] {
  const have = new Set(draft.documents ?? []);
  const missing = requiredDocs(draft).filter((d) => d.required && !have.has(d.kind));
  const out = new Set<D.VerificationKey>();
  for (const d of missing) {
    if (draft.type === "entity") out.add(d.kind === "register-of-beneficial-owners" ? "beneficial-owners" : "company-documents");
    else out.add(d.kind === "proof-of-address" ? "address" : d.kind === "source-of-funds" ? "source-of-funds" : d.kind === "accreditation-letter" ? "classification" : "identity-document");
  }
  return [...out];
}

function OnboardingWizard() {
  const { onboarding, setOnboarding, resetOnboarding } = useWorkflows();
  const { step, draft, createdInvestorId } = onboarding;
  const canWrite = useCan("investors.write");
  const go = (n: number) => {
    setOnboarding({}, n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const dirty = step > 0 || !!draft.classification || !!draft.name;

  if (!canWrite) {
    return (
      <>
        <BackLink />
        <PageHeader title="Onboard investor" />
        <Card>
          <EmptyState icon={<UserRound />} title="Your role cannot onboard investors" description="Onboarding needs the Operations, Compliance officer or Platform admin role. Switch persona from the account menu." action={<Button asChild size="sm"><Link href="/identity/investors">Back to investors</Link></Button>} />
        </Card>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <PageHeader
        title="Onboard investor"
        description="Saved as you go. Checks start when you submit."
        actions={dirty && !createdInvestorId ? <DiscardDialog onConfirm={resetOnboarding} /> : undefined}
      />
      <Stepper steps={STEPS} current={createdInvestorId ? 5 : step} className="mb-6" />
      {createdInvestorId ? (
        <StepResult investorId={createdInvestorId} onAnother={resetOnboarding} />
      ) : step === 0 ? (
        <StepType draft={draft} onNext={() => go(1)} />
      ) : step === 1 ? (
        <StepIdentity draft={draft} onBack={() => go(0)} onNext={() => go(2)} />
      ) : step === 2 ? (
        <StepWallet draft={draft} onBack={() => go(1)} onNext={() => go(3)} />
      ) : step === 3 ? (
        <StepDocuments draft={draft} onBack={() => go(2)} onNext={() => go(4)} />
      ) : (
        <StepReview draft={draft} onEdit={go} onBack={() => go(3)} />
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link href="/identity/investors" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
      <ArrowLeft className="size-4" /> Investors
    </Link>
  );
}

function DiscardDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Discard draft</Button>
      </DialogTrigger>
      <DialogContent
        size="sm"
        title="Discard this draft?"
        description="Everything entered so far, including uploaded documents, is removed. This cannot be undone."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Keep draft</Button></DialogClose>
            <DialogClose asChild><Button variant="danger" onClick={onConfirm}><Trash2 /> Discard draft</Button></DialogClose>
          </>
        }
      />
    </Dialog>
  );
}

/* --------------------------------- step 1 --------------------------------- */
function StepType({ draft, onNext }: { draft: Draft; onNext: () => void }) {
  const { setOnboarding } = useWorkflows();
  const [error, setError] = React.useState<string>();
  const type = draft.type ?? "individual";
  const setType = (t: D.InvestorType) => {
    if (t === type) return;
    // Required documents differ by type, so uploads from the other type no longer apply.
    setOnboarding({ type: t, documents: [], entityType: t === "entity" ? draft.entityType ?? "corporate" : undefined, beneficialOwners: t === "entity" ? draft.beneficialOwners : undefined });
  };
  const next = () => {
    if (!draft.classification) {
      setError("Choose a classification. It decides which products the investor can access.");
      return document.getElementById(`cls-${CLASSIFICATION_KEYS[0]}`)?.focus();
    }
    onNext();
  };
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader title="Investor type" />
          <CardBody>
            <div role="radiogroup" aria-label="Investor type" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {([
                { v: "individual" as const, icon: UserRound, title: "Individual", body: "KYC with document and liveness checks" },
                { v: "entity" as const, icon: Building2, title: "Entity", body: "KYB with beneficial owner checks" },
              ]).map((o) => {
                const selected = type === o.v;
                return (
                  <button key={o.v} type="button" role="radio" aria-checked={selected} onClick={() => setType(o.v)}
                    className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-150", selected ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-border hover:border-border-strong")}>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", selected ? "bg-brand text-white" : "bg-surface-3 text-muted")}><o.icon className="size-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold">{o.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-muted">{o.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Classification" description="Checked on every subscription" />
          <CardBody>
            <div role="radiogroup" aria-label="Classification" aria-describedby={error ? "cls-error" : undefined} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CLASSIFICATION_KEYS.map((c) => {
                const selected = draft.classification === c;
                return (
                  <button key={c} id={`cls-${c}`} type="button" role="radio" aria-checked={selected} onClick={() => { setOnboarding({ classification: c }); setError(undefined); }}
                    className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150", selected ? "border-brand bg-brand-soft" : "border-border hover:border-border-strong")}>
                    <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-brand bg-brand" : "border-border-strong")}>{selected && <span className="size-1.5 rounded-full bg-white" />}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium">{CLASSIFICATION_LABEL[c]}</span>
                      <span className="block text-[12px] leading-snug text-muted">{CLASSIFICATION_HELP[c]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {error && <p id="cls-error" role="alert" className="mt-3 flex items-center gap-1 text-[12px] text-danger"><CircleAlert className="size-3.5" />{error}</p>}
          </CardBody>
        </Card>
      </div>
      <WizardFooter next={{ label: "Continue", onClick: next }} />
    </>
  );
}

const CLASSIFICATION_KEYS = Object.keys(CLASSIFICATION_LABEL) as D.InvestorClassification[];

/* --------------------------------- step 2 --------------------------------- */
const phoneRe = /^\+?[0-9 ()-]{7,20}$/;

const individualSchema = z.object({
  name: z.string().trim().min(2, "Enter the investor's full legal name"),
  email: z.email("Enter a valid email address, for example name@example.com"),
  phone: z.string().trim().refine((v) => !v || phoneRe.test(v), "Enter the phone number with country code, for example +971 50 123 4567"),
  residency: z.string().min(2, "Choose the country of residence"),
  citizenship: z.string().min(2, "Choose the country of citizenship"),
});

const ownerSchema = z.object({
  name: z.string().trim().min(2, "Enter the owner's full name"),
  ownershipPct: z.number({ error: "Enter a percentage" }).gt(0, "Enter a percentage above 0").max(100, "Ownership cannot exceed 100%"),
  nationality: z.string().min(2, "Choose a nationality"),
});

const entitySchema = z.object({
  name: z.string().trim().min(2, "Enter the entity's registered legal name"),
  registrationNumber: z.string().trim().min(3, "Enter the registration number from the certificate of incorporation"),
  entityType: z.string().min(1, "Choose the entity type"),
  country: z.string().min(2, "Choose the country of incorporation"),
  email: z.email("Enter a valid email address, for example operations@example.com"),
  beneficialOwners: z
    .array(ownerSchema)
    .min(1, "Add at least one beneficial owner")
    .superRefine((owners, ctx) => {
      const total = owners.reduce((s, o) => s + (Number.isFinite(o.ownershipPct) ? o.ownershipPct : 0), 0);
      if (total > 100) ctx.addIssue({ code: "custom", message: `Total ownership is ${fmt.num(total)}%. It must be 100% or less.` });
      else if (owners.length && !owners.some((o) => o.ownershipPct >= 25)) ctx.addIssue({ code: "custom", message: "At least one owner must hold 25% or more. Add the controlling owner." });
    }),
});

type Errors = Record<string, string>;

function toErrors(issues: z.core.$ZodIssue[]): { errors: Errors; firstId?: string } {
  const errors: Errors = {};
  let firstId: string | undefined;
  for (const i of issues) {
    const key = i.path.join(".");
    if (!errors[key]) errors[key] = i.message;
    firstId ??= key === "beneficialOwners" ? "ob-owners" : `ob-${i.path.join("-")}`;
  }
  return { errors, firstId };
}

function StepIdentity({ draft, onBack, onNext }: { draft: Draft; onBack: () => void; onNext: () => void }) {
  const { setOnboarding } = useWorkflows();
  const [errors, setErrors] = React.useState<Errors>({});
  const entity = draft.type === "entity";
  const owners: Owner[] = draft.beneficialOwners ?? [];

  const set = (patch: Draft, ...keys: string[]) => {
    setOnboarding(patch);
    if (keys.length) setErrors((e) => { const n = { ...e }; keys.forEach((k) => delete n[k]); return n; });
  };
  const setOwner = (i: number, patch: Partial<Owner>) => {
    const next = owners.map((o, j) => (j === i ? { ...o, ...patch } : o));
    set({ beneficialOwners: next }, ...Object.keys(patch).map((k) => `beneficialOwners.${i}.${k}`), "beneficialOwners");
  };
  const addOwner = () => set({ beneficialOwners: [...owners, { name: "", ownershipPct: 0, nationality: draft.country ?? "", pep: false }] }, "beneficialOwners");
  const removeOwner = (i: number) => {
    set({ beneficialOwners: owners.filter((_, j) => j !== i) });
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("beneficialOwners"))));
  };

  // Entities start with one owner row so the repeater is never empty on first visit.
  React.useEffect(() => {
    if (entity && !draft.beneficialOwners?.length) setOnboarding({ beneficialOwners: [{ name: "", ownershipPct: 0, nationality: draft.country ?? "", pep: false }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const next = () => {
    const r = entity
      ? entitySchema.safeParse({ name: draft.name ?? "", registrationNumber: draft.registrationNumber ?? "", entityType: draft.entityType ?? "", country: draft.country ?? "", email: (draft.email ?? "").trim(), beneficialOwners: owners.map((o) => ({ ...o, ownershipPct: o.ownershipPct || NaN })) })
      : individualSchema.safeParse({ name: draft.name ?? "", email: (draft.email ?? "").trim(), phone: draft.phone ?? "", residency: draft.residency ?? "", citizenship: draft.citizenship ?? "" });
    if (!r.success) {
      const { errors: e, firstId } = toErrors(r.error.issues);
      setErrors(e);
      if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus());
      return;
    }
    setErrors({});
    // Keep country and residency aligned: individuals reside where they live, entities where incorporated.
    setOnboarding(entity ? { residency: draft.country, email: draft.email?.trim() } : { country: draft.residency, email: draft.email?.trim() });
    onNext();
  };

  const total = owners.reduce((s, o) => s + (o.ownershipPct || 0), 0);

  return (
    <>
      <div className={cn("grid grid-cols-1 gap-5", entity && "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]")}>
        <Card className={cn(!entity && "max-w-3xl")}>
          <CardHeader title={entity ? "Entity details" : "Personal details"} description={entity ? "As shown on the certificate of incorporation" : "As shown on the passport or national ID"} />
          <CardBody>
            {entity ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Legal name" htmlFor="ob-name" error={errors.name} required className="sm:col-span-2">
                  <Input id="ob-name" value={draft.name ?? ""} onChange={(e) => set({ name: e.target.value }, "name")} placeholder="Al Noor Family Office Ltd" autoComplete="organization" aria-invalid={!!errors.name} />
                </Field>
                <Field label="Registration number" htmlFor="ob-registrationNumber" error={errors.registrationNumber} required>
                  <Input id="ob-registrationNumber" value={draft.registrationNumber ?? ""} onChange={(e) => set({ registrationNumber: e.target.value }, "registrationNumber")} placeholder="ADGM-000412" aria-invalid={!!errors.registrationNumber} />
                </Field>
                <Field label="Entity type" htmlFor="ob-entityType" error={errors.entityType} required>
                  <NativeSelect id="ob-entityType" value={draft.entityType ?? ""} onChange={(e) => set({ entityType: e.target.value as D.Investor["entityType"] }, "entityType")} aria-invalid={!!errors.entityType}>
                    <option value="">Choose a type</option>
                    {(Object.keys(ENTITY_TYPE_LABEL) as NonNullable<D.Investor["entityType"]>[]).map((t) => <option key={t} value={t}>{ENTITY_TYPE_LABEL[t]}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Country of incorporation" htmlFor="ob-country" error={errors.country} required>
                  <CountrySelect id="ob-country" value={draft.country} onChange={(v) => set({ country: v }, "country")} invalid={!!errors.country} />
                </Field>
                <Field label="Email" htmlFor="ob-email" error={errors.email} required hint="Used for notices and statements">
                  <Input id="ob-email" type="email" value={draft.email ?? ""} onChange={(e) => set({ email: e.target.value }, "email")} placeholder="operations@example.com" autoComplete="email" aria-invalid={!!errors.email} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="ob-name" error={errors.name} required className="sm:col-span-2">
                  <Input id="ob-name" value={draft.name ?? ""} onChange={(e) => set({ name: e.target.value }, "name")} placeholder="Fatima Rahman" autoComplete="name" aria-invalid={!!errors.name} />
                </Field>
                <Field label="Email" htmlFor="ob-email" error={errors.email} required>
                  <Input id="ob-email" type="email" value={draft.email ?? ""} onChange={(e) => set({ email: e.target.value }, "email")} placeholder="name@example.com" autoComplete="email" aria-invalid={!!errors.email} />
                </Field>
                <Field label="Phone" htmlFor="ob-phone" error={errors.phone} hint="Optional. Include the country code.">
                  <Input id="ob-phone" type="tel" value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value }, "phone")} placeholder="+971 50 123 4567" autoComplete="tel" aria-invalid={!!errors.phone} />
                </Field>
                <Field label="Country of residence" htmlFor="ob-residency" error={errors.residency} required>
                  <CountrySelect id="ob-residency" value={draft.residency} onChange={(v) => set({ residency: v }, "residency")} invalid={!!errors.residency} />
                </Field>
                <Field label="Citizenship" htmlFor="ob-citizenship" error={errors.citizenship} required>
                  <CountrySelect id="ob-citizenship" value={draft.citizenship} onChange={(v) => set({ citizenship: v }, "citizenship")} invalid={!!errors.citizenship} />
                </Field>
              </div>
            )}
          </CardBody>
        </Card>

        {entity && (
          <Card>
            <CardHeader
              title="Beneficial owners"
              description="Each person with 25% or more, up to 100% in total"
              action={<Badge tone={total > 100 ? "danger" : "neutral"}><span className="tabular">{fmt.num(total)}%</span> declared</Badge>}
            />
            <CardBody className="flex flex-col gap-3">
              <div id="ob-owners" tabIndex={-1} className="flex flex-col gap-3 focus-visible:outline-none">
                {owners.map((o, i) => (
                  <fieldset key={i} className="rounded-xl border border-border p-3.5">
                    <legend className="sr-only">Owner {i + 1}</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_110px_minmax(0,1fr)_auto] sm:items-start">
                      <Field label="Full name" htmlFor={`ob-beneficialOwners-${i}-name`} error={errors[`beneficialOwners.${i}.name`]}>
                        <Input id={`ob-beneficialOwners-${i}-name`} value={o.name} onChange={(e) => setOwner(i, { name: e.target.value })} placeholder="Faris Rossi" aria-invalid={!!errors[`beneficialOwners.${i}.name`]} />
                      </Field>
                      <Field label="Ownership %" htmlFor={`ob-beneficialOwners-${i}-ownershipPct`} error={errors[`beneficialOwners.${i}.ownershipPct`]}>
                        <Input id={`ob-beneficialOwners-${i}-ownershipPct`} inputMode="decimal" className="tabular" value={o.ownershipPct ? String(o.ownershipPct) : ""}
                          onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); setOwner(i, { ownershipPct: v ? Number(v) : 0 }); }} placeholder="25" aria-invalid={!!errors[`beneficialOwners.${i}.ownershipPct`]} />
                      </Field>
                      <Field label="Nationality" htmlFor={`ob-beneficialOwners-${i}-nationality`} error={errors[`beneficialOwners.${i}.nationality`]}>
                        <CountrySelect id={`ob-beneficialOwners-${i}-nationality`} value={o.nationality} onChange={(v) => setOwner(i, { nationality: v })} invalid={!!errors[`beneficialOwners.${i}.nationality`]} />
                      </Field>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:pt-[22px]">
                        <label className="inline-flex items-center gap-2 text-[12.5px] sm:hidden">
                          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={o.pep} onChange={(e) => setOwner(i, { pep: e.target.checked })} /> Politically exposed
                        </label>
                        <Button variant="ghost" size="icon" onClick={() => removeOwner(i)} disabled={owners.length === 1} aria-label={`Remove owner ${i + 1}`}><Trash2 /></Button>
                      </div>
                    </div>
                    <label className="mt-2 hidden items-center gap-2 text-[12.5px] text-muted sm:inline-flex">
                      <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={o.pep} onChange={(e) => setOwner(i, { pep: e.target.checked })} /> This owner is a politically exposed person
                    </label>
                  </fieldset>
                ))}
              </div>
              {errors.beneficialOwners && <p role="alert" className="flex items-center gap-1 text-[12px] text-danger"><CircleAlert className="size-3.5" />{errors.beneficialOwners}</p>}
              <div><Button variant="secondary" size="sm" onClick={addOwner} disabled={owners.length >= 8}><Plus /> Add owner</Button></div>
            </CardBody>
          </Card>
        )}
      </div>
      <WizardFooter back={onBack} next={{ label: "Continue", onClick: next }} />
    </>
  );
}

function CountrySelect({ id, value, onChange, invalid }: { id: string; value?: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <NativeSelect id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}>
      <option value="">Choose a country</option>
      {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </NativeSelect>
  );
}

/* --------------------------------- step 3 --------------------------------- */
type WalletDraft = { chain: D.Chain; type: D.WalletType; custodian?: string; address: string };

function StepWallet({ draft, onBack, onNext }: { draft: Draft; onBack: () => void; onNext: () => void }) {
  const { setOnboarding } = useWorkflows();
  const w: WalletDraft = { chain: "ethereum", type: "custodial", custodian: CUSTODIANS[0], address: "", ...(draft.wallet ?? {}) };
  const [errors, setErrors] = React.useState<{ address?: string; custodian?: string }>({});
  const set = (patch: Partial<WalletDraft>) => {
    setOnboarding({ wallet: { ...w, ...patch } });
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };
  const next = () => {
    const e: typeof errors = {};
    if (custodianRequired(w.type) && !w.custodian) e.custodian = "Choose the custodian that controls this wallet";
    const a = walletAddressError(w.chain, w.address);
    if (a) e.address = a;
    setErrors(e);
    if (e.custodian) return document.getElementById("ob-wallet-custodian")?.focus();
    if (e.address) return document.getElementById("ob-wallet-address")?.focus();
    setOnboarding({ wallet: { ...w, address: w.address.trim(), custodian: custodianRequired(w.type) ? w.custodian : undefined } });
    onNext();
  };
  const skip = () => {
    setOnboarding({ wallet: undefined });
    setErrors({});
    onNext();
  };
  return (
    <>
      <Card className="max-w-3xl">
        <CardHeader icon={<WalletIcon />} title="Wallet" description="Optional. Screened on submit, whitelisted after sign-off." />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Chain" htmlFor="ob-wallet-chain">
              <NativeSelect id="ob-wallet-chain" value={w.chain} onChange={(e) => set({ chain: e.target.value as D.Chain })}>
                {CHAINS.map((c) => <option key={c} value={c}>{CHAIN_META[c].label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Custody type" htmlFor="ob-wallet-type">
              <NativeSelect id="ob-wallet-type" value={w.type} onChange={(e) => set({ type: e.target.value as D.WalletType })}>
                {(Object.keys(WALLET_TYPE_LABEL) as D.WalletType[]).map((t) => <option key={t} value={t}>{WALLET_TYPE_LABEL[t]}</option>)}
              </NativeSelect>
            </Field>
            {custodianRequired(w.type) && (
              <Field label="Custodian" htmlFor="ob-wallet-custodian" error={errors.custodian} required className="sm:col-span-2">
                <NativeSelect id="ob-wallet-custodian" value={w.custodian ?? ""} onChange={(e) => set({ custodian: e.target.value })} aria-invalid={!!errors.custodian}>
                  <option value="">Choose a custodian</option>
                  {CUSTODIANS.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </Field>
            )}
            <Field label="Address" htmlFor="ob-wallet-address" error={errors.address} required className="sm:col-span-2" hint={w.chain === "solana" ? "Base58, 32 to 44 characters" : "0x followed by 40 hexadecimal characters"}>
              <Input id="ob-wallet-address" className="font-mono text-[12.5px]" value={w.address} onChange={(e) => set({ address: e.target.value })} spellCheck={false} autoComplete="off"
                placeholder={w.chain === "solana" ? "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" : "0x71cb683a2b73380eaae57cce4a113eb63d29c590"} aria-invalid={!!errors.address} />
            </Field>
          </div>
        </CardBody>
      </Card>
      <WizardFooter back={onBack} next={{ label: "Continue", onClick: next }} extra={<Button variant="ghost" onClick={skip}>Skip for now</Button>} />
    </>
  );
}

/* --------------------------------- step 4 --------------------------------- */
function StepDocuments({ draft, onBack, onNext }: { draft: Draft; onBack: () => void; onNext: () => void }) {
  const { setOnboarding } = useWorkflows();
  const reqs = requiredDocs(draft);
  const required = reqs.map((r) => r.kind);
  const labelOf = (k: D.InvestorDocument["kind"]) => reqs.find((r) => r.kind === k)?.label ?? DOC_LABEL[k];
  const ready = new Set(draft.documents ?? []);
  const entity = draft.type === "entity";
  const jurisdiction = draft.company?.jurisdiction ?? (draft.country === "AE" ? "AE-ML" : draft.country ?? "");
  const [progress, setProgress] = React.useState<Partial<Record<D.InvestorDocument["kind"], number>>>({});
  const [error, setError] = React.useState<string>();
  const timers = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});

  React.useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearInterval);
  }, []);

  const upload = (kind: D.InvestorDocument["kind"]) => {
    setError(undefined);
    clearInterval(timers.current[kind]);
    setProgress((p) => ({ ...p, [kind]: 0 }));
    const docs = useWorkflows.getState().onboarding.draft.documents ?? [];
    setOnboarding({ documents: docs.filter((d) => d !== kind) });
    const started = Date.now();
    timers.current[kind] = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / 1500) * 100);
      setProgress((p) => ({ ...p, [kind]: pct }));
      if (pct >= 100) {
        clearInterval(timers.current[kind]);
        const current = useWorkflows.getState().onboarding.draft.documents ?? [];
        setOnboarding({ documents: [...current.filter((d) => d !== kind), kind] });
        setProgress((p) => { const n = { ...p }; delete n[kind]; return n; });
      }
    }, 80);
  };

  const done = required.filter((k) => ready.has(k)).length;
  const next = () => onNext();

  return (
    <>
      <Card className="max-w-3xl">
        <CardHeader icon={<FileText />} title="Documents" description={entity ? `KYB documents for ${kybFor(jurisdiction).name}` : `Identity documents for ${countryName(draft.residency ?? "") || "the investor's country"}`} action={<Badge tone={done === required.length ? "success" : "neutral"}><span className="tabular">{done} of {required.length}</span> ready</Badge>} />
        {entity && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
            <label htmlFor="kyb-juris" className="text-[12.5px] font-medium">Registry</label>
            <NativeSelect id="kyb-juris" value={jurisdiction} onChange={(e) => setOnboarding({ documents: [], company: { jurisdiction: e.target.value, registry: kybFor(e.target.value).registry, legalForm: kybFor(e.target.value).legalForms[0], directors: [], signatories: [], bankAccounts: [] } })} className="h-9 w-auto min-w-[260px]">
              {KYB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="XX">Other jurisdiction</option>
            </NativeSelect>
            <span className="text-[12px] text-muted">{kybFor(jurisdiction).lookup ? `Record checked through ${kybFor(jurisdiction).lookup}` : "Record checked by the registry desk"}</span>
          </div>
        )}
        <ul className="divide-y divide-border">
          {required.map((k) => {
            const p = progress[k];
            const uploading = p !== undefined;
            const isReady = ready.has(k) && !uploading;
            return (
              <li key={k} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors", isReady ? "bg-success-soft text-success" : "bg-surface-3 text-muted")}>{isReady ? <Check className="size-4" strokeWidth={2.5} /> : <FileText className="size-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{labelOf(k)}{reqs.find((r) => r.kind === k)?.required === false && <span className="font-normal text-muted"> (optional)</span>}</div>
                    {uploading ? (
                      <div className="mt-1.5 flex items-center gap-2"><Progress value={p} className="max-w-[220px]" /><span className="text-[11.5px] text-muted tabular">{Math.round(p)}%</span></div>
                    ) : (
                      <div className="text-[12px] text-muted">{isReady ? "Ready. Uploaded to the draft." : "PDF, JPG or PNG up to 20 MB"}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-11 sm:pl-0">
                  {isReady && <Badge tone="success" dot>Ready</Badge>}
                  <Button size="sm" variant={isReady ? "ghost" : "secondary"} onClick={() => upload(k)} disabled={uploading} aria-label={`${isReady ? "Replace" : "Upload"} ${labelOf(k)}`}>
                    {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />} {uploading ? "Uploading…" : isReady ? "Replace" : "Upload"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className="flex items-center gap-1 border-t border-border px-5 py-3 text-[12px] text-danger"><CircleAlert className="size-3.5" />{error}</p>}
      </Card>
      {done < required.length && !error && (
        <p className="mt-3 max-w-3xl text-[12.5px] text-muted">{required.length - done} not uploaded yet. The account can still be opened; missing items show on the investor file for follow-up.</p>
      )}
      <WizardFooter back={onBack} next={{ label: "Continue to review", onClick: next, disabled: Object.keys(progress).length > 0 }} />
    </>
  );
}

/* --------------------------------- step 5 --------------------------------- */
function buildInput(draft: Draft): D.NewInvestorInput {
  const entity = draft.type === "entity";
  const w = draft.wallet;
  const walletOk = w && !walletAddressError(w.chain, w.address);
  return {
    type: draft.type ?? "individual",
    name: (draft.name ?? "").trim(),
    email: (draft.email ?? "").trim(),
    phone: entity ? undefined : draft.phone?.trim() || undefined,
    country: (entity ? draft.country : draft.residency) ?? "",
    residency: (entity ? draft.country : draft.residency) ?? "",
    citizenship: entity ? undefined : draft.citizenship,
    entityType: entity ? draft.entityType : undefined,
    registrationNumber: entity ? draft.registrationNumber?.trim() : undefined,
    classification: draft.classification ?? "retail",
    wallet: walletOk ? { address: w.address.trim(), chain: w.chain, type: w.type, custodian: custodianRequired(w.type) ? w.custodian : undefined } : undefined,
    beneficialOwners: entity ? (draft.beneficialOwners ?? []).map((o) => ({ name: o.name.trim(), ownershipPct: o.ownershipPct, nationality: o.nationality, pep: o.pep })) : undefined,
    documents: (draft.documents ?? []).filter((k) => requiredDocs(draft).some((r) => r.kind === k)),
    skipped: skippedFor(draft),
    idDocumentLabel: entity ? undefined : requiredDocs(draft)[0]?.label,
    company: entity ? { jurisdiction: draft.company?.jurisdiction ?? (draft.country === "AE" ? "AE-ML" : draft.country ?? ""), registry: kybFor(draft.company?.jurisdiction ?? draft.country).registry, legalForm: draft.company?.legalForm ?? kybFor(draft.company?.jurisdiction ?? draft.country).legalForms[0], directors: [], signatories: [], bankAccounts: [] } : undefined,
  };
}

function StepReview({ draft, onEdit, onBack }: { draft: Draft; onEdit: (step: number) => void; onBack: () => void }) {
  const { completeOnboarding, setOnboarding } = useWorkflows();
  const create = useCreateInvestor();
  const input = buildInput(draft);
  const entity = input.type === "entity";
  const docsReady = true;
  const outstanding = skippedFor(draft);
  const submit = () =>
    create.mutate(input, {
      onSuccess: (inv) => {
        setOnboarding({}, 5);
        completeOnboarding(inv.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    });

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReviewCard title="Type and classification" onEdit={() => onEdit(0)}>
          <Row k="Investor type" v={entity ? "Entity" : "Individual"} />
          <Row k="Classification" v={<ClassificationBadge c={input.classification} />} />
          <Row k="Identity check" v={entity ? "KYB with beneficial owners" : "KYC with liveness"} />
        </ReviewCard>
        <ReviewCard title={entity ? "Entity details" : "Personal details"} onEdit={() => onEdit(1)}>
          <Row k={entity ? "Legal name" : "Full name"} v={input.name || <Missing />} />
          {entity && <Row k="Registration number" v={input.registrationNumber || <Missing />} />}
          {entity && <Row k="Entity type" v={input.entityType ? ENTITY_TYPE_LABEL[input.entityType] : <Missing />} />}
          <Row k="Email" v={input.email || <Missing />} />
          {!entity && <Row k="Phone" v={input.phone ?? <span className="text-muted">Not provided</span>} />}
          <Row k={entity ? "Country of incorporation" : "Residency"} v={input.residency ? countryName(input.residency) : <Missing />} />
          {!entity && <Row k="Citizenship" v={input.citizenship ? countryName(input.citizenship) : <Missing />} />}
        </ReviewCard>
        {entity && (
          <ReviewCard title="Beneficial owners" onEdit={() => onEdit(1)}>
            {(input.beneficialOwners ?? []).map((o, i) => (
              <Row key={i} k={o.name || `Owner ${i + 1}`} v={<span className="inline-flex items-center gap-2"><span className="tabular">{fmt.num(o.ownershipPct)}%</span><span className="text-muted">{o.nationality}</span>{o.pep && <Badge tone="warning">PEP</Badge>}</span>} />
            ))}
          </ReviewCard>
        )}
        <ReviewCard title="Wallet" onEdit={() => onEdit(2)}>
          {input.wallet ? (
            <>
              <Row k="Chain" v={<ChainBadge chain={input.wallet.chain} />} />
              <Row k="Custody" v={`${WALLET_TYPE_LABEL[input.wallet.type]}${input.wallet.custodian ? ` at ${input.wallet.custodian}` : ""}`} />
              <Row k="Address" v={<CopyText value={input.wallet.address} lead={8} tail={6} />} />
            </>
          ) : (
            <p className="text-[13px] text-muted">No wallet linked. One can be added from the investor profile later.</p>
          )}
        </ReviewCard>
        <ReviewCard title="Documents" onEdit={() => onEdit(3)}>
          {requiredDocs(draft).map((r) => (
            <Row key={r.kind + r.label} k={r.label} v={draft.documents?.includes(r.kind) ? <Badge tone="success" dot>Ready</Badge> : <Badge tone={r.required ? "warning" : "neutral"}>{r.required ? "Outstanding" : "Not provided"}</Badge>} />
          ))}
          {outstanding.length > 0 && <p className="mt-2 text-[12px] text-muted">The account opens with these items outstanding. Orders are held for review until they are in or waived.</p>}
        </ReviewCard>
      </div>
      <Card className="mt-5">
        <CardBody className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2.5 text-[13px] font-medium">On submit</div>
            <FlowDiagram
              breakpoint="xl"
              compact
              label="Checks after submission"
              nodes={[
                entity
                  ? { key: "registry", label: "Registry and owners", sub: kybFor(input.company?.jurisdiction).lookup ?? "Sumsub KYB", media: <CompanyLogo name={kybFor(input.company?.jurisdiction).lookup ?? "Sumsub KYB"} size={28} /> }
                  : { key: "veridex", label: "Documents and liveness", sub: idProvider(input.residency), media: <CompanyLogo name={idProvider(input.residency)} size={28} /> },
                { key: "sentinel", label: "Sanctions and PEP", sub: "ComplyAdvantage", media: <CompanyLogo name="ComplyAdvantage" size={28} /> },
                { key: "chainscope", label: "Wallet risk", sub: "Chainalysis", media: <CompanyLogo name="Chainalysis" size={28} /> },
                { key: "signoff", label: "Compliance sign-off", sub: "Compliance officer", icon: ShieldCheck, tone: "navy" },
              ]}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
            <Button variant="primary" onClick={submit} isLoading={create.isPending} loadingText="Submitting…" disabled={!docsReady || !input.name || !input.email}>Submit for verification <ArrowRight /></Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Missing() {
  return <span className="text-danger">Missing</span>;
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={<Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}><Pencil /> Edit</Button>} />
      <CardBody><dl className="flex flex-col gap-2.5 text-[13px]">{children}</dl></CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-muted">{k}</dt>
      <dd className="min-w-0 text-right">{v}</dd>
    </div>
  );
}

/* --------------------------------- step 6 --------------------------------- */
const PROVIDER_CHECKS = [
  { label: "Documents", provider: "Sumsub" },
  { label: "Liveness", provider: "Sumsub" },
  { label: "Sanctions and PEP screening", provider: "ComplyAdvantage" },
  { label: "Wallet risk", provider: "Chainalysis" },
];
const CHECK_MS = 1500;

function StepResult({ investorId, onAnother }: { investorId: string; onAnother: () => void }) {
  const router = useRouter();
  const { data: inv, isPending, refetch } = useInvestor(investorId);
  const [now, setNow] = React.useState(() => Date.now());
  const start = inv ? new Date(inv.onboardedAt).getTime() : now;
  const elapsed = now - start;
  const complete = elapsed >= PROVIDER_CHECKS.length * CHECK_MS;
  const refetched = React.useRef(false);

  React.useEffect(() => {
    if (complete) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [complete]);

  // Provider webhooks land after the checks; refresh once so the profile reflects verified documents.
  React.useEffect(() => {
    if (!complete || refetched.current || !inv) return;
    refetched.current = true;
    const t = setTimeout(() => refetch(), 600);
    return () => clearTimeout(t);
  }, [complete, inv, refetch]);

  if (isPending || !inv) {
    return <Card><CardBody className="flex flex-col gap-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /><Skeleton className="h-40" /></CardBody></Card>;
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-6 p-5 md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 items-start gap-4">
          <PartyAvatar name={inv.name} type={inv.type} src={inv.avatar} logo={inv.logo} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">Investor <CopyText value={inv.id} display={inv.id} /></div>
            <h2 className="mt-1 text-[20px] font-semibold">{inv.name} submitted for verification</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ClassificationBadge c={inv.classification} />
              <IdentityStatusBadge investor={inv} />
              {inv.wallets[0] && <ChainBadge chain={inv.wallets[0].chain} />}
            </div>
          </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" onClick={onAnother}>Onboard another</Button>
            <Button variant="primary" onClick={() => router.push(`/identity/investors/${inv.id}`)}>Open investor profile <ArrowRight /></Button>
          </div>
        </div>

        <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
          {PROVIDER_CHECKS.map((c, i) => {
            const skipped = c.label === "Wallet risk" && !inv.wallets.length;
            const done = elapsed >= (i + 1) * CHECK_MS;
            const running = !done && elapsed >= i * CHECK_MS;
            return (
              <li key={c.label} className={cn("flex items-start gap-3 rounded-xl border p-3.5 transition-colors duration-300", done ? "border-success/30 bg-success-soft" : running ? "border-border-strong bg-surface-2" : "border-border")}>
                <span className="relative shrink-0">
                  <CompanyLogo name={c.provider} size={32} />
                  <span className={cn("absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full ring-2 ring-surface", done ? "bg-success text-white" : "bg-surface text-muted")}>
                    {done ? <Check className="size-2.5" strokeWidth={3.5} /> : running ? <LoaderCircle className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-border-strong" />}
                  </span>
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{c.label}</div>
                  <div className="text-[12px] text-muted">{done ? (skipped ? "No wallet linked" : "Passed") : running ? `Running at ${c.provider}…` : `Queued at ${c.provider}`}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={cn("flex items-start gap-3 rounded-xl border p-4 transition-opacity duration-500", complete ? "border-warning/30 bg-warning-soft opacity-100" : "border-border opacity-50")}>
          <CircleAlert className={cn("mt-0.5 size-4 shrink-0", complete ? "text-warning" : "text-muted")} />
          <div className="text-[13px]">
            <div className="font-medium">{complete ? "Provider checks passed. Compliance sign-off is pending." : "Provider checks are running."}</div>
            <p className="text-muted">
              {complete
                ? `A compliance officer approves the ${inv.type === "entity" ? "KYB" : "KYC"} from the investor profile. The investor cannot subscribe until then.`
                : "Results arrive by webhook. You can leave this page; the investor profile updates when they land."}
            </p>
          </div>
          {complete && <StatusBadge status="pending-approval" className="ml-auto hidden shrink-0 sm:inline-flex" />}
        </div>
      </CardBody>
    </Card>
  );
}

/* --------------------------------- shared --------------------------------- */
function WizardFooter({ back, next, extra }: { back?: () => void; next: { label: string; onClick: () => void; disabled?: boolean }; extra?: React.ReactNode }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
      {back ? <Button variant="ghost" onClick={back}><ArrowLeft /> Back</Button> : <span />}
      <div className="flex items-center gap-2">
        {extra}
        <Button variant="primary" onClick={next.onClick} disabled={next.disabled}>{next.label} <ArrowRight /></Button>
      </div>
    </div>
  );
}

export default function OnboardInvestorPage() {
  return <OnboardingWizard />;
}
