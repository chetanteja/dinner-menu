import webpush from "web-push";
import { getDb } from "./db";
import type { PushSub } from "./db/types";

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Send a push notification to the given members. A silent no-op if VAPID keys aren't configured. */
export async function pushToMembers(memberIds: string[], payload: PushPayload): Promise<number> {
  if (!configure() || memberIds.length === 0) return 0;
  const db = getDb();
  let sent = 0;
  for (const memberId of memberIds) {
    const subs = await db.select<PushSub>("push_subscriptions", { member_id: memberId });
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ url: "/", ...payload }),
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.remove("push_subscriptions", { id: s.id });
        } else {
          console.error("push failed", status);
        }
      }
    }
  }
  return sent;
}
