import * as React from "react";
import { Landmark, Building2, Package, FileSignature, Megaphone, Layers, Coins, Boxes } from "lucide-react";
import type * as D from "@/types/domain";
import { TEMPLATE_META } from "@/lib/constants";
import { ChainBadge } from "./status";
import { cn, fmt } from "@/lib/utils";

/**
 * Canonical asset and token model from the brief:
 * Underlying Asset -> Legal Entity -> Financial Product -> Instrument -> Offering -> Token Class -> Deployments
 */
export function CanonicalChain({ asset, token, offering, className }: { asset: D.Asset; token?: D.TokenClass; offering?: D.Offering; className?: string }) {
  const nodes = [
    { icon: Landmark, label: "Underlying asset", value: asset.underlying.description, sub: asset.underlying.location ?? fmt.money(asset.underlying.appraisedValue, asset.valuation.currency, { compact: true }) },
    { icon: Building2, label: "Legal entity", value: asset.legalEntity.name, sub: `${asset.legalEntity.structure} · ${asset.legalEntity.jurisdiction}` },
    { icon: Package, label: "Financial product", value: asset.name, sub: TEMPLATE_META[asset.template].label + " template" },
    { icon: FileSignature, label: "Instrument", value: fmt.sentence(asset.instrument.type), sub: asset.instrument.couponPct ? `${asset.instrument.couponPct}% ${asset.instrument.maturity ? "to " + fmt.date(asset.instrument.maturity) : ""}` : asset.income.type },
    { icon: Megaphone, label: "Offering", value: offering?.name ?? "Not yet created", sub: offering ? `${fmt.sentence(offering.status)} · ${fmt.money(offering.pricePerToken, offering.currency, { digits: offering.pricePerToken < 10 ? 4 : 2 })} per token` : "Created at launch" },
    { icon: Layers, label: "Token class", value: token ? `${token.symbol} · ${token.standard}` : "Pending", sub: token ? `${fmt.num(token.canonicalSupply)} canonical supply` : "" },
  ];
  return (
    <div className={cn("flex flex-col", className)}>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {nodes.map((n, i) => (
          <li key={n.label} className="relative flex gap-3 rounded-xl border border-border bg-surface p-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted">
              <n.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                <span className="tabular">{i + 1}</span>
                <span aria-hidden>/</span>
                {n.label}
              </div>
              <div className="truncate text-[13px] font-medium" title={n.value}>{n.value}</div>
              {n.sub && <div className="truncate text-[12px] text-muted">{n.sub}</div>}
            </div>
          </li>
        ))}
      </ol>
      {token && (
        <div className="mt-2 rounded-xl border border-dashed border-border-strong p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted">
            <Boxes className="size-3.5" /> 7 / Blockchain deployments reconcile to one canonical supply
          </div>
          <div className="flex flex-wrap gap-2">
            {token.deployments.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <ChainBadge chain={d.chain} />
                <span className="text-[12px] text-muted tabular">{fmt.num(d.supply)}</span>
                <Coins className="size-3.5 text-subtle" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
