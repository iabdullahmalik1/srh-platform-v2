import * as React from "react";
import type * as D from "@/types/domain";
import { ChainGlyph } from "@/components/domain/status";
import { CHAIN_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Compact row of chain marks for the deployments of a product or token class. */
export function ChainGlyphs({ chains, className }: { chains: D.Chain[]; className?: string }) {
  if (!chains.length) return <span className="text-[12px] text-subtle">None</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={chains.map((c) => CHAIN_META[c].label).join(", ")}>
      {chains.map((c) => (
        <span key={c} title={CHAIN_META[c].label} className="grid size-6 place-items-center rounded-full bg-surface-2 ring-1 ring-border">
          <ChainGlyph chain={c} size={13} />
        </span>
      ))}
    </span>
  );
}
