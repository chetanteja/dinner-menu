import bcrypt from "bcryptjs";
import { cleanName, fail, isPin, json, readBody } from "@/lib/api";
import { createSession, getSessionMember, spaceOf } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createHousehold, getHousehold, UserError } from "@/lib/store";

/** First-run only: creates the family (or the garbage group) and the host account. */
export async function POST(req: Request) {
  try {
    const space = spaceOf(req);
    if (await getHousehold(space)) {
      return fail(space === "garbage" ? "The garbage group is already set up" : "This family is already set up", 409);
    }
    const body = await readBody<{ householdName?: string; name?: string; pin?: string; useOtherLogin?: boolean }>(req);
    const householdName = cleanName(body.householdName, 40);
    if (!householdName) return fail("Please give it a name");

    if (body.useOtherLogin) {
      const other = await getSessionMember(space === "garbage" ? "dinner" : "garbage");
      if (!other) return fail("Sign in first", 401);
      const { household, host } = await createHousehold(householdName, other.name, other.pin_hash, space);
      await getDb().update("members", { id: host.id }, { color: other.color });
      await createSession(host.id, household.id, space);
      return json({ ok: true, joinCode: household.join_code });
    }

    const name = cleanName(body.name);
    if (!name) return fail("Please fill in both names");
    if (!isPin(body.pin)) return fail("PIN must be 4 digits");
    const { household, host } = await createHousehold(householdName, name, await bcrypt.hash(body.pin, 8), space);
    await createSession(host.id, household.id, space);
    return json({ ok: true, joinCode: household.join_code });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
