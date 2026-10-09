"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, Check, ChevronDown, Clock3, Globe, Landmark, Package, Pause, ScanSearch, ShieldCheck, ShieldX, Tag, UserCheck, Zap } from "lucide-react";
import type * as D from "@/types/domain";
import { Badge, Tip } from "@/components/ui/primitives";
import { EligibilityResultView } from "@/components/domain/decision-views";
import { DecisionBadge } from "@/components/domain/status";
import { NetworkLogo, PersonAvatar, CompanyLogo, RailLogo } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { CHAIN_META, RAIL_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";
import { EASE } from "./sim";

/* ------------------------------------------------------------------ */
/* Rail picker                                                         */
/* ------------------------------------------------------------------ */

export function RailTiles({ rails, value, onChange, invalid }: { rails: D.PaymentRail[]; value?: D.PaymentRail; onChange: (r: D.PaymentRail) => void; invalid?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Payment rail" aria-invalid={invalid} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rails.map((r) => {
        const m = RAIL_META[r];
        const selected = value === r;
        const fast = m.kind === "digital";
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${m.label}, settles ${m.eta.toLowerCase()}`}
            onClick={() => onChange(r)}
            className={cn(
              "relative flex flex-col items-start gap-2.5 rounded-xl border bg-surface p-3 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-1",
              selected ? "border-brand shadow-1 ring-2 ring-brand/20" : invalid ? "border-danger/50" : "border-border hover:border-border-strong",
            )}
          >
            <RailLogo rail={r} size={30} />
            <span className="text-[13px] font-medium leading-4">{m.label}</span>
            <span className={cn("inline-flex items-center gap-1 text-[11.5px] font-medium", fast ? "text-success" : "text-muted")}>
              {fast ? <Zap className="size-3" /> : <Clock3 className="size-3" />}
              {m.eta}
            </span>
            {selected && (
              <span className="absolute right-2.5 top-2.5 grid size-[18px] place-items-center rounded-full bg-brand text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compliance summary                                                  */
/* ------------------------------------------------------------------ */

const LAYERS: { key: D.RuleLayer; label: string; icon: React.ReactNode }[] = [
  { key: "global", label: "Global", icon: <Globe /> },
  { key: "jurisdiction", label: "Jurisdiction", icon: <Landmark /> },
  { key: "product", label: "Product", icon: <Package /> },
  { key: "offering", label: "Offering", icon: <Tag /> },
  { key: "investor", label: "Investor", icon: <UserCheck /> },
];

export function ComplianceSummary({ result, pending }: { result?: D.EligibilityResult; pending?: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = React.useState(false);
  const passed = result?.checks.filter((c) => c.outcome === "pass").length ?? 0;
  const total = result?.checks.length ?? 0;
  const k = total ? passed / total : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = !result ? "stroke-brand" : result.decision === "ALLOW" ? "stroke-success" : result.decision === "REJECT" ? "stroke-danger" : "stroke-warning";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="relative grid size-[84px] shrink-0 place-items-center">
          <svg viewBox="0 0 80 80" className={cn("absolute inset-0 size-full -rotate-90", pending && !reduce && "animate-spin [animation-duration:2.4s]")} aria-hidden>
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="5" className="stroke-surface-3" />
            <motion.circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={c}
              className={tone}
              initial={false}
              animate={{ strokeDashoffset: pending ? c * 0.75 : c * (1 - k) }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE }}
            />
          </svg>
          {pending ? (
            <ScanSearch className="size-7 text-brand-ink" />
          ) : result?.decision === "REJECT" ? (
            <ShieldX className="size-7 text-danger" />
          ) : result?.decision === "MANUAL_REVIEW" ? (
            <Pause className="size-7 text-warning" />
          ) : (
            <ShieldCheck className="size-7 text-success" />
          )}
        </span>
        <div className="min-w-0">
          {pending || !result ? (
            <>
              <div className="text-[15px] font-semibold">Screening…</div>
              <div className="text-[12.5px] text-muted">Five rule layers</div>
            </>
          ) : (
            <>
              <DecisionBadge decision={result.decision} size="lg" />
              <div className="mt-1.5 text-[13px] tabular">
                <span className="font-semibold">{passed}</span>
                <span className="text-muted"> of {total} rules passed · {result.durationMs} ms</span>
              </div>
              <Tip content={result.policyVersion}>
                <span className="mt-0.5 block max-w-[260px] truncate font-mono text-[11px] text-subtle">{result.policyVersion}</span>
              </Tip>
            </>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {LAYERS.map((l, i) => {
          const checks = result?.checks.filter((c) => c.layer === l.key) ?? [];
          const fail = checks.some((c) => c.outcome === "fail");
          const review = checks.some((c) => c.outcome === "review");
          const ok = checks.length > 0 && !fail && !review;
          const state = pending || !result ? "pending" : !checks.length ? "none" : fail ? "fail" : review ? "review" : "pass";
          return (
            <motion.li
              key={l.key}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE, delay: reduce ? 0 : i * 0.06 }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 [&_svg]:size-3.5",
                state === "pass" ? "border-success/25 bg-success-soft" : state === "fail" ? "border-danger/30 bg-danger-soft" : state === "review" ? "border-warning/30 bg-warning-soft" : "border-border bg-surface-2",
              )}
            >
              <span className={cn(state === "pass" ? "text-success" : state === "fail" ? "text-danger" : state === "review" ? "text-warning" : "text-subtle", state === "pending" && !reduce && "animate-pulse")}>{l.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{l.label}</span>
              <span className="text-[11.5px] text-muted tabular">{state === "pending" ? "…" : checks.length ? `${checks.filter((c) => c.outcome === "pass").length}/${checks.length}` : "n/a"}</span>
              {ok && <span className="sr-only">passed</span>}
            </motion.li>
          );
        })}
      </ul>

      {result && (
        <div>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-foreground">
            <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} /> {open ? "Hide rules" : "Show rules"}
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25, ease: EASE }} className="overflow-hidden">
                <div className="pt-3">
                  <EligibilityResultView result={result} animate={false} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order ticket                                                        */
/* ------------------------------------------------------------------ */

export function OrderTicket({
  asset,
  offering,
  investor,
  wallet,
  symbol,
  amount,
  fee,
  units,
  rail,
  chain,
  footer,
}: {
  asset?: D.Asset;
  offering: D.Offering;
  investor?: D.Investor;
  wallet?: D.Wallet;
  symbol: string;
  amount: number;
  fee: number;
  units: number;
  rail: D.PaymentRail;
  chain: D.Chain;
  footer: React.ReactNode;
}) {
  const payLabel = rail === "usdc" || rail === "usdt" ? `${fmt.num(amount + fee, 2)} ${RAIL_META[rail].label}` : fmt.money(amount + fee, offering.currency, { digits: 2 });
  const model = offering.settlement === "dvp" ? "DvP" : offering.settlement === "atomic" ? "Atomic" : "Async";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2">
      <div className="flex items-center gap-3 border-b border-border p-4">
        {asset ? <AssetThumb asset={asset} className="h-11 w-14" /> : <span className="h-11 w-14 rounded-lg bg-surface-3" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{asset?.name ?? offering.name}</div>
          <div className="truncate text-[12px] text-muted">{offering.name}</div>
        </div>
        <Badge tone="brand">Subscribe</Badge>
      </div>

      <div className="relative px-4 py-4">
        <div className="rounded-xl bg-surface-2 p-3.5">
          <div className="text-[11.5px] text-muted">You pay</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[20px] font-semibold tracking-[-0.01em] tabular">{payLabel}</span>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"><RailLogo rail={rail} size={20} />{RAIL_META[rail].label}</span>
          </div>
        </div>
        <div className="relative z-10 -my-2.5 flex justify-center">
          <span className="grid size-8 place-items-center rounded-full border-4 border-surface bg-surface-3 text-muted"><ArrowDown className="size-3.5" /></span>
        </div>
        <div className="rounded-xl bg-surface-2 p-3.5">
          <div className="text-[11.5px] text-muted">You receive</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[20px] font-semibold tracking-[-0.01em] tabular">
              {fmt.num(units, 2)} <span className="text-[14px] font-medium text-muted">{symbol}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium"><NetworkLogo chain={chain} size={20} />{CHAIN_META[chain].label}</span>
          </div>
          {wallet && <div className="mt-1 truncate font-mono text-[11.5px] text-muted">{fmt.hash(wallet.address, 10, 6)}</div>}
        </div>
      </div>

      <div aria-hidden className="mx-4 border-t border-dashed border-border-strong" />

      <dl className="flex flex-col gap-2 px-4 py-4 text-[13px]">
        <TicketRow k="Investor">
          {investor ? (
            <span className="inline-flex items-center gap-2">
              {investor.type === "entity" ? <CompanyLogo name={investor.name} size={20} /> : <PersonAvatar name={investor.name} size={20} />}
              <span className="max-w-[180px] truncate">{investor.name}</span>
            </span>
          ) : (
            "…"
          )}
        </TicketRow>
        <TicketRow k="Price">{fmt.money(offering.pricePerToken, offering.currency, { digits: offering.pricePerToken < 10 ? 4 : 2 })}</TicketRow>
        <TicketRow k="Subscription">{fmt.money(amount, offering.currency, { digits: 2 })}</TicketRow>
        <TicketRow k="Platform fee">
          <Tip content="25 basis points">
            <span className="tabular">{fmt.money(fee, offering.currency, { digits: 2 })}</span>
          </Tip>
        </TicketRow>
        <TicketRow k="Settlement">
          <span className="inline-flex h-[22px] items-center rounded-full bg-info-soft px-2 text-[11.5px] font-medium text-info">{model}</span>
        </TicketRow>
      </dl>
      <div className="border-t border-border bg-surface-2 p-4">{footer}</div>
    </div>
  );
}

function TicketRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right tabular">{children}</dd>
    </div>
  );
}
