"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Gavel, Globe, Info, Landmark, Layers, Megaphone, ScrollText, UserRound, type LucideIcon } from "lucide-react";
import type * as D from "@/types/domain";
import { usePolicyPacks, useToggleRule } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, Switch, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/domain/status";
import { CompanyLogo } from "@/components/domain/logos";
import { IconTile, ProgressRing } from "@/components/visual/bits";
import { FlowDiagram } from "@/components/visual/flow";
import { cn, fmt } from "@/lib/utils";

const LAYERS: { layer: D.RuleLayer; label: string; description: string; icon: LucideIcon }[] = [
  { layer: "global", label: "Global core rules", description: "Apply to every investor and product on the platform", icon: Globe },
  { layer: "jurisdiction", label: "Jurisdiction rules", description: "Set by the regulator for products booked in this jurisdiction", icon: Landmark },
  { layer: "product", label: "Product rules", description: "Classification, holding limits and lock-ups per product", icon: Layers },
  { layer: "offering", label: "Offering rules", description: "Subscription window, ticket size and distribution limits", icon: Megaphone },
  { layer: "investor", label: "Investor rules", description: "Status and attributes of the individual investor", icon: UserRound },
];

const COMPOSITION = [
  { key: "global", label: "Global core", sub: "Identity, sanctions, AML", icon: Globe, tip: "Identity, sanctions, PEP, AML and wallet risk" },
  { key: "pack", label: "Jurisdiction pack", sub: "Regulator rules", icon: Landmark, tip: "Regulator rules per booking centre" },
  { key: "product", label: "Product", sub: "Limits, lock-ups", icon: Layers, tip: "Eligible categories, holding limits and lock-ups" },
  { key: "investor", label: "Investor", sub: "Status in date", icon: UserRound, tip: "Classification and status in date" },
];

const SEVERITY_TONE = { block: "danger", review: "warning", info: "neutral" } as const;
const SEVERITY_LABEL = { block: "Blocks", review: "Review", info: "Info" } as const;

function PoliciesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: packs, isPending, error, refetch } = usePolicyPacks();
  const packId = params.get("pack") ?? packs?.[0]?.id;
  const pack = packs?.find((p) => p.id === packId) ?? packs?.[0];
  const select = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("pack", id);
    router.replace(`${pathname}?${next}`, { scroll: false });
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("pack-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <PageHeader title="Policy packs" description="Layered, versioned rules. Every change is audited." />

      <Card className="mb-5 p-4">
        <FlowDiagram
          breakpoint="lg"
          compact
          pulse={false}
          label="Rule composition"
          nodes={[
            ...COMPOSITION.map((c, i) => ({ key: c.key, label: c.label, sub: c.sub, icon: c.icon, tip: c.tip, join: i > 0 ? ("plus" as const) : undefined })),
            { key: "decision", label: "Decision", sub: "Allow, reject or review", icon: Gavel, tone: "navy" as const, join: "equals" as const },
          ]}
        />
      </Card>

      {error && !packs ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card className="self-start lg:sticky lg:top-20">
            <CardHeader title="Packs" description={packs ? `${packs.length} packs, ${packs.filter((p) => p.status === "active").length} active` : "Loading…"} />
            {isPending ? (
              <div className="flex flex-col gap-2 p-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : !packs?.length ? (
              <EmptyState icon={<ScrollText />} title="No policy packs" description="Packs are published by the compliance team for each jurisdiction the platform operates in." />
            ) : (
              <ul role="listbox" aria-label="Policy packs" className="flex flex-col gap-0.5 p-1.5">
                {packs.map((p) => {
                  const active = p.id === pack?.id;
                  return (
                    <li key={p.id}>
                      <button type="button" role="option" aria-selected={active} onClick={() => select(p.id)}
                        className={cn("flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors", active ? "bg-brand-soft" : "hover:bg-surface-2")}>
                        <CompanyLogo name={p.regulator} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                          <span className="flex items-center gap-1.5 truncate text-[12px] text-muted"><span className={cn("rounded px-1 font-mono text-[10.5px] font-semibold", active ? "bg-brand text-white" : "bg-surface-3")}>{p.jurisdiction}</span>{p.regulator} · v{p.version}</span>
                        </span>
                        <StatusBadge status={p.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div id="pack-detail" className="min-w-0 scroll-mt-20">
            {isPending ? (
              <Card><div className="flex flex-col gap-3 p-5"><Skeleton className="h-6 w-60" /><Skeleton className="h-4 w-80 max-w-full" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></Card>
            ) : pack ? (
              <PackDetail pack={pack} />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function PackDetail({ pack }: { pack: D.PolicyPack }) {
  const canWrite = useCan("policy.write");
  const toggle = useToggleRule();
  const layers = LAYERS.filter((l) => pack.rules.some((r) => r.layer === l.layer));
  const enabled = pack.rules.filter((r) => r.enabled).length;

  return (
    <Card key={pack.id} className="animate-enter">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CompanyLogo name={pack.regulator} size={44} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold">{pack.name}</h2>
              <StatusBadge status={pack.status} />
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{pack.regulator} · {pack.jurisdiction} · v{pack.version} · effective {fmt.date(pack.effectiveFrom)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[12px] text-muted">
          <ProgressRing value={pack.rules.length ? (enabled / pack.rules.length) * 100 : 0} tone="success" size={42} label={`${enabled} of ${pack.rules.length} rules enabled`}>{enabled}</ProgressRing>
          <div>
            <div><span className="font-medium text-foreground tabular">{enabled}</span> of <span className="tabular">{pack.rules.length}</span> enabled</div>
            <div>Updated {fmt.relative(pack.updatedAt)} by {pack.updatedBy}</div>
          </div>
        </div>
      </div>
      {!canWrite && (
        <div className="border-b border-border bg-surface-2 px-5 py-2.5 text-[12.5px] text-muted">Read only. Enabling or disabling rules needs the Compliance officer role.</div>
      )}
      {pack.status === "draft" && (
        <div className="border-b border-border bg-info-soft px-5 py-2.5 text-[12.5px] text-info">This pack is a draft. Its rules are not evaluated until it is published.</div>
      )}
      {!pack.rules.length ? (
        <EmptyState icon={<ScrollText />} title="No rules in this pack" description="Rules are added when the pack is drafted by the compliance team." />
      ) : (
        <div className="flex flex-col gap-6 p-5">
          {layers.map((l) => (
            <section key={l.layer} aria-labelledby={`layer-${l.layer}`}>
              <div className="mb-2 flex items-center gap-2.5">
                <IconTile icon={l.icon} size="sm" />
                <h3 id={`layer-${l.layer}`} className="text-[13.5px] font-semibold">{l.label}</h3>
                <Tip content={l.description}><Info className="size-3.5 text-subtle" tabIndex={0} aria-label={l.description} /></Tip>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {pack.rules.filter((r) => r.layer === l.layer).map((r) => {
                  const pending = toggle.isPending && toggle.variables?.ruleId === r.id;
                  const sw = (
                    <Switch label={`${r.enabled ? "Disable" : "Enable"} ${r.code} ${r.name}`} checked={r.enabled} disabled={!canWrite || pending}
                      onCheckedChange={(v) => toggle.mutate({ packId: pack.id, ruleId: r.id, enabled: v })} />
                  );
                  return (
                    <li key={r.id} className={cn("flex items-start gap-4 px-4 py-3.5 transition-opacity", !r.enabled && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono text-[11.5px] font-medium text-subtle">{r.code}</span>
                          <span className="text-[13.5px] font-medium">{r.name}</span>
                          <Badge tone={SEVERITY_TONE[r.severity]}>{SEVERITY_LABEL[r.severity]}</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted" title={r.description}>{r.description}</p>
                        {r.params && Object.keys(r.params).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(r.params).map(([k, v]) => (
                              <span key={k} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11.5px]">
                                <span className="text-muted">{paramLabel(k)}</span>
                                <span className="truncate font-medium tabular">{formatParam(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pt-0.5">
                        {canWrite ? sw : <Tip content="Changing policy rules needs the Compliance officer role."><span tabIndex={0} className="inline-flex">{sw}</span></Tip>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <Button variant="ghost" size="sm" className="self-start" asChild>
            <Link href="/compliance">Test these rules in the eligibility engine</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

const PARAM_LABEL: Record<string, string> = {
  maxAutoApprove: "Highest auto-approved risk",
  maxScore: "Maximum risk score",
  countries: "Countries",
  minUsd: "Minimum, USD",
  thresholdAed: "Threshold, AED",
  whtPct: "Withholding tax %",
  months: "Months",
};

function paramLabel(k: string) {
  return PARAM_LABEL[k] ?? fmt.sentence(k.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
}

function formatParam(v: string | number | boolean | string[]) {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return fmt.num(v);
  return v;
}

export default function PoliciesPage() {
  return (
    <React.Suspense>
      <PoliciesView />
    </React.Suspense>
  );
}
