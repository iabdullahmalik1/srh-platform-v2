"use client";

import * as React from "react";
import { Dialog as DialogP, DropdownMenu as DM, Popover as PopoverP, Tabs as TabsP } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Dialog --------------------------------- */
export const Dialog = DialogP.Root;
export const DialogTrigger = DialogP.Trigger;
export const DialogClose = DialogP.Close;

export function DialogContent({ title, description, children, className, footer, size = "md" }: { title: string; description?: React.ReactNode; children?: React.ReactNode; className?: string; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <DialogP.Portal>
      <DialogP.Overlay className="fixed inset-0 z-50 bg-[rgb(8_12_24/0.48)] backdrop-blur-[2px] data-[state=open]:animate-[enter_200ms_var(--ease-decel)]" />
      <DialogP.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-3 overscroll-contain data-[state=open]:animate-enter focus-visible:outline-none",
          w,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <DialogP.Title className="text-[16px] font-semibold">{title}</DialogP.Title>
            {description ? <DialogP.Description className="mt-0.5 text-[13px] text-muted">{description}</DialogP.Description> : <DialogP.Description className="sr-only">{title}</DialogP.Description>}
          </div>
          <DialogP.Close className="-mr-1.5 grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </DialogP.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">{footer}</div>}
      </DialogP.Content>
    </DialogP.Portal>
  );
}

/* ----------------------------------- Sheet --------------------------------- */
export function SheetContent({ title, description, children, footer, className, side = "right" }: { title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; className?: string; side?: "right" | "left" }) {
  return (
    <DialogP.Portal>
      <DialogP.Overlay className="fixed inset-0 z-50 bg-[rgb(8_12_24/0.4)] data-[state=open]:animate-[enter_200ms_var(--ease-decel)]" />
      <DialogP.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-full max-w-[560px] flex-col border-border bg-surface shadow-3 overscroll-contain focus-visible:outline-none",
          side === "right" ? "right-0 border-l data-[state=open]:animate-[sheet-in-r_320ms_var(--ease-decel)]" : "left-0 border-r data-[state=open]:animate-[sheet-in-l_320ms_var(--ease-decel)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogP.Title className="text-[16px] font-semibold">{title}</DialogP.Title>
            {description ? <DialogP.Description asChild><div className="mt-0.5 text-[13px] text-muted">{description}</div></DialogP.Description> : <DialogP.Description className="sr-only">Details</DialogP.Description>}
          </div>
          <DialogP.Close className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </DialogP.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">{footer}</div>}
      </DialogP.Content>
    </DialogP.Portal>
  );
}

/* ------------------------------- Dropdown menu ----------------------------- */
export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export function MenuContent({ children, align = "end", className, sideOffset = 6 }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string; sideOffset?: number }) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={sideOffset} className={cn("z-[60] min-w-[220px] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2 data-[state=open]:animate-enter", className)}>
        {children}
      </DM.Content>
    </DM.Portal>
  );
}
export function MenuItem({ children, onSelect, className, disabled, destructive }: { children: React.ReactNode; onSelect?: () => void; className?: string; disabled?: boolean; destructive?: boolean }) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-3 [&_svg]:size-4 [&_svg]:text-muted",
        destructive && "text-danger [&_svg]:text-danger",
        className,
      )}
    >
      {children}
    </DM.Item>
  );
}
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <DM.Label className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-subtle">{children}</DM.Label>;
}
export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />;
}
export const MenuRadioGroup = DM.RadioGroup;
export function MenuRadioItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <DM.RadioItem value={value} className="relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg py-2 pl-7 pr-2.5 text-[13px] outline-none data-[highlighted]:bg-surface-3">
      <DM.ItemIndicator className="absolute left-2.5 size-1.5 rounded-full bg-brand" />
      {children}
    </DM.RadioItem>
  );
}

/* ---------------------------------- Popover -------------------------------- */
export const Popover = PopoverP.Root;
export const PopoverTrigger = PopoverP.Trigger;
export function PopoverContent({ children, className, align = "end" }: { children: React.ReactNode; className?: string; align?: "start" | "end" | "center" }) {
  return (
    <PopoverP.Portal>
      <PopoverP.Content align={align} sideOffset={8} className={cn("z-[60] rounded-xl border border-border bg-surface shadow-2 outline-none data-[state=open]:animate-enter", className)}>
        {children}
      </PopoverP.Content>
    </PopoverP.Portal>
  );
}

/* ----------------------------------- Tabs ---------------------------------- */
export const Tabs = TabsP.Root;
export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <TabsP.List className={cn("flex items-center gap-1 overflow-x-auto border-b border-border scrollbar-thin", className)}>{children}</TabsP.List>;
}
export function TabsTrigger({ value, children, count }: { value: string; children: React.ReactNode; count?: number }) {
  return (
    <TabsP.Trigger
      value={value}
      className="relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground data-[state=active]:border-brand data-[state=active]:text-foreground"
    >
      {children}
      {count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-[11px] tabular text-muted">{count}</span>}
    </TabsP.Trigger>
  );
}
export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return (
    <TabsP.Content value={value} className={cn("pt-5 focus-visible:outline-none data-[state=active]:animate-enter", className)}>
      {children}
    </TabsP.Content>
  );
}
