"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Clock, Coins, Percent, ShieldCheck, ShoppingCart, Tag } from "lucide-react";
import type * as D from "@/types/domain";
import { AssetCover } from "@/components/domain/media";
import { CompanyLogo, RailLogo } from "@/components/domain/logos";
import { StatusBadge } from "@/components/domain/status";
import { Progress, Skeleton, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CLASSIFICATION_LABEL, RAIL_META, TEMPLATE_META } from "@/lib/constants";
import { daysUntil } from "@/components/assets/meta";
import { RiskMeter } from "@/components/assets/asset-panels";
import { fmt } from "@/lib/utils";

/** Investor marketplace card: photo, issuer, three headline numbers, raise progress and the action. */
export function OfferingCard({ offering: o, asset: a, issuer, token }: { offering: D.Offering; asset?: D.Asset; issuer?: D.Issuer; token?: string }) {
  const upcoming = o.status === "upcoming";
  const pct = o.target ? Math.min(100, (o.subscribed / o.target) * 100) : 0;
  const days = daysUntil(upcoming ? o.opensAt : o.closesAt);
  const when = upcoming ? `Opens in ${days} ${days === 1 ? "day" : "days"}` : o.type === "continuous" ? "Dealing daily" : `Closes in ${days} ${days === 1 ? "day" : "days"}`;
  const sponsor = issuer?.sponsor ?? o.distributor;
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-1 transition-[box-shadow,transform] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-2">
      <div className="relative h-44">
        {a ? <AssetCover asset={a} overlay className="absolute inset-0 size-full" /> : <Skeleton className="absolute inset-0 rounded-none" />}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-surface/95 shadow-1"><StatusBadge status={o.status} /></span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11.5px] font-medium text-white backdrop-blur-md">
            {upcoming ? <CalendarClock className="size-3.5" /> : <Clock className="size-3.5" />}{when}
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-3 flex items-center gap-2 text-white">
          <CompanyLogo name={sponsor} size={22} />
          <span className="truncate text-[12px] font-medium text-white/90">{sponsor}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-[15.5px] font-semibold leading-snug">{a?.name ?? o.name}</h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
          <span>{a ? `${TEMPLATE_META[a.template].label} · ${a.jurisdiction}` : fmt.sentence(o.type)}</span>
          {token && <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground">{token}</span>}
          {a?.riskProfile && <RiskMeter risk={a.riskProfile} />}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Percent, l: "Target yield", v: a?.income.targetYieldPct ? fmt.pct(a.income.targetYieldPct, 2) : "In NAV" },
            { icon: Tag, l: "Price", v: fmt.money(o.pricePerToken, o.currency, { digits: o.pricePerToken < 10 ? 4 : 2 }) },
            { icon: Coins, l: "Minimum", v: fmt.money(o.minTicket, o.currency, { compact: true }) },
          ].map((x) => (
            <div key={x.l} className="min-w-0 rounded-xl bg-surface-2 px-2.5 py-2">
              <dt className="flex items-center gap-1 text-[11px] text-muted"><x.icon className="size-3 shrink-0" /><span className="truncate">{x.l}</span></dt>
              <dd className="mt-0.5 truncate text-[14px] font-semibold tabular">{x.v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Progress value={pct} tone={pct >= 100 ? "success" : "brand"} />
          <div className="mt-1.5 flex justify-between text-[11.5px] text-muted tabular">
            <span><span className="font-medium text-foreground">{fmt.money(o.subscribed, o.currency, { compact: true })}</span> raised</span>
            <span>{Math.round(pct)}% of {fmt.money(o.target, o.currency, { compact: true })}</span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center -space-x-1" aria-label="Payment rails">
            {o.rails.slice(0, 5).map((r) => (
              <Tip key={r} content={`${RAIL_META[r].label} · ${RAIL_META[r].eta}`}>
                <span tabIndex={0} className="grid size-6 place-items-center rounded-full bg-surface ring-2 ring-surface"><RailLogo rail={r} size={20} /></span>
              </Tip>
            ))}
          </span>
          <Tip content={`Open to ${o.eligibleClassifications.map((c) => CLASSIFICATION_LABEL[c].toLowerCase()).join(", ")} investors`}>
            <span tabIndex={0} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[11.5px] text-muted"><ShieldCheck className="size-3.5" />{o.eligibleClassifications.length} investor types</span>
          </Tip>
        </div>
        <div className="mt-auto pt-5">
          <div className="flex gap-2">
            {a && <Button asChild variant="secondary" className="shrink-0"><Link href={`/assets/${a.id}`}>Details</Link></Button>}
            {upcoming ? (
              <Button className="flex-1" variant="secondary" disabled><CalendarClock /> Opens {fmt.date(o.opensAt)}</Button>
            ) : (
              <Button asChild className="flex-1" variant="primary"><Link href={`/orders/new?offering=${o.id}`}><ShoppingCart /> Subscribe</Link></Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
