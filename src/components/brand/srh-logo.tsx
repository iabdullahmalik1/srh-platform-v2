/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { asset } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { SRH_MARK_PATH, SRH_MARK_VIEWBOX } from "./srh-mark-path";

/**
 * SRH tiger mark as live vector. With `animate`, the outline draws in, the fill rises,
 * and a single light sweep passes over the mark. Honours reduced motion.
 */
export function SrhMark({ size = 40, animate = false, className, loop = false }: { size?: number; animate?: boolean; className?: string; loop?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox={SRH_MARK_VIEWBOX} className={cn("shrink-0", animate && "srh-mark-anim", loop && "srh-mark-loop", className)} role="img" aria-label="SRH">
      <defs>
        <linearGradient id={`sweep${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <path d={SRH_MARK_PATH} fillRule="evenodd" />
        </clipPath>
      </defs>
      <path className="srh-mark-fill" d={SRH_MARK_PATH} fill="#E1251B" fillRule="evenodd" />
      <path className="srh-mark-stroke" d={SRH_MARK_PATH} fill="none" stroke="#E1251B" strokeWidth="5" pathLength={1} />
      {animate && (
        <g clipPath={`url(#clip${id})`}>
          <rect className="srh-mark-sweep" x="-400" y="0" width="300" height="1000" fill={`url(#sweep${id})`} transform="skewX(-20)" />
        </g>
      )}
    </svg>
  );
}

/** Mark plus wordmark. `tone` picks the wordmark colour for dark or light surfaces. */
export function SrhLockup({ height = 40, tone = "dark", animate = false, className }: { height?: number; tone?: "dark" | "light"; animate?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", animate && "srh-lockup-anim", className)} style={{ gap: height * 0.28 }}>
      <SrhMark size={height} animate={animate} />
      <img
        src={asset(tone === "light" ? "/brand/srh-wordmark-light.png" : "/brand/srh-wordmark-dark.png")}
        alt="SRH Inc"
        className="srh-wordmark w-auto"
        style={{ height: height * 0.62 }}
      />
    </span>
  );
}

/** Full-screen brand moment used while the console boots. */
export function SrhSplash({ label = "Securing session" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-navy-1">
      <div aria-hidden className="app-aurora absolute inset-0 opacity-70" />
      <div className="relative flex flex-col items-center gap-5">
        <SrhMark size={88} animate />
        <div className="flex items-center gap-2 text-[12.5px] text-navy-muted">
          <span className="relative inline-flex size-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" /><span className="relative size-1.5 rounded-full bg-brand" /></span>
          {label}…
        </div>
      </div>
    </div>
  );
}
