"use client";

import { motion } from "framer-motion";
import { BellRing, CalendarClock, Check, ChevronRight, RotateCcw, Trash2, UserPlus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { prettyDate } from "@/lib/client";
import type { GarbageDayView } from "@/lib/garbageShared";
import { Avatar } from "../Avatar";
import { NotificationPrompt } from "../NotificationPrompt";
import { clock, dayLabel } from "./format";
import { useGarbage } from "./GarbageContext";
import { AssignSheet, SchedulePicker, Sheet } from "./sheets";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};

export function GarbageToday() {
  const { state } = useGarbage();
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const todayRow = state.todayIsPickup ? state.days.find((d) => d.date === state.today) : undefined;
  const upcoming = state.days.filter((d) => d.date !== todayRow?.date);
  const nextRow = upcoming[0];

  const title = !state.anchor
    ? "Set up garbage day"
    : todayRow
      ? todayRow.done
        ? "All done 🎉"
        : "Garbage goes out today"
      : "No garbage today 🌿";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={item} className="pt-2">
        <p className="text-sm font-semibold tracking-wide text-muted">{prettyDate(state.today)}</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-[1.05] font-semibold tracking-tight">{title}</h1>
      </motion.header>

      <NotificationPrompt
        space="garbage"
        title="Get the garbage reminder"
        hint="A nudge on garbage days, and when you're put down for it."
      />

      {!state.anchor ? (
        <motion.section variants={item} className="card p-5">
          <p className="font-display text-xl font-semibold">When is the next garbage day?</p>
          <p className="mt-1 mb-4 text-sm text-muted">
            Pick a pickup day. Every other day after it is a garbage day, and everyone gets reminded.
          </p>
          <SchedulePicker submitLabel="Start the schedule" />
        </motion.section>
      ) : todayRow ? (
        <motion.div variants={item}>
          <TodayCard row={todayRow} onAssign={() => setAssignDate(todayRow.date)} />
        </motion.div>
      ) : (
        nextRow && (
          <motion.div variants={item}>
            <NextCard row={nextRow} onAssign={() => setAssignDate(nextRow.date)} />
          </motion.div>
        )
      )}

      {state.anchor && upcoming.length > (todayRow ? 0 : 1) && (
        <motion.section variants={item} className="card p-2">
          <h2 className="px-3 pt-3 pb-1 text-xs font-bold tracking-wider text-muted uppercase">Coming up</h2>
          <ul>
            {(todayRow ? upcoming : upcoming.slice(1)).map((d) => (
              <UpcomingRow key={d.date} row={d} onClick={() => setAssignDate(d.date)} />
            ))}
          </ul>
        </motion.section>
      )}

      {state.anchor && (
        <motion.section variants={item} className="card flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <CalendarClock size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-semibold">Every other day</p>
            <p className="text-sm text-muted">Truck skipped a day? Shift the pattern.</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setResetOpen(true)}
            className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            <RotateCcw size={15} /> Reset
          </motion.button>
        </motion.section>
      )}

      <AssignSheet date={assignDate} onClose={() => setAssignDate(null)} />
      <Sheet
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Shift the pattern"
        description="Pick the next garbage day. Pickups run every other day from there."
      >
        <SchedulePicker submitLabel="Reset from this day" onSaved={() => setResetOpen(false)} />
      </Sheet>
    </motion.div>
  );
}

function useAssignee(row: GarbageDayView) {
  const { state } = useGarbage();
  const person = state.members.find((m) => m.id === row.assignedTo);
  const doneBy = row.done?.by ? state.members.find((m) => m.id === row.done?.by) : undefined;
  return { person, doneBy, mine: person?.id === state.me.id };
}

function TodayCard({ row, onAssign }: { row: GarbageDayView; onAssign: () => void }) {
  const { setDone, ping, state } = useGarbage();
  const { person, doneBy, mine } = useAssignee(row);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [pinged, setPinged] = useState(false);
  const [pingError, setPingError] = useState<string | null>(null);

  useEffect(() => {
    if (!pinged) return;
    const t = setTimeout(() => setPinged(false), 3500);
    return () => clearTimeout(t);
  }, [pinged]);

  const sendPing = async () => {
    setPinging(true);
    setPingError(null);
    try {
      await ping();
      setPinged(true);
    } catch (e) {
      setPingError(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setPinging(false);
    }
  };

  const toggle = async (done: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await setDone(row.date, done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const done = row.done;
  return (
    <section
      className={
        done
          ? "card relative overflow-hidden p-5"
          : "relative overflow-hidden rounded-[2rem] bg-brand p-5 text-white shadow-card"
      }
    >
      {!done && <div className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-white/20 blur-2xl" />}
      <div className="relative">
        <div className="flex items-center gap-4">
          <span
            className={
              done
                ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yes/15 text-yes"
                : "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/25"
            }
          >
            {done ? <Check size={28} strokeWidth={3} /> : <Trash2 size={28} />}
          </span>
          <div className="min-w-0">
            {done ? (
              <>
                <p className="font-display text-2xl leading-tight font-semibold">Taken out</p>
                <p className="text-sm text-muted">
                  {doneBy ? (doneBy.id === state.me.id ? "You" : doneBy.name) : "Someone"} did it at {clock(done.at)}.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl leading-tight font-semibold">
                  {person ? (mine ? "It's your turn" : `${person.name}'s turn`) : "Nobody's down for it yet"}
                </p>
                <p className="text-sm font-medium text-white/90">
                  {person ? "Take it out tonight." : "Put someone down, or just do it."}
                </p>
              </>
            )}
          </div>
          {person && !done && <Avatar name={person.name} color={person.color} size={44} ring className="ml-auto" />}
        </div>

        <div className="mt-5 flex items-center gap-3">
          {done ? (
            <button
              disabled={busy}
              onClick={() => toggle(false)}
              className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <Undo2 size={15} /> Undo
            </button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={busy}
                onClick={() => toggle(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-base font-semibold text-[#2b1a10] shadow-card disabled:opacity-60"
              >
                <Check size={18} strokeWidth={3} className="text-brand" /> Taken out
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onAssign}
                className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-3.5 text-sm font-semibold"
              >
                <UserPlus size={16} /> {person ? "Change" : "Assign"}
              </motion.button>
            </>
          )}
        </div>
        {error && <p className="mt-3 text-sm font-medium">{error}</p>}

        {!done && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={pinging || pinged}
              onClick={sendPing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-black/15 py-3 text-sm font-semibold disabled:opacity-80"
            >
              {pinged ? (
                <>
                  <Check size={16} strokeWidth={3} /> Everyone notified
                </>
              ) : (
                <>
                  <BellRing size={16} /> {pinging ? "Sending…" : "Notify everyone"}
                </>
              )}
            </motion.button>
            {pingError && <p className="mt-2 text-sm font-medium">{pingError}</p>}
          </>
        )}
      </div>
    </section>
  );
}

function NextCard({ row, onAssign }: { row: GarbageDayView; onAssign: () => void }) {
  const { state } = useGarbage();
  const { person, mine } = useAssignee(row);
  return (
    <section className="card p-5">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">Next garbage day</p>
      <p className="mt-1 font-display text-3xl font-semibold">{dayLabel(row.date, state.today)}</p>
      <div className="mt-4 flex items-center gap-3">
        {person ? (
          <>
            <Avatar name={person.name} color={person.color} size={40} />
            <p className="flex-1 font-semibold">{mine ? "You're on it" : `${person.name} is on it`}</p>
          </>
        ) : (
          <p className="flex-1 text-sm text-muted">Nobody put down yet.</p>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAssign}
          className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          <UserPlus size={15} /> {person ? "Change" : "Assign"}
        </motion.button>
      </div>
    </section>
  );
}

function UpcomingRow({ row, onClick }: { row: GarbageDayView; onClick: () => void }) {
  const { state } = useGarbage();
  const { person, mine } = useAssignee(row);
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:bg-surface-2">
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
          <span className="text-[10px] font-bold tracking-wide text-muted uppercase">
            {new Date(row.date + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}
          </span>
          <span className="font-display text-lg font-semibold">{Number(row.date.slice(8))}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{dayLabel(row.date, state.today)}</span>
          <span className="block text-sm text-muted">
            {person ? (mine ? "You" : person.name) : "Nobody put down yet"}
          </span>
        </span>
        {person ? (
          <Avatar name={person.name} color={person.color} size={32} />
        ) : (
          <span className="flex items-center gap-1 text-sm font-semibold text-brand">
            Assign <ChevronRight size={16} />
          </span>
        )}
      </button>
    </li>
  );
}
