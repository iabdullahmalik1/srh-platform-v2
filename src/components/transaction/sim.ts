"use client";

import * as React from "react";
import type * as D from "@/types/domain";

/**
 * Display helpers for the settlement view: block cadence, network fees and a shared clock.
 * Values are derived deterministically from order data so every viewer sees the same numbers.
 */

/** Average block or slot time per network, in milliseconds. */
export const BLOCK_MS: Record<D.Chain, number> = { ethereum: 12_000, polygon: 2_000, base: 2_000, avalanche: 2_000, solana: 400 };

/** Confirmations required before the mint is treated as final by the reconciliation engine. */
export const REQUIRED_CONFIRMATIONS = 12;

/** Display cadence for confirmations once the mint is included (compressed for the console). */
export const CONFIRMATION_MS = 230;

const REF = Date.UTC(2026, 8, 1);

export function hashNum(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Latest block height for a network at a moment, anchored on the deployment's last indexed block. */
export function blockAt(chain: D.Chain, base: number | undefined, at: number) {
  const anchor = base ?? { ethereum: 23_480_000, polygon: 66_200_000, base: 47_900_000, avalanche: 52_100_000, solana: 326_300_000 }[chain];
  return anchor + Math.max(0, Math.floor((at - REF) / BLOCK_MS[chain]));
}

/** Network fee in USD for the mint transaction. */
export function networkFeeUsd(chain: D.Chain, seed: string) {
  const h = hashNum(seed);
  switch (chain) {
    case "ethereum":
      return 2.4 + (h % 520) / 100;
    case "polygon":
      return 0.008 + (h % 30) / 1000;
    case "base":
      return 0.012 + (h % 45) / 1000;
    case "avalanche":
      return 0.04 + (h % 90) / 1000;
    case "solana":
      return 0.0007 + (h % 12) / 10_000;
  }
}

/** A clock that ticks only while `active`. Returns null before mount so server and client markup match. */
export function useNow(active: boolean, interval = 250) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    if (!active) return () => clearTimeout(first);
    const id = setInterval(tick, interval);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, interval]);
  return now;
}

/** Elapsed duration as m:ss, or h m for long spans. */
export function duration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const h = Math.floor(s / 3600);
  if (h < 48) return `${h}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Reveals a string character by character once `run` is true. */
export function useTypewriter(text: string | undefined, run: boolean, totalMs = 900) {
  const [n, setN] = React.useState(run ? 0 : (text?.length ?? 0));
  React.useEffect(() => {
    if (!text) return;
    if (!run) {
      const t = setTimeout(() => setN(text.length), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / totalMs);
      setN(Math.round(k * text.length));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, run, totalMs]);
  return text ? text.slice(0, n) : "";
}

export const EASE = [0.2, 0, 0, 1] as const;
