"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookUser,
  BriefcaseBusiness,
  Building,
  ChartCandlestick,
  Check,
  Clock3,
  CreditCard,
  FileText,
  Fingerprint,
  Home,
  Heart,
  CircleAlert,
  Gem,
  IdCard,
  Landmark,
  Pencil,
  ScanFace,
  Sparkles,
  UserRound,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AssetTemplate, InvestorClassification, RiskProfile } from "@/types/domain";
import { NetworkLogo } from "@/components/domain/logos";
import { RISK_META } from "@/lib/risk";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NativeSelect } from "@/components/ui/primitives";
import { CHAIN_META, CLASSIFICATION_LABEL, COUNTRY_NAME, TEMPLATE_META } from "@/lib/constants";
import { kybFor, kycFor, type IdOption } from "@/lib/kyc-countries";
import { CompanyLogo } from "@/components/domain/logos";
import { cn, fmt } from "@/lib/utils";
import { DocumentScan } from "./doc-scan";
import {
  CLASS_EXPLAIN,
  COUNTRY_OPTIONS,
  OUTSTANDING_LABEL,
  buildDocument,
  idOptionsFor,
  outstandingKeys,
  scanTypeFor,
  type AccountType,
  type AssetsBand,
  type DocType,
  type Experience,
  type OnboardingDraft,
  type ProStatus,
} from "./onboarding-model";
import { ChoiceCard, EASE, GroupLabel, IconChip, SelectDot } from "./parts";
import type { RailStep } from "./progress-rail";

type Patch = (p: Partial<OnboardingDraft>) => void;

/* ------------------------------- account type ------------------------------ */

const TYPES: { value: AccountType; icon: LucideIcon; title: string; chips: { icon: LucideIcon; label: string }[] }[] = [
  { value: "individual", icon: UserRound, title: "Individual", chips: [{ icon: IdCard, label: "ID document" }, { icon: ScanFace, label: "Liveness" }, { icon: Wallet, label: "Wallet" }] },
  { value: "entity", icon: Building, title: "Company", chips: [{ icon: FileText, label: "Company documents" }, { icon: IdCard, label: "Signatory ID" }, { icon: Wallet, label: "Wallet" }] },
];

function Illustration({ icon: Icon, selected }: { icon: LucideIcon; selected: boolean }) {
  return (
    <span className={cn("relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg transition-colors duration-200", selected ? "bg-brand-soft" : "bg-surface-2")}>
      <svg aria-hidden viewBox="0 0 200 112" className={cn("absolute inset-0 size-full transition-colors duration-200", selected ? "text-brand" : "text-border-strong")} preserveAspectRatio="xMidYMid slice">
        <circle cx="100" cy="56" r="30" fill="none" stroke="currentColor" strokeOpacity=".35" />
        <circle cx="100" cy="56" r="46" fill="none" stroke="currentColor" strokeOpacity=".22" />
        <circle cx="100" cy="56" r="64" fill="none" stroke="currentColor" strokeOpacity=".12" />
      </svg>
      <span className={cn("relative grid size-14 place-items-center rounded-2xl shadow-2 transition-colors duration-200", selected ? "bg-brand text-white" : "bg-surface text-foreground")}>
        <Icon className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
    </span>
  );
}

export function AccountTypeStep({ value, onChange, journey }: { value: AccountType; onChange: (t: AccountType) => void; journey: RailStep[] }) {
  return (
    <div className="space-y-7">
      <div role="radiogroup" aria-label="Account type" className="grid gap-3 sm:grid-cols-2">
        {TYPES.map((t) => (
          <ChoiceCard key={t.value} name="account-type" value={t.value} selected={value === t.value} onSelect={() => onChange(t.value)} className="flex-col gap-3 p-3">
            <Illustration icon={t.icon} selected={value === t.value} />
            <span className="flex items-center justify-between gap-2 px-1">
              <span className="text-[15px] font-semibold text-foreground">{t.title}</span>
              <SelectDot selected={value === t.value} />
            </span>
            <span className="flex flex-wrap gap-1.5 px-1 pb-1">
              {t.chips.map((c) => (
                <IconChip key={c.label} icon={c.icon}>{c.label}</IconChip>
              ))}
            </span>
          </ChoiceCard>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <GroupLabel icon={Sparkles} className="mb-0">How it works</GroupLabel>
          <IconChip icon={Clock3}>About 5 minutes</IconChip>
        </div>
        <ol className="grid grid-cols-4 gap-y-4 sm:grid-cols-7">
          {journey.map((s, i) => (
            <li key={s.label} className="relative flex flex-col items-center gap-1.5 text-center">
              {i < journey.length - 1 && <span aria-hidden className={cn("absolute left-1/2 top-[17px] h-px w-full bg-border-strong", i === 3 && "max-sm:hidden")} />}
              <span className="relative grid size-9 place-items-center rounded-full border border-border bg-surface text-muted shadow-1">
                <s.icon className="size-4" aria-hidden />
              </span>
              <span className="text-[11.5px] leading-tight text-muted">{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ---------------------------------- details -------------------------------- */

function CountrySelect({ id, value, onChange, invalid, placeholder = "Select country" }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string }) {
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} className="h-10">
      <option value="">{placeholder}</option>
      {COUNTRY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function DetailsStep({ draft, errors, onChange, onSample }: { draft: OnboardingDraft; errors: Record<string, string>; onChange: Patch; onSample: () => void }) {
  const entity = draft.accountType === "entity";
  const text = (key: "name" | "email" | "phone" | "companyName" | "registrationNumber", label: string, opts: { type?: string; autoComplete?: string; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] } = {}) => (
    <Field label={label} htmlFor={`oa-${key}`} error={errors[key]}>
      <Input
        id={`oa-${key}`}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        value={draft[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
        aria-invalid={!!errors[key] || undefined}
        aria-describedby={errors[key] ? `oa-${key}-error` : undefined}
        className="h-10"
      />
    </Field>
  );
  const country = (key: "residency" | "citizenship" | "incorporationCountry", label: string) => (
    <Field label={label} htmlFor={`oa-${key}`} error={errors[key]}>
      <CountrySelect id={`oa-${key}`} value={draft[key]} onChange={(v) => onChange({ [key]: v })} invalid={!!errors[key]} />
    </Field>
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="tonal" size="sm" onClick={onSample}>
          <Sparkles /> Use sample applicant
        </Button>
      </div>
      <section>
        {entity && <GroupLabel icon={UserRound}>Authorised signatory</GroupLabel>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("name", "Full legal name", { autoComplete: "name" })}</div>
          {text("email", "Email", { type: "email", autoComplete: "email", placeholder: "name@example.com" })}
          {text("phone", "Mobile number", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+971 50 123 4567" })}
          {country("residency", "Country of residence")}
          {country("citizenship", "Citizenship")}
          {entity && (
            <Field label="Title" htmlFor="oa-signatoryTitle">
              <Input id="oa-signatoryTitle" value={draft.signatoryTitle} onChange={(e) => onChange({ signatoryTitle: e.target.value })} className="h-10" placeholder="Director, CFO, Treasurer" />
            </Field>
          )}
        </div>
      </section>
    </div>
  );
}

/* --------------------------------- document -------------------------------- */

const DOC_ICON: Record<DocType, LucideIcon> = { passport: BookUser, "national-id": IdCard, "emirates-id": CreditCard };

/** Government digital identity: verified data comes back from the issuing authority, no scan needed. */
function DigitalIdConnect({ option, done, onDone, onReset }: { option: IdOption; done: boolean; onDone: () => void; onReset: () => void }) {
  const [phase, setPhase] = React.useState<"idle" | "waiting" | "done">(done ? "done" : "idle");
  React.useEffect(() => {
    if (phase !== "waiting") return;
    const t = setTimeout(() => {
      setPhase("done");
      onDone();
    }, 1800);
    return () => clearTimeout(t);
  }, [phase, onDone]);
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyLogo name={option.digital!.name} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{option.digital!.name}</span>
          <span className="block text-[12.5px] text-muted">Name, date of birth, ID number and address come directly from {option.digital!.provider}.</span>
        </span>
        {phase === "done" ? (
          <span className="flex items-center gap-2">
            <IconChip icon={Check} tone="success">Verified</IconChip>
            <Button variant="ghost" size="sm" onClick={() => { setPhase("idle"); onReset(); }}>Use another method</Button>
          </span>
        ) : (
          <Button variant="primary" onClick={() => setPhase("waiting")} isLoading={phase === "waiting"} loadingText="Approve in the app…">
            Continue with {option.digital!.name}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddressProof({ country, draft, onChange }: { country: string; draft: OnboardingDraft; onChange: Patch }) {
  const k = kycFor(country);
  const evidence = draft.addressEvidence ?? k.address[0];
  return (
    <section className="rounded-2xl border border-border p-4">
      <GroupLabel icon={Home}>Proof of address</GroupLabel>
      <div role="radiogroup" aria-label="Address evidence" className="flex flex-wrap gap-2">
        {k.address.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={evidence === a} onClick={() => onChange({ addressEvidence: a, address: undefined })}
            className={cn("inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors", evidence === a ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-foreground hover:bg-surface-2")}>
            {a}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {draft.address === "provided" ? (
          <IconChip icon={Check} tone="success">{evidence} uploaded</IconChip>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={() => onChange({ address: "provided", addressEvidence: evidence })}>
              <Upload /> Upload file
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onChange({ address: "later" })} aria-pressed={draft.address === "later"}>
              Add later
            </Button>
            {draft.address === "later" && <span className="text-[12px] text-muted">You can upload it from your account.</span>}
          </>
        )}
      </div>
    </section>
  );
}

export function DocumentStep({ draft, photo, error, onChange }: { draft: OnboardingDraft; photo: string; error?: string; onChange: Patch }) {
  const reduce = useReducedMotion();
  const country = draft.residency || draft.citizenship;
  const options = idOptionsFor(draft);
  const option = options.find((o) => o.key === draft.idKey);
  const doc = React.useMemo(() => (draft.docType ? buildDocument(draft, draft.docType) : undefined), [draft]);
  const select = (o: IdOption) => onChange({ idKey: o.key, idLabel: o.label, docType: scanTypeFor(o), digitalId: !!o.digital, doc: undefined, liveness: false });
  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-muted">Options for {COUNTRY_NAME[country] ?? "your country"}.</p>
      <div role="radiogroup" aria-label="Identity method" className={cn("grid gap-2.5", options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {options.map((o) => {
          const Icon = o.digital ? Fingerprint : DOC_ICON[scanTypeFor(o)];
          const selected = draft.idKey === o.key;
          return (
            <ChoiceCard key={o.key} name="doc-type" value={o.key} selected={selected} onSelect={() => select(o)} className="flex-col items-center gap-2 px-2 py-3.5 text-center">
              <span className={cn("grid size-10 place-items-center rounded-xl transition-colors duration-150", selected ? "bg-brand text-white" : "bg-surface-3 text-foreground")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-foreground">{o.label}</span>
              <span className="hidden text-[11.5px] text-muted sm:block">{o.digital ? "Digital ID" : fmt.sentence(o.sides)}</span>
            </ChoiceCard>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {option?.digital ? (
          <motion.div key={option.key} initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            <DigitalIdConnect option={option} done={!!draft.doc} onDone={() => onChange({ doc: buildDocument(draft, "national-id"), liveness: true, address: "provided", addressEvidence: `${option.digital!.name} registered address` })} onReset={() => onChange({ doc: undefined, liveness: false, address: undefined })} />
          </motion.div>
        ) : option && draft.docType && doc ? (
          <motion.div key={option.key} initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            <DocumentScan
              type={draft.docType}
              label={option.label}
              issuerCountry={option.kind === "passport" ? draft.citizenship : country}
              doc={doc}
              photo={photo}
              citizenship={draft.citizenship}
              captured={!!draft.doc}
              onComplete={() => onChange({ doc })}
              onReset={() => onChange({ doc: undefined, liveness: false })}
            />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-40 place-items-center rounded-2xl border border-dashed border-border-strong text-[13px] text-muted">
            <span className="flex items-center gap-2">
              <IdCard className="size-4" aria-hidden /> Choose how to verify
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {draft.accountType === "individual" && !option?.digital && <AddressProof country={country} draft={draft} onChange={onChange} />}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- profile -------------------------------- */

type QKey = "experience" | "assets" | "status";
function questions(entity: boolean): { key: QKey; label: string; icon: LucideIcon; options: [string, string][] }[] {
  return [
    { key: "experience", label: "Investment experience", icon: ChartCandlestick, options: [["none", "New to investing"], ["some", "1 to 3 years"], ["extensive", "Over 3 years"]] },
    { key: "assets", label: entity ? "Net assets of the company" : "Net assets, excluding your main home", icon: Landmark, options: [["under-200k", "Under USD 200k"], ["200k-1m", "USD 200k to 1m"], ["1m-5m", "USD 1m to 5m"], ["over-5m", "Over USD 5m"]] },
    { key: "status", label: entity ? "Regulated status" : "Professional background", icon: BriefcaseBusiness, options: entity ? [["none", "Not regulated"], ["finance", "Financial services firm"], ["licensed", "Licensed institution"]] : [["none", "None"], ["finance", "Financial services"], ["licensed", "Licensed professional"]] },
  ];
}

const TIERS: { c: InvestorClassification; icon: LucideIcon }[] = [
  { c: "retail", icon: UserRound },
  { c: "professional", icon: BriefcaseBusiness },
  { c: "accredited", icon: Gem },
];

export function ProfileStep({ draft, classification, error, onChange }: { draft: OnboardingDraft; classification: InvestorClassification | null; error?: string; onChange: Patch }) {
  const reduce = useReducedMotion();
  const activeIdx = TIERS.findIndex((t) => t.c === classification);
  return (
    <div className="space-y-6">
      {questions(draft.accountType === "entity").map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-2.5 flex items-center gap-2 text-[13.5px] font-medium text-foreground">
            <q.icon className="size-4 text-muted" aria-hidden />
            {q.label}
          </legend>
          <div role="radiogroup" aria-label={q.label} className="flex flex-wrap gap-2">
            {q.options.map(([v, label]) => {
              const selected = draft[q.key] === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ [q.key]: v } as Partial<OnboardingDraft> & { experience?: Experience; assets?: AssetsBand; status?: ProStatus })}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 active:scale-[0.98]",
                    selected ? "border-brand bg-brand text-white" : "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-2",
                  )}
                >
                  {selected && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
        <div className="grid grid-cols-3 gap-1.5">
          {TIERS.map((t, i) => {
            const on = i === activeIdx;
            const below = activeIdx >= 0 && i < activeIdx;
            return (
              <div key={t.c} className="flex flex-col items-center gap-1.5">
                <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <motion.span className="absolute inset-0 origin-left bg-brand" initial={false} animate={{ scaleX: on || below ? 1 : 0, opacity: below ? 0.35 : 1 }} transition={{ duration: 0.35, ease: EASE }} />
                </span>
                <span className={cn("flex items-center gap-1 text-[12px]", on ? "font-semibold text-foreground" : "text-muted")}>
                  <t.icon className="size-3.5" aria-hidden />
                  {CLASSIFICATION_LABEL[t.c]}
                </span>
              </div>
            );
          })}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={classification ?? "none"} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="mt-4 flex items-center gap-3">
            {classification ? (
              <>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-1">
                  {React.createElement(TIERS[activeIdx]?.icon ?? UserRound, { className: "size-5", "aria-hidden": true })}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{CLASSIFICATION_LABEL[classification]} investor</span>
                  <span className="block text-[12.5px] text-muted">{CLASS_EXPLAIN[classification]}</span>
                </span>
              </>
            ) : (
              <span className="text-[13px] text-muted">Answer all three to see your classification.</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <fieldset>
        <legend className="mb-2.5 flex items-center gap-2 text-[13.5px] font-medium text-foreground">
          <Heart className="size-4 text-muted" aria-hidden />
          What would you like to invest in? <span className="font-normal text-muted">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((t) => {
            const on = draft.interests.includes(t);
            return (
              <button key={t} type="button" aria-pressed={on} onClick={() => onChange({ interests: on ? draft.interests.filter((x) => x !== t) : [...draft.interests, t] })}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150", on ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-foreground hover:bg-surface-2")}>
                {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                {TEMPLATE_META[t].label}
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="Risk appetite" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(RISK_META) as RiskProfile[]).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={draft.risk === r} onClick={() => onChange({ risk: r })}
              className={cn("rounded-xl border px-3 py-2 text-left transition-colors", draft.risk === r ? "border-brand bg-brand-soft" : "border-border bg-surface hover:bg-surface-2")}>
              <span className="block text-[12.5px] font-semibold text-foreground">{RISK_META[r].label}</span>
              <span className="block text-[11px] leading-snug text-muted">{r === "very-low" ? "Keep it safe" : r === "low" ? "Steady income" : r === "medium" ? "Balanced" : "Higher returns"}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const INTEREST_OPTIONS: AssetTemplate[] = ["real-estate", "treasury-fund", "commodity", "sukuk", "private-credit", "private-equity", "infrastructure", "spv-shares"];

/* ---------------------------------- review --------------------------------- */

function Row({ icon: Icon, label, children, onEdit }: { icon: LucideIcon; label: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] text-muted">{label}</span>
        <span className="block min-w-0 text-[13.5px] font-medium text-foreground">{children}</span>
      </span>
      {onEdit && (
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>
          <Pencil />
        </Button>
      )}
    </div>
  );
}

export function ReviewStep({ draft, classification, onEdit, onConsent, error }: { draft: OnboardingDraft; classification: InvestorClassification | null; onEdit: (step: string) => void; onConsent: (k: keyof OnboardingDraft["consents"], v: boolean) => void; error?: string }) {
  const entity = draft.accountType === "entity";
  const consents: { key: keyof OnboardingDraft["consents"]; label: string }[] = [
    { key: "accuracy", label: "The information I have given is true and complete." },
    { key: "terms", label: "I accept the terms of business and the privacy notice." },
    { key: "screening", label: "I consent to identity verification, screening and wallet checks." },
  ];
  return (
    <div className="space-y-5">
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        <Row icon={entity ? Building : UserRound} label="Account" onEdit={() => onEdit("type")}>
          <span className="block truncate">{entity ? `Company, ${draft.companyName}` : "Individual"}</span>
        </Row>
        {entity && (
          <>
            <Row icon={Landmark} label="Registry" onEdit={() => onEdit("company")}>
              <span className="block truncate">{kybFor(draft.kybJurisdiction).registry}, {draft.registrationNumber}</span>
              <span className="block truncate text-[12.5px] font-normal text-muted">{draft.legalForm}{draft.registryChecked ? ", record matched" : ""}</span>
            </Row>
            <Row icon={FileText} label="Company documents" onEdit={() => onEdit("docs")}>
              {Object.values(draft.companyDocs).filter((v) => v === "uploaded").length} of {kybFor(draft.kybJurisdiction).docs.length} uploaded
            </Row>
            <Row icon={UserRound} label="Owners and directors" onEdit={() => onEdit("people")}>
              <span className="block truncate">{draft.people.length ? draft.people.map((x) => x.name).join(", ") : "None added"}</span>
            </Row>
            <Row icon={Landmark} label="Settlement bank account" onEdit={() => onEdit("bank")}>
              <span className="block truncate">{draft.bank ? `${draft.bank.bank}, ${draft.bank.iban}` : "Not added"}</span>
            </Row>
          </>
        )}
        <Row icon={UserRound} label={entity ? "Authorised signatory" : "Applicant"} onEdit={() => onEdit("details")}>
          <span className="block truncate">{draft.name}</span>
          <span className="block truncate text-[12.5px] font-normal text-muted">
            {draft.email}, {COUNTRY_NAME[draft.residency] ?? draft.residency}
          </span>
        </Row>
        <Row icon={draft.docType ? DOC_ICON[draft.docType] : IdCard} label="Identity document" onEdit={() => onEdit("document")}>
          <span className="flex flex-wrap items-center gap-2">
            {draft.doc ? draft.idLabel : "Not provided"}
            {draft.doc && <span className="font-mono text-[12px] font-normal text-muted">{draft.doc.number}</span>}
            {draft.doc && <IconChip icon={Check} tone="success">Read</IconChip>}
          </span>
        </Row>
        <Row icon={ScanFace} label="Liveness" onEdit={() => onEdit("liveness")}>
          <span className="flex items-center gap-2">{draft.liveness ? <IconChip icon={Check} tone="success">Confirmed</IconChip> : "Not completed"}</span>
        </Row>
        <Row icon={BriefcaseBusiness} label="Classification" onEdit={() => onEdit("profile")}>
          {classification ? `${CLASSIFICATION_LABEL[classification]} investor` : "Not set"}
        </Row>
        <Row icon={Wallet} label="Wallet" onEdit={() => onEdit("wallet")}>
          <span className="flex min-w-0 items-center gap-2">
            <NetworkLogo chain={draft.chain} size={18} />
            <span className="truncate font-mono text-[12.5px]">{draft.walletAddress ? fmt.hash(draft.walletAddress, 8, 6) : "Not set"}</span>
            <span className="hidden text-[12px] font-normal text-muted sm:inline">
              {draft.walletMode === "mpc" ? "MPC custody" : "Self-custody"}, {CHAIN_META[draft.chain].label}
            </span>
          </span>
        </Row>
      </div>

      {outstandingKeys(draft).length > 0 && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft/50 px-4 py-3 text-[13px]">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span className="min-w-0">
            <span className="block font-medium text-foreground">Your account opens now. Add these when you are ready:</span>
            <span className="block text-muted">{outstandingKeys(draft).map((k) => OUTSTANDING_LABEL[k] ?? k).join(", ")}. You can browse and place orders meanwhile; orders are confirmed once these are in.</span>
          </span>
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="sr-only">Declarations</legend>
        {consents.map((c) => (
          <label key={c.key} htmlFor={`consent-${c.key}`} className="flex cursor-pointer items-start gap-3 text-[13px] text-foreground">
            <span className="pt-px">
              <Checkbox id={`consent-${c.key}`} checked={draft.consents[c.key]} onCheckedChange={(v) => onConsent(c.key, v)} />
            </span>
            {c.label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
