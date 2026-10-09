"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CircleCheck, Clock3, FileCheck2, LoaderCircle, ShieldCheck, UserRoundCheck, type LucideIcon } from "lucide-react";
import { CompanyLogo } from "@/components/domain/logos";
import { Badge, CopyText, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { EASE } from "./parts";

export type CheckProvider = { name: string; role: string; checks: string[] };
const PROVIDERS: CheckProvider[] = [
  { name: "Sumsub", role: "Identity", checks: ["Document authenticity", "Face match", "Liveness"] },
  { name: "ComplyAdvantage", role: "Screening", checks: ["Sanctions lists", "PEP screening", "Adverse media"] },
  { name: "Chainalysis", role: "Wallet risk", checks: ["Address exposure", "Risk score 9 of 100"] },
];
/** Live provider checks ticking through one by one. Calls onDone when all pass. */
export function VerificationTracker({ onDone, complete, providers = PROVIDERS }: { onDone: () => void; complete: boolean; providers?: CheckProvider[] }) {
  const PROVIDERS = providers;
  const TOTAL = PROVIDERS.reduce((s, p) => s + p.checks.length, 0);
  const STARTS = PROVIDERS.map((_, i) => PROVIDERS.slice(0, i).reduce((s, p) => s + p.checks.length, 0));
  const reduce = useReducedMotion();
  const [done, setDone] = React.useState(complete ? TOTAL : 0);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  React.useEffect(() => {
    if (done >= TOTAL) {
      const t = setTimeout(() => onDoneRef.current(), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), reduce ? 80 : done === 0 ? 700 : 430);
    return () => clearTimeout(t);
  }, [done, reduce, TOTAL]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(done / TOTAL) * 100} tone={done >= TOTAL ? "success" : "brand"} className="flex-1" />
        <span className="tabular text-[12.5px] font-medium text-muted">
          {done} of {TOTAL}
        </span>
      </div>
      <div className={cn("grid gap-3", PROVIDERS.length > 3 ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {PROVIDERS.map((p, pi) => {
          const start = STARTS[pi];
          const passed = done >= start + p.checks.length;
          const active = !passed && done >= start;
          return (
            <div key={p.name} className={cn("rounded-xl border bg-surface p-3.5 transition-colors duration-300", passed ? "border-success/40" : active ? "border-brand/40" : "border-border")}>
              <div className="flex items-center gap-2.5">
                <CompanyLogo name={p.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                  <span className="block text-[11.5px] text-muted">{p.role}</span>
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {p.checks.map((c, i) => {
                  const idx = start + i;
                  const ok = done > idx;
                  const running = done === idx;
                  return (
                    <li key={c} className="flex items-center gap-2 text-[12.5px]">
                      <span className="grid size-4 shrink-0 place-items-center">
                        {ok ? (
                          <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: EASE }} className="grid size-4 place-items-center rounded-full bg-success text-white">
                            <Check className="size-2.5" strokeWidth={3.5} />
                          </motion.span>
                        ) : running ? (
                          <LoaderCircle className="size-3.5 animate-spin text-brand" aria-hidden />
                        ) : (
                          <span className="size-1.5 rounded-full bg-border-strong" />
                        )}
                      </span>
                      <span className={ok ? "text-foreground" : "text-muted"}>{c}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3">
                <Badge tone={passed ? "success" : active ? "brand" : "neutral"} dot>
                  {passed ? "Passed" : active ? "Checking" : "Queued"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TIMELINE: { icon: LucideIcon; label: string; state: "done" | "active" | "next" }[] = [
  { icon: FileCheck2, label: "Submitted", state: "done" },
  { icon: ShieldCheck, label: "Provider checks", state: "done" },
  { icon: UserRoundCheck, label: "Compliance review", state: "active" },
  { icon: CircleCheck, label: "Account active", state: "next" },
];

/** Outcome after provider checks: status, expected time, reference and a four-stage timeline. */
export function ReviewStatus({ reference, name, outstanding = [] }: { reference: string; name: string; outstanding?: string[] }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="rounded-2xl border border-border bg-surface-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
            <Clock3 className="size-5" aria-hidden />
          </span>
          <div className="min-w-[180px] flex-1">
            <div className="text-[16px] font-semibold text-foreground">Account under compliance review</div>
            <div className="mt-0.5 text-[13px] text-muted">{name}. Usually approved within one business day.</div>
          </div>
          <div className="max-sm:basis-full max-sm:pl-14 sm:text-right">
            <div className="text-[11.5px] text-muted">Reference</div>
            <CopyText value={reference} display={reference} className="text-[12.5px] text-foreground" />
          </div>
        </div>
        {outstanding.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[12.5px]">
            <span className="font-medium text-foreground">Still to add: </span>
            <span className="text-muted">{outstanding.join(", ")}. You can explore products and place orders now; orders are confirmed once these are in.</span>
          </div>
        )}
        <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Application status">
          {TIMELINE.map((t, i) => (
            <li key={t.label} className="relative flex flex-col items-center text-center">
              {i < TIMELINE.length - 1 && <span aria-hidden className={cn("absolute left-1/2 top-4 h-0.5 w-full", t.state === "done" ? "bg-success" : "bg-border-strong")} />}
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-full border-2",
                  t.state === "done" ? "border-success bg-success text-white" : t.state === "active" ? "border-warning bg-surface text-warning" : "border-border-strong bg-surface text-subtle",
                )}
              >
                {t.state === "active" && !reduce && <span aria-hidden className="absolute -inset-1 animate-ping rounded-full border-2 border-warning opacity-40" />}
                {t.state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <t.icon className="size-4" aria-hidden />}
              </span>
              <span className={cn("mt-2 text-[11.5px] leading-tight sm:text-[12px]", t.state === "next" ? "text-muted" : "font-medium text-foreground")}>{t.label}</span>
            </li>
          ))}
        </ol>
      </motion.div>
    </AnimatePresence>
  );
}
