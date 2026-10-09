"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Clock, ShieldAlert, UserPlus, Users, Search } from "lucide-react";
import type * as D from "@/types/domain";
import { useInvestors } from "@/hooks/api";
import { useCan } from "@/hooks/session";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, Card, Input, NativeSelect, PageHeader, Segmented } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ClassificationBadge, Flag, Money, RiskBadge } from "@/components/domain/status";
import { IdentityStatusBadge, identityStatus } from "@/components/identity/shared";
import { PartyName } from "@/components/domain/logos";
import { MetricTile } from "@/components/visual/bits";
import { CLASSIFICATION_LABEL } from "@/lib/constants";
import { fmt } from "@/lib/utils";

type StatusFilter = "all" | "approved" | "review" | "incomplete" | "rejected";

const matchStatus = (i: D.Investor, f: StatusFilter) => {
  const s = identityStatus(i);
  if (f === "incomplete") return i.profileComplete === false;
  if (f === "approved") return s === "approved";
  if (f === "review") return s === "in-review" || s === "pending" || s === "not-started";
  if (f === "rejected") return s === "rejected" || s === "expired";
  return true;
};

function InvestorsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const canWrite = useCan("investors.write");
  const status = (params.get("status") as StatusFilter | null) ?? "all";
  const type = params.get("type") ?? "";
  const classification = params.get("classification") ?? "";
  const risk = params.get("risk") ?? "";
  const [search, setSearch] = React.useState("");

  const { data, isPending, error, refetch } = useInvestors();
  const investors = data?.items;

  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  // Filters other than status apply first so segment counts reflect the active filters.
  const base = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (investors ?? []).filter((i) => {
      if (type && i.type !== type) return false;
      if (classification && i.classification !== classification) return false;
      if (risk && i.amlRisk !== risk) return false;
      if (q && !`${i.name} ${i.email} ${i.id} ${i.residency}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [investors, type, classification, risk, search]);

  const filtered = React.useMemo(() => base.filter((i) => matchStatus(i, status)), [base, status]);

  const stats = React.useMemo(() => {
    const all = investors ?? [];
    return {
      total: all.length,
      entities: all.filter((i) => i.type === "entity").length,
      verified: all.filter((i) => identityStatus(i) === "approved").length,
      review: all.filter((i) => matchStatus(i, "review")).length,
      highRisk: all.filter((i) => i.amlRisk === "high").length,
      flagged: all.filter((i) => i.pep || i.sanctionsHit || i.adverseMedia).length,
    };
  }, [investors]);

  const columns: Column<D.Investor>[] = [
    {
      key: "name",
      header: "Investor",
      sort: (i) => i.name,
      cell: (i) => (
        <span className="block max-w-[300px]"><PartyName party={i} sub={i.email} size={34} /></span>
      ),
    },
    { key: "residency", header: "Residency", cell: (i) => <Flag country={i.residency} />, sort: (i) => i.residency, hideBelow: "md" },
    { key: "classification", header: "Classification", cell: (i) => <ClassificationBadge c={i.classification} />, sort: (i) => i.classification, hideBelow: "lg" },
    { key: "status", header: "Identity", cell: (i) => <span className="inline-flex flex-wrap items-center gap-1.5"><IdentityStatusBadge investor={i} />{i.profileComplete === false && <Badge tone="warning">{(i.verification ?? []).filter((v) => ["missing", "failed", "pending"].includes(v.status)).length} outstanding</Badge>}</span>, sort: (i) => identityStatus(i) },
    { key: "risk", header: "AML risk", cell: (i) => <RiskBadge risk={i.amlRisk} />, sort: (i) => ({ low: 0, medium: 1, high: 2 })[i.amlRisk], hideBelow: "sm" },
    { key: "wallets", header: "Wallets", align: "right", cell: (i) => i.wallets.length, sort: (i) => i.wallets.length, hideBelow: "xl" },
    { key: "invested", header: "Total invested", align: "right", cell: (i) => (i.totalInvested ? <Money value={i.totalInvested} compact={i.totalInvested >= 1_000_000} digits={i.totalInvested >= 1_000_000 ? undefined : 0} /> : <span className="text-muted">None yet</span>), sort: (i) => i.totalInvested, hideBelow: "md" },
    { key: "onboarded", header: "Onboarded", align: "right", cell: (i) => <span className="text-muted">{fmt.date(i.onboardedAt)}</span>, sort: (i) => i.onboardedAt, hideBelow: "lg" },
  ];

  const filtersActive = status !== "all" || !!type || !!classification || !!risk || !!search;

  return (
    <>
      <PageHeader
        title="Investors"
        description="Individuals and entities onboarded to this tenant."
        actions={canWrite && <Button asChild variant="primary"><Link href="/identity/onboard"><UserPlus /> Onboard investor</Link></Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Investors" icon={Users} tone="info" loading={isPending} value={fmt.num(stats.total)} sub={`${stats.total - stats.entities} people, ${stats.entities} entities`} />
        <MetricTile label="Verified" icon={BadgeCheck} loading={isPending} ring={{ value: stats.total ? (stats.verified / stats.total) * 100 : 0, tone: "success" }} value={fmt.num(stats.verified)} sub={stats.total ? `${Math.round((stats.verified / stats.total) * 100)}% of investors` : undefined} />
        <MetricTile label="In review" icon={Clock} tone="warning" loading={isPending} value={fmt.num(stats.review)} sub="Awaiting compliance" />
        <MetricTile label="High AML risk" icon={ShieldAlert} tone={stats.highRisk ? "danger" : "neutral"} loading={isPending} value={<span className={stats.highRisk ? "text-danger" : undefined}>{fmt.num(stats.highRisk)}</span>} sub={`${stats.flagged} flagged`} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Segmented<StatusFilter>
              value={status}
              onChange={(v) => setParam("status", v === "all" ? undefined : v)}
              options={[
                { value: "all", label: "All", count: base.length },
                { value: "approved", label: "Approved", count: base.filter((i) => matchStatus(i, "approved")).length },
                { value: "review", label: "In review", count: base.filter((i) => matchStatus(i, "review")).length },
                { value: "incomplete", label: "Items outstanding", count: base.filter((i) => matchStatus(i, "incomplete")).length },
                { value: "rejected", label: "Rejected or expired", count: base.filter((i) => matchStatus(i, "rejected")).length },
              ]}
            />
            <div className="relative xl:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input aria-label="Search investors" placeholder="Name, email or investor ID" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:max-w-[640px]">
            <NativeSelect aria-label="Filter by investor type" value={type} onChange={(e) => setParam("type", e.target.value || undefined)}>
              <option value="">All types</option>
              <option value="individual">Individuals</option>
              <option value="entity">Entities</option>
            </NativeSelect>
            <NativeSelect aria-label="Filter by classification" value={classification} onChange={(e) => setParam("classification", e.target.value || undefined)}>
              <option value="">All classifications</option>
              {(Object.keys(CLASSIFICATION_LABEL) as D.InvestorClassification[]).map((c) => <option key={c} value={c}>{CLASSIFICATION_LABEL[c]}</option>)}
            </NativeSelect>
            <NativeSelect aria-label="Filter by AML risk" value={risk} onChange={(e) => setParam("risk", e.target.value || undefined)}>
              <option value="">Any AML risk</option>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
            </NativeSelect>
          </div>
        </div>
        <DataTable
          rows={investors ? filtered : undefined}
          columns={columns}
          getRowId={(i) => i.id}
          loading={isPending}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(i) => router.push(`/identity/investors/${i.id}`)}
          defaultSort={{ key: "onboarded", dir: "desc" }}
          caption="Investors"
          empty={
            filtersActive
              ? { icon: <Users />, title: "No investors match these filters", description: "Change the status, type, classification or risk filter, or clear the search.", action: <Button size="sm" onClick={() => { setSearch(""); router.replace(pathname); }}>Clear filters</Button> }
              : { icon: <Users />, title: "No investors yet", description: "Onboard the first investor to start identity checks and screening.", action: canWrite ? <Button asChild size="sm" variant="primary"><Link href="/identity/onboard"><UserPlus /> Onboard investor</Link></Button> : undefined }
          }
        />
      </Card>
    </>
  );
}

export default function InvestorsPage() {
  return (
    <React.Suspense>
      <InvestorsView />
    </React.Suspense>
  );
}
