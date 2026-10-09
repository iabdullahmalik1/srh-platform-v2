"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type FlowStep = { icon: LucideIcon; label: string; tip?: string };

/** A short horizontal process diagram: icon nodes joined by chevrons. Wraps to a 2x2 grid on phones. */
export function FlowStrip({ steps, className, tone = "surface" }: { steps: FlowStep[]; className?: string; tone?: "surface" | "navy" }) {
  const navy = tone === "navy";
  return (
    <ol className={cn("grid grid-cols-2 gap-x-3 gap-y-4 sm:flex sm:items-center sm:gap-2", className)}>
      {steps.map((s, i) => {
        const node = (
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", navy ? "bg-white/10 text-white" : "bg-brand-soft text-brand-ink")}>
              <s.icon className="size-4" />
            </span>
            <span className={cn("min-w-0 text-[12.5px] font-medium leading-tight", navy ? "text-white" : "text-foreground")}>{s.label}</span>
          </span>
        );
        return (
          <li key={s.label} className="flex min-w-0 items-center gap-2 sm:flex-1">
            {s.tip ? <Tip content={s.tip}><span tabIndex={0} className="min-w-0 rounded-lg">{node}</span></Tip> : node}
            {i < steps.length - 1 && <ChevronRight aria-hidden className={cn("ml-auto hidden size-4 shrink-0 sm:block", navy ? "text-white/40" : "text-subtle")} />}
          </li>
        );
      })}
    </ol>
  );
}
