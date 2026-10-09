"use client";

import * as React from "react";
import { Building, Check, FileText, Landmark, Plus, Search, Trash2, Upload, UserRound, Users } from "lucide-react";
import type { Currency, InvestorDocumentKind } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/primitives";
import { CompanyLogo } from "@/components/domain/logos";
import { KYB_OPTIONS, SAMPLE_BANK, kybFor } from "@/lib/kyc-countries";
import { cn, randomHex } from "@/lib/utils";
import type { OnboardingDraft } from "./onboarding-model";
import { GroupLabel, IconChip } from "./parts";

type Patch = (p: Partial<OnboardingDraft>) => void;
const countryOf = (code: string) => (code.startsWith("AE") ? "AE" : code);

/* ------------------------------- company ------------------------------- */

export function CompanyStep({ draft, errors, onChange }: { draft: OnboardingDraft; errors: Record<string, string>; onChange: Patch }) {
  const reg = kybFor(draft.kybJurisdiction);
  const [looking, setLooking] = React.useState(false);
  const lookup = () => {
    setLooking(true);
    setTimeout(() => {
      setLooking(false);
      onChange({
        registryChecked: true,
        legalForm: draft.legalForm || reg.legalForms[0],
        registeredAddress: draft.registeredAddress || SAMPLE_ADDRESS[countryOf(draft.kybJurisdiction)] || "Registered office on file",
        people: draft.people.length ? draft.people : [{ name: draft.name || "Director on record", role: "director" }],
      });
    }, 1400);
  };
  return (
    <div className="space-y-6">
      <section>
        <GroupLabel icon={Landmark}>Where the company is registered</GroupLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jurisdiction" htmlFor="oa-kybJurisdiction" error={errors.kybJurisdiction}>
            <NativeSelect id="oa-kybJurisdiction" value={draft.kybJurisdiction} className="h-10"
              onChange={(e) => onChange({ kybJurisdiction: e.target.value, incorporationCountry: countryOf(e.target.value), legalForm: "", registryChecked: false, companyDocs: {} })}>
              <option value="">Select jurisdiction</option>
              {KYB_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="XX">Other jurisdiction</option>
            </NativeSelect>
          </Field>
          <Field label="Legal form" htmlFor="oa-legalForm">
            <NativeSelect id="oa-legalForm" value={draft.legalForm} onChange={(e) => onChange({ legalForm: e.target.value })} className="h-10" disabled={!draft.kybJurisdiction}>
              <option value="">Select</option>
              {reg.legalForms.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </section>
      <section>
        <GroupLabel icon={Building}>Company</GroupLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Registered company name" htmlFor="oa-companyName" error={errors.companyName}>
              <Input id="oa-companyName" value={draft.companyName} autoComplete="organization" onChange={(e) => onChange({ companyName: e.target.value, registryChecked: false })} className="h-10" aria-invalid={!!errors.companyName || undefined} />
            </Field>
          </div>
          <Field label={reg.numberLabel} htmlFor="oa-registrationNumber" error={errors.registrationNumber} hint={reg.numberHint}>
            <Input id="oa-registrationNumber" value={draft.registrationNumber} onChange={(e) => onChange({ registrationNumber: e.target.value, registryChecked: false })} className="h-10" aria-invalid={!!errors.registrationNumber || undefined} />
          </Field>
          <Field label="Registered address" htmlFor="oa-registeredAddress">
            <Input id="oa-registeredAddress" value={draft.registeredAddress} onChange={(e) => onChange({ registeredAddress: e.target.value })} className="h-10" />
          </Field>
        </div>
      </section>
      {draft.kybJurisdiction && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-surface text-muted">
            <Search className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="block font-medium text-foreground">{reg.registry}</span>
            <span className="block text-muted">{reg.lookup ? `Checked automatically through ${reg.lookup}.` : "Checked by our registry desk against the official record."}</span>
          </span>
          {draft.registryChecked ? (
            <IconChip icon={Check} tone="success">{reg.lookup ? "Record matched" : "Queued for registry desk"}</IconChip>
          ) : (
            <Button variant="secondary" size="sm" onClick={lookup} isLoading={looking} loadingText="Checking…" disabled={!draft.companyName.trim() || !draft.registrationNumber.trim()}>
              {reg.lookup ? "Look up record" : "Send to registry desk"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const SAMPLE_ADDRESS: Record<string, string> = {
  SG: "8 Marina View, #40-01 Asia Square Tower 1, Singapore 018960",
  GB: "1 Bartholomew Lane, London EC2N 2AX",
  AE: "Al Maryah Island, Abu Dhabi Global Market Square",
  SA: "King Abdullah Financial District, Riyadh 13519",
  KY: "PO Box 309, Ugland House, Grand Cayman KY1-1104",
  VG: "Craigmuir Chambers, Road Town, Tortola VG1110",
  LU: "2 Boulevard Konrad Adenauer, L-1115 Luxembourg",
  PK: "Sharah-e-Faisal, Karachi 75350",
};

/* ------------------------------ documents ------------------------------ */

export function CompanyDocsStep({ draft, onChange }: { draft: OnboardingDraft; onChange: Patch }) {
  const reg = kybFor(draft.kybJurisdiction);
  const set = (kind: InvestorDocumentKind, v: "uploaded" | "later") => onChange({ companyDocs: { ...draft.companyDocs, [kind]: v } });
  const uploaded = reg.docs.filter((d) => draft.companyDocs[d.kind] === "uploaded").length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <GroupLabel icon={FileText} className="mb-0">For {reg.name}</GroupLabel>
        <span className="tabular text-[12.5px] text-muted">{uploaded} of {reg.docs.length} uploaded</span>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {reg.docs.map((d) => {
          const st = draft.companyDocs[d.kind];
          return (
            <li key={d.kind + d.label} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", st === "uploaded" ? "bg-success-soft text-success" : "bg-surface-3 text-muted")}>
                {st === "uploaded" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <FileText className="size-4" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-foreground">{d.label}</span>
                <span className="block text-[11.5px] text-muted">{d.required ? "Required" : "Optional"}{st === "later" ? ", added later" : ""}</span>
              </span>
              {st === "uploaded" ? (
                <Button variant="ghost" size="sm" onClick={() => set(d.kind, "later")}>Remove</Button>
              ) : (
                <span className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => set(d.kind, "uploaded")}>
                    <Upload /> Upload
                  </Button>
                  {st !== "later" && (
                    <Button variant="ghost" size="sm" onClick={() => set(d.kind, "later")}>Later</Button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Button variant="tonal" size="sm" onClick={() => onChange({ companyDocs: Object.fromEntries(reg.docs.map((d) => [d.kind, "uploaded"])) })}>
          Upload all (demo)
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- people -------------------------------- */

export function PeopleStep({ draft, onChange }: { draft: OnboardingDraft; onChange: Patch }) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<"director" | "owner" | "signatory">("owner");
  const [pct, setPct] = React.useState("25");
  const add = () => {
    if (!name.trim()) return;
    onChange({ people: [...draft.people, { name: name.trim(), role, pct: role === "owner" ? Math.min(100, Number(pct) || 0) : undefined }] });
    setName("");
  };
  const ownedPct = draft.people.filter((p) => p.role === "owner").reduce((s, p) => s + (p.pct ?? 0), 0);
  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted">List every director, anyone who owns or controls 25% or more, and anyone else who can sign for the company. Each person verifies their identity by link.</p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        <li className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand"><UserRound className="size-4" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-foreground">{draft.name || "You"}</span>
            <span className="block text-[11.5px] text-muted">Authorised signatory, applying</span>
          </span>
        </li>
        {draft.people.map((p, i) => (
          <li key={p.name + i} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-8 place-items-center rounded-lg bg-surface-3 text-muted"><Users className="size-4" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-foreground">{p.name}</span>
              <span className="block text-[11.5px] text-muted">{p.role === "owner" ? `Beneficial owner, ${p.pct}%` : p.role === "director" ? "Director" : "Authorised signatory"}. Verification link sent</span>
            </span>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${p.name}`} onClick={() => onChange({ people: draft.people.filter((_, k) => k !== i) })}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 rounded-xl border border-dashed border-border-strong p-4 sm:grid-cols-[1fr_160px_100px_auto] sm:items-end">
        <Field label="Full name" htmlFor="pp-name">
          <Input id="pp-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" onKeyDown={(e) => e.key === "Enter" && add()} />
        </Field>
        <Field label="Role" htmlFor="pp-role">
          <NativeSelect id="pp-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="h-10">
            <option value="owner">Beneficial owner</option>
            <option value="director">Director</option>
            <option value="signatory">Signatory</option>
          </NativeSelect>
        </Field>
        <Field label="Owns %" htmlFor="pp-pct">
          <Input id="pp-pct" inputMode="decimal" value={role === "owner" ? pct : ""} disabled={role !== "owner"} onChange={(e) => setPct(e.target.value.replace(/[^0-9.]/g, ""))} className="h-10" />
        </Field>
        <Button variant="secondary" onClick={add} disabled={!name.trim()}>
          <Plus /> Add
        </Button>
      </div>
      {ownedPct > 100 && <p role="alert" className="text-[12.5px] text-danger">Ownership adds up to {ownedPct}%. Check the percentages.</p>}
    </div>
  );
}

/* -------------------------------- bank --------------------------------- */

export function BankStep({ draft, onChange }: { draft: OnboardingDraft; onChange: Patch }) {
  const country = countryOf(draft.kybJurisdiction || draft.incorporationCountry || "AE");
  const sample = SAMPLE_BANK[country] ?? SAMPLE_BANK.AE;
  const ccy: Currency = country === "GB" ? "GBP" : country === "SA" ? "SAR" : country === "AE" ? "AED" : country === "SG" ? "SGD" : country === "LU" || country === "CH" ? "EUR" : "USD";
  const b = draft.bank ?? { bank: "", iban: "", swift: "", currency: ccy };
  const set = (p: Partial<typeof b>) => onChange({ bank: { ...b, ...p } });
  const openBanking = country === "AE" || country === "SA";
  return (
    <div className="space-y-5">
      {openBanking && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <CompanyLogo name="Lean Technologies" size={36} />
          <span className="min-w-0 flex-1 text-[13px]">
            <span className="block font-medium text-foreground">Connect the account by open banking</span>
            <span className="block text-muted">Confirms the account holder name without a statement upload.</span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => onChange({ bank: { bank: sample.bank, iban: sample.iban(randomHex(8).replace(/[a-f]/g, "7")), swift: sample.swift, currency: ccy } })}>
            Connect {sample.bank}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bank" htmlFor="bk-bank">
          <Input id="bk-bank" value={b.bank} placeholder={sample.bank} onChange={(e) => set({ bank: e.target.value })} className="h-10" />
        </Field>
        <Field label="Currency" htmlFor="bk-ccy">
          <NativeSelect id="bk-ccy" value={b.currency} onChange={(e) => set({ currency: e.target.value as Currency })} className="h-10">
            {(["USD", "AED", "GBP", "EUR", "SAR", "SGD", "PKR"] as Currency[]).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="IBAN or account number" htmlFor="bk-iban">
          <Input id="bk-iban" value={b.iban} placeholder={sample.iban("12345678")} onChange={(e) => set({ iban: e.target.value })} className="h-10 font-mono" />
        </Field>
        <Field label="SWIFT / BIC" htmlFor="bk-swift">
          <Input id="bk-swift" value={b.swift} placeholder={sample.swift} onChange={(e) => set({ swift: e.target.value.toUpperCase() })} className="h-10 font-mono" />
        </Field>
      </div>
      <p className="text-[12.5px] text-muted">Distributions and redemptions are paid only to accounts in the company&apos;s name.</p>
    </div>
  );
}
