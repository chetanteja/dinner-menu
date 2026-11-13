import bcrypt from "bcryptjs";
import { cleanName, fail, isPin, json, readBody } from "@/lib/api";
import { createSession, getSessionMember, spaceOf } from "@/lib/auth";
import { getHousehold, joinHousehold, linkMember, UserError } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const space = spaceOf(req);
    const household = await getHousehold(space);
    if (!household) return fail("Nothing to join yet", 404);
    const body = await readBody<{ code?: string; name?: string; pin?: string; useOtherLogin?: boolean }>(req);
    if (String(body.code ?? "").trim().toUpperCase() !== household.join_code) {
      return fail("That invite code isn't right", 403);
    }

    if (body.useOtherLogin) {
      const other = await getSessionMember(space === "garbage" ? "dinner" : "garbage");
      if (!other) return fail("Sign in first", 401);
      const member = await linkMember(household, other, false);
      await createSession(member.id, household.id, space);
      return json({ ok: true });
    }

    const name = cleanName(body.name);
    if (!name) return fail("Please enter your name");
    if (!isPin(body.pin)) return fail("PIN must be 4 digits");
    const member = await joinHousehold(household, name, await bcrypt.hash(body.pin, 8));
    await createSession(member.id, household.id, space);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
