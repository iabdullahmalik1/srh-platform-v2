/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type * as D from "@/types/domain";
import { asset } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { AssetArt } from "./asset-art";
import { CompanyLogo } from "./logos";

/** Photograph of an asset with a graceful fallback to generated art. */
export function AssetCover({ asset: a, index = 0, className, priority, overlay }: { asset: Pick<D.Asset, "name" | "visual" | "media">; index?: number; className?: string; priority?: boolean; overlay?: boolean }) {
  const src = a.media?.gallery[index] ?? a.media?.cover;
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return <AssetArt visual={a.visual} className={className} label={a.name} />;
  return (
    <div className={cn("relative overflow-hidden bg-navy-2", className)}>
      <img
        src={asset(src)}
        alt={a.name}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        onError={() => setFailed(true)}
        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-[1.04]"
      />
      {overlay && <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_12_24/0.05)_30%,rgb(8_12_24/0.78))]" />}
    </div>
  );
}

/** Thumbnail for tables and lists. */
export function AssetThumb({ asset: a, className }: { asset: Pick<D.Asset, "name" | "visual" | "media">; className?: string }) {
  return <AssetCover asset={a} className={cn("h-10 w-14 shrink-0 rounded-lg", className)} />;
}

/**
 * Editorial photo card (tall, full-bleed image, logo top-left, headline bottom-left).
 * Use in rows of three for walkthroughs, featured products and stories on investor-facing pages.
 */
export function FeatureCard({ image, title, href, cta = "Learn more", logo, logoName, eyebrow, className, onClick }: { image: string; title: string; href?: string; cta?: string; logo?: string; logoName?: string; eyebrow?: string; className?: string; onClick?: () => void }) {
  const inner = (
    <>
      <img src={asset(image)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-[1.05]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(6_10_20/0.55)_0%,rgb(6_10_20/0.05)_35%,rgb(6_10_20/0.15)_55%,rgb(6_10_20/0.88)_100%)]" />
      <div className="relative flex h-full flex-col justify-between p-5 text-white">
        <div className="flex items-center gap-2">
          {logoName && <CompanyLogo name={logoName} logo={logo} size={26} />}
          {eyebrow && <span className="text-[12.5px] font-medium text-white/85">{eyebrow}</span>}
        </div>
        <div>
          <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.01em] [text-wrap:balance]">{title}</h3>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/90">
            {cta} <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </>
  );
  const cls = cn("group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-navy-2 shadow-2 ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-3", className);
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cn(cls, "text-left")}>{inner}</button>;
}
