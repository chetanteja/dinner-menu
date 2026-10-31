import { randomInt, randomUUID } from "crypto";
import { CATEGORIES, CATEGORY_IDS, MEMBER_COLORS, SEED_DISHES, type Category } from "./constants";
import { getDb } from "./db";
import type {
  AttendanceRow,
  DinnerDay,
  Dish,
  FinalRow,
  Household,
  Member,
  PickRow,
} from "./db/types";
import { pushToMembers } from "./push";
import {
  deriveSlot,
  type AppState,
  type DishView,
  type HistoryResponse,
  type PickLite,
  type PublicMember,
} from "./shared";
import { formatClock, hhmmToSeconds, zonedNow, type ZonedNow } from "./time";

const nowIso = () => new Date().toISOString();

export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// ---------- households & members ----------

export async function getHousehold(): Promise<Household | null> {
  const [h] = await getDb().select<Household>("households");
  return h ?? null;
}

function newJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function createHousehold(name: string, hostName: string, pinHash: string) {
  const db = getDb();
  const household = await db.insert<Household>("households", {
    id: randomUUID(),
    name,
    join_code: newJoinCode(),
    timezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata",
    remind_time: "17:00",
    lock_time: "18:00",
    created_at: nowIso(),
  });
  const host = await insertMember(household.id, hostName, pinHash, true, 0);
  for (const cat of CATEGORY_IDS) {
    for (const d of SEED_DISHES[cat]) {
      await db.insert("dishes", {
        id: randomUUID(),
        household_id: household.id,
        category: cat,
        name: d.name,
        emoji: d.emoji,
        added_by: null,
        active: true,
        created_at: nowIso(),
      });
    }
  }
  return { household, host };
}

async function insertMember(
  householdId: string,
  name: string,
  pinHash: string,
  isHost: boolean,
  index: number,
) {
  return getDb().insert<Member>("members", {
    id: randomUUID(),
    household_id: householdId,
    name,
    pin_hash: pinHash,
    is_host: isHost,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    failed_attempts: 0,
    locked_until: null,
    created_at: nowIso(),
  });
}

export async function joinHousehold(household: Household, name: string, pinHash: string) {
  const members = await listMembers(household.id);
  if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    throw new UserError("Someone with that name is already in the family");
  }
  if (members.length >= 12) throw new UserError("The family is full");
  return insertMember(household.id, name, pinHash, false, members.length);
}

export async function listMembers(householdId: string): Promise<Member[]> {
  const rows = await getDb().select<Member>("members", { household_id: householdId });
  return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

// ---------- day helpers ----------

async function getDay(householdId: string, date: string): Promise<DinnerDay | undefined> {
  const [d] = await getDb().select<DinnerDay>("dinner_days", { household_id: householdId, date });
  return d;
}

async function claim(householdId: string, date: string, kind: string): Promise<boolean> {
  const db = getDb();
  const existing = await db.select("notification_log", { household_id: householdId, date, kind });
  if (existing.length) return false;
  await db.insert("notification_log", { household_id: householdId, date, kind, created_at: nowIso() });
  return true;
}

function toPickLite(p: PickRow): PickLite {
  return { category: p.category, memberId: p.member_id, dishId: p.dish_id, at: p.created_at };
}

// ---------- state for the browser ----------

export async function buildState(member: Member): Promise<AppState> {
  const db = getDb();
  const [household] = await db.select<Household>("households", { id: member.household_id });
  if (!household) throw new UserError("Household not found", 404);
  const now = zonedNow(household.timezone);

  await autoLockIfDue(household, now);

  const hid = household.id;
  const [members, attendance, picks, dishes, day, finals, allFinals] = await Promise.all([
    listMembers(hid),
    db.select<AttendanceRow>("attendance", { household_id: hid, date: now.date }),
    db.select<PickRow>("picks", { household_id: hid, date: now.date }),
    db.select<Dish>("dishes", { household_id: hid }),
    getDay(hid, now.date),
    db.select<FinalRow>("final_menu", { household_id: hid, date: now.date }),
    db.select<FinalRow>("final_menu", { household_id: hid }),
  ]);

  const attMap = new Map(attendance.map((a) => [a.member_id, a.attending]));
  const publicMembers: PublicMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color,
    isHost: m.is_host,
    attending: attMap.has(m.id) ? (attMap.get(m.id) as boolean) : null,
  }));

  const attendingIds = new Set(publicMembers.filter((m) => m.attending).map((m) => m.id));
  const lovedCounts = new Map<string, number>();
  for (const f of allFinals) lovedCounts.set(f.dish_id, (lovedCounts.get(f.dish_id) ?? 0) + 1);
  const finalIds = new Set(finals.map((f) => f.dish_id));

  const dishViews: DishView[] = dishes
    .filter((d) => d.active || finalIds.has(d.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({
      id: d.id,
      category: d.category,
      name: d.name,
      emoji: d.emoji,
      addedBy: d.added_by,
      loved: lovedCounts.get(d.id) ?? 0,
    }));

  const lockSec = hhmmToSeconds(household.lock_time);
  const remindSec = hhmmToSeconds(household.remind_time);

  return {
    me: { id: member.id, name: member.name, color: member.color, isHost: member.is_host },
    household: {
      name: household.name,
      timezone: household.timezone,
      lockTime: household.lock_time,
      remindTime: household.remind_time,
      joinCode: member.is_host ? household.join_code : undefined,
    },
    date: now.date,
    serverNow: Date.now(),
    msToLock: (lockSec - now.secondsOfDay) * 1000,
    windowMs: Math.max((lockSec - remindSec) * 1000, 3600 * 1000),
    members: publicMembers,
    picks: picks.filter((p) => attendingIds.has(p.member_id)).map(toPickLite),
    dishes: dishViews,
    day: {
      locked: !!day?.locked,
      lockedBy: day?.locked_by ?? null,
      lockedAuto: !!day?.locked && !day.locked_by,
    },
    finalMenu: finals.map((f) => ({ category: f.category, dishId: f.dish_id })),
  };
}

export async function buildHistory(householdId: string): Promise<HistoryResponse> {
  const db = getDb();
  const [finals, dishes] = await Promise.all([
    db.select<FinalRow>("final_menu", { household_id: householdId }),
    db.select<Dish>("dishes", { household_id: householdId }),
  ]);
  const dishMap = new Map(dishes.map((d) => [d.id, d]));
  const byDate = new Map<string, FinalRow[]>();
  for (const f of finals) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);

  const days = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 30)
    .map(([date, rows]) => ({
      date,
      items: CATEGORY_IDS.flatMap((cat) => {
        const row = rows.find((r) => r.category === cat);
        const dish = row ? dishMap.get(row.dish_id) : undefined;
        return dish ? [{ category: cat, name: dish.name, emoji: dish.emoji }] : [];
      }),
    }));

  const counts = new Map<string, number>();
  for (const f of finals) counts.set(f.dish_id, (counts.get(f.dish_id) ?? 0) + 1);
  const loved = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .flatMap(([id, count]) => {
      const d = dishMap.get(id);
      return d ? [{ id, name: d.name, emoji: d.emoji, category: d.category, count }] : [];
    });

  return { days, loved };
}

// ---------- actions ----------

async function currentDay(member: Member) {
  const [household] = await getDb().select<Household>("households", { id: member.household_id });
  if (!household) throw new UserError("Household not found", 404);
  const now = zonedNow(household.timezone);
  const day = await getDay(household.id, now.date);
  return { household, now, day };
}

export async function setAttendance(member: Member, attending: boolean) {
  const db = getDb();
  const { household, now } = await currentDay(member);
  await db.upsert(
    "attendance",
    {
      household_id: household.id,
      date: now.date,
      member_id: member.id,
      attending,
      updated_at: nowIso(),
    },
    ["household_id", "date", "member_id"],
  );
  if (!attending) {
    await db.remove("picks", { household_id: household.id, date: now.date, member_id: member.id });
  }
}

export async function setPick(member: Member, category: Category, dishId: string | null) {
  const db = getDb();
  const { household, now, day } = await currentDay(member);
  if (day?.locked) throw new UserError("The menu is locked for today");

  const [att] = await db.select<AttendanceRow>("attendance", {
    household_id: household.id,
    date: now.date,
    member_id: member.id,
  });
  if (!att?.attending) throw new UserError("Say you're in for dinner first");

  if (dishId === null) {
    await db.remove("picks", {
      household_id: household.id,
      date: now.date,
      category,
      member_id: member.id,
    });
    return;
  }
  const [dish] = await db.select<Dish>("dishes", { id: dishId, household_id: household.id });
  if (!dish || !dish.active || dish.category !== category) throw new UserError("Unknown dish");

  await db.upsert(
    "picks",
    {
      household_id: household.id,
      date: now.date,
      category,
      member_id: member.id,
      dish_id: dishId,
      created_at: nowIso(),
    },
    ["household_id", "date", "category", "member_id"],
  );
}

export async function addDish(member: Member, category: Category, name: string, emoji?: string) {
  const db = getDb();
  const existing = await db.select<Dish>("dishes", { household_id: member.household_id, category });
  const dup = existing.find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (dup) {
    if (!dup.active) await db.update("dishes", { id: dup.id }, { active: true });
    return { ...dup, active: true };
  }
  return db.insert<Dish>("dishes", {
    id: randomUUID(),
    household_id: member.household_id,
    category,
    name,
    emoji: emoji || CATEGORIES.find((c) => c.id === category)!.emoji,
    added_by: member.id,
    active: true,
    created_at: nowIso(),
  });
}

export async function hideDish(member: Member, dishId: string) {
  if (!member.is_host) throw new UserError("Only the host can remove dishes", 403);
  await getDb().update("dishes", { id: dishId, household_id: member.household_id }, { active: false });
}

export async function updateSettings(member: Member, remindTime: string, lockTime: string) {
  if (!member.is_host) throw new UserError("Only the host can change times", 403);
  await getDb().update("households", { id: member.household_id }, {
    remind_time: remindTime,
    lock_time: lockTime,
  });
}

// ---------- locking ----------

export async function lockDay(
  household: Household,
  date: string,
  byMemberId: string | null,
  overrides: Partial<Record<Category, string>> = {},
) {
  const db = getDb();
  const hid = household.id;
  const [members, attendance, picks, dishes] = await Promise.all([
    listMembers(hid),
    db.select<AttendanceRow>("attendance", { household_id: hid, date }),
    db.select<PickRow>("picks", { household_id: hid, date }),
    db.select<Dish>("dishes", { household_id: hid }),
  ]);
  const attendingIds = attendance.filter((a) => a.attending).map((a) => a.member_id);
  const host = members.find((m) => m.is_host);
  const lite = picks.map(toPickLite);
  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  await db.remove("final_menu", { household_id: hid, date });
  const chosen: Dish[] = [];
  for (const cat of CATEGORY_IDS) {
    const override = overrides[cat];
    const overrideDish = override ? dishMap.get(override) : undefined;
    const dishId =
      overrideDish && overrideDish.category === cat
        ? overrideDish.id
        : deriveSlot(cat, attendingIds, lite, host?.id).leaderDishId;
    const dish = dishId ? dishMap.get(dishId) : undefined;
    if (!dish) continue;
    chosen.push(dish);
    await db.insert("final_menu", { household_id: hid, date, category: cat, dish_id: dish.id });
  }

  await db.upsert(
    "dinner_days",
    {
      household_id: hid,
      date,
      locked: true,
      locked_by: byMemberId,
      locked_at: nowIso(),
      host_unlocked: false,
    },
    ["household_id", "date"],
  );

  if (await claim(hid, date, "locked")) {
    const body =
      chosen.length > 0
        ? chosen.map((d) => `${d.emoji} ${d.name}`).join(" · ")
        : "Nobody's having dinner at home tonight.";
    await pushToMembers(
      members.map((m) => m.id),
      { title: "Tonight's dinner is locked 🍽️", body, tag: "locked" },
    ).catch((e) => console.error(e));
  }
}

export async function unlockDay(member: Member) {
  if (!member.is_host) throw new UserError("Only the host can reopen voting", 403);
  const { household, now } = await currentDay(member);
  const db = getDb();
  await db.remove("final_menu", { household_id: household.id, date: now.date });
  await db.upsert(
    "dinner_days",
    {
      household_id: household.id,
      date: now.date,
      locked: false,
      locked_by: null,
      locked_at: null,
      host_unlocked: true,
    },
    ["household_id", "date"],
  );
}

export async function hostLock(member: Member, overrides: Partial<Record<Category, string>>) {
  if (!member.is_host) throw new UserError("Only the host can lock the menu", 403);
  const { household, now } = await currentDay(member);
  await lockDay(household, now.date, member.id, overrides);
}

async function autoLockIfDue(household: Household, now: ZonedNow) {
  const day = await getDay(household.id, now.date);
  if (day?.locked || day?.host_unlocked) return;
  if (now.secondsOfDay >= hhmmToSeconds(household.lock_time)) {
    await lockDay(household, now.date, null);
  }
}

// ---------- scheduled tick (reminders + auto lock) ----------

async function sendReminders(household: Household, date: string) {
  const db = getDb();
  const [members, attendance, picks] = await Promise.all([
    listMembers(household.id),
    db.select<AttendanceRow>("attendance", { household_id: household.id, date }),
    db.select<PickRow>("picks", { household_id: household.id, date }),
  ]);
  const att = new Map(attendance.map((a) => [a.member_id, a.attending]));
  const lockLabel = formatClock(household.lock_time);

  const unanswered = members.filter((m) => !att.has(m.id)).map((m) => m.id);
  const needsPicks = members
    .filter((m) => att.get(m.id) === true)
    .filter((m) => CATEGORY_IDS.some((c) => !picks.some((p) => p.member_id === m.id && p.category === c)))
    .map((m) => m.id);

  await pushToMembers(unanswered, {
    title: "Dinner tonight? 🍽️",
    body: `Tell us if you're in and help pick the menu. It locks at ${lockLabel}.`,
    tag: "remind",
  });
  await pushToMembers(needsPicks, {
    title: "Pick tonight's menu 🍛",
    body: `Gravy, fry and staple are waiting for your vote. Locks at ${lockLabel}.`,
    tag: "remind",
  });
}

export async function tick() {
  const households = await getDb().select<Household>("households");
  const results: { household: string; action: string }[] = [];
  for (const h of households) {
    const now = zonedNow(h.timezone);
    const day = await getDay(h.id, now.date);
    if (day?.locked) continue;
    if (now.secondsOfDay >= hhmmToSeconds(h.lock_time) && !day?.host_unlocked) {
      await lockDay(h, now.date, null);
      results.push({ household: h.name, action: "locked" });
    } else if (
      now.secondsOfDay >= hhmmToSeconds(h.remind_time) &&
      now.secondsOfDay < hhmmToSeconds(h.lock_time) &&
      (await claim(h.id, now.date, "remind"))
    ) {
      await sendReminders(h, now.date);
      results.push({ household: h.name, action: "reminded" });
    }
  }
  return results;
}
