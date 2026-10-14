"use server";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { homeFor, type ActionResult } from "@/lib/auth/guards";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { clearFailures, isRateLimited, registerFailure } from "@/lib/auth/rate-limit";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { messages } from "@/lib/messages";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { fieldErrorsFrom } from "./utils";

export async function loginAction(input: LoginInput): Promise<ActionResult<{ name: string; redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.auth.invalid, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const username = parsed.data.username.toLowerCase();
  const { password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = `${username}|${ip}`;
  if (isRateLimited(key)) return { ok: false, error: messages.auth.tooMany };

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username}`)
      .limit(1);

    const valid = user ? await verifyPassword(user.passwordHash, password) : await verifyAgainstDummy(password);
    if (!user || !valid || !user.isActive) {
      registerFailure(key);
      return { ok: false, error: messages.auth.invalid };
    }

    clearFailures(key);
    await createSession(user.id);
    return { ok: true, data: { name: user.firstName, redirectTo: homeFor(user.role) } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await destroyCurrentSession();
  } catch {
    return { ok: false, error: messages.generic.error };
  }
  return { ok: true, data: null };
}
