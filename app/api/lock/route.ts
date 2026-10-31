import { CATEGORY_IDS, type Category } from "@/lib/constants";
import { authed, fail, json, readBody } from "@/lib/api";
import { hostLock, unlockDay, UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const body = await readBody<{ action?: string; overrides?: Record<string, string> }>(req);
  try {
    if (body.action === "unlock") {
      await unlockDay(member);
    } else if (body.action === "lock") {
      const overrides: Partial<Record<Category, string>> = {};
      for (const c of CATEGORY_IDS) {
        const v = body.overrides?.[c];
        if (typeof v === "string") overrides[c] = v;
      }
      await hostLock(member, overrides);
    } else {
      return fail("Unknown action");
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
