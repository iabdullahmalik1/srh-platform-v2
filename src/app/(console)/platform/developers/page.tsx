"use client";

import * as React from "react";
import { z } from "zod";
import { ArrowLeftRight, Banknote, BookUser, Check, Coins, Copy, History, KeyRound, Layers, Megaphone, Plus, Radio, Send, ShieldCheck, TriangleAlert, Undo2, Users, Webhook, Zap, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useCapabilityCheck, useCheckEligibility, useCreateApiKey, useInvestors, useOrders, useRecentEvents } from "@/hooks/api";
import { useCan, useCurrentTenant } from "@/hooks/session";
import { apiConfig } from "@/services/config";
import { ApiError } from "@/services/errors";
import { Badge, Card, CardBody, CardHeader, Checkbox, CopyText, EmptyState, ErrorState, Field, Input, PageHeader, Skeleton, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/domain/status";
import { IconTile, MetricTile, TenantLogo } from "@/components/visual/bits";
import { cn, fmt } from "@/lib/utils";

/* -------------------------------- catalogue ------------------------------- */
type Wire = "investors" | "assets" | "subscriptions" | "eligibility" | "capability";
interface Endpoint {
  id: string;
  domain: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  summary: string;
  description: string;
  wire?: Wire;
  body?: (ctx: SampleCtx) => unknown;
  sample: unknown;
}
interface SampleCtx { tenantId: string; investorId: string; assetId: string }

const EP: Endpoint[] = [
  { id: "inv-list", domain: "Identity", method: "GET", path: "/investors", summary: "List investors", description: "Paginated investors for the tenant with KYC status, classification and linked wallets. Supports q, page, pageSize and filters such as kyc and classification.", wire: "investors", sample: {} },
  { id: "inv-create", domain: "Identity", method: "POST", path: "/investors", summary: "Create investor", description: "Creates an individual or entity investor and starts KYC or KYB with the configured identity provider.", body: () => ({ type: "individual", name: "Mariam Haddad", email: "mariam@example.com", country: "AE", residency: "AE", classification: "professional", documents: ["passport", "proof-of-address"] }), sample: { id: "inv_8k2m1q", kycStatus: "pending", kycProvider: "Sumsub" } },
  { id: "kyc-decision", domain: "Identity", method: "POST", path: "/kyc/{investorId}/decision", summary: "Record KYC decision", description: "Approves or rejects a KYC case. The note is stored with the decision in the audit trail.", body: (c) => ({ investorId: c.investorId, decision: "approved", note: "Documents verified against registry." }), sample: { id: "inv_8k2m1q", kycStatus: "approved" } },
  { id: "elig", domain: "Compliance", method: "POST", path: "/eligibility/check", summary: "Check eligibility", description: "Evaluates global, jurisdiction, product, offering and investor rules and returns ALLOW, REJECT or MANUAL_REVIEW with every rule outcome.", wire: "eligibility", body: (c) => ({ investorId: c.investorId, assetId: c.assetId, amount: 250000 }), sample: {} },
  { id: "cap", domain: "Compliance", method: "POST", path: "/capabilities/check", summary: "Check regulatory capability", description: "Asks whether the operator may switch on a function for an asset and investor category, based on its licences and responsibility matrix.", wire: "capability", body: (c) => ({ tenantId: c.tenantId, capability: "secondary-trading", assetId: c.assetId, investorCategory: "professional", tradingModel: "order-book" }), sample: {} },
  { id: "alerts", domain: "Compliance", method: "GET", path: "/screening/alerts", summary: "List screening alerts", description: "Open and resolved sanctions, PEP, adverse media and wallet risk alerts.", sample: [{ id: "alr_01", type: "sanctions", severity: "high", status: "open", matchScore: 0.91 }] },
  { id: "assets", domain: "Assets", method: "GET", path: "/assets", summary: "List assets", description: "Asset registry entries with legal entity, instrument, valuation, income and transfer rules.", wire: "assets", sample: {} },
  { id: "asset-create", domain: "Assets", method: "POST", path: "/assets", summary: "Create asset", description: "Structures a new asset from a template, including its SPV, instrument, token class and first offering.", body: () => ({ template: "private-credit", name: "Desert Solar Notes", shortName: "DSN", servicer: "SRH Fund Administration" }), sample: { id: "ast_new01", status: "draft" } },
  { id: "offerings", domain: "Primary market", method: "GET", path: "/offerings", summary: "List offerings", description: "Primary, follow-on and continuous offerings with subscription windows and eligible jurisdictions.", sample: [{ id: "off_tbill", status: "open", pricePerToken: 1.0482, currency: "USD" }] },
  { id: "subs", domain: "Primary market", method: "GET", path: "/subscriptions", summary: "List subscriptions", description: "Subscription orders with their lifecycle stage, payment rail, chain and eligibility decision.", wire: "subscriptions", sample: {} },
  { id: "subs-create", domain: "Primary market", method: "POST", path: "/subscriptions", summary: "Create subscription", description: "Captures a subscription with an idempotency key. Eligibility runs before any payment instruction is issued.", body: (c) => ({ offeringId: "off_tbill", investorId: c.investorId, amount: 250000, rail: "usdc", chain: "polygon", walletId: "wal_01" }), sample: { id: "ord_40513", stage: "submitted", status: "active" } },
  { id: "payments", domain: "Payments and settlement", method: "POST", path: "/payments", summary: "Instruct payment", description: "Issues a payment instruction on a fiat or digital rail for an order or distribution.", body: () => ({ orderId: "ord_40513", rail: "usdc", amount: 250000, currency: "USD" }), sample: { id: "pay_77x", status: "instructed", reference: "SRH-PAY-77X" } },
  { id: "settlements", domain: "Payments and settlement", method: "POST", path: "/settlements", summary: "Settle order", description: "Settles the cash leg against allocation, delivery versus payment where the rail supports it.", body: () => ({ orderId: "ord_40513", model: "dvp" }), sample: { id: "stl_19a", status: "settled", settledAt: "2026-10-07T09:12:00Z" } },
  { id: "tokens", domain: "Tokens", method: "GET", path: "/tokens", summary: "List token classes", description: "Canonical token classes with their deployments, supply and control features.", sample: [{ id: "tok_srht", symbol: "SRHT", standard: "ERC-3643", canonicalSupply: 141385231 }] },
  { id: "token-op", domain: "Tokens", method: "POST", path: "/tokens/{id}/operations", summary: "Request token operation", description: "Requests mint, burn, pause, freeze, forced transfer or recovery. Sensitive operations go to the approval workflow.", body: () => ({ tokenClassId: "tok_srht", operation: "mint", chain: "polygon", amount: 100000, reason: "Allocation for ord_40513" }), sample: { id: "apr_301", status: "pending", type: "mint" } },
  { id: "transfer-check", domain: "Transfers", method: "POST", path: "/transfers/pre-check", summary: "Pre-trade check", description: "Runs buyer, seller, jurisdiction, lock-up, holding limit, balance, venue and wallet checks before a transfer.", body: (c) => ({ tokenClassId: "tok_srht", investorId: c.investorId, side: "buy", type: "limit", quantity: 10000, price: 1.0482, venue: "srh-ats" }), sample: { decision: "ALLOW", checks: [{ name: "Buyer eligibility", outcome: "pass" }] } },
  { id: "transfers", domain: "Transfers", method: "POST", path: "/transfers", summary: "Create transfer", description: "Moves tokens between whitelisted wallets after the compliance engine approves the transfer.", body: () => ({ tokenClassId: "tok_srht", from: "0xa75e…e0b6", to: "0x5083…ed92", quantity: 5000 }), sample: { id: "trf_88", status: "settled", txHash: "0x4b1e…9f20" } },
  { id: "redemptions", domain: "Redemptions", method: "POST", path: "/redemptions", summary: "Request redemption", description: "Requests redemption of units at the next NAV. Tokens are burned when cash is paid.", body: (c) => ({ investorId: c.investorId, tokenClassId: "tok_srht", quantity: 50000, rail: "usdc" }), sample: { id: "red_12", status: "pending-nav", expectedPayment: "T+1" } },
  { id: "holdings", domain: "Registry", method: "GET", path: "/registry/holdings", summary: "List holdings", description: "Investor register with legal and beneficial owner, custodian, lock-up and freeze status per position.", sample: [{ id: "hld_01", investorId: "inv_ahmed", tokenClassId: "tok_srht", quantity: 15472386 }] },
  { id: "recon", domain: "Registry", method: "POST", path: "/reconciliation/runs", summary: "Run reconciliation", description: "Compares chain, transfer agent, custodian, bank and ledger records and reports breaks.", sample: { id: "run_77", status: "clean", recordsCompared: 4210, breaks: 0 } },
  { id: "audit", domain: "Audit", method: "GET", path: "/audit/events", summary: "List audit events", description: "Hash-chained audit records with actor, reason, previous and new state.", sample: { items: [{ id: "aud_01", action: "order.advanced", hash: "9c1f…" }], total: 1 } },
];
const DOMAIN_ORDER = ["Identity", "Compliance", "Assets", "Primary market", "Payments and settlement", "Tokens", "Transfers", "Redemptions", "Registry", "Audit"];
const DOMAIN_ICON: Record<string, LucideIcon> = {
  Identity: Users,
  Compliance: ShieldCheck,
  Assets: Layers,
  "Primary market": Megaphone,
  "Payments and settlement": Banknote,
  Tokens: Coins,
  Transfers: ArrowLeftRight,
  Redemptions: Undo2,
  Registry: BookUser,
  Audit: History,
};

const METHOD_TONE: Record<Endpoint["method"], "success" | "info" | "warning"> = { GET: "success", POST: "info", PUT: "warning", PATCH: "warning" };

export default function DevelopersPage() {
  const tenant = useCurrentTenant();
  return (
    <>
      <PageHeader title="Developers and API" description="Every console action, available over the API." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile icon={Send} tone="info" label="Endpoints" value={EP.length} sub={`${DOMAIN_ORDER.length} groups`} />
        <MetricTile icon={Zap} tone="success" label="Live in this mode" value={EP.filter((e) => e.wire).length} sub={apiConfig.mode === "mock" ? "Mock adapter" : "Backend"} />
        <MetricTile icon={Radio} tone="brand" label="Event types" value={Object.keys(EVENT_DESCRIPTIONS).length} sub="Webhooks and stream" />
        <Card className="flex items-center gap-3.5 p-4">
          <TenantLogo tenant={tenant} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-muted">API keys</div>
            <div className="text-[22px] font-semibold leading-7 tracking-tight tabular">{tenant.apiKeys.length}</div>
            <div className="truncate text-[12px] text-muted">{tenant.shortName}</div>
          </div>
        </Card>
      </div>
      <Tabs defaultValue="explorer">
        <TabsList>
          <TabsTrigger value="explorer">API explorer</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
        </TabsList>
        <TabsContent value="explorer"><Explorer /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="keys"><KeysTab /></TabsContent>
        <TabsContent value="env"><EnvironmentTab /></TabsContent>
      </Tabs>
    </>
  );
}

/* -------------------------------- shared --------------------------------- */
function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); })} aria-label={label}>
      {done ? <Check className="text-success" /> : <Copy />} {done ? "Copied" : label}
    </Button>
  );
}

function CodeBlock({ code, className }: { code: string; className?: string }) {
  return <pre className={cn("max-h-[420px] overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-foreground scrollbar-thin", className)}><code>{code}</code></pre>;
}

const json = (v: unknown) => JSON.stringify(v, null, 2);

/* -------------------------------- explorer ------------------------------- */
type Resp = { status: number; ms: number; body: unknown; note?: string; live: boolean };

function truncate(data: unknown, n = 3): { body: unknown; note?: string } {
  if (Array.isArray(data)) return data.length > n ? { body: data.slice(0, n), note: `Showing ${n} of ${data.length} items` } : { body: data };
  if (data && typeof data === "object" && Array.isArray((data as D.Paginated<unknown>).items)) {
    const p = data as D.Paginated<unknown>;
    return p.items.length > n ? { body: { ...p, items: p.items.slice(0, n) }, note: `Showing ${n} of ${p.items.length} items in this page` } : { body: p };
  }
  return { body: data };
}

const EligibilitySchema = z.object({ investorId: z.string().min(1), assetId: z.string().min(1), offeringId: z.string().optional(), amount: z.number().positive().optional(), walletId: z.string().optional() });
const CapabilitySchema = z.object({
  tenantId: z.string().min(1),
  capability: z.enum(["secondary-trading", "defi-access", "primary-distribution", "custody", "transfer-agency"]),
  assetId: z.string().min(1),
  investorCategory: z.enum(["retail", "professional", "accredited", "qualified-purchaser", "institutional", "market-counterparty"]),
  tradingModel: z.enum(["order-book", "rfq", "otc", "auction", "amm"]).optional(),
});

function Explorer() {
  const tenant = useCurrentTenant();
  const investorsQ = useInvestors();
  const assetsQ = useAssets();
  const ordersQ = useOrders();
  const elig = useCheckEligibility();
  const cap = useCapabilityCheck();

  const [selectedId, setSelectedId] = React.useState("inv-list");
  const ep = EP.find((e) => e.id === selectedId)!;
  const ctx: SampleCtx = { tenantId: tenant.id, investorId: investorsQ.data?.items[0]?.id ?? "inv_ahmed", assetId: assetsQ.data?.find((a) => a.status === "live")?.id ?? assetsQ.data?.[0]?.id ?? "ast_tbill" };
  const ctxKey = `${ctx.tenantId}|${ctx.investorId}|${ctx.assetId}`;
  const [body, setBody] = React.useState("");
  const [bodyError, setBodyError] = React.useState<string>();
  const [resp, setResp] = React.useState<Resp>();
  const [sending, setSending] = React.useState(false);
  const idemKey = React.useMemo(() => `idem_${Math.random().toString(36).slice(2, 12)}`, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setBody(ep.body ? json(ep.body(ctx)) : "");
    setBodyError(undefined);
    setResp(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ctxKey]);

  const send = async () => {
    if (!ep.wire) return;
    let parsed: unknown;
    if (ep.method !== "GET") {
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        return setBodyError(`Body is not valid JSON. ${(e as Error).message}`);
      }
      const schema = ep.wire === "eligibility" ? EligibilitySchema : CapabilitySchema;
      const r = schema.safeParse(parsed);
      if (!r.success) {
        const i = r.error.issues[0];
        return setBodyError(`${i.path.join(".") || "body"}: ${i.message}`);
      }
      parsed = r.data;
    }
    setBodyError(undefined);
    setSending(true);
    const t0 = performance.now();
    try {
      let data: unknown;
      if (ep.wire === "investors" || ep.wire === "assets" || ep.wire === "subscriptions") {
        const q = ep.wire === "investors" ? investorsQ : ep.wire === "assets" ? assetsQ : ordersQ;
        const r = await q.refetch();
        if (r.error) throw r.error;
        data = r.data;
      } else if (ep.wire === "eligibility") {
        data = await elig.mutateAsync(parsed as z.infer<typeof EligibilitySchema>);
      } else {
        data = await cap.mutateAsync(parsed as D.CapabilityRequest);
      }
      const ms = Math.round(performance.now() - t0);
      const t = truncate(data);
      setResp({ status: 200, ms, body: t.body, note: t.note, live: true });
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      const err = e instanceof ApiError ? e : undefined;
      setResp({ status: err?.status ?? 500, ms, body: { error: { code: err?.code ?? "UNKNOWN", message: (e as Error).message, requestId: err?.requestId, details: err?.details } }, live: true });
    } finally {
      setSending(false);
    }
  };

  const headers = [
    ["Authorization", `Bearer ${tenant.apiKeys[0]?.prefix ?? "srh_live_xxxx"}••••••••`],
    ["X-Tenant-Id", tenant.id],
    ["Content-Type", "application/json"],
    ...(ep.method !== "GET" ? [["Idempotency-Key", idemKey]] : []),
  ];
  const url = `${apiConfig.baseUrl}${ep.path}`;
  const curl = [`curl -X ${ep.method} '${url}'`, ...headers.map(([k, v]) => `  -H '${k}: ${k === "Authorization" ? "Bearer $SRH_API_KEY" : v}'`), ...(ep.method !== "GET" && body ? [`  -d '${body.replace(/\s*\n\s*/g, " ")}'`] : [])].join(" \\\n");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="self-start lg:sticky lg:top-20">
        <nav aria-label="Endpoints" className="max-h-[70vh] overflow-y-auto p-2 scrollbar-thin">
          {DOMAIN_ORDER.map((d) => (
            <div key={d} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[12px] font-medium text-muted">
                <IconTile icon={DOMAIN_ICON[d]} size="sm" className={cn("size-6 rounded-md [&_svg]:size-3.5", ep.domain === d && "bg-brand-soft text-brand-ink")} />
                <span className="flex-1">{d}</span>
                <span className="text-[11px] text-subtle tabular">{EP.filter((e) => e.domain === d).length}</span>
              </div>
              <ul>
                {EP.filter((e) => e.domain === d).map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setSelectedId(e.id)} aria-current={e.id === selectedId || undefined}
                      className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors", e.id === selectedId ? "bg-brand-soft" : "hover:bg-surface-2")}>
                      <span className={cn("w-10 shrink-0 font-mono text-[10.5px] font-semibold", e.method === "GET" ? "text-success" : "text-info")}>{e.method}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{e.path}</span>
                      {e.wire && <span className="size-1.5 shrink-0 rounded-full bg-success" title="Live in mock mode" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Card>

      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader
            icon={React.createElement(DOMAIN_ICON[ep.domain] ?? Send)}
            title={<span className="flex flex-wrap items-center gap-2"><Badge tone={METHOD_TONE[ep.method]} className="font-mono">{ep.method}</Badge><span className="break-all font-mono text-[14px]">{ep.path}</span></span>}
            description={`${ep.domain} · ${ep.summary}`}
            action={ep.wire ? <Badge tone="success" dot>Live</Badge> : <Badge tone="neutral">Available in http mode</Badge>}
          />
          <CardBody className="flex flex-col gap-4">
            <p className="text-[13px] text-muted">{ep.description}</p>
            <div>
              <div className="mb-1.5 text-[12.5px] font-medium">Request headers</div>
              <dl className="divide-y divide-border rounded-lg border border-border font-mono text-[12px]">
                {headers.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap gap-x-3 px-3 py-1.5"><dt className="w-36 shrink-0 text-muted">{k}</dt><dd className="min-w-0 break-all">{v}</dd></div>
                ))}
              </dl>
            </div>
            {ep.method !== "GET" && (
              <Field label="Request body" htmlFor="req-body" error={bodyError} hint={ep.wire ? "Validated before sending." : undefined}>
                <Textarea id="req-body" value={body} spellCheck={false} aria-invalid={!!bodyError} onChange={(e) => { setBody(e.target.value); setBodyError(undefined); }} className="min-h-[180px] font-mono text-[12px]" readOnly={!ep.wire} />
              </Field>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {ep.wire ? (
                <Button variant="primary" onClick={send} isLoading={sending} loadingText="Sending…"><Send /> Send request</Button>
              ) : (
                <Tip content="This endpoint is served by the backend. Set NEXT_PUBLIC_API_MODE=http to call it."><span tabIndex={0} className="inline-flex rounded-lg"><Button variant="primary" disabled><Send /> Send request</Button></span></Tip>
              )}
              <CopyButton value={curl} label="Copy as cURL" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Response"
            description={resp ? resp.note ?? "Live response from the active adapter" : ep.wire ? "Send the request to see the live response" : "Sample response from the API reference"}
            action={resp ? (
              <span className="flex items-center gap-2">
                <Badge tone={resp.status < 300 ? "success" : "danger"} className="font-mono">{resp.status}</Badge>
                <span className="text-[12px] text-muted tabular">{resp.ms} ms</span>
                <CopyButton value={json(resp.body)} />
              </span>
            ) : !ep.wire ? <CopyButton value={json(ep.sample)} /> : undefined}
          />
          <CardBody>
            {sending ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={cn("h-4", i % 2 ? "w-2/3" : "w-full")} />)}</div>
            ) : resp ? (
              <CodeBlock code={json(resp.body)} />
            ) : !ep.wire ? (
              <CodeBlock code={json(ep.sample)} />
            ) : (
              <EmptyState icon={<Send />} title="No response yet" description="Send the request to see the live response." className="py-8" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------- events -------------------------------- */
const EVENT_DESCRIPTIONS: Record<D.PlatformEventType, string> = {
  "order.submitted": "A subscription was captured with its idempotency key.",
  "order.eligibility_passed": "The compliance engine allowed the order.",
  "order.eligibility_review": "The order is held for manual compliance review.",
  "order.rejected": "The order was rejected at eligibility or by an operator.",
  "payment.instructed": "A payment instruction was issued on the selected rail.",
  "payment.confirmed": "Funds were received and matched to the instruction.",
  "order.allocated": "Units were allocated against the offering book.",
  "settlement.completed": "The cash leg settled to the issuer.",
  "token.minted": "Tokens were minted to the investor wallet.",
  "ledger.reconciled": "Chain, registry, custodian, bank and ledger agree.",
  "screening.alert": "A sanctions, PEP, adverse media or wallet risk alert was raised.",
  "approval.requested": "A sensitive action entered the approval workflow.",
  "approval.completed": "All approvals were collected and the action executed.",
  "distribution.paid": "A distribution was paid to holders.",
  "recon.break_detected": "Reconciliation found a difference between sources.",
  "provider.degraded": "An external provider breached its latency or error budget.",
  "nav.updated": "A new NAV was published for a product.",
  "trade.settled": "A secondary trade settled on-chain.",
};
const EVENT_TYPES = Object.keys(EVENT_DESCRIPTIONS) as D.PlatformEventType[];
const EVENT_ICON: Record<string, LucideIcon> = { order: Megaphone, payment: Banknote, settlement: ArrowLeftRight, token: Coins, ledger: BookUser, screening: ShieldCheck, approval: Check, distribution: Banknote, recon: History, provider: Webhook, nav: Layers, trade: ArrowLeftRight };

function EventsTab() {
  const tenant = useCurrentTenant();
  const { data, isPending, error, refetch } = useRecentEvents();
  const [type, setType] = React.useState<D.PlatformEventType>("token.minted");
  const real = data?.find((e) => e.type === type);
  const e: D.PlatformEvent = real ?? { id: "evt_sample", type, at: new Date().toISOString(), title: fmt.sentence(type), detail: EVENT_DESCRIPTIONS[type], objectType: type.split(".")[0].replace(/^\w/, (c) => c.toUpperCase()), objectId: "obj_sample", severity: "info" };
  const envelope = { id: e.id, type: e.type, occurredAt: e.at, tenantId: tenant.id, data: { objectType: e.objectType, objectId: e.objectId, title: e.title, detail: e.detail, severity: e.severity } };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader icon={<Radio />} title="Event catalogue" description="Published once, in order, per object" />
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto scrollbar-thin">
            {EVENT_TYPES.map((t) => (
              <li key={t}>
                <button onClick={() => setType(t)} aria-current={t === type || undefined} className={cn("flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors", t === type ? "bg-brand-soft" : "hover:bg-surface-2")}>
                  <IconTile icon={EVENT_ICON[t.split(".")[0]] ?? Radio} size="sm" tone={t === type ? "brand" : "neutral"} />
                  <span className="min-w-0">
                    <span className="block font-mono text-[12.5px] font-medium">{t}</span>
                    <span className="block truncate text-[12px] text-muted">{EVENT_DESCRIPTIONS[t]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="self-start">
          <CardHeader title={<span className="font-mono">{type}</span>} description={real ? `Latest delivery, ${fmt.relative(real.at)}` : "Sample payload. No recent event of this type."} action={<CopyButton value={json(envelope)} />} />
          <CardBody>
            {error && !data ? <ErrorState error={error} onRetry={() => refetch()} /> : isPending ? <Skeleton className="h-60" /> : <CodeBlock code={json(envelope)} />}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader icon={<Webhook />} title={<span className="inline-flex items-center gap-1.5">Webhook endpoints <Tip content="Payloads are signed with HMAC SHA-256 in the X-SRH-Signature header. Failed deliveries retry with exponential backoff for 24 hours."><span tabIndex={0} className="inline-flex"><ShieldCheck className="size-3.5 text-subtle" aria-label="Signing and retries" /></span></Tip></span>} description="Signed payloads, retried for 24 hours" />
        <ul className="divide-y divide-border">
          {[
            { url: `https://hooks.${tenant.domain.split(".").slice(-2).join(".")}/srh/events`, events: "order.*, payment.*, token.minted", status: "active", detail: "Last delivery 2 minutes ago, 200 in 184 ms" },
            { url: "https://warehouse.internal.example/ingest/srh", events: "*", status: "degraded", detail: "3 retries pending, last response 503" },
          ].map((w) => (
            <li key={w.url} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
              <IconTile icon={Webhook} size="sm" tone={w.status === "active" ? "success" : "warning"} />
              <div className="min-w-0">
                <div className="truncate font-mono text-[12.5px]">{w.url}</div>
                <div className="text-[12px] text-muted">{w.events} · {w.detail}</div>
              </div>
              </div>
              <StatusBadge status={w.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* --------------------------------- keys ---------------------------------- */
const SCOPES = ["investors:read", "investors:write", "orders:read", "orders:write", "compliance:check", "tokens:read", "tokens:write", "settlements:write", "*:read"];
type Key = D.Tenant["apiKeys"][number];

function KeysTab() {
  const tenant = useCurrentTenant();
  const canConfigure = useCan("platform.configure");
  const columns: Column<Key>[] = [
    { key: "label", header: "Label", cell: (k) => <span className="inline-flex items-center gap-2.5"><TenantLogo tenant={tenant} size={26} /><span className="font-medium">{k.label}</span></span>, sort: (k) => k.label },
    { key: "prefix", header: "Key", cell: (k) => <span className="font-mono text-[12px] text-muted">{k.prefix}…</span> },
    { key: "scopes", header: "Scopes", cell: (k) => <span className="flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s} tone="outline" className="font-mono">{s}</Badge>)}</span>, hideBelow: "md" },
    { key: "created", header: "Created", cell: (k) => <span className="text-muted">{fmt.date(k.createdAt)}</span>, sort: (k) => k.createdAt, hideBelow: "lg" },
    { key: "used", header: "Last used", align: "right", cell: (k) => <span className="text-muted">{fmt.relative(k.lastUsedAt)}</span>, sort: (k) => k.lastUsedAt },
  ];
  const create = <CreateKeyDialog disabled={!canConfigure} />;
  return (
    <Card>
      <CardHeader icon={<KeyRound />} title="API keys" description={`Scoped server keys for ${tenant.shortName}. Every call is audited.`}
        action={canConfigure ? create : <Tip content="Creating keys needs the Platform admin role."><span tabIndex={0} className="inline-flex rounded-lg">{create}</span></Tip>} />
      <DataTable rows={tenant.apiKeys} columns={columns} getRowId={(k) => k.id} caption="API keys" defaultSort={{ key: "used", dir: "desc" }}
        empty={{ icon: <KeyRound />, title: "No API keys yet", description: "Create a key to call the API from your own systems.", action: canConfigure ? <CreateKeyDialog /> : undefined }} />
    </Card>
  );
}

function CreateKeyDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [scopes, setScopes] = React.useState<string[]>(["orders:read"]);
  const [err, setErr] = React.useState<{ label?: string; scopes?: string }>({});
  const create = useCreateApiKey();
  const secret = create.data?.key;

  const reset = () => { setLabel(""); setScopes(["orders:read"]); setErr({}); create.reset(); };
  const submit = () => {
    const e: typeof err = {};
    if (!label.trim()) e.label = "Name the key after the system that will use it.";
    if (!scopes.length) e.scopes = "Select at least one scope.";
    setErr(e);
    if (Object.keys(e).length) return;
    create.mutate({ label: label.trim(), scopes });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button size="sm" variant="primary" disabled={disabled} onClick={() => setOpen(true)}><Plus /> Create API key</Button>
      <DialogContent
        title={secret ? "API key created" : "Create API key"}
        description={secret ? undefined : "Keys inherit the tenant's module entitlements. Grant only the scopes the integration needs."}
        footer={secret ? (
          <DialogClose asChild><Button variant="primary">I have stored the key</Button></DialogClose>
        ) : (
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="primary" onClick={submit} isLoading={create.isPending} loadingText="Creating…">Create key</Button>
          </>
        )}
      >
        {secret ? (
          <div className="flex flex-col gap-3">
            <div role="alert" className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning"><TriangleAlert className="mt-0.5 size-4 shrink-0" />Copy this key now. It will not be shown again. Store it in your secrets manager.</div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <CopyText value={secret} display={secret} className="min-w-0 text-[12.5px] text-foreground" />
            </div>
            <p className="text-[12.5px] text-muted">Use it in the Authorization header as Bearer {"<key>"} together with X-Tenant-Id.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Label" htmlFor="key-label" error={err.label} required>
              <Input id="key-label" value={label} placeholder="Core banking bridge" aria-invalid={!!err.label} onChange={(e) => { setLabel(e.target.value); setErr((x) => ({ ...x, label: undefined })); }} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-medium">Scopes</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[12.5px]">
                    <Checkbox checked={scopes.includes(s)} onCheckedChange={(v) => { setScopes((x) => (v ? [...x, s] : x.filter((y) => y !== s))); setErr((x) => ({ ...x, scopes: undefined })); }} />
                    <span className="font-mono">{s}</span>
                  </label>
                ))}
              </div>
              {err.scopes && <p role="alert" className="mt-1.5 text-[12px] text-danger">{err.scopes}</p>}
            </fieldset>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- environment ----------------------------- */
function EnvironmentTab() {
  const vars = [
    { name: "NEXT_PUBLIC_API_MODE", value: apiConfig.mode, detail: "mock runs in the browser; http calls the backend." },
    { name: "NEXT_PUBLIC_API_BASE_URL", value: apiConfig.baseUrl, detail: "REST API base URL." },
    { name: "NEXT_PUBLIC_EVENTS_URL", value: apiConfig.eventsUrl, detail: "Server-sent events stream for live updates." },
  ];
  const envFile = `NEXT_PUBLIC_API_MODE=http\nNEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1\nNEXT_PUBLIC_EVENTS_URL=https://api.example.com/v1/events/stream`;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Current configuration" description="Read at build time from environment variables" action={<Badge tone={apiConfig.mode === "mock" ? "warning" : "success"} dot>{apiConfig.mode === "mock" ? "Mock adapter" : "Backend"}</Badge>} />
        <ul className="divide-y divide-border">
          {vars.map((v) => (
            <li key={v.name} className="flex flex-col gap-1 px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[12.5px] font-medium">{v.name}</span>
                <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[12px]">{v.value}</span>
              </div>
              <p className="text-[12.5px] text-muted">{v.detail}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="self-start">
        <CardHeader title="Switch to the backend" description="No UI code changes are needed" action={<CopyButton value={envFile} />} />
        <CardBody className="flex flex-col gap-3 text-[13px]">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted">
            <li>Add the variables below to <span className="font-mono text-foreground">.env.local</span> or your deployment settings.</li>
            <li>Rebuild and restart the console so the values are inlined.</li>
            <li>Sign in again. Requests now carry the session token and X-Tenant-Id to the backend.</li>
          </ol>
          <CodeBlock code={envFile} />
          <p className="text-[12.5px] text-muted">Both adapters share one contract, so the console behaves the same in either mode.</p>
        </CardBody>
      </Card>
    </div>
  );
}
