import { createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "session";

// La vigencia real la decide la base (sessions.expires_at). La cookie dura más
// para poder renovar la sesión sin reescribirla desde un Server Component.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  position: string;
  role: "admin" | "employee";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

function ttlMs(): number {
  return getEnv().SESSION_TTL_HOURS * 60 * 60 * 1000;
}

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + ttlMs()),
  });
  // Limpieza oportunista de sesiones vencidas.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: getEnv().NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export async function destroyUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function hasSessionCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(SESSION_COOKIE)?.value);
}

// Valida la sesión contra la base. Devuelve null si no hay sesión, venció o el
// usuario está inactivo. Renueva la sesión si le queda menos de la mitad.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      position: users.position,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() <= now || !row.isActive) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  const ttl = ttlMs();
  if (row.expiresAt.getTime() - now < ttl / 2) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now + ttl) })
      .where(and(eq(sessions.id, sessionId)));
  }

  return {
    id: row.id,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    position: row.position,
    role: row.role,
  };
});
