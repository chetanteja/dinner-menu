"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api, fetcher, haptic } from "@/lib/client";
import type { GarbageState } from "@/lib/garbageShared";

export const GARBAGE_KEY = "/api/garbage/state";

interface Actions {
  state: GarbageState;
  assign: (date: string, memberId: string | null) => Promise<void>;
  setDone: (date: string, done: boolean) => Promise<void>;
  setSchedule: (anchor: string) => Promise<void>;
  saveRemindTime: (remindTime: string) => Promise<void>;
  ping: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Actions | null>(null);

export function useGarbage() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGarbage outside provider");
  return v;
}

export function GarbageProvider({ state, children }: { state: GarbageState; children: ReactNode }) {
  const { mutate } = useSWRConfig();

  /** Run a server action with an optimistic local update; roll back (and rethrow) on failure. */
  const run = useCallback(
    async (action: () => Promise<unknown>, optimistic?: (s: GarbageState) => GarbageState) => {
      await mutate<GarbageState>(
        GARBAGE_KEY,
        async () => {
          await action();
          return fetcher<GarbageState>(GARBAGE_KEY);
        },
        {
          optimisticData: optimistic ? (cur) => (cur ? optimistic(cur) : (cur as unknown as GarbageState)) : undefined,
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );

  const value = useMemo<Actions>(
    () => ({
      state,
      assign: async (date, memberId) => {
        haptic();
        await run(
          () => api("/api/garbage/assign", { json: { date, memberId } }),
          (s) => ({ ...s, days: s.days.map((d) => (d.date === date ? { ...d, assignedTo: memberId } : d)) }),
        );
      },
      setDone: async (date, done) => {
        haptic(done ? 30 : 10);
        await run(
          () => api("/api/garbage/done", { json: { date, done } }),
          (s) => ({
            ...s,
            days: s.days.map((d) =>
              d.date === date
                ? { ...d, done: done ? { at: new Date().toISOString(), by: s.me.id } : null }
                : d,
            ),
          }),
        );
      },
      setSchedule: async (anchor) => {
        haptic(20);
        await run(() => api("/api/garbage/schedule", { json: { anchor } }));
      },
      saveRemindTime: async (remindTime) => {
        await run(() => api("/api/garbage/settings", { json: { remindTime } }));
      },
      ping: async () => {
        haptic(30);
        await api("/api/garbage/ping", { json: {} });
      },
      logout: async () => {
        await api("/api/auth/logout?space=garbage", { method: "POST" });
        await mutate(GARBAGE_KEY, undefined, { revalidate: true });
      },
    }),
    [state, mutate, run],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
