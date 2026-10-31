"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

export function useCountdown(msToLock: number, serverNow: number) {
  const [deadline, setDeadline] = useState(() => Date.now() + msToLock);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setDeadline(Date.now() + msToLock);
    setNow(Date.now());
  }, [msToLock, serverNow]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return deadline - now;
}

function fmt(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h >= 1) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CountdownPill({
  msToLock,
  serverNow,
  windowMs,
  locked,
}: {
  msToLock: number;
  serverNow: number;
  windowMs: number;
  locked: boolean;
}) {
  const remaining = useCountdown(msToLock, serverNow);
  const progress = Math.min(1, Math.max(0, 1 - remaining / windowMs));
  const urgent = remaining < 15 * 60 * 1000;
  const r = 9;
  const c = 2 * Math.PI * r;

  if (locked) {
    return (
      <span className="glass inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm font-semibold text-staple">
        <Lock size={15} strokeWidth={2.6} /> Locked
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "glass inline-flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2 text-sm font-semibold tabular-nums",
        urgent && remaining > 0 ? "text-no" : "text-ink",
      )}
      aria-live="off"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      {remaining > 0 ? `Locks in ${fmt(remaining)}` : "Locking…"}
    </span>
  );
}
