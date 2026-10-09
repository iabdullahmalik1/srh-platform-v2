"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Lock, Snowflake, TrendingDown, TrendingUp } from "lucide-react";
import type * as D from "@/types/domain";
import { AssetCover } from "@/components/domain/media";
import { NetworkLogo } from "@/components/domain/logos";
import { Sparkline } from "@/components/domain/charts";
import { Tip } from "@/components/ui/primitives";
import { CHAIN_META, TEMPLATE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

export type PositionCardData = {
  id: string;
  asset: D.Asset;
  symbol: string;
  chain: D.Chain;
  units: number;
  value: number;
  gain: number;
  cost: number;
  ccy: D.Currency;
  lockedUntil?: string;
  frozen?: boolean;
  share: number;
};

/** Photo-backed position tile for the investor portfolio. */
export function PositionCard({ p, href, featured, className }: { p: PositionCardData; href: string; featured?: boolean; className?: string }) {
  const up = p.gain >= 0;
  const pct = p.cost ? (p.gain / p.cost) * 100 : 0;
  const nav = p.asset.valuation.navPerToken;
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-1 transition-[box-shadow,transform,border-color] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        featured && "lg:flex-row",
        className,
      )}
    >
      <div className={cn("relative h-40 shrink-0", featured && "lg:h-auto lg:w-[52%]")}>
        <AssetCover asset={p.asset} overlay className="absolute inset-0 size-full" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-2 py-1 font-mono text-[11.5px] font-medium text-white backdrop-blur-md">
            <NetworkLogo chain={p.chain} size={14} />
            {p.symbol}
          </span>
          {p.frozen ? (
            <Tip content="Frozen by the transfer agent"><span tabIndex={0} className="grid size-7 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"><Snowflake className="size-3.5" /></span></Tip>
          ) : p.lockedUntil ? (
            <Tip content={`Lock-up until ${fmt.date(p.lockedUntil)}`}><span tabIndex={0} className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11.5px] font-medium text-white backdrop-blur-md"><Lock className="size-3" />{fmt.dateShort(p.lockedUntil)}</span></Tip>
          ) : null}
        </div>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <div className="text-[11.5px] text-white/75">{TEMPLATE_META[p.asset.template].label}</div>
          <div className="truncate text-[15px] font-semibold leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{p.asset.name}</div>
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col gap-3 p-4", featured && "lg:justify-between lg:p-6")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn("font-semibold tracking-tight tabular", featured ? "text-[22px] lg:text-[28px]" : "text-[19px]")}>{fmt.money(p.value, p.ccy)}</div>
            <div className={cn("mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium tabular", up ? "text-success" : "text-danger")}>
              {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {up ? "+" : ""}{fmt.money(p.gain, p.ccy, { compact: Math.abs(p.gain) >= 1e5 })} · {up ? "+" : ""}{pct.toFixed(2)}%
            </div>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
        {p.asset.navHistory.length > 1 && <Sparkline data={p.asset.navHistory} height={featured ? 64 : 36} color={up ? "var(--success)" : "var(--danger)"} />}
        <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-[11.5px]">
          <div className="min-w-0"><dt className="text-muted">Units</dt><dd className="truncate font-medium tabular text-foreground">{fmt.compact(p.units)}</dd></div>
          <div className="min-w-0"><dt className="text-muted">NAV</dt><dd className="truncate font-medium tabular text-foreground">{fmt.num(nav, nav < 10 ? 4 : 2)}</dd></div>
          <div className="min-w-0"><dt className="text-muted">Weight</dt><dd className="truncate font-medium tabular text-foreground">{p.share.toFixed(1)}%</dd></div>
        </dl>
        <span className="sr-only">Held on {CHAIN_META[p.chain].label}</span>
      </div>
    </Link>
  );
}
