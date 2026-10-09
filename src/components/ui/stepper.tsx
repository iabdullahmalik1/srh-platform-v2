import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Wizard progress. Steps are a real sequence, so numbering carries meaning. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin", className)} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex shrink-0 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={cn("grid size-6 place-items-center rounded-full text-[11.5px] font-semibold tabular transition-colors", done ? "bg-brand text-white" : active ? "bg-foreground text-background" : "bg-surface-3 text-muted")}>
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn("text-[13px]", active ? "font-medium text-foreground" : done ? "text-foreground" : "text-muted")}>{s}</span>
            {i < steps.length - 1 && <span aria-hidden className={cn("mx-1 h-px w-6 md:w-10", done ? "bg-brand" : "bg-border-strong")} />}
          </li>
        );
      })}
    </ol>
  );
}
