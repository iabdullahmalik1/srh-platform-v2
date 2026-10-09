"use client";

import { useRouteId } from "@/hooks/route-id";
import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, ArrowRightLeft, ArrowUpRight, CircleAlert, CircleCheck, Coins, ExternalLink, Flame, KeyRound, ListChecks, Lock, LockOpen, Pause, Play, Plus, Scale, ShieldCheck, Snowflake, Sun, UserCog } from "lucide-react";
import type * as D from "@/types/domain";
import { useApprovals, useAsset, useDeployChain, useTokenClass, useTokenOperation } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { IssuancePanel } from "@/components/assets/asset-panels";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, Field, Input, KeyValue, NativeSelect, PageHeader, Skeleton, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SERIES } from "@/components/domain/charts";
import { ApprovalSteps } from "@/components/domain/decision-views";
import { ChainBadge, RiskBadge, StatusBadge } from "@/components/domain/status";
import { CHAIN_META } from "@/lib/constants";
import { CHAINS, isValidAddress } from "@/components/assets/meta";
import { ChoiceCard, NumberInput } from "@/components/assets/form-bits";
import { NetworkLogo, PersonAvatar } from "@/components/domain/logos";
import { FlowLine, InfoTip } from "@/components/flows/flow";
import { TokenModelFlow } from "@/components/flows/token-model";
import { cn, fmt, sum } from "@/lib/utils";

type OpMeta = {
  op: D.TokenOperation;
  label: string;
  verb: string;
  icon: React.ComponentType<{ className?: string }>;
  control: keyof D.TokenClass["controls"];
  description: string;
  amount?: boolean;
  from?: string;
  to?: string;
  high?: boolean;
};

const OPERATIONS: OpMeta[] = [
  { op: "mint", label: "Mint", verb: "Request mint", icon: Coins, control: "mintable", description: "Issue new units to the treasury wallet after settlement.", amount: true },
  { op: "burn", label: "Burn", verb: "Request burn", icon: Flame, control: "burnable", description: "Cancel units on redemption, maturity or correction.", amount: true },
  { op: "pause", label: "Pause", verb: "Request pause", icon: Pause, control: "pausable", description: "Halt every transfer on one deployment." },
  { op: "unpause", label: "Unpause", verb: "Request unpause", icon: Play, control: "pausable", description: "Resume transfers on a paused deployment." },
  { op: "freeze", label: "Freeze", verb: "Request freeze", icon: Snowflake, control: "freezable", description: "Freeze transfers for this token class on one deployment.", high: true },
  { op: "unfreeze", label: "Unfreeze", verb: "Request unfreeze", icon: Sun, control: "freezable", description: "Lift a freeze once the cause is resolved." },
  { op: "forced-transfer", label: "Forced transfer", verb: "Request forced transfer", icon: ArrowRightLeft, control: "forcedTransfer", description: "Move units between wallets under court order or regulator instruction.", amount: true, from: "From wallet", to: "To wallet", high: true },
  { op: "recovery", label: "Recovery", verb: "Request recovery", icon: KeyRound, control: "recovery", description: "Reissue a verified investor's full balance to a new wallet after key loss.", from: "Lost wallet", to: "New wallet", high: true },
];

export default function TokenDetailPage() {
  const id = useRouteId();
  const { data: token, isPending, error, refetch } = useTokenClass(id);
  const { data: asset } = useAsset(token?.assetId ?? "");
  const canRequest = useCan("tokens.request");

  if (error && !token) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>;
  if (isPending || !token) return <DetailSkeleton />;

  const deployedSupply = sum(token.deployments, (d) => d.supply);
  const diff = deployedSupply - token.canonicalSupply;
  const holders = sum(token.deployments, (d) => d.holders);

  const columns: Column<D.ChainDeployment>[] = [
    { key: "chain", header: "Chain", cell: (d) => <ChainBadge chain={d.chain} />, sort: (d) => d.chain },
    {
      key: "contract",
      header: "Contract",
      cell: (d) =>
        d.contractAddress === "pending" ? (
          <span className="text-subtle">Awaiting deployment</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <CopyText value={d.contractAddress} />
            <a href={`${CHAIN_META[d.chain].explorer}/token/${d.contractAddress}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted hover:text-foreground" aria-label={`Open on ${CHAIN_META[d.chain].label} explorer`}>
              <ExternalLink className="size-3.5" />
            </a>
          </span>
        ),
    },
    { key: "supply", header: "Supply", align: "right", cell: (d) => fmt.num(d.supply), sort: (d) => d.supply },
    { key: "holders", header: "Holders", align: "right", cell: (d) => fmt.num(d.holders), sort: (d) => d.holders, hideBelow: "sm" },
    { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} />, sort: (d) => d.status },
    { key: "block", header: "Last block", align: "right", cell: (d) => (d.lastBlock ? fmt.num(d.lastBlock) : "…"), hideBelow: "lg" },
    { key: "deployed", header: "Deployed", cell: (d) => <span className="text-muted">{fmt.date(d.deployedAt)}</span>, sort: (d) => d.deployedAt, hideBelow: "md" },
  ];

  return (
    <>
      <Link href="/tokens" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Token factory
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{token.symbol}</span>
            <StatusBadge status={token.status} />
            <Badge tone="outline">{token.standard}</Badge>
          </span>
        }
        description={<>{token.name}{asset && <> · representing <Link href={`/assets/${asset.id}`} className="font-medium text-foreground hover:underline">{asset.name}</Link></>}</>}
        actions={
          <>
            {asset && <Button asChild variant="secondary"><Link href={`/assets/${asset.id}`}>View product <ArrowUpRight /></Link></Button>}
            <DeployDialog token={token} disabled={!canRequest} />
          </>
        }
      />

      <Card className="mb-5">
        <CardBody>
          <TokenModelFlow token={token} asset={asset} />
        </CardBody>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Canonical supply reconciles across deployments"
            description="Sum of deployments equals the canonical supply."
            action={diff === 0 ? <Badge tone="success" dot>Reconciled</Badge> : <Badge tone="danger" dot>{diff > 0 ? "+" : ""}{fmt.num(diff)} difference</Badge>}
          />
          <CardBody className="flex flex-col gap-5">
            {token.deployments.length ? (
              <SupplyStack deployments={token.deployments} canonical={token.canonicalSupply} />
            ) : (
              <EmptyState title="No deployments" description="Add a deployment to put this token class on a chain." className="py-6" />
            )}
            <div className={cn("grid grid-cols-1 gap-3 rounded-xl border p-4 text-[13px] sm:grid-cols-3", diff === 0 ? "border-success/25 bg-success-soft" : "border-danger/25 bg-danger-soft")}>
              <div><div className="text-[12px] text-muted">Sum of deployments</div><div className="mt-0.5 font-semibold tabular">{fmt.num(deployedSupply)}</div></div>
              <div><div className="text-[12px] text-muted">Canonical supply</div><div className="mt-0.5 font-semibold tabular">{fmt.num(token.canonicalSupply)}</div></div>
              <div className="flex items-start gap-2">
                {diff === 0 ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />}
                <div>
                  <div className="text-[12px] text-muted">Check</div>
                  <div className={cn("mt-0.5 font-semibold", diff === 0 ? "text-success" : "text-danger")}>{diff === 0 ? "Supplies agree" : "Open a reconciliation break"}</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ShieldCheck />} title="Contract modules" description="Shared by every deployment of this class" />
          <CardBody>
            <KeyValue
              cols={1}
              items={[
                { label: "Identity registry", value: token.identityRegistry === "pending" ? "Deployed at launch" : <CopyText value={token.identityRegistry} lead={10} tail={6} /> },
                { label: "Compliance module", value: token.complianceModule === "pending" ? "Deployed at launch" : <CopyText value={token.complianceModule} lead={10} tail={6} /> },
              ]}
            />
            <KeyValue
              className="mt-4 border-t border-border pt-4"
              items={[
                { label: "Decimals", value: token.decimals },
                { label: "Maximum supply", value: token.maxSupply ? <span className="tabular">{fmt.num(token.maxSupply)}</span> : "Uncapped" },
                { label: "Holders", value: <span className="tabular">{fmt.num(holders)}</span> },
                { label: "Headroom", value: !token.maxSupply ? "n/a" : token.maxSupply >= token.canonicalSupply ? <span className="tabular">{fmt.num(token.maxSupply - token.canonicalSupply)}</span> : <span className="text-danger tabular">Cap exceeded by {fmt.num(token.canonicalSupply - token.maxSupply)}</span> },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
              {OPERATIONS.filter((o, i, a) => a.findIndex((x) => x.control === o.control) === i).map((o) => (
                <Badge key={o.control} tone={token.controls[o.control] ? "brand" : "neutral"}>{token.controls[o.control] ? <Lock className="size-3" /> : <LockOpen className="size-3" />}{fmt.sentence(o.control.replace(/([A-Z])/g, " $1").toLowerCase())}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {token.issuance && <div className="mb-5"><IssuancePanel token={token} /></div>}

      <Card className="mb-5">
        <CardHeader title="Deployments" description={`${token.deployments.length} ${token.deployments.length === 1 ? "chain" : "chains"} · gas spent ${fmt.money(sum(token.deployments, (d) => d.gasSpendUsd), "USD")}`} />
        <DataTable
          rows={token.deployments}
          columns={columns}
          getRowId={(d) => d.id}
          caption="Deployments"
          empty={{ title: "No deployments yet", description: "Use Add deployment to request a contract on a chain.", icon: <Coins /> }}
        />
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ControlsPanel token={token} canRequest={canRequest} />
        <PendingApprovals tokenId={token.id} />
      </div>
    </>
  );
}

/* ------------------------------ controls ------------------------------ */
function ControlsPanel({ token, canRequest }: { token: D.TokenClass; canRequest: boolean }) {
  const anyPaused = token.status === "paused" || token.deployments.some((d) => d.status === "paused");
  const why = (m: OpMeta): string | undefined => {
    if (!canRequest) return "Requesting token operations needs the Operations or Platform admin role.";
    if (!token.controls[m.control]) return `This token class was deployed without the ${m.label.toLowerCase()} capability.`;
    if (!token.deployments.some((d) => d.contractAddress !== "pending")) return "No deployment is live yet.";
    if (m.op === "unpause" && !anyPaused) return "No deployment is paused.";
    if (m.op === "pause" && token.status === "paused") return "The token class is already paused.";
    if (m.op === "unfreeze" && token.status !== "frozen") return "The token class is not frozen.";
    if (m.op === "freeze" && token.status === "frozen") return "The token class is already frozen.";
    return undefined;
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Issuer controls" description="Requests go to approval, then an authorised signer." action={<ApprovalPath compact />} />
      <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        {OPERATIONS.map((m) => {
          const reason = why(m);
          return (
            <li key={m.op} className="flex items-start gap-3 bg-surface p-4">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", m.high ? "bg-warning-soft text-warning" : "bg-surface-3 text-muted")}><m.icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[13px] font-medium">{m.label}<InfoTip content={m.description} label={`About ${m.label.toLowerCase()}`} />{m.high && <Badge tone="warning">High risk</Badge>}</div>
                <div className="mt-2">
                  {reason ? (
                    <Tip content={reason}><span className="inline-block"><Button size="sm" disabled>{m.verb}</Button></span></Tip>
                  ) : (
                    <OperationDialog token={token} meta={m} />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function OperationDialog({ token, meta }: { token: D.TokenClass; meta: OpMeta }) {
  const [open, setOpen] = React.useState(false);
  const live = token.deployments.filter((d) => d.contractAddress !== "pending");
  const [chain, setChain] = React.useState<D.Chain>(live[0]?.chain ?? "ethereum");
  const [amount, setAmount] = React.useState<number>();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const op = useTokenOperation();
  const dep = live.find((d) => d.chain === chain);

  const reset = () => { setAmount(undefined); setFrom(""); setTo(""); setReason(""); setErrors({}); op.reset(); };

  const schema = z
    .object({
      amount: meta.amount ? z.number({ error: "Enter an amount" }).positive("Enter an amount above zero") : z.any(),
      from: meta.from ? z.string().refine((v) => isValidAddress(chain, v.trim()), chain === "solana" ? "Enter a Solana address (base58, 32 to 44 characters)" : "Enter a 0x address with 40 hex characters") : z.any(),
      to: meta.to ? z.string().refine((v) => isValidAddress(chain, v.trim()), chain === "solana" ? "Enter a Solana address (base58, 32 to 44 characters)" : "Enter a 0x address with 40 hex characters") : z.any(),
      reason: z.string().trim().min(10, "Give a reason of at least 10 characters. It is stored with the approval and the audit record."),
    })
    .superRefine((v, ctx) => {
      if (meta.from && meta.to && v.from && v.to && v.from.trim().toLowerCase() === v.to.trim().toLowerCase()) ctx.addIssue({ code: "custom", path: ["to"], message: "The destination must differ from the source wallet" });
      if ((meta.op === "burn" || meta.op === "forced-transfer") && typeof v.amount === "number" && dep && v.amount > dep.supply) ctx.addIssue({ code: "custom", path: ["amount"], message: `Exceeds the ${fmt.num(dep.supply)} units on ${CHAIN_META[chain].label}` });
      if (meta.op === "mint" && typeof v.amount === "number" && token.maxSupply && token.canonicalSupply + v.amount > token.maxSupply) ctx.addIssue({ code: "custom", path: ["amount"], message: `Exceeds maximum supply. Headroom is ${fmt.num(token.maxSupply - token.canonicalSupply)} units.` });
    });

  const submit = () => {
    const r = schema.safeParse({ amount, from, to, reason });
    if (!r.success) {
      const e: Record<string, string> = {};
      r.error.issues.forEach((i) => { const k = String(i.path[0]); if (!e[k]) e[k] = i.message; });
      setErrors(e);
      requestAnimationFrame(() => document.getElementById(`op-${meta.op}-${Object.keys(e)[0]}`)?.focus());
      return;
    }
    op.mutate({ tokenClassId: token.id, operation: meta.op, chain, amount: meta.amount ? amount : undefined, fromWallet: meta.from ? from.trim() : undefined, toWallet: meta.to ? to.trim() : undefined, reason: reason.trim() });
  };

  const done = op.data;
  const fid = (k: string) => `op-${meta.op}-${k}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Button size="sm" variant={meta.high ? "secondary" : "tonal"} onClick={() => setOpen(true)}>{meta.verb}</Button>
      <DialogContent
        title={done ? "Request sent for approval" : `${meta.label} ${token.symbol}`}
        description={done ? done.title : meta.description}
        footer={
          done ? (
            <>
              <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
              <Button asChild variant="primary"><Link href="/approvals"><ListChecks /> Open approvals</Link></Button>
            </>
          ) : (
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant={meta.high ? "danger" : "primary"} isLoading={op.isPending} loadingText="Sending…" onClick={submit}>{meta.verb}</Button>
            </>
          )
        }
      >
        {done ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg bg-success-soft p-3 text-[13px] text-success"><CircleCheck className="mt-0.5 size-4 shrink-0" />Approval {done.id} is waiting for the first approver. Nothing changes on-chain until every step signs.</div>
            <ApprovalSteps steps={done.steps} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Deployment" htmlFor={fid("chain")} hint={dep ? `${fmt.num(dep.supply)} units, ${dep.holders} holders, ${dep.status}` : undefined} required>
              <NativeSelect id={fid("chain")} value={chain} onChange={(e) => { setChain(e.target.value as D.Chain); setErrors({}); }}>
                {live.map((d) => <option key={d.id} value={d.chain}>{CHAIN_META[d.chain].label}</option>)}
              </NativeSelect>
            </Field>
            {meta.amount && (
              <Field label={`Amount (${token.symbol} units)`} htmlFor={fid("amount")} error={errors.amount} required>
                <NumberInput id={fid("amount")} value={amount} onValueChange={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: "" })); }} invalid={!!errors.amount} />
              </Field>
            )}
            {meta.from && (
              <Field label={meta.from} htmlFor={fid("from")} error={errors.from} required>
                <Input id={fid("from")} className="font-mono text-[12.5px]" value={from} onChange={(e) => { setFrom(e.target.value); setErrors((x) => ({ ...x, from: "" })); }} placeholder={chain === "solana" ? "Base58 address" : "0x…"} aria-invalid={!!errors.from} autoComplete="off" spellCheck={false} />
              </Field>
            )}
            {meta.to && (
              <Field label={meta.to} htmlFor={fid("to")} error={errors.to} hint="Must be whitelisted in the identity registry" required>
                <Input id={fid("to")} className="font-mono text-[12.5px]" value={to} onChange={(e) => { setTo(e.target.value); setErrors((x) => ({ ...x, to: "" })); }} placeholder={chain === "solana" ? "Base58 address" : "0x…"} aria-invalid={!!errors.to} autoComplete="off" spellCheck={false} />
              </Field>
            )}
            <Field label="Reason" htmlFor={fid("reason")} error={errors.reason} required>
              <Textarea id={fid("reason")} value={reason} onChange={(e) => { setReason(e.target.value); setErrors((x) => ({ ...x, reason: "" })); }} placeholder={meta.op === "mint" ? "Settled subscriptions for batch 2026-10-07, orders ORD-2611 to ORD-2618." : meta.op === "recovery" ? "Investor lost keys. Identity re-verified by video KYC on 6 Oct 2026, ticket CS-4471." : "Reference the instruction, ticket or order that requires this action."} aria-invalid={!!errors.reason} />
            </Field>
            <div className="rounded-lg bg-surface-2 p-3">
              <div className="mb-2 text-[12.5px] font-medium">Approval path</div>
              <ApprovalPath legal={meta.high} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ deployment ----------------------------- */
function DeployDialog({ token, disabled }: { token: D.TokenClass; disabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  const deployed = new Set(token.deployments.map((d) => d.chain));
  const spl = token.standard === "SPL Token-2022";
  const options = CHAINS.filter((c) => !deployed.has(c));
  const allowed = (c: D.Chain) => (spl ? c === "solana" : true);
  const [chain, setChain] = React.useState<D.Chain | undefined>();
  const deploy = useDeployChain();
  const done = deploy.data;

  if (disabled) {
    return <Tip content="Requesting deployments needs the Operations or Platform admin role."><span><Button variant="primary" disabled><Plus /> Add deployment</Button></span></Tip>;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setChain(undefined); deploy.reset(); } }}>
      <Button variant="primary" onClick={() => setOpen(true)} disabled={options.length === 0}><Plus /> Add deployment</Button>
      <DialogContent
        title={done ? "Deployment request sent" : `Deploy ${token.symbol} on another chain`}
        description={done ? done.title : "The factory deploys the token, identity registry and compliance module. Supply on the new chain moves only by bridge-and-burn, so the canonical supply stays reconciled."}
        footer={
          done ? (
            <>
              <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
              <Button asChild variant="primary"><Link href="/approvals"><ListChecks /> Open approvals</Link></Button>
            </>
          ) : (
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant="primary" disabled={!chain} isLoading={deploy.isPending} loadingText="Sending…" onClick={() => chain && deploy.mutate({ tokenClassId: token.id, chain })}>Request deployment</Button>
            </>
          )
        }
      >
        {done ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg bg-success-soft p-3 text-[13px] text-success"><CircleCheck className="mt-0.5 size-4 shrink-0" />Approval {done.id} needs platform and compliance approval, then an authorised signer.</div>
            <ApprovalSteps steps={done.steps} />
          </div>
        ) : options.length === 0 ? (
          <EmptyState title="Deployed on every supported chain" description="There is no chain left to add." className="py-6" />
        ) : (
          <div role="radiogroup" aria-label="Chain" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((c) => (
              <ChoiceCard key={c} selected={chain === c} disabled={!allowed(c)} onClick={() => setChain(c)}>
                <span className="flex items-center gap-2 text-[13px] font-medium"><NetworkLogo chain={c} size={24} />{CHAIN_META[c].label}</span>
                <span className="mt-1 block text-[12px] text-muted">{allowed(c) ? (c === "solana" ? "SPL Token-2022 mirror with transfer hook" : `${token.standard} via factory`) : "SPL Token-2022 deploys only on Solana"}</span>
              </ChoiceCard>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ visuals -------------------------------- */
function SupplyStack({ deployments, canonical }: { deployments: D.ChainDeployment[]; canonical: number }) {
  const total = Math.max(canonical, sum(deployments, (d) => d.supply)) || 1;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={deployments.map((d) => `${CHAIN_META[d.chain].label} ${fmt.num(d.supply)}`).join(", ")}>
        {deployments.map((d) => (
          <span key={d.id} className="h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full" style={{ width: `${(d.supply / total) * 100}%`, background: SERIES[CHAINS.indexOf(d.chain) % SERIES.length] }} />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {deployments.map((d) => (
          <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: SERIES[CHAINS.indexOf(d.chain) % SERIES.length] }} aria-hidden />
            <NetworkLogo chain={d.chain} size={22} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{CHAIN_META[d.chain].label}</span>
              <span className="block text-[11.5px] text-muted tabular">{fmt.pct((d.supply / total) * 100, 1)}</span>
            </span>
            <span className="text-[13px] font-semibold tabular">{fmt.num(d.supply)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Operations, compliance, optional legal, then the HSM signer quorum. */
function ApprovalPath({ legal, compact }: { legal?: boolean; compact?: boolean }) {
  const steps = [
    { icon: UserCog, label: "Operations" },
    { icon: ShieldCheck, label: "Compliance" },
    ...(legal ? [{ icon: Scale, label: "Legal" }] : []),
    { icon: KeyRound, label: "Signer 3 of 5" },
  ];
  return (
    <ol className={cn("flex flex-wrap items-center gap-y-1.5", compact && "hidden md:flex")} aria-label={`Approval path: ${steps.map((s) => s.label).join(", ")}`}>
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <li>
            <Tip content={s.label}>
              <span tabIndex={0} className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-[11.5px] font-medium", compact ? "size-7 justify-center" : "h-7 px-2", i === steps.length - 1 && "border-brand/40 bg-brand-soft text-brand-ink")}>
                <s.icon className="size-3.5" aria-hidden />
                {!compact && s.label}
              </span>
            </Tip>
          </li>
          {i < steps.length - 1 && <li aria-hidden className="flex"><FlowLine tone="muted" pulse={!compact} arrow className={compact ? "w-4" : "w-5"} delay={i * 0.3} /></li>}
        </React.Fragment>
      ))}
    </ol>
  );
}

/* ------------------------------ approvals ------------------------------ */
function PendingApprovals({ tokenId }: { tokenId: string }) {
  const { data, isPending, error, refetch } = useApprovals();
  const pending = (data ?? []).filter((a) => a.objectId === tokenId && a.status === "pending");
  return (
    <Card className="self-start">
      <CardHeader title="Pending approvals for this token" description="Requests waiting on approvers or signers" action={<Button asChild variant="ghost" size="sm"><Link href="/approvals" aria-label="All approvals"><span className="hidden sm:inline">All approvals</span><span className="sm:hidden">All</span> <ArrowUpRight /></Link></Button>} />
      {isPending ? (
        <div className="flex flex-col gap-3 p-5"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} className="py-8" />
      ) : pending.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="Nothing waiting" description="Operations you request on this token appear here until every approver signs." className="py-10" />
      ) : (
        <ul className="divide-y divide-border">
          {pending.map((a) => (
            <li key={a.id} className="px-5 py-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{a.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted"><PersonAvatar name={a.requestedBy} size={18} />{a.requestedBy} · {fmt.relative(a.requestedAt)}</div>
                  {a.summary && <p className="mt-1 text-[12.5px] text-muted">{a.summary}</p>}
                </div>
                <RiskBadge risk={a.risk} />
              </div>
              <ApprovalSteps steps={a.steps} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      <Skeleton className="h-48" />
    </div>
  );
}
