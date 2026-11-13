import { authed, fail, json, readBody } from "@/lib/api";
import { setAttendance, setDiet, UserError } from "@/lib/store";

/** Body: { attending?: boolean, diet?: "veg" | "nonveg" } (at least one). */
export const POST = authed(async (req, member) => {
  const { attending, diet } = await readBody<{ attending?: unknown; diet?: unknown }>(req);
  const hasAttending = typeof attending === "boolean";
  const hasDiet = diet === "veg" || diet === "nonveg";
  if (!hasAttending && !hasDiet) return fail("Send attending and/or diet");
  if (diet !== undefined && !hasDiet) return fail("diet must be veg or nonveg");
  try {
    if (hasAttending) await setAttendance(member, attending as boolean);
    if (hasDiet) await setDiet(member, diet as "veg" | "nonveg");
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
