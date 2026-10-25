"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isFailure, requireActionRole, type ActionResult } from "@/lib/auth/guards";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyUserSessions, getCurrentUser } from "@/lib/auth/session";
import { messages } from "@/lib/messages";
import { listEmployees, type UserCardData } from "@/lib/queries";
import {
  changeOwnPasswordSchema,
  createUserSchema,
  setPasswordSchema,
  type ChangeOwnPasswordInput,
  type CreateUserInput,
  type SetPasswordInput,
} from "@/lib/validations/user";
import { fieldErrorsFrom, isUniqueViolation } from "./utils";

const refresh = () => revalidatePath("/", "layout");

type Credentials = { username: string; password: string; name: string };

export async function createUserAction(input: CreateUserInput): Promise<ActionResult<Credentials>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;
  const username = d.username.toLowerCase();
  const taken = {
    ok: false as const,
    error: messages.users.usernameTaken,
    fieldErrors: { username: messages.users.usernameTaken },
  };

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = ${username}`)
      .limit(1);
    if (existing) return taken;

    await db.insert(users).values({
      username,
      passwordHash: await hashPassword(d.password),
      firstName: d.firstName,
      lastName: d.lastName,
      position: d.position || "Operario",
      role: "employee",
    });
    refresh();
    return { ok: true, data: { username, password: d.password, name: `${d.firstName} ${d.lastName}` } };
  } catch (err) {
    if (isUniqueViolation(err)) return taken;
    return { ok: false, error: messages.generic.saveError };
  }
}

export async function resetPasswordAction(userId: string): Promise<ActionResult<Credentials>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  try {
    const [target] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, "employee")))
      .limit(1);
    if (!target) return { ok: false, error: messages.users.notFound };

    const password = generatePassword(10);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: sql`now()` })
      .where(eq(users.id, target.id));
    await destroyUserSessions(target.id);
    refresh();
    return { ok: true, data: { username: target.username, password, name: `${target.firstName} ${target.lastName}` } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function setUserPasswordAction(
  userId: string,
  input: SetPasswordInput,
): Promise<ActionResult<{ name: string }>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: sql`now()` })
      .where(and(eq(users.id, userId), eq(users.role, "employee")))
      .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName });
    if (!updated) return { ok: false, error: messages.users.notFound };

    await destroyUserSessions(updated.id);
    refresh();
    return { ok: true, data: { name: `${updated.firstName} ${updated.lastName}` } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function changeOwnPasswordAction(input: ChangeOwnPasswordInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expirada=1");

  const parsed = changeOwnPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!row || !(await verifyPassword(row.passwordHash, currentPassword))) {
      return {
        ok: false,
        error: messages.users.passwordWrong,
        fieldErrors: { currentPassword: messages.users.passwordWrong },
      };
    }
    if (currentPassword === newPassword) {
      return {
        ok: false,
        error: messages.users.passwordSame,
        fieldErrors: { newPassword: messages.users.passwordSame },
      };
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: sql`now()` })
      .where(eq(users.id, user.id));
    // Cierra las sesiones en otros dispositivos y mantiene abierta la actual.
    await destroyUserSessions(user.id);
    await createSession(user.id);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function deactivateUserAction(userId: string): Promise<ActionResult<{ name: string }>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  try {
    const [updated] = await db
      .update(users)
      .set({ isActive: false, deactivatedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(users.id, userId), eq(users.role, "employee"), eq(users.isActive, true)))
      .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName });
    if (!updated) return { ok: false, error: messages.users.notFound };

    await destroyUserSessions(updated.id);
    refresh();
    return { ok: true, data: { name: `${updated.firstName} ${updated.lastName}` } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function listInactiveUsersAction(): Promise<ActionResult<UserCardData[]>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;
  try {
    return { ok: true, data: await listEmployees({ active: false }) };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}
