/**
 * Fixed-income arithmetic for notes, bonds and sukuk.
 *
 * Regular coupons: the schedule pays face x coupon / frequency on each date, principal at maturity
 * (or in equal instalments when amortising). A 0% coupon has no interim payments: the note is issued
 * at a discount and the price is face / (1 + y)^t, so the return comes from accretion to par.
 */
import type { DebtTerms } from "@/types/domain";

const PER_YEAR: Record<DebtTerms["couponFrequency"], number> = { annual: 1, "semi-annual": 2, quarterly: 4, monthly: 12, none: 0 };
const YEAR_MS = 365.25 * 86_400_000;

export interface CashFlow {
  date: string;
  coupon: number;
  principal: number;
  total: number;
  /** Outstanding face value after this payment. */
  outstanding: number;
}

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + m);
  return x;
}

/** Payment dates counted back from maturity so the final coupon lands on the maturity date. */
function paymentDates(issue: Date, maturity: Date, perYear: number): Date[] {
  if (!perYear) return [maturity];
  const step = 12 / perYear;
  const out: Date[] = [];
  for (let d = new Date(maturity); d > issue; d = addMonths(d, -step)) out.unshift(new Date(d));
  return out;
}

export function cashFlows(t: DebtTerms, units = 1): CashFlow[] {
  const issue = new Date(t.issueDate);
  const maturity = new Date(t.maturity);
  const f = PER_YEAR[t.couponFrequency];
  const dates = paymentDates(issue, maturity, t.couponPct > 0 ? f : 0);
  let outstanding = t.faceValue * units;
  const instalment = t.amortising ? outstanding / dates.length : 0;
  return dates.map((d, i) => {
    const coupon = t.couponPct > 0 && f ? (outstanding * t.couponPct) / 100 / f : 0;
    const last = i === dates.length - 1;
    const principal = t.amortising ? (last ? outstanding : instalment) : last ? outstanding : 0;
    outstanding = Math.max(0, outstanding - principal);
    return { date: d.toISOString(), coupon: round(coupon), principal: round(principal), total: round(coupon + principal), outstanding: round(outstanding) };
  });
}

/** Clean price per unit of face at a given yield, discounting each flow at (1 + y / f) per period (annual for zero coupons). */
export function priceAtYield(t: DebtTerms, yieldPct: number, at: Date = new Date(t.issueDate)): number {
  const y = yieldPct / 100;
  const f = t.couponPct > 0 ? PER_YEAR[t.couponFrequency] || 1 : 1;
  const flows = cashFlows(t).filter((c) => new Date(c.date) > at);
  const pv = flows.reduce((s, c) => {
    const years = (new Date(c.date).getTime() - at.getTime()) / YEAR_MS;
    return s + c.total / Math.pow(1 + y / f, years * f);
  }, 0);
  return round(pv, 4);
}

/** Zero coupon: price per 100 of face. */
export function zeroCouponPrice(face: number, yieldPct: number, years: number) {
  return round(face / Math.pow(1 + yieldPct / 100, years), 4);
}

/** Accreted value of a zero-coupon note at each year end, from issue price to par. */
export function accretion(t: DebtTerms): { date: string; value: number }[] {
  const issue = new Date(t.issueDate).getTime();
  const maturity = new Date(t.maturity).getTime();
  const out: { date: string; value: number }[] = [];
  for (let x = issue; x < maturity; x += YEAR_MS / 4) out.push({ date: new Date(x).toISOString(), value: zeroCouponPrice(t.faceValue, t.yieldPct, (maturity - x) / YEAR_MS) });
  out.push({ date: new Date(maturity).toISOString(), value: t.faceValue });
  return out;
}

export const yearsBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / YEAR_MS;
export const FREQUENCY_LABEL: Record<DebtTerms["couponFrequency"], string> = { annual: "Annual", "semi-annual": "Semi-annual", quarterly: "Quarterly", monthly: "Monthly", none: "No coupon" };

function round(n: number, d = 2) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}
