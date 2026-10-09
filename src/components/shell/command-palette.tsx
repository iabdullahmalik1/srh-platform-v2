"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog as DialogP } from "radix-ui";
import { Search, UserPlus, PackagePlus, ShoppingCart, Scale, Moon, Sun, Users, Layers, Workflow, CornerDownLeft } from "lucide-react";
import { CONSOLE_NAV, INVESTOR_NAV } from "./nav";
import { useCan, useCurrentTenant, usePersona } from "@/hooks/session";
import { useAssets, useInvestors, useOrders, useRunRecon } from "@/hooks/api";
import { useSession } from "@/stores/session";
import { fmt } from "@/lib/utils";
import { Kbd } from "@/components/ui/primitives";
import type { ModuleKey } from "@/types/domain";

export const PaletteContext = React.createContext<{ open: () => void }>({ open: () => {} });

export function CommandPalette({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const persona = usePersona();
  const setTheme = useSession((s) => s.setTheme);
  const runRecon = useRunRecon();
  const staff = persona.role !== "investor";
  const tenant = useCurrentTenant();
  const has = (m: ModuleKey) => tenant.modules.includes(m);
  const canSubscribe = useCan("orders.subscribe") && has("primary-market");
  const canOnboard = useCan("investors.write") && has("identity");
  const canStructure = useCan("assets.write") && has("assets");
  const canRecon = useCan("recon.resolve") && has("registry");
  const { data: investors } = useInvestors();
  const { data: assets } = useAssets();
  const { data: orders } = useOrders();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const nav = (staff ? CONSOLE_NAV : INVESTOR_NAV).flatMap((g) => g.items).filter((i) => !i.roles || i.roles.includes(persona.role));
  const item = "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-foreground aria-selected:bg-surface-3 [&_svg]:size-4 [&_svg]:text-muted";
  const group = "px-1.5 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle";

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <DialogP.Root open={open} onOpenChange={setOpen}>
        <DialogP.Portal>
          <DialogP.Overlay className="fixed inset-0 z-[80] bg-[rgb(8_12_24/0.5)] backdrop-blur-[2px]" />
          <DialogP.Content className="fixed left-1/2 top-[12vh] z-[80] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-3 data-[state=open]:animate-enter">
            <DialogP.Title className="sr-only">Command palette</DialogP.Title>
            <DialogP.Description className="sr-only">Search pages, records and actions</DialogP.Description>
            <Command label="Command palette" loop>
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="size-4 text-muted" />
                <Command.Input autoFocus placeholder="Search investors, assets, orders or type a command…" className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-subtle" />
                <Kbd>Esc</Kbd>
              </div>
              <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto py-1 scrollbar-thin">
                <Command.Empty className="px-4 py-10 text-center text-[13px] text-muted">No matches. Try an investor name, a ticker or an order number.</Command.Empty>
                {staff && (canSubscribe || canOnboard || canStructure || canRecon) && (
                  <Command.Group heading="Actions" className={group}>
                    {canSubscribe && <Command.Item className={item} onSelect={() => go("/orders/new")}><ShoppingCart /> New subscription</Command.Item>}
                    {canOnboard && <Command.Item className={item} onSelect={() => go("/identity/onboard")}><UserPlus /> Onboard investor</Command.Item>}
                    {canStructure && <Command.Item className={item} onSelect={() => go("/assets/new")}><PackagePlus /> Structure a new asset</Command.Item>}
                    {canRecon && <Command.Item className={item} onSelect={() => { setOpen(false); runRecon.mutate(); }}><Scale /> Run reconciliation now</Command.Item>}
                  </Command.Group>
                )}
                {!staff && canSubscribe && (
                  <Command.Group heading="Actions" className={group}>
                    <Command.Item className={item} onSelect={() => go("/orders/new")}><ShoppingCart /> Subscribe to an offering</Command.Item>
                  </Command.Group>
                )}
                <Command.Group heading="Go to" className={group}>
                  {nav.map((n) => (
                    <Command.Item key={n.href} value={`go ${n.label}`} className={item} onSelect={() => go(n.href)}>
                      <n.icon /> {n.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                {staff && (
                  <>
                    <Command.Group heading="Investors" className={group}>
                      {investors?.items.slice(0, 60).map((i) => (
                        <Command.Item key={i.id} value={`investor ${i.name} ${i.id}`} className={item} onSelect={() => go(`/identity/investors/${i.id}`)}>
                          <Users /> <span className="flex-1 truncate">{i.name}</span> <span className="text-[12px] text-muted">{i.country}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                    <Command.Group heading="Assets" className={group}>
                      {assets?.map((a) => (
                        <Command.Item key={a.id} value={`asset ${a.name} ${a.shortName}`} className={item} onSelect={() => go(`/assets/${a.id}`)}>
                          <Layers /> <span className="flex-1 truncate">{a.name}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </>
                )}
                <Command.Group heading="Orders" className={group}>
                  {orders?.slice(0, 40).map((o) => (
                    <Command.Item key={o.id} value={`order ${o.id} ${o.investorName}`} className={item} onSelect={() => go(`/orders/${o.id}`)}>
                      <Workflow /> <span className="font-mono text-[12.5px]">{o.id}</span> <span className="flex-1 truncate text-muted">{o.investorName}</span> <span className="text-[12px] tabular text-muted">{fmt.money(o.amount, o.currency, { compact: true })}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Appearance" className={group}>
                  <Command.Item className={item} onSelect={() => { setTheme("light"); setOpen(false); }}><Sun /> Light theme</Command.Item>
                  <Command.Item className={item} onSelect={() => { setTheme("dark"); setOpen(false); }}><Moon /> Dark theme</Command.Item>
                </Command.Group>
              </Command.List>
              <div className="flex items-center gap-3 border-t border-border bg-surface-2 px-4 py-2 text-[11.5px] text-muted">
                <span className="inline-flex items-center gap-1"><CornerDownLeft className="size-3" /> to select</span>
                <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> to move</span>
              </div>
            </Command>
          </DialogP.Content>
        </DialogP.Portal>
      </DialogP.Root>
    </PaletteContext.Provider>
  );
}
