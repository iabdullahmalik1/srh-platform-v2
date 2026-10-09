"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Check, CircleCheck, CircleX, FlaskConical, Gauge, Keyboard, LogOut, Monitor, Moon, Palette, Rabbit, RotateCcw, Sun, Turtle, UserRound } from "lucide-react";
import { useCurrentTenant, usePersona } from "@/hooks/session";
import { useSession, type ThemePref } from "@/stores/session";
import type { LatencyProfile } from "@/services/config";
import { resetDemoData } from "@/services/demo";
import { Badge, Card, CardBody, CardHeader, KeyValue, Kbd, PageHeader, Switch, Tip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { DEPLOYMENT_META, ROLE_META } from "@/lib/constants";
import { CompanyName, PersonAvatar } from "@/components/domain/logos";
import { InfoTip } from "@/components/flows/flow";
import { cn } from "@/lib/utils";

const THEMES: { value: ThemePref; label: string; description: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", description: "Bright surfaces", icon: Sun },
  { value: "dark", label: "Dark", description: "Navy surfaces", icon: Moon },
  { value: "system", label: "System", description: "Follows your device", icon: Monitor },
];

/** Upper bound of each profile in milliseconds, for the meter. */
const LATENCY: Record<LatencyProfile, { label: string; icon: React.ElementType; read: number; write: number; readLabel: string; writeLabel: string; note: string }> = {
  fast: { label: "Fast", icon: Rabbit, read: 200, write: 300, readLabel: "under 200 ms", writeLabel: "under 300 ms", note: "Useful for walkthroughs." },
  realistic: { label: "Realistic", icon: Gauge, read: 700, write: 1400, readLabel: "0.3 to 0.7 s", writeLabel: "0.6 to 1.4 s", note: "Close to production with external providers." },
  slow: { label: "Slow", icon: Turtle, read: 2200, write: 3600, readLabel: "up to 2.2 s", writeLabel: "up to 3.6 s", note: "Shows every loading state." },
};
const LATENCY_MAX = 3600;
const FAILURES: { value: string; label: string }[] = [{ value: "0", label: "Off" }, { value: "0.1", label: "10%" }, { value: "0.25", label: "25%" }];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Preferences are stored in this browser." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Appearance />
          <Simulation />
        </div>
        <div className="flex flex-col gap-5">
          <Session />
          <Shortcuts />
        </div>
      </div>
    </>
  );
}

function Appearance() {
  const theme = useSession((s) => s.theme);
  const setTheme = useSession((s) => s.setTheme);
  return (
    <Card>
      <CardHeader icon={<Palette />} title="Appearance" description="Tenant brand colour applies in every theme." />
      <CardBody>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const selected = theme === t.value;
            return (
              <button key={t.value} role="radio" aria-checked={selected} onClick={() => setTheme(t.value)}
                className={cn("group overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-150", selected ? "border-brand ring-2 ring-brand/20" : "border-border hover:border-border-strong")}>
                <ThemePreview kind={t.value} />
                <div className="flex items-start justify-between gap-2 p-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium"><t.icon className="size-4 text-muted" />{t.label}</span>
                    <span className="block text-[12px] text-muted">{t.description}</span>
                  </span>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-brand bg-brand text-white" : "border-border-strong")}>{selected && <Check className="size-3" strokeWidth={3} />}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function ThemePreview({ kind }: { kind: ThemePref }) {
  const light = (
    <div className="flex h-full gap-1.5 bg-surface-3 p-2">
      <div className="w-5 rounded-sm bg-navy-3" />
      <div className="flex flex-1 flex-col gap-1.5"><div className="h-2 w-2/3 rounded-sm bg-border-strong" /><div className="flex-1 rounded-sm bg-surface shadow-1" /></div>
    </div>
  );
  const dark = (
    <div className="flex h-full gap-1.5 bg-navy-1 p-2">
      <div className="w-5 rounded-sm bg-navy-3" />
      <div className="flex flex-1 flex-col gap-1.5"><div className="h-2 w-2/3 rounded-sm bg-navy-4" /><div className="flex-1 rounded-sm bg-navy-2" /></div>
    </div>
  );
  return (
    <div aria-hidden className="relative h-20 border-b border-border">
      {kind === "light" ? light : kind === "dark" ? dark : (
        <div className="grid h-full grid-cols-2"><div className="overflow-hidden">{light}</div><div className="overflow-hidden">{dark}</div></div>
      )}
      <span className="absolute bottom-2 right-2 h-2 w-6 rounded-full bg-brand" />
    </div>
  );
}

function Simulation() {
  const latency = useSession((s) => s.latency);
  const failureRate = useSession((s) => s.failureRate);
  const ambient = useSession((s) => s.ambientEvents);
  const setSimulation = useSession((s) => s.setSimulation);
  const L = LATENCY[latency];
  return (
    <Card>
      <CardHeader icon={<FlaskConical />} title="Simulation" description="Controls the in-browser mock adapter only." />
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1 text-[12.5px] font-medium">Latency profile<InfoTip content={`${L.label}: reads ${L.readLabel}, writes ${L.writeLabel}. ${L.note}`} label="About latency" /></div>
          <div role="radiogroup" aria-label="Latency profile" className="grid grid-cols-3 gap-2">
            {(Object.keys(LATENCY) as LatencyProfile[]).map((k) => {
              const m = LATENCY[k];
              const on = latency === k;
              return (
                <button key={k} role="radio" aria-checked={on} onClick={() => setSimulation({ latency: k })}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[12.5px] font-medium transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-brand bg-brand-soft text-brand-ink ring-2 ring-brand/15" : "border-border text-muted hover:border-border-strong hover:text-foreground")}>
                  <m.icon className="size-5" aria-hidden />
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg bg-surface-2 p-3" aria-live="polite">
            {[{ k: "Reads", v: L.read, l: L.readLabel }, { k: "Writes", v: L.write, l: L.writeLabel }].map((r) => (
              <div key={r.k} className="flex items-center gap-3 text-[12px]">
                <span className="w-12 shrink-0 text-muted">{r.k}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-[var(--ease-standard)]" style={{ width: `${(r.v / LATENCY_MAX) * 100}%` }} /></span>
                <span className="w-24 shrink-0 text-right font-medium tabular">{r.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1 text-[12.5px] font-medium">
            Failure injection
            <InfoTip content="Failed requests simulate a provider timeout or outage. Write failures are safe to retry because every mutation carries an idempotency key, so a retry never creates a duplicate order or payment." label="About failure injection" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Failure injection" className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
              {FAILURES.map((f) => {
                const on = String(failureRate) === f.value;
                return (
                  <button key={f.value} role="radio" aria-checked={on} onClick={() => setSimulation({ failureRate: Number(f.value) })}
                    className={cn("h-8 rounded-md px-3 text-[13px] font-medium transition-colors", on ? "bg-surface text-foreground shadow-1" : "text-muted hover:text-foreground")}>
                    {f.label}
                  </button>
                );
              })}
            </div>
            <Tip content={failureRate > 0 ? `${Math.round(failureRate * 100)} in every 100 requests fail` : "Every request succeeds unless a business rule rejects it"}>
              <span tabIndex={0} className="grid grid-cols-10 gap-[3px]" role="img" aria-label={`${Math.round(failureRate * 100)}% of requests fail`}>
                {Array.from({ length: 20 }).map((_, i) => {
                  const fail = i < Math.round(failureRate * 20);
                  return <span key={i} className={cn("grid size-3.5 place-items-center rounded-[4px] transition-colors duration-300", fail ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>{fail ? <CircleX className="size-2.5" aria-hidden /> : <CircleCheck className="size-2.5" aria-hidden />}</span>;
                })}
              </span>
            </Tip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
          <label htmlFor="ambient" className="flex min-w-0 cursor-pointer items-center gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", ambient ? "bg-success-soft text-success" : "bg-surface-3 text-muted")}><Activity className="size-4" aria-hidden /></span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-[13.5px] font-medium">Ambient events</span>
              <span className="block text-[12.5px] text-muted">NAV updates, webhooks and order progress.</span>
            </span>
          </label>
          <Switch id="ambient" label="Ambient events" checked={ambient} onCheckedChange={(v) => setSimulation({ ambientEvents: v })} />
        </div>
        <ResetDemo />
      </CardBody>
    </Card>
  );
}

function ResetDemo() {
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const reset = () => {
    setBusy(true);
    resetDemoData();
    qc.clear();
    window.location.reload();
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-danger/25 bg-danger-soft/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium">Reset demo data</div>
        <div className="text-[12.5px] text-muted">Restores every record and setting to the seed state.</div>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button variant="secondary" className="shrink-0"><RotateCcw /> Reset demo data</Button></DialogTrigger>
        <DialogContent
          size="sm"
          title="Reset demo data?"
          description="Every change made in this browser is discarded, including new orders, approvals, API keys, module changes and branding. The page reloads afterwards."
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Keep my changes</Button></DialogClose>
              <Button variant="danger" onClick={reset} isLoading={busy} loadingText="Resetting…"><RotateCcw /> Reset demo data</Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}

function Session() {
  const persona = usePersona();
  const tenant = useCurrentTenant();
  const signOut = useSession((s) => s.signOut);
  const router = useRouter();
  return (
    <Card>
      <CardHeader icon={<UserRound />} title="Session" description="Switch persona from the account menu." />
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <PersonAvatar name={persona.name} src={persona.avatar} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{persona.name}</div>
            <div className="truncate text-[12.5px] text-muted">{persona.title} · {persona.organization}</div>
          </div>
        </div>
        <KeyValue
          items={[
            { label: "Role", value: <Badge tone="brand">{ROLE_META[persona.role].label}</Badge> },
            { label: "Email", value: persona.email },
            { label: "Tenant", value: <CompanyName name={tenant.name} logo={tenant.brand.logo} size={22} /> },
            { label: "Deployment", value: DEPLOYMENT_META[tenant.deploymentModel].label },
          ]}
        />
        <p className="text-[12.5px] text-muted">{ROLE_META[persona.role].description}.</p>
        <Button variant="secondary" className="self-start" onClick={() => { signOut(); router.push("/"); }}><LogOut /> Sign out</Button>
      </CardBody>
    </Card>
  );
}

function Shortcuts() {
  const [mac, setMac] = React.useState(false);
  React.useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  const mod = mac ? "⌘" : "Ctrl";
  const items = [
    { keys: [mod, "K"], label: "Open the command palette" },
    { keys: ["Esc"], label: "Close a dialog, sheet or menu" },
    { keys: ["Tab"], label: "Move between controls" },
    { keys: ["Enter"], label: "Open the focused table row" },
  ];
  return (
    <Card>
      <CardHeader icon={<Keyboard />} title="Keyboard shortcuts" />
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
            <span>{s.label}</span>
            <span className="flex items-center gap-1">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
