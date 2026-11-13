"use client";

import { Check, UserX, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import clsx from "clsx";
import { addDays, nextPickups } from "@/lib/garbageShared";
import { Avatar } from "../Avatar";
import { dayLabel } from "./format";
import { useGarbage } from "./GarbageContext";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[2rem] border border-b-0 border-line bg-bg outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted/30" />
          <div className="flex items-start justify-between px-5 pt-4 pb-2">
            <div>
              <Drawer.Title className="font-display text-2xl font-semibold">{title}</Drawer.Title>
              {description && <Drawer.Description className="mt-0.5 text-sm text-muted">{description}</Drawer.Description>}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div data-vaul-no-drag className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Who takes the garbage out on a given pickup day? */
export function AssignSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const { state, assign } = useGarbage();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const day = state.days.find((d) => d.date === date);

  const pick = async (memberId: string | null) => {
    if (!date) return;
    setBusy(memberId ?? "none");
    setError(null);
    try {
      await assign(date, memberId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      open={date !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Who takes it out?"
      description={date ? `Garbage ${dayLabel(date, state.today).toLowerCase()}. They'll get a heads-up.` : undefined}
    >
      <div className="space-y-2">
        {state.members.map((m) => {
          const on = day?.assignedTo === m.id;
          return (
            <button
              key={m.id}
              disabled={busy !== null}
              onClick={() => pick(m.id)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-all disabled:opacity-60",
                on ? "border-brand ring-2 ring-brand/40" : "border-line",
              )}
            >
              <Avatar name={m.name} color={m.color} size={40} />
              <span className="flex-1 font-display text-lg font-semibold">
                {m.name}
                {m.id === state.me.id && <span className="ml-2 text-xs font-medium text-muted">you</span>}
              </span>
              {on && <Check size={20} className="text-brand" strokeWidth={3} />}
            </button>
          );
        })}
        {day?.assignedTo && (
          <button
            disabled={busy !== null}
            onClick={() => pick(null)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-3 text-left text-muted disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
              <UserX size={18} />
            </span>
            <span className="font-semibold">Nobody yet</span>
          </button>
        )}
        {error && <p className="px-1 text-sm font-medium text-no">{error}</p>}
      </div>
    </Sheet>
  );
}

/** Choose the next garbage day; pickups run every other day from there. */
export function SchedulePicker({
  submitLabel,
  onSaved,
}: {
  submitLabel: string;
  onSaved?: () => void;
}) {
  const { state, setSchedule } = useGarbage();
  const [date, setDate] = useState<string>(state.today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quick = [
    { label: "Today", offset: 0 },
    { label: "Tomorrow", offset: 1 },
    { label: "In 2 days", offset: 2 },
  ].map((q) => ({ ...q, date: addDays(state.today, q.offset) }));
  const preview = nextPickups(date, date, 4);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setSchedule(date);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {quick.map((q) => (
          <button
            key={q.label}
            onClick={() => setDate(q.date)}
            className={clsx(
              "rounded-2xl border py-3 text-sm font-semibold transition-colors",
              date === q.date ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink",
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1.5 block px-1 text-xs font-semibold tracking-wider text-muted uppercase">Or pick a date</span>
        <input
          type="date"
          value={date}
          min={addDays(state.today, -30)}
          max={addDays(state.today, 60)}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-lg font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/60"
        />
      </label>
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
        Garbage days:{" "}
        <span className="font-semibold text-ink">
          {preview.map((d) => dayLabel(d, state.today)).join(" · ")}
        </span>{" "}
        and every other day after.
      </p>
      {error && <p className="px-1 text-sm font-medium text-no">{error}</p>}
      <button
        disabled={busy}
        onClick={save}
        className="w-full rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-card disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
