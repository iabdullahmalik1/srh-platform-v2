"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowRightLeft, BadgeCheck, Banknote, CalendarClock, CircleCheck, CircleDashed, Coins, FileUp, Gauge, Layers, Lock, PencilLine, Percent, Scale, ShieldCheck, Undo2 } from "lucide-react";
import type * as D from "@/types/domain";
import { useEnterValuation, useOverrideListingStage, useSetDocumentVisibility, useUploadAssetDocument, useVerifyIssuance } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, Field, Input, KeyValue, NativeSelect, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TrendArea, SERIES } from "@/components/domain/charts";
import { CompanyName } from "@/components/domain/logos";
import { Money } from "@/components/domain/status";
import { DOCUMENT_KIND_LABEL } from "@/components/assets/meta";
import { RISK_META } from "@/lib/risk";
import { FREQUENCY_LABEL, accretion, cashFlows, yearsBetween } from "@/lib/debt";
import { cn, fmt } from "@/lib/utils";

/* -------------------------------- risk -------------------------------- */

export function AssetRiskBadge({ risk, className }: { risk?: D.RiskProfile; className?: string }) {
  if (!risk) return null;
  const m = RISK_META[risk];
  return (
    <Tip content={m.explain}>
      <span tabIndex={0} className={cn("inline-flex", className)}>
        <Badge tone={m.tone}>
          <Gauge className="size-3" aria-hidden />
          {m.short} risk
        </Badge>
      </span>
    </Tip>
  );
}

/** Four-step meter used on product cards and pages. */
export function RiskMeter({ risk }: { risk?: D.RiskProfile }) {
  if (!risk) return null;
  const level = RISK_META[risk].level;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${RISK_META[risk].label} risk`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-2.5 w-1.5 rounded-sm", i <= level ? (level >= 4 ? "bg-danger" : level === 3 ? "bg-warning" : level === 2 ? "bg-info" : "bg-success") : "bg-border-strong")} />
        ))}
      </span>
      <span className="text-[12px] text-muted">{RISK_META[risk].short}</span>
    </span>
  );
}

/* ------------------------------ tokenomics ----------------------------- */

const TIER_LABEL: Record<D.TokenTier, string> = { senior: "Senior", mezzanine: "Mezzanine", junior: "Junior", ordinary: "Ordinary" };

export function TokenomicsTab({ asset, tokens }: { asset: D.Asset; tokens: D.TokenClass[] }) {
  const t = asset.tokenomics;
  const cur = asset.valuation.currency;
  if (!t) return <Card><EmptyState icon={<Coins />} title="Token economics not set" description="Supply, allocation, fees and lock-ups are defined during structuring." /></Card>;
  const classCols: Column<D.TokenClass>[] = [
    { key: "symbol", header: "Token", cell: (c) => <span className="font-semibold">{c.symbol}<span className="ml-2 font-normal text-muted">{c.name}</span></span> },
    { key: "tier", header: "Rank", cell: (c) => (c.tier ? <Badge tone={c.tier === "senior" ? "info" : "neutral"}>{TIER_LABEL[c.tier]}</Badge> : <span className="text-subtle">Single class</span>) },
    { key: "target", header: "Target return", align: "right", cell: (c) => (c.targetReturnPct != null ? fmt.pct(c.targetReturnPct, 2) : fmt.pct(asset.income.targetYieldPct, 2)) },
    { key: "supply", header: "Supply", align: "right", cell: (c) => <span className="tabular">{fmt.num(c.canonicalSupply)}</span>, hideBelow: "sm" },
    { key: "max", header: "Maximum", align: "right", cell: (c) => <span className="tabular">{c.maxSupply ? fmt.num(c.maxSupply) : "Uncapped"}</span>, hideBelow: "md" },
    { key: "rights", header: "Rights", cell: (c) => <span className="whitespace-normal text-muted">{c.rights ?? (asset.instrument.votingRights ? "Income and voting" : "Income")}</span>, hideBelow: "lg" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<Coins />} title="Token classes" description={tokens.length > 1 ? "Classes are paid in the order of the waterfall below" : "One class of token for this product"} />
        <DataTable rows={tokens} columns={classCols} getRowId={(c) => c.id} caption="Token classes" empty={{ title: "No token class yet", description: "Created at structuring." }} />
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Allocation" description="Share of tokens at full subscription" />
          <CardBody>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              {t.allocation.map((a, i) => (
                <span key={a.label} style={{ width: `${a.pct}%`, background: SERIES[i % SERIES.length] }} />
              ))}
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {t.allocation.map((a, i) => (
                <li key={a.label} className="flex items-center gap-2.5 text-[13px]">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
                  <span className="min-w-0 flex-1">{a.label}</span>
                  <span className="tabular font-medium">{fmt.pct(a.pct, a.pct % 1 ? 1 : 0)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Fees" />
          <CardBody>
            <KeyValue cols={1} items={t.fees.map((f) => ({ label: f.label, value: f.value }))} />
          </CardBody>
        </Card>
      </div>
      {asset.waterfall?.length ? (
        <Card>
          <CardHeader icon={<Layers />} title="Distribution waterfall" description="Each step is paid in full before the next receives anything" />
          <CardBody>
            <ol className="flex flex-col">
              {asset.waterfall.map((w, i) => {
                const tc = tokens.find((x) => x.id === w.tokenClassId);
                return (
                  <li key={w.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < asset.waterfall!.length - 1 && <span aria-hidden className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border-strong" />}
                    <span className={cn("relative grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold", tc ? "bg-brand text-white" : "bg-surface-3 text-muted")}>{i + 1}</span>
                    <span className="min-w-0 pt-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                        {w.label}
                        {tc && <Badge tone="brand">{tc.symbol}</Badge>}
                      </span>
                      <span className="block text-[12.5px] text-muted">{w.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Lock />} title="Lock-ups" />
          <CardBody className="flex flex-col gap-2.5">
            {t.lockups.map((l) => (
              <div key={l.label}>
                <div className="text-[13px] font-medium">{l.label}</div>
                <div className="text-[12.5px] text-muted">{l.detail}</div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Banknote />} title="Income and exit" />
          <CardBody className="flex flex-col gap-2.5 text-[13px]">
            <p>{t.distributionPolicy}</p>
            <p className="text-muted">{t.redemption}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ArrowRightLeft />} title="Transfer rules" />
          <CardBody className="text-[13px]">
            <p>{t.transferRules}</p>
            <p className="mt-2 text-muted">Unit price {fmt.money(asset.valuation.navPerToken, cur, { digits: asset.valuation.navPerToken < 10 ? 4 : 2 })}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- cash flows ---------------------------- */

export function CashFlowsTab({ asset }: { asset: D.Asset }) {
  const d = asset.debt;
  const cur = asset.valuation.currency;
  if (!d) return <Card><EmptyState icon={<CalendarClock />} title="No fixed schedule" description="This product pays income from the underlying asset rather than a fixed coupon." /></Card>;
  const zero = d.couponPct === 0;
  const flows = cashFlows(d);
  const now = Date.now();
  const nextIdx = flows.findIndex((f) => new Date(f.date).getTime() > now);
  const term = yearsBetween(d.issueDate, d.maturity);
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<Percent />} title="Terms" description={zero ? "Issued at a discount and repaid at face value. There are no interim payments." : `${FREQUENCY_LABEL[d.couponFrequency]} coupon on face value${d.amortising ? ", principal repaid in equal instalments" : ", principal at maturity"}`} />
        <CardBody>
          <KeyValue
            cols={3}
            items={[
              { label: "Face value", value: <Money value={d.faceValue} currency={cur} /> },
              { label: "Coupon", value: zero ? "0%, zero coupon" : `${fmt.pct(d.couponPct, 2)} ${FREQUENCY_LABEL[d.couponFrequency].toLowerCase()}` },
              { label: "Yield to maturity", value: fmt.pct(d.yieldPct, 2) },
              { label: "Issue price", value: <span className="tabular">{fmt.money(d.issuePrice, cur, { digits: 2 })}{zero ? ` (${fmt.pct((d.issuePrice / d.faceValue) * 100, 2)} of face)` : ""}</span> },
              { label: "Issue date", value: fmt.date(d.issueDate) },
              { label: "Maturity", value: `${fmt.date(d.maturity)} (${term.toFixed(1)} years)` },
              { label: "Day count", value: d.dayCount },
              { label: "Current price", value: fmt.money(asset.valuation.navPerToken, cur, { digits: 2 }) },
              { label: zero ? "Return at maturity" : "Next payment", value: zero ? fmt.money(d.faceValue - asset.valuation.navPerToken, cur, { digits: 2 }) + " per unit" : nextIdx >= 0 ? `${fmt.date(flows[nextIdx].date)}, ${fmt.money(flows[nextIdx].total, cur)}` : "Matured" },
            ]}
          />
        </CardBody>
      </Card>
      {zero ? (
        <Card>
          <CardHeader title="Accreted value" description={`Price per ${fmt.num(d.faceValue)} of face, rising to par at ${fmt.pct(d.yieldPct, 2)} a year compounded`} />
          <CardBody>
            <TrendArea data={accretion(d)} dataKey="value" name="Accreted value" height={220} format={(v) => fmt.money(v, cur, { digits: 2 })} xFormat={(x) => fmt.date(x)} />
          </CardBody>
        </Card>
      ) : (
        <Card className="min-w-0">
          <CardHeader title="Payment schedule" description={`Per unit of ${fmt.money(d.faceValue, cur)} face`} />
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Payment schedule</caption>
              <thead className="sticky top-0 bg-surface-2 text-[12px] text-muted">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Coupon</th>
                  <th className="px-3 py-2 text-right font-medium">Principal</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="hidden px-5 py-2 text-right font-medium sm:table-cell">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {flows.map((f, i) => (
                  <tr key={f.date} className={cn(i === nextIdx && "bg-brand-soft/60", new Date(f.date).getTime() < now && "text-muted")}>
                    <td className="px-5 py-2">{fmt.date(f.date)}{i === nextIdx && <Badge tone="brand" className="ml-2">Next</Badge>}</td>
                    <td className="px-3 py-2 text-right tabular">{fmt.money(f.coupon, cur, { digits: 2 })}</td>
                    <td className="px-3 py-2 text-right tabular">{f.principal ? fmt.money(f.principal, cur, { digits: 2 }) : "-"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular">{fmt.money(f.total, cur, { digits: 2 })}</td>
                    <td className="hidden px-5 py-2 text-right tabular sm:table-cell">{fmt.money(f.outstanding, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* --------------------------- issuance verification ---------------------- */

export function IssuancePanel({ token }: { token: D.TokenClass }) {
  const can = useCan("issuance.verify");
  const verify = useVerifyIssuance();
  const [waive, setWaive] = React.useState<D.IssuanceCheck>();
  const [note, setNote] = React.useState("");
  const iss = token.issuance;
  if (!iss) return null;
  const done = iss.checks.filter((c) => c.status !== "pending").length;
  return (
    <Card>
      <CardHeader
        icon={<BadgeCheck />}
        title="Issuance verification"
        description={iss.status === "verified" ? `Verified by ${iss.verifiedBy}${iss.verifiedAt ? `, ${fmt.date(iss.verifiedAt)}` : ""}. Minting is enabled.` : "Each item is checked by hand before tokens can be minted."}
        action={<Badge tone={iss.status === "verified" ? "success" : "warning"} dot>{iss.status === "verified" ? "Verified" : `${done} of ${iss.checks.length}`}</Badge>}
      />
      <ul className="divide-y divide-border">
        {iss.checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", c.status === "verified" ? "bg-success-soft text-success" : c.status === "waived" ? "bg-surface-3 text-muted" : "bg-warning-soft text-warning")}>
              {c.status === "pending" ? <CircleDashed className="size-4" /> : c.status === "waived" ? <Undo2 className="size-3.5" /> : <CircleCheck className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium">{c.label}</span>
              <span className="block text-[12px] text-muted">
                {c.status === "pending" ? c.note ?? "Waiting" : `${c.status === "waived" ? "Waived" : "Verified"} by ${c.by}${c.at ? `, ${fmt.date(c.at)}` : ""}${c.note && c.status === "waived" ? `. ${c.note}` : ""}`}
              </span>
            </span>
            {c.status === "pending" && can && (
              <span className="flex gap-1.5">
                <Button size="sm" variant="secondary" isLoading={verify.isPending && verify.variables?.key === c.key && verify.variables?.action === "verify"} onClick={() => verify.mutate({ tokenClassId: token.id, key: c.key, action: "verify", note: "" })}>
                  <ShieldCheck /> Verify
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setNote(""); setWaive(c); }}>Waive</Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={!!waive} onOpenChange={(o) => !o && setWaive(undefined)}>
        <DialogContent
          size="sm"
          title="Waive this check?"
          description={waive?.label}
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant="primary" disabled={!note.trim()} isLoading={verify.isPending} onClick={() => waive && verify.mutate({ tokenClassId: token.id, key: waive.key, action: "waive", note }, { onSuccess: () => setWaive(undefined) })}>Waive check</Button>
            </>
          }
        >
          <Field label="Reason" htmlFor="waive-note" hint="Kept in the audit trail.">
            <Textarea id="waive-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------------ staff actions --------------------------- */

const STAGES: D.AssetStatus[] = ["draft", "structuring", "in-review", "approved", "live", "matured"];

export function StageOverrideButton({ asset }: { asset: D.Asset }) {
  const can = useCan("listing.override");
  const m = useOverrideListingStage();
  const [open, setOpen] = React.useState(false);
  const [to, setTo] = React.useState<D.AssetStatus>(asset.status);
  const [reason, setReason] = React.useState("");
  if (!can) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" onClick={() => { setTo(STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(asset.status) + 1)]); setReason(""); setOpen(true); }}>
        <ArrowRightLeft /> Change stage
      </Button>
      <DialogContent
        size="sm"
        title="Change listing stage"
        description="Moves the product directly to another stage. A second person approves the change."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="primary" disabled={to === asset.status || !reason.trim()} isLoading={m.isPending} onClick={() => m.mutate({ assetId: asset.id, to, reason }, { onSuccess: () => setOpen(false) })}>Send for approval</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
            {STAGES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={to === s} disabled={s === asset.status} onClick={() => setTo(s)}
                className={cn("h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:opacity-50", to === s ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-surface-2")}>
                {fmt.sentence(s)}{s === asset.status ? " (now)" : ""}
              </button>
            ))}
          </div>
          <Field label="Reason" htmlFor="stage-reason" hint="Recorded with the change.">
            <Textarea id="stage-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: regulator approval received by email on 6 October" />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ValuationButton({ asset }: { asset: D.Asset }) {
  const can = useCan("valuation.enter");
  const m = useEnterValuation();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [source, setSource] = React.useState("");
  const [note, setNote] = React.useState("");
  if (!can) return null;
  const n = Number(value);
  const change = n > 0 ? ((n - asset.valuation.navPerToken) / asset.valuation.navPerToken) * 100 : 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" onClick={() => { setValue(String(asset.valuation.navPerToken)); setSource(asset.underlying.appraiser ?? ""); setNote(""); setOpen(true); }}>
        <PencilLine /> Enter valuation
      </Button>
      <DialogContent
        size="sm"
        title="Enter a valuation"
        description="For products valued by an appraiser or administrator rather than a live feed. A checker approves it before it is published."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="primary" disabled={!(n > 0) || !source.trim()} isLoading={m.isPending} onClick={() => m.mutate({ assetId: asset.id, navPerToken: n, source, note }, { onSuccess: () => setOpen(false) })}>Send to checker</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={`Value per unit (${asset.valuation.currency})`} htmlFor="val-n" hint={n > 0 ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}% from ${asset.valuation.navPerToken}` : undefined}>
            <Input id="val-n" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} />
          </Field>
          <Field label="Source" htmlFor="val-src">
            <Input id="val-src" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Valuer or administrator" />
          </Field>
          <Field label="Note" htmlFor="val-note">
            <Textarea id="val-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- documents ------------------------------ */

export const VISIBILITY_META: Record<D.DocumentVisibility, { label: string; tone: "success" | "info" | "neutral" }> = {
  public: { label: "Everyone", tone: "success" },
  holders: { label: "Token holders", tone: "info" },
  internal: { label: "Internal", tone: "neutral" },
};

export function DocumentVisibilityControl({ asset, doc }: { asset: D.Asset; doc: D.AssetDocument }) {
  const can = useCan("documents.write");
  const m = useSetDocumentVisibility();
  const v = doc.visibility ?? "holders";
  if (!can) return <Badge tone={VISIBILITY_META[v].tone}>{VISIBILITY_META[v].label}</Badge>;
  return (
    <NativeSelect aria-label={`Who can see ${doc.name}`} value={v} disabled={m.isPending} onChange={(e) => m.mutate({ assetId: asset.id, documentId: doc.id, visibility: e.target.value as D.DocumentVisibility })} className="h-8 w-[150px] text-[12.5px]">
      {(Object.keys(VISIBILITY_META) as D.DocumentVisibility[]).map((k) => (
        <option key={k} value={k}>{VISIBILITY_META[k].label}</option>
      ))}
    </NativeSelect>
  );
}

const UPLOAD_KINDS: D.AssetDocument["kind"][] = ["offering-memorandum", "term-sheet", "valuation-report", "investor-report", "legal-opinion", "audit-report", "title-deed", "insurance", "technical-report", "vault-certificate", "sharia-opinion", "spv-constitution", "other"];

export function DocumentUploadButton({ asset }: { asset: D.Asset }) {
  const can = useCan("documents.write");
  const m = useUploadAssetDocument();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<D.AssetDocument["kind"]>("investor-report");
  const [visibility, setVisibility] = React.useState<D.DocumentVisibility>("holders");
  const [file, setFile] = React.useState<File>();
  if (!can) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => { setName(""); setFile(undefined); setOpen(true); }}>
        <FileUp /> Upload
      </Button>
      <DialogContent
        size="sm"
        title="Upload a document"
        description={asset.name}
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="primary" disabled={!name.trim()} isLoading={m.isPending} onClick={() => m.mutate({ assetId: asset.id, doc: { name, kind, visibility, sizeKb: file ? Math.round(file.size / 1024) : undefined } }, { onSuccess: () => setOpen(false) })}>Upload</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted hover:bg-surface-2">
            <ArrowDownToLine className="size-5" aria-hidden />
            {file ? <span className="font-medium text-foreground">{file.name}</span> : "Choose a PDF, image or spreadsheet"}
            <input type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setFile(f); if (f && !name) setName(f.name.replace(/\.[^.]+$/, "")); }} />
          </label>
          <Field label="Name" htmlFor="doc-name">
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="doc-kind">
              <NativeSelect id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as D.AssetDocument["kind"])}>
                {UPLOAD_KINDS.map((k) => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Who can see it" htmlFor="doc-vis">
              <NativeSelect id="doc-vis" value={visibility} onChange={(e) => setVisibility(e.target.value as D.DocumentVisibility)}>
                {(Object.keys(VISIBILITY_META) as D.DocumentVisibility[]).map((k) => <option key={k} value={k}>{VISIBILITY_META[k].label}</option>)}
              </NativeSelect>
            </Field>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- service providers ------------------------- */

export function ServiceProvidersCard({ issuer }: { issuer?: D.Issuer }) {
  if (!issuer?.serviceProviders?.length) return null;
  return (
    <Card>
      <CardHeader icon={<Scale />} title="Parties to the structure" description={issuer.licence ?? issuer.name} />
      <CardBody>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {issuer.serviceProviders.map((p) => (
            <li key={p.role + p.name} className="min-w-0 rounded-xl bg-surface-2 px-3 py-2.5">
              <div className="mb-1.5 text-[11.5px] text-muted">{p.role}</div>
              <CompanyName name={p.name} size={26} className="max-w-full" />
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
