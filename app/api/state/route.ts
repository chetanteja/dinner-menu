import { authed, json } from "@/lib/api";
import { buildState } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = authed(async (_req, member) => json(await buildState(member)));
