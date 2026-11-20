import { randomUUID } from "crypto";
import { fail, json, readBody } from "@/lib/api";
import { getSessionMember } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Member, PushSub } from "@/lib/db/types";

interface SubBody {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
}

/** Everyone this phone is signed in as right now: the dinner member and/or the garbage member. */
async function signedInMembers(): Promise<Member[]> {
  const found = await Promise.all([getSessionMember("dinner"), getSessionMember("garbage")]);
  return found.filter((m): m is Member => !!m);
}

async function attach(member: Member, s: { endpoint: string; p256dh: string; auth: string }) {
  const db = getDb();
  // Release the endpoint from the same member (re-subscribe) and from other members of the SAME space
  // (someone else used to sign in on this phone). Keep it for members of the other space.
  const existing = await db.select<PushSub>("push_subscriptions", { endpoint: s.endpoint });
  for (const sub of existing) {
    if (sub.member_id === member.id) {
      await db.remove("push_subscriptions", { id: sub.id });
      continue;
    }
    const [other] = await db.select<Member>("members", { id: sub.member_id });
    if (!other || other.household_id === member.household_id) await db.remove("push_subscriptions", { id: sub.id });
  }
  await db.insert("push_subscriptions", {
    id: randomUUID(),
    member_id: member.id,
    endpoint: s.endpoint,
    p256dh: s.p256dh,
    auth: s.auth,
    created_at: new Date().toISOString(),
  });
}

/**
 * One phone has one push subscription for the whole site, so register it for every account that is
 * signed in on this phone (dinner and garbage). Registering from either app is enough: you no longer
 * have to open the garbage page for garbage notifications to reach you.
 */
export async function POST(req: Request) {
  try {
    const members = await signedInMembers();
    if (members.length === 0) return fail("Not signed in", 401);
    const { subscription: s } = await readBody<SubBody>(req);
    if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) return fail("Invalid subscription");
    for (const m of members) await attach(m, { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Something went wrong", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const members = await signedInMembers();
    if (members.length === 0) return fail("Not signed in", 401);
    const { endpoint } = await readBody<{ endpoint?: string }>(req);
    if (endpoint) {
      for (const m of members) await getDb().remove("push_subscriptions", { endpoint, member_id: m.id });
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail("Something went wrong", 500);
  }
}
