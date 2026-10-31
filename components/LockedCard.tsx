"use client";

import { motion } from "framer-motion";
import { Check, Moon, Share2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { formatClock } from "@/lib/time";
import { prettyDate } from "@/lib/client";
import { useApp } from "./AppContext";

export function LockedCard() {
  const { state } = useApp();
  const [copied, setCopied] = useState(false);

  const items = useMemo(
    () =>
      CATEGORIES.flatMap((c) => {
        const f = state.finalMenu.find((x) => x.category === c.id);
        const dish = f ? state.dishes.find((d) => d.id === f.dishId) : undefined;
        return dish ? [{ meta: c, dish }] : [];
      }),
    [state.finalMenu, state.dishes],
  );
  const lockedBy = state.members.find((m) => m.id === state.day.lockedBy)?.name;
  const nobody = !state.members.some((m) => m.attending);

  // Celebrate once per day per device.
  useEffect(() => {
    if (items.length === 0) return;
    const key = `dm-confetti-${state.date}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    import("canvas-confetti").then(({ default: confetti }) => {
      const colors = ["#EF6A2B", "#F2B01E", "#35A36A", "#FF9A3C", "#FFFFFF"];
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.35 }, colors });
      setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.5 }, colors }), 250);
      setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.5 }, colors }), 400);
    });
  }, [items.length, state.date]);

  const share = async () => {
    const text = `Tonight's dinner 🍽️\n${items.map((i) => `${i.meta.emoji} ${i.meta.short}: ${i.dish.name}`).join("\n")}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* cancelled */
    }
  };

  if (items.length === 0) {
    return (
      <section className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
          <Moon size={30} className="text-muted" />
        </span>
        <h2 className="font-display text-2xl font-semibold">No dinner plans tonight</h2>
        <p className="max-w-xs text-sm text-muted">
          {nobody ? "Nobody is eating at home, so the menu was locked empty." : "The menu was locked without any picks."}
        </p>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative overflow-hidden rounded-[2rem] p-6 text-white shadow-card"
      style={{ background: "linear-gradient(150deg, #FF9A3C 0%, #EF5A2B 55%, #C93D2B 100%)" }}
    >
      <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold tracking-wider uppercase">
          <Sparkles size={13} /> Tonight&apos;s dinner
        </span>
        <span className="text-xs font-semibold text-white/80">{prettyDate(state.date, { day: "numeric", month: "short" })}</span>
      </div>

      <div className="relative mt-5 space-y-3">
        {items.map(({ meta, dish }, i) => (
          <motion.div
            key={meta.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
            className="flex items-center gap-4 rounded-2xl bg-white/15 p-3 pr-4 backdrop-blur-sm"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-3xl shadow-inner">
              {dish.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-white/75 uppercase">{meta.label}</p>
              <p className="font-display text-2xl leading-tight font-semibold">{dish.name}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/85">
          {lockedBy ? `Locked by ${lockedBy}` : `Auto-locked at ${formatClock(state.household.lockTime)}`}
        </p>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={share}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#C93D2B]"
        >
          {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} />}
          {copied ? "Copied" : "Share"}
        </motion.button>
      </div>
    </motion.section>
  );
}
