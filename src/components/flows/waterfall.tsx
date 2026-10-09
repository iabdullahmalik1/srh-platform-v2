"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Landmark, Receipt, Users, Wallet } from "lucide-react";
import { cn, fmt } from "@/lib/utils";

/**
 * Distribution waterfall: gross, less withholding, net, paid to holders.
 * Bars are scaled to the gross amount.
 */
export function DistributionWaterfall({
  gross,
  withholding,
  net,
  currency,
  holders,
  perToken,
  holdersVisual,
  compact,
}: {
  gross: number;
  withholding: number;
  net: number;
  currency: string;
  holders: number;
  perToken?: number;
  holdersVisual?: React.ReactNode;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const pct = (v: number) => (gross > 0 ? Math.max(0, Math.min(100, (v / gross) * 100)) : 0);
  const rows = [
    { key: "gross", icon: Landmark, label: "Gross", value: fmt.money(gross, currency, { digits: compact ? 0 : 2 }), start: 0, width: 100, bar: "bg-navy-3 dark:bg-gray-8", tone: "text-foreground" },
    { key: "wht", icon: Receipt, label: "Withholding tax", value: withholding ? `-${fmt.money(withholding, currency, { digits: compact ? 0 : 2 })}` : "None", start: pct(net), width: pct(withholding), bar: "bg-danger", tone: withholding ? "text-danger" : "text-muted" },
    { key: "net", icon: Wallet, label: "Net to holders", value: fmt.money(net, currency, { digits: compact ? 0 : 2 }), start: 0, width: pct(net), bar: "bg-success", tone: "text-success" },
  ];
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col gap-3" aria-label="Distribution waterfall">
        {rows.map((r, i) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex min-w-0 items-center gap-2 text-[12.5px] text-muted">
              <r.icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{r.label}</span>
            </span>
            <span className={cn("text-right font-semibold tabular", compact ? "text-[13px]" : "text-[14px]", r.tone)}>{r.value}</span>
            <div className="relative col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className={cn("absolute inset-y-0 rounded-full", r.bar)}
                style={{ left: `${r.start}%` }}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${r.width}%` }}
                transition={{ duration: 0.55, delay: reduce ? 0 : 0.12 * i, ease: [0.2, 0, 0, 1] }}
              />
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
        <span className="inline-flex min-w-0 items-center gap-2.5">
          {holdersVisual ?? <span className="grid size-7 place-items-center rounded-full bg-info-soft text-info"><Users className="size-3.5" aria-hidden /></span>}
          <span className="text-[12.5px]"><span className="font-semibold tabular">{fmt.num(holders)}</span> <span className="text-muted">eligible holders</span></span>
        </span>
        {perToken !== undefined && (
          <span className="text-[12.5px] text-muted"><span className="font-semibold tabular text-foreground">{fmt.money(perToken, currency, { digits: compact ? 4 : 6 })}</span> per token</span>
        )}
      </div>
    </div>
  );
}
