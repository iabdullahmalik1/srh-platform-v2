"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, Info } from "lucide-react";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Connectors                                                          */
/* ------------------------------------------------------------------ */

export type LineTone = "muted" | "brand" | "success" | "danger" | "info";

const LINE: Record<LineTone, string> = {
  muted: "bg-border-strong",
  brand: "bg-brand/45",
  success: "bg-success/55",
  danger: "bg-danger/55",
  info: "bg-info/50",
};
const DOT: Record<LineTone, string> = {
  muted: "bg-subtle",
  brand: "bg-brand ring-2 ring-brand/20",
  success: "bg-success ring-2 ring-success/20",
  danger: "bg-danger ring-2 ring-danger/20",
  info: "bg-info ring-2 ring-info/20",
};
const CHIP: Record<LineTone, string> = {
  muted: "border-border bg-surface text-muted",
  brand: "border-brand/30 bg-brand-soft text-brand-ink",
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
};

/**
 * Straight connector with a travelling dot. `dir="x"` is horizontal, `dir="y"` vertical.
 * Stretch it with flex (`flex-1`) or give it a size through className.
 */
export function FlowLine({
  dir = "x",
  tone = "brand",
  label,
  pulse = true,
  delay = 0,
  duration = 1.8,
  arrow,
  className,
}: {
  dir?: "x" | "y";
  tone?: LineTone;
  label?: React.ReactNode;
  pulse?: boolean;
  delay?: number;
  duration?: number;
  arrow?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = dir === "x";
  return (
    <span aria-hidden={label ? undefined : true} className={cn("relative flex shrink-0 items-center justify-center", x ? "h-6 min-w-6" : "min-h-6 w-6 flex-col", className)}>
      <span className={cn("absolute rounded-full", LINE[tone], x ? "left-0 right-0 top-1/2 h-px" : "bottom-0 left-1/2 top-0 w-px")} />
      {pulse && !reduce && (
        <motion.span
          className={cn("absolute size-1.5 rounded-full", DOT[tone], x ? "top-1/2 -translate-y-1/2" : "left-1/2 -translate-x-1/2")}
          initial={x ? { left: "0%", opacity: 0 } : { top: "0%", opacity: 0 }}
          animate={x ? { left: ["0%", "96%"], opacity: [0, 1, 1, 0] } : { top: ["0%", "92%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration, repeat: Infinity, ease: "linear", delay, times: [0, 0.15, 0.85, 1] }}
        />
      )}
      {arrow && (
        <ChevronRight className={cn("absolute size-3 text-subtle", x ? "-right-1 top-1/2 -translate-y-1/2" : "-bottom-1 left-1/2 -translate-x-1/2 rotate-90")} />
      )}
      {label !== undefined && (
        <span className={cn("relative z-[1] whitespace-nowrap rounded-full border px-1.5 py-px text-[11px] font-medium leading-4 tabular", CHIP[tone])}>{label}</span>
      )}
    </span>
  );
}

/** Horizontal from `bp` up, vertical below it. */
export function FlowJoin({ bp = "lg", tone, label, delay, className }: { bp?: "sm" | "md" | "lg" | "xl"; tone?: LineTone; label?: React.ReactNode; delay?: number; className?: string }) {
  const show = { sm: ["hidden sm:flex", "sm:hidden"], md: ["hidden md:flex", "md:hidden"], lg: ["hidden lg:flex", "lg:hidden"], xl: ["hidden xl:flex", "xl:hidden"] }[bp];
  return (
    <>
      <FlowLine dir="x" tone={tone} label={label} delay={delay} arrow className={cn(show[0], "w-10 self-center", className)} />
      <FlowLine dir="y" tone={tone} label={label} delay={delay} className={cn(show[1], "h-7 self-center")} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

export type NodeTone = "default" | "primary" | "muted" | "success" | "danger" | "navy";

const NODE: Record<NodeTone, string> = {
  default: "border-border bg-surface",
  primary: "border-brand/45 bg-brand-soft",
  muted: "border-border bg-surface-2",
  success: "border-success/35 bg-success-soft",
  danger: "border-danger/35 bg-danger-soft",
  navy: "border-navy-4 bg-navy-2 text-white",
};
const TILE: Record<NodeTone, string> = {
  default: "bg-surface-3 text-muted",
  primary: "bg-brand text-white",
  muted: "bg-surface text-muted shadow-1",
  success: "bg-surface text-success shadow-1",
  danger: "bg-surface text-danger shadow-1",
  navy: "bg-white/10 text-white",
};

export function IconTile({ icon: Icon, tone = "default", size = 36, className }: { icon: React.ElementType; tone?: NodeTone; size?: number; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-lg", TILE[tone], className)} style={{ width: size, height: size }}>
      <Icon className={size >= 40 ? "size-5" : "size-4"} aria-hidden />
    </span>
  );
}

/** A box in a diagram: icon or logo, title and one short line. Extra detail goes in `tip`. */
export function FlowNode({
  icon,
  media,
  title,
  sub,
  tone = "default",
  tip,
  aside,
  className,
  stacked,
}: {
  icon?: React.ElementType;
  media?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: NodeTone;
  tip?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  /** Icon above the text instead of beside it. */
  stacked?: boolean;
}) {
  const body = (
    <div
      tabIndex={tip ? 0 : undefined}
      className={cn(
        "relative flex min-w-0 rounded-xl border p-3 transition-[border-color,background-color,box-shadow] duration-200",
        stacked ? "flex-col items-start gap-2" : "items-center gap-3",
        NODE[tone],
        tip && "cursor-help hover:shadow-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {media ?? (icon ? <IconTile icon={icon} tone={tone} /> : null)}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">{title}</span>
        {sub && <span className={cn("mt-0.5 block truncate text-[12px] leading-snug", tone === "navy" ? "text-navy-text" : "text-muted")}>{sub}</span>}
      </span>
      {aside}
    </div>
  );
  return tip ? <Tip content={tip}>{body}</Tip> : body;
}

/** Icon and short label, for facts under a diagram. */
export function Fact({ icon: Icon, children, tone = "muted", className }: { icon: React.ElementType; children: React.ReactNode; tone?: "muted" | "success" | "brand" | "info" | "warning" | "danger"; className?: string }) {
  const t = { muted: "text-muted", success: "text-success", brand: "text-brand-ink", info: "text-info", warning: "text-warning", danger: "text-danger" }[tone];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-[12.5px]", className)}>
      <Icon className={cn("size-4 shrink-0", t)} aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Small info icon that reveals detail on hover or focus. */
export function InfoTip({ content, label = "More detail", className }: { content: React.ReactNode; label?: string; className?: string }) {
  return (
    <Tip content={content}>
      <button type="button" aria-label={label} className={cn("inline-grid size-5 shrink-0 place-items-center rounded-full text-subtle hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
        <Info className="size-3.5" />
      </button>
    </Tip>
  );
}

/** Fade and rise for a list of items, reduced-motion safe. */
export function Rise({ children, i = 0, className }: { children: React.ReactNode; i?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.05, ease: [0.2, 0, 0, 1] }}>
      {children}
    </motion.div>
  );
}
