"use client";

import { create } from "zustand";
import type { PlatformEvent } from "@/types/domain";

interface EventState {
  live: PlatformEvent[];
  unread: number;
  lastSeenAt: string;
  /** Order ids that changed recently, used to pulse rows and lifecycle rails. */
  pulse: Record<string, number>;
  push: (e: PlatformEvent) => void;
  markRead: () => void;
}

export const useEvents = create<EventState>()((set) => ({
  live: [],
  unread: 0,
  lastSeenAt: new Date().toISOString(),
  pulse: {},
  push: (e) =>
    set((s) => ({
      live: [e, ...s.live].slice(0, 100),
      unread: s.unread + 1,
      pulse: { ...s.pulse, [e.objectId]: Date.now() },
    })),
  markRead: () => set({ unread: 0, lastSeenAt: new Date().toISOString() }),
}));
