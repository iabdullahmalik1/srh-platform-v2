"use client";

import * as React from "react";
import type * as D from "@/types/domain";
import { useAssets, useDistributions, useHoldings, useTokenClasses } from "@/hooks/api";
import { usePersona } from "@/hooks/session";
import { PERSONA_INVESTOR } from "@/lib/directory";
import { DISTRIBUTION_TYPE_LABEL } from "@/components/assets/meta";
import type { IncomeEvent } from "@/components/investor/income-timeline";
import type { PositionCardData } from "@/components/investor/position-card";
import { sum } from "@/lib/utils";

/** Indicative FX to USD for portfolio totals. Positions keep their own currency. */
const FX_USD: Partial<Record<D.Currency, number>> = { USD: 1, SAR: 0.2666, AED: 0.2723, GBP: 1.27, EUR: 1.08, SGD: 0.74 };
export const toUsd = (v: number, c: D.Currency) => v * (FX_USD[c] ?? 1);
const DIST_STATUS: Record<D.Distribution["status"], string> = { scheduled: "Scheduled", calculated: "Calculated", "pending-approval": "Awaiting approval", approved: "Approved", paying: "Paying", paid: "Paid" };

export type Position = PositionCardData & { h: D.Holding; usd: number };

/** The investor the current persona acts for. Staff preview the demo investor. */
export function usePortfolioInvestorId() {
  const persona = usePersona();
  return persona.role === "investor" ? PERSONA_INVESTOR[persona.id] ?? PERSONA_INVESTOR.usr_inv : PERSONA_INVESTOR.usr_inv;
}

export function usePortfolio(investorId: string) {
  const holdingsQ = useHoldings();
  const assetsQ = useAssets();
  const { data: tokens } = useTokenClasses();
  const { data: distributions } = useDistributions();

  const positions: Position[] = React.useMemo(() => {
    if (!holdingsQ.data || !assetsQ.data) return [];
    const raw = holdingsQ.data
      .filter((h) => h.investorId === investorId)
      .flatMap((h) => {
        const a = assetsQ.data!.find((x) => x.id === h.assetId);
        if (!a) return [];
        const ccy = a.valuation.currency;
        const tc = tokens?.find((t) => t.id === h.tokenClassId);
        // Ordinary units in a multi-class product are valued from their own cost until a separate price is struck.
        const unit = tc?.tier === "ordinary" ? h.costBasis / Math.max(1, h.quantity) * 1.012 : a.valuation.navPerToken;
        const value = h.quantity * unit;
        const symbol = tc?.symbol ?? a.shortName;
        const locked = !!h.lockedUntil && new Date(h.lockedUntil) > new Date();
        return [{ id: h.id, h, asset: a, symbol, chain: h.chain, units: h.quantity, value, cost: h.costBasis, gain: value - h.costBasis, ccy, lockedUntil: locked ? h.lockedUntil : undefined, frozen: h.frozen, usd: toUsd(value, ccy), share: 0 }];
      });
    const total = sum(raw, (p) => p.usd) || 1;
    return raw.map((p) => ({ ...p, share: (p.usd / total) * 100 })).sort((x, y) => y.usd - x.usd);
  }, [holdingsQ.data, assetsQ.data, tokens, investorId]);

  const totalUsd = sum(positions, (p) => p.usd);
  const costUsd = sum(positions, (p) => toUsd(p.cost, p.ccy));

  const income = React.useMemo(() => {
    let received = 0;
    const upcoming: IncomeEvent[] = [];
    for (const d of distributions ?? []) {
      const p = positions.find((x) => x.asset.id === d.assetId && (!x.h.tokenClassId || x.h.tokenClassId === tokens?.find((t) => t.assetId === d.assetId)?.id));
      if (!p) continue;
      const net = d.grossAmount > 0 ? d.netAmount / d.grossAmount : 1;
      const est = d.perToken * p.h.quantity * net;
      if (d.status === "paid") {
        if (d.paymentDate >= p.h.acquiredAt) received += toUsd(est, d.currency);
      } else upcoming.push({ id: d.id, date: d.paymentDate, amount: est, currency: d.currency, asset: p.asset, label: DISTRIBUTION_TYPE_LABEL[d.type], status: DIST_STATUS[d.status] });
    }
    upcoming.sort((x, y) => x.date.localeCompare(y.date));
    return { received, upcoming, next12: sum(upcoming, (u) => toUsd(u.amount, u.currency)) };
  }, [distributions, positions, tokens]);

  return {
    positions, totalUsd, costUsd, gainUsd: totalUsd - costUsd, income, distributionsLoaded: !!distributions,
    loading: holdingsQ.isPending || assetsQ.isPending, error: holdingsQ.error ?? assetsQ.error,
    retry: () => { holdingsQ.refetch(); assetsQ.refetch(); },
  };
}
