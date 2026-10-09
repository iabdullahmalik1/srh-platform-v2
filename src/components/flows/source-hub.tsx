"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { FlowLine, type LineTone } from "./flow";

export type HubState = "authoritative" | "agrees" | "break" | "idle";

export interface HubSource {
  key: string;
  label: string;
  icon: React.ElementType;
  value?: React.ReactNode;
  /** Text on the connector, for example the difference to the authoritative value. */
  edge?: React.ReactNode;
  state: HubState;
  tip?: React.ReactNode;
}

const TILE: Record<HubState, string> = {
  authoritative: "border-info/50 bg-info-soft ring-2 ring-info/15",
  agrees: "border-success/30 bg-surface",
  break: "border-danger/35 bg-danger-soft/50",
  idle: "border-border bg-surface",
};
const ICON: Record<HubState, string> = {
  authoritative: "bg-info text-white",
  agrees: "bg-success-soft text-success",
  break: "bg-danger-soft text-danger",
  idle: "bg-surface-3 text-muted",
};
const EDGE: Record<HubState, LineTone> = { authoritative: "info", agrees: "success", break: "danger", idle: "muted" };

/**
 * Five (or more) record sources feeding one engine. Sources sit in a row above the engine from
 * `md` up and stack beside a slim engine rail on small screens.
 */
export function SourceHub({ sources, center, className }: { sources: HubSource[]; center: { icon: React.ElementType; title: React.ReactNode; sub?: React.ReactNode; aside?: React.ReactNode }; className?: string }) {
  const Center = center.icon;
  return (
    <div className={cn("flex md:flex-col", className)}>
      <ol className="flex min-w-0 flex-1 flex-col gap-2 md:grid md:gap-3" style={{ gridTemplateColumns: `repeat(${sources.length}, minmax(0, 1fr))` }}>
        {sources.map((s, i) => {
          const tile = (
            <div
              tabIndex={s.tip ? 0 : undefined}
              className={cn("relative flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border p-2.5 transition-colors duration-300 md:flex-col md:items-start md:gap-2 md:p-3", TILE[s.state], s.tip && "cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-300", ICON[s.state])}><s.icon className="size-4" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[12px] font-medium text-muted">
                  <span className="truncate">{s.label}</span>
                  {s.state === "authoritative" && <BadgeCheck className="size-3.5 shrink-0 text-info" aria-label="Authoritative source" />}
                </span>
                {s.value !== undefined && <span className="block truncate text-[13.5px] font-semibold tabular">{s.value}</span>}
              </span>
            </div>
          );
          return (
            <li key={s.key} className="flex min-w-0 items-stretch md:flex-col">
              {s.tip ? <Tip content={s.tip}>{tile}</Tip> : tile}
              <FlowLine dir="y" tone={EDGE[s.state]} label={s.edge} delay={i * 0.2} className="hidden h-14 self-center md:flex" />
              <FlowLine dir="x" tone={EDGE[s.state]} label={s.edge} delay={i * 0.2} className="w-[88px] self-center md:hidden" />
            </li>
          );
        })}
      </ol>
      <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-navy-4 bg-navy-2 py-3 text-white md:w-full md:flex-row md:justify-start md:gap-3 md:px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10"><Center className="size-4" aria-hidden /></span>
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-[13px] font-semibold">{center.title}</span>
          {center.sub && <span className="block truncate text-[12px] text-navy-text">{center.sub}</span>}
        </span>
        {center.aside && <span className="hidden shrink-0 md:block">{center.aside}</span>}
      </div>
    </div>
  );
}
