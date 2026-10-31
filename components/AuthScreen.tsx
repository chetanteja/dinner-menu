"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Crown, KeyRound, Sparkles, UserPlus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import useSWR from "swr";
import { api, ApiError, fetcher } from "@/lib/client";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { PinPad } from "./PinPad";

interface Info {
  setupNeeded: boolean;
  household?: string;
  members: { id: string; name: string; color: string; isHost: boolean }[];
}

type View =
  | { k: "pick" }
  | { k: "pin"; id: string; name: string; color: string }
  | { k: "join" }
  | { k: "joinpin"; code: string; name: string }
  | { k: "setup" }
  | { k: "setuppin"; householdName: string; name: string };

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Couldn't connect. Check your internet.");

export function AuthScreen({ onDone }: { onDone: () => void }) {
  const { data, error, mutate } = useSWR<Info>("/api/auth/members", fetcher, { revalidateOnFocus: false });
  const [view, setView] = useState<View>({ k: "pick" });

  const info = data;
  const effective: View = info?.setupNeeded && view.k === "pick" ? { k: "setup" } : view;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={effective.k + ("id" in effective ? effective.id : "")}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22 }}
          className="flex flex-1 flex-col"
        >
          {!info && !error && <LoadingAuth />}
          {error && !info && (
            <div className="my-auto text-center">
              <Logo size={64} />
              <p className="mt-6 font-display text-2xl">Can&apos;t reach the kitchen</p>
              <p className="mt-2 text-sm text-muted">{errMsg(error)}</p>
              <button
                onClick={() => mutate()}
                className="mt-6 rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-card"
              >
                Try again
              </button>
            </div>
          )}
          {info && effective.k === "pick" && <PickMember info={info} setView={setView} />}
          {info && effective.k === "pin" && (
            <PinLogin member={effective} back={() => setView({ k: "pick" })} onDone={onDone} />
          )}
          {info && effective.k === "join" && (
            <JoinForm back={() => setView({ k: "pick" })} next={(code, name) => setView({ k: "joinpin", code, name })} />
          )}
          {info && effective.k === "joinpin" && (
            <CreatePin
              title={`Pick a PIN, ${effective.name}`}
              back={() => setView({ k: "join" })}
              onDone={async (pin) => {
                await api("/api/auth/join", { json: { code: effective.code, name: effective.name, pin } });
                onDone();
              }}
            />
          )}
          {info && effective.k === "setup" && <SetupForm next={(householdName, name) => setView({ k: "setuppin", householdName, name })} />}
          {info && effective.k === "setuppin" && (
            <CreatePin
              title={`Pick a PIN, ${effective.name}`}
              back={() => setView({ k: "setup" })}
              onDone={async (pin) => {
                await api("/api/auth/setup", {
                  json: { householdName: effective.householdName, name: effective.name, pin },
                });
                onDone();
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function LoadingAuth() {
  return (
    <div className="my-auto flex flex-col items-center gap-6">
      <Logo size={72} />
      <div className="skeleton h-6 w-40" />
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="skeleton h-36" />
        <div className="skeleton h-36" />
      </div>
    </div>
  );
}

function Heading({ title, subtitle, logo = true }: { title: string; subtitle?: string; logo?: boolean }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      {logo && <Logo size={68} />}
      <h1 className="mt-5 font-display text-4xl leading-tight font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 max-w-xs text-[15px] text-muted">{subtitle}</p>}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass -ml-1 mb-2 flex h-11 w-11 items-center justify-center rounded-full text-ink"
      aria-label="Back"
    >
      <ArrowLeft size={20} />
    </button>
  );
}

function PickMember({ info, setView }: { info: Info; setView: (v: View) => void }) {
  return (
    <div className="my-auto">
      <Heading title="Who's eating?" subtitle={info.household ? `Welcome to ${info.household}` : undefined} />
      <div className="grid grid-cols-2 gap-3">
        {info.members.map((m, i) => (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView({ k: "pin", id: m.id, name: m.name, color: m.color })}
            className="card flex flex-col items-center gap-3 px-3 py-6"
          >
            <Avatar name={m.name} color={m.color} size={64} />
            <span className="flex items-center gap-1 font-display text-lg font-semibold">
              {m.name}
              {m.isHost && <Crown size={14} className="text-fry" />}
            </span>
          </motion.button>
        ))}
      </div>
      <button
        onClick={() => setView({ k: "join" })}
        className="mx-auto mt-8 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
      >
        <UserPlus size={16} /> New here? Join the family
      </button>
    </div>
  );
}

function PinLogin({
  member,
  back,
  onDone,
}: {
  member: { id: string; name: string; color: string };
  back: () => void;
  onDone: () => void;
}) {
  const submit = useCallback(
    async (pin: string) => {
      try {
        await api("/api/auth/login", { json: { memberId: member.id, pin } });
        onDone();
        return null;
      } catch (e) {
        return errMsg(e);
      }
    },
    [member.id, onDone],
  );
  return (
    <div>
      <BackButton onClick={back} />
      <div className="mb-2 flex flex-col items-center pt-4 text-center">
        <Avatar name={member.name} color={member.color} size={84} />
        <h1 className="mt-4 font-display text-3xl font-semibold">Hi, {member.name}</h1>
        <p className="mt-1 text-sm text-muted">Enter your 4-digit PIN</p>
      </div>
      <PinPad onSubmit={submit} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  maxLength = 40,
  upper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  upper?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs font-semibold tracking-wider text-muted uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className="glass w-full rounded-2xl px-4 py-3.5 text-lg font-medium text-ink outline-none transition-shadow placeholder:text-muted/60 focus:ring-2 focus:ring-brand/60"
        style={upper ? { letterSpacing: "0.25em" } : undefined}
      />
    </label>
  );
}

function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-lg font-semibold text-white shadow-card transition-opacity disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}

function SetupForm({ next }: { next: (householdName: string, name: string) => void }) {
  const [family, setFamily] = useState("");
  const [name, setName] = useState("");
  const ok = family.trim().length > 1 && name.trim().length > 0;
  return (
    <div className="my-auto">
      <Heading title="Set up your table" subtitle="Create your family's dinner space. You'll be the host." />
      <div className="space-y-4">
        <Field label="Family name" value={family} onChange={setFamily} placeholder="The Sharma Kitchen" autoFocus />
        <Field label="Your name" value={name} onChange={setName} placeholder="Chitra" maxLength={24} />
        <div className="pt-2">
          <PrimaryButton disabled={!ok} onClick={() => next(family.trim(), name.trim())}>
            <Sparkles size={18} /> Continue
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function JoinForm({ back, next }: { back: () => void; next: (code: string, name: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const ok = code.trim().length >= 4 && name.trim().length > 0;
  return (
    <div>
      <BackButton onClick={back} />
      <div className="pt-4">
        <Heading title="Join the family" subtitle="Ask the host for the invite code (it's in their Me tab)." logo={false} />
        <div className="space-y-4">
          <Field label="Invite code" value={code} onChange={setCode} placeholder="ABC123" maxLength={6} upper autoFocus />
          <Field label="Your name" value={name} onChange={setName} placeholder="Your first name" maxLength={24} />
          <div className="pt-2">
            <PrimaryButton disabled={!ok} onClick={() => next(code.trim(), name.trim())}>
              <KeyRound size={18} /> Choose a PIN
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePin({
  title,
  back,
  onDone,
}: {
  title: string;
  back: () => void;
  onDone: (pin: string) => Promise<void>;
}) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (pin: string) => {
      if (first === null) {
        setFirst(pin);
        setError(null);
        return null;
      }
      if (pin !== first) {
        setFirst(null);
        setError("Those didn't match. Start again.");
        return "Those didn't match. Start again.";
      }
      try {
        await onDone(pin);
        return null;
      } catch (e) {
        return errMsg(e);
      }
    },
    [first, onDone],
  );

  return (
    <div>
      <BackButton onClick={back} />
      <div className="pt-4">
        <Heading
          title={first === null ? title : "Once more"}
          subtitle={first === null ? "You'll use this 4-digit PIN to sign in." : "Enter the same PIN to confirm."}
          logo={false}
        />
        <PinPad key={first === null ? "a" : "b"} onSubmit={submit} error={first === null ? error : null} />
      </div>
    </div>
  );
}
