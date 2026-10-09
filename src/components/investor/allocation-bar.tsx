"use client";

import * as React from "react";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type AllocationItem = { key: string; label: string; value: number; color: string; display?: string };

/** Stacked composition bar with a direct-labelled legend. Built for the navy hero. */
export function AllocationBar({ items, className }: { items: AllocationItem[]; className?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-3 w-full gap-[3px] overflow-hidden rounded-full" role="img" aria-label={items.map((i) => `${i.label} ${((i.value / total) * 100).toFixed(1)}%`).join(", ")}>
        {items.map((i) => (
          <Tip key={i.key} content={`${i.label} · ${((i.value / total) * 100).toFixed(1)}%`}>
            <span className="h-full first:rounded-l-full last:rounded-r-full transition-[flex-grow] duration-700 ease-[var(--ease-standard)]" style={{ flexGrow: i.value, flexBasis: 0, background: i.color, minWidth: 4 }} />
          </Tip>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key} className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-navy-text">{i.label}</span>
            <span className="shrink-0 font-medium tabular text-white">{((i.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
