"use client";

import * as React from "react";
import { Fuel, Users } from "lucide-react";
import type * as D from "@/types/domain";
import { useInvestors } from "@/hooks/api";
import { CompanyLogo, PartyName, PersonAvatar } from "@/components/domain/logos";
import { avatarFor } from "@/lib/assets";
import { cn } from "@/lib/utils";

export type PartyIndex = Map<string, Pick<D.Investor, "id" | "name" | "type" | "avatar" | "logo">>;

/** Investors of the current tenant, indexed by id and by lower-case name. */
export function useParties(): PartyIndex {
  const { data } = useInvestors({ pageSize: 500 });
  return React.useMemo(() => {
    const m: PartyIndex = new Map();
    for (const i of data?.items ?? []) {
      m.set(i.id, i);
      m.set(i.name.toLowerCase(), i);
    }
    return m;
  }, [data]);
}

const ENTITY = /\b(ltd|llc|plc|pjsc|inc|co\.?|bank|fund|trust|capital|partners|office|holdings|scheme|ventures|management|insurance|treasury|network|custody|mpc|hsm|endowment|pension|group|ag|sa|desk|registrar|account|nominee|payments|rails|services)\b/i;

/** True when the name looks like an organisation rather than a person. */
export function isEntityName(name: string) {
  return ENTITY.test(name) && !avatarFor(name);
}

function resolve(name: string, parties?: PartyIndex, id?: string) {
  const hit = (id && parties?.get(id)) || parties?.get(name.toLowerCase());
  if (hit) return { name: hit.name, type: hit.type, avatar: hit.avatar, logo: hit.logo };
  return { name, type: (isEntityName(name) ? "entity" : avatarFor(name) ? "individual" : "entity") as D.InvestorType };
}

/** Counterparty cell: investor photo or logo, company logo, or a pooled-holders glyph. */
export function Party({ name, id, parties, sub, size = 26, className }: { name: string; id?: string; parties?: PartyIndex; sub?: React.ReactNode; size?: number; className?: string }) {
  if (/^\d+ holders?$/i.test(name)) {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
        <span className="grid shrink-0 place-items-center rounded-full bg-info-soft text-info" style={{ width: size, height: size }}><Users className="size-3.5" aria-hidden /></span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{name.replace(/^1 holders$/, "1 holder")}</span>
          {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
        </span>
      </span>
    );
  }
  if (/gas/i.test(name)) {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
        <span className="grid shrink-0 place-items-center rounded-full bg-warning-soft text-warning" style={{ width: size, height: size }}><Fuel className="size-3.5" aria-hidden /></span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
        </span>
      </span>
    );
  }
  const p = resolve(name, parties, id);
  return (
    <span className={cn("inline-flex min-w-0", className)}>
      <PartyName party={p} sub={sub} size={size} />
    </span>
  );
}

/** Just the mark: photo for a person, logo for an organisation. */
export function PartyMark({ name, id, parties, size = 24, className }: { name: string; id?: string; parties?: PartyIndex; size?: number; className?: string }) {
  const p = resolve(name, parties, id);
  return p.type === "entity" ? <CompanyLogo name={p.name} logo={p.logo} size={size} className={className} /> : <PersonAvatar name={p.name} src={p.avatar} size={size} className={className} />;
}

/** Overlapping marks with a +N counter. */
export function PartyStack({ names, parties, max = 5, size = 26 }: { names: { name: string; id?: string }[]; parties?: PartyIndex; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span key={`${n.id ?? n.name}-${i}`} className={cn("rounded-full ring-2 ring-surface", i > 0 && "-ml-2")} style={{ zIndex: shown.length - i }} title={n.name}>
          <PartyMark name={n.name} id={n.id} parties={parties} size={size} className="rounded-full" />
        </span>
      ))}
      {more > 0 && (
        <span className="-ml-2 grid place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-muted ring-2 ring-surface tabular" style={{ width: size, height: size }}>+{more}</span>
      )}
    </span>
  );
}

