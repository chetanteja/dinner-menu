import bcrypt from "bcryptjs";
import { fail, isPin, json, readBody } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Member } from "@/lib/db/types";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;

export async function POST(req: Request) {
  try {
    const body = await readBody<{ memberId?: string; pin?: string }>(req);
    if (typeof body.memberId !== "string" || !isPin(body.pin)) return fail("Enter your 4-digit PIN");
    const db = getDb();
    const [member] = await db.select<Member>("members", { id: body.memberId });
    if (!member) return fail("Unknown member", 404);

    if (member.locked_until && new Date(member.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(member.locked_until).getTime() - Date.now()) / 60000);
      return fail(`Too many wrong tries. Try again in ${mins} min.`, 429);
    }

    const ok = await bcrypt.compare(body.pin, member.pin_hash);
    if (!ok) {
      const attempts = (member.failed_attempts ?? 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await db.update("members", { id: member.id }, {
        failed_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      });
      return fail(
        locked ? `Too many wrong tries. Locked for ${LOCK_MINUTES} min.` : "Wrong PIN",
        locked ? 429 : 401,
      );
    }

    await db.update("members", { id: member.id }, { failed_attempts: 0, locked_until: null });
    await createSession(member.id, member.household_id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
