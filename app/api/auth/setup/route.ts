import bcrypt from "bcryptjs";
import { cleanName, fail, isPin, json, readBody } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { createHousehold, getHousehold } from "@/lib/store";

/** First-run only: creates the household and the host account. */
export async function POST(req: Request) {
  try {
    if (await getHousehold()) return fail("This family is already set up", 409);
    const body = await readBody<{ householdName?: string; name?: string; pin?: string }>(req);
    const householdName = cleanName(body.householdName, 40);
    const name = cleanName(body.name);
    if (!householdName || !name) return fail("Please fill in both names");
    if (!isPin(body.pin)) return fail("PIN must be 4 digits");
    const { household, host } = await createHousehold(householdName, name, await bcrypt.hash(body.pin, 8));
    await createSession(host.id, household.id);
    return json({ ok: true, joinCode: household.join_code });
  } catch (e) {
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
