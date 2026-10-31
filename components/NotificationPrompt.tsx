"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { enablePush, getPushStatus, type PushStatus } from "@/lib/pushClient";

const DISMISS_KEY = "dm-push-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function snoozed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - t < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** Re-attach this phone's existing push subscription to whoever is signed in right now. */
async function syncSubscription() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api("/api/push/subscribe", { json: { subscription: sub.toJSON() } });
  } catch {
    /* best effort */
  }
}

/**
 * Nudges everyone to turn on reminders. Browsers require a tap before they will show the
 * permission prompt, so this is a one-tap banner rather than a silent opt-in.
 */
export function NotificationPrompt() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getPushStatus().catch(() => "unsupported" as PushStatus);
      if (cancelled) return;

      if (s === "on") {
        await syncSubscription();
      } else if (s === "off" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        // Already allowed on this device (new login, cleared data): subscribe silently.
        const next = await enablePush().catch(() => "off" as PushStatus);
        if (!cancelled) setStatus(next);
        return;
      }
      setStatus(s);
      setHidden(snoozed());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      const next = await enablePush();
      setStatus(next);
      if (next === "on") setHidden(true);
    } catch {
      setStatus(await getPushStatus());
    } finally {
      setBusy(false);
    }
  };

  const show = !hidden && (status === "off" || status === "ios-install");

  return (
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="card flex items-center gap-3 border-brand/40 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
              {status === "ios-install" ? <Share size={20} /> : <Bell size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight font-semibold">Never miss the vote</p>
              <p className="text-sm text-muted">
                {status === "ios-install"
                  ? "Tap Share, then “Add to Home Screen”, and open the app from there to get reminders."
                  : "Get a nudge before the menu locks."}
              </p>
            </div>
            {status === "off" && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                disabled={busy}
                onClick={turnOn}
                className="shrink-0 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "…" : "Turn on"}
              </motion.button>
            )}
            <button
              onClick={dismiss}
              aria-label="Not now"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted"
            >
              <X size={16} />
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
