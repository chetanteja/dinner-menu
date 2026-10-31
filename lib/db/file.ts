import { promises as fs } from "fs";
import path from "path";
import type { Db, Row } from "./types";

/**
 * Local-development store: everything lives in .data/db.json.
 * Not used in production (Supabase is used when its env vars are set).
 */
const FILE = path.join(process.cwd(), ".data", "db.json");

type Data = Record<string, Row[]>;

const g = globalThis as unknown as { __dmChain?: Promise<unknown> };

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__dmChain ?? Promise.resolve();
  const next = prev.then(fn, fn);
  g.__dmChain = next.catch(() => undefined);
  return next;
}

async function load(): Promise<Data> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Data;
  } catch {
    return {};
  }
}

async function save(d: Data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(d, null, 2));
}

const matches = (row: Row, where?: Row) =>
  !where || Object.entries(where).every(([k, v]) => row[k] === v);

export const fileDb: Db = {
  select: <T>(table: string, where?: Row) =>
    serialize(async () => {
      const d = await load();
      return (d[table] ?? []).filter((r) => matches(r, where)) as unknown as T[];
    }),

  insert: <T>(table: string, row: Row) =>
    serialize(async () => {
      const d = await load();
      (d[table] ??= []).push(row);
      await save(d);
      return row as unknown as T;
    }),

  upsert: <T>(table: string, row: Row, onConflict: string[]) =>
    serialize(async () => {
      const d = await load();
      const rows = (d[table] ??= []);
      const key = Object.fromEntries(onConflict.map((k) => [k, row[k]]));
      const idx = rows.findIndex((r) => matches(r, key));
      if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
      else rows.push(row);
      await save(d);
      return (idx >= 0 ? rows[idx] : row) as unknown as T;
    }),

  update: (table, where, patch) =>
    serialize(async () => {
      const d = await load();
      for (const r of d[table] ?? []) if (matches(r, where)) Object.assign(r, patch);
      await save(d);
    }),

  remove: (table, where) =>
    serialize(async () => {
      const d = await load();
      d[table] = (d[table] ?? []).filter((r) => !matches(r, where));
      await save(d);
    }),
};
