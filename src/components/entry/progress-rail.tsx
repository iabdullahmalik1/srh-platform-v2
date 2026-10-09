"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "./parts";

export type RailStep = { label: string; icon: LucideIcon };

/** Vertical progress rail for wide screens. Visited steps are clickable. */
export function ProgressRail({ steps, current, maxVisited, locked, complete, onSelect }: { steps: RailStep[]; current: number; maxVisited: number; locked: boolean; complete: boolean; onSelect: (i: number) => void }) {
  return (
    <nav aria-label="Application progress" className="hidden lg:block">
      <ol className="relative">
        {steps.map((s, i) => {
          const done = i < current || (complete && i === current);
          const active = i === current && !complete;
          const reachable = !locked && i <= maxVisited && i !== current;
          return (
            <li key={s.label} className="relative pb-5 last:pb-0">
              {i < steps.length - 1 && (
                <span aria-hidden className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-0.5 overflow-hidden rounded-full bg-border">
                  <motion.span className="absolute inset-0 origin-top bg-success" initial={false} animate={{ scaleY: i < current ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE }} />
                </span>
              )}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={cn("group flex w-full items-center gap-3 rounded-lg text-left outline-offset-2", reachable && "cursor-pointer")}
              >
                <span
                  className={cn(
                    "relative grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                    done ? "border-success bg-success text-white" : active ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-subtle",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <s.icon className="size-4" aria-hidden />}
                </span>
                <span className={cn("text-[13.5px] transition-colors", active ? "font-semibold text-foreground" : done ? "text-foreground group-hover:text-brand-ink" : "text-muted")}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Compact progress for small screens: step count, label and a segmented bar. */
export function ProgressBarCompact({ steps, current, complete }: { steps: RailStep[]; current: number; complete: boolean }) {
  const s = steps[current];
  return (
    <div className="lg:hidden" aria-label="Application progress">
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <s.icon className="size-4 text-brand-ink" aria-hidden />
          {s.label}
        </span>
        <span className="tabular text-muted">
          Step {current + 1} of {steps.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((st, i) => (
          <span key={st.label} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.span className={cn("block h-full origin-left", i < current || complete ? "bg-success" : "bg-brand")} initial={false} animate={{ scaleX: i <= current ? 1 : 0 }} transition={{ duration: 0.3, ease: EASE }} />
          </span>
        ))}
      </div>
    </div>
  );
}
