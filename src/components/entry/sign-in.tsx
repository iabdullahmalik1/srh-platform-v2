/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CircleHelp,
  CodeXml,
  Cpu,
  Database,
  KeyRound,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MonitorCheck,
  Palette,
  Repeat2,
  Server,
  ShieldCheck,
  Usb,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { DeploymentModel, Persona, Tenant } from "@/types/domain";
import { SrhLockup } from "@/components/brand/srh-logo";
import { TenantMark } from "@/components/shell/sidebar";
import { CompanyLogo, PersonAvatar } from "@/components/domain/logos";
import { Button } from "@/components/ui/button";
import { Field, Input, Tip } from "@/components/ui/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { DEPLOYMENT_META, ROLE_META } from "@/lib/constants";
import { asset } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { ChoiceCard, EASE, GroupLabel, IconChip, SelectDot } from "./parts";
import { groupPersonas, roleChips } from "./role-capabilities";

/* ------------------------------------------------------------------ */
/* Brand panel                                                         */
/* ------------------------------------------------------------------ */

const PILLARS: { icon: LucideIcon; label: string }[] = [
  { icon: Landmark, label: "Issue and distribute" },
  { icon: ArrowLeftRight, label: "Settle on any rail" },
  { icon: ShieldCheck, label: "Compliance on every step" },
];

/** Full-height navy panel with a slowly drifting photograph, aurora and the animated lockup. */
export function BrandPanel() {
  const reduce = useReducedMotion();
  return (
    <aside className="relative hidden overflow-hidden bg-navy-1 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      <motion.img
        src={asset("/media/features/tower-abstract.webp")}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
        initial={{ scale: 1.12, opacity: 0 }}
        animate={reduce ? { scale: 1.04, opacity: 0.75 } : { scale: [1.12, 1.04, 1.08], opacity: 0.75 }}
        transition={reduce ? { duration: 0 } : { scale: { duration: 26, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }, opacity: { duration: 1.2, ease: EASE } }}
      />
      <div aria-hidden className="app-aurora absolute inset-0 opacity-60 mix-blend-screen" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--navy-1)_70%,transparent)_0%,color-mix(in_oklab,var(--navy-1)_20%,transparent)_38%,color-mix(in_oklab,var(--navy-1)_88%,transparent)_78%,var(--navy-1)_100%)]" />

      <div className="relative flex h-full flex-col px-10 py-10 xl:px-14 xl:py-12">
        <SrhLockup height={46} tone="light" animate />
        <div className="mt-auto">
          <motion.h1
            className="max-w-[520px] text-[38px] font-semibold leading-[1.08] tracking-[-0.025em] xl:text-[44px]"
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          >
            The operating system for tokenised capital markets.
          </motion.h1>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {PILLARS.map((p, i) => (
              <motion.li
                key={p.label}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-1.5 pr-4 text-[13px] font-medium text-white/90 backdrop-blur-md"
              >
                <span className="grid size-7 place-items-center rounded-full bg-white/10">
                  <p.icon className="size-3.5" aria-hidden />
                </span>
                {p.label}
              </motion.li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-2 border-t border-white/10 pt-5 text-[12px] text-navy-muted">
            <LockKeyhole className="size-3.5" aria-hidden />
            SRH Markets Ltd is regulated by the FSRA (ADGM) and VARA (Dubai).
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Compact navy header that replaces the brand panel on small screens. */
export function MobileBrandHeader() {
  return (
    <header className="relative overflow-hidden bg-navy-1 px-4 py-4 text-white lg:hidden">
      <img src={asset("/media/features/tower-abstract.webp")} alt="" aria-hidden className="absolute inset-0 size-full object-cover object-[50%_30%] opacity-35" />
      <div aria-hidden className="app-aurora absolute inset-0 opacity-60" />
      <div className="relative flex items-center justify-between gap-3">
        <SrhLockup height={30} tone="light" animate />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11.5px] font-medium text-navy-text">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          Sandbox
        </span>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: environment                                                 */
/* ------------------------------------------------------------------ */

const DEPLOY_ICON: Record<DeploymentModel, LucideIcon> = { "own-platform": ShieldCheck, "white-label": Palette, headless: CodeXml, dedicated: Server };
const DEPLOY_SHORT: Record<DeploymentModel, string> = { "own-platform": "Regulated platform", "white-label": "White-label platform", headless: "Headless API", dedicated: "Dedicated deployment" };

export function DeploymentChip({ model }: { model: DeploymentModel }) {
  return (
    <Tip content={DEPLOYMENT_META[model].description}>
      <span className="inline-flex">
        <IconChip icon={DEPLOY_ICON[model]}>{DEPLOY_SHORT[model]}</IconChip>
      </span>
    </Tip>
  );
}

export function EnvironmentStep({ tenants, value, onChange }: { tenants: Tenant[]; value: string; onChange: (id: string) => void }) {
  const own = tenants.filter((t) => t.deploymentModel === "own-platform");
  const partners = tenants.filter((t) => t.deploymentModel !== "own-platform");
  return (
    <div role="radiogroup" aria-label="Demo environment" className="space-y-6">
      <section>
        <GroupLabel icon={ShieldCheck}>SRH regulated platform</GroupLabel>
        {own.map((t) => (
          <ChoiceCard key={t.id} name="tenant" value={t.id} selected={value === t.id} onSelect={() => onChange(t.id)} className="items-center gap-4 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-border">
              <TenantMark tenant={t} size={36} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{t.name}</span>
              <span className="mt-0.5 block truncate font-mono text-[11.5px] text-subtle">{t.domain}</span>
              <span className="mt-2 flex sm:hidden"><DeploymentChip model={t.deploymentModel} /></span>
            </span>
            <span className="hidden sm:flex"><DeploymentChip model={t.deploymentModel} /></span>
            <SelectDot selected={value === t.id} />
          </ChoiceCard>
        ))}
      </section>
      <section>
        <GroupLabel icon={Cpu}>Technology for licensed institutions</GroupLabel>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {partners.map((t) => (
            <ChoiceCard key={t.id} name="tenant" value={t.id} selected={value === t.id} onSelect={() => onChange(t.id)} className="items-center gap-3 p-3.5 sm:flex-col sm:items-start">
              <span className="flex w-auto items-center justify-between sm:w-full">
                <TenantMark tenant={t} size={36} />
                <span className="hidden sm:block"><SelectDot selected={value === t.id} /></span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-snug text-foreground sm:min-h-[2lh]">{t.name}</span>
                <span className="mt-2 flex"><DeploymentChip model={t.deploymentModel} /></span>
              </span>
              <span className="sm:hidden"><SelectDot selected={value === t.id} /></span>
            </ChoiceCard>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: role                                                        */
/* ------------------------------------------------------------------ */

function OrgLine({ org }: { org: string }) {
  const individual = org.toLowerCase() === "individual";
  return (
    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
      {individual ? <UserRound className="size-3.5 shrink-0 text-subtle" aria-hidden /> : <CompanyLogo name={org} size={15} />}
      <span className="truncate">{individual ? "Individual investor" : org}</span>
    </span>
  );
}

export function RoleStep({ personas, value, onChange }: { personas: Persona[]; value: string; onChange: (id: string) => void }) {
  const groups = groupPersonas(personas);
  return (
    <div role="radiogroup" aria-label="Role" className="space-y-5">
      {groups.map((g) => (
        <section key={g.key}>
          <GroupLabel icon={g.key === "platform" ? ShieldCheck : g.key === "issuer" ? Landmark : g.key === "investor" ? UserRound : LockKeyhole}>{g.label}</GroupLabel>
          <div className="space-y-2">
            {g.personas.map((p) => {
              const selected = value === p.id;
              return (
                <ChoiceCard key={p.id} name="persona" value={p.id} selected={selected} onSelect={() => onChange(p.id)} className="flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <PersonAvatar name={p.name} src={p.avatar} size={44} className="order-1" />
                  <span className="order-2 min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[14px] font-semibold text-foreground">{p.name}</span>
                      <span className="hidden shrink-0 text-[12px] text-subtle md:inline">{ROLE_META[p.role].label}</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">{p.title}</span>
                    <OrgLine org={p.organization} />
                  </span>
                  <span className="order-4 flex basis-full gap-1.5 pl-14 sm:order-3 sm:basis-auto sm:pl-0" aria-label={`Can: ${roleChips(p.role).map((c) => c.label).join(", ")}`}>
                    {roleChips(p.role).map((c) => (
                      <IconChip key={c.label} icon={c.icon} tone={selected ? "brand" : "neutral"}>
                        {c.label}
                      </IconChip>
                    ))}
                  </span>
                  <span className="order-3 sm:order-4">
                    <SelectDot selected={selected} />
                  </span>
                </ChoiceCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: secure sign-in                                              */
/* ------------------------------------------------------------------ */

type CheckState = "idle" | "running" | "done";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SecureStep({
  tenant,
  persona,
  email,
  onEmail,
  onEdit,
  onSignedIn,
}: {
  tenant: Tenant;
  persona: Persona;
  email: string;
  onEmail: (v: string) => void;
  onEdit: (step: number) => void;
  onSignedIn: () => void;
}) {
  const reduce = useReducedMotion();
  const [state, setState] = React.useState<CheckState>("idle");
  const [done, setDone] = React.useState(0);
  const [error, setError] = React.useState<string>();
  const checks = React.useMemo(
    () => [
      { icon: MonitorCheck, label: "Device trust", detail: "Managed device, disk encrypted", pending: "Checking this device" },
      { icon: KeyRound, label: "SSO assertion", detail: `Signed by the ${tenant.shortName} identity provider`, pending: "Requesting assertion" },
      { icon: Usb, label: "Hardware key", detail: "Security key verified", pending: "Touch your security key" },
      { icon: ShieldCheck, label: "Policy check", detail: `${ROLE_META[persona.role].label} access granted`, pending: "Evaluating access policy" },
    ],
    [tenant.shortName, persona.role],
  );

  const onSignedInRef = React.useRef(onSignedIn);
  React.useEffect(() => {
    onSignedInRef.current = onSignedIn;
  });

  React.useEffect(() => {
    if (state !== "running") return;
    const step = reduce ? 250 : 620;
    const timers = checks.map((_, i) => setTimeout(() => setDone(i + 1), step * (i + 1)));
    timers.push(setTimeout(() => setState("done"), step * checks.length + 200));
    return () => timers.forEach(clearTimeout);
  }, [state, checks, reduce]);

  React.useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => onSignedInRef.current(), 450);
    return () => clearTimeout(t);
  }, [state]);

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (!emailRe.test(email.trim())) {
      setError("Enter your work email, for example name@company.com");
      document.getElementById("signin-email")?.focus();
      return;
    }
    setError(undefined);
    setDone(0);
    setState("running");
  }

  const busy = state !== "idle";

  return (
    <form onSubmit={start} className="space-y-5" noValidate>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-2">
        <div className="flex items-center gap-3 p-3.5">
          <TenantMark tenant={tenant} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-foreground">{tenant.name}</span>
            <span className="mt-1 flex"><DeploymentChip model={tenant.deploymentModel} /></span>
          </span>
          <Button type="button" variant="link" size="sm" disabled={busy} onClick={() => onEdit(0)}>Change</Button>
        </div>
        <div className="flex items-center gap-3 p-3.5">
          <PersonAvatar name={persona.name} src={persona.avatar} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-foreground">{persona.name}</span>
            <span className="block truncate text-[12.5px] text-muted">{ROLE_META[persona.role].label}, {persona.organization}</span>
          </span>
          <Button type="button" variant="link" size="sm" disabled={busy} onClick={() => onEdit(1)}>Change</Button>
        </div>
      </div>

      <Field label="Work email" htmlFor="signin-email" error={error}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={busy}
            onChange={(e) => onEmail(e.target.value)}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "signin-email-error" : undefined}
            className="h-11 pl-9 text-[14px]"
          />
        </div>
      </Field>

      <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={state === "running"} loadingText="Verifying…" disabled={state === "done"}>
        {state === "done" ? (
          <>
            <Check /> Signed in
          </>
        ) : (
          <>
            <KeyRound /> Continue with SSO <ArrowRight className="ml-auto" />
          </>
        )}
      </Button>

      <AnimatePresence initial={false}>
        {busy && (
          <motion.ol
            key="checks"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden rounded-xl border border-border"
            aria-live="polite"
          >
            {checks.map((c, i) => {
              const status = i < done ? "done" : i === done && state === "running" ? "active" : "waiting";
              return (
                <li key={c.label} className={cn("flex items-center gap-3 px-3.5 py-2.5", i > 0 && "border-t border-border")}>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200", status === "done" ? "bg-success-soft text-success" : status === "active" ? "bg-brand-soft text-brand-ink" : "bg-surface-3 text-subtle")}>
                    <c.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px] font-medium", status === "waiting" ? "text-muted" : "text-foreground")}>{c.label}</span>
                    <span className="block truncate text-[12px] text-muted">{status === "done" ? c.detail : status === "active" ? `${c.pending}…` : "Waiting"}</span>
                  </span>
                  <span className="grid size-5 place-items-center">
                    {status === "done" ? (
                      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.22, ease: EASE }} className="grid size-5 place-items-center rounded-full bg-success text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </motion.span>
                    ) : status === "active" ? (
                      <LoaderCircle className="size-4 animate-spin text-brand" aria-hidden />
                    ) : (
                      <span className="size-1.5 rounded-full bg-border-strong" />
                    )}
                  </span>
                </li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>

      <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted">
        <LockKeyhole className="size-3.5" aria-hidden />
        SSO, hardware-key MFA and role-based access
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Demo explainer                                                      */
/* ------------------------------------------------------------------ */

const DEMO_POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Database, text: "All data is simulated and can be reset at any time." },
  { icon: Repeat2, text: "Switch environment and role from the console menu." },
  { icon: LockKeyhole, text: "No real identities, funds or keys are used." },
];

export function DemoInfo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleHelp /> What is this demo?
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-4">
        <div className="text-[13.5px] font-semibold text-foreground">Sandbox environment</div>
        <ul className="mt-3 space-y-3">
          {DEMO_POINTS.map((p) => (
            <li key={p.text} className="flex items-start gap-2.5 text-[12.5px] text-muted">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-foreground">
                <p.icon className="size-3.5" aria-hidden />
              </span>
              <span className="pt-1">{p.text}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
