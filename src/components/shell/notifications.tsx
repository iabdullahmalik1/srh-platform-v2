"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CircleCheck, CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { PlatformEvent } from "@/types/domain";
import { useEvents } from "@/stores/events";
import { useRecentEvents } from "@/hooks/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { LiveDot } from "@/components/domain/status";
import { cn, fmt } from "@/lib/utils";

const ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, critical: CircleAlert };
const TONE = { info: "text-info bg-info-soft", success: "text-success bg-success-soft", warning: "text-warning bg-warning-soft", critical: "text-danger bg-danger-soft" };

export function EventRow({ e, compact }: { e: PlatformEvent; compact?: boolean }) {
  const I = ICON[e.severity];
  const body = (
    <div className={cn("flex gap-3 rounded-lg px-2.5 py-2.5 transition-colors", e.href && "hover:bg-surface-2")}>
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", TONE[e.severity])}>
        <I className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium">{e.title}</span>
          <span className="shrink-0 text-[11px] text-subtle tabular">{fmt.relative(e.at)}</span>
        </div>
        <p className={cn("text-[12.5px] text-muted", compact ? "truncate" : "line-clamp-2")}>{e.detail}</p>
      </div>
    </div>
  );
  return e.href ? <Link href={e.href} className="block focus-visible:outline-2 focus-visible:outline-ring rounded-lg">{body}</Link> : body;
}

export function Notifications() {
  const { live, unread, markRead } = useEvents();
  const { data, isPending } = useRecentEvents();
  const merged = React.useMemo(() => {
    const seen = new Set<string>();
    return [...live, ...(data ?? [])].filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 40);
  }, [live, data]);

  return (
    <Popover onOpenChange={(o) => o && markRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative">
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white tabular">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(400px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            Platform events <LiveDot />
          </div>
          <span className="text-[12px] text-muted">Event stream</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5 scrollbar-thin">
          {isPending && !live.length ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-2 h-12" />) : merged.map((e) => <EventRow key={e.id} e={e} />)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
