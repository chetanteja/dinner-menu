import { CATEGORY_IDS, type Category } from "@/lib/constants";
import { authed, cleanName, fail, json, readBody } from "@/lib/api";
import { addDish, hideDish, UserError } from "@/lib/store";

export const POST = authed(async (req, member) => {
  const body = await readBody<{ category?: string; name?: string; emoji?: string }>(req);
  if (!CATEGORY_IDS.includes(body.category as Category)) return fail("Unknown category");
  const name = cleanName(body.name, 40);
  if (name.length < 2) return fail("Give the dish a name");
  const emoji = typeof body.emoji === "string" ? [...body.emoji].slice(0, 2).join("") : undefined;
  const dish = await addDish(member, body.category as Category, name, emoji);
  return json({ id: dish.id, category: dish.category, name: dish.name, emoji: dish.emoji });
});

export const DELETE = authed(async (req, member) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("id required");
  try {
    await hideDish(member, id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    throw e;
  }
});
