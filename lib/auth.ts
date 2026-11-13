import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { Member } from "./db/types";

export type Space = "dinner" | "garbage";

/** Each space has its own cookie, so one phone can be signed in to both at once. */
const COOKIE: Record<Space, string> = { dinner: "dm_session", garbage: "gb_session" };
const MAX_AGE = 60 * 60 * 24 * 180;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.VERCEL) throw new Error("SESSION_SECRET must be set on Vercel.");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

export function spaceOf(req: Request): Space {
  return new URL(req.url).searchParams.get("space") === "garbage" ? "garbage" : "dinner";
}

export async function createSession(memberId: string, householdId: string, space: Space = "dinner") {
  const token = await new SignJWT({ mid: memberId, hid: householdId, sp: space })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE[space], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(space: Space = "dinner") {
  (await cookies()).delete(COOKIE[space]);
}

export async function getSessionMember(space: Space = "dinner"): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE[space])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Tokens issued before garbage existed have no "sp" and are dinner sessions.
    if (((payload.sp as Space | undefined) ?? "dinner") !== space) return null;
    const [member] = await getDb().select<Member>("members", {
      id: payload.mid as string,
      household_id: payload.hid as string,
    });
    return member ?? null;
  } catch {
    return null;
  }
}
