import { authed, json } from "@/lib/api";
import { buildGarbageState } from "@/lib/garbage";

export const dynamic = "force-dynamic";

export const GET = authed(async (_req, member) => json(await buildGarbageState(member)), "garbage");
