"use client";

import { motion } from "framer-motion";
import { History, User, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";

export type Tab = "today" | "history" | "me";

const TABS = [
  { id: "today" as const, label: "Today", icon: UtensilsCrossed },
  { id: "history" as const, label: "History", icon: History },
  { id: "me" as const, label: "Me", icon: User },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-6"
      style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass flex w-full max-w-xs items-center gap-1 rounded-full p-1.5 shadow-card">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={clsx(
                "relative flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-colors",
                active ? "text-white" : "text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-brand shadow-[0_8px_18px_-8px_var(--brand)]"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <t.icon size={18} className="relative" />
              <span className={clsx("relative", !active && "hidden min-[360px]:inline")}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
