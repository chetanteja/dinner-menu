import { authed, json } from "@/lib/api";
import { buildHistory } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = authed(async (_req, member) => json(await buildHistory(member.household_id)));
