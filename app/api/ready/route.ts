import { authed, fail, json } from "@/lib/api";
import { announceReady, UserError } from "@/lib/store";

/** "Food is ready!" ping to everyone who is eating tonight. */
export const POST = authed(async (_req, member) => {
  try {
    await announceReady(member);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
