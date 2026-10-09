"use client";

import * as React from "react";
import { FileText, Layers, ListChecks, Plus, Scale, Trash2 } from "lucide-react";
import type * as D from "@/types/domain";
import type { AssetDraft } from "@/stores/workflows";
import { Badge, Card, CardBody, CardHeader, Checkbox, Field, Input, NativeSelect, Switch } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/assets/form-bits";
import { DOCUMENT_KIND_LABEL } from "@/components/assets/meta";
import { VISIBILITY_META } from "@/components/assets/asset-panels";
import { priceAtYield } from "@/lib/debt";
import { fmt } from "@/lib/utils";
import { waterfallFor } from "@/lib/waterfall";

type Set = (p: Partial<AssetDraft>) => void;

/* ---------------------------- debt terms ---------------------------- */

/** Coupon schedule and pricing for notes, bonds and sukuk. The issue price follows from the yield. */
export function DebtTermsFields({ draft, set }: { draft: AssetDraft; set: Set }) {
  const coupon = draft.instrument?.couponPct;
  const maturity = draft.instrument?.maturity;
  const d = draft.debt;
  const face = d?.faceValue ?? 100;
  const freq = coupon === 0 ? "none" : d?.couponFrequency && d.couponFrequency !== "none" ? d.couponFrequency : "semi-annual";
  const ytm = d?.yieldPct ?? coupon ?? 0;
  const issueDate = d?.issueDate ?? new Date().toISOString().slice(0, 10);
  const patch = (p: Partial<NonNullable<AssetDraft["debt"]>>) =>
    set({ debt: { faceValue: face, couponPct: coupon ?? 0, couponFrequency: freq, issueDate, maturity: maturity ?? "", yieldPct: ytm, dayCount: d?.dayCount ?? "30/360", amortising: d?.amortising, ...p } });
  const price = coupon !== undefined && maturity && new Date(maturity) > new Date(issueDate)
    ? priceAtYield({ faceValue: face, couponPct: coupon, couponFrequency: freq, issueDate: new Date(issueDate).toISOString(), maturity: new Date(maturity).toISOString(), yieldPct: ytm, issuePrice: 0, dayCount: "30/360", amortising: d?.amortising }, ytm)
    : undefined;
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Face value per unit" htmlFor="debt.face">
          <NumberInput id="debt.face" value={face} onValueChange={(v) => patch({ faceValue: v ?? 100 })} />
        </Field>
        <Field label="Payments" htmlFor="debt.freq">
          <NativeSelect id="debt.freq" value={freq} disabled={coupon === 0} onChange={(e) => patch({ couponFrequency: e.target.value as D.DebtTerms["couponFrequency"] })}>
            {coupon === 0 ? <option value="none">At maturity</option> : (
              <>
                <option value="annual">Annual</option>
                <option value="semi-annual">Semi-annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </>
            )}
          </NativeSelect>
        </Field>
        <Field label="Yield to maturity" htmlFor="debt.ytm" hint="Sets the issue price">
          <NumberInput id="debt.ytm" value={ytm} onValueChange={(v) => patch({ yieldPct: v ?? 0 })} suffix="%" />
        </Field>
        <Field label="Issue date" htmlFor="debt.issue">
          <Input id="debt.issue" type="date" value={issueDate.slice(0, 10)} onChange={(e) => patch({ issueDate: e.target.value })} />
        </Field>
        <Field label="Day count" htmlFor="debt.dc">
          <NativeSelect id="debt.dc" value={d?.dayCount ?? "30/360"} onChange={(e) => patch({ dayCount: e.target.value as D.DebtTerms["dayCount"] })}>
            <option>30/360</option>
            <option>ACT/360</option>
            <option>ACT/365</option>
          </NativeSelect>
        </Field>
        <div className="flex flex-col justify-end">
          <div className="text-[12px] text-muted">Issue price per unit</div>
          <div className="text-[18px] font-semibold tabular">{price !== undefined ? fmt.num(price, 2) : "-"}</div>
          {price !== undefined && <div className="text-[11.5px] text-muted tabular">{fmt.pct((price / face) * 100, 2)} of face</div>}
        </div>
      </div>
      {coupon !== 0 && (
        <label htmlFor="debt.amort" className="flex items-center justify-between gap-4">
          <span className="text-[13px]">Repay principal in instalments</span>
          <Switch id="debt.amort" label="Amortising" checked={!!d?.amortising} onCheckedChange={(v) => patch({ amortising: v })} />
        </label>
      )}
    </div>
  );
}

/* --------------------------- product facts --------------------------- */

const FACTS: Partial<Record<D.AssetTemplate, string[]>> = {
  "real-estate": ["Property type", "Tenure", "Units or rooms", "Occupancy", "Year built", "Operator or tenant"],
  "spv-shares": ["Property", "Units", "Shares in issue", "Title registrar"],
  "private-equity": ["Strategy", "Vintage", "Target companies", "Fund term"],
  commodity: ["Metal or commodity", "Purity", "Vault", "Insurer", "Audit frequency"],
  infrastructure: ["Capacity", "Offtaker", "Contract tenor", "Construction status"],
  "private-credit": ["Borrowers", "Weighted LTV", "Seniority", "Average loan term"],
  bond: ["Rating", "Seniority", "Listing"],
  sukuk: ["Sukuk structure", "Sharia adviser", "Underlying asset"],
  "treasury-fund": ["Holdings", "Weighted average maturity", "Custodian"],
  receivables: ["Originators", "Tenor", "First loss retained"],
};

export function ProductFactsCard({ draft, set }: { draft: AssetDraft & { template?: D.AssetTemplate }; set: Set }) {
  const labels = (draft.template && FACTS[draft.template]) || [];
  if (!labels.length) return null;
  const value = (l: string) => draft.profile?.find((p) => p.label === l)?.value ?? "";
  const update = (l: string, v: string) => {
    const rest = (draft.profile ?? []).filter((p) => p.label !== l);
    set({ profile: v.trim() ? [...rest, { label: l, value: v }].sort((a, b) => labels.indexOf(a.label) - labels.indexOf(b.label)) : rest });
  };
  return (
    <Card>
      <CardHeader icon={<ListChecks />} title="Key facts" description="Shown on the product page. Leave any blank." />
      <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {labels.map((l) => (
          <Field key={l} label={l} htmlFor={`fact-${l}`}>
            <Input id={`fact-${l}`} value={value(l)} onChange={(e) => update(l, e.target.value)} />
          </Field>
        ))}
      </CardBody>
    </Card>
  );
}

/* ----------------------------- regimes ------------------------------- */

export function RegimesField({ draft, set, jurisdictions }: { draft: AssetDraft; set: Set; jurisdictions?: D.Jurisdiction[] }) {
  const home = draft.legalEntity?.jurisdiction;
  const sel = draft.regimes ?? [];
  if (!jurisdictions?.length) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-medium">Also offered under</legend>
      <div className="flex flex-wrap gap-1.5">
        {jurisdictions.filter((j) => j.code !== home).map((j) => {
          const on = sel.includes(j.code);
          return (
            <button key={j.code} type="button" aria-pressed={on} onClick={() => set({ regimes: on ? sel.filter((x) => x !== j.code) : [...sel, j.code] })}
              className={on ? "h-7 rounded-full border border-brand bg-brand-soft px-2.5 text-[12px] font-medium text-brand-ink" : "h-7 rounded-full border border-border bg-surface px-2.5 text-[12px] text-foreground hover:bg-surface-2"}>
              {j.regulator} <span className="text-muted">{j.name.replace(/ \(.*\)$/, "")}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* --------------------------- token classes --------------------------- */

type ClassRow = NonNullable<AssetDraft["tokenClasses"]>[number];
const TIERS: D.TokenTier[] = ["senior", "mezzanine", "junior", "ordinary"];
const TIER_LABEL: Record<D.TokenTier, string> = { senior: "Senior", mezzanine: "Mezzanine", junior: "Junior", ordinary: "Ordinary" };

export function TokenClassesCard({ draft, set }: { draft: AssetDraft; set: Set }) {
  const primary = draft.token?.symbol;
  const extra = draft.tokenClasses ?? [];
  const [row, setRow] = React.useState<ClassRow>({ name: "", symbol: "", tier: "ordinary", targetReturnPct: 0, supply: 0 });
  const add = () => {
    if (!row.name.trim() || !/^[A-Z0-9]{2,8}$/.test(row.symbol)) return;
    set({ tokenClasses: [...extra, row] });
    setRow({ name: "", symbol: "", tier: "ordinary", targetReturnPct: 0, supply: 0 });
  };
  const all: ClassRow[] = primary ? [{ name: "Main class", symbol: primary, tier: extra.length ? "senior" : "ordinary", targetReturnPct: draft.income?.targetYieldPct ?? 0, supply: 0 }, ...extra] : extra;
  return (
    <Card>
      <CardHeader icon={<Layers />} title="Further token classes" description="For products with more than one class, such as senior income units and ordinary units." />
      <CardBody className="flex flex-col gap-4">
        {extra.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {extra.map((c, i) => (
              <li key={c.symbol} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="font-mono font-semibold">{c.symbol}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <Badge tone="neutral">{TIER_LABEL[c.tier]}</Badge>
                <span className="tabular text-muted">{fmt.pct(c.targetReturnPct, 2)}</span>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${c.symbol}`} onClick={() => set({ tokenClasses: extra.filter((_, k) => k !== i) })}><Trash2 /></Button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_0.8fr_1fr_0.8fr_auto] sm:items-end">
          <Field label="Name" htmlFor="tc-name"><Input id="tc-name" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} placeholder="Ordinary units" /></Field>
          <Field label="Symbol" htmlFor="tc-sym"><Input id="tc-sym" value={row.symbol} maxLength={8} className="font-mono uppercase" onChange={(e) => setRow({ ...row, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} /></Field>
          <Field label="Rank" htmlFor="tc-tier">
            <NativeSelect id="tc-tier" value={row.tier} onChange={(e) => setRow({ ...row, tier: e.target.value as D.TokenTier })}>
              {TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Target" htmlFor="tc-ret"><NumberInput id="tc-ret" value={row.targetReturnPct} onValueChange={(v) => setRow({ ...row, targetReturnPct: v ?? 0 })} suffix="%" /></Field>
          <Button variant="secondary" onClick={add} disabled={!row.name.trim() || row.symbol.length < 2}><Plus /> Add</Button>
        </div>
        {extra.length > 0 && (
          <div className="rounded-xl bg-surface-2 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium"><Scale className="size-3.5" /> Payment order</div>
            <ol className="flex flex-col gap-1 text-[12.5px]">
              {waterfallFor(all).map((w, i) => (
                <li key={w.label} className="flex gap-2"><span className="w-4 tabular text-muted">{i + 1}.</span><span className="font-medium">{w.label}</span><span className="text-muted">{w.detail}</span></li>
              ))}
            </ol>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ----------------------------- documents ----------------------------- */

const STARTER_DOCS: { kind: D.AssetDocument["kind"]; name: string; visibility: D.DocumentVisibility }[] = [
  { kind: "offering-memorandum", name: "Offering memorandum", visibility: "public" },
  { kind: "term-sheet", name: "Term sheet", visibility: "public" },
  { kind: "spv-constitution", name: "Constitutional documents", visibility: "holders" },
  { kind: "valuation-report", name: "Valuation report", visibility: "holders" },
  { kind: "legal-opinion", name: "Legal opinion", visibility: "internal" },
];

export function DocumentsCard({ draft, set }: { draft: AssetDraft; set: Set }) {
  const docs = draft.documents ?? [];
  const has = (k: D.AssetDocument["kind"]) => docs.find((d) => d.kind === k);
  const toggle = (s: (typeof STARTER_DOCS)[number], on: boolean) => set({ documents: on ? [...docs, s] : docs.filter((d) => d.kind !== s.kind) });
  const setVis = (k: D.AssetDocument["kind"], v: D.DocumentVisibility) => set({ documents: docs.map((d) => (d.kind === k ? { ...d, visibility: v } : d)) });
  return (
    <Card>
      <CardHeader icon={<FileText />} title="Documents" description="Tick what you are uploading now and who can see each one. More can be added later." />
      <ul className="divide-y divide-border">
        {STARTER_DOCS.map((s) => {
          const d = has(s.kind);
          return (
            <li key={s.kind} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
              <Checkbox id={`doc-${s.kind}`} checked={!!d} onCheckedChange={(v) => toggle(s, v)} />
              <label htmlFor={`doc-${s.kind}`} className="min-w-0 flex-1 text-[13px]">{DOCUMENT_KIND_LABEL[s.kind]}</label>
              <NativeSelect aria-label={`Visibility of ${s.name}`} disabled={!d} value={d?.visibility ?? s.visibility} onChange={(e) => setVis(s.kind, e.target.value as D.DocumentVisibility)} className="h-8 w-[150px] text-[12.5px]">
                {(Object.keys(VISIBILITY_META) as D.DocumentVisibility[]).map((k) => <option key={k} value={k}>{VISIBILITY_META[k].label}</option>)}
              </NativeSelect>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
