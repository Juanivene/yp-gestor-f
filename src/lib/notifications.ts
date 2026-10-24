import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";

export type NotificationType = (typeof notifications.$inferSelect)["type"];

export type NotificationData = {
  id: number;
  taskId: number;
  type: NotificationType;
  message: string;
  isImportant: boolean;
  isRead: boolean;
  createdAt: string;
};

export type NotificationsPayload = { items: NotificationData[]; unread: number };

const PANEL_LIMIT = 30;
export const RETENTION_DAYS = 30;

// Sirve tanto para `db` como para una transacción.
type Writer = Pick<typeof db, "insert" | "delete" | "select">;

type Draft = { taskId: number; type: NotificationType; message: string; isImportant: boolean };

export async function notifyUsers(tx: Writer, userIds: string[], draft: Draft): Promise<void> {
  if (userIds.length === 0) return;
  await tx.insert(notifications).values(userIds.map((userId) => ({ userId, ...draft })));
  // Limpieza oportunista: nadie ve algo de más de 30 días y evita un proceso programado.
  await tx.delete(notifications).where(sql`${notifications.createdAt} < now() - make_interval(days => ${RETENTION_DAYS})`);
}

export async function notifyAdmins(tx: Writer, draft: Draft): Promise<void> {
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  await notifyUsers(tx, admins.map((a) => a.id), draft);
}

export function clip(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export async function getNotifications(userId: string): Promise<NotificationsPayload> {
  const visible = and(
    eq(notifications.userId, userId),
    isNull(notifications.dismissedAt),
    sql`${notifications.createdAt} >= now() - make_interval(days => ${RETENTION_DAYS})`,
  );
  const [rows, [{ unread }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(visible)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(PANEL_LIMIT),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(visible, isNull(notifications.readAt))),
  ]);
  return {
    unread,
    items: rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      type: r.type,
      message: r.message,
      isImportant: r.isImportant,
      isRead: r.readAt !== null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
