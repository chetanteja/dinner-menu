import type { Category } from "./constants";

// ---- Types sent to the browser ----

export interface PublicMember {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  /** true = in, false = skipping, null = hasn't answered */
  attending: boolean | null;
}

export interface DishView {
  id: string;
  category: Category;
  name: string;
  emoji: string;
  addedBy: string | null;
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
