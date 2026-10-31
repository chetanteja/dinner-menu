"use client";

import { Delete } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { haptic } from "@/lib/client";

/**
 * 4-digit PIN entry. `onSubmit` resolves to an error message (shown + shake) or null on success.
 */
export function PinPad({
  onSubmit,
  error,
  disabled,
}: {
  onSubmit: (pin: string) => Promise<string | null>;
  error?: string | null;
  disabled?: boolean;
}) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  const press = useCallback(
    (d: string) => {
      if (disabled || busy) return;
      haptic(6);
      setMsg(null);
      setPin((p) => (p.length < 4 ? p + d : p));
    },
    [disabled, busy],
  );
  const back = useCallback(() => {
    if (disabled || busy) return;
    setPin((p) => p.slice(0, -1));
  }, [disabled, busy]);

  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  useEffect(() => {
    if (pin.length !== 4 || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    onSubmitRef
      .current(pin)
      .then((err) => {
        if (err) {
          setMsg(err);
          setShake((s) => s + 1);
          haptic(40);
          setPin("");
        }
      })
      .finally(() => {
        submitting.current = false;
        setBusy(false);
      });
  }, [pin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  const shown = msg ?? error;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={shake}
        animate={shake ? { x: [0, -12, 12, -9, 9, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="flex gap-4 py-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            animate={{ scale: pin.length === i + 1 ? [1, 1.35, 1] : 1 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "h-4 w-4 rounded-full border-2 transition-colors",
              i < pin.length ? "border-brand bg-brand" : "border-muted/40 bg-transparent",
              shown && "border-no/70",
            )}
          />
        ))}
      </motion.div>
      <p className={clsx("h-5 text-sm font-medium", shown ? "text-no" : "text-transparent")} role="alert">
        {shown || "."}
      </p>
      <div className="mt-4 grid w-full max-w-[17rem] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={disabled || busy}>
            {d}
          </Key>
        ))}
        <span />
        <Key onClick={() => press("0")} disabled={disabled || busy}>
          0
        </Key>
        <Key onClick={back} disabled={disabled || busy} aria-label="Delete" subtle>
          <Delete size={22} />
        </Key>
      </div>
    </div>
  );
}

function Key({
  children,
  onClick,
  disabled,
  subtle,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  subtle?: boolean;
  "aria-label"?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex h-16 items-center justify-center rounded-full font-display text-2xl font-semibold transition-colors",
        subtle ? "text-muted" : "glass text-ink shadow-card active:bg-brand/20",
        disabled && "opacity-60",
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
