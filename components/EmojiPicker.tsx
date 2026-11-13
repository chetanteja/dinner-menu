"use client";

import { useState } from "react";
import clsx from "clsx";
import { EMOJI_GROUPS } from "@/lib/constants";
import { cleanEmoji } from "@/lib/emoji";

/**
 * Big food-emoji grid, plus a box to type or paste ANY emoji from the phone keyboard.
 */
export function EmojiPicker({
  value,
  onChange,
  selectedClass,
}: {
  value: string;
  onChange: (emoji: string) => void;
  /** classes applied to the selected emoji tile */
  selectedClass: string;
}) {
  const [custom, setCustom] = useState("");

  const onCustom = (raw: string) => {
    setCustom(raw);
    const e = cleanEmoji(raw);
    if (e) onChange(e);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-4xl" aria-label={`Selected icon ${value}`}>
          {value}
        </span>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold text-muted">Or type / paste any emoji</span>
          <input
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="Use your keyboard's 😀 key"
            className="glass w-full rounded-xl px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-brand/60"
          />
        </label>
      </div>

      <div
        data-vaul-no-drag
        className="max-h-52 overflow-y-auto rounded-2xl border border-line bg-surface-2/60 p-2.5"
      >
        {EMOJI_GROUPS.map((g) => (
          <div key={g.label} className="mb-2.5 last:mb-0">
            <p className="mb-1 px-1 text-[11px] font-bold tracking-wider text-muted uppercase">{g.label}</p>
            <div className="grid grid-cols-7 gap-1">
              {g.emojis.map((e) => (
                <button
                  key={`${g.label}-${e}`}
                  type="button"
                  onClick={() => {
                    setCustom("");
                    onChange(e);
                  }}
                  aria-label={`Use ${e}`}
                  aria-pressed={value === e}
                  className={clsx(
                    "flex aspect-square items-center justify-center rounded-xl text-2xl transition-transform active:scale-90",
                    value === e ? selectedClass : "hover:bg-surface",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
