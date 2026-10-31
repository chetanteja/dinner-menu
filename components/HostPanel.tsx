"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Lock, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import clsx from "clsx";
import { CATEGORIES, type Category } from "@/lib/constants";
import { CAT_STYLE } from "@/lib/client";
import { deriveSlot } from "@/lib/shared";
import { useApp } from "./AppContext";

export function HostPanel() {
  const { state, unlock } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const attendingIds = useMemo(() => state.members.filter((m) => m.attending).map((m) => m.id), [state.members]);
  const host = state.members.find((m) => m.isHost);
  const slots = useMemo(
    () => CATEGORIES.map((c) => deriveSlot(c.id, attendingIds, state.picks, host?.id)),
    [attendingIds, state.picks, host?.id],
  );
  const allAgreed = slots.every((s) => s.status === "agreed");
  const waiting = state.members.filter((m) => m.attending === null).length;

  if (!state.me.isHost) return null;

  return (
    <section
      className={clsx(
        "card flex items-center gap-4 p-4",
        allAgreed && !state.day.locked && "border-yes/50",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fry/20 text-fry">
        <Crown size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight font-semibold">Host controls</p>
        <p className="text-sm text-muted">
          {state.day.locked
            ? "Menu is locked."
            : allAgreed
              ? "Everyone agrees. Lock it in!"
              : waiting > 0
                ? `${waiting} haven't answered yet.`
                : "Lock the menu whenever you're ready."}
        </p>
      </div>
      {state.day.locked ? (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await unlock();
            } finally {
              setBusy(false);
            }
          }}
          className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
        >
          <RotateCcw size={15} /> Reopen
        </button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg"
        >
          <Lock size={15} /> Lock menu
        </motion.button>
      )}
      <LockSheet open={open} onOpenChange={setOpen} />
    </section>
  );
}

function LockSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, lock } = useApp();
  const [choice, setChoice] = useState<Partial<Record<Category, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attendingIds = useMemo(() => state.members.filter((m) => m.attending).map((m) => m.id), [state.members]);
  const host = state.members.find((m) => m.isHost);
  const dishMap = useMemo(() => new Map(state.dishes.map((d) => [d.id, d])), [state.dishes]);
  const waiting = state.members.filter((m) => m.attending === null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await lock(choice);
      onOpenChange(false);
      setChoice({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't lock the menu");
    } finally {
      setBusy(false);
    }
  };

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
              <Drawer.Title className="font-display text-2xl font-semibold">Lock tonight&apos;s menu</Drawer.Title>
              <Drawer.Description className="mt-0.5 text-sm text-muted">
                Where it&apos;s split, you decide. Leading dish is pre-selected.
              </Drawer.Description>
            </div>
            <button onClick={() => onOpenChange(false)} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div data-vaul-no-drag className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-2 pb-4">
            {waiting.length > 0 && (
              <p className="rounded-2xl bg-fry/15 px-4 py-3 text-sm font-medium text-fry">
                Still waiting on {waiting.map((m) => m.name).join(", ")}.
              </p>
            )}
            {CATEGORIES.map((c) => {
              const slot = deriveSlot(c.id, attendingIds, state.picks, host?.id);
              const style = CAT_STYLE[c.id];
              const selected = choice[c.id] ?? slot.leaderDishId;
              return (
                <div key={c.id}>
                  <p className={clsx("mb-2 flex items-center gap-2 text-sm font-bold", style.text)}>
                    <span className="text-lg">{c.emoji}</span> {c.label}
                  </p>
                  {slot.groups.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                      No one picked this. It will be left off the menu.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {slot.groups.map((g) => {
                        const d = dishMap.get(g.dishId);
                        if (!d) return null;
                        const on = selected === g.dishId;
                        return (
                          <button
                            key={g.dishId}
                            onClick={() => setChoice((s) => ({ ...s, [c.id]: g.dishId }))}
                            className={clsx(
                              "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-all",
                              on ? `${style.border} ring-2 ${style.ring}` : "border-line",
                            )}
                          >
                            <span className={clsx("flex h-10 w-10 items-center justify-center rounded-xl text-xl", style.soft)}>{d.emoji}</span>
                            <span className="flex-1 font-display font-semibold">{d.name}</span>
                            <span className="text-xs font-semibold text-muted">
                              {g.memberIds.length} {g.memberIds.length === 1 ? "vote" : "votes"}
                            </span>
                            <AnimatePresence>
                              {on && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className={clsx("h-3 w-3 rounded-full", style.bg)}
                                />
                              )}
                            </AnimatePresence>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {error && <p className="text-sm font-medium text-no">{error}</p>}
          </div>

          <div className="px-5 pt-2 pb-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={busy}
              onClick={confirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-card disabled:opacity-60"
            >
              <Lock size={18} /> {busy ? "Locking…" : "Lock the menu"}
            </motion.button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
