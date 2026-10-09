"use client";

import { useRouteId } from "@/hooks/route-id";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Ban, ExternalLink, FastForward, History, ShieldCheck, Wrench } from "lucide-react";
import type * as D from "@/types/domain";
import { useAdvanceOrder, useAsset, useCancelOrder, useInvestor, useIssuers, useOrder, usePayments, useResolveOrderException, useTokenClasses } from "@/hooks/api";
import { useCan, usePersona } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, Field, KeyValue, PageHeader, Skeleton, Textarea } from "@/components/ui/primitives";
import { CompanyName, NetworkLogo, PartyName, RailLogo } from "@/components/domain/logos";
import { asset as assetPath } from "@/lib/assets";
import { SettlementFlow, stageNumber } from "@/components/transaction/settlement-flow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { EligibilityResultView } from "@/components/domain/decision-views";
import { ChainBadge, Money, RailBadge, StageBadge, StatusBadge } from "@/components/domain/status";
import { CHAIN_META, ORDER_STAGES, RAIL_META, STAGE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const NEXT_ACTION: Partial<Record<D.OrderStage, string>> = {
  submitted: "Run eligibility now",
  eligibility: "Issue payment instruction",
  "payment-instructed": "Confirm payment receipt",
  "payment-confirmed": "Allocate units",
  allocated: "Settle cash leg",
  settled: "Mint tokens",
  minted: "Reconcile",
};

export default function OrderDetailPage() {
  const id = useRouteId();
  const router = useRouter();
  const { data: order, isPending, error, refetch } = useOrder(id);
  const { data: asset } = useAsset(order?.assetId ?? "");
  const { data: investor } = useInvestor(order?.investorId ?? "");
  const { data: issuers } = useIssuers();
  const { data: tokens } = useTokenClasses();
  const { data: payments } = usePayments();
  const payment = payments?.find((p) => p.orderId === id);
  const persona = usePersona();
  const canOperate = useCan("orders.operate");
  const canDecide = useCan("compliance.decide");
  const advance = useAdvanceOrder();

  if (error && !order) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending || !order) return <DetailSkeleton />;

  const nextLabel = NEXT_ACTION[order.stage];
  const halted = order.status === "exception" || order.status === "manual-review";
  const issuer = issuers?.find((i) => i.id === asset?.issuerId);
  const token = tokens?.find((t) => t.assetId === order.assetId);

  return (
    <>
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {persona.role === "investor" ? "My orders" : "Order lifecycle"}
      </Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono">{order.id}</span><StageBadge stage={order.stage} status={order.status} /></span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PartyName party={{ name: order.investorName, type: investor?.type }} size={20} />
            <ArrowRight className="size-3.5 text-subtle" />
            <Money value={order.amount} currency={order.currency} className="font-medium text-foreground" />
            <ArrowRight className="size-3.5 text-subtle" />
            {asset ? (
              <Link className="inline-flex items-center gap-2 font-medium text-foreground hover:underline" href={`/assets/${asset.id}`}>
                {asset.media?.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetPath(asset.media.cover)} alt="" className="h-5 w-7 rounded object-cover" />
                )}
                {asset.name}
              </Link>
            ) : (
              "…"
            )}
          </span>
        }
        actions={
          <>
            {canOperate && order.status === "active" && nextLabel && (
              <Button variant="primary" isLoading={advance.isPending} loadingText="Processing…" onClick={() => advance.mutate({ id: order.id })}>
                <FastForward /> {order.stage === "settled" && order.amount >= 1_000_000 ? "Request mint approval" : nextLabel}
              </Button>
            )}
            {halted && (canOperate || canDecide) && <ResolveDialog order={order} />}
            {canOperate && !["minted", "reconciled"].includes(order.stage) && order.status !== "cancelled" && order.status !== "rejected" && <CancelDialog order={order} onDone={() => router.refresh()} />}
          </>
        }
      />

      {halted && (
        <div role="alert" className={cn("mb-5 flex items-start gap-3 rounded-xl border p-4", order.status === "manual-review" ? "border-warning/30 bg-warning-soft" : "border-danger/30 bg-danger-soft")}>
          <Wrench className={cn("mt-0.5 size-4 shrink-0", order.status === "manual-review" ? "text-warning" : "text-danger")} />
          <div>
            <div className="text-[13.5px] font-medium">{order.status === "manual-review" ? "Held for compliance review" : "Exception on this order"}</div>
            <p className="text-[13px] text-muted">{order.exceptionReason}</p>
          </div>
        </div>
      )}
      {(order.status === "rejected" || order.status === "cancelled") && order.exceptionReason && (
        <div className="mb-5 rounded-xl border border-border bg-surface-2 p-4 text-[13px]"><span className="font-medium">{order.status === "rejected" ? "Rejected: " : "Cancelled: "}</span><span className="text-muted">{order.exceptionReason}</span></div>
      )}

      <Card className="mb-5">
        <CardHeader
          title="Settlement"
          action={
            <span className="flex items-center gap-3">
              <span className="hidden items-center gap-2 text-[12px] text-muted tabular sm:flex">
                <LifecycleRail order={order} variant="compact" />
                {stageNumber(order)} of {ORDER_STAGES.length}
              </span>
              {order.status === "active" && <Badge tone="brand" dot>Live</Badge>}
            </span>
          }
        />
        <CardBody className="py-6"><SettlementFlow order={order} payment={payment} /></CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Order" />
            <CardBody>
              <KeyValue
                items={[
                  { label: "Investor", value: <PartyName party={{ name: order.investorName, type: investor?.type }} size={22} /> },
                  { label: "Issuer", value: <CompanyName name={issuer?.name ?? asset?.legalEntity.name ?? "…"} logo={issuer?.logo} size={22} /> },
                  { label: "Amount", value: <Money value={order.amount} currency={order.currency} /> },
                  { label: "Units", value: <span className="tabular">{fmt.num(order.tokens)} {token?.symbol}</span> },
                  { label: "Price per unit", value: <Money value={order.pricePerToken} currency={order.currency} digits={order.pricePerToken < 10 ? 4 : 2} /> },
                  { label: "Settlement", value: order.settlement === "dvp" ? "DvP" : order.settlement === "atomic" ? "Atomic" : "Async" },
                  { label: "Payment rail", value: <RailBadge rail={order.rail} /> },
                  { label: "Target chain", value: <ChainBadge chain={order.chain} /> },
                  { label: "Created", value: fmt.dateTime(order.createdAt) },
                  { label: "Idempotency key", value: <CopyText value={order.idempotencyKey} lead={10} tail={4} /> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon={<RailLogo rail={order.rail} size={18} />} title="Payment" description={payment ? <CompanyName name={payment.provider} size={16} className="text-[12.5px]" /> : undefined} action={payment && <StatusBadge status={payment.status} />} />
            <CardBody>
              {payment ? (
                <KeyValue
                  items={[
                    { label: "Reference", value: <CopyText value={payment.reference} display={payment.reference} /> },
                    { label: "Amount", value: <Money value={payment.amount} currency={payment.currency} /> },
                    { label: "Instructed", value: fmt.dateTime(payment.createdAt) },
                    { label: "Confirmed", value: payment.confirmedAt ? fmt.dateTime(payment.confirmedAt) : "Awaiting funds" },
                    ...(payment.txHash ? [{ label: "On-chain transfer", value: <CopyText value={payment.txHash} /> }] : []),
                    { label: "Expected", value: RAIL_META[payment.rail].eta },
                  ]}
                />
              ) : (
                <p className="text-[13px] text-muted">Issued after eligibility passes.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon={<NetworkLogo chain={order.chain} size={18} />} title="Token issuance" />
            <CardBody>
              {order.mintTxHash ? (
                <KeyValue
                  items={[
                    { label: "Minted", value: `${fmt.num(order.tokens)} ${token?.symbol ?? "units"} on ${CHAIN_META[order.chain].label}` },
                    { label: "Transaction", value: <span className="inline-flex items-center gap-2"><CopyText value={order.mintTxHash} /><a href={`${CHAIN_META[order.chain].explorer}/tx/${order.mintTxHash}`} target="_blank" rel="noreferrer" className="text-muted hover:text-foreground" aria-label="Open in explorer"><ExternalLink className="size-3.5" /></a></span> },
                  ]}
                />
              ) : (
                <p className="text-[13px] text-muted">{order.amount >= 1_000_000 ? "Four-eyes approval and HSM signing before mint." : "Mints automatically after settlement."}</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<ShieldCheck />} title="Eligibility decision" />
            <CardBody>
              {order.eligibility ? (
                <EligibilityResultView result={order.eligibility} animate={false} />
              ) : order.stage === "submitted" && order.status === "active" ? (
                <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-24" /></div>
              ) : (
                <EmptyState title={order.status === "manual-review" ? "Held for compliance review" : "Decision on file"} description="The event history and audit trail hold the outcome." className="py-8" />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon={<History />} title="Event history" />
            <ol className="px-5 py-4">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < order.history.length - 1 && <span aria-hidden className="absolute left-[5px] top-4 h-[calc(100%-8px)] w-px bg-border" />}
                  <span className="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-brand bg-surface" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[13px] font-medium">{STAGE_META[h.stage].label}</span>
                      <span className="text-[12px] text-muted tabular">{fmt.dateTime(h.at)}</span>
                    </div>
                    <div className="text-[12.5px] text-muted">{h.actor}{h.note ? ` · ${h.note}` : ""}</div>
                    {h.ref?.startsWith("0x") && <CopyText value={h.ref} className="mt-0.5" />}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function ResolveDialog({ order }: { order: D.Order }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const resolve = useResolveOrderException();
  const canDecide = useCan("compliance.decide");
  const review = order.status === "manual-review";
  const run = (action: "retry" | "approve" | "refund") => {
    if (!note.trim()) return setErr("Add a note. It is stored with the decision in the audit trail.");
    resolve.mutate({ id: order.id, action, note }, { onSuccess: () => { setOpen(false); setNote(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" onClick={() => setOpen(true)}><Wrench /> {review ? "Review" : "Resolve exception"}</Button>
      <DialogContent
        title={review ? "Compliance review" : "Resolve exception"}
        description={order.exceptionReason}
        footer={
          <>
            <Button variant="ghost" onClick={() => run("refund")} disabled={resolve.isPending}><Ban /> {review ? "Reject and refund" : "Refund investor"}</Button>
            {review ? (
              <Button variant="primary" onClick={() => run("approve")} isLoading={resolve.isPending} disabled={!canDecide}>Approve and continue <ArrowRight /></Button>
            ) : (
              <Button variant="primary" onClick={() => run("retry")} isLoading={resolve.isPending}>Retry stage <ArrowRight /></Button>
            )}
          </>
        }
      >
        {review && !canDecide && <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">Approving a manual review needs the Compliance officer role. Switch persona from the account menu.</p>}
        <Field label="Decision note" htmlFor="note" error={err} required>
          <Textarea id="note" value={note} onChange={(e) => { setNote(e.target.value); setErr(undefined); }} placeholder={review ? "Accreditation renewal received and verified on 6 Oct 2026." : "Shortfall covered by investor top-up, ref FT2609..."} aria-invalid={!!err} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ order, onDone }: { order: D.Order; onDone: () => void }) {
  const [reason, setReason] = React.useState("");
  const cancel = useCancelOrder();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost"><Ban /> Cancel</Button>
      </DialogTrigger>
      <DialogContent
        size="sm"
        title={`Cancel ${order.id}?`}
        description="Cancelling stops the lifecycle. Any received funds are returned through the original rail."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Keep order</Button></DialogClose>
            <Button variant="danger" disabled={!reason.trim()} isLoading={cancel.isPending} onClick={() => cancel.mutate({ id: order.id, reason }, { onSuccess: onDone })}>Cancel order</Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="reason" required>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Investor withdrew the subscription by email on 6 Oct." />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}

