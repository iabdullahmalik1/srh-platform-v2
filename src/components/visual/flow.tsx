"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Ban, ChevronRight, CircleCheck, CirclePause, Equal, Plus, type LucideIcon } from "lucide-react";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Node-and-arrow diagram. Horizontal from the chosen breakpoint, stacked vertically below it,
 * so it never forces horizontal page scroll. Connectors carry a travelling pulse unless the
 * user prefers reduced motion.
 */

export type FlowStatus = "idle" | "pass" | "fail" | "review" | "active";

export interface FlowNodeSpec {
  key: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  /** Logo or photo shown instead of the icon. */
  media?: React.ReactNode;
  status?: FlowStatus;
  tip?: React.ReactNode;
  tone?: "default" | "navy";
  /** Connector drawn before this node. */
  join?: "arrow" | "plus" | "equals";
}

type Bp = "sm" | "md" | "lg" | "xl";
const CLS: Record<Bp, { wrap: string; node: string; nodeInner: string; conn: string; line: string; h: string; v: string; rot: string }> = {
  sm: { wrap: "sm:flex-row sm:items-stretch", node: "sm:flex-1 sm:min-w-0", nodeInner: "sm:flex-col sm:items-start sm:gap-2", conn: "sm:h-auto sm:w-7 sm:shrink-0", line: "sm:h-px sm:w-full sm:top-1/2 sm:left-0", h: "hidden sm:block", v: "sm:hidden", rot: "sm:rotate-0" },
  md: { wrap: "md:flex-row md:items-stretch", node: "md:flex-1 md:min-w-0", nodeInner: "md:flex-col md:items-start md:gap-2", conn: "md:h-auto md:w-7 md:shrink-0", line: "md:h-px md:w-full md:top-1/2 md:left-0", h: "hidden md:block", v: "md:hidden", rot: "md:rotate-0" },
  lg: { wrap: "lg:flex-row lg:items-stretch", node: "lg:flex-1 lg:min-w-0", nodeInner: "lg:flex-col lg:items-start lg:gap-2", conn: "lg:h-auto lg:w-7 lg:shrink-0", line: "lg:h-px lg:w-full lg:top-1/2 lg:left-0", h: "hidden lg:block", v: "lg:hidden", rot: "lg:rotate-0" },
  xl: { wrap: "xl:flex-row xl:items-stretch", node: "xl:flex-1 xl:min-w-0", nodeInner: "xl:flex-col xl:items-start xl:gap-2", conn: "xl:h-auto xl:w-7 xl:shrink-0", line: "xl:h-px xl:w-full xl:top-1/2 xl:left-0", h: "hidden xl:block", v: "xl:hidden", rot: "xl:rotate-0" },
};

const NODE_TONE: Record<FlowStatus, string> = {
  idle: "border-border bg-surface-2",
  pass: "border-success/35 bg-success-soft",
  fail: "border-danger/35 bg-danger-soft",
  review: "border-warning/35 bg-warning-soft",
  active: "border-brand/50 bg-brand-soft",
};

const ICON_TONE: Record<FlowStatus, string> = {
  idle: "bg-surface text-muted shadow-1",
  pass: "bg-surface text-success shadow-1",
  fail: "bg-surface text-danger shadow-1",
  review: "bg-surface text-warning shadow-1",
  active: "bg-brand text-white",
};

export function StatusGlyph({ status, className }: { status: FlowStatus; className?: string }) {
  if (status === "pass") return <CircleCheck className={cn("size-3.5 text-success", className)} aria-label="Passed" />;
  if (status === "fail") return <Ban className={cn("size-3.5 text-danger", className)} aria-label="Failed" />;
  if (status === "review") return <CirclePause className={cn("size-3.5 text-warning", className)} aria-label="Review" />;
  return null;
}

export function FlowDiagram({ nodes, breakpoint = "lg", className, label, pulse = true, compact }: { nodes: FlowNodeSpec[]; breakpoint?: Bp; className?: string; label?: string; pulse?: boolean; compact?: boolean }) {
  const c = CLS[breakpoint];
  const reduce = useReducedMotion();
  return (
    <ol aria-label={label} className={cn("flex flex-col", c.wrap, className)}>
      {nodes.map((n, i) => (
        <React.Fragment key={n.key}>
          {i > 0 && (
            <li aria-hidden className={cn("relative flex h-6 w-full items-center justify-center", c.conn)}>
              <Connector kind={n.join ?? "arrow"} lit={nodes[i - 1].status === "pass"} failed={nodes[i - 1].status === "fail"} cls={c} pulse={pulse && !reduce} delay={i * 0.18} />
            </li>
          )}
          <motion.li
            className={cn("flex min-w-0", c.node)}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.05, ease: [0.2, 0, 0, 1] }}
          >
            <FlowNode node={n} cls={c} compact={compact} />
          </motion.li>
        </React.Fragment>
      ))}
    </ol>
  );
}

function FlowNode({ node: n, cls, compact }: { node: FlowNodeSpec; cls: (typeof CLS)[Bp]; compact?: boolean }) {
  const status = n.status ?? "idle";
  const navy = n.tone === "navy" && status === "idle";
  const body = (
    <div
      tabIndex={n.tip ? 0 : undefined}
      className={cn(
        "relative flex w-full min-w-0 items-center gap-3 rounded-xl border transition-[background-color,border-color] duration-300",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        cls.nodeInner,
        navy ? "border-navy-4 bg-navy-2 text-white" : NODE_TONE[status],
        n.tip && "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        status !== "idle" && status !== "active" && "pr-7",
      )}
    >
      {n.media ? (
        <span className="shrink-0">{n.media}</span>
      ) : n.icon ? (
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300", navy ? "bg-white/10 text-white" : ICON_TONE[status])}>
          <n.icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 max-w-full flex-1">
        <span className="block truncate text-[12.5px] font-semibold leading-tight">{n.label}</span>
        {n.sub && <span className={cn("mt-0.5 block truncate text-[11.5px] leading-snug", navy ? "text-navy-text" : "text-muted")}>{n.sub}</span>}
      </span>
      {status !== "idle" && status !== "active" && <StatusGlyph status={status} className="absolute right-2 top-2" />}
    </div>
  );
  return n.tip ? <Tip content={n.tip}>{body}</Tip> : body;
}

function Connector({ kind, lit, failed, cls, pulse, delay }: { kind: "arrow" | "plus" | "equals"; lit: boolean; failed: boolean; cls: (typeof CLS)[Bp]; pulse: boolean; delay: number }) {
  const line = lit ? "bg-success/60" : failed ? "bg-danger/50" : "bg-border-strong";
  return (
    <>
      <span className={cn("absolute left-1/2 top-0 h-full w-px", line, cls.line)} />
      {kind === "arrow" && pulse && (
        <>
          <motion.span className={cn("absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand", cls.h)} initial={{ left: "0%", opacity: 0 }} animate={{ left: ["0%", "90%"], opacity: [0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay, ease: "linear" }} />
          <motion.span className={cn("absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand", cls.v)} initial={{ top: "0%", opacity: 0 }} animate={{ top: ["0%", "80%"], opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay, ease: "linear" }} />
        </>
      )}
      <span className={cn("relative grid size-5 place-items-center rounded-full border bg-surface", lit ? "border-success/50 text-success" : "border-border-strong text-subtle")}>
        {kind === "plus" ? <Plus className="size-3" /> : kind === "equals" ? <Equal className="size-3" /> : <ChevronRight className={cn("size-3 rotate-90", cls.rot)} />}
      </span>
    </>
  );
}

/** Small legend row: coloured dot and label. */
export function Legend({ items, className }: { items: { label: React.ReactNode; tone: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted", className)}>
      {items.map((i, k) => (
        <li key={k} className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", i.tone)} aria-hidden />{i.label}</li>
      ))}
    </ul>
  );
}
