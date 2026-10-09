import * as React from "react";
import type * as D from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Generative cover art per asset class. Line drawings on a navy field with a brand-tinted glow.
 * Stands in for photography until issuers upload real imagery (Asset > Documents > Media).
 */
export function AssetArt({ visual, className, seed = 1, label }: { visual: D.Asset["visual"]; className?: string; seed?: number; label?: string }) {
  const id = React.useId().replace(/:/g, "");
  const s = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
  return (
    <div className={cn("relative overflow-hidden bg-navy-2", className)} role="img" aria-label={label ?? `${visual} illustration`}>
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id={`g${id}`} cx="78%" cy="18%" r="80%">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="var(--brand)" stopOpacity="0.06" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.25" />
          </linearGradient>
          <pattern id={`p${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#fff" strokeOpacity="0.05" />
          </pattern>
        </defs>
        <rect width="320" height="160" fill={`url(#p${id})`} />
        <rect width="320" height="160" fill={`url(#g${id})`} />
        <g fill="none" stroke={`url(#f${id})`} strokeWidth="1.2" strokeLinejoin="round">
          {visual === "tower" && (
            <>
              {[0, 1, 2, 3, 4].map((i) => {
                const w = 34 + s(i) * 18, h = 60 + s(i + 9) * 70, x = 40 + i * 50;
                return (
                  <g key={i}>
                    <rect x={x} y={160 - h} width={w} height={h} />
                    {Array.from({ length: Math.floor(h / 12) }).map((_, r) => <line key={r} x1={x + 5} x2={x + w - 5} y1={160 - h + 8 + r * 12} y2={160 - h + 8 + r * 12} strokeOpacity="0.35" />)}
                  </g>
                );
              })}
            </>
          )}
          {visual === "logistics" && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <path d={`M${20 + i * 72} 150 V108 l18 -14 l18 14 l18 -14 l18 14 V150 Z`} />
                  <rect x={38 + i * 72} y={124} width={18} height={26} strokeOpacity="0.5" />
                </g>
              ))}
              <path d="M0 150 H320" strokeOpacity="0.6" />
              <path d="M250 60 h40 v20 h-40 z M262 80 v8 M280 80 v8" strokeOpacity="0.55" />
            </>
          )}
          {visual === "treasury" && (
            <>
              <path d="M70 58 L160 26 L250 58 Z" />
              <path d="M74 64 H246 M80 140 H240 M70 148 H250" />
              {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${92 + i * 27} 70 V134 M${102 + i * 27} 70 V134`} strokeOpacity="0.8" />)}
            </>
          )}
          {visual === "credit" && (
            <>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const h = 22 + i * 13 + s(i) * 12;
                return <rect key={i} x={50 + i * 32} y={150 - h} width={20} height={h} />;
              })}
              <path d={`M40 ${120 - s(3) * 10} C 120 110, 170 70, 290 34`} strokeOpacity="0.6" strokeDasharray="3 4" />
            </>
          )}
          {visual === "gold" && (
            <>
              {[[96, 122], [148, 122], [200, 122], [122, 98], [174, 98], [148, 74]].map(([x, y], i) => (
                <g key={i}>
                  <path d={`M${x} ${y} h44 l-8 -20 h-28 z`} transform={`translate(-22 ${20})`} />
                </g>
              ))}
            </>
          )}
          {visual === "solar" && (
            <>
              <circle cx="250" cy="40" r="18" />
              {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={250 + Math.cos((i * Math.PI) / 4) * 26} y1={40 + Math.sin((i * Math.PI) / 4) * 26} x2={250 + Math.cos((i * Math.PI) / 4) * 34} y2={40 + Math.sin((i * Math.PI) / 4) * 34} strokeOpacity="0.6" />)}
              {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <path key={`${r}${c}`} d={`M${28 + c * 52 + r * 14} ${150 - r * 26} l40 0 l-10 -20 l-40 0 z`} strokeOpacity={0.9 - r * 0.2} />))}
            </>
          )}
          {visual === "sukuk" && (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`translate(${48 + i * 56} 80)`} strokeOpacity={i % 2 ? 0.55 : 0.9}>
                  <rect x="-20" y="-20" width="40" height="40" />
                  <rect x="-20" y="-20" width="40" height="40" transform="rotate(45)" />
                  <circle r="8" />
                </g>
              ))}
            </>
          )}
          {visual === "growth" && (
            <>
              <path d="M24 136 L80 112 L128 120 L176 82 L224 90 L296 36" />
              {[[80, 112], [128, 120], [176, 82], [224, 90], [296, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" />)}
              {[0, 1, 2, 3].map((i) => <line key={i} x1="20" x2="300" y1={52 + i * 28} y2={52 + i * 28} strokeOpacity="0.18" />)}
            </>
          )}
          {visual === "receivables" && (
            <>
              {[0, 1, 2].map((i) => (
                <g key={i} transform={`translate(${96 + i * 18} ${30 + i * 12})`} strokeOpacity={1 - i * 0.25}>
                  <path d="M0 0 h96 v110 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 l-12 -8 l-12 8 z" />
                  <line x1="14" x2="70" y1="22" y2="22" />
                  <line x1="14" x2="82" y1="38" y2="38" strokeOpacity="0.5" />
                  <line x1="14" x2="60" y1="52" y2="52" strokeOpacity="0.5" />
                </g>
              ))}
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
