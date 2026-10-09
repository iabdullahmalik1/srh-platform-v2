"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeftRight, Atom, Check, Clock3, ExternalLink, FileSignature, KeyRound, Pause, ScanSearch, Send, ShieldCheck, ShieldX, Wallet, X } from "lucide-react";
import type * as D from "@/types/domain";
import { useAsset, useInvestor, useIssuers, usePayments, useTokenClasses } from "@/hooks/api";
import { CopyText, Tip } from "@/components/ui/primitives";
import { CompanyLogo, NetworkLogo, PersonAvatar, RailLogo, TokenLogo } from "@/components/domain/logos";
import { StatusBadge } from "@/components/domain/status";
import { SrhMark } from "@/components/brand/srh-logo";
import { avatarFor } from "@/lib/assets";
import { CHAIN_META, ORDER_STAGES, RAIL_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";
import { BLOCK_MS, CONFIRMATION_MS, EASE, REQUIRED_CONFIRMATIONS, blockAt, duration, networkFeeUsd, useNow, useTypewriter } from "./sim";

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

type NodeState = "pending" | "active" | "done" | "halted" | "review" | "final";
type LegState = "pending" | "active" | "done" | "halted";

/** Node the order is moving toward at each stage. Nodes: investor, compliance, rail, escrow, issuer, chain, wallet. */
const TARGET: Record<D.OrderStage, number> = { submitted: 1, eligibility: 2, "payment-instructed": 3, "payment-confirmed": 4, allocated: 4, settled: 5, minted: 6, reconciled: 7 };

const RAIL_KIND_LABEL: Record<D.PaymentRail, string> = {
  swift: "SWIFT wire",
  sepa: "SEPA credit transfer",
  ach: "ACH transfer",
  "local-rail": "Local instant payment",
  usdc: "Stablecoin transfer",
  usdt: "Stablecoin transfer",
  "tokenized-deposit": "Tokenised deposit",
  "aed-stablecoin": "AED stablecoin",
  card: "Card payment, 3-D Secure",
};

const EXCEPTION_TEXT: Record<number, string> = {
  1: "Exception at eligibility",
  2: "Payment instruction failed",
  3: "Payment not matched to instruction",
  4: "Settlement exception",
  5: "Minting exception",
  6: "Delivery to wallet failed",
};

const SETTLEMENT: Record<D.Order["settlement"], { label: string; tip: string; icon: React.ReactNode }> = {
  dvp: { label: "DvP", tip: "Delivery versus payment: cash and tokens move together", icon: <ArrowLeftRight /> },
  atomic: { label: "Atomic", tip: "Cash and tokens swap in one on-chain transaction", icon: <Atom /> },
  async: { label: "Async", tip: "Cash leg settles first, tokens follow", icon: <Clock3 /> },
};

function railAmount(rail: D.PaymentRail, amount: number, currency: string) {
  return rail === "usdc" || rail === "usdt" ? `${RAIL_META[rail].label} ${fmt.num(amount)}` : fmt.money(amount, currency);
}

function currencySymbol(currency: string) {
  return fmt.money(0, currency, { digits: 0 }).replace(/[\d.,\s]/g, "") || currency;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function SettlementFlow({ order, payment: paymentProp, className, onSettled }: { order: D.Order; payment?: D.Payment; className?: string; onSettled?: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const { data: asset } = useAsset(order.assetId);
  const { data: investor } = useInvestor(order.investorId);
  const { data: issuers } = useIssuers();
  const { data: tokens } = useTokenClasses();
  const { data: payments } = usePayments();
  const payment = paymentProp ?? payments?.find((p) => p.orderId === order.id);
  const token = tokens?.find((t) => t.assetId === order.assetId);
  const deployment = token?.deployments.find((d) => d.chain === order.chain);
  const issuer = issuers?.find((i) => i.id === asset?.issuerId);
  const issuerName = issuer?.name ?? asset?.legalEntity.name ?? "Issuer";
  const symbol = token?.symbol ?? asset?.shortName.split(" ")[0].toUpperCase() ?? "TOKEN";
  const wallet = investor?.wallets.find((w) => w.chain === order.chain);
  const digital = RAIL_META[order.rail].kind === "digital";
  const approvalRequired = order.amount >= 1_000_000;

  // What the viewer saw on arrival decides whether transitions animate or render settled.
  const [initial] = React.useState(() => ({ minted: !!order.mintTxHash, completed: order.status === "completed" }));
  const [mintSeenAt, setMintSeenAt] = React.useState<number>();
  const [celebrated, setCelebrated] = React.useState(false);
  const liveMint = !initial.minted && !!order.mintTxHash;
  const liveComplete = !initial.completed && order.status === "completed";
  React.useEffect(() => {
    if (!liveMint || mintSeenAt) return;
    const t = setTimeout(() => setMintSeenAt(Date.now()), 0);
    return () => clearTimeout(t);
  }, [liveMint, mintSeenAt]);

  const now = useNow(order.status === "active" || (liveComplete && !celebrated), order.stage === "minted" || liveComplete ? 120 : 1000);
  const mintedEvt = order.history.find((h) => h.stage === "minted");
  // A seeded order that has sat at "settled" for a while is waiting for token operations, not minting.
  const lastAt = Date.parse(order.history[order.history.length - 1]?.at ?? order.createdAt);
  const awaitingMint = order.status === "active" && order.stage === "settled" && now != null && now - lastAt > 10 * 60_000;
  const confStart = mintSeenAt ?? (mintedEvt ? Date.parse(mintedEvt.at) : undefined);
  const conf = !order.mintTxHash
    ? 0
    : initial.completed || (order.status !== "active" && !liveComplete)
      ? REQUIRED_CONFIRMATIONS
      : now == null || confStart == null
        ? 0
        : Math.min(REQUIRED_CONFIRMATIONS, Math.max(0, Math.floor((now - confStart) / CONFIRMATION_MS) + 1));
  const finished = order.status === "completed" && conf >= REQUIRED_CONFIRMATIONS;
  const celebrate = liveComplete && finished;
  React.useEffect(() => {
    if (finished) onSettled?.();
  }, [finished, onSettled]);
  React.useEffect(() => {
    if (!celebrate || celebrated) return;
    const t = setTimeout(() => setCelebrated(true), 2400);
    return () => clearTimeout(t);
  }, [celebrate, celebrated]);

  /* ----- stage to node mapping ----- */
  const halted = order.status === "rejected" || order.status === "cancelled" || order.status === "exception" || order.status === "manual-review";
  const target = order.status === "completed" ? (finished ? 7 : 6) : order.status === "rejected" || order.status === "manual-review" ? 1 : TARGET[order.stage];
  const haltTone: NodeState = order.status === "manual-review" ? "review" : "halted";
  const nodeState = (i: number): NodeState => {
    if (i === 0) return "done";
    if (i === 6 && finished) return "final";
    if (i < target) return "done";
    if (i === target) return halted ? haltTone : "active";
    return "pending";
  };
  const legState = (i: number): LegState => (i < target ? "done" : i === target ? (halted ? "halted" : "active") : "pending");
  const at = (s: D.OrderStage) => [...order.history].reverse().find((h) => h.stage === s && !h.note?.startsWith("Rejected") && !h.note?.startsWith("Routed"));
  const time = (s: D.OrderStage) => {
    const e = at(s);
    return e ? fmt.time(e.at) : undefined;
  };

  const passed = order.eligibility?.checks.filter((c) => c.outcome === "pass").length;
  const total = order.eligibility?.checks.length;
  const railLabel = railAmount(order.rail, order.amount, order.currency);
  const bank = payment?.bank ?? (digital ? "Circle (USDC)" : "Emirates NBD");

  /* ----- travellers ----- */
  const money = digital ? (
    order.rail === "usdc" || order.rail === "usdt" ? <TokenLogo symbol={RAIL_META[order.rail].label} size={22} className="shadow-2 ring-2 ring-surface" /> : <RailLogo rail={order.rail} size={22} className="shadow-2 ring-2 ring-surface" />
  ) : (
    <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-success px-1 text-[10.5px] font-semibold text-white shadow-2 ring-2 ring-surface">{currencySymbol(order.currency)}</span>
  );
  const iconChip = (icon: React.ReactNode, tone: string) => <span className={cn("grid size-[22px] place-items-center rounded-full text-white shadow-2 ring-2 ring-surface [&_svg]:size-3", tone)}>{icon}</span>;
  const tokenChip = <span className="inline-flex h-[22px] items-center rounded-full bg-brand px-2 text-[10.5px] font-semibold tracking-wide text-white shadow-2 ring-2 ring-surface">{symbol}</span>;
  const travellers: React.ReactNode[] = [
    null,
    iconChip(<FileSignature />, "bg-navy-3"),
    iconChip(<Send />, "bg-info"),
    money,
    money,
    iconChip(<KeyRound />, "bg-navy-3"),
    tokenChip,
  ];

  /* ----- nodes ----- */
  const individual = investor ? investor.type !== "entity" : !!avatarFor(order.investorName);
  const nodes: { key: string; tile: React.ReactNode; label: string; sub: React.ReactNode; meta?: React.ReactNode }[] = [
    {
      key: "investor",
      tile: individual ? <PersonAvatar name={order.investorName} size={40} /> : <CompanyLogo name={order.investorName} size={38} />,
      label: order.investorName,
      sub: "Investor",
      meta: time("submitted") ?? "Signed",
    },
    {
      key: "compliance",
      tile: order.status === "rejected" ? <ShieldX className="size-7 text-danger" /> : target > 1 ? <ShieldCheck className="size-7 text-success" /> : <ScanSearch className="size-7 text-brand-ink" />,
      label: "Compliance",
      sub: passed != null && total ? `${passed}/${total} rules` : order.status === "rejected" ? "Rejected" : order.status === "manual-review" ? "In review" : target > 1 ? "Passed" : "Policy engine",
      meta: order.status === "rejected" ? "Rejected" : order.status === "manual-review" ? "Review" : target > 1 ? time("eligibility") : "Screening",
    },
    {
      key: "rail",
      tile: <RailLogo rail={order.rail} size={36} />,
      label: railLabel,
      sub: RAIL_KIND_LABEL[order.rail],
      meta: target > 2 ? time("payment-instructed") : target === 2 && !halted ? "Instructing" : undefined,
    },
    {
      key: "escrow",
      tile: <SrhMark size={34} />,
      label: "Client money",
      sub: "SRH escrow account",
      meta: target > 3 ? time("payment-confirmed") : target === 3 && !halted ? (digital ? "Awaiting transfer" : "Awaiting credit") : undefined,
    },
    {
      key: "issuer",
      tile: <CompanyLogo name={issuerName} logo={issuer?.logo} size={38} />,
      label: issuerName,
      sub: "Issuer SPV",
      meta: target > 4 ? time("settled") : target === 4 && !halted ? (order.stage === "allocated" ? "Settling" : "Allocating") : undefined,
    },
    {
      key: "chain",
      tile: <NetworkLogo chain={order.chain} size={36} />,
      label: CHAIN_META[order.chain].label,
      sub: token ? `${symbol} · ${token.standard}` : symbol,
      meta: target > 5 ? time("minted") : target === 5 && !halted ? (approvalRequired ? "Approval" : awaitingMint ? "Ready" : "Minting") : undefined,
    },
    {
      key: "wallet",
      tile: (
        <span className="relative">
          <Wallet className="size-7 text-foreground/80" />
          <NetworkLogo chain={order.chain} size={16} className="absolute -bottom-1.5 -right-2 ring-2 ring-surface" />
        </span>
      ),
      label: "Investor wallet",
      sub: wallet ? fmt.hash(wallet.address, 6, 4) : "Whitelisted wallet",
      meta: finished ? `+${fmt.num(order.tokens)} ${symbol}` : target === 6 && !halted ? `${conf}/${REQUIRED_CONFIRMATIONS}` : undefined,
    },
  ];

  /* ----- status line ----- */
  const statusText = (() => {
    if (order.status === "rejected") return "Rejected at eligibility";
    if (order.status === "manual-review") return "Held for compliance review";
    if (order.status === "cancelled") return "Order cancelled";
    if (order.status === "exception") return EXCEPTION_TEXT[target] ?? "Exception on this order";
    if (finished) return "Tokens delivered and reconciled";
    switch (order.stage) {
      case "submitted":
        return "Running eligibility checks";
      case "eligibility":
        return `Issuing ${RAIL_META[order.rail].label} payment instruction`;
      case "payment-instructed":
        return digital ? `Waiting for ${RAIL_META[order.rail].label} transfer on ${CHAIN_META[order.chain].label}` : `Waiting for ${RAIL_META[order.rail].label} credit at ${bank.replace(/ PJSC| B\.S\.C\.| AG| Ltd/g, "")}`;
      case "payment-confirmed":
        return "Allocating units against the offering book";
      case "allocated":
        return order.settlement === "dvp" ? "Settling cash leg by delivery versus payment" : order.settlement === "atomic" ? `Settling atomic swap on ${CHAIN_META[order.chain].label}` : "Releasing cash leg to the issuer";
      case "settled":
        return approvalRequired ? "Waiting for four-eyes mint approval" : awaitingMint ? `Settled. Ready to mint ${symbol} on ${CHAIN_META[order.chain].label}` : `Minting ${symbol} on ${CHAIN_META[order.chain].label}`;
      default:
        return conf < REQUIRED_CONFIRMATIONS ? `Confirming on ${CHAIN_META[order.chain].label}, ${conf} of ${REQUIRED_CONFIRMATIONS}` : "Reconciling chain, register and ledger";
    }
  })();
  const endEvt = order.history[order.history.length - 1];
  const elapsed = now != null && order.status === "active" ? duration(now - Date.parse(order.createdAt)) : finished && endEvt ? duration(Date.parse(endEvt.at) - Date.parse(order.createdAt)) : undefined;
  const tone = finished ? "success" : order.status === "manual-review" ? "warning" : halted ? (order.status === "cancelled" ? "neutral" : "danger") : "live";

  return (
    <div className={cn("@container", className)}>
      {/* Wide: horizontal flow */}
      <ol className="relative hidden grid-cols-7 @[680px]:grid" aria-label="Settlement flow">
        {nodes.map((n, i) => {
          const st = nodeState(i);
          return (
            <li key={n.key} className="relative flex min-w-0 flex-col items-center px-1.5 text-center">
              {i > 0 && <Leg orientation="h" state={legState(i)} traveller={travellers[i]} reduce={reduce} danger={order.status !== "manual-review"} />}
              <Tile state={st} reduce={reduce} celebrate={i === 6 && celebrate} landing={i === 6 && celebrate ? tokenChip : undefined}>{n.tile}</Tile>
              <span className={cn("mt-2.5 block w-full truncate text-[12.5px] font-medium leading-4", st === "pending" ? "text-subtle" : "text-foreground")} title={n.label}>{n.label}</span>
              <span className="mt-0.5 block w-full truncate text-[11.5px] leading-4 text-muted" title={typeof n.sub === "string" ? n.sub : undefined}>{n.sub}</span>
              <Meta state={st} value={n.meta} />
            </li>
          );
        })}
      </ol>

      {/* Narrow: vertical flow */}
      <ol className="flex flex-col @[680px]:hidden" aria-label="Settlement flow">
        {nodes.map((n, i) => {
          const st = nodeState(i);
          return (
            <li key={n.key} className="relative flex items-center gap-3 pb-5 last:pb-0">
              {i < nodes.length - 1 && <Leg orientation="v" state={legState(i + 1)} traveller={travellers[i + 1]} reduce={reduce} danger={order.status !== "manual-review"} />}
              <Tile state={st} reduce={reduce} small celebrate={i === 6 && celebrate} landing={i === 6 && celebrate ? tokenChip : undefined}>{n.tile}</Tile>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[13px] font-medium", st === "pending" ? "text-subtle" : "text-foreground")}>{n.label}</div>
                <div className="truncate text-[12px] text-muted">{n.sub}</div>
              </div>
              <Meta state={st} value={n.meta} inline />
            </li>
          );
        })}
      </ol>

      {/* Status line */}
      <span role="status" aria-live="polite" className="sr-only">{statusText.replace(/, \d+ of \d+$/, "")}</span>
      <div
        aria-hidden
        className={cn(
          "mt-5 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5",
          tone === "success" ? "border-success/30 bg-success-soft" : tone === "warning" ? "border-warning/30 bg-warning-soft" : tone === "danger" ? "border-danger/30 bg-danger-soft" : "border-border bg-surface-2",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium">
          <StatusIcon tone={tone} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={statusText.replace(/\d+/g, "")} className="line-clamp-2 @[680px]:truncate" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: EASE }}>
              {statusText}
            </motion.span>
          </AnimatePresence>
        </span>
        {elapsed && (
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted tabular">
            <Clock3 className="size-3.5" />
            {elapsed}
          </span>
        )}
      </div>

      {/* Detail tiles */}
      <div className="mt-3 grid grid-cols-1 gap-3 @[560px]:grid-cols-2 @[900px]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.4fr)]">
        <PaymentTile order={order} payment={payment} />
        <SettlementTile order={order} symbol={symbol} target={target} halted={halted} />
        <ChainTile
          order={order}
          symbol={symbol}
          deployment={deployment}
          conf={conf}
          now={now}
          liveMint={liveMint && !reduce}
          minting={order.stage === "settled" && order.status === "active"}
          ready={awaitingMint}
          approvalRequired={approvalRequired}
          className="@[560px]:col-span-2 @[900px]:col-span-1"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function StatusIcon({ tone }: { tone: "success" | "warning" | "danger" | "neutral" | "live" }) {
  if (tone === "success") return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white"><Check className="size-3" strokeWidth={3} /></span>;
  if (tone === "warning") return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-warning text-white"><Pause className="size-3" strokeWidth={3} /></span>;
  if (tone === "danger") return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger text-white"><X className="size-3" strokeWidth={3} /></span>;
  if (tone === "neutral") return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-muted"><X className="size-3" strokeWidth={3} /></span>;
  return (
    <span className="relative grid size-5 shrink-0 place-items-center" aria-hidden>
      <span className="absolute inset-1 animate-ping rounded-full bg-brand opacity-40" />
      <span className="relative size-2 rounded-full bg-brand" />
    </span>
  );
}

function Tile({ state, children, reduce, small, celebrate, landing }: { state: NodeState; children: React.ReactNode; reduce: boolean; small?: boolean; celebrate?: boolean; landing?: React.ReactNode }) {
  return (
    <span className={cn("relative z-10 shrink-0", small ? "size-11" : "size-14")}>
      <motion.span
        className={cn(
          "grid size-full place-items-center overflow-hidden rounded-2xl border bg-surface transition-[border-color,box-shadow,background-color] duration-300",
          state === "pending" && "border-dashed border-border-strong bg-surface-2 [&>*]:opacity-45 [&>*]:grayscale",
          state === "active" && "border-brand shadow-2 animate-pulse-ring",
          state === "done" && "border-border shadow-1",
          state === "final" && "border-success shadow-2 ring-4 ring-success/15",
          state === "halted" && "border-danger ring-4 ring-danger/15",
          state === "review" && "border-warning ring-4 ring-warning/15",
          small && "rounded-xl [&_img]:max-h-8 [&_img]:max-w-8 [&_svg]:max-h-8 [&_svg]:max-w-8",
        )}
        animate={celebrate && !reduce ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
      >
        {children}
      </motion.span>
      <AnimatePresence>
        {(state === "done" || state === "final") && (
          <motion.span
            key="done"
            className={cn("absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full text-white ring-2 ring-surface", "bg-success")}
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 26 }}
          >
            <Check className="size-2.5" strokeWidth={3.5} />
          </motion.span>
        )}
        {(state === "halted" || state === "review") && (
          <span key="halt" className={cn("absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full text-white ring-2 ring-surface", state === "review" ? "bg-warning" : "bg-danger")}>
            {state === "review" ? <Pause className="size-2.5" strokeWidth={3.5} /> : <X className="size-2.5" strokeWidth={3.5} />}
          </span>
        )}
      </AnimatePresence>
      {celebrate && !reduce && (
        <>
          {[0, 0.18].map((d) => (
            <motion.span
              key={d}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-success"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.35 + d }}
            />
          ))}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"
            initial={{ y: -34, opacity: 0, scale: 0.9 }}
            animate={{ y: [-34, 6, 6], opacity: [0, 1, 0], scale: [0.9, 1, 0.6] }}
            transition={{ duration: 0.9, ease: EASE, times: [0, 0.45, 1] }}
          >
            {landing}
          </motion.span>
        </>
      )}
    </span>
  );
}

function Meta({ state, value, inline }: { state: NodeState; value?: React.ReactNode; inline?: boolean }) {
  const cls = cn(
    "text-[11.5px] leading-4 tabular",
    inline ? "shrink-0 text-right" : "mt-1.5 block",
    state === "active" ? "font-medium text-brand-ink" : state === "final" ? "font-medium text-success" : state === "halted" ? "font-medium text-danger" : state === "review" ? "font-medium text-warning" : "text-muted",
  );
  return <span className={cls}>{value ?? (inline ? null : " ")}</span>;
}

function Leg({ orientation, state, traveller, reduce, danger }: { orientation: "h" | "v"; state: LegState; traveller: React.ReactNode; reduce: boolean; danger: boolean }) {
  const h = orientation === "h";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute", h ? "right-1/2 top-7 h-0 w-full" : "bottom-1 left-[22px] top-[50px] w-0")}>
      <span className={cn("absolute", h ? "inset-x-[34px] top-0 h-[2px] -translate-y-1/2" : "inset-y-0 left-0 w-[2px] -translate-x-1/2")}>
        {/* base track */}
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            state === "halted" ? (danger ? "bg-danger/40" : "bg-warning/50") : h ? "bg-[repeating-linear-gradient(90deg,var(--border-strong)_0_5px,transparent_5px_10px)]" : "bg-[repeating-linear-gradient(180deg,var(--border-strong)_0_5px,transparent_5px_10px)]",
          )}
        />
        {/* fill */}
        <motion.span
          className={cn("absolute inset-0 rounded-full bg-success", h ? "origin-left" : "origin-top")}
          initial={false}
          animate={h ? { scaleX: state === "done" ? 1 : 0 } : { scaleY: state === "done" ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
        />
        {state === "active" && (
          <>
            <span className={cn("absolute inset-0 rounded-full opacity-70", h ? "bg-[linear-gradient(90deg,transparent,var(--brand))]" : "bg-[linear-gradient(180deg,transparent,var(--brand))]")} />
            {reduce ? (
              <span className={cn("absolute", h ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2")}>{traveller}</span>
            ) : (
              <motion.span
                className="absolute inset-0 will-change-transform"
                initial={h ? { x: "0%" } : { y: "0%" }}
                animate={h ? { x: ["0%", "100%"], opacity: [0, 1, 1, 0] } : { y: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.7, ease: [0.45, 0, 0.25, 1], repeat: Infinity, repeatDelay: 0.25, times: [0, 0.12, 0.85, 1] }}
              >
                <span className={cn("absolute", h ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" : "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2")}>{traveller}</span>
              </motion.span>
            )}
          </>
        )}
      </span>
    </span>
  );
}

function TileBox({ title, icon, aside, children, className }: { title: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-surface p-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12.5px] font-medium">
          {icon}
          {title}
        </span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Line({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-[12.5px]">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="min-w-0 truncate pl-2 text-right">{children}</span>
    </div>
  );
}

function PaymentTile({ order, payment }: { order: D.Order; payment?: D.Payment }) {
  return (
    <TileBox title="Payment" icon={<RailLogo rail={order.rail} size={18} />} aside={payment ? <StatusBadge status={payment.status} /> : <span className="text-[12px] text-subtle">Not instructed</span>}>
      <Line k="Reference">{payment ? <CopyText value={payment.reference} display={payment.reference} /> : <span className="text-subtle">Issued after eligibility</span>}</Line>
      <Line k={payment?.confirmedAt ? "Received" : "Expected"}>
        <span className="tabular">{payment?.confirmedAt ? fmt.time(payment.confirmedAt) : RAIL_META[order.rail].eta}</span>
      </Line>
      {payment?.txHash && <Line k="Transfer"><CopyText value={payment.txHash} /></Line>}
    </TileBox>
  );
}

function SettlementTile({ order, symbol, target, halted }: { order: D.Order; symbol: string; target: number; halted: boolean }) {
  const s = SETTLEMENT[order.settlement];
  const cash = target > 4 ? "Released to issuer" : target > 3 ? "Held in escrow" : "Pending";
  return (
    <TileBox
      title="Settlement"
      icon={<span className="grid size-[18px] place-items-center rounded-md bg-navy-3 text-white [&_svg]:size-3">{s.icon}</span>}
      aside={
        <Tip content={s.tip}>
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-info-soft px-2 text-[11.5px] font-medium text-info [&_svg]:size-3">
            {s.icon}
            {s.label}
          </span>
        </Tip>
      }
    >
      <Line k="Units">
        <span className="tabular">{fmt.num(order.tokens)} {symbol}</span>
      </Line>
      <Line k="Cash leg">
        <span className={cn(target > 4 && !halted ? "text-success" : "text-foreground")}>{cash}</span>
      </Line>
    </TileBox>
  );
}

function ChainTile({ order, symbol, deployment, conf, now, liveMint, minting, ready, approvalRequired, className }: { order: D.Order; symbol: string; deployment?: D.ChainDeployment; conf: number; now: number | null; liveMint: boolean; minting: boolean; ready?: boolean; approvalRequired: boolean; className?: string }) {
  const m = CHAIN_META[order.chain];
  const hash = order.mintTxHash;
  const typed = useTypewriter(hash, liveMint, 900);
  const mintedEvt = order.history.find((h) => h.stage === "minted");
  const included = mintedEvt ? blockAt(order.chain, deployment?.lastBlock, Date.parse(mintedEvt.at)) : undefined;
  const latest = now != null ? blockAt(order.chain, deployment?.lastBlock, now) : undefined;
  const fee = networkFeeUsd(order.chain, hash ?? order.id);
  const k = conf / 12;
  const unit = order.chain === "solana" ? "Slot" : "Block";
  return (
    <TileBox
      className={className}
      title="On-chain"
      icon={<NetworkLogo chain={order.chain} size={18} />}
      aside={
        hash && typed.length === hash.length ? (
          <a href={`${m.explorer}/tx/${hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-ink hover:underline">
            Explorer <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-[12px] text-subtle">{m.label}</span>
        )
      }
    >
      <div className="flex items-center gap-3.5">
        <ConfirmRing k={k} conf={conf} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Line k="Tx hash">
            {hash ? (
              typed.length < hash.length ? (
                <span className="font-mono text-[12px] text-foreground">
                  {typed.length <= 14 ? typed : `${typed.slice(0, 8)}…${typed.slice(-5)}`}
                  <span className="ml-px inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-brand" />
                </span>
              ) : (
                <CopyText value={hash} lead={8} tail={6} />
              )
            ) : minting ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-brand-ink">
                <KeyRound className="size-3" />
                {approvalRequired ? "Awaiting approval" : ready ? "Ready to sign" : "Signing with HSM"}
              </span>
            ) : (
              <span className="text-subtle">Pending</span>
            )}
          </Line>
          <Line k={included ? unit : `Latest ${unit.toLowerCase()}`}>
            <span className="font-mono text-[12px] tabular">{included ? `#${fmt.num(included)}` : latest ? <BlockTicker value={latest} /> : "…"}</span>
          </Line>
          <Line k="Network fee">
            <span className="tabular">{hash ? fmt.money(fee, "USD", { digits: fee < 0.01 ? 4 : 2 }) : <span className="text-subtle">Est. {fmt.money(fee, "USD", { digits: fee < 0.01 ? 4 : 2 })}</span>}</span>
          </Line>
        </div>
      </div>
      <span className="sr-only">{`${conf} of 12 confirmations for ${symbol} on ${m.label}. Average ${unit.toLowerCase()} time ${BLOCK_MS[order.chain] / 1000} seconds.`}</span>
    </TileBox>
  );
}

function BlockTicker({ value }: { value: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-4 items-center overflow-hidden leading-4">
      <span>#</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span className="block" key={value} initial={reduce ? false : { y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: "-100%", opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
          {fmt.num(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ConfirmRing({ k, conf }: { k: number; conf: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const done = conf >= 12;
  return (
    <span className="relative grid size-[58px] shrink-0 place-items-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="4" className="stroke-surface-3" />
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} className={cn("transition-[stroke-dashoffset] duration-200 ease-linear", done ? "stroke-success" : "stroke-brand")} />
      </svg>
      <span className="text-center leading-none">
        <span className={cn("block text-[14px] font-semibold tabular", done ? "text-success" : "text-foreground")}>{conf}</span>
        <span className="block text-[10px] text-muted tabular">of 12</span>
      </span>
    </span>
  );
}

/** Index of the stage for external progress labels ("Stage 5 of 8"). */
export function stageNumber(order: Pick<D.Order, "stage" | "status">) {
  return order.status === "completed" ? ORDER_STAGES.length : ORDER_STAGES.indexOf(order.stage) + 1;
}
