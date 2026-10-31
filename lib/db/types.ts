import type { Category } from "../constants";

export type Row = Record<string, unknown>;

/** Tiny table-oriented interface so the app runs on Supabase or a local JSON file. */
export interface Db {
  select<T = Row>(table: string, where?: Row): Promise<T[]>;
  insert<T = Row>(table: string, row: Row): Promise<T>;
  upsert<T = Row>(table: string, row: Row, onConflict: string[]): Promise<T>;
  update(table: string, where: Row, patch: Row): Promise<void>;
  remove(table: string, where: Row): Promise<void>;
}

export interface Household {
  id: string;
  name: string;
  join_code: string;
  timezone: string;
  remind_time: string;
  lock_time: string;
  created_at: string;
}

export interface Member {
  id: string;
  household_id: string;
  name: string;
  pin_hash: string;
  is_host: boolean;
  color: string;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

export interface Dish {
  id: string;
  household_id: string;
  category: Category;
  name: string;
  emoji: string;
  added_by: string | null;
  active: boolean;
  created_at: string;
}

export interface DinnerDay {
  household_id: string;
  date: string;
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  host_unlocked: boolean;
}

export interface AttendanceRow {
  household_id: string;
  date: string;
  member_id: string;
  attending: boolean;
  updated_at: string;
}

export interface PickRow {
  household_id: string;
  date: string;
  category: Category;
  member_id: string;
  dish_id: string;
  created_at: string;
}

export interface FinalRow {
  household_id: string;
  date: string;
  category: Category;
  dish_id: string;
}

export interface PushSub {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
