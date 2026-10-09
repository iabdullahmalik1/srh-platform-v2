/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import type { Chain, PaymentRail } from "@/types/domain";
import { asset, avatarFor, COMPANY_LOGO, NETWORK_LOGO, RAIL_LOGO, TOKEN_LOGO } from "@/lib/assets";
import { CHAIN_META, RAIL_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Company marks                                                       */
/* ------------------------------------------------------------------ */

const PALETTE = ["#1B2A4A", "#0F6E6A", "#5B3A8E", "#8A5A12", "#7A1F3D", "#245F9E", "#2E6B3F", "#45505F", "#9C4221", "#0B5563", "#6B2E5F", "#33507A"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Style = "pillars" | "peaks" | "waves" | "star" | "shield" | "arch" | "nodes" | "sun" | "facet" | "rings" | "chevrons" | "grid";

function styleFor(name: string): Style {
  const n = name.toLowerCase();
  if (/(custody|sentinel|keystone|ledgerline|halcyon|vault|secure|verid)/.test(n)) return "shield";
  if (/(oracle|chain|link|scope|network|node|stable)/.test(n)) return "nodes";
  if (/(ridge|peak|hill|zenith|summit|granite|mountain|alpine)/.test(n)) return "peaks";
  if (/(water|tide|pearl|coast|harbour|harbor|marina|creek|bay|gulfstream|liquidity)/.test(n)) return "waves";
  if (/(noor|qasr|rose|desert|crescent|oasis|saffron|najd|sukuk|amber)/.test(n)) return "star";
  if (/(bridge|gate|atlas|arch|westmarch)/.test(n)) return "arch";
  if (/(falcon|kestrel|orion|lumen|light|sun|solar|zenith|horizon)/.test(n)) return "sun";
  if (/(bank|treasury|capital|endowment|pension|trust|fund|insurance|registrar)/.test(n)) return "pillars";
  const pool: Style[] = ["facet", "rings", "chevrons", "grid"];
  return pool[hash(n) % pool.length];
}

function Mark({ style, accent }: { style: Style; accent: string }) {
  const w = "#fff";
  switch (style) {
    case "pillars":
      return <g fill={w}><path d="M32 13 15 21v4h34v-4z" /><rect x="18" y="28" width="5" height="16" /><rect x="29.5" y="28" width="5" height="16" /><rect x="41" y="28" width="5" height="16" /><rect x="15" y="47" width="34" height="4" fill={accent} /></g>;
    case "peaks":
      return <g><path d="M10 48 25 22l8 13 6-9 15 22z" fill={w} /><path d="M25 22l4 7-4 3-4-3z" fill={accent} /></g>;
    case "waves":
      return <g fill="none" stroke={w} strokeWidth="4" strokeLinecap="round"><path d="M12 27c5-5 10-5 15 0s10 5 15 0 7-3 10-1" /><path d="M12 38c5-5 10-5 15 0s10 5 15 0 7-3 10-1" stroke={accent} /></g>;
    case "star":
      return <g><rect x="19" y="19" width="26" height="26" fill={w} /><rect x="19" y="19" width="26" height="26" fill={w} transform="rotate(45 32 32)" /><circle cx="32" cy="32" r="6" fill={accent} /></g>;
    case "shield":
      return <g><path d="M32 12 15 18v12c0 11 7 18 17 22 10-4 17-11 17-22V18z" fill={w} /><path d="M25 32l5 5 10-11" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>;
    case "arch":
      return <g><path d="M14 50V32a18 18 0 0 1 36 0v18h-8V32a10 10 0 0 0-20 0v18z" fill={w} /><rect x="10" y="50" width="44" height="3" fill={accent} /></g>;
    case "nodes":
      return <g><path d="M20 22 44 22 32 44z" fill="none" stroke={w} strokeOpacity=".6" strokeWidth="2.5" /><circle cx="20" cy="22" r="6" fill={w} /><circle cx="44" cy="22" r="6" fill={w} /><circle cx="32" cy="44" r="6" fill={accent} /></g>;
    case "sun":
      return <g><path d="M14 44a18 18 0 0 1 36 0z" fill={w} />{[0, 1, 2, 3, 4].map((i) => { const a = Math.PI + (i * Math.PI) / 4; return <line key={i} x1={32 + Math.cos(a) * 23} y1={44 + Math.sin(a) * 23} x2={32 + Math.cos(a) * 29} y2={44 + Math.sin(a) * 29} stroke={accent} strokeWidth="3.5" strokeLinecap="round" />; })}<rect x="12" y="47" width="40" height="3" fill={w} /></g>;
    case "facet":
      return <g><path d="M32 12 50 22 32 32 14 22z" fill={w} /><path d="M14 22v20l18 10V32z" fill={w} fillOpacity=".7" /><path d="M50 22v20L32 52V32z" fill={accent} /></g>;
    case "rings":
      return <g fill="none" strokeWidth="5"><circle cx="26" cy="32" r="11" stroke={w} /><circle cx="38" cy="32" r="11" stroke={accent} /></g>;
    case "chevrons":
      return <g fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 40l14-12 14 12" stroke={w} /><path d="M18 50l14-12 14 12" stroke={accent} /><path d="M18 30l14-12 14 12" stroke={w} strokeOpacity=".6" /></g>;
    default:
      return <g fill={w}><rect x="16" y="16" width="14" height="14" rx="3" /><rect x="34" y="16" width="14" height="14" rx="3" fillOpacity=".7" /><rect x="16" y="34" width="14" height="14" rx="3" fillOpacity=".7" /><rect x="34" y="34" width="14" height="14" rx="3" fill={accent} /></g>;
  }
}

/** Company logo: bespoke artwork when we have it, otherwise a deterministic generated mark. */
export function CompanyLogo({ name, logo, size = 32, className, title }: { name: string; logo?: string; size?: number; className?: string; title?: string }) {
  const known = logo ?? COMPANY_LOGO[name.trim().toLowerCase()] ?? (name.toLowerCase().startsWith("srh ") ? "/brand/srh-mark.png" : undefined);
  const radius = Math.round(size * 0.24);
  if (known) {
    const isSrh = known.includes("srh-mark");
    return (
      <span className={cn("inline-grid shrink-0 place-items-center overflow-hidden", isSrh && "bg-white ring-1 ring-border", className)} style={{ width: size, height: size, borderRadius: radius }} title={title ?? name}>
        <img src={asset(known)} alt="" width={size} height={size} className={cn("size-full object-contain", isSrh && "p-[12%]")} />
      </span>
    );
  }
  const h = hash(name);
  const bg = PALETTE[h % PALETTE.length];
  const accent = ["#F2C14E", "#7FD3CD", "#F28C8C", "#A7C4F2", "#B9E4A8", "#E7B6F2"][(h >> 5) % 6];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? `${name} logo`} className={cn("shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill={bg} />
      <Mark style={styleFor(name)} accent={accent} />
    </svg>
  );
}

/** Company logo with its name, for table cells and lists. */
export function CompanyName({ name, logo, sub, size = 28, className }: { name: string; logo?: string; sub?: React.ReactNode; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <CompanyLogo name={name} logo={logo} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{name}</span>
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Networks, tokens and rails                                          */
/* ------------------------------------------------------------------ */

export function NetworkLogo({ chain, size = 16, className }: { chain: Chain; size?: number; className?: string }) {
  return <img src={asset(NETWORK_LOGO[chain])} alt={CHAIN_META[chain].label} width={size} height={size} className={cn("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />;
}

export function TokenLogo({ symbol, size = 16, className }: { symbol: string; size?: number; className?: string }) {
  const src = TOKEN_LOGO[symbol.toUpperCase()];
  if (!src) return null;
  return <img src={asset(src)} alt={symbol} width={size} height={size} className={cn("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />;
}

export function RailLogo({ rail, size = 16, className }: { rail: PaymentRail; size?: number; className?: string }) {
  const src = RAIL_LOGO[rail];
  if (!src) return null;
  return <img src={asset(src)} alt={RAIL_META[rail].label} width={size} height={size} className={cn("shrink-0 rounded-full", className)} style={{ width: size, height: size }} />;
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function PersonAvatar({ name, src, size = 32, className, ring }: { name: string; src?: string; size?: number; className?: string; ring?: boolean }) {
  const photo = src ? asset(src) : avatarFor(name);
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy-3 font-semibold text-navy-text", ring && "ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      title={name}
    >
      {photo ? <img src={photo} alt="" width={size} height={size} loading="lazy" className="size-full object-cover" /> : initials}
    </span>
  );
}

/** Person with photo and a secondary line. */
export function PersonName({ name, src, sub, size = 30, className }: { name: string; src?: string; sub?: React.ReactNode; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <PersonAvatar name={name} src={src} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{name}</span>
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
    </span>
  );
}

/** Investor or counterparty: photo for people, logo for entities. */
export function PartyName({ party, sub, size = 30 }: { party: { name: string; type?: "individual" | "entity"; avatar?: string; logo?: string }; sub?: React.ReactNode; size?: number }) {
  return party.type === "entity" ? <CompanyName name={party.name} logo={party.logo} sub={sub} size={size} /> : <PersonName name={party.name} src={party.avatar} sub={sub} size={size} />;
}
