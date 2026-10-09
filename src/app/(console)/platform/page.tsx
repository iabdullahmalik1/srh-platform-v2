"use client";

import * as React from "react";
import { Blocks, CalendarDays, Cloud, Code2, FileBadge, Gavel, Globe, Info, Landmark, LayoutGrid, MapPin, Paintbrush, Scale, Server, ShieldCheck, Table2, Users, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { useAssets, useCapabilityCheck, useUpdateBrand, useUpdateModules } from "@/hooks/api";
import { useCan, useCurrentTenant } from "@/hooks/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, Field, Input, NativeSelect, PageHeader, Segmented, Skeleton, Switch, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/overlays";
import { DataTable, type Column } from "@/components/ui/data-table";
import { CapabilityResultView } from "@/components/domain/decision-views";
import { StatusBadge } from "@/components/domain/status";
import { CompanyLogo, CompanyName } from "@/components/domain/logos";
import { SrhMark } from "@/components/brand/srh-logo";
import { AvatarStack, IconChip, IconTile, TenantLogo } from "@/components/visual/bits";
import { FlowDiagram } from "@/components/visual/flow";
import { ACTIVITY_ICON, MODULE_ICON } from "@/components/visual/icons";
import { ACTIVITY_LABEL, CLASSIFICATION_LABEL, DEPLOYMENT_META, MODULE_META } from "@/lib/constants";
import { cn, fmt } from "@/lib/utils";

const MODULES = Object.keys(MODULE_META) as D.ModuleKey[];
const ACTIVITIES = Object.keys(ACTIVITY_LABEL) as D.RegulatedActivity[];

const SECTIONS = [
  { id: "profile", label: "Tenant" },
  { id: "modules", label: "Modules" },
  { id: "licences", label: "Licences" },
  { id: "responsibility", label: "Responsibility" },
  { id: "capability", label: "Capability engine" },
  { id: "branding", label: "Branding" },
];

export default function PlatformPage() {
  const tenant = useCurrentTenant();
  const whiteLabel = tenant.deploymentModel === "white-label";
  return (
    <>
      <PageHeader
        title="Tenant and licences"
        description="Entitlements, licences and regulated responsibility."
      />
      <nav aria-label="Sections" className="sticky top-14 z-20 -mx-1 mb-5 overflow-x-auto bg-background/85 px-1 py-2 backdrop-blur scrollbar-thin">
        <ul className="flex gap-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-foreground">{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-5">
        <TenantProfile tenant={tenant} />
        {whiteLabel && <Branding tenant={tenant} emphasised />}
        <ModuleEntitlements tenant={tenant} />
        <Licences tenant={tenant} />
        <ResponsibilityMatrix tenant={tenant} />
        <CapabilityEngine tenant={tenant} />
        {!whiteLabel && <Branding tenant={tenant} />}
      </div>
    </>
  );
}

/* ------------------------------- profile ------------------------------- */
const DEPLOYMENT_ICON: Record<D.DeploymentModel, LucideIcon> = { "own-platform": Landmark, "white-label": Paintbrush, headless: Code2, dedicated: Server };
const DEPLOYMENTS = Object.keys(DEPLOYMENT_META) as D.DeploymentModel[];

function TenantProfile({ tenant }: { tenant: D.Tenant }) {
  const dm = DEPLOYMENT_META[tenant.deploymentModel];
  const active = tenant.licences.filter((l) => l.status === "active");
  const holders = [...new Set(tenant.licences.map((l) => l.holder))];
  const operatorSub = tenant.deploymentModel === "headless" ? "Own apps over API" : tenant.deploymentModel === "own-platform" ? "SRH brand" : "Own brand";
  return (
    <Card id="profile" className="scroll-mt-28 overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="rounded-2xl bg-surface p-1.5 shadow-2 ring-1 ring-border">
            <TenantLogo tenant={tenant} size={68} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight">{tenant.name}</h2>
              <Badge tone={tenant.deploymentModel === "own-platform" ? "brand" : "info"}>{dm.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <IconChip icon={Globe} title="Portal domain"><span className="font-mono text-[12px]">{tenant.domain}</span></IconChip>
              <IconChip icon={Cloud} title={`Hosting: ${tenant.hosting}`}>{tenant.hosting.split("(")[0].trim()}</IconChip>
              <IconChip icon={MapPin} title="Data residency">{tenant.dataResidency}</IconChip>
              <IconChip icon={CalendarDays} title="Tenant created">{fmt.date(tenant.createdAt)}</IconChip>
            </div>
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5 md:max-w-[340px] md:justify-end" aria-label="Deployment models">
          {DEPLOYMENTS.map((d) => {
            const on = d === tenant.deploymentModel;
            const Icon = DEPLOYMENT_ICON[d];
            return (
              <li key={d}>
                <Tip content={DEPLOYMENT_META[d].description}>
                  <span tabIndex={0} aria-current={on || undefined} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium", on ? "border-brand bg-brand-soft text-brand-ink" : "border-border text-muted")}>
                    <Icon className="size-3.5" aria-hidden /> {DEPLOYMENT_META[d].label}
                  </span>
                </Tip>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-border bg-surface-2 p-4 md:px-6">
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
          Deployment model
          <Tip content={dm.description}><Info className="size-3.5" tabIndex={0} aria-label="About this model" /></Tip>
        </div>
        <FlowDiagram
          breakpoint="md"
          label="Deployment model"
          nodes={[
            { key: "op", label: tenant.shortName, sub: `Operator · ${operatorSub}`, media: <TenantLogo tenant={tenant} size={32} />, tip: "Operator that faces investors and regulators" },
            { key: "srh", label: "SRH technology layer", sub: `${tenant.modules.length} modules · ${tenant.hosting.split("(")[0].trim()}`, media: <span className="grid size-8 place-items-center rounded-lg bg-white"><SrhMark size={22} /></span>, tone: "navy", tip: "Tokenization OS: workflows, ledger, adapters and APIs" },
            {
              key: "lic",
              label: `${active.length} active ${active.length === 1 ? "licence" : "licences"}`,
              sub: tenant.licences.length > active.length ? `${tenant.licences.length - active.length} pending or inactive` : "Regulated activity covered",
              media: <AvatarStack parties={holders.map((h) => ({ name: h, type: "entity" as const }))} max={3} size={30} />,
              status: active.length ? "pass" : "review",
              tip: holders.join(", "),
            },
            { key: "inv", label: "Investors", sub: tenant.deploymentModel === "headless" ? "Through the operator's apps" : `On ${tenant.domain}`, icon: Users },
          ]}
        />
      </div>
    </Card>
  );
}

/* ------------------------------- modules ------------------------------- */
const BUNDLES: { label: string; modules: D.ModuleKey[] }[] = [
  { label: "KYC + Compliance + Tokenization", modules: ["identity", "compliance", "tokenization"] },
  { label: "Marketplace + Settlement + Custody integration", modules: ["secondary-market", "payments", "custody"] },
  { label: "Full platform", modules: MODULES },
];

function ModuleEntitlements({ tenant }: { tenant: D.Tenant }) {
  const canConfigure = useCan("platform.configure");
  const update = useUpdateModules();
  const [pending, setPending] = React.useState<D.ModuleKey>();
  const [bundle, setBundle] = React.useState<(typeof BUNDLES)[number]>();
  const enabled = new Set(tenant.modules);

  const toggle = (m: D.ModuleKey, on: boolean) => {
    setPending(m);
    const next = MODULES.filter((x) => (x === m ? on : enabled.has(x)));
    update.mutate({ id: tenant.id, modules: next }, { onSettled: () => setPending(undefined) });
  };
  const adds = bundle ? bundle.modules.filter((m) => !enabled.has(m)) : [];
  const removes = bundle ? tenant.modules.filter((m) => !bundle.modules.includes(m)) : [];

  return (
    <Card id="modules" className="scroll-mt-28">
      <CardHeader
        icon={<Blocks />}
        title="Module entitlements"
        description="Disabled modules are hidden and their APIs return 403"
        action={<span className="text-[12.5px] text-muted tabular">{tenant.modules.length} of {MODULES.length} enabled</span>}
      />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-[12.5px] font-medium text-muted sm:mr-1">Example bundles</span>
          {BUNDLES.map((b) => {
            const btn = <Button key={b.label} size="sm" variant="secondary" disabled={!canConfigure} onClick={() => setBundle(b)} className="justify-start">{b.label}</Button>;
            return canConfigure ? btn : <Tip key={b.label} content="Changing entitlements needs the Platform admin role."><span tabIndex={0} className="inline-flex rounded-md">{btn}</span></Tip>;
          })}
        </div>
        {!canConfigure && <p className="flex items-center gap-2 text-[12.5px] text-muted"><Info className="size-4" /> Read only. Platform admin changes entitlements.</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {MODULES.map((m) => {
            const on = enabled.has(m);
            const Icon = MODULE_ICON[m];
            const sw = <Switch id={`mod-${m}`} label={`${MODULE_META[m].label} module`} checked={on} disabled={!canConfigure || update.isPending} onCheckedChange={(v) => toggle(m, v)} />;
            return (
              <li key={m} className={cn("relative flex flex-col gap-3 rounded-xl border p-3.5 transition-colors", on ? "border-border bg-surface shadow-1" : "border-dashed border-border-strong bg-surface-2")}>
                <div className="flex items-start justify-between gap-2">
                  <IconTile icon={Icon} tone={on ? "brand" : "neutral"} />
                  {canConfigure ? sw : <Tip content="Read only for your role"><span tabIndex={0} className="inline-flex rounded-full">{sw}</span></Tip>}
                </div>
                <Tip content={MODULE_META[m].description}>
                  <label htmlFor={`mod-${m}`} className="min-w-0 cursor-pointer">
                    <span className={cn("block text-[13px] font-medium leading-snug", !on && "text-muted")}>{MODULE_META[m].label}</span>
                    <span className="block text-[11.5px] text-muted">{pending === m ? "Saving…" : on ? "Enabled" : "Off"}</span>
                  </label>
                </Tip>
              </li>
            );
          })}
        </ul>
      </CardBody>
      <Dialog open={!!bundle} onOpenChange={(o) => !o && setBundle(undefined)}>
        <DialogContent
          title={`Apply "${bundle?.label}"?`}
          description="The tenant's entitlements are replaced by this bundle. Every change is written to the audit trail."
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Keep current modules</Button></DialogClose>
              <Button variant="primary" isLoading={update.isPending} loadingText="Applying…" disabled={!adds.length && !removes.length}
                onClick={() => bundle && update.mutate({ id: tenant.id, modules: MODULES.filter((m) => bundle.modules.includes(m)) }, { onSuccess: () => setBundle(undefined) })}>
                Apply bundle
              </Button>
            </>
          }
        >
          {bundle && (
            <div className="flex flex-col gap-4 text-[13px]">
              {!adds.length && !removes.length && <p className="text-muted">This tenant already has exactly these modules.</p>}
              {adds.length > 0 && <ModuleDiff title="Enabled" tone="success" items={adds} />}
              {removes.length > 0 && <ModuleDiff title="Disabled" tone="danger" items={removes} />}
              {removes.length > 0 && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">Pages for disabled modules are hidden for every user of {tenant.shortName}. Data is kept and returns when the module is enabled again.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ModuleDiff({ title, tone, items }: { title: string; tone: "success" | "danger"; items: D.ModuleKey[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-muted">{title}</div>
      <div className="flex flex-wrap gap-1.5">{items.map((m) => <Badge key={m} tone={tone}>{MODULE_META[m].label}</Badge>)}</div>
    </div>
  );
}

/* ------------------------------- licences ------------------------------ */
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Licences({ tenant }: { tenant: D.Tenant }) {
  const columns: Column<D.Licence>[] = [
    { key: "holder", header: "Holder", cell: (l) => <span className="block max-w-[260px]"><CompanyName name={l.holder} sub={l.reference} size={32} /></span>, sort: (l) => l.holder },
    { key: "regulator", header: "Regulator", cell: (l) => <span className="inline-flex items-center gap-2 whitespace-nowrap"><CompanyLogo name={l.regulator} size={22} />{l.regulator} <span className="text-muted">· {l.jurisdiction}</span></span>, sort: (l) => l.regulator, hideBelow: "lg" },
    { key: "activities", header: "Activities", cell: (l) => <ActivityIcons activities={l.activities} />, hideBelow: "md" },
    { key: "reference", header: "Reference", cell: (l) => <span className="font-mono text-[12px]">{l.reference}</span>, hideBelow: "lg" },
    { key: "status", header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
    {
      key: "expiry",
      header: "Expires",
      align: "right",
      sort: (l) => l.expiresAt,
      cell: (l) => {
        const d = daysUntil(l.expiresAt);
        return (
          <span className="inline-flex items-center justify-end gap-2">
            {d < 0 ? <Badge tone="danger">Expired</Badge> : d <= 60 && <Badge tone="warning">Renew in {d} days</Badge>}
            <span className="text-muted">{fmt.date(l.expiresAt)}</span>
          </span>
        );
      },
    },
  ];
  return (
    <Card id="licences" className="scroll-mt-28">
      <CardHeader icon={<FileBadge />} title="Licences" description="Read by the capability engine on every request" action={<span className="text-[12.5px] text-muted tabular">{tenant.licences.filter((l) => l.status === "active").length} of {tenant.licences.length} active</span>} />
      <DataTable rows={tenant.licences} columns={columns} getRowId={(l) => l.id} caption="Licences" defaultSort={{ key: "expiry", dir: "asc" }}
        empty={{ icon: <FileBadge />, title: "No licences on file", description: "Regulated functions stay switched off until a licence or a licensed external provider is recorded." }} />
    </Card>
  );
}

/* ---------------------------- responsibility --------------------------- */
const RESP_META: Record<D.ResponsibilityType, { label: string; tone: "brand" | "info" | "outline" }> = {
  "platform-entity": { label: "Platform entity", tone: "brand" },
  "customer-entity": { label: "Customer entity", tone: "info" },
  "external-provider": { label: "External provider", tone: "outline" },
};

function ActivityIcons({ activities, size = "sm" }: { activities: D.RegulatedActivity[]; size?: "sm" | "md" }) {
  return (
    <span className="flex flex-wrap gap-1">
      {activities.map((a) => {
        const Icon = ACTIVITY_ICON[a];
        return (
          <Tip key={a} content={ACTIVITY_LABEL[a]}>
            <span tabIndex={0} className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 text-[11.5px] font-medium", size === "sm" ? "h-6 px-1.5" : "h-7 px-2")}>
              <Icon className="size-3.5 text-muted" aria-hidden />
              <span>{ACTIVITY_LABEL[a]}</span>
            </span>
          </Tip>
        );
      })}
    </span>
  );
}

const LANE_TONE: Record<D.ResponsibilityType, string> = { "platform-entity": "bg-brand", "customer-entity": "bg-info", "external-provider": "bg-border-strong" };

function ResponsibilityMatrix({ tenant }: { tenant: D.Tenant }) {
  const [view, setView] = React.useState<"diagram" | "table">("diagram");
  const rows = ACTIVITIES.map((a) => {
    const r = tenant.responsibilities.find((x) => x.activity === a);
    const lic = r?.licenceId ? tenant.licences.find((l) => l.id === r.licenceId) : undefined;
    return { activity: a, r, lic };
  });
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "activity", header: "Regulated activity", cell: (x) => { const Icon = ACTIVITY_ICON[x.activity]; return <span className="inline-flex items-center gap-2 font-medium"><Icon className="size-4 text-muted" aria-hidden />{ACTIVITY_LABEL[x.activity]}</span>; } },
    { key: "entity", header: "Responsible entity", cell: (x) => (x.r ? <span className={cn("block max-w-[260px]", /not enabled|not applicable/i.test(x.r.entity) && "opacity-60")}><CompanyName name={x.r.entity} size={24} /></span> : <span className="text-danger">Not assigned</span>) },
    { key: "type", header: "Responsibility", cell: (x) => (x.r ? <Badge tone={RESP_META[x.r.type].tone}>{RESP_META[x.r.type].label}</Badge> : null), hideBelow: "sm" },
    {
      key: "licence",
      header: "Licence",
      cell: (x) =>
        x.lic ? (
          <span className="inline-flex items-center gap-2"><span className="font-mono text-[12px]">{x.lic.reference}</span>{x.lic.status !== "active" && <StatusBadge status={x.lic.status} />}</span>
        ) : (
          <span className="text-subtle">{x.r?.type === "external-provider" ? "Provider's own licence" : "None linked"}</span>
        ),
      hideBelow: "md",
    },
  ];
  const types = Object.keys(RESP_META) as D.ResponsibilityType[];
  const unassigned = rows.filter((x) => !x.r).map((x) => x.activity);
  const lanes = types.map((t) => {
    const entities = new Map<string, { entity: string; activities: D.RegulatedActivity[]; lic: D.Licence[] }>();
    for (const x of rows) {
      if (x.r?.type !== t) continue;
      const e = entities.get(x.r.entity) ?? { entity: x.r.entity, activities: [], lic: [] };
      e.activities.push(x.activity);
      if (x.lic && !e.lic.some((l) => l.id === x.lic!.id)) e.lic.push(x.lic);
      entities.set(x.r.entity, e);
    }
    return { t, entities: [...entities.values()], n: tenant.responsibilities.filter((r) => r.type === t).length };
  });

  return (
    <Card id="responsibility" className="scroll-mt-28">
      <CardHeader
        icon={<Scale />}
        title={<span className="inline-flex items-center gap-1.5">Responsibility matrix <Tip content="Technology is separated from regulated responsibility. Each regulated activity records the responsible legal entity and its licence."><Info className="size-3.5 text-subtle" tabIndex={0} aria-label="About the matrix" /></Tip></span>}
        description="Who is responsible for each regulated activity"
        action={<Segmented<"diagram" | "table"> size="sm" value={view} onChange={setView} options={[{ value: "diagram", label: <span className="inline-flex items-center gap-1"><LayoutGrid className="size-3.5" /> Diagram</span> }, { value: "table", label: <span className="inline-flex items-center gap-1"><Table2 className="size-3.5" /> Table</span> }]} />}
      />
      {view === "table" ? (
        <DataTable rows={rows} columns={columns} getRowId={(x) => x.activity} caption="Responsibility matrix" pageSize={20} />
      ) : (
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
          {lanes.map((lane) => (
            <section key={lane.t} aria-label={RESP_META[lane.t].label} className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-surface-2 p-3">
              <header className="flex items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold"><span className={cn("size-2.5 rounded-full", LANE_TONE[lane.t])} aria-hidden />{RESP_META[lane.t].label}</span>
                <span className="text-[12px] text-muted tabular">{lane.n} {lane.n === 1 ? "activity" : "activities"}</span>
              </header>
              {lane.entities.length ? lane.entities.map((e) => (
                <article key={e.entity} className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-1">
                  <div className="flex items-start gap-2.5">
                    <CompanyLogo name={e.entity} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-[13px] font-medium leading-snug", /not enabled|not applicable/i.test(e.entity) && "text-muted")}>{e.entity}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                        {e.lic.length ? e.lic.map((l) => (
                          <span key={l.id} className="inline-flex items-center gap-1"><FileBadge className="size-3" aria-hidden /><span className="font-mono">{l.reference}</span>{l.status !== "active" && <StatusBadge status={l.status} />}</span>
                        )) : <span>{lane.t === "external-provider" ? "Provider's own licence" : "No licence linked"}</span>}
                      </div>
                    </div>
                  </div>
                  <ActivityIcons activities={e.activities} />
                </article>
              )) : (
                <p className="rounded-xl border border-dashed border-border-strong px-3 py-4 text-center text-[12.5px] text-muted">None</p>
              )}
            </section>
          ))}
          {unassigned.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[12.5px] text-danger lg:col-span-3">
              <span className="font-medium">Not assigned</span>
              <ActivityIcons activities={unassigned} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* -------------------------- capability engine -------------------------- */
const CAPABILITIES: { value: D.CapabilityRequest["capability"]; label: string }[] = [
  { value: "secondary-trading", label: "Secondary trading" },
  { value: "defi-access", label: "DeFi access" },
  { value: "primary-distribution", label: "Primary distribution" },
  { value: "custody", label: "Custody" },
  { value: "transfer-agency", label: "Transfer agency" },
];
const TRADING_MODELS: { value: NonNullable<D.CapabilityRequest["tradingModel"]>; label: string }[] = [
  { value: "order-book", label: "Order book" },
  { value: "rfq", label: "Request for quote" },
  { value: "otc", label: "OTC" },
  { value: "auction", label: "Auction" },
  { value: "amm", label: "Automated market maker" },
];

function CapabilityEngine({ tenant }: { tenant: D.Tenant }) {
  const { data: assets, isPending } = useAssets();
  const check = useCapabilityCheck();
  const [capability, setCapability] = React.useState<D.CapabilityRequest["capability"]>("secondary-trading");
  const [assetId, setAssetId] = React.useState("");
  const [category, setCategory] = React.useState<D.InvestorClassification>("professional");
  const [model, setModel] = React.useState<D.CapabilityRequest["tradingModel"] | "">("order-book");
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (assets?.length && !assets.some((a) => a.id === assetId)) setAssetId(assets.find((a) => a.status === "live")?.id ?? assets[0].id);
  }, [assets, assetId]);
  // Re-evaluating after a tenant switch keeps the result honest.
  React.useEffect(() => {
    check.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const run = () => {
    if (!assetId) return setError("Select an asset to evaluate.");
    check.mutate({ tenantId: tenant.id, capability, assetId, investorCategory: category, tradingModel: model || undefined });
  };
  const tradingRelevant = capability === "secondary-trading" || capability === "defi-access";

  return (
    <Card id="capability" className="scroll-mt-28">
      <CardHeader icon={<Gavel />} title="Regulatory capability engine" description="Checks licences before a function is switched on" />
      <div className="border-b border-border px-5 py-3">
        <FlowDiagram
          breakpoint="lg"
          compact
          pulse={false}
          label="Capability checks"
          nodes={[
            { key: "j", label: "Jurisdiction", icon: Landmark },
            { key: "a", label: "Asset and instrument", icon: Blocks },
            { key: "c", label: "Investor category", icon: Users },
            { key: "t", label: "Trading model", icon: Scale },
            { key: "o", label: "Operator licence", icon: FileBadge },
            { key: "d", label: "Enable or reject", icon: Gavel, tone: "navy" },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <CardBody className="flex flex-col gap-4 border-b border-border lg:border-b-0 lg:border-r">
          <Field label="Capability" htmlFor="cap-cap">
            <NativeSelect id="cap-cap" value={capability} onChange={(e) => { setCapability(e.target.value as D.CapabilityRequest["capability"]); check.reset(); }}>
              {CAPABILITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Asset" htmlFor="cap-asset" error={error}>
            {isPending ? <Skeleton className="h-9" /> : (
              <NativeSelect id="cap-asset" value={assetId} onChange={(e) => { setAssetId(e.target.value); setError(undefined); check.reset(); }} aria-invalid={!!error}>
                {!assets?.length && <option value="">No assets for this tenant</option>}
                {assets?.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.jurisdiction})</option>)}
              </NativeSelect>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Investor category" htmlFor="cap-cat">
              <NativeSelect id="cap-cat" value={category} onChange={(e) => { setCategory(e.target.value as D.InvestorClassification); check.reset(); }}>
                {(Object.keys(CLASSIFICATION_LABEL) as D.InvestorClassification[]).map((c) => <option key={c} value={c}>{CLASSIFICATION_LABEL[c]}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Trading model" htmlFor="cap-model" hint={tradingRelevant ? undefined : "Not used for this capability"}>
              <NativeSelect id="cap-model" value={model} disabled={!tradingRelevant} onChange={(e) => { setModel(e.target.value as D.CapabilityRequest["tradingModel"] | ""); check.reset(); }}>
                <option value="">Not applicable</option>
                {TRADING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <Button variant="primary" onClick={run} isLoading={check.isPending} loadingText="Evaluating…" className="self-start"><ShieldCheck /> Evaluate</Button>
          <p className="flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-[12.5px] text-info">
            <Info className="mt-0.5 size-4 shrink-0" />
            Switch tenant to compare. Outcomes differ with each operator&apos;s licences.
          </p>
        </CardBody>
        <CardBody>
          {check.isPending ? (
            <div className="flex flex-col gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : check.data ? (
            <CapabilityResultView result={check.data} />
          ) : (
            <EmptyState icon={<Landmark />} title="No evaluation yet" description={`Choose a capability and run the engine against ${tenant.shortName}'s licences.`} className="py-10" />
          )}
        </CardBody>
      </div>
    </Card>
  );
}

/* ------------------------------- branding ------------------------------ */
const HEX = /^#[0-9a-fA-F]{6}$/;

function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return "#" + ch.map((c) => Math.round(factor < 1 ? c * factor : c + (255 - c) * (factor - 1)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function Branding({ tenant, emphasised }: { tenant: D.Tenant; emphasised?: boolean }) {
  const canConfigure = useCan("platform.configure");
  const update = useUpdateBrand();
  const [name, setName] = React.useState(tenant.name);
  const [domain, setDomain] = React.useState(tenant.domain);
  const [hex, setHex] = React.useState(tenant.brand.primary);
  const [monogram, setMonogram] = React.useState(tenant.brand.monogram);
  const [errors, setErrors] = React.useState<{ name?: string; domain?: string; hex?: string; monogram?: string }>({});

  React.useEffect(() => {
    setName(tenant.name);
    setDomain(tenant.domain);
    setHex(tenant.brand.primary);
    setMonogram(tenant.brand.monogram);
    setErrors({});
  }, [tenant.id, tenant.name, tenant.domain, tenant.brand.primary, tenant.brand.monogram]);

  const valid = HEX.test(hex);
  const colour = valid ? hex : tenant.brand.primary;
  const dirty = name !== tenant.name || domain !== tenant.domain || hex.toUpperCase() !== tenant.brand.primary.toUpperCase() || monogram !== tenant.brand.monogram;

  const publish = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Enter the brand name investors see.";
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())) e.domain = "Enter a domain such as portal.example.com.";
    if (!valid) e.hex = "Use a six-digit hex colour such as #0E7C7B.";
    if (!/^[A-Za-z0-9]{1,2}$/.test(monogram)) e.monogram = "Use one or two letters or digits.";
    setErrors(e);
    if (Object.keys(e).length) return;
    update.mutate({ id: tenant.id, patch: { name: name.trim(), domain: domain.trim(), primary: hex.toUpperCase(), primaryHover: shade(hex, 0.84), accentSoft: shade(hex, 1.9), monogram: monogram.toUpperCase() } });
  };

  const publishBtn = <Button variant="primary" onClick={publish} disabled={!canConfigure || !dirty} isLoading={update.isPending} loadingText="Publishing…"><Paintbrush /> Publish branding</Button>;

  return (
    <Card id="branding" className={cn("scroll-mt-28", emphasised && "border-brand/40 ring-2 ring-brand/15")}>
      <CardHeader
        icon={<Paintbrush />}
        title="White-label branding"
        description={emphasised ? `Investors see only ${tenant.shortName}'s identity` : "Used on investor surfaces under the white-label model"}
        action={emphasised ? <Badge tone="brand">White-label tenant</Badge> : undefined}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <CardBody className="flex flex-col gap-4 border-b border-border lg:border-b-0 lg:border-r">
          <Field label="Brand name" htmlFor="br-name" error={errors.name}>
            <Input id="br-name" value={name} disabled={!canConfigure} aria-invalid={!!errors.name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} />
          </Field>
          <Field label="Portal domain" htmlFor="br-domain" error={errors.domain}>
            <Input id="br-domain" value={domain} disabled={!canConfigure} className="font-mono text-[13px]" aria-invalid={!!errors.domain} onChange={(e) => { setDomain(e.target.value); setErrors((x) => ({ ...x, domain: undefined })); }} />
          </Field>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-4">
            <Field label="Primary colour" htmlFor="br-hex" error={errors.hex ?? (!valid && hex.length >= 7 ? "Use a six-digit hex colour such as #0E7C7B." : undefined)}>
              <div className="flex gap-2">
                <input type="color" aria-label="Pick primary colour" value={colour.toLowerCase()} disabled={!canConfigure} onChange={(e) => { setHex(e.target.value.toUpperCase()); setErrors((x) => ({ ...x, hex: undefined })); }} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-border-strong bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-50" />
                <Input id="br-hex" value={hex} maxLength={7} disabled={!canConfigure} className="font-mono uppercase" aria-invalid={!!errors.hex || (!valid && hex.length >= 7)} onChange={(e) => { const v = e.target.value.trim(); setHex(v.startsWith("#") ? v : `#${v}`); setErrors((x) => ({ ...x, hex: undefined })); }} />
              </div>
            </Field>
            <Field label="Monogram" htmlFor="br-mono" error={errors.monogram}>
              <Input id="br-mono" value={monogram} maxLength={2} disabled={!canConfigure} className="text-center font-semibold uppercase" aria-invalid={!!errors.monogram} onChange={(e) => { setMonogram(e.target.value); setErrors((x) => ({ ...x, monogram: undefined })); }} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canConfigure ? publishBtn : <Tip content="Publishing branding needs the Platform admin role."><span tabIndex={0} className="inline-flex rounded-lg">{publishBtn}</span></Tip>}
            {dirty && canConfigure && <Button variant="ghost" onClick={() => { setName(tenant.name); setDomain(tenant.domain); setHex(tenant.brand.primary); setMonogram(tenant.brand.monogram); setErrors({}); }}>Discard changes</Button>}
          </div>
          <p className="text-[12px] text-muted">Publishing also rebrands this console.</p>
        </CardBody>
        <CardBody className="flex flex-col gap-3 bg-surface-2">
          <div className="text-[12.5px] font-medium text-muted">Investor portal preview</div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-1">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="grid size-8 place-items-center rounded-lg text-[14px] font-semibold text-white" style={{ background: colour }}>{(monogram || "?").toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{name || "Brand name"}</span>
                <span className="block truncate font-mono text-[11px] text-muted">{domain}</span>
              </span>
              <span className="hidden gap-3 text-[12.5px] text-muted sm:flex">
                <span className="font-medium text-foreground underline decoration-2 underline-offset-[10px]" style={{ textDecorationColor: colour }}>Portfolio</span>
                <span>Marketplace</span>
                <span>Orders</span>
              </span>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div className="rounded-lg p-3" style={{ background: `color-mix(in oklab, ${colour} 12%, var(--surface))` }}>
                <div className="text-[12px] text-muted">Featured offering</div>
                <div className="text-[14px] font-semibold">Green Sukuk 2029, open for subscription</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" tabIndex={-1} className="inline-flex h-9 items-center rounded-lg px-3.5 text-[13.5px] font-medium text-white shadow-1" style={{ background: colour }}>Subscribe now</button>
                <button type="button" tabIndex={-1} className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3.5 text-[13.5px] font-medium">View documents</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: colour }} /> Primary</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ background: valid ? shade(hex, 0.84) : tenant.brand.primaryHover }} /> Hover</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm border border-border" style={{ background: valid ? shade(hex, 1.9) : tenant.brand.accentSoft }} /> Soft accent</span>
          </div>
        </CardBody>
      </div>
    </Card>
  );
}
