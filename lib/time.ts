export interface ZonedNow {
  date: string; // YYYY-MM-DD in the household timezone
  secondsOfDay: number;
}

export function zonedNow(timeZone: string, d: Date = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    secondsOfDay: Number(get("hour")) * 3600 + Number(get("minute")) * 60 + Number(get("second")),
  };
}

export function hhmmToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function isValidHHMM(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
