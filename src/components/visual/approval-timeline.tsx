"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, KeyRound, ShieldCheck, Settings2, UserRound, Workflow, X, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { PersonAvatar } from "@/components/domain/logos";
import { ROLE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";
import { SystemAvatar, isSystemName } from "./bits";

const ROLE_ICON: Record<D.ApprovalStep["role"], LucideIcon> = {
  operations: Workflow,
  "compliance-officer": ShieldCheck,
  "platform-admin": Settings2,
  "issuer-admin": UserRound,
  investor: UserRound,
  auditor: UserRound,
  "authorized-signer": KeyRound,
};

function roleLabel(r: D.ApprovalStep["role"]) {
  return r === "authorized-signer" ? "Authorised signer" : ROLE_META[r].label;
}

/** Approval steps as a photo timeline: who approved, who is next, what is left. */
export function ApprovalTimeline({ steps, className }: { steps: D.ApprovalStep[]; className?: string }) {
  const reduce = useReducedMotion();
  const nextIdx = steps.findIndex((s) => !s.decision);
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((s, i) => {
        const state = s.decision === "approved" ? "done" : s.decision === "rejected" ? "rejected" : i === nextIdx ? "next" : "todo";
        const Icon = ROLE_ICON[s.role];
        const system = !!s.approver && isSystemName(s.approver);
        return (
          <motion.li
            key={i}
            className="relative flex gap-3 pb-4 last:pb-0"
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.06, ease: [0.2, 0, 0, 1] }}
          >
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[17px] top-10 h-[calc(100%-32px)] w-[2px] rounded-full", state === "done" ? "bg-success" : "bg-border")} />}
            <span className="relative shrink-0">
              {s.approver ? (
                system || /hsm|quorum/i.test(s.approver) ? <SystemAvatar name={s.approver} size={36} /> : <PersonAvatar name={s.approver} size={36} />
              ) : (
                <span className={cn("grid size-9 place-items-center rounded-full border-2 border-dashed", state === "next" ? "border-brand bg-brand-soft text-brand-ink animate-pulse-ring" : "border-border-strong text-subtle")}>
                  <Icon className="size-4" aria-hidden />
                </span>
              )}
              {s.decision && (
                <span className={cn("absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full text-white ring-2 ring-surface", state === "done" ? "bg-success" : "bg-danger")}>
                  {state === "done" ? <Check className="size-2.5" strokeWidth={3.5} /> : <X className="size-2.5" strokeWidth={3.5} />}
                </span>
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 text-[13px] font-medium">
                {s.label}
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
                {s.decision ? (
                  <>
                    <span className={state === "done" ? "text-success" : "text-danger"}>{state === "done" ? "Approved" : "Rejected"}</span>
                    <span>by {s.approver}</span>
                    {s.at && <span>· {fmt.relative(s.at)}</span>}
                  </>
                ) : state === "next" ? (
                  <span className="inline-flex items-center gap-1 font-medium text-brand-ink"><Icon className="size-3.5" aria-hidden /> Waiting for {roleLabel(s.role).toLowerCase()}</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Icon className="size-3.5" aria-hidden /> {roleLabel(s.role)}</span>
                )}
              </div>
              {s.comment && <p className="mt-1 rounded-md bg-surface-2 px-2 py-1 text-[12px] text-muted">“{s.comment}”</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Compact step dots for list rows. */
export function ApprovalDots({ steps }: { steps: D.ApprovalStep[] }) {
  const nextIdx = steps.findIndex((s) => !s.decision);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${steps.filter((s) => s.decision === "approved").length} of ${steps.length} approvals`}>
      {steps.map((s, i) => (
        <span key={i} className={cn("h-1.5 w-4 rounded-full", s.decision === "approved" ? "bg-success" : s.decision === "rejected" ? "bg-danger" : i === nextIdx ? "bg-brand" : "bg-surface-3")} />
      ))}
    </span>
  );
}


