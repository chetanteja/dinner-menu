import { authed, fail, json, readBody } from "@/lib/api";
import { updateGarbageSettings } from "@/lib/garbage";
import { UserError } from "@/lib/store";
import { isValidHHMM } from "@/lib/time";

export const POST = authed(async (req, member) => {
  const { remindTime } = await readBody<{ remindTime?: unknown }>(req);
  if (!isValidHHMM(remindTime)) return fail("Use an HH:MM time");
  try {
    await updateGarbageSettings(member, remindTime);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
}, "garbage");
