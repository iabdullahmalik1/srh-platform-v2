"use client";

import * as React from "react";
import { Check, X, Pause } from "lucide-react";
import type * as D from "@/types/domain";
import { ORDER_STAGES, STAGE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

/**
 * The lifecycle rail: the platform's signature component.
 * Order, eligibility, payment, allocation, settlement, minting and reconciliation are
 * separate states, so the rail shows each one with its own timestamp and owning system.
 */
export function LifecycleRail({ order, variant = "full", className }: { order: Pick<D.Order, "stage" | "status" | "history">; variant?: "full" | "compact"; className?: string }) {
  const idx = ORDER_STAGES.indexOf(order.stage);
  const halted = order.status === "rejected" || order.status === "cancelled" || order.status === "exception" || order.status === "manual-review";
  const done = order.status === "completed";
  const at = (s: D.OrderStage) => [...order.history].reverse().find((h) => h.stage === s);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-[3px]", className)} aria-label={`Stage ${STAGE_META[order.stage].label}`}>
        {ORDER_STAGES.map((s, i) => {
          const complete = done || i < idx || (i === idx && !halted && order.stage === "reconciled");
          const current = i === idx && !done;
          return (
            <span
              key={s}
              className={cn(
                "h-1.5 w-3.5 rounded-full transition-colors duration-300",
                complete ? "bg-brand" : current ? (halted ? (order.status === "manual-review" ? "bg-warning" : "bg-danger") : "bg-brand/60 animate-pulse") : "bg-surface-3",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal rail */}
      <ol className="hidden grid-cols-8 md:grid" aria-label="Order lifecycle">
        {ORDER_STAGES.map((s, i) => {
          const complete = done || i < idx || (i === idx && order.stage === "reconciled");
          const current = i === idx && !done && order.stage !== "reconciled";
          const ev = at(s);
          return (
            <li key={s} className="relative flex flex-col items-center px-1 text-center">
              {i > 0 && (
                <span aria-hidden className="absolute right-1/2 top-[15px] h-[2px] w-full -translate-y-1/2 overflow-hidden bg-surface-3">
                  <span className={cn("absolute inset-0 origin-left transition-transform duration-700 ease-[var(--ease-standard)]", complete || current ? "scale-x-100 bg-brand" : "scale-x-0 bg-brand")} />
                  {current && !halted && <span className="flow-stripes absolute inset-0 animate-flow opacity-40" />}
                </span>
              )}
              <Node state={complete ? "done" : current ? (halted ? (order.status === "manual-review" ? "review" : "halted") : "current") : "todo"} />
              <span className={cn("mt-2 text-[12px] font-medium leading-4", complete || current ? "text-foreground" : "text-subtle")}>{STAGE_META[s].short}</span>
              <span className="mt-0.5 text-[11px] leading-4 text-muted tabular">{ev ? fmt.time(ev.at) : current && !halted ? "In progress" : " "}</span>
            </li>
          );
        })}
      </ol>
      {/* Mobile: vertical rail */}
      <ol className="flex flex-col md:hidden" aria-label="Order lifecycle">
        {ORDER_STAGES.map((s, i) => {
          const complete = done || i < idx || (i === idx && order.stage === "reconciled");
          const current = i === idx && !done && order.stage !== "reconciled";
          const ev = at(s);
          return (
            <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
              {i < ORDER_STAGES.length - 1 && <span aria-hidden className={cn("absolute left-[15px] top-8 h-[calc(100%-24px)] w-[2px]", complete ? "bg-brand" : "bg-surface-3")} />}
              <Node state={complete ? "done" : current ? (halted ? (order.status === "manual-review" ? "review" : "halted") : "current") : "todo"} />
              <div className="min-w-0 pt-1">
                <div className={cn("text-[13px] font-medium", complete || current ? "text-foreground" : "text-subtle")}>{STAGE_META[s].label}</div>
                <div className="text-[12px] text-muted">{ev ? `${fmt.time(ev.at)} · ${ev.actor}` : STAGE_META[s].system}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Node({ state }: { state: "done" | "current" | "todo" | "halted" | "review" }) {
  return (
    <span
      className={cn(
        "relative z-10 grid size-[30px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-300",
        state === "done" && "border-brand bg-brand text-white",
        state === "current" && "border-brand bg-surface text-brand animate-pulse-ring",
        state === "todo" && "border-border-strong bg-surface text-subtle",
        state === "halted" && "border-danger bg-danger-soft text-danger",
        state === "review" && "border-warning bg-warning-soft text-warning",
      )}
    >
      {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : state === "halted" ? <X className="size-3.5" strokeWidth={3} /> : state === "review" ? <Pause className="size-3" strokeWidth={3} /> : state === "current" ? <span className="size-2 rounded-full bg-brand" /> : <span className="size-1.5 rounded-full bg-border-strong" />}
    </span>
  );
}

const OWNER: Record<D.OrderStage, string> = { submitted: "Intake", eligibility: "Policy engine", "payment-instructed": "Orchestrator", "payment-confirmed": "Bank or chain", allocated: "Book", settled: "DvP engine", minted: "Token manager", reconciled: "" };

/** Aggregate pipeline: how many orders sit in each stage right now. */
export function PipelineRail({ pipeline, onSelect, active }: { pipeline: Record<D.OrderStage, number>; onSelect?: (s: D.OrderStage) => void; active?: D.OrderStage }) {
  const max = Math.max(1, ...Object.values(pipeline));
  return (
    <div className="grid grid-cols-4 gap-y-5 md:grid-cols-8">
      {ORDER_STAGES.map((s, i) => {
        const n = pipeline[s] ?? 0;
        const isActive = active === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSelect?.(s)}
            className={cn("group relative flex flex-col items-center rounded-lg px-1 pb-1 pt-0 text-center transition-colors", onSelect && "hover:bg-surface-2", isActive && "bg-surface-2")}
            aria-pressed={isActive}
          >
            {i > 0 && (
              <span aria-hidden className="absolute right-1/2 top-[22px] hidden h-[2px] w-full overflow-hidden bg-surface-3 md:block">
                <span className="flow-stripes absolute inset-0 animate-flow opacity-30" />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 grid size-11 place-items-center rounded-full border-2 bg-surface text-[15px] font-semibold tabular transition-[border-color,transform] duration-200 group-hover:scale-105",
                n > 0 ? "border-brand text-foreground" : "border-border-strong text-subtle",
                s === "reconciled" && n > 0 && "border-success",
              )}
              style={n > 0 && s !== "reconciled" ? { boxShadow: `0 0 0 ${2 + (n / max) * 6}px color-mix(in oklab, var(--brand) ${10 + (n / max) * 14}%, transparent)` } : undefined}
            >
              {n}
            </span>
            <span className="mt-2 text-[12px] font-medium leading-4">{STAGE_META[s].short}</span>
            <span className="text-[11px] leading-4 text-muted">{s === "reconciled" ? "last 7 days" : OWNER[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
