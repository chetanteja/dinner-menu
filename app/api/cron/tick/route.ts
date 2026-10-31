import { timingSafeEqual } from "crypto";
import { fail, json } from "@/lib/api";
import { tick } from "@/lib/store";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/** Idempotent: sends the reminder once and locks the menu once the lock time has passed. */
async function handle(req: Request) {
  if (!authorized(req)) return fail("Unauthorized", 401);
  try {
    return json({ ok: true, results: await tick() });
  } catch (e) {
    console.error(e);
    return fail("tick failed", 500);
  }
}

export const GET = handle;
export const POST = handle;
