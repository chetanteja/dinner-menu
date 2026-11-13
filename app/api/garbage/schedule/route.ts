import { authed, fail, json, readBody } from "@/lib/api";
import { setSchedule } from "@/lib/garbage";
import { UserError } from "@/lib/store";

/** Set or reset the every-other-day pattern: `anchor` is a pickup day. */
export const POST = authed(async (req, member) => {
  const { anchor } = await readBody<{ anchor?: string }>(req);
  if (typeof anchor !== "string") return fail("Pick a date");
  try {
    await setSchedule(member, anchor);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
}, "garbage");
