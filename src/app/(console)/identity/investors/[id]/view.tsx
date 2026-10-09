"use client";

import { useRouteId } from "@/hooks/route-id";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Briefcase, CalendarCheck, Check, FileText, Gavel, History, Info, Landmark, Layers, MapPin, Newspaper, Plus, ShieldCheck, Wallet as WalletIcon, Workflow, X, Users } from "lucide-react";
import type * as D from "@/types/domain";
import { useAddWallet, useAssets, useAudit, useCheckEligibility, useDecideKyc, useHoldings, useInvestor, useOfferings, useOrders, useSetWhitelist } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, CopyText, EmptyState, ErrorState, Field, Input, KeyValue, NativeSelect, Skeleton, Switch, Textarea, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, SheetContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { CompanyPanel, VerificationPanel } from "@/components/identity/verification-panel";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LifecycleRail } from "@/components/domain/lifecycle-rail";
import { EligibilityResultView } from "@/components/domain/decision-views";
import { ChainBadge, ClassificationBadge, Flag, Money, RiskBadge, StageBadge, StatusBadge } from "@/components/domain/status";
import { SERIES } from "@/components/domain/charts";
import { CompanyName, NetworkLogo, PersonAvatar, PersonName } from "@/components/domain/logos";
import { AssetThumb } from "@/components/domain/media";
import { NetworkField } from "@/components/domain/network-field";
import { ActorAvatar, IconChip, IconTile, PartyAvatar } from "@/components/visual/bits";
import {
  AccreditationExpiry, CHAINS, CUSTODIANS, DOC_LABEL, ENTITY_TYPE_LABEL, IdentityStatusBadge, RiskScore, WALLET_TYPE_LABEL,
  countryName, custodianRequired, identityStatus, walletAddressError,
} from "@/components/identity/shared";
import { CHAIN_META, ROLE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

export default function InvestorDetailPage() {
  const id = useRouteId();
  const { data: inv, isPending, error, refetch } = useInvestor(id);
  const canDecideKyc = useCan("kyc.decide");

  if (error && !inv) {
    return (
      <>
        <BackLink />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </>
    );
  }
  if (isPending || !inv) return <DetailSkeleton />;

  const status = identityStatus(inv);
  const decidable = canDecideKyc && (status === "in-review" || status === "pending");

  return (
    <>
      <BackLink />
      <ProfileHero
        inv={inv}
        actions={
          <>
            <EligibilitySheet investor={inv} />
            {decidable && (
              <>
                <KycDecisionDialog investor={inv} decision="rejected" />
                <KycDecisionDialog investor={inv} decision="approved" />
              </>
            )}
          </>
        }
      />

      {(status === "in-review" || status === "pending") && !canDecideKyc && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px]">
          <IconTile icon={ShieldCheck} tone="warning" size="sm" className="bg-surface" />
          <span className="font-medium">{inv.type === "entity" ? "KYB" : "KYC"} awaits compliance sign-off.</span>
          <Tip content="Approving or rejecting needs the Compliance officer role. Switch persona from the account menu."><Info className="size-4 text-warning" tabIndex={0} aria-label="Who can decide" /></Tip>
        </div>
      )}

      <Tabs defaultValue={inv.profileComplete === false ? "verification" : "profile"}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="verification" count={(inv.verification ?? []).filter((v) => ["pending", "missing", "failed"].includes(v.status)).length || undefined}>Verification</TabsTrigger>
          {inv.type === "entity" && <TabsTrigger value="company">Company</TabsTrigger>}
          <TabsTrigger value="wallets" count={inv.wallets.length}>Wallets</TabsTrigger>
          {inv.type === "entity" && <TabsTrigger value="owners" count={inv.beneficialOwners.length}>Beneficial owners</TabsTrigger>}
          <TabsTrigger value="documents" count={inv.documents.length}>Documents</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab inv={inv} /></TabsContent>
        <TabsContent value="verification"><VerificationPanel inv={inv} /></TabsContent>
        {inv.type === "entity" && <TabsContent value="company"><CompanyPanel inv={inv} /></TabsContent>}
        <TabsContent value="wallets"><WalletsTab inv={inv} /></TabsContent>
        {inv.type === "entity" && <TabsContent value="owners"><OwnersTab inv={inv} /></TabsContent>}
        <TabsContent value="documents"><DocumentsTab inv={inv} /></TabsContent>
        <TabsContent value="holdings"><HoldingsTab investorId={inv.id} /></TabsContent>
        <TabsContent value="orders"><OrdersTab investorId={inv.id} /></TabsContent>
        <TabsContent value="activity"><ActivityTab investorId={inv.id} /></TabsContent>
      </Tabs>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/identity/investors" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground">
      <ArrowLeft className="size-4" /> Investors
    </Link>
  );
}

/* ---------------------------------- hero ---------------------------------- */
function ProfileHero({ inv, actions }: { inv: D.Investor; actions: React.ReactNode }) {
  const entity = inv.type === "entity";
  const status = identityStatus(inv);
  const verified = status === "approved";
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-1 animate-enter" aria-labelledby="investor-name">
      <div className="relative h-24 overflow-hidden bg-navy-2 sm:h-28">
        <NetworkField className="absolute inset-0 size-full opacity-50" density={26} color="225, 37, 27" linkDistance={100} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--navy-2)_15%,transparent)]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(255_255_255/0.08),transparent_55%)]" />
      </div>
      <div className="relative px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <span className="relative -mt-12 inline-block w-fit rounded-full bg-surface p-1 shadow-2 sm:-mt-14">
              {entity ? (
                <span className="block rounded-[22px] bg-surface p-1"><PartyAvatar name={inv.name} type="entity" logo={inv.logo} size={88} /></span>
              ) : (
                <PersonAvatar name={inv.name} src={inv.avatar} size={96} />
              )}
              {verified && (
                <Tip content={`${entity ? "KYB" : "KYC"} approved`}>
                  <span tabIndex={0} className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full bg-success text-white ring-[3px] ring-surface"><BadgeCheck className="size-4" aria-label="Verified" /></span>
                </Tip>
              )}
            </span>
            <div className="min-w-0 pb-0.5">
              <h1 id="investor-name" className="break-words text-[24px] font-semibold leading-8 tracking-tight md:text-[26px]">{inv.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                <span>{entity ? ENTITY_TYPE_LABEL[inv.entityType ?? "corporate"] : "Individual investor"}</span>
                <span aria-hidden>·</span>
                <CopyText value={inv.id} display={inv.id} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ClassificationBadge c={inv.classification} />
                <IdentityStatusBadge investor={inv} />
                <RiskBadge risk={inv.amlRisk} />
                {inv.pep && <Badge tone="warning">PEP</Badge>}
                {inv.sanctionsHit && <Badge tone="danger" dot>Sanctions hit</Badge>}
                {inv.adverseMedia && <Badge tone="warning">Adverse media</Badge>}
                {inv.profileComplete === false && <Badge tone="warning" dot>Profile incomplete</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <IconChip icon={MapPin} title="Residency">{countryName(inv.residency)}</IconChip>
          <IconChip icon={Briefcase} title="Total invested"><Money value={inv.totalInvested} compact={inv.totalInvested >= 1_000_000} digits={inv.totalInvested >= 1_000_000 ? undefined : 0} /></IconChip>
          <IconChip icon={Layers} title="Positions">{inv.holdingsCount} {inv.holdingsCount === 1 ? "position" : "positions"}</IconChip>
          <IconChip icon={WalletIcon} title="Linked wallets">{inv.wallets.length} {inv.wallets.length === 1 ? "wallet" : "wallets"}</IconChip>
          <IconChip icon={CalendarCheck} title="Onboarded">{fmt.date(inv.onboardedAt)}</IconChip>
          <Tip content="Relationship manager">
            <span tabIndex={0} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface pl-0.5 pr-2.5 text-[12.5px] font-medium">
              <PersonAvatar name={inv.relationshipManager} size={24} />
              {inv.relationshipManager}
            </span>
          </Tip>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- profile -------------------------------- */
function ProfileTab({ inv }: { inv: D.Investor }) {
  const entity = inv.type === "entity";
  const identity = [
    { label: "Investor ID", value: <CopyText value={inv.id} display={inv.id} /> },
    { label: entity ? "Entity type" : "Investor type", value: entity ? ENTITY_TYPE_LABEL[inv.entityType ?? "corporate"] : "Individual" },
    { label: entity ? "Legal name" : "Full name", value: inv.name },
    ...(entity ? [{ label: "Registration number", value: inv.registrationNumber ?? "Not provided" }] : []),
    { label: "Email", value: <a className="hover:underline" href={`mailto:${inv.email}`}>{inv.email}</a> },
    { label: "Phone", value: inv.phone ?? <span className="text-muted">Not provided</span> },
    { label: entity ? "Country of incorporation" : "Country", value: countryName(inv.country) },
    { label: "Residency", value: <Flag country={inv.residency} /> },
    ...(!entity ? [{ label: "Citizenship", value: countryName(inv.citizenship) }] : []),
    { label: "Classification", value: <ClassificationBadge c={inv.classification} /> },
    { label: "Accreditation expires", value: <AccreditationExpiry iso={inv.accreditationExpiresAt} /> },
    { label: "Identity provider", value: inv.kycProvider },
    { label: "KYC status", value: <StatusBadge status={inv.kycStatus} /> },
    ...(entity ? [{ label: "KYB status", value: <StatusBadge status={inv.kybStatus ?? "not-started"} /> }] : []),
    { label: "Onboarded", value: fmt.date(inv.onboardedAt) },
    { label: "Last reviewed", value: fmt.date(inv.lastReviewedAt) },
  ];
  const flags = [
    { label: "Sanctions", icon: Gavel, hit: inv.sanctionsHit, bad: "Confirmed match. Transfers and subscriptions are blocked.", ok: "No match on consolidated lists" },
    { label: "PEP", icon: Landmark, hit: inv.pep, bad: "Politically exposed person. Enhanced due diligence applies to every subscription.", ok: "Not a politically exposed person" },
    { label: "Adverse media", icon: Newspaper, hit: inv.adverseMedia, bad: "Adverse media on file. Review before approving new activity.", ok: "No adverse media found" },
  ];
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader icon={<BadgeCheck />} title="Identity" description={`Verified by ${inv.kycProvider}`} />
        <CardBody><KeyValue items={identity} /></CardBody>
      </Card>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader icon={<ShieldCheck />} title="Screening" description="ComplyAdvantage, latest run" action={<RiskBadge risk={inv.amlRisk} />} />
          <ul className="grid grid-cols-3 gap-2 p-4">
            {flags.map((f) => (
              <li key={f.label}>
                <Tip content={f.hit ? f.bad : f.ok}>
                  <div tabIndex={0} className={cn("flex h-full flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center", f.hit ? "border-danger/30 bg-danger-soft" : "border-border bg-surface-2")}>
                    <span className="relative">
                      <IconTile icon={f.icon} tone={f.hit ? "danger" : "neutral"} className={f.hit ? "bg-surface" : "bg-surface shadow-1"} />
                      <span className={cn("absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full ring-2 ring-surface", f.hit ? "bg-danger text-white" : "bg-success text-white")}>
                        {f.hit ? <X className="size-2.5" strokeWidth={3.5} /> : <Check className="size-2.5" strokeWidth={3.5} />}
                      </span>
                    </span>
                    <span className="text-[12.5px] font-medium leading-tight">{f.label}</span>
                    <span className={cn("text-[11.5px]", f.hit ? "font-medium text-danger" : "text-success")}>{f.hit ? "Match" : "Clear"}</span>
                  </div>
                </Tip>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={<Users />} title="Relationship" />
          <CardBody className="flex flex-col gap-4">
            <PersonName name={inv.relationshipManager} sub="Relationship manager" size={40} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                <div className="text-[12px] text-muted">Total invested</div>
                <div className="text-[17px] font-semibold"><Money value={inv.totalInvested} compact={inv.totalInvested >= 1_000_000} /></div>
              </div>
              <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                <div className="text-[12px] text-muted">Positions</div>
                <div className="text-[17px] font-semibold tabular">{inv.holdingsCount}</div>
              </div>
            </div>
            {inv.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{inv.tags.map((t) => <Badge key={t} tone="outline">{t}</Badge>)}</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------- wallets -------------------------------- */
function WalletsTab({ inv }: { inv: D.Investor }) {
  const canDecide = useCan("compliance.decide");
  const canWrite = useCan("investors.write");
  const setWl = useSetWhitelist();

  const columns: Column<D.Wallet>[] = [
    { key: "label", header: "Label", cell: (w) => <span className="inline-flex items-center gap-2.5"><span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3"><WalletIcon className="size-4 text-muted" /><NetworkLogo chain={w.chain} size={14} className="absolute -bottom-1 -right-1 ring-2 ring-surface" /></span><span className="font-medium">{w.label}</span></span>, sort: (w) => w.label },
    { key: "chain", header: "Chain", cell: (w) => <ChainBadge chain={w.chain} />, sort: (w) => w.chain },
    { key: "address", header: "Address", cell: (w) => <CopyText value={w.address} lead={8} tail={6} /> },
    { key: "type", header: "Type", cell: (w) => WALLET_TYPE_LABEL[w.type], hideBelow: "md" },
    { key: "custodian", header: "Custodian", cell: (w) => (w.custodian ? <CompanyName name={w.custodian} size={22} /> : <span className="text-muted">Self held</span>), hideBelow: "lg" },
    { key: "risk", header: "Risk score", cell: (w) => <RiskScore score={w.riskScore} />, sort: (w) => w.riskScore, hideBelow: "sm" },
    {
      key: "whitelisted",
      header: "Whitelisted",
      align: "center",
      cell: (w) => {
        const pending = setWl.isPending && setWl.variables?.walletId === w.id;
        const sw = (
          <Switch
            label={`Whitelist ${w.label} wallet`}
            checked={w.whitelisted}
            disabled={!canDecide || pending}
            onCheckedChange={(v) => setWl.mutate({ investorId: inv.id, walletId: w.id, whitelisted: v })}
          />
        );
        return canDecide ? (
          <span className="inline-flex items-center justify-center">{sw}</span>
        ) : (
          <Tip content="Changing the identity registry needs the Compliance officer role.">
            <span className="inline-flex items-center justify-center" tabIndex={0}>{sw}</span>
          </Tip>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader
        icon={<WalletIcon />}
        title={<span className="inline-flex items-center gap-1.5">Linked wallets <Tip content="Tokens are minted or transferred only to whitelisted wallets. A risk score of 60 or more cannot be whitelisted."><Info className="size-3.5 text-subtle" tabIndex={0} aria-label="Whitelisting rules" /></Tip></span>}
        description="Whitelisted wallets can receive tokens"
        action={canWrite && <AddWalletDialog investorId={inv.id} />}
      />
      <DataTable
        rows={inv.wallets}
        columns={columns}
        getRowId={(w) => w.id}
        caption="Linked wallets"
        empty={{ icon: <WalletIcon />, title: "No wallets linked", description: "Link a wallet so tokens can be minted to this investor.", action: canWrite ? <AddWalletDialog investorId={inv.id} /> : undefined }}
      />
    </Card>
  );
}

function AddWalletDialog({ investorId }: { investorId: string }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ label: string; chain: D.Chain; type: D.WalletType; custodian: string; address: string }>({ label: "", chain: "ethereum", type: "custodial", custodian: CUSTODIANS[0], address: "" });
  const [errors, setErrors] = React.useState<Partial<Record<"label" | "address" | "custodian", string>>>({});
  const add = useAddWallet();
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };

  const submit = () => {
    const e: typeof errors = {};
    if (!form.label.trim()) e.label = "Give the wallet a label, for example Primary or Treasury";
    const addrErr = walletAddressError(form.chain, form.address);
    if (addrErr) e.address = addrErr;
    if (custodianRequired(form.type) && !form.custodian.trim()) e.custodian = "Choose the custodian that controls this wallet";
    setErrors(e);
    const first = (["label", "custodian", "address"] as const).find((k) => e[k]);
    if (first) return document.getElementById(`wal-${first}`)?.focus();
    add.mutate(
      { investorId, wallet: { label: form.label.trim(), chain: form.chain, type: form.type, address: form.address.trim(), custodian: custodianRequired(form.type) ? form.custodian : undefined } },
      { onSuccess: () => { setOpen(false); setForm({ label: "", chain: "ethereum", type: "custodial", custodian: CUSTODIANS[0], address: "" }); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus /> Add wallet</Button>
      <DialogContent
        title="Add wallet"
        description="The wallet is screened by Chainalysis when linked. Whitelisting is a separate compliance step."
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant="primary" onClick={submit} isLoading={add.isPending} loadingText="Linking…">Link wallet</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Label" htmlFor="wal-label" error={errors.label} required className="sm:col-span-2">
            <Input id="wal-label" value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Treasury" aria-invalid={!!errors.label} />
          </Field>
          <Field label="Chain" htmlFor="wal-chain">
            <NativeSelect id="wal-chain" value={form.chain} onChange={(e) => set({ chain: e.target.value as D.Chain })}>
              {CHAINS.map((c) => <option key={c} value={c}>{CHAIN_META[c].label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Custody type" htmlFor="wal-type">
            <NativeSelect id="wal-type" value={form.type} onChange={(e) => set({ type: e.target.value as D.WalletType })}>
              {(Object.keys(WALLET_TYPE_LABEL) as D.WalletType[]).map((t) => <option key={t} value={t}>{WALLET_TYPE_LABEL[t]}</option>)}
            </NativeSelect>
          </Field>
          {custodianRequired(form.type) && (
            <Field label="Custodian" htmlFor="wal-custodian" error={errors.custodian} required className="sm:col-span-2">
              <NativeSelect id="wal-custodian" value={form.custodian} onChange={(e) => set({ custodian: e.target.value })} aria-invalid={!!errors.custodian}>
                {CUSTODIANS.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </Field>
          )}
          <Field label="Address" htmlFor="wal-address" error={errors.address} required className="sm:col-span-2" hint={form.chain === "solana" ? "Base58, 32 to 44 characters" : "0x followed by 40 hexadecimal characters"}>
            <Input id="wal-address" className="font-mono text-[12.5px]" value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder={form.chain === "solana" ? "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" : "0x71cb683a2b73380eaae57cce4a113eb63d29c590"} autoComplete="off" spellCheck={false} aria-invalid={!!errors.address} />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- owners --------------------------------- */
function OwnersTab({ inv }: { inv: D.Investor }) {
  const owners = inv.beneficialOwners;
  const total = owners.reduce((s, o) => s + o.ownershipPct, 0);
  const columns: Column<D.BeneficialOwner>[] = [
    { key: "name", header: "Name", cell: (o) => <PersonName name={o.name} size={30} sub={`${fmt.pct(o.ownershipPct, o.ownershipPct % 1 ? 1 : 0)} ownership`} />, sort: (o) => o.name },
    { key: "pct", header: "Ownership", align: "right", cell: (o) => fmt.pct(o.ownershipPct, o.ownershipPct % 1 ? 1 : 0), sort: (o) => o.ownershipPct },
    { key: "nationality", header: "Nationality", cell: (o) => <Flag country={o.nationality} />, hideBelow: "sm" },
    { key: "pep", header: "PEP", cell: (o) => (o.pep ? <Badge tone="warning">PEP</Badge> : <span className="text-muted">No</span>) },
    { key: "verified", header: "Verified", cell: (o) => <StatusBadge status={o.verified ? "verified" : "pending"} /> },
  ];
  return (
    <Card>
      <CardHeader icon={<Users />} title="Beneficial owners" description="Owners of 25% or more are verified individually" />
      {owners.length > 0 && (
        <CardBody className="border-b border-border">
          <div className="mb-2 flex items-center justify-between text-[12.5px] text-muted">
            <span>Ownership disclosed</span>
            <span className="tabular">{fmt.pct(total, 0)} of 100%</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3" role="img" aria-label={owners.map((o) => `${o.name} ${o.ownershipPct}%`).join(", ")}>
            {owners.map((o, i) => (
              <span key={o.id} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${o.ownershipPct}%`, background: SERIES[i % SERIES.length] }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {owners.map((o, i) => (
              <li key={o.id} className="inline-flex items-center gap-1.5 text-[12.5px]">
                <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[i % SERIES.length] }} aria-hidden />
                <PersonAvatar name={o.name} size={20} />
                <span>{o.name}</span>
                <span className="text-muted tabular">{fmt.pct(o.ownershipPct, 0)}</span>
              </li>
            ))}
            {total < 100 && (
              <li className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                <span className="size-2.5 rounded-[3px] bg-surface-3 ring-1 ring-border-strong" aria-hidden />
                Below threshold or undisclosed <span className="tabular">{fmt.pct(100 - total, 0)}</span>
              </li>
            )}
          </ul>
        </CardBody>
      )}
      <DataTable rows={owners} columns={columns} getRowId={(o) => o.id} caption="Beneficial owners" defaultSort={{ key: "pct", dir: "desc" }} empty={{ icon: <Users />, title: "No beneficial owners recorded", description: "Add owners through a KYB refresh before this entity can subscribe." }} />
    </Card>
  );
}

/* -------------------------------- documents ------------------------------- */
function DocumentsTab({ inv }: { inv: D.Investor }) {
  return (
    <Card>
      <CardHeader icon={<FileText />} title="Documents" description={`Verified by ${inv.kycProvider}`} action={inv.documents.length ? <span className="text-[12.5px] text-muted tabular">{inv.documents.filter((d) => d.status === "verified").length} of {inv.documents.length} verified</span> : undefined} />
      {inv.documents.length ? (
        <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {inv.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <IconTile icon={FileText} tone={d.status === "verified" ? "success" : d.status === "pending" ? "warning" : "danger"} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" title={d.name}>{DOC_LABEL[d.kind]}</div>
                <div className="truncate text-[12px] text-muted">{fmt.date(d.uploadedAt)}</div>
              </div>
              <StatusBadge status={d.status} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FileText />} title="No documents on file" description="Documents appear here once they are uploaded through onboarding or a periodic review." />
      )}
    </Card>
  );
}

/* -------------------------------- holdings -------------------------------- */
function HoldingsTab({ investorId }: { investorId: string }) {
  const { data, isPending, error, refetch } = useHoldings({ filters: { investorId } });
  const { data: assets } = useAssets();
  const assetName = (id: string) => assets?.find((a) => a.id === id)?.name ?? id;
  const columns: Column<D.Holding>[] = [
    {
      key: "asset",
      header: "Product",
      cell: (h) => {
        const a = assets?.find((x) => x.id === h.assetId);
        return (
          <Link href={`/assets/${h.assetId}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-w-0 items-center gap-3 font-medium hover:underline">
            {a && <AssetThumb asset={a} className="h-9 w-12" />}
            <span className="max-w-[240px] truncate">{assetName(h.assetId)}</span>
          </Link>
        );
      },
      sort: (h) => assetName(h.assetId),
    },
    { key: "chain", header: "Chain", cell: (h) => <ChainBadge chain={h.chain} />, hideBelow: "sm" },
    { key: "qty", header: "Quantity", align: "right", cell: (h) => fmt.num(h.quantity), sort: (h) => h.quantity },
    { key: "owner", header: "Legal owner", cell: (h) => <span className="block max-w-[220px] truncate">{h.legalOwner}{h.nominee ? <span className="text-muted"> (nominee)</span> : null}</span>, hideBelow: "md" },
    { key: "locked", header: "Locked until", align: "right", cell: (h) => (h.frozen ? <Badge tone="info">Frozen</Badge> : h.lockedUntil && new Date(h.lockedUntil).getTime() > Date.now() ? <span className="tabular">{fmt.date(h.lockedUntil)}</span> : <span className="text-muted">Unlocked</span>), sort: (h) => h.lockedUntil ?? "", hideBelow: "sm" },
  ];
  return (
    <Card>
      <CardHeader icon={<Layers />} title="Holdings" description="Reconciled to chain and custodian records" />
      <DataTable rows={data} columns={columns} getRowId={(h) => h.id} loading={isPending} error={error} onRetry={() => refetch()} caption="Holdings" defaultSort={{ key: "qty", dir: "desc" }} empty={{ icon: <Layers />, title: "No holdings yet", description: "Positions appear here after the first subscription is minted." }} />
    </Card>
  );
}

/* --------------------------------- orders --------------------------------- */
function OrdersTab({ investorId }: { investorId: string }) {
  const { data, isPending, error, refetch } = useOrders({ filters: { investorId } });
  const { data: assets } = useAssets();
  const columns: Column<D.Order>[] = [
    { key: "id", header: "Order", cell: (o) => <Link href={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12.5px] font-medium hover:underline">{o.id}</Link>, sort: (o) => o.id },
    { key: "asset", header: "Product", cell: (o) => { const a = assets?.find((x) => x.id === o.assetId); return <span className="inline-flex items-center gap-2">{a && <AssetThumb asset={a} className="h-7 w-9 rounded-md" />}{a?.shortName ?? o.assetId}</span>; }, hideBelow: "md" },
    { key: "amount", header: "Amount", align: "right", cell: (o) => <Money value={o.amount} currency={o.currency} />, sort: (o) => o.amount },
    { key: "lifecycle", header: "Lifecycle", cell: (o) => <LifecycleRail order={o} variant="compact" />, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (o) => <StageBadge stage={o.stage} status={o.status} /> },
    { key: "updated", header: "Updated", align: "right", cell: (o) => <span className="text-muted">{fmt.relative(o.updatedAt)}</span>, sort: (o) => o.updatedAt, hideBelow: "sm" },
  ];
  return (
    <Card>
      <CardHeader icon={<Workflow />} title="Orders" description="Subscriptions through the order lifecycle" />
      <DataTable rows={data} columns={columns} getRowId={(o) => o.id} loading={isPending} error={error} onRetry={() => refetch()} caption="Orders" defaultSort={{ key: "updated", dir: "desc" }} empty={{ icon: <Workflow />, title: "No orders yet", description: "Subscriptions placed for this investor appear here.", action: <Button asChild size="sm"><Link href="/orders/new">New subscription</Link></Button> }} />
    </Card>
  );
}

/* -------------------------------- activity -------------------------------- */
function ActivityTab({ investorId }: { investorId: string }) {
  const { data, isPending, error, refetch } = useAudit({ search: investorId });
  const items = data?.items ?? [];
  return (
    <Card>
      <CardHeader icon={<History />} title="Activity" description="Hash-chained audit records, newest first" action={<Button asChild size="sm" variant="ghost"><Link href="/audit">Audit trail</Link></Button>} />
      {error && !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={<History />} title="No activity recorded" description="Decisions, wallet changes and screening results for this investor appear here." />
      ) : (
        <ol className="px-5 py-4">
          {items.map((e, i) => (
            <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < items.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-28px)] w-px bg-border" />}
              <span className="shrink-0"><ActorAvatar actor={e.actor} size={28} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono text-[12.5px] font-medium">{e.action}</span>
                  <span className="text-[12px] text-muted tabular">{fmt.dateTime(e.at)}</span>
                </div>
                <div className="text-[12.5px] text-muted">
                  {e.actor.name} · {e.actor.role === "system" ? "System" : ROLE_META[e.actor.role].label}
                  {e.reason ? ` · ${e.reason}` : ""}
                </div>
                {(e.previousState || e.newState) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
                    {e.previousState && <Badge tone="outline">{e.previousState}</Badge>}
                    {e.previousState && e.newState && <span className="text-subtle">to</span>}
                    {e.newState && <Badge tone="neutral">{e.newState}</Badge>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ------------------------------ KYC decision ------------------------------ */
function KycDecisionDialog({ investor, decision }: { investor: D.Investor; decision: "approved" | "rejected" }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [err, setErr] = React.useState<string>();
  const decide = useDecideKyc();
  const approve = decision === "approved";
  const kind = investor.type === "entity" ? "KYB" : "KYC";
  const submit = () => {
    if (!note.trim()) {
      setErr("Add a decision note. It is stored with the decision in the audit trail.");
      return document.getElementById(`kyc-note-${decision}`)?.focus();
    }
    decide.mutate({ id: investor.id, decision, note: note.trim() }, { onSuccess: () => { setOpen(false); setNote(""); } });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErr(undefined); }}>
      <Button variant={approve ? "primary" : "secondary"} onClick={() => setOpen(true)}>{approve ? <Check /> : <X />} {approve ? "Approve" : "Reject"}</Button>
      <DialogContent
        size="sm"
        title={approve ? `Approve ${kind} for ${investor.name}` : `Reject ${kind} for ${investor.name}`}
        description={approve ? "The investor becomes eligible for products that match their classification and residency." : "The investor cannot subscribe or receive transfers until a new review is completed."}
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button variant={approve ? "success" : "danger"} onClick={submit} isLoading={decide.isPending} loadingText={approve ? "Approving…" : "Rejecting…"}>{approve ? "Approve" : "Reject"}</Button>
          </>
        }
      >
        <Field label="Decision note" htmlFor={`kyc-note-${decision}`} error={err} required>
          <Textarea id={`kyc-note-${decision}`} value={note} onChange={(e) => { setNote(e.target.value); setErr(undefined); }} aria-invalid={!!err} placeholder={approve ? "Documents and liveness verified. Source of funds consistent with declared employment." : "Proof of address older than three months. Requested a new document."} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- eligibility sheet ---------------------------- */
function EligibilitySheet({ investor }: { investor: D.Investor }) {
  const [open, setOpen] = React.useState(false);
  const [assetId, setAssetId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [walletId, setWalletId] = React.useState(investor.wallets[0]?.id ?? "");
  const [err, setErr] = React.useState<{ asset?: string; amount?: string }>({});
  const { data: assets, isPending: assetsLoading } = useAssets();
  const { data: offerings } = useOfferings();
  const check = useCheckEligibility();
  const live = (assets ?? []).filter((a) => a.status === "live");
  const offering = React.useMemo(() => {
    const forAsset = (offerings ?? []).filter((o) => o.assetId === assetId);
    return forAsset.find((o) => o.status === "open") ?? forAsset[0];
  }, [offerings, assetId]);

  const run = () => {
    const e: typeof err = {};
    if (!assetId) e.asset = "Choose a product to evaluate against";
    const n = amount ? Number(amount.replace(/,/g, "")) : undefined;
    if (amount && (!Number.isFinite(n) || (n ?? 0) <= 0)) e.amount = "Enter a positive amount, or leave it empty";
    setErr(e);
    if (e.asset) return document.getElementById("elig-asset")?.focus();
    if (e.amount) return document.getElementById("elig-amount")?.focus();
    check.mutate({ investorId: investor.id, assetId, offeringId: offering?.id, amount: n, walletId: walletId || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" onClick={() => setOpen(true)}><ShieldCheck /> Check eligibility</Button>
      <SheetContent
        title="Check eligibility"
        description={`Evaluate ${investor.name} against a live product. Nothing is submitted.`}
        footer={
          <>
            <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
            <Button variant="primary" onClick={run} isLoading={check.isPending} loadingText="Evaluating…">Run check</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Product" htmlFor="elig-asset" error={err.asset} required hint={offering ? `Offering: ${offering.name} (${offering.status})` : undefined}>
            <NativeSelect id="elig-asset" value={assetId} disabled={assetsLoading} onChange={(e) => { setAssetId(e.target.value); setErr((x) => ({ ...x, asset: undefined })); check.reset(); }} aria-invalid={!!err.asset}>
              <option value="">{assetsLoading ? "Loading products…" : "Choose a live product"}</option>
              {live.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Amount${offering ? ` (${offering.currency})` : ""}`} htmlFor="elig-amount" error={err.amount} hint="Optional. Adds ticket size, capacity and holding limit checks.">
              <Input id="elig-amount" inputMode="decimal" className="tabular" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, "")); setErr((x) => ({ ...x, amount: undefined })); }} placeholder={offering ? fmt.num(offering.minTicket) : "250,000"} aria-invalid={!!err.amount} />
            </Field>
            <Field label="Wallet" htmlFor="elig-wallet">
              <NativeSelect id="elig-wallet" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                <option value="">No wallet check</option>
                {investor.wallets.map((w) => <option key={w.id} value={w.id}>{w.label} · {CHAIN_META[w.chain].label}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="border-t border-border pt-4">
            {check.data ? (
              <EligibilityResultView result={check.data} />
            ) : check.isPending ? (
              <div className="flex flex-col gap-2"><Skeleton className="h-16" /><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : (
              <EmptyState icon={<ShieldCheck />} title="No evaluation yet" description="Choose a product and run the check to see each rule and the decision." className="py-8" />
            )}
          </div>
        </div>
      </SheetContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-24" />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <Skeleton className="h-24 rounded-none sm:h-28" />
        <div className="flex items-end gap-5 px-6 pb-5">
          <Skeleton className="-mt-12 size-24 rounded-full ring-4 ring-surface" />
          <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-7 w-64 max-w-full" /><Skeleton className="h-5 w-48" /></div>
        </div>
        <div className="flex gap-2 border-t border-border px-6 py-4"><Skeleton className="h-7 w-28 rounded-full" /><Skeleton className="h-7 w-24 rounded-full" /><Skeleton className="h-7 w-32 rounded-full" /></div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}
