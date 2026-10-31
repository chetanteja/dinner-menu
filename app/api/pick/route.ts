import { CATEGORY_IDS, type Category } from "@/lib/constants";
import { authed, fail, json, readBody } from "@/lib/api";
import { setPick, UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const { category, dishId } = await readBody<{ category?: string; dishId?: string | null }>(req);
  if (!CATEGORY_IDS.includes(category as Category)) return fail("Unknown category");
  if (dishId !== null && typeof dishId !== "string") return fail("dishId required");
  try {
    await setPick(member, category as Category, dishId ?? null);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
