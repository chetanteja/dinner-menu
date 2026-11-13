"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./AppContext";

/** Shown to everyone once someone announces that the food is ready. */
export function ReadyBanner() {
  const { state } = useApp();
  const ready = state.ready;
  if (!ready) return null;
  const time = new Date(ready.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const mine = ready.by === state.me.name;
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.94, y: -12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="relative overflow-hidden rounded-[2rem] bg-yes p-5 text-white shadow-card"
    >
      <div className="pointer-events-none absolute -top-10 -right-8 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <motion.span
          animate={{ rotate: [0, -14, 14, -10, 10, 0] }}
          transition={{ duration: 1.1, repeat: 2, repeatDelay: 1.4 }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/25"
        >
          <BellRing size={28} />
        </motion.span>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight font-semibold">Food is ready! 🍽️</p>
          <p className="text-sm font-medium text-white/90">
            {mine ? "You called everyone" : `${ready.by} called everyone`} at {time}. Come to the table!
          </p>
        </div>
      </div>
    </motion.section>
  );
}

/** Two-step button (tap, then tap again) so nobody pings the whole house by accident. */
export function ReadyButton() {
  const { state, announceReady } = useApp();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 3500);
    return () => clearTimeout(t);
  }, [sent]);

  if (!state.day.locked) return null;

  const press = async () => {
    setError(null);
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    try {
      await announceReady();
      setArmed(false);
      setSent(true);
    } catch (e) {
      setArmed(false);
      setError(e instanceof Error ? e.message : "Couldn't send that");
    } finally {
      setBusy(false);
    }
  };

  const label = sent ? "Everyone pinged" : busy ? "Calling everyone…" : armed ? "Tap again to ping everyone" : state.ready ? "Ping everyone again" : "Food is ready, call everyone";

  return (
    <section className="card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yes/15 text-yes">
          <BellRing size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-semibold">Dinner served?</p>
          <p className="text-sm text-muted">Send a notification to everyone eating tonight.</p>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.button
          key={label}
          initial={{ opacity: 0.6, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.97 }}
          disabled={busy || sent}
          onClick={press}
          className={
            sent
              ? "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-yes py-3.5 font-semibold text-white"
              : armed
                ? "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-white shadow-card"
                : "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 font-semibold text-bg"
          }
        >
          {sent ? <Check size={18} strokeWidth={3} /> : <BellRing size={18} />}
          {label}
        </motion.button>
      </AnimatePresence>
      {error && <p className="mt-2 text-center text-sm font-medium text-no">{error}</p>}
    </section>
  );
}
