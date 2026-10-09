"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Equal, EqualNot } from "lucide-react";
import type * as D from "@/types/domain";
import { cn, fmt, sum } from "@/lib/utils";

function splitAccount(a: string) {
  const m = a.match(/^(\d{3,5})\s+(.*)$/);
  return m ? { code: m[1], name: m[2] } : { code: "", name: a };
}

function Side({ kind, lines, total, currency }: { kind: "debit" | "credit"; lines: D.LedgerEntry[]; total: number; currency: D.Currency }) {
  const reduce = useReducedMotion();
  const debit = kind === "debit";
  return (
    <div className="min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <span className={cn("grid h-5 min-w-7 place-items-center rounded-md px-1 text-[11px] font-semibold", debit ? "bg-info-soft text-info" : "bg-success-soft text-success")}>{debit ? "Dr" : "Cr"}</span>
          <span className="text-[12.5px] font-medium text-muted">{debit ? "Debit" : "Credit"}</span>
        </span>
        <span className="text-[13px] font-semibold tabular">{fmt.money(total, currency, { digits: 2 })}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {lines.map((l, i) => {
          const a = splitAccount(l.account);
          const v = debit ? l.debit : l.credit;
          return (
            <li key={l.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="flex min-w-0 items-baseline gap-1.5">
                  {a.code && <span className="shrink-0 font-mono text-[11px] text-subtle">{a.code}</span>}
                  <span className="truncate" title={a.name}>{a.name}</span>
                </span>
                {lines.length > 1 && <span className="shrink-0 tabular text-muted">{fmt.money(v, l.currency, { digits: 2 })}</span>}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className={cn("h-full rounded-full", debit ? "bg-info" : "bg-success")}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${total ? (v / total) * 100 : 0}%` }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : 0.05 * i, ease: [0.2, 0, 0, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Debit and credit sides of one journal with the balance check between them. */
export function DebitCredit({ lines }: { lines: D.LedgerEntry[] }) {
  const debits = lines.filter((l) => l.debit > 0);
  const credits = lines.filter((l) => l.credit > 0);
  const dr = sum(lines, (l) => l.debit);
  const cr = sum(lines, (l) => l.credit);
  const ok = Math.abs(dr - cr) < 0.005;
  const currency = lines[0]?.currency ?? "USD";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Side kind="debit" lines={debits} total={dr} currency={currency} />
      <div className="relative flex items-center justify-center py-1 sm:py-0" aria-label={ok ? "Debits equal credits" : "Debits do not equal credits"} role="img">
        <span className="absolute inset-x-4 top-1/2 h-px bg-border sm:inset-x-auto sm:inset-y-3 sm:left-1/2 sm:top-auto sm:h-auto sm:w-px" aria-hidden />
        <span className={cn("relative grid size-7 place-items-center rounded-full border bg-surface", ok ? "border-success/40 text-success" : "border-danger/40 text-danger")}>
          {ok ? <Equal className="size-3.5" /> : <EqualNot className="size-3.5" />}
        </span>
      </div>
      <Side kind="credit" lines={credits} total={cr} currency={currency} />
    </div>
  );
}
