"use client";

/**
 * Chart primitives. Rules (dataviz skill): one axis, thin marks, recessive grid,
 * categorical colours in fixed order (--chart-1..6), legend for 2+ series,
 * text in text tokens, hover tooltip on every plot.
 */
import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, fmt } from "@/lib/utils";

export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

const axisTick = { fill: "var(--subtle-foreground)", fontSize: 11 };

function TooltipBox({ active, payload, label, format, labelFormat }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; format: (v: number) => string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-2">
      <div className="mb-1 text-[11.5px] text-muted">{labelFormat ? labelFormat(String(label)) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[12.5px]">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular text-foreground">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendArea({ data, dataKey, name, height = 220, format = (v) => fmt.money(v, "USD", { compact: true }), xFormat = (d) => fmt.dateShort(d), color = SERIES[0], domain }: { data: Record<string, number | string>[]; dataKey: string; name: string; height?: number; format?: (v: number) => string; xFormat?: (d: string) => string; color?: string; domain?: [number | "auto", number | "auto"] }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis dataKey="date" tickFormatter={xFormat} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={format} tick={axisTick} axisLine={false} tickLine={false} width={64} domain={domain ?? ["auto", "auto"]} />
          <Tooltip cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} content={<TooltipBox format={format} labelFormat={(l) => fmt.date(l)} />} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#a${id})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({ data, series, height = 220, format = (v) => fmt.money(v, "USD", { compact: true }), xFormat = (d) => fmt.dateShort(d) }: { data: Record<string, number | string>[]; series: { key: string; name: string }[]; height?: number; format?: (v: number) => string; xFormat?: (d: string) => string }) {
  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap gap-4" aria-hidden>
        {series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: SERIES[i] }} />
            {s.name}
          </span>
        ))}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={xFormat} tick={axisTick} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={format} tick={axisTick} axisLine={false} tickLine={false} width={64} />
            <Tooltip cursor={{ fill: "var(--surface-3)", opacity: 0.6 }} content={<TooltipBox format={format} labelFormat={(l) => fmt.date(l)} />} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={18} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Sparkline({ data, dataKey = "nav", height = 40, className, color = SERIES[0] }: { data: Record<string, number | string>[]; dataKey?: string; height?: number; className?: string; color?: string }) {
  return (
    <div style={{ height }} className={cn("w-full", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar list: composition with direct labels, no legend needed. */
export function BarList({ items, format = (v) => fmt.money(v, "USD", { compact: true }), className }: { items: { key: string; label: React.ReactNode; value: number; color?: string }[]; format?: (v: number) => string; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((i, idx) => (
        <li key={i.key} className="group">
          <div className="mb-1 flex items-center justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate text-foreground">{i.label}</span>
            <span className="shrink-0 tabular text-muted">
              <span className="font-medium text-foreground">{format(i.value)}</span> · {((i.value / total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-standard)]" style={{ width: `${(i.value / max) * 100}%`, background: i.color ?? SERIES[idx % SERIES.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
