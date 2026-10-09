"use client";

import * as React from "react";
import { CircleCheck, CircleX, CirclePause, ShieldCheck, Clock } from "lucide-react";
import type * as D from "@/types/domain";
import { cn, fmt } from "@/lib/utils";
import { DecisionBadge } from "./status";
import { Avatar } from "@/components/ui/primitives";
import { ROLE_META } from "@/lib/constants";

const LAYER_LABEL: Record<D.RuleLayer, string> = { global: "Global core", jurisdiction: "Jurisdiction pack", product: "Product rules", offering: "Offering rules", investor: "Investor rules" };

function OutcomeIcon({ outcome }: { outcome: "pass" | "fail" | "review" }) {
  return outcome === "pass" ? <CircleCheck className="size-4 text-success" aria-label="Pass" /> : outcome === "fail" ? <CircleX className="size-4 text-danger" aria-label="Fail" /> : <CirclePause className="size-4 text-warning" aria-label="Review" />;
}

/** Reveals checks one at a time so the evaluation reads as a sequence, then shows the decision. */
function useStagger(count: number, key: string, ms = 90) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(count);
      return;
    }
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setN(i);
      if (i >= count) clearInterval(t);
    }, ms);
    return () => clearInterval(t);
  }, [count, key, ms]);
  return n;
}

export function EligibilityResultView({ result, animate = true }: { result: D.EligibilityResult; animate?: boolean }) {
  const shown = useStagger(result.checks.length, result.id);
  const n = animate ? shown : result.checks.length;
  const layers = (["global", "jurisdiction", "product", "offering", "investor"] as D.RuleLayer[]).filter((l) => result.checks.some((c) => c.layer === l));
  let counter = 0;
  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-opacity duration-300", n >= result.checks.length ? "opacity-100" : "opacity-40", result.decision === "ALLOW" ? "border-success/30 bg-success-soft" : result.decision === "REJECT" ? "border-danger/30 bg-danger-soft" : "border-warning/30 bg-warning-soft")}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-foreground/70" />
          <div>
            <div className="text-[13px] text-muted">Decision</div>
            <DecisionBadge decision={result.decision} size="lg" />
          </div>
        </div>
        <div className="text-right text-[12px] text-muted">
          <div className="tabular">{result.checks.filter((c) => c.outcome === "pass").length} of {result.checks.length} rules passed · {result.durationMs} ms</div>
          <div className="mt-0.5 max-w-[340px] truncate font-mono text-[11px]" title={result.policyVersion}>{result.policyVersion}</div>
        </div>
      </div>
      {layers.map((layer) => (
        <div key={layer}>
          <div className="mb-1.5 text-[12px] font-medium text-muted">{LAYER_LABEL[layer]}</div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {result.checks.filter((c) => c.layer === layer).map((c) => {
              const i = counter++;
              const visible = i < n;
              return (
                <li key={c.ruleCode} className={cn("flex items-start gap-3 px-3.5 py-2.5 transition-[opacity,transform] duration-200", visible ? "opacity-100" : "translate-x-1 opacity-0")}>
                  <span className="mt-0.5">{visible ? <OutcomeIcon outcome={c.outcome} /> : <Clock className="size-4 text-subtle" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] font-medium">{c.rule}</span>
                      <span className="font-mono text-[11px] text-subtle">{c.ruleCode}</span>
                    </div>
                    <p className="text-[12.5px] text-muted">{c.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CapabilityResultView({ result }: { result: D.CapabilityResult }) {
  const n = useStagger(result.steps.length, result.evaluatedAt, 160);
  return (
    <div className="flex flex-col gap-3">
      <ol className="relative flex flex-col">
        {result.steps.map((s, i) => {
          const visible = i < n;
          return (
            <li key={s.step} className="relative flex gap-3 pb-3 last:pb-0">
              {i < result.steps.length - 1 && <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-18px)] w-px bg-border" />}
              <span className={cn("mt-0.5 transition-opacity", visible ? "opacity-100" : "opacity-30")}>{visible ? <OutcomeIcon outcome={s.outcome} /> : <Clock className="size-4 text-subtle" />}</span>
              <div className={cn("min-w-0 transition-opacity duration-200", visible ? "opacity-100" : "opacity-30")}>
                <div className="text-[13px] font-medium">{s.step}</div>
                <div className="text-[12.5px] text-muted">{s.detail}</div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={cn("flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 transition-opacity duration-300", n >= result.steps.length ? "opacity-100" : "opacity-0")}>
        <span className="text-[13px] text-muted">Outcome</span>
        <DecisionBadge decision={result.decision} size="lg" />
      </div>
    </div>
  );
}

export function ApprovalSteps({ steps, className }: { steps: D.ApprovalStep[]; className?: string }) {
  const nextIdx = steps.findIndex((s) => !s.decision);
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((s, i) => {
        const state = s.decision === "approved" ? "done" : s.decision === "rejected" ? "rejected" : i === nextIdx ? "next" : "todo";
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[15px] top-8 h-[calc(100%-24px)] w-[2px]", state === "done" ? "bg-success" : "bg-border")} />}
            {s.approver ? (
              <Avatar initials={s.approver.split(" ").map((x) => x[0]).slice(0, 2).join("")} tone={state === "rejected" ? "neutral" : "navy"} className={cn("ring-2", state === "done" ? "ring-success" : "ring-danger")} />
            ) : (
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed", state === "next" ? "border-brand text-brand animate-pulse-ring" : "border-border-strong text-subtle")}>
                <span className="text-[11px] font-semibold">{i + 1}</span>
              </span>
            )}
            <div className="min-w-0 pt-0.5">
              <div className="text-[13px] font-medium">{s.label}</div>
              <div className="text-[12px] text-muted">
                {s.decision ? `${s.decision === "approved" ? "Approved" : "Rejected"} by ${s.approver} · ${fmt.relative(s.at!)}` : state === "next" ? `Waiting for ${s.role === "authorized-signer" ? "authorised signer" : ROLE_META[s.role as D.Role].label.toLowerCase()}` : "Not started"}
              </div>
              {s.comment && <p className="mt-1 rounded-md bg-surface-2 px-2 py-1 text-[12px] text-muted">“{s.comment}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
