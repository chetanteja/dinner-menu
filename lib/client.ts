import type { Category } from "./constants";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError((data as { error?: string } | null)?.error ?? "Something went wrong", res.status);
  }
  return data as T;
}

export const fetcher = <T = unknown>(url: string) => api<T>(url);

export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

/** Static class names so Tailwind can see them. */
export const CAT_STYLE: Record<
  Category,
  { text: string; bg: string; soft: string; softer: string; border: string; ring: string; bar: string; grad: string }
> = {
  gravy: {
    text: "text-gravy",
    bg: "bg-gravy",
    soft: "bg-gravy/15",
    softer: "bg-gravy/8",
    border: "border-gravy/35",
    ring: "ring-gravy/50",
    bar: "bg-gravy",
    grad: "from-gravy/25 via-gravy/5 to-transparent",
  },
  fry: {
    text: "text-fry",
    bg: "bg-fry",
    soft: "bg-fry/15",
    softer: "bg-fry/8",
    border: "border-fry/40",
    ring: "ring-fry/50",
    bar: "bg-fry",
    grad: "from-fry/25 via-fry/5 to-transparent",
  },
  staple: {
    text: "text-staple",
    bg: "bg-staple",
    soft: "bg-staple/15",
    softer: "bg-staple/8",
    border: "border-staple/35",
    ring: "ring-staple/50",
    bar: "bg-staple",
    grad: "from-staple/25 via-staple/5 to-transparent",
  },
};

export function greeting(hour: number) {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function prettyDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", opts ?? { weekday: "long", day: "numeric", month: "long" });
}
