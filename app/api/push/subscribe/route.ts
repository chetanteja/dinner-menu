import { randomUUID } from "crypto";
import { authed, fail, json, readBody } from "@/lib/api";
import { getDb } from "@/lib/db";

interface SubBody {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
}

export const POST = authed(async (req, member) => {
  const { subscription: s } = await readBody<SubBody>(req);
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) return fail("Invalid subscription");
  const db = getDb();
  await db.remove("push_subscriptions", { endpoint: s.endpoint });
  await db.insert("push_subscriptions", {
    id: randomUUID(),
    member_id: member.id,
    endpoint: s.endpoint,
    p256dh: s.keys.p256dh,
    auth: s.keys.auth,
    created_at: new Date().toISOString(),
  });
  return json({ ok: true });
});

export const DELETE = authed(async (req) => {
  const { endpoint } = await readBody<{ endpoint?: string }>(req);
  if (endpoint) await getDb().remove("push_subscriptions", { endpoint });
  return json({ ok: true });
});
