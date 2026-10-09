"use client";

import * as React from "react";
import { Avatar as AvatarP, Checkbox as CheckboxP, Progress as ProgressP, Separator as SeparatorP, Switch as SwitchP, Tooltip as TooltipP } from "radix-ui";
import { Check, Copy, CircleAlert, Inbox, LoaderCircle, RotateCcw } from "lucide-react";
import { cn, fmt } from "@/lib/utils";
import { Button } from "./button";
import { ApiError, errorMessage } from "@/services/errors";

/* ----------------------------------- Card ---------------------------------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface shadow-1", className)} {...p} />;
}
export function CardHeader({ title, description, action, className, icon }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-border px-5 py-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-muted [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-6 text-foreground">{title}</h3>
          {description && <p className="text-[12.5px] leading-5 text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
export function CardBody({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...p} />;
}

/* ----------------------------------- Badge --------------------------------- */
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "outline";
const toneCls: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  outline: "border border-border-strong text-muted",
};
export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium leading-none", toneCls[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* ---------------------------------- Inputs --------------------------------- */
const fieldBase =
  "w-full rounded-lg border border-border-strong bg-surface px-3 text-[13.5px] text-foreground shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] placeholder:text-subtle transition-[border-color,box-shadow] duration-150 hover:border-gray-8 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklab,var(--brand)_18%,transparent)] disabled:opacity-50 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-9", className)} {...p} />;
});
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-[84px] py-2 leading-relaxed", className)} {...p} />;
});
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect({ className, children, ...p }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, "h-9 appearance-none pr-8", className)} {...p}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>
    </div>
  );
});

export function Field({ label, htmlFor, hint, error, required, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; error?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  const id = htmlFor;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[12.5px] font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-muted">(required)</span>}
      </label>
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="flex items-center gap-1 text-[12px] text-danger" role="alert">
          <CircleAlert className="size-3.5" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({ checked, onCheckedChange, disabled, label, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string; id?: string }) {
  return (
    <SwitchP.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-gray-7 transition-colors data-[state=unchecked]:bg-gray-7 dark:data-[state=unchecked]:bg-gray-6 duration-150 data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      <SwitchP.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-1 transition-transform duration-150 ease-[var(--ease-standard)] data-[state=checked]:translate-x-[18px]" />
    </SwitchP.Root>
  );
}

export function Checkbox({ checked, onCheckedChange, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  return (
    <CheckboxP.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-border-strong bg-surface transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand"
    >
      <CheckboxP.Indicator>
        <Check className="size-3.5 text-white" strokeWidth={3} />
      </CheckboxP.Indicator>
    </CheckboxP.Root>
  );
}

/* --------------------------------- Feedback -------------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <LoaderCircle className={cn("size-4 animate-spin text-muted", className)} aria-hidden />
      <span className="sr-only">{label}…</span>
    </span>
  );
}

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "success" | "warning" | "info" }) {
  const color = { brand: "bg-brand", success: "bg-success", warning: "bg-warning", info: "bg-info" }[tone];
  return (
    <ProgressP.Root value={value} className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <ProgressP.Indicator className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-standard)]", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </ProgressP.Root>
  );
}

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return <SeparatorP.Root orientation={orientation} className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-xl bg-surface-3 text-muted [&_svg]:size-5">{icon ?? <Inbox />}</div>
      <h3 className="text-[14px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const e = error instanceof ApiError ? error : null;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
        <CircleAlert className="size-5" />
      </div>
      <h3 className="text-[14px] font-semibold">This data could not be loaded</h3>
      <p className="mt-1 max-w-md text-[13px] text-muted">{errorMessage(error)}</p>
      {e && <p className="mt-1 font-mono text-[11px] text-subtle">{e.code} · {e.requestId}</p>}
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

/* ---------------------------------- Tooltip -------------------------------- */
export const TooltipProvider = TooltipP.Provider;
export function Tip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipP.Root>
      <TooltipP.Trigger asChild>{children}</TooltipP.Trigger>
      <TooltipP.Portal>
        <TooltipP.Content side={side} sideOffset={6} className="z-[70] max-w-xs rounded-md bg-gray-12 px-2.5 py-1.5 text-[12px] leading-snug text-gray-1 shadow-2 data-[state=delayed-open]:animate-enter">
          {content}
        </TooltipP.Content>
      </TooltipP.Portal>
    </TooltipP.Root>
  );
}

/* ---------------------------------- Avatar --------------------------------- */
export function Avatar({ initials, className, tone = "brand" }: { initials: string; className?: string; tone?: "brand" | "navy" | "neutral" }) {
  const cls = tone === "brand" ? "bg-brand text-white" : tone === "navy" ? "bg-navy-3 text-navy-text" : "bg-surface-3 text-muted";
  return (
    <AvatarP.Root className={cn("inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full text-[11.5px] font-semibold", cls, className)}>
      <AvatarP.Fallback>{initials}</AvatarP.Fallback>
    </AvatarP.Root>
  );
}

/* --------------------------------- Mono / copy ----------------------------- */
export function CopyText({ value, display, className, lead = 6, tail = 4 }: { value: string; display?: string; className?: string; lead?: number; tail?: number }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className={cn("group inline-flex max-w-full items-center gap-1 rounded px-1 -mx-1 font-mono text-[12px] text-muted hover:bg-surface-3 hover:text-foreground", className)}
      aria-label={`Copy ${value}`}
      title={value}
    >
      <span className="truncate">{display ?? fmt.hash(value, lead, tail)}</span>
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-2 px-1 font-sans text-[11px] font-medium text-muted">{children}</kbd>;
}

/* ------------------------------ Layout helpers ----------------------------- */
export function PageHeader({ title, description, actions, eyebrow, children }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 animate-enter">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 text-[12.5px] font-medium text-muted">{eyebrow}</div>}
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight md:text-[26px]">{title}</h1>
          {description && <div className="mt-1 max-w-3xl text-[13.5px] text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, icon, trend, loading, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; trend?: { value: string; positive?: boolean }; loading?: boolean; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        {icon && <span className="text-subtle [&_svg]:size-4">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-7 w-28" />
      ) : (
        <div className="mt-1.5 text-[22px] font-semibold tracking-tight tabular">{value}</div>
      )}
      <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
        {trend && <span className={cn("font-medium", trend.positive ? "text-success" : "text-danger")}>{trend.value}</span>}
        {sub}
      </div>
    </Card>
  );
}

export function KeyValue({ items, className, cols = 2 }: { items: { label: string; value: React.ReactNode }[]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3.5", cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] text-muted">{i.label}</dt>
          <dd className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; count?: number }[]; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface-2 p-0.5 scrollbar-thin", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors duration-150",
            size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]",
            value === o.value ? "bg-surface text-foreground shadow-1" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] tabular", value === o.value ? "bg-surface-3" : "bg-transparent")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
