import { authed, fail, json, readBody } from "@/lib/api";
import { assign } from "@/lib/garbage";
import { UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const { date, memberId } = await readBody<{ date?: string; memberId?: string | null }>(req);
  if (typeof date !== "string") return fail("Pick a day");
  if (memberId !== null && typeof memberId !== "string") return fail("Pick a person");
  try {
    await assign(member, date, memberId);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
}, "garbage");
