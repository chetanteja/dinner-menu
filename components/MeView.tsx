"use client";

import { Bell, BellOff, Check, ChevronDown, Copy, Crown, LogOut, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { CATEGORIES } from "@/lib/constants";
import { CAT_STYLE } from "@/lib/client";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/lib/pushClient";
import { formatClock } from "@/lib/time";
import { useApp } from "./AppContext";
import { Avatar } from "./Avatar";

export function MeView() {
  const { state, logout } = useApp();

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-4">
        <Avatar name={state.me.name} color={state.me.color} size={68} />
        <div>
          <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight">{state.me.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            {state.me.isHost && <Crown size={14} className="text-fry" />}
            {state.me.isHost ? "Host" : "Member"} · {state.household.name}
          </p>
        </div>
      </header>

      <Notifications />
      <Appearance />
      {state.me.isHost && <HostSettings />}
      <Family />

      <button
        onClick={logout}
        className="card flex w-full items-center justify-center gap-2 py-4 font-semibold text-no"
      >
        <LogOut size={18} /> Sign out
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Notifications() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      setStatus(status === "on" ? await disablePush() : await enablePush());
    } catch {
      setStatus(await getPushStatus());
    } finally {
      setBusy(false);
    }
  };

  const copy: Record<PushStatus, string> = {
    on: "You'll get a nudge before the menu locks.",
    off: "Get a reminder to vote before the menu locks.",
    denied: "Notifications are blocked in your browser settings.",
    unsupported: "This browser doesn't support notifications.",
    "ios-install": "On iPhone: tap Share, then “Add to Home Screen”, and open the app from there.",
    unconfigured: "Push isn't set up on this server yet.",
  };

  return (
    <Section title="Reminders">
      <div className="flex items-center gap-4">
        <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", status === "on" ? "bg-yes/15 text-yes" : "bg-surface-2 text-muted")}>
          {status === "on" ? <Bell size={20} /> : <BellOff size={20} />}
        </span>
        <p className="flex-1 text-sm text-muted">{status ? copy[status] : "Checking…"}</p>
        {(status === "on" || status === "off") && (
          <button
            disabled={busy}
            onClick={toggle}
            className={clsx(
              "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50",
              status === "on" ? "glass" : "bg-brand text-white",
            )}
          >
            {status === "on" ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>
    </Section>
  );
}

function Appearance() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("dm-theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignore */
    }
  }, []);

  const apply = useCallback((t: "system" | "light" | "dark") => {
    setTheme(t);
    try {
      if (t === "system") {
        localStorage.removeItem("dm-theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("dm-theme", t);
        document.documentElement.dataset.theme = t;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const opts = [
    { v: "system" as const, label: "Auto", icon: Monitor },
    { v: "light" as const, label: "Light", icon: Sun },
    { v: "dark" as const, label: "Dark", icon: Moon },
  ];
  return (
    <Section title="Appearance">
      <div className="relative flex rounded-2xl bg-surface-2 p-1">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => apply(o.v)}
            className={clsx("relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold", theme === o.v ? "text-ink" : "text-muted")}
          >
            {theme === o.v && (
              <motion.span layoutId="theme-seg" className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-card" transition={{ type: "spring", stiffness: 500, damping: 34 }} />
            )}
            <o.icon size={16} /> {o.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function HostSettings() {
  const { state, saveTimes, hideDish } = useApp();
  const [copied, setCopied] = useState(false);
  const [remind, setRemind] = useState(state.household.remindTime);
  const [lock, setLock] = useState(state.household.lockTime);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);

  const dirty = remind !== state.household.remindTime || lock !== state.household.lockTime;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.household.joinCode ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await saveTimes(remind, lock);
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section title="Invite family">
        <p className="mb-3 text-sm text-muted">Share this code. They pick &ldquo;Join the family&rdquo; on the sign-in screen.</p>
        <button onClick={copyCode} className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-5 py-4">
          <span className="font-display text-3xl font-semibold tracking-[0.3em]">{state.household.joinCode}</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-brand">
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </Section>

      <Section title="Daily schedule">
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Reminder" value={remind} onChange={setRemind} />
          <TimeField label="Menu locks" value={lock} onChange={setLock} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Currently {formatClock(state.household.remindTime)} reminder, {formatClock(state.household.lockTime)} auto-lock ({state.household.timezone}).
        </p>
        <AnimatePresence>
          {(dirty || msg) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-3 pt-3">
                {dirty && (
                  <button disabled={saving} onClick={save} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "Saving…" : "Save times"}
                  </button>
                )}
                {msg && <span className={clsx("text-sm font-medium", msg.ok ? "text-yes" : "text-no")}>{msg.text}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section title="Manage dishes">
        <div className="space-y-2">
          {CATEGORIES.map((c) => {
            const dishes = state.dishes.filter((d) => d.category === c.id);
            const style = CAT_STYLE[c.id];
            const open = openCat === c.id;
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-line">
                <button onClick={() => setOpenCat(open ? null : c.id)} className="flex w-full items-center gap-3 px-4 py-3.5">
                  <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl text-lg", style.soft)}>{c.emoji}</span>
                  <span className="flex-1 text-left font-display font-semibold">{c.label}</span>
                  <span className="text-xs font-semibold text-muted">{dishes.length}</span>
                  <ChevronDown size={18} className={clsx("text-muted transition-transform", open && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <ul className="divide-y divide-line border-t border-line">
                        {dishes.map((d) => (
                          <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xl">{d.emoji}</span>
                            <span className="flex-1 text-sm font-medium">{d.name}</span>
                            <button
                              onClick={() => hideDish(d.id).catch(() => undefined)}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-no"
                              aria-label={`Remove ${d.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-surface-2 px-4 py-3 text-lg font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/60"
      />
    </label>
  );
}

function Family() {
  const { state } = useApp();
  return (
    <Section title="Family">
      <ul className="space-y-3">
        {state.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} color={m.color} size={40} />
            <span className="flex-1 font-semibold">
              {m.name}
              {m.id === state.me.id && <span className="ml-2 text-xs font-medium text-muted">you</span>}
            </span>
            {m.isHost && <Crown size={16} className="text-fry" />}
          </li>
        ))}
      </ul>
    </Section>
  );
}
