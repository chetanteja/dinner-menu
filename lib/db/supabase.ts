import { createClient } from "@supabase/supabase-js";
import type { Db, Row } from "./types";

export function supabaseDb(url: string, serviceKey: string): Db {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const fail = (op: string, table: string, error: { message: string } | null) => {
    if (error) throw new Error(`Supabase ${op} on ${table} failed: ${error.message}`);
  };

  return {
    async select<T>(table: string, where?: Row) {
      let q = sb.from(table).select("*");
      if (where) q = q.match(where);
      const { data, error } = await q;
      fail("select", table, error);
      return (data ?? []) as unknown as T[];
    },
    async insert<T>(table: string, row: Row) {
      const { data, error } = await sb.from(table).insert(row).select().single();
      fail("insert", table, error);
      return data as unknown as T;
    },
    async upsert<T>(table: string, row: Row, onConflict: string[]) {
      const { data, error } = await sb
        .from(table)
        .upsert(row, { onConflict: onConflict.join(",") })
        .select()
        .single();
      fail("upsert", table, error);
      return data as unknown as T;
    },
    async update(table, where, patch) {
      const { error } = await sb.from(table).update(patch).match(where);
      fail("update", table, error);
    },
    async remove(table, where) {
      const { error } = await sb.from(table).delete().match(where);
      fail("delete", table, error);
    },
  };
}
