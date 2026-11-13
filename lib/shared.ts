import type { Category } from "./constants";

// ---- Types sent to the browser ----

export type Diet = "veg" | "nonveg";

export interface PublicMember {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  /** true = in, false = skipping, null = hasn't answered */
  attending: boolean | null;
  /** what they can eat today: veg only, or non-veg is fine. null = hasn't said */
  diet: Diet | null;
}

export interface DishView {
  id: string;
  category: Category;
  name: string;
  emoji: string;
  addedBy: string | null;
  isVeg: boolean;
  /** how many times this dish ended up on a locked menu */
  loved: number;
}

export interface PickLite {
  category: Category;
  memberId: string;
  dishId: string;
  at: string;
}

export interface AppState {
  me: { id: string; name: string; color: string; isHost: boolean };
  household: {
    name: string;
    timezone: string;
    lockTime: string;
    remindTime: string;
    joinCode?: string;
  };
  date: string;
  serverNow: number;
  msToLock: number;
  windowMs: number;
  members: PublicMember[];
  /** only picks of members who are attending today */
  picks: PickLite[];
  dishes: DishView[];
  day: { locked: boolean; lockedBy: string | null; lockedAuto: boolean };
  /** set when someone has announced "food is ready" today */
  ready: { at: string; by: string } | null;
  finalMenu: { category: Category; dishId: string }[];
}

export interface HistoryDay {
  date: string;
  items: { category: Category; name: string; emoji: string }[];
}

export interface HistoryResponse {
  days: HistoryDay[];
  loved: { id: string; name: string; emoji: string; category: Category; count: number }[];
}

// ---- Derivation (used by both server and client) ----

export interface SlotGroup {
  dishId: string;
  memberIds: string[];
  firstAt: string;
}

export type SlotStatus = "open" | "proposed" | "contested" | "agreed";

export interface SlotView {
  category: Category;
  groups: SlotGroup[];
  status: SlotStatus;
  leaderDishId: string | null;
  agreeCount: number;
  attendingCount: number;
}

/**
 * Work out what is going on for one slot (gravy / fry / staple).
 * Only attending members count. Ties are broken by the host's pick, then by
 * whichever dish was picked first.
 */
export function deriveSlot(
  category: Category,
  attendingIds: string[],
  picks: PickLite[],
  hostId?: string | null,
): SlotView {
  const attending = new Set(attendingIds);
  const byDish = new Map<string, SlotGroup>();
  for (const p of picks) {
    if (p.category !== category || !attending.has(p.memberId)) continue;
    const g = byDish.get(p.dishId);
    if (g) {
      g.memberIds.push(p.memberId);
      if (p.at < g.firstAt) g.firstAt = p.at;
    } else {
      byDish.set(p.dishId, { dishId: p.dishId, memberIds: [p.memberId], firstAt: p.at });
    }
  }
  const groups = [...byDish.values()].sort((a, b) => {
    if (b.memberIds.length !== a.memberIds.length) return b.memberIds.length - a.memberIds.length;
    const aHost = hostId ? a.memberIds.includes(hostId) : false;
    const bHost = hostId ? b.memberIds.includes(hostId) : false;
    if (aHost !== bHost) return aHost ? -1 : 1;
    return a.firstAt < b.firstAt ? -1 : 1;
  });

  const attendingCount = attendingIds.length;
  let status: SlotStatus = "open";
  if (groups.length === 1) {
    status = groups[0].memberIds.length === attendingCount ? "agreed" : "proposed";
  } else if (groups.length > 1) {
    status = "contested";
  }
  return {
    category,
    groups,
    status,
    leaderDishId: groups[0]?.dishId ?? null,
    agreeCount: groups[0]?.memberIds.length ?? 0,
    attendingCount,
  };
}

// ---- Veg / non-veg for the day ----

export interface DietSummary {
  kind: "none" | "pending" | "veg-only" | "nonveg-ok";
  vegNames: string[];
  pendingNames: string[];
}

/**
 * Can everyone eating tonight have non-veg?
 * - veg-only:  at least one person eating tonight is veg today
 * - pending:   nobody said veg, but some haven't said yet
 * - nonveg-ok: everyone eating said non-veg is fine
 */
export function dietSummary(members: PublicMember[]): DietSummary {
  const eating = members.filter((m) => m.attending === true);
  const vegNames = eating.filter((m) => m.diet === "veg").map((m) => m.name);
  const pendingNames = eating.filter((m) => m.diet === null).map((m) => m.name);
  if (eating.length === 0) return { kind: "none", vegNames, pendingNames };
  if (vegNames.length > 0) return { kind: "veg-only", vegNames, pendingNames };
  if (pendingNames.length > 0) return { kind: "pending", vegNames, pendingNames };
  return { kind: "nonveg-ok", vegNames, pendingNames };
}

/** ["A"] -> "A", ["A","B"] -> "A and B", ["A","B","C"] -> "A, B and C" */
export function joinNames(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
