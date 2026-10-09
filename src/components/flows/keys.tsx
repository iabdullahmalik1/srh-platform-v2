"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { KeyRound, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

/** m-of-n signing visual: n key shares, the quorum lit, joined to a signature. */
export function KeyQuorum({ quorum, signers, size = 26, className, frozen }: { quorum: number; signers: number; size?: number; className?: string; frozen?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("flex items-center gap-2", className)} role="img" aria-label={`${quorum} of ${signers} signatures required`}>
      <div className="relative flex items-center gap-1">
        {Array.from({ length: signers }).map((_, i) => {
          const lit = i < quorum && !frozen;
          return (
            <motion.span
              key={i}
              className={cn("relative grid place-items-center rounded-full", lit ? "bg-brand-soft text-brand-ink ring-1 ring-brand/30" : "bg-surface-3 text-subtle")}
              style={{ width: size, height: size }}
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.06, ease: [0.2, 0, 0, 1] }}
            >
              <KeyRound className="size-3.5" aria-hidden />
            </motion.span>
          );
        })}
      </div>
      <span className="h-px w-4 bg-border-strong" aria-hidden />
      <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] font-semibold tabular", frozen ? "border-danger/30 bg-danger-soft text-danger" : "border-brand/30 bg-brand-soft text-brand-ink")}>
        <PenLine className="size-3" aria-hidden />
        {quorum} of {signers}
      </span>
    </div>
  );
}
