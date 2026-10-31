import { authed, fail, json, readBody } from "@/lib/api";
import { setAttendance, UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const { attending } = await readBody<{ attending?: unknown }>(req);
  if (typeof attending !== "boolean") return fail("attending must be true or false");
  try {
    await setAttendance(member, attending);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
