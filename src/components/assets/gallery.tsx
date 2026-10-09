/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import type * as D from "@/types/domain";
import { asset as assetPath } from "@/lib/assets";
import { AssetCover } from "@/components/domain/media";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Photo strip from asset.media.gallery. Each photo opens a lightbox with keyboard navigation. */
export function AssetGallery({ asset: a, className }: { asset: D.Asset; className?: string }) {
  const photos = a.media?.gallery ?? [];
  const [open, setOpen] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  if (!photos.length) return null;
  const go = (d: number) => setIdx((i) => (i + d + photos.length) % photos.length);
  const show = (i: number) => { setIdx(i); setOpen(true); };

  return (
    <>
      <ul className={cn("flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin", className)} aria-label="Photos">
        {photos.map((p, i) => (
          <li key={p} className="shrink-0">
            <button type="button" onClick={() => show(i)} className="group relative block h-[72px] w-[112px] overflow-hidden rounded-xl ring-1 ring-border transition-shadow hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-20 sm:w-32" aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              <AssetCover asset={a} index={i} className="absolute inset-0 size-full" />
              <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-[opacity,background-color] duration-200 group-hover:bg-black/30 group-hover:opacity-100"><Expand className="size-4" /></span>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl" title={a.name} description={`Photo ${idx + 1} of ${photos.length}`}>
          <div
            className="relative -mx-5 -my-4 bg-navy-1"
            onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
          >
            <img src={assetPath(photos[idx])} alt={`${a.name}, photo ${idx + 1}`} className="mx-auto block max-h-[70dvh] w-full object-contain" />
            {photos.length > 1 && (
              <>
                <Button variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-2" onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft /></Button>
                <Button variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-2" onClick={() => go(1)} aria-label="Next photo"><ChevronRight /></Button>
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {photos.map((p, i) => (
                    <button key={p} type="button" onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`} aria-current={i === idx} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-200", i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50")} />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
