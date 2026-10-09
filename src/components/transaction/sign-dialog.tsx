"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Fingerprint, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { SrhMark } from "@/components/brand/srh-logo";
import { cn, randomHex } from "@/lib/utils";
import { EASE } from "./sim";

type Phase = "waiting" | "approved" | "submitting" | "error";

const APPROVE_MS = 1500;

/**
 * Simulated transaction authorisation. The device prompt counts down, flips to approved,
 * then hands over to `onSign`, which submits the order. The parent closes the dialog on success.
 */
export function SignDialog({
  open,
  onOpenChange,
  device,
  title,
  amount,
  detail,
  onSign,
  onRetry,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device: "phone" | "key";
  title: string;
  amount: string;
  detail: string;
  onSign: () => void;
  onRetry: () => void;
  submitting: boolean;
  error?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const [attempt, setAttempt] = React.useState(0);
  const [approvedAt, setApprovedAt] = React.useState<number>();
  const [signature, setSignature] = React.useState("");
  const onSignRef = React.useRef(onSign);
  React.useEffect(() => {
    onSignRef.current = onSign;
  }, [onSign]);

  // Count down, approve, then submit.
  React.useEffect(() => {
    if (!open) return;
    const t1 = setTimeout(() => {
      setApprovedAt(Date.now());
      setSignature(`0x${randomHex(16)}`);
    }, APPROVE_MS);
    const t2 = setTimeout(() => onSignRef.current(), APPROVE_MS + 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setApprovedAt(undefined);
    };
  }, [open, attempt]);

  const phase: Phase = error && !submitting ? "error" : submitting ? "submitting" : approvedAt ? "approved" : "waiting";
  const isPhone = device === "phone";

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        size="sm"
        title={isPhone ? "Approve on your device" : "Touch your security key"}
        description={phase === "error" ? undefined : isPhone ? "SRH Authenticator, iPhone" : "FIDO2 key, USB-C"}
        footer={
          phase === "error" ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button variant="primary" onClick={() => { onRetry(); setAttempt((n) => n + 1); }}>Sign again</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={phase !== "waiting"}>Cancel</Button>
          )
        }
      >
        <div className="flex flex-col items-center gap-5 py-2">
          {isPhone ? <Phone phase={phase} title={title} amount={amount} attempt={attempt} reduce={reduce} /> : <SecurityKey phase={phase} attempt={attempt} reduce={reduce} title={title} amount={amount} />}

          <div className="flex min-h-[44px] flex-col items-center gap-1 text-center" role="status" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={phase} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }} className="flex flex-col items-center gap-1">
                {phase === "waiting" && (
                  <>
                    <span className="text-[13.5px] font-medium">{isPhone ? "Waiting for approval…" : "Waiting for touch…"}</span>
                    <span className="text-[12.5px] text-muted">{detail}</span>
                  </>
                )}
                {phase === "approved" && (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-success"><ShieldCheck className="size-4" /> Approved</span>
                    <span className="font-mono text-[11.5px] text-muted">ES256 · {signature.slice(0, 10)}…{signature.slice(-4)}</span>
                  </>
                )}
                {phase === "submitting" && (
                  <>
                    <span className="text-[13.5px] font-medium">Submitting order…</span>
                    <span className="font-mono text-[11.5px] text-muted">ES256 · {signature.slice(0, 10)}…{signature.slice(-4)}</span>
                  </>
                )}
                {phase === "error" && (
                  <>
                    <span className="text-[13.5px] font-medium text-danger">The order was not submitted</span>
                    <span className="text-[12.5px] text-muted">{error}</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CountdownRing({ size, run, attempt, done, reduce, children }: { size: number; run: boolean; attempt: number; done: boolean; reduce: boolean; children: React.ReactNode }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" className="stroke-border" />
        <motion.circle
          key={attempt}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          className={done ? "stroke-success" : "stroke-brand"}
          initial={{ strokeDashoffset: reduce ? 0 : c }}
          animate={{ strokeDashoffset: run || done ? 0 : c }}
          transition={{ duration: reduce ? 0 : APPROVE_MS / 1000, ease: "linear" }}
        />
      </svg>
      {children}
    </span>
  );
}

function Phone({ phase, title, amount, attempt, reduce }: { phase: Phase; title: string; amount: string; attempt: number; reduce: boolean }) {
  const done = phase !== "waiting" && phase !== "error";
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 rounded-[48px] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_14%,transparent),transparent)]" />
      <div className="relative flex h-[268px] w-[148px] flex-col rounded-[30px] border-[5px] border-navy-3 bg-navy-1 p-1 shadow-3">
        <span aria-hidden className="absolute left-1/2 top-1.5 h-[14px] w-[46px] -translate-x-1/2 rounded-full bg-navy-1" />
        <div className="flex flex-1 flex-col items-center rounded-[24px] bg-surface px-3 pb-4 pt-7 text-center">
          <SrhMark size={22} />
          <span className="mt-2 text-[10.5px] font-medium text-muted">{title}</span>
          <span className="mt-1 text-[15px] font-semibold tabular">{amount}</span>
          <span className="mt-auto" />
          <CountdownRing size={64} run={phase === "waiting"} attempt={attempt} done={done} reduce={reduce}>
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.span key="ok" className="grid size-11 place-items-center rounded-full bg-success text-white" initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 480, damping: 24 }}>
                  <Check className="size-5" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span key="fp" className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink" exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}>
                  <Fingerprint className="size-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </CountdownRing>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted"><Smartphone className="size-3" /> Face ID</span>
        </div>
      </div>
    </div>
  );
}

function SecurityKey({ phase, attempt, reduce, title, amount }: { phase: Phase; attempt: number; reduce: boolean; title: string; amount: string }) {
  const done = phase !== "waiting" && phase !== "error";
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full max-w-[300px] items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
        <SrhMark size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-muted">{title}</div>
          <div className="text-[15px] font-semibold tabular">{amount}</div>
        </div>
        <KeyRound className="size-4 text-subtle" />
      </div>
      <div className="relative flex items-center pb-4">
        <div aria-hidden className="absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_12%,transparent),transparent)]" />
        <span aria-hidden className="relative -mr-px flex h-[22px] w-[30px] flex-col justify-center gap-[5px] rounded-l-[5px] border border-border-strong bg-surface-3 pl-2">
          <span className="h-[3px] w-3 rounded-sm bg-border-strong" />
          <span className="h-[3px] w-3 rounded-sm bg-border-strong" />
        </span>
        <div className="relative flex h-[72px] w-[196px] items-center gap-2.5 rounded-[20px] bg-navy-2 pl-4 pr-2 shadow-3 ring-1 ring-navy-4">
          <span className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-wide text-navy-text">FIDO2</span>
            <span className="text-[10px] text-navy-muted">USB-C · NFC</span>
          </span>
          <span className="ml-auto">
            <CountdownRing size={58} run={phase === "waiting"} attempt={attempt} done={done} reduce={reduce}>
              <span className={cn("grid size-10 place-items-center rounded-full transition-colors duration-300", done ? "bg-success text-white" : "bg-[color-mix(in_oklab,var(--warning)_75%,white)] text-navy-1")}>
                {done ? <Check className="size-4" strokeWidth={3} /> : <Fingerprint className={cn("size-5", !reduce && phase === "waiting" && "animate-pulse")} />}
              </span>
            </CountdownRing>
          </span>
        </div>
      </div>
    </div>
  );
}
