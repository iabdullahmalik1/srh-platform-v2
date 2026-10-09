"use client";

import * as React from "react";
import { ArrowDownToLine, Building, CircleCheck, FileSignature, KeyRound, Layers, ListFilter, Lock, MapPin, PenLine, ShieldCheck, Snowflake, UserRound, Vault, Wallet } from "lucide-react";
import type * as D from "@/types/domain";
import { useCustodyAccounts } from "@/hooks/api";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, PageHeader, Skeleton, Stat, Tip } from "@/components/ui/primitives";
import { ChainBadge, Money } from "@/components/domain/status";
import { CompanyLogo } from "@/components/domain/logos";
import { SrhMark } from "@/components/brand/srh-logo";
import { FlowJoin, FlowLine, FlowNode } from "@/components/flows/flow";
import { KeyQuorum } from "@/components/flows/keys";
import { cn, fmt, sum } from "@/lib/utils";

const TYPE_LABEL: Record<D.CustodyAccount["type"], string> = { omnibus: "Omnibus", segregated: "Segregated", "mpc-vault": "MPC vault", "hsm-vault": "HSM vault" };

const ADAPTERS: { name: string; match: string; kind: string; logo?: boolean }[] = [
  { name: "Komainu", match: "Komainu", kind: "Qualified custodian", logo: true },
  { name: "Fireblocks", match: "Fireblocks", kind: "MPC wallets", logo: true },
  { name: "Copper", match: "Copper", kind: "Custody and off-exchange settlement", logo: true },
  { name: "BitGo", match: "BitGo", kind: "Qualified custody", logo: true },
  { name: "Thales Luna HSM", match: "Thales", kind: "HSM signing", logo: true },
  { name: "Bank custodian", match: "Bank", kind: "Securities sub-custody", logo: true },
  { name: "Self-custody", match: "Self", kind: "Whitelisted investor wallets" },
];

/** Generic objects every provider maps to, in two lanes: what is held, and how it moves. */
const CONCEPTS: { lane: string; items: { term: string; icon: React.ElementType; detail: string }[] }[] = [
  {
    lane: "Holding",
    items: [
      { term: "Custodian", icon: Building, detail: "The regulated party that safeguards assets for clients." },
      { term: "Custody account", icon: Layers, detail: "A container of positions held for one client or pool, omnibus or segregated." },
      { term: "Vault or wallet", icon: Vault, detail: "A set of keys that controls addresses. A vault is a policy-controlled wallet run by MPC or an HSM." },
      { term: "Address", icon: MapPin, detail: "A chain-specific destination derived from a wallet." },
      { term: "Asset position", icon: ArrowDownToLine, detail: "The quantity of a token held in an account at a point in time." },
    ],
  },
  {
    lane: "Control",
    items: [
      { term: "Signing policy", icon: ShieldCheck, detail: "Quorum, limits and whitelist rules that a transaction must satisfy." },
      { term: "Transaction request", icon: FileSignature, detail: "A proposed transfer, mint or burn waiting for signatures." },
      { term: "Signer", icon: KeyRound, detail: "A person or device that holds a key share and can approve." },
      { term: "Transaction approval", icon: PenLine, detail: "A recorded signature against a request under the signing policy." },
      { term: "Broadcast", icon: CircleCheck, detail: "Once the quorum signs, the provider broadcasts the transaction and the platform records the result." },
    ],
  },
];

export default function CustodyPage() {
  const { data, isPending, error, refetch } = useCustodyAccounts();
  const accounts = data ?? [];
  const byAdapter = (name: string) => accounts.filter((a) => a.custodian.includes(ADAPTERS.find((x) => x.name === name)!.match));
  const connected = new Set(ADAPTERS.filter((x) => byAdapter(x.name).length > 0).map((x) => x.name));
  const frozen = accounts.filter((a) => a.status === "frozen").length;

  return (
    <>
      <PageHeader title="Custody and wallets" description="One custody interface for every provider." />

      <Card className="mb-5">
        <CardHeader icon={<Layers />} title="Custody abstraction" description="Providers can be added or replaced without changing workflows." />
        <CardBody>
          <div className="flex flex-col items-stretch lg:flex-row lg:items-center">
            <FlowNode
              media={<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-border"><SrhMark size={24} /></span>}
              title="SRH platform"
              sub="Every module"
              tip="Every module raises custody actions in one format: account, policy and transaction request."
              className="lg:w-[190px] lg:shrink-0"
            />
            <FlowJoin />
            <FlowNode icon={ShieldCheck} tone="primary" title="Custody integration layer" sub="Policies and requests" tip="Translates platform requests into each provider's API and normalises balances, signatures and webhooks back." className="lg:w-[252px] lg:shrink-0" />
            <FlowJoin delay={0.4} />
            <ul className="relative grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:pl-6 lg:before:absolute lg:before:bottom-[26px] lg:before:left-0 lg:before:top-[26px] lg:before:w-px lg:before:bg-border-strong">
              {ADAPTERS.map((a, i) => {
                const list = byAdapter(a.name);
                const live = connected.has(a.name);
                return (
                  <li key={a.name} className="relative flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                    <FlowLine tone={live ? "brand" : "muted"} pulse={live} delay={i * 0.25} className="absolute -left-6 top-1/2 hidden w-6 -translate-y-1/2 lg:flex" />
                    {a.logo ? <CompanyLogo name={a.name} size={34} /> : <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-surface-3 text-muted"><UserRound className="size-4" aria-hidden /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{a.name}</div>
                      <div className="truncate text-[12px] text-muted">{a.kind}</div>
                    </div>
                    {isPending ? (
                      <Skeleton className="h-5 w-16" />
                    ) : live ? (
                      <Tip content={`${list.length} account${list.length === 1 ? "" : "s"}, ${fmt.money(sum(list, (x) => x.balanceUsd), "USD", { compact: true })} held`}>
                        <span tabIndex={0} className="inline-flex"><Badge tone="success" dot>{list.length} in use</Badge></span>
                      </Tip>
                    ) : (
                      <Badge tone="neutral">Available</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </CardBody>
      </Card>

      {error && !data ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Assets under custody" icon={<Vault />} loading={isPending} value={fmt.money(sum(accounts, (a) => a.balanceUsd), "USD", { compact: true })} sub="USD at current valuation" />
            <Stat label="Custody accounts" icon={<Wallet />} loading={isPending} value={accounts.length} sub={`${connected.size} providers in use`} />
            <Stat label="Frozen accounts" icon={<Snowflake />} loading={isPending} value={<span className={cn(frozen > 0 && "text-danger")}>{frozen}</span>} sub={frozen ? "Outbound transfers blocked" : "None frozen"} />
          </div>

          {isPending ? (
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          ) : accounts.length === 0 ? (
            <Card className="mb-5"><EmptyState icon={<Vault />} title="No custody accounts" description="Accounts appear here once a custodian adapter is connected for this tenant." /></Card>
          ) : (
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {accounts.map((a) => <AccountCard key={a.id} a={a} />)}
            </div>
          )}
        </>
      )}

      <Card>
        <CardHeader title="Concepts the platform understands" description="Every provider maps to these objects, so policy and audit work the same everywhere." />
        <CardBody className="flex flex-col gap-4">
          {CONCEPTS.map((lane) => (
            <div key={lane.lane} className="flex flex-col gap-2 xl:flex-row xl:items-center">
              <span className="w-20 shrink-0 text-[12px] font-medium text-muted">{lane.lane}</span>
              <ol className="flex flex-1 flex-wrap items-center gap-y-2">
                {lane.items.map((c, i) => (
                  <React.Fragment key={c.term}>
                    <li>
                      <Tip content={c.detail}>
                        <span tabIndex={0} className="inline-flex h-8 cursor-help items-center gap-1.5 rounded-full border border-border bg-surface-2 pl-1.5 pr-3 text-[12.5px] font-medium hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="grid size-5 place-items-center rounded-full bg-surface text-muted shadow-1"><c.icon className="size-3" aria-hidden /></span>
                          {c.term}
                        </span>
                      </Tip>
                    </li>
                    {i < lane.items.length - 1 && <li aria-hidden className="flex"><FlowLine tone="muted" pulse={false} arrow className="w-5 sm:w-7" /></li>}
                  </React.Fragment>
                ))}
              </ol>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

function AccountCard({ a }: { a: D.CustodyAccount }) {
  const { quorum, signers, dailyLimitUsd, whitelistOnly } = a.signingPolicy;
  const frozen = a.status === "frozen";
  return (
    <Card className={cn("flex flex-col p-5", frozen && "border-danger/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo name={a.custodian} size={36} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold" title={a.label}>{a.label}</div>
            <div className="truncate text-[12.5px] text-muted">{a.custodian}</div>
          </div>
        </div>
        {frozen ? <Badge tone="danger" dot>Frozen</Badge> : <Badge tone="success" dot>Active</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="outline">{TYPE_LABEL[a.type]}</Badge>
        <ChainBadge chain={a.chain} />
        <CopyText value={a.address} lead={8} tail={6} className="ml-auto" />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[12px] text-muted">Balance</div>
          <Money value={a.balanceUsd} compact className="text-[22px] font-semibold tracking-tight" />
        </div>
        <div className="text-right">
          <div className="text-[12px] text-muted">Assets held</div>
          <div className="text-[15px] font-semibold tabular">{a.assetsHeld}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-muted">Signing policy</span>
          <KeyQuorum quorum={quorum} signers={signers} size={24} frozen={frozen} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-2.5 text-[12px]">
          <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-muted" aria-hidden /><span className="text-muted">Daily</span><span className="font-semibold tabular">{fmt.money(dailyLimitUsd, "USD", { compact: true })}</span></span>
          {whitelistOnly ? (
            <span className="inline-flex items-center gap-1.5 font-medium"><ListFilter className="size-3.5 text-success" aria-hidden /> Whitelist only</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium"><ListFilter className="size-3.5 text-warning" aria-hidden /> Any approved</span>
          )}
        </div>
      </div>
    </Card>
  );
}
