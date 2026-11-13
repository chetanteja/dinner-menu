// Types and date maths shared by the server and the browser for the garbage space.
// Dates are plain "YYYY-MM-DD" strings in the group's timezone; all maths is done in UTC days.

export interface GarbageMember {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

export interface GarbageDayView {
  date: string; // pickup date
  assignedTo: string | null; // member id
  done: { at: string; by: string | null } | null; // by = member id
}

export interface GarbageState {
  me: GarbageMember;
  group: { name: string; joinCode: string; remindTime: string; timezone: string };
  members: GarbageMember[];
  today: string;
  /** A date that is a pickup day; every second day before/after it is too. null until set up. */
  anchor: string | null;
  todayIsPickup: boolean;
  /** Today (if it is a pickup day) and the next few pickup days, soonest first. */
  days: GarbageDayView[];
}

const DAY_MS = 86_400_000;

export const isDateString = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));

const toDays = (date: string) => Math.round(Date.parse(date + "T00:00:00Z") / DAY_MS);

export function addDays(date: string, n: number): string {
  return new Date((toDays(date) + n) * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return toDays(a) - toDays(b);
}

/** Pickup happens on the anchor date and every second day either side of it. */
export function isPickupDay(anchor: string | null, date: string): boolean {
  if (!anchor) return false;
  return Math.abs(diffDays(date, anchor)) % 2 === 0;
}

/** The next `count` pickup dates on or after `from`. */
export function nextPickups(anchor: string | null, from: string, count: number): string[] {
  if (!anchor) return [];
  const first = isPickupDay(anchor, from) ? from : addDays(from, 1);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 2));
}
