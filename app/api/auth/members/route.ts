import { json } from "@/lib/api";
import { getSessionMember, spaceOf } from "@/lib/auth";
import { getHousehold, listMembers } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Public: used by the login screen to show who can sign in (?space=garbage for the garbage group). */
export async function GET(req: Request) {
  try {
    const space = spaceOf(req);
    const household = await getHousehold(space);
    // Someone already signed in to the other space can start/join this one without a second PIN.
    const other = await getSessionMember(space === "garbage" ? "dinner" : "garbage").catch(() => null);
    const linkable = other ? { name: other.name, color: other.color } : null;
    if (!household) return json({ setupNeeded: true, members: [], linkable });
    const members = await listMembers(household.id);
    return json({
      setupNeeded: false,
      household: household.name,
      members: members.map((m) => ({ id: m.id, name: m.name, color: m.color, isHost: m.is_host })),
      linkable: linkable && !members.some((m) => m.name.toLowerCase() === linkable.name.toLowerCase()) ? linkable : null,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not reach the database" }, 500);
  }
}
