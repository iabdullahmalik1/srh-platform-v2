"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, KeyRound, Search, Wallet as WalletIcon } from "lucide-react";
import { useAssets, useCheckEligibility, useInvestor, useInternalRules, useInvestors, useOfferings, useOrder, useSubscribe, useTokenClasses } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { useWorkflows } from "@/stores/workflows";
import { PERSONA_INVESTOR } from "@/lib/directory";
import { Badge, Card, CardBody, CardHeader, Checkbox, CopyText, EmptyState, Field, Input, PageHeader, Progress, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { AssetCover } from "@/components/domain/media";
import { CompanyLogo, NetworkLogo, PersonAvatar, RailLogo } from "@/components/domain/logos";
import { ClassificationBadge, StatusBadge } from "@/components/domain/status";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { CardCheckout } from "@/components/transaction/card-checkout";
import { SettlementFlow } from "@/components/transaction/settlement-flow";
import { SignDialog } from "@/components/transaction/sign-dialog";
import { ComplianceSummary, OrderTicket, RailTiles } from "@/components/transaction/ticket";
import { CHAIN_META, CLASSIFICATION_LABEL, STAGE_META } from "@/lib/constants";
import { errorMessage } from "@/services/api";
import { cn, fmt } from "@/lib/utils";

const STEPS = ["Offering", "Investor and wallet", "Amount and payment", "Compliance check", "Confirmation"];
const FEE_RATE = 0.0025;

function SubscriptionWizard() {
  const params = useSearchParams();
  const persona = usePersona();
  const { subscription, setSubscription, resetSubscription } = useWorkflows();
  const { step, draft, submittedOrderId } = subscription;
  const investorPersona = persona.role === "investor";

  // Preselect from deep links (?offering=) and fix the investor for the investor persona.
  React.useEffect(() => {
    const off = params.get("offering");
    if (off && off !== draft.offeringId && !submittedOrderId) resetSubscription({ offeringId: off, investorId: investorPersona ? PERSONA_INVESTOR[persona.id] : undefined });
    else if (investorPersona && draft.investorId !== PERSONA_INVESTOR[persona.id] && !submittedOrderId) setSubscription({ investorId: PERSONA_INVESTOR[persona.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (n: number) => setSubscription({}, n);
  const reset = () => resetSubscription(investorPersona ? { investorId: PERSONA_INVESTOR[persona.id] } : undefined);

  return (
    <>
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {investorPersona ? "My orders" : "Order lifecycle"}
      </Link>
      <PageHeader
        title={investorPersona ? "Subscribe" : "New subscription"}
        description="Draft saves as you go."
        actions={(step > 0 || draft.offeringId) && !submittedOrderId ? <Button variant="ghost" onClick={reset}>Discard draft</Button> : undefined}
      />
      <Stepper steps={STEPS} current={submittedOrderId ? 4 : step} className="mb-6" />
      {submittedOrderId ? (
        <Submitted orderId={submittedOrderId} onNew={reset} />
      ) : step === 0 ? (
        <StepOffering onNext={() => go(investorPersona ? 2 : 1)} />
      ) : step === 1 ? (
        <StepInvestor onBack={() => go(0)} onNext={() => go(2)} />
      ) : step === 2 ? (
        <StepAmount onBack={() => go(investorPersona ? 0 : 1)} onNext={() => go(3)} />
      ) : (
        <StepCheck onBack={() => go(2)} device={investorPersona ? "phone" : "key"} />
      )}
    </>
  );
}

/* ------------------------------- step 0 ------------------------------- */
function StepOffering({ onNext }: { onNext: () => void }) {
  const { data: offerings, isPending } = useOfferings();
  const { data: assets } = useAssets();
  const { data: tokens } = useTokenClasses();
  const { subscription, setSubscription } = useWorkflows();
  const reduce = useReducedMotion();
  const open = offerings?.filter((o) => o.status === "open") ?? [];
  if (isPending) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80" />)}</div>;
  if (!open.length) return <Card><EmptyState title="No offerings are open" description="Offerings appear here when their window opens." /></Card>;
  return (
    <>
      <div role="radiogroup" aria-label="Offering" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {open.map((o, i) => {
          const a = assets?.find((x) => x.id === o.assetId);
          const t = tokens?.find((x) => x.assetId === o.assetId);
          const chains = t?.deployments.filter((d) => d.status === "live").map((d) => d.chain) ?? [];
          const selected = subscription.draft.offeringId === o.id;
          return (
            <motion.button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: reduce ? 0 : i * 0.05 }}
              onClick={() => setSubscription({ offeringId: o.id, amount: undefined, rail: undefined, chain: undefined, walletId: undefined })}
              className={cn("group overflow-hidden rounded-xl border bg-surface text-left shadow-1 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-2", selected ? "border-brand ring-2 ring-brand/25" : "border-border")}
            >
              <div className="relative">
                {a ? <AssetCover asset={a} className="h-40" overlay /> : <div className="h-40 bg-surface-3" />}
                <span className={cn("absolute right-3 top-3 grid size-6 place-items-center rounded-full border-2 backdrop-blur", selected ? "border-white bg-brand text-white" : "border-white/80 bg-navy-1/30")}>{selected && <Check className="size-3.5" strokeWidth={3} />}</span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="truncate text-[16px] font-semibold leading-5">{a?.name ?? o.name}</div>
                  <div className="mt-0.5 truncate text-[12.5px] text-white/80">{t?.symbol ? `${t.symbol} · ` : ""}{o.name}</div>
                </div>
              </div>
              <div className="p-4">
                <dl className="grid grid-cols-3 gap-2 text-[12px]">
                  <div><dt className="text-muted">Price</dt><dd className="text-[13px] font-semibold tabular">{fmt.money(o.pricePerToken, o.currency, { digits: o.pricePerToken < 10 ? 4 : 2 })}</dd></div>
                  <div><dt className="text-muted">Yield</dt><dd className="text-[13px] font-semibold tabular">{a?.income.targetYieldPct ? `${a.income.targetYieldPct}%` : "n/a"}</dd></div>
                  <div><dt className="text-muted">Minimum</dt><dd className="text-[13px] font-semibold tabular">{fmt.money(o.minTicket, o.currency, { compact: true })}</dd></div>
                </dl>
                <Progress value={(o.subscribed / o.target) * 100} className="mt-3.5" />
                <div className="mt-1.5 flex justify-between text-[11.5px] text-muted tabular"><span>{fmt.money(o.subscribed, o.currency, { compact: true })} raised</span><span>of {fmt.money(o.target, o.currency, { compact: true })}</span></div>
                <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex -space-x-1.5" aria-label="Payment rails">
                    {o.rails.map((r) => <RailLogo key={r} rail={r} size={20} className="ring-2 ring-surface" />)}
                  </span>
                  <span className="flex -space-x-1.5" aria-label="Networks">
                    {chains.map((c) => <NetworkLogo key={c} chain={c} size={20} className="ring-2 ring-surface" />)}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
      <WizardFooter next={{ label: "Continue", onClick: onNext, disabled: !subscription.draft.offeringId }} />
    </>
  );
}

/* ------------------------------- step 1 ------------------------------- */
function StepInvestor({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { subscription, setSubscription } = useWorkflows();
  const [q, setQ] = React.useState("");
  const { data, isPending } = useInvestors({ search: q || undefined });
  const { data: investor } = useInvestor(subscription.draft.investorId ?? "");
  const { data: offerings } = useOfferings();
  const { data: tokens } = useTokenClasses();
  const off = offerings?.find((o) => o.id === subscription.draft.offeringId);
  const token = tokens?.find((t) => t.assetId === off?.assetId);
  const chains = token?.deployments.filter((d) => d.status === "live").map((d) => d.chain) ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Investor" />
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input aria-label="Search investors" placeholder="Search by name or email" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <ul role="radiogroup" aria-label="Investor" className="max-h-[440px] overflow-y-auto p-1.5 scrollbar-thin">
          {isPending && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="m-1.5 h-12" />)}
          {data?.items.map((inv) => {
            const selected = subscription.draft.investorId === inv.id;
            const idStatus = inv.type === "entity" ? inv.kybStatus ?? inv.kycStatus : inv.kycStatus;
            return (
              <li key={inv.id}>
                <button role="radio" aria-checked={selected} onClick={() => setSubscription({ investorId: inv.id, walletId: undefined, chain: undefined })} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", selected ? "bg-brand-soft" : "hover:bg-surface-2")}>
                  {inv.type === "entity" ? <CompanyLogo name={inv.name} size={34} /> : <PersonAvatar name={inv.name} size={34} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{inv.name}</span>
                    <span className="block truncate text-[12px] text-muted">{inv.residency} · {CLASSIFICATION_LABEL[inv.classification]}</span>
                  </span>
                  <StatusBadge status={idStatus} />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Destination wallet" description={chains.length ? <span className="inline-flex items-center gap-1.5">{token?.symbol} live on {chains.map((c) => <NetworkLogo key={c} chain={c} size={14} />)}</span> : undefined} />
        <CardBody className="flex flex-col gap-4">
          {!investor ? (
            <EmptyState icon={<WalletIcon />} title="Select an investor" description="Linked wallets appear here." className="py-10" />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <ClassificationBadge c={investor.classification} />
                <Badge tone={investor.amlRisk === "high" ? "danger" : "outline"}>AML {investor.amlRisk}</Badge>
                {investor.pep && <Badge tone="warning">PEP</Badge>}
              </div>
              <div role="radiogroup" aria-label="Wallet" className="flex flex-col gap-2">
                {investor.wallets.map((w) => {
                  const deployable = chains.includes(w.chain);
                  const selected = subscription.draft.walletId === w.id;
                  return (
                    <button key={w.id} role="radio" aria-checked={selected} disabled={!deployable} onClick={() => setSubscription({ walletId: w.id, chain: w.chain })} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50", selected ? "border-brand bg-brand-soft" : "border-border hover:border-border-strong")}>
                      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
                        <WalletIcon className="size-[18px] text-foreground/70" />
                        <NetworkLogo chain={w.chain} size={16} className="absolute -bottom-1 -right-1 ring-2 ring-surface" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{w.label}</span>
                        <span className="block truncate font-mono text-[11.5px] text-muted">{fmt.hash(w.address, 8, 6)}</span>
                      </span>
                      <span className="text-right text-[11.5px]">
                        {deployable ? (w.whitelisted ? <span className="inline-flex items-center gap-1 text-success"><Check className="size-3" />Whitelisted</span> : <span className="text-warning">Not whitelisted</span>) : <span className="text-muted">Not on {CHAIN_META[w.chain].short}</span>}
                        <span className="block text-muted">{fmt.sentence(w.type)}{w.custodian ? ` · ${w.custodian}` : ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardBody>
      </Card>
      <div className="lg:col-span-2">
        <WizardFooter back={onBack} next={{ label: "Continue", onClick: onNext, disabled: !subscription.draft.investorId || !subscription.draft.walletId }} />
      </div>
    </div>
  );
}

/* ------------------------------- step 2 ------------------------------- */
function StepAmount({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { subscription, setSubscription } = useWorkflows();
  const { data: offerings } = useOfferings();
  const { data: assets } = useAssets();
  const { data: investor } = useInvestor(subscription.draft.investorId ?? "");
  const off = offerings?.find((o) => o.id === subscription.draft.offeringId);
  const [raw, setRaw] = React.useState(subscription.draft.amount ? fmt.num(subscription.draft.amount) : "");
  const [error, setError] = React.useState<string>();
  const [railError, setRailError] = React.useState<string>();

  // Pick a wallet automatically for the investor persona (first live chain wallet).
  const { data: tokens } = useTokenClasses();
  const { data: rules } = useInternalRules();
  const token = tokens?.find((t) => t.assetId === off?.assetId);
  React.useEffect(() => {
    if (!investor || subscription.draft.walletId || !token) return;
    const w = investor.wallets.find((x) => token.deployments.some((d) => d.chain === x.chain && d.status === "live"));
    if (w) setSubscription({ walletId: w.id, chain: w.chain });
  }, [investor, token, subscription.draft.walletId, setSubscription]);

  if (!off) return <Skeleton className="h-64" />;
  const asset = assets?.find((a) => a.id === off.assetId);
  const schema = z.number({ error: "Enter an amount" }).min(off.minTicket, `Minimum subscription is ${fmt.money(off.minTicket, off.currency)}`).max(off.maxTicket, `Maximum subscription is ${fmt.money(off.maxTicket, off.currency)}`);
  const amount = Number(raw.replace(/,/g, ""));
  const tokensOut = amount > 0 ? amount / off.pricePerToken : 0;
  const cardFee = subscription.draft.rail === "card" && rules ? (amount * rules.card.feePct) / 100 : 0;
  const fee = amount * FEE_RATE + cardFee;
  const rail = subscription.draft.rail;
  const chain = subscription.draft.chain;

  const next = () => {
    const r = schema.safeParse(raw ? amount : undefined);
    let ok = true;
    if (!r.success) {
      setError(r.error.issues[0].message);
      ok = false;
    }
    if (!rail) {
      setRailError("Choose a payment rail");
      ok = false;
    }
    if (!ok) return;
    setSubscription({ amount });
    onNext();
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Amount and rail" description={`${fmt.money(off.minTicket, off.currency, { compact: true })} to ${fmt.money(off.maxTicket, off.currency, { compact: true })}`} />
        <CardBody className="flex flex-col gap-5">
          <Field label={`Amount (${off.currency})`} htmlFor="amount" error={error}>
            <Input id="amount" inputMode="decimal" autoComplete="off" className="h-12 text-[20px] font-semibold tabular" placeholder={fmt.num(off.minTicket)} value={raw} aria-invalid={!!error} aria-describedby={error ? "amount-error" : undefined}
              onChange={(e) => { setRaw(e.target.value.replace(/[^\d.,]/g, "")); setError(undefined); }} onBlur={() => amount > 0 && setRaw(fmt.num(amount))} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {[off.minTicket, off.minTicket * 4, off.minTicket * 10].filter((v) => v <= off.maxTicket).map((v) => (
              <Button key={v} size="sm" variant="secondary" onClick={() => { setRaw(fmt.num(v)); setError(undefined); }}>{fmt.money(v, off.currency, { compact: true })}</Button>
            ))}
          </div>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium">Payment rail</legend>
            <RailTiles rails={off.rails} value={rail} invalid={!!railError} onChange={(r) => { setSubscription({ rail: r }); setRailError(undefined); }} />
            {railError && <p role="alert" className="mt-1.5 text-[12px] text-danger">{railError}</p>}
          </fieldset>
          {rail === "card" && <CardCheckout amount={amount || 0} currency={off.currency} classification={investor?.classification} />}
        </CardBody>
      </Card>
      <Card className="self-start overflow-hidden">
        {asset && (
          <div className="relative">
            <AssetCover asset={asset} className="h-24" overlay />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 text-white">
              <span className="truncate text-[14px] font-semibold">{asset.name}</span>
              <span className="shrink-0 text-[12px] text-white/85 tabular">{fmt.money(off.pricePerToken, off.currency, { digits: off.pricePerToken < 10 ? 4 : 2 })} / unit</span>
            </div>
          </div>
        )}
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <FlowEnd label="You pay" value={fmt.money((amount || 0) + fee, off.currency, { digits: 2 })} icon={rail ? <RailLogo rail={rail} size={22} /> : <span className="size-[22px] rounded-full border border-dashed border-border-strong" />} />
            <ArrowRight className="size-4 text-subtle" />
            <FlowEnd label="You receive" value={`${fmt.num(Math.floor(tokensOut * 100) / 100)} ${token?.symbol ?? ""}`} icon={chain ? <NetworkLogo chain={chain} size={22} /> : <span className="size-[22px] rounded-full border border-dashed border-border-strong" />} align="right" />
          </div>
          <dl className="flex flex-col gap-2 border-t border-border pt-3.5 text-[13px]">
            <Row k="Investor" v={investor ? <span className="inline-flex items-center gap-2">{investor.type === "entity" ? <CompanyLogo name={investor.name} size={18} /> : <PersonAvatar name={investor.name} size={18} />}<span className="max-w-[160px] truncate">{investor.name}</span></span> : "…"} />
            <Row k="Platform fee" v={<Tip content="25 basis points"><span className="tabular">{fmt.money(amount * FEE_RATE, off.currency, { digits: 2 })}</span></Tip>} />
            {cardFee > 0 && <Row k="Card fee" v={<span className="tabular">{fmt.money(cardFee, off.currency, { digits: 2 })}</span>} />}
            <Row k="Settlement" v={<span className="inline-flex h-[22px] items-center rounded-full bg-info-soft px-2 text-[11.5px] font-medium text-info">{off.settlement === "dvp" ? "DvP" : off.settlement === "atomic" ? "Atomic" : "Async"}</span>} />
          </dl>
        </CardBody>
      </Card>
      <div className="lg:col-span-2"><WizardFooter back={onBack} next={{ label: "Run compliance check", onClick: next }} /></div>
    </div>
  );
}

function FlowEnd({ label, value, icon, align }: { label: string; value: string; icon: React.ReactNode; align?: "right" }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-surface-2 p-3", align === "right" && "text-right")}>
      <div className={cn("flex items-center gap-1.5 text-[11.5px] text-muted", align === "right" && "justify-end")}>{icon}{label}</div>
      <div className="mt-1.5 truncate text-[15px] font-semibold tabular">{value}</div>
    </div>
  );
}

/* ------------------------------- step 3 ------------------------------- */
function StepCheck({ onBack, device }: { onBack: () => void; device: "phone" | "key" }) {
  const { subscription, setSubscription, completeSubscription } = useWorkflows();
  const { draft } = subscription;
  const { data: offerings } = useOfferings();
  const { data: assets } = useAssets();
  const { data: tokens } = useTokenClasses();
  const { data: investor } = useInvestor(draft.investorId ?? "");
  const off = offerings?.find((o) => o.id === draft.offeringId);
  const asset = assets?.find((a) => a.id === off?.assetId);
  const token = tokens?.find((t) => t.assetId === off?.assetId);
  const wallet = investor?.wallets.find((w) => w.id === draft.walletId);
  const check = useCheckEligibility();
  const submit = useSubscribe();
  const [signing, setSigning] = React.useState(false);
  const ran = React.useRef(false);
  React.useEffect(() => {
    if (ran.current || !off || !draft.investorId) return;
    ran.current = true;
    check.mutate({ investorId: draft.investorId, assetId: off.assetId, offeringId: off.id, amount: draft.amount, walletId: draft.walletId });
  }, [off, draft, check]);

  const result = check.data;
  const blocked = result?.decision === "REJECT";
  const amount = draft.amount ?? 0;
  const fee = amount * FEE_RATE;
  const symbol = token?.symbol ?? "";
  const canSign = !!result && !blocked && draft.acceptedTerms && !!draft.rail && !!draft.chain;

  const sign = () =>
    submit.mutate(
      { offeringId: draft.offeringId!, investorId: draft.investorId!, amount: draft.amount!, rail: draft.rail!, chain: draft.chain!, walletId: draft.walletId! },
      { onSuccess: (o) => { setSigning(false); completeSubscription(o.id); } },
    );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader title="Compliance check" />
        <CardBody>
          {check.isError ? (
            <div className="flex flex-col items-start gap-3"><p className="text-[13px] text-danger">The compliance engine did not respond. Run the check again.</p><Button size="sm" onClick={() => { ran.current = false; check.reset(); }}>Run again</Button></div>
          ) : (
            <ComplianceSummary result={result} pending={check.isPending || !result} />
          )}
          {blocked && (
            <div role="alert" className="mt-4 flex gap-2 rounded-lg bg-danger-soft p-3 text-[12.5px] text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" />This order would be rejected. Change the amount or wallet.</div>
          )}
          {result?.decision === "MANUAL_REVIEW" && <div className="mt-4 rounded-lg bg-warning-soft p-3 text-[12.5px] text-warning">Held for compliance review before payment.</div>}
        </CardBody>
      </Card>

      {off && draft.rail && draft.chain ? (
        <div className="self-start">
          <OrderTicket
            asset={asset}
            offering={off}
            investor={investor}
            wallet={wallet}
            symbol={symbol}
            amount={amount}
            fee={fee}
            units={amount / off.pricePerToken}
            rail={draft.rail}
            chain={draft.chain}
            footer={
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 text-[12.5px]">
                  <Checkbox checked={draft.acceptedTerms} onCheckedChange={(v) => setSubscription({ acceptedTerms: v })} id="terms" />
                  <span>Offering memorandum and risk disclosures received. {off.settlement === "dvp" ? "Delivery versus payment" : "Settlement"} terms accepted.</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
                  <Button variant="primary" size="lg" className="flex-1" disabled={!canSign} onClick={() => { submit.reset(); setSigning(true); }}>
                    <KeyRound /> Sign and submit
                  </Button>
                </div>
              </div>
            }
          />
          <SignDialog
            open={signing}
            onOpenChange={(v) => { setSigning(v); if (!v) submit.reset(); }}
            device={device}
            title={`Subscribe to ${symbol || "units"}`}
            amount={fmt.money(amount + fee, off.currency, { digits: 2 })}
            detail={`${fmt.num(Math.floor((amount / off.pricePerToken) * 100) / 100)} ${symbol} on ${CHAIN_META[draft.chain].label}`}
            onSign={sign}
            onRetry={() => submit.reset()}
            submitting={submit.isPending}
            error={submit.isError ? errorMessage(submit.error) : undefined}
          />
        </div>
      ) : (
        <Skeleton className="h-[520px]" />
      )}
    </div>
  );
}

/* ------------------------------ submitted ----------------------------- */
function Submitted({ orderId, onNew }: { orderId: string; onNew: () => void }) {
  const { data: order } = useOrder(orderId);
  const router = useRouter();
  const [settled, setSettled] = React.useState(false);
  const onSettled = React.useCallback(() => setSettled(true), []);
  const done = order?.status === "completed" && settled;
  const title = done ? "Tokens minted and reconciled" : order?.status === "rejected" ? "Rejected at eligibility" : order?.status === "manual-review" ? "Held for compliance review" : order?.status === "exception" ? "Exception on this order" : order ? STAGE_META[order.status === "completed" ? "minted" : order.stage].label : "Order received";
  return (
    <Card>
      <CardBody className="flex flex-col gap-6 p-5 md:p-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] text-muted">Order <CopyText value={orderId} display={orderId} /></div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
            {order && <LifecycleRail order={order} variant="compact" className="mt-2" />}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onNew}>New subscription</Button>
            <Button variant="primary" onClick={() => router.push(`/orders/${orderId}`)}>Open order <ArrowRight /></Button>
          </div>
        </div>
        {order ? <SettlementFlow order={order} onSettled={onSettled} /> : <Skeleton className="h-48" />}
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function WizardFooter({ back, next }: { back?: () => void; next: { label: string; onClick: () => void; disabled?: boolean } }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
      {back ? <Button variant="ghost" onClick={back}><ArrowLeft /> Back</Button> : <span />}
      <Button variant="primary" onClick={next.onClick} disabled={next.disabled}>{next.label} <ArrowRight /></Button>
    </div>
  );
}

export default function NewSubscriptionPage() {
  return (
    <React.Suspense>
      <SubscriptionWizard />
    </React.Suspense>
  );
}
