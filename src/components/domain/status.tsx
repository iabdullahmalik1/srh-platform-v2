import * as React from "react";
import type * as D from "@/types/domain";
import { Badge, type Tone } from "@/components/ui/primitives";
import { CHAIN_META, CLASSIFICATION_LABEL, RAIL_META, STAGE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";
import { NetworkLogo, RailLogo } from "./logos";

const STATUS_TONE: Record<string, Tone> = {
  // generic
  active: "success", live: "success", approved: "success", executed: "success", completed: "success", confirmed: "success", reconciled: "success",
  paid: "success", verified: "success", cleared: "success", resolved: "success", operational: "success", settled: "success", filled: "success", clean: "success",
  signed: "success", final: "success", enabled: "success", open: "info",
  pending: "warning", "in-review": "warning", "manual-review": "warning", "pending-approval": "warning", investigating: "warning", escalated: "warning",
  instructed: "info", calculated: "info", scheduled: "neutral", upcoming: "neutral", draft: "neutral", structuring: "neutral", deploying: "info", allocating: "info",
  paying: "info", "partially-filled": "info", matched: "info", settling: "info", "compliance-check": "warning", "breaks-found": "warning", degraded: "warning",
  rejected: "danger", failed: "danger", expired: "danger", cancelled: "neutral", exception: "danger", blocked: "danger", outage: "danger", frozen: "info",
  paused: "warning", suspended: "danger", returned: "danger", "not-started": "neutral", closed: "neutral", matured: "neutral", disabled: "neutral", retired: "neutral",
};

const LABEL: Record<string, string> = { "in-review": "In review", "manual-review": "Manual review", "pending-approval": "Pending approval", "partially-filled": "Partially filled", "compliance-check": "Compliance check", "breaks-found": "Breaks found", "not-started": "Not started" };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot className={className}>
      {LABEL[status] ?? fmt.sentence(status)}
    </Badge>
  );
}

export function DecisionBadge({ decision, size = "md" }: { decision: D.Decision | D.CapabilityResult["decision"]; size?: "md" | "lg" }) {
  const tone: Tone = decision === "ALLOW" || decision === "ENABLE" ? "success" : decision === "REJECT" ? "danger" : "warning";
  const label = decision === "MANUAL_REVIEW" ? "Manual review" : decision === "COMPLIANCE_REVIEW" ? "Compliance review" : decision === "ALLOW" ? "Allow" : decision === "ENABLE" ? "Enable" : "Reject";
  return <Badge tone={tone} dot className={size === "lg" ? "h-7 px-3 text-[13px]" : undefined}>{label}</Badge>;
}

export function RiskBadge({ risk }: { risk: D.RiskLevel }) {
  return <Badge tone={risk === "high" ? "danger" : risk === "medium" ? "warning" : "success"}>{fmt.sentence(risk)} risk</Badge>;
}

export function StageBadge({ stage, status }: { stage: D.OrderStage; status: D.OrderStatus }) {
  if (status === "rejected" || status === "cancelled" || status === "exception" || status === "manual-review") return <StatusBadge status={status} />;
  if (status === "completed") return <StatusBadge status="reconciled" />;
  return (
    <Badge tone="info" dot>
      {STAGE_META[stage].label}
    </Badge>
  );
}

export function ChainBadge({ chain, className, compact }: { chain: D.Chain; className?: string; compact?: boolean }) {
  const m = CHAIN_META[chain];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-foreground", className)}>
      <ChainGlyph chain={chain} />
      {compact ? m.short : m.label}
    </span>
  );
}

export function ChainGlyph({ chain, size = 14 }: { chain: D.Chain; size?: number }) {
  return <NetworkLogo chain={chain} size={size} />;
}

export function RailBadge({ rail }: { rail: D.PaymentRail }) {
  const m = RAIL_META[rail];
  return (
    <Badge tone={m.kind === "digital" ? "info" : "outline"} className="gap-1.5 pl-1">
      <RailLogo rail={rail} size={15} />
      {m.label}
    </Badge>
  );
}

export function ClassificationBadge({ c }: { c: D.InvestorClassification }) {
  return <Badge tone={c === "retail" ? "neutral" : c === "institutional" || c === "market-counterparty" ? "info" : "outline"}>{CLASSIFICATION_LABEL[c]}</Badge>;
}

export function Money({ value, currency = "USD", compact, className, digits }: { value: number; currency?: string; compact?: boolean; className?: string; digits?: number }) {
  return <span className={cn("tabular", className)}>{fmt.money(value, currency, { compact, digits })}</span>;
}

export function Flag({ country }: { country: string }) {
  // Regional indicator symbols render as flags on most platforms; falls back to the code.
  const flag = country.length === 2 ? String.fromCodePoint(...[...country.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : country;
  return (
    <span className="inline-flex items-center gap-1.5" title={country}>
      <span aria-hidden className="text-[13px] leading-none">{flag}</span>
      <span className="text-[12.5px] text-muted">{country}</span>
    </span>
  );
}

export function LiveDot({ className, tone = "success" }: { className?: string; tone?: "success" | "brand" | "warning" }) {
  const c = tone === "success" ? "bg-success" : tone === "brand" ? "bg-brand" : "bg-warning";
  return (
    <span className={cn("relative inline-flex size-2", className)} aria-hidden>
      <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", c)} />
      <span className={cn("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}
