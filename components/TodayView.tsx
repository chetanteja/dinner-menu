"use client";

import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/constants";
import { greeting, prettyDate } from "@/lib/client";
import { useApp } from "./AppContext";
import { AttendanceCard } from "./AttendanceCard";
import { CountdownPill } from "./Countdown";
import { HostPanel } from "./HostPanel";
import { LockedCard } from "./LockedCard";
import { SlotCard } from "./SlotCard";
import { useEffect, useState } from "react";

function useHour(timeZone: string) {
  const [hour, setHour] = useState(18);
  useEffect(() => {
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date()));
    setHour(h);
  }, [timeZone]);
  return hour;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } } };

export function TodayView() {
  const { state } = useApp();
  const me = state.members.find((m) => m.id === state.me.id)!;
  const hour = useHour(state.household.timezone);
  const locked = state.day.locked;
  const readOnly = me.attending !== true;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={item} className="pt-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-wide text-muted">{prettyDate(state.date)}</p>
          <CountdownPill
            msToLock={state.msToLock}
            serverNow={state.serverNow}
            windowMs={state.windowMs}
            locked={locked}
          />
        </div>
        <h1 className="mt-2 font-display text-[2.4rem] leading-[1.05] font-semibold tracking-tight">
          {greeting(hour)},
          <br />
          <span className="text-brand">{state.me.name}</span> 👋
        </h1>
      </motion.header>

      <motion.div variants={item}>
        <AttendanceCard />
      </motion.div>

      {locked ? (
        <LockedCard />
      ) : (
        <>
          <motion.div variants={item} className="flex items-end justify-between px-1 pt-2">
            <div>
              <h2 className="font-display text-2xl font-semibold">Tonight&apos;s menu</h2>
              <p className="text-sm text-muted">
                {me.attending === true
                  ? "Propose, agree, or suggest something else."
                  : me.attending === false
                    ? "You're skipping, but you can peek."
                    : "Say you're in to join the vote."}
              </p>
            </div>
          </motion.div>
          {CATEGORIES.map((c) => (
            <motion.div key={c.id} variants={item}>
              <SlotCard meta={c} readOnly={readOnly} />
            </motion.div>
          ))}
        </>
      )}

      <motion.div variants={item}>
        <HostPanel />
      </motion.div>
    </motion.div>
  );
}
