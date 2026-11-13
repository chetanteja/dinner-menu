"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2, Users } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { ApiError, fetcher } from "@/lib/client";
import type { GarbageState } from "@/lib/garbageShared";
import { AuthScreen } from "../AuthScreen";
import { BottomNav, type NavTab } from "../BottomNav";
import { GarbageLogo } from "../GarbageLogo";
import { GARBAGE_KEY, GarbageProvider } from "./GarbageContext";
import { GarbageGroup } from "./GarbageGroup";
import { GarbageToday } from "./GarbageToday";

type GTab = "today" | "group";

const TABS: NavTab<GTab>[] = [
  { id: "today", label: "Garbage", icon: Trash2 },
  { id: "group", label: "Group", icon: Users },
];

export function GarbageShell() {
  const [tab, setTab] = useState<GTab>("today");
  const { data, error, mutate } = useSWR<GarbageState, ApiError>(GARBAGE_KEY, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    keepPreviousData: true,
    shouldRetryOnError: (e) => !(e instanceof ApiError && e.status === 401),
    errorRetryInterval: 4000,
  });

  if (error instanceof ApiError && error.status === 401) {
    return <AuthScreen space="garbage" onDone={() => mutate()} />;
  }

  if (!data) {
    if (error) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
          <GarbageLogo size={64} />
          <p className="font-display text-2xl font-semibold">Can&apos;t reach the server</p>
          <p className="text-sm text-muted">{error.message}</p>
          <button onClick={() => mutate()} className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card">
            Try again
          </button>
        </main>
      );
    }
    return (
      <main className="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-24 w-3/4" />
        <div className="skeleton h-44" />
        <div className="skeleton h-56" />
      </main>
    );
  }

  return (
    <GarbageProvider state={data}>
      <main className="mx-auto w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "today" ? <GarbageToday /> : <GarbageGroup />}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav tab={tab} onChange={setTab} tabs={TABS} />
    </GarbageProvider>
  );
}
