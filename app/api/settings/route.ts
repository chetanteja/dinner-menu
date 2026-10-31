import { authed, fail, json, readBody } from "@/lib/api";
import { updateSettings, UserError } from "@/lib/store";
import { hhmmToSeconds, isValidHHMM } from "@/lib/time";

export const POST = authed(async (req, member) => {
  const { remindTime, lockTime } = await readBody<{ remindTime?: unknown; lockTime?: unknown }>(req);
  if (!isValidHHMM(remindTime) || !isValidHHMM(lockTime)) return fail("Use HH:MM times");
  if (hhmmToSeconds(remindTime) >= hhmmToSeconds(lockTime)) return fail("The reminder must come before the lock time");
  try {
    await updateSettings(member, remindTime, lockTime);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
