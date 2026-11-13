import { json } from "@/lib/api";
import { clearSession, spaceOf } from "@/lib/auth";

export async function POST(req: Request) {
  await clearSession(spaceOf(req));
  return json({ ok: true });
}
