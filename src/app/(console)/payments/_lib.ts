import type * as D from "@/types/domain";

/**
 * Indicative USD conversion for headline figures only. Each payment keeps its
 * own currency everywhere else; the backend will supply reporting FX rates.
 */
const USD_PER: Record<D.Currency, number> = { USD: 1, AED: 0.2723, SAR: 0.2666, EUR: 1.08, GBP: 1.27, SGD: 0.74, PKR: 0.0036 };

export function toUsd(amount: number, currency: D.Currency) {
  return amount * (USD_PER[currency] ?? 1);
}

export const DAY = 86_400_000;

export function withinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * DAY;
}
