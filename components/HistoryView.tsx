"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import useSWR from "swr";
import clsx from "clsx";
import { CAT_STYLE, fetcher, prettyDate } from "@/lib/client";
import type { HistoryResponse } from "@/lib/shared";

export function HistoryView() {
  const { data, error } = useSWR<HistoryResponse>("/api/history", fetcher, { revalidateOnFocus: true });

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="font-display text-[2.2rem] leading-tight font-semibold tracking-tight">Past dinners</h1>
        <p className="text-sm text-muted">What the family has eaten, and loved.</p>
      </header>

      {!data && !error && (
        <div className="space-y-3">
          <div className="skeleton h-24" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      )}
      {error && <p className="text-sm text-no">Couldn&apos;t load history.</p>}

      {data && data.days.length === 0 && (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="text-5xl">🍽️</span>
          <p className="font-display text-xl font-semibold">Nothing here yet</p>
          <p className="max-w-xs text-sm text-muted">Your first dinner will show up here as soon as a menu is locked.</p>
        </div>
      )}

      {data && data.loved.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-xl font-semibold">
            <Heart size={18} className="fill-no text-no" /> Most loved
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {data.loved.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={clsx("card flex w-32 shrink-0 flex-col items-start gap-2 p-3.5")}
              >
                <span className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl text-3xl", CAT_STYLE[d.category].soft)}>
                  {d.emoji}
                </span>
                <span className="font-display text-[15px] leading-tight font-semibold">{d.name}</span>
                <span className={clsx("text-xs font-bold", CAT_STYLE[d.category].text)}>
                  {d.count}× on the menu
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {data && data.days.length > 0 && (
        <section className="relative space-y-4">
          <div className="absolute top-3 bottom-3 left-[0.45rem] w-0.5 rounded-full bg-line" />
          {data.days.map((day, i) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              className="relative pl-8"
            >
              <span className="absolute top-2 left-0 h-4 w-4 rounded-full border-[3px] border-bg bg-brand" />
              <p className="mb-2 text-sm font-bold text-muted">
                {prettyDate(day.date, { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div className="card space-y-2 p-3.5">
                {day.items.map((it) => (
                  <div key={it.category} className="flex items-center gap-3">
                    <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-lg", CAT_STYLE[it.category].soft)}>
                      {it.emoji}
                    </span>
                    <span className="font-display font-semibold">{it.name}</span>
                    <span className={clsx("ml-auto text-[11px] font-bold tracking-wider uppercase", CAT_STYLE[it.category].text)}>
                      {it.category}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </section>
      )}
    </div>
  );
}
