import { Check, Minus, X } from "lucide-react";
import clsx from "clsx";

export type AvatarStatus = "in" | "out" | "wait";

export function Avatar({
  name,
  color,
  size = 36,
  status,
  className,
  ring,
}: {
  name: string;
  color: string;
  size?: number;
  status?: AvatarStatus;
  className?: string;
  ring?: boolean;
}) {
  const badge = Math.max(14, Math.round(size * 0.38));
  return (
    <span
      className={clsx("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      title={name}
    >
      <span
        className={clsx(
          "flex h-full w-full items-center justify-center rounded-full font-display font-semibold text-white select-none",
          ring && "ring-2 ring-surface",
        )}
        style={{
          background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
          fontSize: size * 0.44,
          boxShadow: `0 4px 10px -4px ${color}`,
        }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
      {status && (
        <span
          className={clsx(
            "absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-surface text-white",
            status === "in" && "bg-yes",
            status === "out" && "bg-no",
            status === "wait" && "bg-muted/70",
          )}
          style={{ width: badge, height: badge }}
        >
          {status === "in" && <Check size={badge * 0.62} strokeWidth={3.5} />}
          {status === "out" && <X size={badge * 0.62} strokeWidth={3.5} />}
          {status === "wait" && <Minus size={badge * 0.62} strokeWidth={3.5} />}
        </span>
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 26,
  max = 4,
}: {
  people: { id: string; name: string; color: string }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((p, i) => (
        <span key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={p.name} color={p.color} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="ml-1 text-xs font-semibold text-muted"
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
