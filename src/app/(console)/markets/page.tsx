"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Building2, ChartCandlestick, CircleCheck, CirclePause, CircleX, Clock, Globe, Handshake, Landmark, Lock, MapPin, Scale, ShieldCheck, Timer, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import type { MarketOrderInput } from "@/services/contracts";
import { useAcceptQuote, useAssets, useInvestors, useMarketOrders, usePlaceOrder, usePreTradeCheck, useRequestQuotes, useTokenClasses, useTrades } from "@/hooks/api";
import { useCan, useCurrentTenant, usePersona } from "@/hooks/session";
import { PERSONA_INVESTOR } from "@/lib/directory";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, Field, Input, NativeSelect, PageHeader, Segmented, Skeleton, Stat, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DecisionBadge, StatusBadge } from "@/components/domain/status";
import { AssetCover, AssetThumb } from "@/components/domain/media";
import { CompanyLogo } from "@/components/domain/logos";
import { Counterparty, CounterpartyAvatar } from "@/components/investor/counterparty";
import { cn, fmt } from "@/lib/utils";

const VENUES: { id: D.Venue; label: string; activity: D.RegulatedActivity; description: string; icon: LucideIcon }[] = [
  { id: "srh-ats", label: "SRH ATS", activity: "marketplace-operation", description: "Central limit order book operated by the platform entity", icon: Building2 },
  { id: "external-mtf", label: "External MTF", activity: "brokerage", description: "Orders routed to a licensed third-party venue", icon: Globe },
  { id: "otc", label: "OTC desk", activity: "brokerage", description: "Bilateral negotiated trades, reported after execution", icon: Handshake },
  { id: "rfq-desk", label: "RFQ desk", activity: "brokerage", description: "Request quotes from approved dealers", icon: Timer },
];

const CHECKS: { icon: LucideIcon; label: string }[] = [
  { icon: UserCheck, label: "Eligibility" },
  { icon: MapPin, label: "Jurisdiction" },
  { icon: Lock, label: "Lock-up" },
  { icon: Scale, label: "Holding limit" },
  { icon: Wallet, label: "Balance and wallet" },
  { icon: Landmark, label: "Venue permission" },
];
const VENUE_LABEL: Record<D.Venue, string> = { "srh-ats": "SRH ATS", "external-mtf": "External MTF", otc: "OTC desk", "rfq-desk": "RFQ desk", "institutional-dex": "Institutional DEX" };

const DEFAULT_TOKEN = "tok_srht";
const priceDigits = (p: number) => (p < 10 ? 4 : 2);
const fmtPrice = (p: number) => fmt.num(p, priceDigits(p));

function MarketsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const persona = usePersona();
  const investorView = persona.role === "investor";

  const tokens = useTokenClasses();
  const allOrders = useMarketOrders();
  const { data: assets } = useAssets();

  const tradable = React.useMemo(() => {
    const ids = new Set((allOrders.data ?? []).map((o) => o.tokenClassId));
    return (tokens.data ?? []).filter((t) => ids.has(t.id));
  }, [tokens.data, allOrders.data]);

  const requested = params.get("token");
  const tokenId = tradable.find((t) => t.id === requested)?.id ?? tradable.find((t) => t.id === DEFAULT_TOKEN)?.id ?? tradable[0]?.id ?? "";
  const token = tradable.find((t) => t.id === tokenId);
  const asset = assets?.find((a) => a.id === token?.assetId);

  const setToken = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("token", id);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const loadingTokens = tokens.isPending || allOrders.isPending;
  const loadError = tokens.error ?? allOrders.error;

  return (
    <>
      <PageHeader
        title={investorView ? "Secondary market" : "Secondary markets"}
        description="Order book, RFQ and block trading on permissioned venues."
      />
      {loadError && !tokens.data ? (
        <Card><ErrorState error={loadError} onRetry={() => { tokens.refetch(); allOrders.refetch(); }} /></Card>
      ) : loadingTokens ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-80" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)}</div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Skeleton className="h-[480px]" /><Skeleton className="h-[480px]" /></div>
        </div>
      ) : !token ? (
        <Card>
          <EmptyState icon={<ChartCandlestick />} title="No tokens are trading yet" description="Tokens appear here once a venue holds open orders for them. Secondary trading must be enabled for the tenant first." />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Token" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin sm:mx-0 sm:flex-wrap sm:px-0">
            {tradable.map((t) => {
              const a = assets?.find((x) => x.id === t.assetId);
              const on = t.id === tokenId;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setToken(t.id)}
                  className={cn("flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13px] font-medium transition-[border-color,background-color,box-shadow] duration-150", on ? "border-brand bg-brand-soft text-brand-ink shadow-1" : "border-border bg-surface text-foreground hover:border-border-strong")}>
                  {a ? <AssetThumb asset={a} className="size-7 rounded-full" /> : <span className="size-7 rounded-full bg-surface-3" />}
                  <span className="font-mono">{t.symbol}</span>
                </button>
              );
            })}
          </div>
          <MarketStats tokenId={tokenId} asset={asset} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <OrderBook token={token} investorView={investorView} />
              <VenuePanel />
            </div>
            <div className="min-w-0">
              <OrderTicket token={token} asset={asset} />
            </div>
          </div>
          <RecentTrades token={token} investorView={investorView} />
        </div>
      )}
    </>
  );
}

/* ------------------------------- helpers ------------------------------- */
function useBook(tokenId: string) {
  const q = useMarketOrders(tokenId);
  const book = React.useMemo(() => {
    const live = (q.data ?? []).filter((o) => o.status === "open" || o.status === "partially-filled");
    const asks = live.filter((o) => o.side === "sell").sort((a, b) => b.price - a.price);
    const bids = live.filter((o) => o.side === "buy").sort((a, b) => b.price - a.price);
    const blocked = (q.data ?? []).filter((o) => o.status === "blocked" || o.complianceDecision === "REJECT");
    const bestAsk = asks.length ? asks[asks.length - 1].price : undefined;
    const bestBid = bids.length ? bids[0].price : undefined;
    const mid = bestAsk !== undefined && bestBid !== undefined ? (bestAsk + bestBid) / 2 : bestAsk ?? bestBid;
    const spread = bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : undefined;
    return { asks, bids, blocked, bestAsk, bestBid, mid, spread };
  }, [q.data]);
  return { ...q, book };
}

function MarketStats({ tokenId, asset }: { tokenId: string; asset?: D.Asset }) {
  const { book, isPending } = useBook(tokenId);
  const trades = useTrades(tokenId);
  const last = trades.data?.slice().sort((a, b) => b.executedAt.localeCompare(a.executedAt))[0];
  const vol = (trades.data ?? []).filter((t) => Date.now() - new Date(t.executedAt).getTime() < 86_400_000).reduce((s, t) => s + t.quantity * t.price, 0);
  const ccy = asset?.valuation.currency ?? "USD";
  const premium = last && asset ? ((last.price - asset.valuation.navPerToken) / asset.valuation.navPerToken) * 100 : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="relative col-span-2 min-h-[104px] overflow-hidden rounded-xl shadow-1 lg:col-span-1">
        {asset ? <AssetCover asset={asset} overlay className="absolute inset-0 size-full" /> : <Skeleton className="absolute inset-0" />}
        {asset && (
          <div className="relative flex h-full flex-col justify-end p-3.5 text-white">
            <div className="truncate text-[14px] font-semibold [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{asset.name}</div>
            <div className="text-[12px] text-white/80 tabular">NAV {fmtPrice(asset.valuation.navPerToken)} · {fmt.relative(asset.valuation.lastUpdated)}</div>
          </div>
        )}
      </div>
      <Stat label="Last price" loading={trades.isPending} value={last ? fmtPrice(last.price) : "No trades"} sub={premium !== undefined ? <span>{premium >= 0 ? "+" : ""}{premium.toFixed(2)}% to NAV</span> : undefined} />
      <Stat label="Mid" loading={isPending} value={book.mid !== undefined ? fmtPrice(book.mid) : "No quotes"} sub={book.spread !== undefined && book.mid ? <span className="tabular">Spread {((book.spread / book.mid) * 10_000).toFixed(1)} bps</span> : undefined} />
      <Stat label="Volume, 24 hours" loading={trades.isPending} value={fmt.money(vol, ccy, { compact: true })} sub={`${(trades.data ?? []).length} trades`} />
    </div>
  );
}

/* ------------------------------ order book ----------------------------- */
function OrderBook({ token, investorView }: { token: D.TokenClass; investorView: boolean }) {
  const { book, isPending, error, refetch, data } = useBook(token.id);
  const persona = usePersona();
  const maxQty = Math.max(1, ...[...book.asks, ...book.bids].map((o) => o.quantity - o.filled));
  return (
    <Card className="flex flex-col">
      <CardHeader title="Order book" description={`${token.symbol} across permissioned venues`} />
      {error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-1.5 p-4">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
      ) : book.asks.length + book.bids.length === 0 ? (
        <EmptyState title="The book is empty" description={`No resting orders for ${token.symbol}. Place a limit order to open the book.`} />
      ) : (
        <div className="flex-1 px-2 py-2">
          <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-3 pb-1.5 text-[11.5px] font-medium text-muted">
            <span className="sr-only">Party</span>
            <span aria-hidden />
            <span>Price</span>
            <span className="text-right">Quantity</span>
            <span className="text-right">Venue</span>
          </div>
          <ul aria-label="Asks">
            {book.asks.map((o) => <BookRow key={o.id} o={o} max={maxQty} masked={investorView && o.investorName !== persona.name} />)}
          </ul>
          <div className="my-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px]">
            <span className="text-muted">Spread <span className="font-medium text-foreground tabular">{book.spread !== undefined ? fmtPrice(book.spread) : "n/a"}</span></span>
            <span className="text-muted">Mid <span className="font-medium text-foreground tabular">{book.mid !== undefined ? fmtPrice(book.mid) : "n/a"}</span></span>
          </div>
          <ul aria-label="Bids">
            {book.bids.map((o) => <BookRow key={o.id} o={o} max={maxQty} masked={investorView && o.investorName !== persona.name} />)}
          </ul>
        </div>
      )}
      {book.blocked.length > 0 && (
        <div className="border-t border-border px-5 py-3.5">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium"><ShieldCheck className="size-4 text-muted" /> Blocked by the compliance engine</div>
          <ul className="flex flex-col gap-2">
            {book.blocked.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="flex min-w-0 items-center gap-2">
                  <CounterpartyAvatar name={o.investorName} masked={investorView} size={22} />
                  <span className="min-w-0">
                  <span className="font-medium">{fmt.sentence(o.side)} {fmt.num(o.quantity)} at {fmtPrice(o.price)}</span>
                  <span className="text-muted"> · {VENUE_LABEL[o.venue]}</span>
                  </span>
                </span>
                <DecisionBadge decision="REJECT" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function BookRow({ o, max, masked }: { o: D.MarketOrder; max: number; masked: boolean }) {
  const remaining = o.quantity - o.filled;
  const sell = o.side === "sell";
  return (
    <li className="relative grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-md px-3 py-1 text-[12.5px]">
      <span aria-hidden className={cn("absolute inset-y-0.5 right-0 rounded-md transition-[width] duration-500", sell ? "bg-danger-soft" : "bg-success-soft")} style={{ width: `${Math.max(4, (remaining / max) * 100)}%` }} />
      <span className="relative"><CounterpartyAvatar name={o.investorName} masked={masked} size={22} /></span>
      <span className={cn("relative font-medium tabular", sell ? "text-danger" : "text-success")}>{fmtPrice(o.price)}</span>
      <span className="relative text-right tabular">{fmt.num(remaining)}{o.status === "partially-filled" && <span className="text-muted"> of {fmt.compact(o.quantity)}</span>}</span>
      <span className="relative truncate text-right text-muted">{VENUE_LABEL[o.venue]}{o.type !== "limit" && ` · ${o.type === "rfq" ? "RFQ" : "Block"}`}</span>
    </li>
  );
}

/* ------------------------------ order ticket --------------------------- */
type Draft = { side: "buy" | "sell"; type: "limit" | "rfq" | "block"; quantity: string; price: string; venue: D.Venue; investorId: string };

function OrderTicket({ token, asset }: { token: D.TokenClass; asset?: D.Asset }) {
  const persona = usePersona();
  const investorView = persona.role === "investor";
  const canTrade = useCan("markets.trade");
  const { book } = useBook(token.id);
  const investors = useInvestors(investorView ? undefined : { pageSize: 100 });
  const fixedInvestor = investorView ? PERSONA_INVESTOR[persona.id] : undefined;

  const [draft, setDraft] = React.useState<Draft>({ side: "buy", type: "limit", quantity: "", price: "", venue: "srh-ats", investorId: fixedInvestor ?? "" });
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});
  const check = usePreTradeCheck();
  const place = usePlaceOrder();
  const rfq = useRequestQuotes();
  const accept = useAcceptQuote();
  const [checkedKey, setCheckedKey] = React.useState<string>();

  // Reset the ticket when the token changes, defaulting the price to the mid.
  React.useEffect(() => {
    setDraft((d) => ({ ...d, quantity: "", price: book.mid !== undefined ? book.mid.toFixed(priceDigits(book.mid)) : "" }));
    check.reset();
    rfq.reset();
    setCheckedKey(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.id]);
  React.useEffect(() => {
    if (!draft.price && book.mid !== undefined) setDraft((d) => ({ ...d, price: book.mid!.toFixed(priceDigits(book.mid!)) }));
  }, [book.mid, draft.price]);
  React.useEffect(() => {
    if (!draft.investorId && !investorView && investors.data?.items.length) setDraft((d) => ({ ...d, investorId: (investors.data!.items.find((i) => (i.kybStatus ?? i.kycStatus) === "approved" && i.classification !== "retail" && i.wallets.some((w) => w.whitelisted && w.riskScore < 60)) ?? investors.data!.items[0]).id }));
  }, [investors.data, draft.investorId, investorView]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v, ...(k === "type" && v === "rfq" ? { venue: "rfq-desk" as D.Venue } : k === "type" && d.venue === "rfq-desk" ? { venue: "srh-ats" as D.Venue } : {}) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const qty = Number(draft.quantity.replace(/,/g, ""));
  const price = Number(draft.price);
  const needsPrice = draft.type !== "rfq";
  const input: MarketOrderInput = { tokenClassId: token.id, investorId: draft.investorId, side: draft.side, type: draft.type, quantity: qty, price: needsPrice ? price : book.mid ?? asset?.valuation.navPerToken ?? 0, venue: draft.venue };
  const key = JSON.stringify(input);
  const stale = !!checkedKey && checkedKey !== key;
  const result = !stale ? check.data : undefined;
  const ccy = asset?.valuation.currency ?? "USD";

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.investorId) e.investorId = "Select the investor placing this order.";
    if (!(qty > 0)) e.quantity = "Enter a quantity greater than zero.";
    else if (!Number.isInteger(qty) && token.decimals === 0) e.quantity = "This token trades in whole units.";
    if (needsPrice && !(price > 0)) e.price = "Enter a price greater than zero.";
    if (draft.type === "block" && qty * (needsPrice ? price : 0) < 250_000) e.quantity = `Block trades start at ${fmt.money(250_000, ccy, { compact: true })} notional.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const runCheck = () => {
    if (!validate()) return;
    rfq.reset();
    setCheckedKey(key);
    check.mutate(input);
  };

  const investorName = investorView ? persona.name : investors.data?.items.find((i) => i.id === draft.investorId)?.name;
  const tradeBlockedTip = !canTrade ? "Your role cannot trade. Switch to the Operations, Platform admin or Investor persona." : undefined;

  return (
    <Card>
      <CardHeader title="Order ticket" description="Check first, then trade." icon={<ArrowRightLeft />} />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Segmented<Draft["side"]> value={draft.side} onChange={(v) => set("side", v)} options={[{ value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }]} />
          <Segmented<Draft["type"]> value={draft.type} onChange={(v) => set("type", v)} options={[{ value: "limit", label: "Limit" }, { value: "rfq", label: "RFQ" }, { value: "block", label: "Block" }]} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={`Quantity (${token.symbol})`} htmlFor="mk-qty" error={errors.quantity} hint={qty > 0 && (needsPrice ? price > 0 : true) ? `Notional ${fmt.money(qty * input.price, ccy)}` : undefined}>
            <Input id="mk-qty" inputMode="decimal" autoComplete="off" placeholder="10,000" className="tabular" value={draft.quantity} aria-invalid={!!errors.quantity} onChange={(e) => set("quantity", e.target.value.replace(/[^\d.,]/g, ""))} />
          </Field>
          {needsPrice ? (
            <Field label={`Limit price (${ccy})`} htmlFor="mk-price" error={errors.price} hint={asset ? `NAV ${fmtPrice(asset.valuation.navPerToken)}` : undefined}>
              <Input id="mk-price" inputMode="decimal" autoComplete="off" className="tabular" value={draft.price} aria-invalid={!!errors.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
          ) : (
            <Field label="Price" hint="Dealers quote a firm price for the full quantity.">
              <Input disabled value="Set by dealer quotes" />
            </Field>
          )}
          <Field label="Venue" htmlFor="mk-venue">
            <NativeSelect id="mk-venue" value={draft.venue} onChange={(e) => set("venue", e.target.value as D.Venue)}>
              {VENUES.filter((v) => (draft.type === "rfq" ? v.id === "rfq-desk" : v.id !== "rfq-desk")).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Investor" htmlFor="mk-inv" error={errors.investorId}>
            {investorView ? (
              <Input id="mk-inv" disabled value={investorName ?? ""} />
            ) : investors.isPending ? (
              <Skeleton className="h-9" />
            ) : (
              <NativeSelect id="mk-inv" value={draft.investorId} aria-invalid={!!errors.investorId} onChange={(e) => set("investorId", e.target.value)}>
                <option value="">Select investor</option>
                {investors.data?.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </NativeSelect>
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] font-medium"><StepDot n={1} done={!!result} /> Pre-trade compliance check</div>
            <Button size="sm" variant={result ? "secondary" : "primary"} onClick={runCheck} isLoading={check.isPending} loadingText="Checking…"><ShieldCheck /> {result ? "Run check again" : "Run pre-trade check"}</Button>
          </div>
          {stale && <p className="text-[12.5px] text-warning">The order changed since the last check. Run the check again before trading.</p>}
          {check.isPending ? (
            <div className="flex flex-col gap-1.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : result ? (
            <PreTradeResult result={result} />
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Checks performed">
              {CHECKS.map((c) => (
                <li key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] text-muted"><c.icon className="size-3.5" />{c.label}</li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn("flex flex-col gap-3 rounded-xl border border-border p-4 transition-opacity", !result && "opacity-60")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] font-medium"><StepDot n={2} done={place.isSuccess || accept.isSuccess} /> {draft.type === "rfq" ? "Request dealer quotes" : `Place ${draft.type} order`}</div>
            {draft.type === "rfq" ? (
              <GuardTip tip={tradeBlockedTip ?? (result?.decision === "REJECT" ? "The pre-trade check rejected this order." : result?.decision === "MANUAL_REVIEW" ? "An RFQ executes at once, so it needs a clear pre-trade check. Place a limit order instead." : !result ? "Run the pre-trade check first." : undefined)}>
                <Button size="sm" variant="primary" disabled={!result || result.decision !== "ALLOW" || !canTrade} isLoading={rfq.isPending} loadingText="Requesting…" onClick={() => { accept.reset(); rfq.mutate(input); }}>
                  <Timer /> Request quotes
                </Button>
              </GuardTip>
            ) : (
              <GuardTip tip={tradeBlockedTip ?? (result?.decision === "REJECT" ? "The pre-trade check rejected this order." : !result ? "Run the pre-trade check first." : undefined)}>
                <Button size="sm" variant="primary" disabled={!result || result.decision === "REJECT" || !canTrade} isLoading={place.isPending} loadingText="Placing…"
                  onClick={() => place.mutate(input, { onSuccess: () => { check.reset(); setCheckedKey(undefined); setDraft((d) => ({ ...d, quantity: "" })); } })}>
                  Place order
                </Button>
              </GuardTip>
            )}
          </div>
          {result?.decision === "MANUAL_REVIEW" && draft.type !== "rfq" && <p className="text-[12.5px] text-warning">The order will be held for compliance review before it can match.</p>}
          {place.data && !result && (
            <p className="flex items-center gap-2 text-[12.5px] text-success"><CircleCheck className="size-4" /> Order <span className="font-mono">{place.data.id}</span> is on the book. Matching orders settle atomically with DvP.</p>
          )}
          {draft.type === "rfq" && <QuoteList quotes={rfq.data} loading={rfq.isPending} input={input} ccy={ccy} accept={accept} onDone={() => { rfq.reset(); check.reset(); setCheckedKey(undefined); }} />}
          {accept.data && !rfq.data && (
            <p className="flex items-center gap-2 text-[12.5px] text-success"><CircleCheck className="size-4" /> Executed {fmt.num(accept.data.quantity)} {token.symbol} at {fmtPrice(accept.data.price)}. Settling via DvP.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function StepDot({ n, done }: { n: number; done: boolean }) {
  return <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-semibold", done ? "bg-success text-white" : "bg-surface-3 text-muted")}>{done ? <CircleCheck className="size-3.5" /> : n}</span>;
}

function GuardTip({ tip, children }: { tip?: string; children: React.ReactNode }) {
  if (!tip) return <>{children}</>;
  return (
    <Tip content={tip}>
      <span tabIndex={0} className="inline-flex rounded-md">{children}</span>
    </Tip>
  );
}

function PreTradeResult({ result }: { result: D.PreTradeCheck }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-muted tabular">{result.checks.filter((c) => c.outcome === "pass").length} of {result.checks.length} checks passed</span>
        <DecisionBadge decision={result.decision} size="lg" />
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2">
        {result.checks.map((c) => (
          <li key={c.name} className="flex items-start gap-2">
            <span className="mt-0.5">{c.outcome === "pass" ? <CircleCheck className="size-4 text-success" aria-label="Pass" /> : c.outcome === "fail" ? <CircleX className="size-4 text-danger" aria-label="Fail" /> : <CirclePause className="size-4 text-warning" aria-label="Review" />}</span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-medium">{c.name}</span>
              <span className="block text-[12px] text-muted">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteList({ quotes, loading, input, ccy, accept, onDone }: { quotes?: D.RfqQuote[]; loading: boolean; input: MarketOrderInput; ccy: string; accept: ReturnType<typeof useAcceptQuote>; onDone: () => void }) {
  const [receivedAt, setReceivedAt] = React.useState(0);
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    if (!quotes) return;
    const t0 = Date.now();
    setReceivedAt(t0);
    setNow(t0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [quotes]);
  if (loading) return <div className="flex flex-col gap-1.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!quotes) return null;
  if (!quotes.length) return <EmptyState title="No dealer responded" description="Request quotes again or place a limit order instead." className="py-6" />;
  const best = input.side === "buy" ? Math.min(...quotes.map((q) => q.price)) : Math.max(...quotes.map((q) => q.price));
  const elapsed = Math.floor((now - receivedAt) / 1000);
  const allExpired = quotes.every((q) => q.expiresInSec - elapsed <= 0);
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {[...quotes].sort((a, b) => (input.side === "buy" ? a.price - b.price : b.price - a.price)).map((q) => {
          const left = Math.max(0, q.expiresInSec - elapsed);
          const expired = left === 0;
          return (
            <li key={q.id} className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5", expired && "opacity-50")}>
              <CompanyLogo name={q.dealer} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13px] font-medium"><span className="truncate">{q.dealer}</span>{q.price === best && !expired && <Badge tone="success">Best</Badge>}</span>
                <span className="block text-[12px] text-muted tabular">{fmt.num(q.quantity)} at {fmtPrice(q.price)} · {fmt.money(q.quantity * q.price, ccy)}</span>
              </span>
              <span className={cn("inline-flex items-center gap-1 text-[12px] tabular", left <= 5 ? "text-danger" : "text-muted")} aria-live="off"><Clock className="size-3.5" />{expired ? "Expired" : `${left}s`}</span>
              <Button size="sm" variant={q.price === best ? "primary" : "secondary"} disabled={expired || accept.isPending} isLoading={accept.isPending && accept.variables?.quote.id === q.id} loadingText="Executing…" onClick={() => accept.mutate({ input, quote: q }, { onSuccess: onDone })}>
                {expired ? "Expired" : "Accept"}
              </Button>
            </li>
          );
        })}
      </ul>
      {allExpired && <p className="text-[12.5px] text-muted">All quotes expired. Request quotes again for fresh prices.</p>}
    </div>
  );
}

/* ----------------------------- recent trades --------------------------- */
function RecentTrades({ token, investorView }: { token: D.TokenClass; investorView: boolean }) {
  const persona = usePersona();
  const { data, isPending, error, refetch } = useTrades(token.id);
  const masked = (name: string) => investorView && name !== persona.name;
  const columns: Column<D.Trade>[] = [
    { key: "time", header: "Time", cell: (t) => <span className="text-muted tabular">{fmt.dateShort(t.executedAt)} {fmt.time(t.executedAt).slice(0, 5)}</span>, sort: (t) => t.executedAt },
    { key: "qty", header: "Quantity", align: "right", cell: (t) => fmt.num(t.quantity), sort: (t) => t.quantity },
    { key: "price", header: "Price", align: "right", cell: (t) => fmtPrice(t.price), sort: (t) => t.price },
    { key: "buyer", header: "Buyer", cell: (t) => <span className="block max-w-[190px]"><Counterparty name={t.buyer} masked={masked(t.buyer)} size={22} /></span>, hideBelow: "md" },
    { key: "seller", header: "Seller", cell: (t) => <span className="block max-w-[190px]"><Counterparty name={t.seller} masked={masked(t.seller)} size={22} /></span>, hideBelow: "md" },
    { key: "venue", header: "Venue and settlement", cell: (t) => <span>{VENUE_LABEL[t.venue]}<span className="text-muted"> · {t.settlement === "dvp" ? "DvP" : t.settlement === "atomic" ? "Atomic" : "Asynchronous"}</span></span>, hideBelow: "xl" },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { key: "tx", header: "Transaction", cell: (t) => (t.txHash ? <CopyText value={t.txHash} /> : <span className="text-subtle">Pending</span>), hideBelow: "sm" },
  ];
  return (
    <Card>
      <CardHeader title="Recent trades" description={`${token.symbol} executions`} />
      <DataTable
        rows={data}
        columns={columns}
        getRowId={(t) => t.id}
        loading={isPending}
        error={error}
        onRetry={() => refetch()}
        defaultSort={{ key: "time", dir: "desc" }}
        pageSize={8}
        caption="Recent trades"
        empty={{ icon: <ArrowRightLeft />, title: "No trades yet", description: `Trades in ${token.symbol} appear here as soon as they match.` }}
      />
    </Card>
  );
}

/* --------------------------------- venues ------------------------------- */
function VenuePanel() {
  const tenant = useCurrentTenant();
  const rows = VENUES.map((v) => {
    const resp = tenant.responsibilities.find((r) => r.activity === v.activity);
    const lic = tenant.licences.filter((l) => l.activities.includes(v.activity));
    const active = lic.find((l) => l.status === "active");
    const pending = lic.find((l) => l.status === "pending");
    let state: "permitted" | "pending" | "routed" | "blocked";
    let detail: string;
    if (active) {
      state = "permitted";
      detail = `Permitted under ${active.reference.startsWith(active.regulator) ? "" : `${active.regulator} `}${active.reference}`;
    } else if (pending) {
      state = "pending";
      detail = `Licence pending: ${pending.regulator} ${pending.reference.includes("MTF") ? "MTF " : ""}application`;
    } else if (resp?.type === "external-provider" && !/not enabled|not applicable/i.test(resp.entity)) {
      state = "routed";
      detail = `Routed to ${resp.entity}`;
    } else {
      state = "blocked";
      detail = `No licence covering ${v.activity.replace("-", " ")}`;
    }
    return { ...v, state, detail, reference: (active ?? pending)?.reference };
  });
  const tone = { permitted: "success", pending: "warning", routed: "info", blocked: "danger" } as const;
  const label = { permitted: "Permitted", pending: "Pending", routed: "Routed", blocked: "Not permitted" };
  return (
    <Card>
      <CardHeader icon={<Landmark />} title="Venue permissions" description={`From ${tenant.shortName} licences`} />
      <ul className="divide-y divide-border">
        {rows.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Tip content={v.description}><span tabIndex={0} className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><v.icon className="size-4" /></span></Tip>
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{v.label}</div>
                <div className={cn("truncate text-[12px]", v.state === "pending" ? "text-warning" : v.state === "blocked" ? "text-danger" : "text-muted")}>{v.detail}</div>
              </div>
            </div>
            <Badge tone={tone[v.state]} dot>{label[v.state]}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function MarketsPage() {
  return (
    <React.Suspense>
      <MarketsView />
    </React.Suspense>
  );
}
