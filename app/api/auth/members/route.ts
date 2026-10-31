import { json } from "@/lib/api";
import { getHousehold, listMembers } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Public: used by the login screen to show who can sign in. */
export async function GET() {
  try {
    const household = await getHousehold();
    if (!household) return json({ setupNeeded: true, members: [] });
    const members = await listMembers(household.id);
    return json({
      setupNeeded: false,
      household: household.name,
      members: members.map((m) => ({ id: m.id, name: m.name, color: m.color, isHost: m.is_host })),
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not reach the database" }, 500);
  }
}
