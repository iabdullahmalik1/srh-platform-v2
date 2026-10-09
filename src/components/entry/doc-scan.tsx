/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, CalendarCheck, Landmark, RotateCcw, ScanLine, ShieldCheck, SquareAsterisk } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME } from "@/lib/constants";
import { DOC_META, type DocType, type ExtractedDoc } from "./onboarding-model";
import { EASE, IconChip } from "./parts";

type Phase = "ready" | "scanning" | "reading" | "done";

/** Stylised document face. Fixed paper colours so it reads as a physical card in both themes. */
function DocFace({ type, doc, photo, issuer, label }: { type: DocType; doc: ExtractedDoc; photo: string; issuer: string; label?: string }) {
  const passport = type === "passport";
  const [surname, ...rest] = doc.fullName.trim().split(/\s+/).reverse();
  const given = rest.reverse().join(" ");
  const field = (label: string, value: string) => (
    <div className="min-w-0">
      <div className="text-[6.5px] leading-none text-navy-muted sm:text-[7px]">{label}</div>
      <div className="truncate text-[8.5px] font-semibold leading-tight text-navy-2 sm:text-[9.5px]">{value}</div>
    </div>
  );
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-[color-mix(in_oklab,var(--info)_7%,white)] shadow-3 ring-1 ring-black/10">
      <svg aria-hidden viewBox="0 0 200 140" preserveAspectRatio="none" className="absolute inset-0 size-full text-info opacity-[0.16]">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${20 + i * 13} C 40 ${8 + i * 13}, 70 ${34 + i * 13}, 110 ${18 + i * 13} S 170 ${6 + i * 13}, 200 ${22 + i * 13}`} fill="none" stroke="currentColor" strokeWidth="0.6" />
        ))}
        <circle cx="160" cy="70" r="34" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="160" cy="70" r="26" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <div className="relative flex h-full flex-col p-[5%]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[8px] font-semibold text-navy-2 sm:text-[9px]">
            <Landmark className="size-2.5 text-info" aria-hidden />
            {label ?? DOC_META[type].label}
          </span>
          <span className="truncate pl-2 text-[7px] text-navy-muted sm:text-[8px]">{issuer}</span>
        </div>
        <div className="mt-[4%] flex min-h-0 flex-1 gap-[5%]">
          <div className="relative aspect-[3/4] h-full max-h-[96px] shrink-0 overflow-hidden rounded-[4px] bg-navy-4/20">
            <img src={photo} alt="" className="size-full object-cover saturate-[0.85]" />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-2 gap-y-[5%]">
            <div className="col-span-2">{field("Surname", surname?.toUpperCase() ?? "")}</div>
            <div className="col-span-2">{field("Given names", given.toUpperCase() || "")}</div>
            {field("Nationality", doc.nationality)}
            {field("Date of birth", doc.dob)}
            {field(passport ? "Passport no." : "ID number", doc.number)}
            {field("Date of expiry", doc.expiry)}
          </div>
        </div>
        <div className="mt-[3%] rounded-[3px] bg-white/70 px-1 py-0.5 font-mono text-[5.6px] leading-[1.35] tracking-[0.04em] text-navy-2 sm:text-[6.6px]">
          {doc.mrz.map((l) => (
            <div key={l} className="whitespace-pre">{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Corners({ tone }: { tone: "idle" | "ok" }) {
  const c = tone === "ok" ? "border-success" : "border-white/80";
  const base = cn("absolute size-6 transition-colors duration-300", c);
  return (
    <>
      <span aria-hidden className={cn(base, "-left-2 -top-2 rounded-tl-lg border-l-2 border-t-2")} />
      <span aria-hidden className={cn(base, "-right-2 -top-2 rounded-tr-lg border-r-2 border-t-2")} />
      <span aria-hidden className={cn(base, "-bottom-2 -left-2 rounded-bl-lg border-b-2 border-l-2")} />
      <span aria-hidden className={cn(base, "-bottom-2 -right-2 rounded-br-lg border-b-2 border-r-2")} />
    </>
  );
}

/**
 * Simulated document capture: frame guides, a moving scan line, a capture flash,
 * then extracted fields appear one by one with a confidence badge. No camera access.
 */
export function DocumentScan({ type, doc, photo, citizenship, captured, onComplete, onReset, label, issuerCountry }: { type: DocType; doc: ExtractedDoc; photo: string; citizenship: string; captured: boolean; onComplete: () => void; onReset: () => void; label?: string; issuerCountry?: string }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>(captured ? "done" : "ready");
  const [shown, setShown] = React.useState(captured ? 99 : 0);
  const issuer = type === "emirates-id" ? "United Arab Emirates" : COUNTRY_NAME[issuerCountry ?? citizenship] ?? "";
  const fields: [string, string][] = [
    ["Full name", doc.fullName],
    ["Document number", doc.number],
    ["Nationality", doc.nationality],
    ["Date of birth", doc.dob],
    ["Expiry", doc.expiry],
  ];
  const total = fields.length + doc.mrz.length;

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  React.useEffect(() => {
    if (phase === "scanning") {
      const t = setTimeout(() => setPhase("reading"), reduce ? 400 : 2300);
      return () => clearTimeout(t);
    }
    if (phase === "reading") {
      const step = reduce ? 40 : 190;
      const timers = Array.from({ length: total }, (_, i) => setTimeout(() => setShown(i + 1), step * (i + 1)));
      timers.push(
        setTimeout(() => {
          setPhase("done");
          onCompleteRef.current();
        }, step * total + 300),
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [phase, total, reduce]);

  const done = phase === "done";
  const capturing = phase === "scanning";

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-navy-1 px-6 pb-5 pt-8 sm:px-8">
        <div aria-hidden className="app-aurora absolute inset-0 opacity-40" />
        <div className="relative w-full max-w-[340px]">
          <motion.div
            className="relative aspect-[1.42] w-full"
            initial={false}
            animate={phase === "ready" && !reduce ? { rotate: -3, scale: 0.94, filter: "blur(1.5px)" } : { rotate: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <DocFace type={type} doc={doc} photo={photo} issuer={issuer} label={label} />
            {capturing && !reduce && (
              <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[10px]">
                <motion.div
                  className="absolute inset-x-0 h-10 bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--info)_35%,transparent)_85%,var(--info))]"
                  initial={{ top: "-30%" }}
                  animate={{ top: ["-30%", "92%", "-30%"] }}
                  transition={{ duration: 1.8, ease: "easeInOut", delay: 0.4 }}
                />
              </div>
            )}
            <AnimatePresence>
              {phase === "reading" && (
                <motion.div aria-hidden className="absolute inset-0 rounded-[10px] bg-white" initial={{ opacity: 0.75 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} />
              )}
            </AnimatePresence>
          </motion.div>
          <Corners tone={done || phase === "reading" ? "ok" : "idle"} />
        </div>
        <div className="relative mt-5 flex h-7 items-center gap-2 rounded-full bg-white/10 px-3 text-[12px] font-medium text-white" aria-live="polite">
          {phase === "ready" && (
            <>
              <ScanLine className="size-3.5" aria-hidden /> Place the {(label ?? DOC_META[type].label).toLowerCase()} inside the frame
            </>
          )}
          {capturing && (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-info" aria-hidden /> Hold steady, scanning
            </>
          )}
          {phase === "reading" && (
            <>
              <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden /> Reading document
            </>
          )}
          {done && (
            <>
              <BadgeCheck className="size-3.5 text-success" aria-hidden /> Captured
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-[13.5px] font-semibold text-foreground">Extracted data</span>
          <AnimatePresence>
            {done && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: EASE }}>
                <IconChip icon={ShieldCheck} tone="success">
                  {doc.confidence}% confidence
                </IconChip>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <dl className="flex-1 space-y-2.5 px-4 py-3.5">
          {fields.map(([k, v], i) => (
            <div key={k} className="flex items-center justify-between gap-3 text-[13px]">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="min-w-0 text-right">
                {shown > i ? (
                  <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, ease: EASE }} className="block truncate font-medium text-foreground">
                    {v}
                  </motion.span>
                ) : (
                  <Skeleton className="ml-auto h-3.5 w-24" />
                )}
              </dd>
            </div>
          ))}
          <div className="pt-1">
            <div className="mb-1.5 text-[12px] text-muted">Machine readable zone</div>
            <div className="overflow-x-auto rounded-lg bg-surface-3 px-2.5 py-2 font-mono text-[10.5px] leading-[1.7] tracking-[0.02em] text-foreground scrollbar-thin">
              {doc.mrz.map((l, i) => (
                <div key={l} className="whitespace-pre">
                  {shown > fields.length + i ? (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                      {l}
                    </motion.span>
                  ) : (
                    <span className="text-subtle">{"<".repeat(Math.min(l.length, 30))}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-4 py-3">
          {done ? (
            <>
              <IconChip icon={SquareAsterisk} tone="success">MRZ checksum</IconChip>
              <IconChip icon={CalendarCheck} tone="success">Not expired</IconChip>
              <IconChip icon={ShieldCheck} tone="success">No tampering</IconChip>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setShown(0);
                  setPhase("ready");
                  onReset();
                }}
              >
                <RotateCcw /> Scan again
              </Button>
            </>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => setPhase("scanning")} isLoading={phase !== "ready"} loadingText={capturing ? "Scanning…" : "Reading…"}>
              <ScanLine /> Scan document
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
