"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import clsx from "clsx";
import { EMOJI_CHOICES, type CategoryMeta } from "@/lib/constants";
import { CAT_STYLE } from "@/lib/client";
import type { SlotView } from "@/lib/shared";
import { useApp } from "./AppContext";

export function DishSheet({
  open,
  onOpenChange,
  meta,
  slot,
  myPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meta: CategoryMeta;
  slot: SlotView;
  myPick: string | null;
}) {
  const { state, setPick, addDishAndPick } = useApp();
  const style = CAT_STYLE[meta.id];
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [emoji, setEmoji] = useState(meta.emoji);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const proposedCount = useMemo(() => new Map(slot.groups.map((g) => [g.dishId, g.memberIds.length])), [slot.groups]);
  const dishes = useMemo(() => state.dishes.filter((d) => d.category === meta.id), [state.dishes, meta.id]);
  const loved = useMemo(
    () => [...dishes].filter((d) => d.loved > 0).sort((a, b) => b.loved - a.loved).slice(0, 6),
    [dishes],
  );
  const q = query.trim().toLowerCase();
  const filtered = q ? dishes.filter((d) => d.name.toLowerCase().includes(q)) : dishes;
  const exact = dishes.some((d) => d.name.toLowerCase() === q);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setQuery("");
      setAdding(false);
      setNewName("");
      setError(null);
    }, 300);
  };

  const choose = async (id: string) => {
    setError(null);
    close();
    try {
      await setPick(meta.id, id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't save that");
    }
  };

  const submitNew = async () => {
    const name = newName.trim();
    if (name.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await addDishAndPick(meta.id, name, emoji);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that dish");
    } finally {
      setBusy(false);
    }
  };

  const startAdd = () => {
    setNewName(query.trim() ? query.trim().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
    setAdding(true);
  };

  return (
    <Drawer.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[2rem] border border-b-0 border-line bg-bg outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted/30" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
            <div>
              <Drawer.Title className="font-display text-2xl leading-tight font-semibold">
                {meta.emoji} Choose a {meta.short.toLowerCase()}
              </Drawer.Title>
              <Drawer.Description className="mt-0.5 text-sm text-muted">
                Tap a dish to pick it, or add something new.
              </Drawer.Description>
            </div>
            <button onClick={close} className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pt-2 pb-3">
            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand/60">
              <Search size={18} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${meta.short.toLowerCase()} dishes`}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear" className="text-muted">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div data-vaul-no-drag className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
            {!q && loved.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Family favourites</p>
                <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                  {loved.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => choose(d.id)}
                      className={clsx("flex shrink-0 items-center gap-2 rounded-full border py-2 pr-4 pl-2.5 text-sm font-semibold", style.border, style.softer)}
                    >
                      <span className="text-lg">{d.emoji}</span>
                      {d.name}
                      <span className={clsx("text-xs", style.text)}>×{d.loved}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((d) => {
                const count = proposedCount.get(d.id) ?? 0;
                const mine = myPick === d.id;
                return (
                  <motion.button
                    key={d.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => choose(d.id)}
                    className={clsx(
                      "relative flex flex-col items-start gap-2 rounded-2xl border bg-surface p-3.5 text-left",
                      mine ? `${style.border} ring-2 ${style.ring}` : "border-line",
                    )}
                  >
                    <span className={clsx("flex h-11 w-11 items-center justify-center rounded-xl text-2xl", style.soft)}>{d.emoji}</span>
                    <span className="font-display text-[15px] leading-tight font-semibold">{d.name}</span>
                    {count > 0 && (
                      <span className={clsx("text-[11px] font-bold", style.text)}>
                        {count} {count === 1 ? "vote" : "votes"} today
                      </span>
                    )}
                    {mine && (
                      <span className={clsx("absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-white", style.bg)}>
                        <Check size={14} strokeWidth={3.5} />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {filtered.length === 0 && !adding && (
              <p className="py-6 text-center text-sm text-muted">No dish called &ldquo;{query}&rdquo; yet.</p>
            )}

            {!adding ? (
              !exact && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={startAdd}
                  className={clsx("mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 font-semibold", style.border, style.text)}
                >
                  <Plus size={18} strokeWidth={3} />
                  {q ? `Add “${query.trim()}” as a new dish` : "Add a new dish"}
                </motion.button>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mt-4 space-y-3 p-4"
              >
                <p className="font-display text-lg font-semibold">New {meta.short.toLowerCase()} dish</p>
                <input
                  autoFocus
                  value={newName}
                  maxLength={40}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Methi Malai Matar"
                  className="glass w-full rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand/60"
                />
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
                  {[meta.emoji, ...EMOJI_CHOICES.filter((e) => e !== meta.emoji)].map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={clsx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl transition-all",
                        emoji === e ? `${style.soft} ring-2 ${style.ring}` : "bg-surface-2",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm font-medium text-no">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setAdding(false)} className="glass flex-1 rounded-xl py-3 font-semibold">
                    Cancel
                  </button>
                  <button
                    disabled={newName.trim().length < 2 || busy}
                    onClick={submitNew}
                    className={clsx("flex-[2] rounded-xl py-3 font-semibold text-white disabled:opacity-40", style.bg)}
                  >
                    {busy ? "Adding…" : "Add & pick it"}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
