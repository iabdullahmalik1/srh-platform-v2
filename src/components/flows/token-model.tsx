"use client";

import * as React from "react";
import { Boxes, FileSignature, Layers } from "lucide-react";
import type * as D from "@/types/domain";
import { NetworkLogo } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { CHAIN_META, TEMPLATE_META } from "@/lib/constants";
import { fmt } from "@/lib/utils";
import { FlowJoin, FlowNode } from "./flow";

/** Product, share class, canonical token class and chain deployments, filled from live data. */
export function TokenModelFlow({ token, asset, bp = "lg" }: { token: D.TokenClass; asset?: D.Asset; bp?: "md" | "lg" | "xl" }) {
  const share = asset?.shareClasses.find((s) => s.id === token.shareClassId) ?? asset?.shareClasses.find((s) => s.tokenClassId === token.id);
  const classes = asset?.shareClasses.filter((s) => s.tokenClassId === token.id).length ?? 0;
  const chains = token.deployments.map((d) => d.chain);
  const wrap = { md: "md:flex-row md:items-stretch", lg: "lg:flex-row lg:items-stretch", xl: "xl:flex-row xl:items-stretch" }[bp];
  const item = { md: "md:flex-1", lg: "lg:flex-1", xl: "xl:flex-1" }[bp];
  return (
    <ol className={`flex flex-col ${wrap}`} aria-label="How the token relates to the product">
      <li className={`min-w-0 ${item}`}>
        <FlowNode
          media={asset ? <AssetThumb asset={asset} className="h-9 w-12" /> : undefined}
          title={asset?.shortName ?? token.name}
          sub={asset ? TEMPLATE_META[asset.template].label : "Financial product"}
          tip="Financial product: the economic and legal claim, held by an SPV, fund or trust. The token represents the product. It is not the product."
          className="h-full"
        />
      </li>
      <li aria-hidden className="flex justify-center"><FlowJoin bp={bp} /></li>
      <li className={`min-w-0 ${item}`}>
        <FlowNode
          icon={FileSignature}
          title={share?.name ?? "Single class"}
          sub={share ? `${share.currency} · ${share.managementFeeBps} bps${classes > 1 ? ` · ${classes} classes` : ""}` : "Share class"}
          tip="Share class: fees, currency and investor eligibility for a slice of the product."
          className="h-full"
        />
      </li>
      <li aria-hidden className="flex justify-center"><FlowJoin bp={bp} delay={0.3} /></li>
      <li className={`min-w-0 ${item}`}>
        <FlowNode
          icon={Layers}
          tone="primary"
          title={<span className="font-mono">{token.symbol}</span>}
          sub={`${fmt.compact(token.canonicalSupply)} canonical supply`}
          tip="Canonical token class: one supply and one set of controls per share class."
          className="h-full"
        />
      </li>
      <li aria-hidden className="flex justify-center"><FlowJoin bp={bp} delay={0.6} /></li>
      <li className={`min-w-0 ${item}`}>
        <FlowNode
          media={
            chains.length ? (
              <span className="flex shrink-0 items-center">
                {chains.map((c, i) => (
                  <span key={c} className={i > 0 ? "-ml-2 rounded-full ring-2 ring-surface" : "rounded-full ring-2 ring-surface"} title={CHAIN_META[c].label}>
                    <NetworkLogo chain={c} size={28} />
                  </span>
                ))}
              </span>
            ) : undefined
          }
          icon={Boxes}
          title={`${chains.length} deployment${chains.length === 1 ? "" : "s"}`}
          sub={chains.length ? chains.map((c) => CHAIN_META[c].short).join(", ") : "None yet"}
          tip="Chain deployments: contracts on each network, reconciled to the canonical supply."
          className="h-full"
        />
      </li>
    </ol>
  );
}
