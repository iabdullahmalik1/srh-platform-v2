"use client";

import * as React from "react";
import { UserRound } from "lucide-react";
import { avatarFor } from "@/lib/assets";
import { CompanyLogo, CompanyName, PersonAvatar, PersonName } from "@/components/domain/logos";
import { Tip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ENTITY = /\b(ltd|llc|plc|inc|fund|trust|partners|office|bank|capital|ventures|management|endowment|pension|treasury|desk|securities|markets|holdings|group|sovereign|insurance|asset|investments?|spc|scsp|b\.s\.c\.)\b/i;

/** True when a counterparty name reads as a company rather than a person. */
export function isEntity(name: string) {
  return !avatarFor(name) && ENTITY.test(name);
}

/** Photo for people, logo for companies. Masked names show a neutral mark. */
export function CounterpartyAvatar({ name, size = 22, masked, className, tip = true }: { name: string; size?: number; masked?: boolean; className?: string; tip?: boolean }) {
  if (masked) {
    return (
      <span className={cn("inline-grid shrink-0 place-items-center rounded-full bg-surface-3 text-subtle", className)} style={{ width: size, height: size }} aria-label="Market participant">
        <UserRound style={{ width: size * 0.6, height: size * 0.6 }} />
      </span>
    );
  }
  const mark = isEntity(name) ? <CompanyLogo name={name} size={size} className={className} /> : <PersonAvatar name={name} size={size} className={className} />;
  if (!tip) return mark;
  return (
    <Tip content={name}>
      <span tabIndex={0} className="inline-flex rounded-full">{mark}</span>
    </Tip>
  );
}

/** Counterparty with name, for table cells. */
export function Counterparty({ name, sub, size = 26, masked }: { name: string; sub?: React.ReactNode; size?: number; masked?: boolean }) {
  if (masked) {
    return (
      <span className="inline-flex min-w-0 max-w-full items-center gap-2.5">
        <CounterpartyAvatar name={name} size={size} masked tip={false} />
        <span className="truncate text-muted">Market participant</span>
      </span>
    );
  }
  return isEntity(name) ? <CompanyName name={name} sub={sub} size={size} className="max-w-full" /> : <PersonName name={name} sub={sub} size={size} className="max-w-full" />;
}
