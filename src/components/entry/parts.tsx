"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, type LucideIcon } from "lucide-react";
import { SrhLockup } from "@/components/brand/srh-logo";
import { cn } from "@/lib/utils";

export const EASE = [0.2, 0, 0, 1] as const;

const noopSubscribe = () => () => {};
/** True after hydration. Lets persisted client state render without a server mismatch. */
export function useMounted() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Motion presets for step content. Reduced motion falls back to a plain fade. */
export function useStepMotion() {
  const reduce = useReducedMotion();
  return {
    initial: { opacity: 0, x: reduce ? 0 : 14 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -10 },
    transition: { duration: 0.26, ease: EASE },
  };
}

/** SRH lockup that picks the right wordmark for the current theme. */
export function ThemedLockup({ height = 30, animate }: { height?: number; animate?: boolean }) {
  return (
    <>
      <SrhLockup height={height} tone="dark" animate={animate} className="dark:hidden" />
      <SrhLockup height={height} tone="light" animate={animate} className="hidden dark:inline-flex" />
    </>
  );
}

/** Compact horizontal stepper. Completed steps are clickable so people can go back. */
export function EntryStepper({ steps, current, onSelect, className }: { steps: { label: string; icon?: LucideIcon }[]; current: number; onSelect?: (i: number) => void; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className={cn("flex items-center gap-2", i < steps.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
            <button
              type="button"
              disabled={!done || !onSelect}
              onClick={() => onSelect?.(i)}
              className={cn("group flex shrink-0 items-center gap-2 rounded-full py-0.5 pr-1 text-left outline-offset-2", done && onSelect && "cursor-pointer")}
              aria-label={done ? `Back to ${s.label}` : s.label}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11.5px] font-semibold tabular transition-colors duration-200",
                  done ? "bg-brand text-white group-hover:bg-brand-hover" : active ? "bg-foreground text-background" : "bg-surface-3 text-muted",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("whitespace-nowrap text-[13px]", active ? "font-medium text-foreground" : done ? "text-foreground" : "text-muted", !active && "hidden sm:inline")}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span aria-hidden className="relative h-px min-w-4 flex-1 overflow-hidden bg-border-strong">
                <motion.span className="absolute inset-0 origin-left bg-brand" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.35, ease: EASE }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Small icon + label chip used for capabilities and checks. */
export function IconChip({ icon: Icon, children, tone = "neutral", className }: { icon: LucideIcon; children: React.ReactNode; tone?: "neutral" | "success" | "brand" | "info" | "onNavy"; className?: string }) {
  const cls = {
    neutral: "border-border bg-surface-2 text-muted",
    success: "border-transparent bg-success-soft text-success",
    brand: "border-transparent bg-brand-soft text-brand-ink",
    info: "border-transparent bg-info-soft text-info",
    onNavy: "border-white/10 bg-white/[0.06] text-navy-text",
  }[tone];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[11.5px] font-medium", cls, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** Selection indicator used by every choice card. */
export function SelectDot({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-150", selected ? "border-brand bg-brand text-white" : "border-border-strong bg-surface")}>
      {selected && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

/** Group heading with a small icon. */
export function GroupLabel({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center gap-2 text-[12.5px] font-medium text-muted", className)}>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </div>
  );
}

/** Step heading: icon tile, title and at most one short line. */
export function StepHeading({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-foreground">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

/** Tappable choice card. Renders as a radio for assistive tech. */
export function ChoiceCard({ selected, onSelect, className, children, name, value, disabled }: { selected: boolean; onSelect: () => void; className?: string; children: React.ReactNode; name: string; value: string; disabled?: boolean }) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer rounded-xl border bg-surface transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-standard)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        selected ? "border-brand shadow-[0_0_0_1px_var(--brand)] bg-[color-mix(in_oklab,var(--brand)_4%,var(--surface))]" : "border-border hover:border-border-strong hover:shadow-1",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={selected} onChange={onSelect} disabled={disabled} className="sr-only" />
      {children}
    </label>
  );
}
