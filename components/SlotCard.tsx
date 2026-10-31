"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Plus, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { CategoryMeta } from "@/lib/constants";
import { CAT_STYLE } from "@/lib/client";
import { deriveSlot, type SlotView } from "@/lib/shared";
import { useApp } from "./AppContext";
import { AvatarStack } from "./Avatar";
import { DishSheet } from "./DishSheet";

const STATUS_LABEL: Record<SlotView["status"], string> = {
  open: "Needs a pick",
  proposed: "Proposed",
  contested: "Split vote",
  agreed: "Agreed",
};

export function SlotCard({ meta, readOnly }: { meta: CategoryMeta; readOnly: boolean }) {
  const { state, setPick } = useApp();
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const style = CAT_STYLE[meta.id];

  const host = state.members.find((m) => m.isHost);
  const attendingIds = useMemo(() => state.members.filter((m) => m.attending).map((m) => m.id), [state.members]);
  const slot = useMemo(
    () => deriveSlot(meta.id, attendingIds, state.picks, host?.id),
    [meta.id, attendingIds, state.picks, host?.id],
  );
  const dishMap = useMemo(() => new Map(state.dishes.map((d) => [d.id, d])), [state.dishes]);
  const memberMap = useMemo(() => new Map(state.members.map((m) => [m.id, m])), [state.members]);
  const myPick = state.picks.find((p) => p.memberId === state.me.id && p.category === meta.id)?.dishId ?? null;

  const toggle = async (dishId: string) => {
    setError(null);
    try {
      await setPick(meta.id, myPick === dishId ? null : dishId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that");
    }
  };

  const agreed = slot.status === "agreed";

  return (
    <motion.section
      layout
      className={clsx(
        "card relative overflow-hidden transition-colors",
        agreed && "border-yes/50",
      )}
    >
      <div className={clsx("pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b", style.grad)} />

      <header className="relative flex items-center gap-3 p-4 pb-2">
        <span className={clsx("flex h-11 w-11 items-center justify-center rounded-2xl text-2xl", style.soft)}>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl leading-tight font-semibold">{meta.label}</h3>
          <p className="truncate text-xs text-muted">{meta.hint}</p>
        </div>
        <StatusPill slot={slot} catText={style.text} />
      </header>

      <div className="relative space-y-2.5 p-4 pt-2">
        {slot.groups.length === 0 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={readOnly}
            onClick={() => setSheet(true)}
            className={clsx(
              "flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed py-6 text-center",
              style.border,
              readOnly ? "opacity-60" : "",
            )}
          >
            <span className={clsx("flex h-10 w-10 items-center justify-center rounded-full text-white", style.bg)}>
              <Plus size={22} strokeWidth={3} />
            </span>
            <span className="mt-1 font-display text-lg font-semibold">
              {readOnly ? "Nobody has proposed yet" : `Be first to propose a ${meta.short.toLowerCase()}`}
            </span>
            {!readOnly && <span className="text-sm text-muted">Tap to choose or add a dish</span>}
          </motion.button>
        )}

        <AnimatePresence initial={false}>
          {slot.groups.map((g, i) => {
            const dish = dishMap.get(g.dishId);
            if (!dish) return null;
            const mine = myPick === g.dishId;
            const voters = g.memberIds.map((id) => memberMap.get(id)).filter(Boolean) as NonNullable<
              ReturnType<typeof memberMap.get>
            >[];
            const share = slot.attendingCount ? g.memberIds.length / slot.attendingCount : 0;
            return (
              <motion.div
                key={g.dishId}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={clsx(
                  "rounded-2xl border bg-surface p-3.5",
                  mine ? `${style.border} ring-2 ${style.ring}` : "border-line",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={clsx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[1.6rem]", style.soft)}>
                    {dish.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="line-clamp-2 font-display text-lg leading-tight font-semibold">{dish.name}</p>
                      {i === 0 && slot.groups.length > 1 && <Crown size={14} className="shrink-0 text-fry" />}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarStack people={voters} size={22} />
                      <span className="text-xs font-medium text-muted">
                        {voters.length === 1 ? voters[0].name : `${voters.length} of ${slot.attendingCount}`}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    disabled={readOnly}
                    onClick={() => toggle(g.dishId)}
                    className={clsx(
                      "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
                      mine ? `${style.bg} text-white` : `border ${style.border} ${style.text} bg-transparent`,
                      readOnly && "opacity-50",
                    )}
                    aria-pressed={mine}
                  >
                    {mine ? <Check size={16} strokeWidth={3} /> : null}
                    {mine ? "Agreed" : "Agree"}
                  </motion.button>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className={clsx("h-full rounded-full", style.bar)}
                    initial={false}
                    animate={{ width: `${Math.max(share, 0.04) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {slot.groups.length > 0 && !readOnly && (
          <button
            onClick={() => setSheet(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <Shuffle size={15} />
            {myPick && slot.groups.some((g) => g.dishId === myPick) ? "Suggest something else instead" : "Prefer something else?"}
          </button>
        )}
        {error && <p className="text-center text-sm font-medium text-no">{error}</p>}
      </div>

      <DishSheet open={sheet} onOpenChange={setSheet} meta={meta} slot={slot} myPick={myPick} />
    </motion.section>
  );
}

function StatusPill({ slot, catText }: { slot: SlotView; catText: string }) {
  const agreed = slot.status === "agreed";
  return (
    <motion.span
      key={slot.status}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold",
        agreed && "bg-yes text-white",
        slot.status === "contested" && "bg-fry/20 text-fry",
        slot.status === "proposed" && `bg-surface-2 ${catText}`,
        slot.status === "open" && "bg-surface-2 text-muted",
      )}
    >
      {agreed && <Sparkles size={12} />}
      {slot.status === "proposed" ? `${slot.agreeCount}/${slot.attendingCount} agree` : STATUS_LABEL[slot.status]}
    </motion.span>
  );
}
