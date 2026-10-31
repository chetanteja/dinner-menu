import bcrypt from "bcryptjs";
import { cleanName, fail, isPin, json, readBody } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { getHousehold, joinHousehold, UserError } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const household = await getHousehold();
    if (!household) return fail("Nothing to join yet", 404);
    const body = await readBody<{ code?: string; name?: string; pin?: string }>(req);
    if (String(body.code ?? "").trim().toUpperCase() !== household.join_code) {
      return fail("That invite code isn't right", 403);
    }
    const name = cleanName(body.name);
    if (!name) return fail("Please enter your name");
    if (!isPin(body.pin)) return fail("PIN must be 4 digits");
    const member = await joinHousehold(household, name, await bcrypt.hash(body.pin, 8));
    await createSession(member.id, household.id);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
