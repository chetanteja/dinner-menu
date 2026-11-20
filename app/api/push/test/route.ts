import { authed, json } from "@/lib/api";
import { spaceOf } from "@/lib/auth";
import { pushToMembers } from "@/lib/push";

/** Sends a notification to the signed-in account's own devices so they can check it works. */
export const POST = authed(async (req, member) => {
  const garbage = spaceOf(req) === "garbage";
  const sent = await pushToMembers([member.id], {
    title: garbage ? "Garbage Day test 🗑️" : "Dinner Menu test 🍽️",
    body: "It works! You'll get reminders here.",
    tag: "test",
    url: garbage ? "/garbage" : "/",
    ...(garbage ? { icon: "/pwa-icon/192?k=garbage" } : {}),
  });
  return json({ ok: true, sent });
}, "query");
