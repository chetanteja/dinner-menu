import clsx from "clsx";

/** The familiar Indian packaging mark: green dot in a square = veg, red triangle = non-veg. */
export function VegMark({ isVeg, size = 14, className }: { isVeg: boolean; size?: number; className?: string }) {
  const color = isVeg ? "#2FA466" : "#E5483A";
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      title={isVeg ? "Veg" : "Non-veg"}
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-[3px] border-2 bg-white", className)}
      style={{ width: size, height: size, borderColor: color }}
    >
      {isVeg ? (
        <span className="rounded-full" style={{ width: size * 0.42, height: size * 0.42, background: color }} />
      ) : (
        <span
          style={{
            width: size * 0.5,
            height: size * 0.46,
            background: color,
            clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          }}
        />
      )}
    </span>
  );
}
