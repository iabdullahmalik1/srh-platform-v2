"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, Skeleton } from "./primitives";
import { Button } from "./button";
import { useEvents } from "@/stores/events";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sort?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
  width?: string;
}

interface Props<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  empty?: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode };
  defaultSort?: { key: string; dir: "asc" | "desc" };
  className?: string;
  rowClassName?: (row: T) => string | undefined;
  caption?: string;
}

const hideCls = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" };

export function DataTable<T>({ rows, columns, getRowId, loading, error, onRetry, onRowClick, pageSize = 15, empty, defaultSort, className, rowClassName, caption }: Props<T>) {
  const [sort, setSort] = React.useState(defaultSort);
  const [rawPage, setPage] = React.useState(1);
  const pulse = useEvents((s) => s.pulse);
  const [now, setNow] = React.useState(0);
  React.useEffect(() => {
    // Re-evaluate the highlight window whenever a new event pulses a row.
    const t = setTimeout(() => setNow(Date.now()), 0);
    const t2 = setTimeout(() => setNow(Date.now()), 2600);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [pulse]);

  const sorted = React.useMemo(() => {
    if (!rows) return [];
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? r : -r;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = rawPage > pages ? 1 : rawPage; // clamp when filters shrink the result set
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-[13px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{ width: c.width }}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("h-10 whitespace-nowrap px-4 text-[12px] font-medium text-muted first:pl-5 last:pr-5", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left", c.hideBelow && hideCls[c.hideBelow], c.className)}
                  >
                    {c.sort ? (
                      <button
                        className={cn("inline-flex items-center gap-1 rounded hover:text-foreground", c.align === "right" && "flex-row-reverse")}
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "desc" }))}
                      >
                        {c.header}
                        {active ? sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && !rows
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn("h-12 px-4 first:pl-5 last:pr-5", c.hideBelow && hideCls[c.hideBelow])}>
                        <Skeleton className="h-3.5 w-[70%]" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row) => {
                  const id = getRowId(row);
                  const pulsed = !!pulse[id] && now - pulse[id] < 2500 && now >= pulse[id];
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row)) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn(
                        "border-b border-border transition-colors duration-150 last:border-0",
                        onRowClick && "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none",
                        pulsed && "bg-brand-soft/60",
                        rowClassName?.(row),
                      )}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={cn("h-12 whitespace-nowrap px-4 align-middle first:pl-5 last:pr-5", c.align === "right" ? "text-right tabular" : c.align === "center" ? "text-center" : "text-left", c.hideBelow && hideCls[c.hideBelow], c.className)}>
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {!loading && rows && rows.length === 0 && empty && <EmptyState {...empty} />}
      {rows && rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-[12.5px] text-muted">
          <span className="tabular">
            {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <span className="px-1 tabular">
              {page} / {pages}
            </span>
            <Button variant="ghost" size="icon-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
