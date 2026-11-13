import { authed, fail, json, readBody } from "@/lib/api";
import { setDone } from "@/lib/garbage";
import { UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const { date, done } = await readBody<{ date?: string; done?: boolean }>(req);
  if (typeof date !== "string" || typeof done !== "boolean") return fail("Missing date or done");
  try {
    await setDone(member, date, done);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
}, "garbage");
