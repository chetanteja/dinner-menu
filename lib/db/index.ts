import { fileDb } from "./file";
import { supabaseDb } from "./supabase";
import type { Db } from "./types";

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    cached = supabaseDb(url, key);
  } else if (process.env.VERCEL) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on Vercel.");
  } else {
    cached = fileDb;
  }
  return cached;
}
