"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import type { Category } from "@/lib/constants";
import { api, fetcher, haptic } from "@/lib/client";
import type { AppState } from "@/lib/shared";

export const STATE_KEY = "/api/state";

interface Actions {
  state: AppState;
  setAttending: (attending: boolean) => Promise<void>;
  setPick: (category: Category, dishId: string | null) => Promise<void>;
  addDishAndPick: (category: Category, name: string, emoji: string) => Promise<void>;
  lock: (overrides?: Partial<Record<Category, string>>) => Promise<void>;
  unlock: () => Promise<void>;
  hideDish: (id: string) => Promise<void>;
  saveTimes: (remindTime: string, lockTime: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<Actions | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

export function AppProvider({ state, children }: { state: AppState; children: ReactNode }) {
  const { mutate } = useSWRConfig();

  /** Run a server action with an optimistic local update; roll back (and rethrow) on failure. */
  const run = useCallback(
    async (action: () => Promise<unknown>, optimistic?: (s: AppState) => AppState) => {
      await mutate<AppState>(
        STATE_KEY,
        async () => {
          await action();
          return fetcher<AppState>(STATE_KEY);
        },
        {
          optimisticData: optimistic ? (cur) => (cur ? optimistic(cur) : (cur as unknown as AppState)) : undefined,
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
      refresh: async () => {
        await mutate(STATE_KEY);
      },
      setAttending: async (attending) => {
        haptic();
        await run(
          () => api("/api/attendance", { json: { attending } }),
          (s) => ({
            ...s,
            members: s.members.map((m) => (m.id === s.me.id ? { ...m, attending } : m)),
            picks: attending ? s.picks : s.picks.filter((p) => p.memberId !== s.me.id),
          }),
        );
      },
      setPick: async (category, dishId) => {
        haptic(dishId ? 18 : 8);
        await run(
          () => api("/api/pick", { json: { category, dishId } }),
          (s) => ({
            ...s,
            picks: [
              ...s.picks.filter((p) => !(p.memberId === s.me.id && p.category === category)),
              ...(dishId
                ? [{ category, memberId: s.me.id, dishId, at: new Date().toISOString() }]
                : []),
            ],
          }),
        );
      },
      addDishAndPick: async (category, name, emoji) => {
        haptic(18);
        await run(async () => {
          const dish = await api<{ id: string }>("/api/dishes", { json: { category, name, emoji } });
          await api("/api/pick", { json: { category, dishId: dish.id } });
        });
      },
      lock: async (overrides) => {
        await run(() => api("/api/lock", { json: { action: "lock", overrides } }));
      },
      unlock: async () => {
        await run(() => api("/api/lock", { json: { action: "unlock" } }));
      },
      hideDish: async (id) => {
        await run(
          () => api(`/api/dishes?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
          (s) => ({ ...s, dishes: s.dishes.filter((d) => d.id !== id) }),
        );
      },
      saveTimes: async (remindTime, lockTime) => {
        await run(() => api("/api/settings", { json: { remindTime, lockTime } }));
      },
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        await mutate(STATE_KEY, undefined, { revalidate: true });
      },
    }),
    [state, mutate, run],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
