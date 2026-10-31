"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import useSWR from "swr";
import { ApiError, fetcher } from "@/lib/client";
import type { AppState } from "@/lib/shared";
import { AppProvider, STATE_KEY } from "./AppContext";
import { AuthScreen } from "./AuthScreen";
import { BottomNav, type Tab } from "./BottomNav";
import { HistoryView } from "./HistoryView";
import { Logo } from "./Logo";
import { MeView } from "./MeView";
import { TodayView } from "./TodayView";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("today");
  const { data, error, mutate } = useSWR<AppState, ApiError>(STATE_KEY, fetcher, {
    refreshInterval: 8000,
    revalidateOnFocus: true,
    keepPreviousData: true,
    shouldRetryOnError: (e) => !(e instanceof ApiError && e.status === 401),
    errorRetryInterval: 4000,
  });

  const unauthorized = error instanceof ApiError && error.status === 401;

  if (unauthorized) {
    return <AuthScreen onDone={() => mutate()} />;
  }

  if (!data) {
    if (error) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
          <Logo size={64} />
          <p className="font-display text-2xl font-semibold">Can&apos;t reach the kitchen</p>
          <p className="text-sm text-muted">{error.message}</p>
          <button onClick={() => mutate()} className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card">
            Try again
          </button>
        </main>
      );
    }
    return <Loading />;
  }

  return (
    <AppProvider state={data}>
      <main className="mx-auto w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "today" && <TodayView />}
            {tab === "history" && <HistoryView />}
            {tab === "me" && <MeView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </AppProvider>
  );
}

function Loading() {
  return (
    <main className="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-24 w-3/4" />
      <div className="skeleton h-56" />
      <div className="skeleton h-44" />
      <div className="skeleton h-44" />
    </main>
  );
}
