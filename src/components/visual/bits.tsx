"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Cpu, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { Card, Skeleton, Tip } from "@/components/ui/primitives";
import { CompanyLogo, PersonAvatar } from "@/components/domain/logos";
import { SrhMark } from "@/components/brand/srh-logo";
import { avatarFor } from "@/lib/assets";
import { cn } from "@/lib/utils";

export type VisualTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "navy";

const TILE_TONE: Record<VisualTone, string> = {
  neutral: "bg-surface-3 text-muted",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  navy: "bg-navy-2 text-white",
};

const TILE_SIZE = { sm: "size-7 rounded-lg [&_svg]:size-3.5", md: "size-9 rounded-xl [&_svg]:size-4", lg: "size-11 rounded-xl [&_svg]:size-5" } as const;

/** Square icon tile. */
export function IconTile({ icon: Icon, tone = "neutral", size = "md", className }: { icon: LucideIcon; tone?: VisualTone; size?: keyof typeof TILE_SIZE; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center", TILE_TONE[tone], TILE_SIZE[size], className)}>
      <Icon />
    </span>
  );
}

/** Icon and short value, as a compact pill. Put the label in `title` or a Tip. */
export function IconChip({ icon: Icon, children, tone = "neutral", title, className }: { icon?: LucideIcon; children: React.ReactNode; tone?: VisualTone; title?: string; className?: string }) {
  const toneCls = tone === "neutral" ? "border border-border bg-surface text-foreground" : cn("border border-transparent", TILE_TONE[tone]);
  const chip = (
    <span className={cn("inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium", toneCls, className)} tabIndex={title ? 0 : undefined}>
      {Icon && <Icon className={cn("size-3.5 shrink-0", tone === "neutral" && "text-muted")} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
  return title ? <Tip content={title}>{chip}</Tip> : chip;
}

const RING_TONE: Record<Exclude<VisualTone, "navy" | "neutral">, string> = {
  brand: "stroke-brand",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
  info: "stroke-info",
};

/** Circular progress, 0 to 100. */
export function ProgressRing({ value, size = 44, stroke = 4, tone = "brand", children, label }: { value: number; size?: number; stroke?: number; tone?: keyof typeof RING_TONE; children?: React.ReactNode; label?: string }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={RING_TONE[tone]}
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c - (v / 100) * c : c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.2, 0, 0, 1] }}
        />
      </svg>
      {children !== undefined && <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold tabular">{children}</span>}
    </span>
  );
}

/** Stat tile with a coloured icon, value and one short line. Optional ring for ratios. */
export function MetricTile({ icon, label, value, sub, tone = "neutral", loading, ring, className }: { icon: LucideIcon; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: VisualTone; loading?: boolean; ring?: { value: number; tone?: keyof typeof RING_TONE }; className?: string }) {
  return (
    <Card className={cn("flex items-center gap-3.5 p-4", className)}>
      {ring && !loading ? (
        <ProgressRing value={ring.value} tone={ring.tone ?? "brand"} size={44}>
          {React.createElement(icon, { className: "size-4 text-muted", "aria-hidden": true })}
        </ProgressRing>
      ) : (
        <IconTile icon={icon} tone={tone} size="lg" />
      )}
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium text-muted">{label}</div>
        {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <div className="text-[22px] font-semibold leading-7 tracking-tight tabular">{value}</div>}
        {sub && <div className="truncate text-[12px] text-muted">{sub}</div>}
      </div>
    </Card>
  );
}

/** Photo when the party is a known person, logo otherwise. Pass `type` when it is known. */
export function PartyAvatar({ name, type, src, logo, size = 28, className }: { name: string; type?: D.InvestorType; src?: string; logo?: string; size?: number; className?: string }) {
  const person = type ? type === "individual" : !!(src || avatarFor(name));
  return person ? <PersonAvatar name={name} src={src} size={size} className={className} /> : <CompanyLogo name={name} logo={logo} size={size} className={className} />;
}

/** System actors render as the SRH mark; people as photos; entity investors as logos. */
export function ActorAvatar({ actor, size = 28 }: { actor: { name: string; role: D.Role | "system" }; size?: number }) {
  if (actor.role === "system" || isSystemName(actor.name)) return <SystemAvatar name={actor.name} size={size} />;
  return <PartyAvatar name={actor.name} type={actor.role === "investor" ? undefined : "individual"} size={size} />;
}

const SYSTEM_RE = /(service|engine|orchestrator|webhook|manager|quorum|adapter|indexer|scheduler|relay)/i;
export function isSystemName(name: string) {
  return SYSTEM_RE.test(name);
}

export function SystemAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const hsm = /hsm|quorum/i.test(name);
  return (
    <span title={name} className="inline-grid shrink-0 place-items-center rounded-full bg-navy-2 ring-1 ring-navy-4" style={{ width: size, height: size }}>
      {hsm ? <Cpu className="text-navy-text" style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden /> : <SrhMark size={Math.round(size * 0.62)} />}
    </span>
  );
}

export function TenantLogo({ tenant, size = 32, className }: { tenant: Pick<D.Tenant, "name" | "brand">; size?: number; className?: string }) {
  return <CompanyLogo name={tenant.name} logo={tenant.brand.logo} size={size} className={className} />;
}

/** Overlapping avatars with an overflow count. */
export function AvatarStack({ parties, max = 4, size = 26 }: { parties: { name: string; type?: D.InvestorType; system?: boolean }[]; max?: number; size?: number }) {
  const shown = parties.slice(0, max);
  const rest = parties.length - shown.length;
  return (
    <span className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <span key={`${p.name}-${i}`} className="rounded-full ring-2 ring-surface">
          {p.system ? <SystemAvatar name={p.name} size={size} /> : <PartyAvatar name={p.name} type={p.type} size={size} />}
        </span>
      ))}
      {rest > 0 && (
        <span className="grid place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-muted ring-2 ring-surface tabular" style={{ width: size, height: size }}>+{rest}</span>
      )}
    </span>
  );
}

/** Thin multi-segment bar with a legend; used for shares and distributions. */
export function SegmentBar({ segments, className }: { segments: { key: string; value: number; tone: string; label: string }[]; className?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-surface-3", className)} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <span key={s.key} className={cn("h-full border-r-2 border-surface last:border-r-0", s.tone)} style={{ width: `${(s.value / total) * 100}%` }} />
      ))}
    </div>
  );
}
