"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu as MenuIcon, Moon, Monitor, PanelLeft, Search, Sun, FlaskConical } from "lucide-react";
import { useSession, type ThemePref } from "@/stores/session";
import { PERSONAS, usePersona, useCurrentTenant } from "@/hooks/session";
import { ROLE_META } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Kbd, Tip } from "@/components/ui/primitives";
import { PersonAvatar } from "@/components/domain/logos";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlays";
import { Notifications } from "./notifications";
import { PaletteContext } from "./command-palette";
import { apiConfig } from "@/services/config";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const palette = React.useContext(PaletteContext);
  const toggleSidebar = useSession((s) => s.toggleSidebar);
  const tenant = useCurrentTenant();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-[color-mix(in_oklab,var(--background)_86%,transparent)] px-3 backdrop-blur-md md:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <MenuIcon className="size-5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={toggleSidebar} aria-label="Collapse sidebar">
        <PanelLeft className="size-[18px]" />
      </Button>
      <button
        onClick={palette.open}
        className="group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-left text-[13px] text-subtle shadow-1 transition-colors hover:border-border-strong md:max-w-[420px]"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search or jump to…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        {apiConfig.mode === "mock" && (
          <Tip content="Data is simulated in the browser. Set NEXT_PUBLIC_API_MODE=http to connect the backend.">
            <span className="mr-1 hidden h-7 items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-2.5 text-[12px] font-medium text-warning md:inline-flex">
              <FlaskConical className="size-3.5" /> Sandbox
            </span>
          </Tip>
        )}
        <span className="mr-1 hidden max-w-[180px] truncate text-[12px] text-muted xl:inline">{tenant.domain}</span>
        <Notifications />
        <ThemeMenu />
        <PersonaMenu />
      </div>
    </header>
  );
}

function ThemeMenu() {
  const theme = useSession((s) => s.theme);
  const setTheme = useSession((s) => s.setTheme);
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          <Icon className="size-[18px]" />
        </Button>
      </MenuTrigger>
      <MenuContent className="min-w-[160px]">
        <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
          <MenuRadioItem value="light">Light</MenuRadioItem>
          <MenuRadioItem value="dark">Dark</MenuRadioItem>
          <MenuRadioItem value="system">System</MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

function PersonaMenu() {
  const persona = usePersona();
  const setPersona = useSession((s) => s.setPersona);
  const signOut = useSession((s) => s.signOut);
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 transition-colors hover:bg-surface-3 md:pr-3" aria-label="Account and role">
          <PersonAvatar name={persona.name} src={persona.avatar} size={34} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[13px] font-medium">{persona.name}</span>
            <span className="block text-[11.5px] text-muted">{ROLE_META[persona.role].label}</span>
          </span>
        </button>
      </MenuTrigger>
      <MenuContent className="w-[290px]">
        <MenuLabel>Act as (role-based access demo)</MenuLabel>
        <MenuRadioGroup
          value={persona.id}
          onValueChange={(id) => {
            setPersona(id);
            qc.invalidateQueries();
            const p = PERSONAS.find((x) => x.id === id);
            if (p?.role === "investor") router.push("/home");
            else if (persona.role === "investor") router.push("/overview");
          }}
        >
          {PERSONAS.map((p) => (
            <MenuRadioItem key={p.id} value={p.id}>
              <span className="flex min-w-0 items-center gap-2.5">
                <PersonAvatar name={p.name} src={p.avatar} size={28} />
                <span className="min-w-0">
                <span className="block text-[13px]">{p.name}</span>
                <span className="block text-[11.5px] text-muted">{ROLE_META[p.role].label} · {p.organization}</span>
                </span>
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem
          onSelect={() => {
            signOut();
            router.push("/");
          }}
        >
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
