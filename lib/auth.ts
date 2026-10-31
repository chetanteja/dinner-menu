import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { Member } from "./db/types";

const COOKIE = "dm_session";
const MAX_AGE = 60 * 60 * 24 * 180;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.VERCEL) throw new Error("SESSION_SECRET must be set on Vercel.");
    return new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(memberId: string, householdId: string) {
  const token = await new SignJWT({ mid: memberId, hid: householdId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const [member] = await getDb().select<Member>("members", {
      id: payload.mid as string,
      household_id: payload.hid as string,
    });
    return member ?? null;
  } catch {
    return null;
  }
}
