"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Eye, Info, RotateCcw, ScanFace, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE, IconChip } from "./parts";

const PROMPTS: { text: string; icon: LucideIcon; ms: number }[] = [
  { text: "Position your face in the oval", icon: ScanFace, ms: 1100 },
  { text: "Look straight", icon: Eye, ms: 1300 },
  { text: "Turn slightly left", icon: ArrowLeft, ms: 1400 },
  { text: "Blink", icon: Eye, ms: 1200 },
];
const TOTAL = PROMPTS.reduce((s, p) => s + p.ms, 0);

type Phase = "idle" | "running" | "done";

/**
 * Simulated liveness check: an oval camera frame with a progress ring and changing prompts.
 * Uses a stock photo as the camera preview. No camera access is requested.
 */
export function LivenessCheck({ photo, confirmed, onComplete, onReset }: { photo: string; confirmed: boolean; onComplete: () => void; onReset: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>(confirmed ? "done" : "idle");
  const [prompt, setPrompt] = React.useState(0);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  React.useEffect(() => {
    if (phase !== "running") return;
    const scale = reduce ? 0.3 : 1;
    let acc = 0;
    const timers = PROMPTS.slice(1).map((_, i) => {
      acc += PROMPTS[i].ms * scale;
      return setTimeout(() => setPrompt(i + 1), acc);
    });
    timers.push(
      setTimeout(() => {
        setPhase("done");
        onCompleteRef.current();
      }, TOTAL * scale),
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, reduce]);

  const running = phase === "running";
  const done = phase === "done";
  const current = PROMPTS[prompt];
  const sharp = done || (running && prompt >= 1);
  const turn = running && prompt === 2 && !reduce;
  const blink = running && prompt === 3 && !reduce;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-navy-1 px-6 pb-6 pt-8">
        <div aria-hidden className="app-aurora absolute inset-0 opacity-40" />
        <div className="relative mx-auto h-[250px] w-[196px] sm:h-[280px] sm:w-[220px]">
          <svg aria-hidden viewBox="0 0 220 280" className="absolute -inset-3 size-[calc(100%+24px)]" preserveAspectRatio="none">
            <ellipse cx="110" cy="140" rx="104" ry="134" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/15" />
            <motion.path
              d="M110 6 A104 134 0 1 1 109.9 6"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={cn("transition-colors duration-300", done ? "stroke-success" : "stroke-info")}
              initial={false}
              animate={{ pathLength: done || running ? 1 : 0, opacity: done || running ? 1 : 0 }}
              transition={{ pathLength: { duration: running ? (TOTAL / 1000) * (reduce ? 0.3 : 1) : 0.3, ease: "linear" }, opacity: { duration: 0.2 } }}
            />
          </svg>
          <div className="absolute inset-0 overflow-hidden rounded-[50%] bg-navy-3 ring-1 ring-white/10">
            <motion.img
              src={photo}
              alt=""
              className="absolute inset-0 size-full object-cover"
              initial={false}
              animate={{
                filter: sharp ? "blur(0px) brightness(1)" : "blur(9px) brightness(0.7)",
                scale: sharp ? 1.18 : 1.3,
                x: turn ? -10 : 0,
                rotateY: turn ? -14 : 0,
              }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ transformPerspective: 600 }}
            />
            {blink && (
              <motion.div aria-hidden className="absolute inset-x-0 top-[34%] h-[9%] bg-navy-1/70 blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0, 0, 0.9, 0] }} transition={{ duration: 1.1, times: [0, 0.12, 0.25, 0.55, 0.67, 0.8] }} />
            )}
            {running && prompt === 0 && !reduce && (
              <motion.div aria-hidden className="absolute inset-x-0 h-14 bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--info)_40%,transparent))]" initial={{ top: "-20%" }} animate={{ top: "100%" }} transition={{ duration: 1.1, ease: "easeInOut" }} />
            )}
            {phase === "idle" && (
              <div className="absolute inset-0 grid place-items-center">
                <ScanFace className="size-12 text-white/80" strokeWidth={1.25} aria-hidden />
              </div>
            )}
          </div>
          <AnimatePresence>
            {done && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="absolute -bottom-4 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-success text-white shadow-2 ring-4 ring-navy-1"
              >
                <Check className="size-4.5" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="relative mt-8 flex h-8 items-center justify-center" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={done ? "done" : running ? prompt : "idle"}
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center gap-2 text-[15px] font-semibold text-white"
            >
              {done ? (
                <>
                  <Check className="size-4 text-success" strokeWidth={3} aria-hidden /> Liveness confirmed
                </>
              ) : running ? (
                <>
                  <current.icon className="size-4 text-info" aria-hidden /> {current.text}
                </>
              ) : (
                <span className="text-[13px] font-medium text-navy-text">Camera ready</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="relative mt-3 flex justify-center gap-1.5" aria-hidden>
          {PROMPTS.map((p, i) => (
            <span key={p.text} className={cn("h-1 w-6 rounded-full transition-colors duration-300", done || (running && i < prompt) ? "bg-success" : running && i === prompt ? "bg-info" : "bg-white/15")} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {done ? (
          <>
            <IconChip icon={Check} tone="success">Face matches document</IconChip>
            <IconChip icon={Check} tone="success">Live person detected</IconChip>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setPrompt(0);
                setPhase("idle");
                onReset();
              }}
            >
              <RotateCcw /> Run again
            </Button>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5 text-[12px] text-muted">
              <Info className="size-3.5" aria-hidden /> Simulated camera. No camera access is requested.
            </span>
            <Button variant="primary" className="w-full sm:ml-auto sm:w-auto" onClick={() => setPhase("running")} isLoading={running} loadingText="Checking…">
              <ScanFace /> Start liveness check
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
