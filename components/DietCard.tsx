"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { dietSummary, joinNames as names, type Diet } from "@/lib/shared";
import { useApp } from "./AppContext";

const OPTIONS: { v: Diet; emoji: string; label: string; hint: string }[] = [
  { v: "veg", emoji: "🥦", label: "Veg only", hint: "No non-veg for me today" },
  { v: "nonveg", emoji: "🍗", label: "Non-veg is fine", hint: "I can eat anything" },
];

/**
 * Everyone who's eating says whether they can have non-veg today, so the family
 * can see at a glance if tonight's menu can include it.
 */
export function DietCard() {
  const { state, setDiet } = useApp();
  const [error, setError] = useState<string | null>(null);
  const me = state.members.find((m) => m.id === state.me.id)!;
  const sum = dietSummary(state.members);
  const meEating = me.attending === true;

  if (!meEating && sum.kind === "none") return null;

  const choose = async (d: Diet) => {
    setError(null);
    try {
      await setDiet(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that");
    }
  };

  const needsMine = meEating && me.diet === null;

  return (
    <motion.section layout className={clsx("card overflow-hidden", needsMine && "border-brand/50")}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-staple/15 text-staple">
          <Leaf size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-semibold">Veg or non-veg today?</h3>
          <p className="text-xs text-muted">
            {meEating ? (needsMine ? "Pick one so everyone knows what's okay tonight." : "Tap to change for today.") : "What the family can eat tonight."}
          </p>
        </div>
      </div>

      {meEating && (
        <div className="grid grid-cols-2 gap-2.5 p-4 pb-3">
          {OPTIONS.map((o) => {
            const on = me.diet === o.v;
            return (
              <motion.button
                key={o.v}
                whileTap={{ scale: 0.95 }}
                onClick={() => choose(o.v)}
                aria-pressed={on}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3.5 text-center transition-colors",
                  on
                    ? o.v === "veg"
                      ? "border-yes bg-yes/12 text-ink"
                      : "border-no/70 bg-no/10 text-ink"
                    : needsMine
                      ? "border-brand/40 bg-surface"
                      : "border-line bg-surface",
                )}
              >
                <span className="text-3xl">{o.emoji}</span>
                <span className="font-display text-[15px] font-semibold">{o.label}</span>
                <span className="text-[11px] leading-tight text-muted">{o.hint}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      <div
        className={clsx(
          "mx-4 mb-4 rounded-2xl px-4 py-3 text-sm font-semibold",
          meEating ? "" : "mt-3",
          sum.kind === "nonveg-ok" && "bg-no/10 text-ink",
          sum.kind === "veg-only" && "bg-yes/12 text-ink",
          sum.kind === "pending" && "bg-surface-2 text-muted",
          sum.kind === "none" && "bg-surface-2 text-muted",
        )}
        aria-live="polite"
      >
        {sum.kind === "nonveg-ok" && <>🍗 Non-veg is fine for everyone tonight.</>}
        {sum.kind === "veg-only" && (
          <>
            🥦 Keep it veg tonight. {names(sum.vegNames)} {sum.vegNames.length === 1 ? "is" : "are"} veg today.
            {sum.pendingNames.length > 0 && (
              <span className="mt-0.5 block text-xs font-medium text-muted">
                Still waiting on {names(sum.pendingNames)}.
              </span>
            )}
          </>
        )}
        {sum.kind === "pending" && <>⏳ Waiting on {names(sum.pendingNames)} to say veg or non-veg.</>}
      </div>
      {error && <p className="px-4 pb-3 text-sm font-medium text-no">{error}</p>}
    </motion.section>
  );
}
