"use client";

import * as React from "react";
import { Building2, UserRound } from "lucide-react";
import type * as D from "@/types/domain";
import { Badge } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/domain/status";
import { CHAIN_META, COUNTRY_NAME } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

/** Identity status that matters for eligibility: KYB for entities, KYC for individuals. */
export function identityStatus(i: Pick<D.Investor, "type" | "kycStatus" | "kybStatus">): D.KycStatus {
  return i.type === "entity" ? i.kybStatus ?? i.kycStatus : i.kycStatus;
}

export function IdentityStatusBadge({ investor }: { investor: Pick<D.Investor, "type" | "kycStatus" | "kybStatus"> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11.5px] font-medium text-subtle">{investor.type === "entity" ? "KYB" : "KYC"}</span>
      <StatusBadge status={identityStatus(investor)} />
    </span>
  );
}

export function InvestorTypeIcon({ type, className }: { type: D.InvestorType; className?: string }) {
  const Icon = type === "entity" ? Building2 : UserRound;
  return (
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted", className)} aria-label={type === "entity" ? "Entity" : "Individual"}>
      <Icon className="size-3.5" />
    </span>
  );
}

export const DOC_LABEL: Record<D.InvestorDocument["kind"], string> = {
  passport: "Passport",
  "national-id": "National ID card",
  "residence-id": "Residence ID",
  "driving-licence": "Driving licence",
  "proof-of-address": "Proof of address",
  "bank-statement": "Bank statement",
  incorporation: "Certificate of incorporation",
  "trade-licence": "Trade licence",
  memorandum: "Memorandum and articles",
  "register-of-directors": "Register of directors",
  "register-of-members": "Register of members",
  "register-of-beneficial-owners": "Register of beneficial owners",
  "good-standing": "Certificate of good standing",
  "tax-certificate": "Tax registration certificate",
  "accreditation-letter": "Accreditation letter",
  "source-of-funds": "Source of funds",
  "w8-ben": "W-8BEN tax form",
  "board-resolution": "Board resolution",
  "authorised-signatories": "Authorised signatory list",
};

export const ENTITY_TYPE_LABEL: Record<NonNullable<D.Investor["entityType"]>, string> = {
  corporate: "Corporate",
  fund: "Fund",
  "family-office": "Family office",
  trust: "Trust",
  bank: "Bank",
  sovereign: "Sovereign",
  pension: "Pension",
};

export const WALLET_TYPE_LABEL: Record<D.WalletType, string> = {
  custodial: "Custodial",
  mpc: "MPC",
  multisig: "Multisig",
  "self-custody": "Self custody",
};

export const CHAINS = Object.keys(CHAIN_META) as D.Chain[];

/** Sorted country list for selects. */
export const COUNTRY_OPTIONS = Object.entries(COUNTRY_NAME)
  .filter(([code]) => !["KP", "IR", "SY", "CU"].includes(code))
  .sort((a, b) => a[1].localeCompare(b[1]));

export function countryName(code?: string) {
  return code ? COUNTRY_NAME[code] ?? code : "Not provided";
}

/** Address format check per chain family. Returns an error message or undefined. */
export function walletAddressError(chain: D.Chain | undefined, address: string | undefined): string | undefined {
  const a = (address ?? "").trim();
  if (!a) return "Enter the wallet address";
  if (!chain) return "Choose a chain first";
  if (chain === "solana") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? undefined : "Solana addresses are base58, 32 to 44 characters, without 0, O, I or l";
  }
  return /^0x[a-fA-F0-9]{40}$/.test(a) ? undefined : `${CHAIN_META[chain].label} addresses start with 0x followed by 40 hexadecimal characters`;
}

export function custodianRequired(type?: D.WalletType) {
  return type === "custodial" || type === "mpc";
}

export const CUSTODIANS = ["Fireblocks", "Komainu", "Copper", "BitGo", "Anchorage Digital"];

/** Accreditation expiry with a warning when within 60 days or past. */
export function AccreditationExpiry({ iso }: { iso?: string }) {
  if (!iso) return <span className="text-muted">Not applicable</span>;
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{fmt.date(iso)}</span>
      {days < 0 ? <Badge tone="danger">Expired</Badge> : days <= 60 ? <Badge tone="warning">Expires in {days} {days === 1 ? "day" : "days"}</Badge> : null}
    </span>
  );
}

export function riskScoreTone(score: number) {
  return score >= 60 ? "text-danger" : score >= 30 ? "text-warning" : "text-success";
}

export function RiskScore({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        <span className={cn("absolute inset-y-0 left-0 rounded-full", score >= 60 ? "bg-danger" : score >= 30 ? "bg-warning" : "bg-success")} style={{ width: `${Math.max(4, score)}%` }} />
      </span>
      <span className={cn("text-[12.5px] font-medium tabular", riskScoreTone(score))}>{score}</span>
    </span>
  );
}
