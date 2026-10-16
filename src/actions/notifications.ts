"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

async function userId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expirada=1");
  return user.id;
}

const mine = (uid: string, id: number) => and(eq(notifications.id, id), eq(notifications.userId, uid));

export async function markNotificationReadAction(id: number): Promise<void> {
  const uid = await userId();
  if (!Number.isInteger(id)) return;
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(mine(uid, id), isNull(notifications.readAt)));
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const uid = await userId();
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, uid), isNull(notifications.readAt)));
}

// Descartar = ocultar del panel; también cuenta como vista.
export async function dismissNotificationAction(id: number): Promise<void> {
  const uid = await userId();
  if (!Number.isInteger(id)) return;
  await db
    .update(notifications)
    .set({ dismissedAt: sql`now()`, readAt: sql`coalesce(${notifications.readAt}, now())` })
    .where(mine(uid, id));
}

export async function dismissAllNotificationsAction(): Promise<void> {
  const uid = await userId();
  await db
    .update(notifications)
    .set({ dismissedAt: sql`now()`, readAt: sql`coalesce(${notifications.readAt}, now())` })
    .where(and(eq(notifications.userId, uid), isNull(notifications.dismissedAt)));
}
