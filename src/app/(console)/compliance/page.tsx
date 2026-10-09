"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Ban, BadgeCheck, CircleCheck, CirclePause, Fingerprint, Gavel, Info, Landmark, Layers, Megaphone, Play, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type * as D from "@/types/domain";
import { useAsset, useAssets, useCheckEligibility, useInvestor, useInvestors, useOfferings } from "@/hooks/api";
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, Field, Input, NativeSelect, PageHeader, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EligibilityResultView } from "@/components/domain/decision-views";
import { ClassificationBadge, RiskBadge } from "@/components/domain/status";
import { IdentityStatusBadge } from "@/components/identity/shared";
import { PartyName } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { SrhMark } from "@/components/brand/srh-logo";
import { PartyAvatar } from "@/components/visual/bits";
import { FlowDiagram, type FlowNodeSpec } from "@/components/visual/flow";
import { CHAIN_META, CLASSIFICATION_LABEL } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const PRESETS = [
  { key: "allow", label: "Clean allow", description: "Approved UAE professional investor, treasury fund", investorId: "inv_fatimarahman", assetId: "ast_tbill", amount: 50_000, icon: CircleCheck, tone: "text-success" },
  { key: "reject", label: "Retail investor", description: "Treasury fund is for professional investors only", investorId: "inv_arjunmehta", assetId: "ast_tbill", amount: 100_000, icon: Ban, tone: "text-danger" },
  { key: "review", label: "High AML risk", description: "Adverse media on file", investorId: "inv_sophielaurent", assetId: "ast_tbill", amount: 250_000, icon: CirclePause, tone: "text-warning" },
] as const;

type Outcome = "pass" | "fail" | "review" | "idle";

const worst = (checks: D.EligibilityCheck[]): Outcome =>
  !checks.length ? "idle" : checks.some((c) => c.outcome === "fail") ? "fail" : checks.some((c) => c.outcome === "review") ? "review" : "pass";

export default function EligibilityEnginePage() {
  const [investorId, setInvestorId] = React.useState("");
  const [assetId, setAssetId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [errors, setErrors] = React.useState<{ investor?: string; asset?: string; amount?: string }>({});
  const [activePreset, setActivePreset] = React.useState<string>();

  const investors = useInvestors();
  const assets = useAssets();
  const { data: offerings } = useOfferings();
  const { data: investor } = useInvestor(investorId);
  const { data: presetAsset } = useAsset(assetId && !assets.data?.some((a) => a.id === assetId) ? assetId : "");
  const check = useCheckEligibility();

  const offeringFor = React.useCallback((aid: string) => {
    const list = (offerings ?? []).filter((o) => o.assetId === aid);
    return list.find((o) => o.status === "open") ?? list[0];
  }, [offerings]);
  const offering = offeringFor(assetId);

  // Investors and products from presets may sit outside the current list; keep them selectable.
  const investorOptions = React.useMemo(() => {
    const items = investors.data?.items ?? [];
    return investor && !items.some((i) => i.id === investor.id) ? [investor, ...items] : items;
  }, [investors.data, investor]);
  const assetOptions = React.useMemo(() => {
    const items = assets.data ?? [];
    return presetAsset && !items.some((a) => a.id === presetAsset.id) ? [presetAsset, ...items] : items;
  }, [assets.data, presetAsset]);

  React.useEffect(() => {
    if (investor && !investor.wallets.some((w) => w.id === walletId)) setWalletId(investor.wallets[0]?.id ?? "");
  }, [investor, walletId]);

  const evaluate = (input?: { investorId: string; assetId: string; amount?: number; walletId?: string }) => {
    const v = input ?? { investorId, assetId, amount: amount ? Number(amount.replace(/,/g, "")) : undefined, walletId: walletId || undefined };
    const e: typeof errors = {};
    if (!v.investorId) e.investor = "Choose an investor";
    if (!v.assetId) e.asset = "Choose a product";
    if (v.amount !== undefined && (!Number.isFinite(v.amount) || v.amount <= 0)) e.amount = "Enter a positive amount, or leave it empty";
    setErrors(e);
    const first = (["investor", "asset", "amount"] as const).find((k) => e[k]);
    if (first) return document.getElementById(`ee-${first}`)?.focus();
    check.mutate({ investorId: v.investorId, assetId: v.assetId, offeringId: offeringFor(v.assetId)?.id, amount: v.amount, walletId: v.walletId });
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setActivePreset(p.key);
    setInvestorId(p.investorId);
    setAssetId(p.assetId);
    setAmount(fmt.num(p.amount));
    setWalletId("");
    setErrors({});
    evaluate({ investorId: p.investorId, assetId: p.assetId, amount: p.amount });
  };

  const clearResult = () => {
    setActivePreset(undefined);
    check.reset();
  };

  const result = check.data;
  // Scenarios use records of the SRH tenant; other tenants only see the ones that exist for them.
  const presets = investors.data && assets.data ? PRESETS.filter((p) => investors.data.items.some((i) => i.id === p.investorId) && assets.data.some((a) => a.id === p.assetId)) : PRESETS;

  return (
    <>
      <PageHeader
        title="Eligibility engine"
        description="Test any investor against any product."
        actions={<Button asChild variant="secondary"><Link href="/compliance/policies">Policy packs <ArrowUpRight /></Link></Button>}
      />

      <Card className="mb-5">
        <CardHeader
          icon={<ShieldCheck />}
          title={<span className="inline-flex items-center gap-1.5">Decision pipeline <Tip content="The same layered rules run at the eligibility stage of every order and at every transfer. Any failure rejects; any open question sends the case to manual review."><Info className="size-3.5 text-subtle" tabIndex={0} aria-label="How the pipeline decides" /></Tip></span>}
          description="Each layer adds rules"
        />
        <CardBody>
          <Pipeline result={result} pending={check.isPending} investor={investorOptions.find((i) => i.id === (result?.investorId ?? investorId))} />
        </CardBody>
      </Card>

      {presets.length > 0 && (
        <Card className="mb-5">
          <CardHeader title="Try a scenario" description="One click fills the form and evaluates" />
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            {presets.map((p) => <PresetCard key={p.key} preset={p} active={activePreset === p.key} onSelect={() => applyPreset(p)} assets={assets.data} />)}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Evaluation input" />
            <CardBody className="flex flex-col gap-4">
              {investors.error && !investors.data ? (
                <ErrorState error={investors.error} onRetry={() => investors.refetch()} className="py-6" />
              ) : (
                <Field label="Investor" htmlFor="ee-investor" error={errors.investor} required>
                  <NativeSelect id="ee-investor" value={investorId} disabled={investors.isPending} aria-invalid={!!errors.investor}
                    onChange={(e) => { setInvestorId(e.target.value); setWalletId(""); setErrors((x) => ({ ...x, investor: undefined })); clearResult(); }}>
                    <option value="">{investors.isPending ? "Loading investors…" : "Choose an investor"}</option>
                    {investorOptions.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.residency} · {CLASSIFICATION_LABEL[i.classification]}</option>)}
                  </NativeSelect>
                </Field>
              )}
              {investor && investor.id === investorId && (
                <div className="-mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1"><PartyName party={investor} size={26} /></span>
                  <ClassificationBadge c={investor.classification} />
                  <IdentityStatusBadge investor={investor} />
                  <RiskBadge risk={investor.amlRisk} />
                  {investor.pep && <Badge tone="warning">PEP</Badge>}
                  {investor.adverseMedia && <Badge tone="warning">Adverse media</Badge>}
                  {investor.sanctionsHit && <Badge tone="danger">Sanctions hit</Badge>}
                </div>
              )}
              {assets.error && !assets.data ? (
                <ErrorState error={assets.error} onRetry={() => assets.refetch()} className="py-6" />
              ) : (
                <Field label="Product" htmlFor="ee-asset" error={errors.asset} required hint={assetId ? (offering ? `Offering: ${offering.name} · ${offering.status} · minimum ${fmt.money(offering.minTicket, offering.currency, { compact: true })}` : "No offering for this product. Offering rules are skipped.") : undefined}>
                  <NativeSelect id="ee-asset" value={assetId} disabled={assets.isPending} aria-invalid={!!errors.asset}
                    onChange={(e) => { setAssetId(e.target.value); setErrors((x) => ({ ...x, asset: undefined })); clearResult(); }}>
                    <option value="">{assets.isPending ? "Loading products…" : "Choose a product"}</option>
                    {assetOptions.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.jurisdiction}</option>)}
                  </NativeSelect>
                </Field>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={`Amount${offering ? ` (${offering.currency})` : ""}`} htmlFor="ee-amount" error={errors.amount} hint="Optional. Adds ticket size, capacity and holding limit checks.">
                  <Input id="ee-amount" inputMode="decimal" className="tabular" value={amount} placeholder={offering ? fmt.num(offering.minTicket) : "100,000"} aria-invalid={!!errors.amount}
                    onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, "")); setErrors((x) => ({ ...x, amount: undefined })); }} />
                </Field>
                <Field label="Wallet" htmlFor="ee-wallet">
                  <NativeSelect id="ee-wallet" value={walletId} disabled={!investor?.wallets.length} onChange={(e) => setWalletId(e.target.value)}>
                    {!investor ? <option value="">Choose an investor first</option> : !investor.wallets.length ? <option value="">No wallets linked</option> : null}
                    {investor?.wallets.map((w) => <option key={w.id} value={w.id}>{w.label} · {CHAIN_META[w.chain].label} · {w.whitelisted ? "whitelisted" : "not whitelisted"}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-[12px] text-muted">Every evaluation is written to the audit trail.</span>
                <Button variant="primary" onClick={() => evaluate()} isLoading={check.isPending} loadingText="Evaluating…"><Play /> Evaluate</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader icon={<Sparkles />} title="Decision" description={result ? `Evaluated ${fmt.time(result.evaluatedAt)} against ${result.checks.length} rules` : "Global core, jurisdiction pack, product, offering and investor rules"} />
          <CardBody>
            {check.isPending ? (
              <div className="flex flex-col gap-2"><Skeleton className="h-16" /><Skeleton className="h-4 w-24" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : check.isError ? (
              <ErrorState error={check.error} onRetry={() => evaluate()} className="py-8" />
            ) : result ? (
              <EligibilityResultView key={result.id} result={result} />
            ) : (
              <EmptyState icon={<ShieldCheck />} title="No evaluation yet" description="Choose an investor and a product, or pick a scenario, then evaluate to see each rule and the decision." className="py-12" />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/* -------------------------------- scenarios ------------------------------- */
function PresetCard({ preset: p, active, onSelect, assets }: { preset: (typeof PRESETS)[number]; active: boolean; onSelect: () => void; assets?: D.Asset[] }) {
  const { data: inv } = useInvestor(p.investorId);
  const asset = assets?.find((a) => a.id === p.assetId);
  return (
    <button type="button" onClick={onSelect} aria-pressed={active}
      className={cn("flex flex-col gap-3 rounded-xl border p-3 text-left transition-[border-color,background-color] duration-150", active ? "border-brand bg-brand-soft" : "border-border hover:border-border-strong hover:bg-surface-2")}>
      <span className="flex items-center gap-2">
        <p.icon className={cn("size-4 shrink-0", p.tone)} />
        <span className="text-[13px] font-semibold">{p.label}</span>
      </span>
      <span className="flex items-center gap-2">
        {inv ? <PartyAvatar name={inv.name} type={inv.type} src={inv.avatar} logo={inv.logo} size={32} /> : <Skeleton className="size-8 rounded-full" />}
        <ArrowRight className="size-3.5 shrink-0 text-subtle" aria-hidden />
        {asset ? <AssetThumb asset={asset} className="h-8 w-11 rounded-md" /> : <Skeleton className="h-8 w-11" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">{inv?.name ?? "…"}</span>
          <span className="block truncate text-[12px] text-muted">{asset?.shortName ?? p.assetId} · {fmt.money(p.amount, "USD", { compact: true })}</span>
        </span>
      </span>
      <span className="text-[12px] leading-snug text-muted">{p.description}</span>
    </button>
  );
}

/* -------------------------------- pipeline -------------------------------- */
function Pipeline({ result, pending, investor }: { result?: D.EligibilityResult; pending: boolean; investor?: D.Investor }) {
  const checks = result?.checks ?? [];
  const pick = (f: (c: D.EligibilityCheck) => boolean) => worst(checks.filter(f));
  const st = (o: Outcome) => (o === "idle" ? "idle" : o) as FlowNodeSpec["status"];
  const decision = result?.decision;
  const nodes: FlowNodeSpec[] = [
    { key: "investor", label: "Investor", sub: investor?.name ?? "Profile, wallet", icon: UserRound, media: investor ? <PartyAvatar name={investor.name} type={investor.type} src={investor.avatar} logo={investor.logo} size={32} /> : undefined, status: result ? "pass" : "idle", tip: "Investor profile and the selected wallet" },
    { key: "kyc", label: "KYC/KYB", sub: "Identity, screening", icon: Fingerprint, status: st(pick((c) => c.layer === "global")), tip: "Global core: identity status, sanctions, PEP, AML risk and wallet risk" },
    { key: "classification", label: "Classification", sub: "Category, expiry", icon: BadgeCheck, status: st(pick((c) => c.ruleCode === "P-020" || c.layer === "investor")), tip: "Investor category and accreditation in date" },
    { key: "jurisdiction", label: "Jurisdiction", sub: "Residency, pack", icon: Landmark, status: st(pick((c) => c.layer === "jurisdiction")), tip: "Rules from the jurisdiction policy pack" },
    { key: "product", label: "Product", sub: "Limits, lock-up", icon: Layers, status: st(pick((c) => c.layer === "product" && c.ruleCode !== "P-020")), tip: "Eligible categories, holding limits and lock-ups" },
    { key: "offering", label: "Offering", sub: "Ticket, capacity", icon: Megaphone, status: st(pick((c) => c.layer === "offering")), tip: "Subscription window, ticket size and capacity" },
    { key: "engine", label: "Engine", sub: result ? `${result.durationMs} ms` : "All layers", media: <span className="grid size-8 place-items-center rounded-lg bg-white"><SrhMark size={22} /></span>, tone: "navy", status: result ? (decision === "ALLOW" ? "pass" : decision === "REJECT" ? "fail" : "review") : "idle" },
    {
      key: "outcome",
      label: decision ? (decision === "ALLOW" ? "Allow" : decision === "REJECT" ? "Reject" : "Manual review") : "Outcome",
      sub: decision ? `${checks.filter((c) => c.outcome === "pass").length} of ${checks.length} passed` : "Allow, reject or review",
      icon: decision === "ALLOW" ? CircleCheck : decision === "REJECT" ? Ban : decision ? CirclePause : Gavel,
      status: decision ? (decision === "ALLOW" ? "pass" : decision === "REJECT" ? "fail" : "review") : "idle",
    },
  ];
  return (
    <div className={cn("transition-opacity", pending && "animate-pulse")}>
      <FlowDiagram key={result?.id ?? "idle"} nodes={nodes} breakpoint="xl" compact label="Decision pipeline" />
    </div>
  );
}
