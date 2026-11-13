import { getDb } from "./db";
import type { GarbageDayRow, Household, Member } from "./db/types";
import {
  addDays,
  isDateString,
  isPickupDay,
  nextPickups,
  type GarbageDayView,
  type GarbageMember,
  type GarbageState,
} from "./garbageShared";
import { pushToMembers } from "./push";
import { claim, listMembers, UserError } from "./store";
import { formatClock, hhmmToSeconds, zonedNow } from "./time";

const nowIso = () => new Date().toISOString();
const UPCOMING = 6;
const GARBAGE_PUSH = { url: "/garbage", icon: "/pwa-icon/192?k=garbage" } as const;

const toMember = (m: Member): GarbageMember => ({ id: m.id, name: m.name, color: m.color, isHost: m.is_host });

async function getGroup(member: Member): Promise<Household> {
  const [h] = await getDb().select<Household>("households", { id: member.household_id });
  if (!h || h.kind !== "garbage") throw new UserError("Group not found", 404);
  return h;
}

async function getDayRow(groupId: string, date: string): Promise<GarbageDayRow | undefined> {
  const [d] = await getDb().select<GarbageDayRow>("garbage_days", { household_id: groupId, date });
  return d;
}

function dateLabel(date: string, today: string) {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// ---------- state ----------

export async function buildGarbageState(member: Member): Promise<GarbageState> {
  const group = await getGroup(member);
  const db = getDb();
  const now = zonedNow(group.timezone);
  const [members, rows] = await Promise.all([
    listMembers(group.id),
    db.select<GarbageDayRow>("garbage_days", { household_id: group.id }),
  ]);
  const anchor = group.anchor_date ?? null;
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days: GarbageDayView[] = nextPickups(anchor, now.date, UPCOMING).map((date) => {
    const r = byDate.get(date);
    return {
      date,
      assignedTo: r?.assigned_to ?? null,
      done: r?.done_at ? { at: r.done_at, by: r.done_by ?? null } : null,
    };
  });
  return {
    me: toMember(member),
    group: {
      name: group.name,
      joinCode: group.join_code,
      remindTime: group.remind_time,
      timezone: group.timezone,
    },
    members: members.map(toMember),
    today: now.date,
    anchor,
    todayIsPickup: isPickupDay(anchor, now.date),
    days,
  };
}

// ---------- actions ----------

/**
 * Set (or reset) the pattern: `anchor` is a pickup day and every second day around it is too.
 * Used for the first setup and whenever the truck skips and the rhythm needs to shift.
 */
export async function setSchedule(member: Member, anchor: string) {
  const group = await getGroup(member);
  const now = zonedNow(group.timezone);
  if (!isDateString(anchor)) throw new UserError("Pick a valid date");
  if (anchor < addDays(now.date, -30) || anchor > addDays(now.date, 60)) {
    throw new UserError("Pick a date within the next two months");
  }
  const db = getDb();
  await db.update("households", { id: group.id }, { anchor_date: anchor });
  // Planned names for days that are no longer pickup days no longer mean anything.
  const rows = await db.select<GarbageDayRow>("garbage_days", { household_id: group.id });
  for (const r of rows) {
    if (r.date >= now.date && !r.done_at && !isPickupDay(anchor, r.date)) {
      await db.remove("garbage_days", { household_id: group.id, date: r.date });
    }
  }
}

/** Name who takes the garbage out on a pickup day (or clear it with memberId = null). */
export async function assign(member: Member, date: string, memberId: string | null) {
  const group = await getGroup(member);
  const now = zonedNow(group.timezone);
  if (!isDateString(date) || date < now.date) throw new UserError("Pick today or a future pickup day");
  if (!isPickupDay(group.anchor_date ?? null, date)) throw new UserError("That isn't a garbage day");
  if (memberId) {
    const members = await listMembers(group.id);
    if (!members.some((m) => m.id === memberId)) throw new UserError("They aren't in this group");
  }
  const existing = await getDayRow(group.id, date);
  if (existing?.done_at) throw new UserError("That pickup is already taken out");
  if ((existing?.assigned_to ?? null) === memberId) return;
  await getDb().upsert(
    "garbage_days",
    { household_id: group.id, date, assigned_to: memberId },
    ["household_id", "date"],
  );
  if (memberId && memberId !== member.id) {
    const when = dateLabel(date, now.date);
    await pushToMembers([memberId], {
      title: "Garbage duty 🗑️",
      body: `${member.name} put you down to take the garbage out ${when}.`,
      tag: "garbage-assigned",
      ...GARBAGE_PUSH,
    });
  }
}

/** Mark today's (or a past pickup's) garbage as taken out, or undo it. */
export async function setDone(member: Member, date: string, done: boolean) {
  const group = await getGroup(member);
  const now = zonedNow(group.timezone);
  if (!isDateString(date) || date > now.date) throw new UserError("You can only mark today's garbage");
  if (!isPickupDay(group.anchor_date ?? null, date)) throw new UserError("That isn't a garbage day");
  await getDb().upsert(
    "garbage_days",
    {
      household_id: group.id,
      date,
      done_at: done ? nowIso() : null,
      done_by: done ? member.id : null,
    },
    ["household_id", "date"],
  );
}

export async function updateGarbageSettings(member: Member, remindTime: string) {
  if (!member.is_host) throw new UserError("Only the host can change the reminder time", 403);
  await getGroup(member);
  await getDb().update("households", { id: member.household_id }, { remind_time: remindTime });
}

// ---------- scheduled reminder ----------

/** Idempotent: on a pickup day, once the reminder time has passed, nudge once unless it's done. */
export async function tickGarbage() {
  const groups = await getDb().select<Household>("households", { kind: "garbage" });
  const results: { group: string; action: string }[] = [];
  for (const g of groups) {
    if (!g.anchor_date) continue;
    const now = zonedNow(g.timezone);
    if (!isPickupDay(g.anchor_date, now.date)) continue;
    if (now.secondsOfDay < hhmmToSeconds(g.remind_time)) continue;
    const day = await getDayRow(g.id, now.date);
    if (day?.done_at) continue;
    if (!(await claim(g.id, now.date, "garbage-remind"))) continue;

    const members = await listMembers(g.id);
    const assigned = day?.assigned_to ? members.find((m) => m.id === day.assigned_to) : undefined;
    if (assigned) {
      await pushToMembers([assigned.id], {
        title: "Garbage day 🗑️",
        body: `It's your turn to take the garbage out tonight, ${assigned.name}.`,
        tag: "garbage-remind",
        ...GARBAGE_PUSH,
      });
    } else {
      await pushToMembers(
        members.map((m) => m.id),
        {
          title: "Garbage day 🗑️",
          body: `Garbage goes out today and nobody's down for it yet. Can someone take it out? (${formatClock(g.remind_time)} reminder)`,
          tag: "garbage-remind",
          ...GARBAGE_PUSH,
        },
      );
    }
    results.push({ group: g.name, action: assigned ? "reminded assignee" : "reminded everyone" });
  }
  return results;
}
