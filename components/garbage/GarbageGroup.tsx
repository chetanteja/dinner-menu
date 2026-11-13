"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Copy, Crown, LogOut, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatClock } from "@/lib/time";
import { Avatar } from "../Avatar";
import { Appearance, Notifications, Section, TimeField } from "../MeView";
import { useGarbage } from "./GarbageContext";

export function GarbageGroup() {
  const { state, logout } = useGarbage();
  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-4">
        <Avatar name={state.me.name} color={state.me.color} size={68} />
        <div>
          <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight">{state.me.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            {state.me.isHost && <Crown size={14} className="text-fry" />}
            {state.me.isHost ? "Host" : "Member"} · {state.group.name}
          </p>
        </div>
      </header>

      <Notifications
        space="garbage"
        onCopy="You'll get a nudge on garbage days."
        offCopy="Get a reminder on garbage days and when you're put down for it."
      />
      <Appearance />
      {state.me.isHost && <HostSettings />}

      <Section title="Group">
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

      <Link href="/" className="card flex items-center gap-4 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gravy/15 text-gravy">
          <UtensilsCrossed size={20} />
        </span>
        <span className="flex-1 font-display text-lg font-semibold">Dinner menu</span>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <button onClick={logout} className="card flex w-full items-center justify-center gap-2 py-4 font-semibold text-no">
        <LogOut size={18} /> Sign out of garbage
      </button>
    </div>
  );
}

function HostSettings() {
  const { state, saveRemindTime } = useGarbage();
  const [copied, setCopied] = useState(false);
  const [remind, setRemind] = useState(state.group.remindTime);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = remind !== state.group.remindTime;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(state.group.joinCode);
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
      await saveRemindTime(remind);
      setMsg({ ok: true, text: "Saved" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Section title="Invite people">
        <p className="mb-3 text-sm text-muted">
          Share this code. They open this page, then choose &ldquo;Join the group&rdquo;. It&apos;s separate from the dinner family.
        </p>
        <button onClick={copyCode} className="flex w-full items-center justify-between rounded-2xl bg-surface-2 px-5 py-4">
          <span className="font-display text-3xl font-semibold tracking-[0.3em]">{state.group.joinCode}</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-brand">
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </Section>

      <Section title="Reminder">
        <TimeField label="Remind on garbage days at" value={remind} onChange={setRemind} />
        <p className="mt-3 text-xs text-muted">
          Currently {formatClock(state.group.remindTime)} ({state.group.timezone}). Goes to whoever is put down for the day, or everyone if nobody is.
        </p>
        <AnimatePresence>
          {(dirty || msg) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-3 pt-3">
                {dirty && (
                  <button disabled={saving} onClick={save} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
                {msg && <span className={msg.ok ? "text-sm font-semibold text-yes" : "text-sm font-semibold text-no"}>{msg.text}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </>
  );
}
