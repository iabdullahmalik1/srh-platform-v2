import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat("en-US");
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmt = {
  num: (n: number, digits?: number) =>
    digits === undefined ? nf.format(n) : new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
  dec: (n: number) => nf2.format(n),
  compact: (n: number) => compact.format(n),
  money: (n: number, currency = "USD", opts?: { compact?: boolean; digits?: number }) => {
    if (opts?.compact) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n);
    }
    const digits = opts?.digits ?? (Math.abs(n) < 100 ? 2 : 0);
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  },
  pct: (n: number, digits = 1) => `${n.toFixed(digits)}%`,
  date: (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)),
  dateShort: (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(iso)),
  dateTime: (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)),
  time: (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso)),
  relative: (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const sign = diff > 0 ? -1 : 1;
    if (abs < 45_000) return diff > 0 ? "just now" : "in a moment";
    if (abs < 3_600_000) return rtf.format(sign * Math.round(abs / 60_000), "minute");
    if (abs < 86_400_000) return rtf.format(sign * Math.round(abs / 3_600_000), "hour");
    if (abs < 30 * 86_400_000) return rtf.format(sign * Math.round(abs / 86_400_000), "day");
    if (abs < 365 * 86_400_000) return rtf.format(sign * Math.round(abs / (30 * 86_400_000)), "month");
    return rtf.format(sign * Math.round(abs / (365 * 86_400_000)), "year");
  },
  hash: (h: string, lead = 6, tail = 4) => (h.length <= lead + tail + 1 ? h : `${h.slice(0, lead)}…${h.slice(-tail)}`),
  titleCase: (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  sentence: (s: string) => {
    const t = s.replace(/[-_.]/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  },
};

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uid(prefix: string) {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 10) : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${rnd}`;
}

export function randomHex(n: number) {
  const bytes = new Uint8Array(Math.ceil(n / 2));
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, n);
}

export function sum<T>(arr: T[], f: (x: T) => number) {
  return arr.reduce((s, x) => s + f(x), 0);
}

export function groupBy<T, K extends string>(arr: T[], f: (x: T) => K): Record<K, T[]> {
  return arr.reduce((acc, x) => {
    const k = f(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {} as Record<K, T[]>);
}
