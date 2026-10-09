"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** YouTube video behind a click-to-play poster. Nothing loads from YouTube until the viewer presses play. */
export function VideoEmbed({ youtubeId, title, source, className }: { youtubeId: string; title: string; source?: string; className?: string }) {
  const [play, setPlay] = React.useState(false);
  return (
    <figure className={cn("min-w-0", className)}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-navy-2 shadow-1">
        {play ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 size-full" aria-label={`Play video: ${title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]" />
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(6_10_20/0.75))]" />
            <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-3 transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-6" fill="currentColor" />
            </span>
            <span className="absolute inset-x-3 bottom-2.5 truncate text-left text-[13px] font-medium text-white">{title}</span>
          </button>
        )}
      </div>
      {source && <figcaption className="mt-1.5 text-[11.5px] text-muted">Video: {source}</figcaption>}
    </figure>
  );
}
