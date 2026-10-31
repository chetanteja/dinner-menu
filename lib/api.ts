import { NextResponse } from "next/server";
import { getSessionMember } from "./auth";
import type { Member } from "./db/types";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => json({ error: message }, status);

type Handler = (req: Request, member: Member, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Wrap a route handler so it requires a signed-in member and never leaks stack traces. */
export function authed(handler: Handler) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const member = await getSessionMember();
      if (!member) return fail("Not signed in", 401);
      return await handler(req, member, ctx);
    } catch (e) {
      console.error(e);
      return fail("Something went wrong", 500);
    }
  };
}

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const isPin = (v: unknown): v is string => typeof v === "string" && /^\d{4}$/.test(v);

export const cleanName = (v: unknown, max = 24): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
