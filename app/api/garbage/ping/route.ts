import { authed, fail, json } from "@/lib/api";
import { pingGarbage } from "@/lib/garbage";
import { UserError } from "@/lib/store";

export const POST = authed(async (_req, member) => {
  try {
    return json({ ok: true, ...(await pingGarbage(member)) });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
}, "garbage");
