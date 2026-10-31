"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { useApp } from "./AppContext";
import { Avatar, type AvatarStatus } from "./Avatar";

export function AttendanceCard() {
  const { state, setAttending } = useApp();
  const me = state.members.find((m) => m.id === state.me.id)!;
  const [error, setError] = useState<string | null>(null);

  const answer = async (v: boolean) => {
    setError(null);
    try {
      await setAttending(v);
    } catch {
      setError("Couldn't save that. Try again.");
    }
  };

  const ins = state.members.filter((m) => m.attending === true).length;
  const outs = state.members.filter((m) => m.attending === false).length;
  const waiting = state.members.length - ins - outs;

  return (
    <section className="card overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {me.attending === null ? (
          <motion.div
            key="ask"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="p-5 pb-4"
          >
            <h2 className="font-display text-[2rem] leading-none font-semibold tracking-tight">Dinner tonight?</h2>
            <p className="mt-2 text-[15px] text-muted">Let everyone know if you&apos;ll be eating at home.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <BigChoice tone="yes" emoji="😋" label="I'm in" onClick={() => answer(true)} />
              <BigChoice tone="no" emoji="🙅" label="Skip tonight" onClick={() => answer(false)} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="answered"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 p-4 pb-3"
          >
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight font-semibold">
                {me.attending ? "You're in 🙌" : "Skipping tonight 🌙"}
              </p>
              <p className="text-sm text-muted">Switch any time.</p>
            </div>
            <Segmented value={me.attending} onChange={answer} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="px-5 pb-2 text-sm font-medium text-no">{error}</p>}

      <div className="border-t border-line bg-surface-2/50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {state.members.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1">
                <Avatar
                  name={m.name}
                  color={m.color}
                  size={40}
                  status={(m.attending === null ? "wait" : m.attending ? "in" : "out") as AvatarStatus}
                />
                <span className={clsx("max-w-14 truncate text-[11px] font-medium", m.id === state.me.id ? "text-ink" : "text-muted")}>
                  {m.id === state.me.id ? "You" : m.name}
                </span>
              </div>
            ))}
          </div>
          <p className="shrink-0 text-right text-xs leading-5 font-medium text-muted">
            <span className="text-yes">{ins} in</span>
            <br />
            {outs} skip · {waiting} waiting
          </p>
        </div>
      </div>
    </section>
  );
}

function BigChoice({
  tone,
  emoji,
  label,
  onClick,
}: {
  tone: "yes" | "no";
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      onClick={onClick}
      className={clsx(
        "flex h-32 flex-col items-center justify-center gap-2 rounded-3xl border-2 font-display text-xl font-semibold",
        tone === "yes"
          ? "border-yes/0 bg-yes text-white shadow-[0_14px_28px_-12px_var(--yes)]"
          : "border-no/30 bg-no/10 text-no",
      )}
    >
      <span className="text-4xl">{emoji}</span>
      {label}
    </motion.button>
  );
}

function Segmented({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const opts = [
    { v: true, label: "In" },
    { v: false, label: "Skip" },
  ];
  return (
    <div className="relative flex shrink-0 rounded-full bg-surface-2 p-1">
      {opts.map((o) => (
        <button
          key={o.label}
          onClick={() => value !== o.v && onChange(o.v)}
          className={clsx(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            value === o.v ? "text-white" : "text-muted",
          )}
        >
          {value === o.v && (
            <motion.span
              layoutId="att-seg"
              className={clsx("absolute inset-0 -z-10 rounded-full", o.v ? "bg-yes" : "bg-no")}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}
