"use client";

import * as React from "react";
import type * as D from "@/types/domain";
import { AssetCover } from "@/components/domain/media";
import { Tip } from "@/components/ui/primitives";
import { cn, fmt } from "@/lib/utils";

export type IncomeEvent = { id: string; date: string; amount: number; currency: D.Currency; asset: D.Asset; label: string; status: string };

const month = (iso: string) => new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(iso));

/**
 * Upcoming payments on a horizontal rail: today on the left, each payment a node
 * with the product photo, date and estimated amount. Shows up to four events.
 */
export function IncomeTimeline({ events, className }: { events: IncomeEvent[]; className?: string }) {
  const shown = events.slice(0, 4);
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden className="absolute left-2 right-2 top-[21px] h-[2px] rounded-full bg-[linear-gradient(90deg,var(--brand),color-mix(in_oklab,var(--brand)_15%,transparent))]" />
      <ol className="relative grid gap-2" style={{ gridTemplateColumns: `minmax(0,0.55fr) repeat(${shown.length}, minmax(0,1fr))` }}>
        <li className="flex flex-col items-start">
          <span className="relative mt-[15px] grid size-3.5 place-items-center rounded-full bg-brand ring-4 ring-brand-soft" />
          <span className="mt-3 text-[11.5px] font-medium text-muted">Today</span>
        </li>
        {shown.map((e) => (
          <li key={e.id} className="flex min-w-0 flex-col items-center text-center">
            <Tip content={`${e.asset.name} · ${e.label} · ${e.status}`}>
              <span tabIndex={0} className="relative block size-11 overflow-hidden rounded-full ring-[3px] ring-surface shadow-2">
                <AssetCover asset={e.asset} className="absolute inset-0 size-full" />
              </span>
            </Tip>
            <span className="mt-2 text-[11.5px] text-muted">{month(e.date)} {new Date(e.date).getDate()}</span>
            <span className="max-w-full truncate text-[13.5px] font-semibold tabular">{fmt.money(e.amount, e.currency, { compact: e.amount >= 1e4 })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
