"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stations, taskAssignees, taskNotes, tasks, users } from "@/db/schema";
import { isFailure, requireActionRole, type ActionResult } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { messages } from "@/lib/messages";
import { getTaskDetail, type NoteData, type TaskDetailData } from "@/lib/queries";
import {
  createTaskSchema,
  noteSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/validations/task";
import { fieldErrorsFrom } from "./utils";

const refresh = () => revalidatePath("/", "layout");

export async function getTaskDetailAction(taskId: number): Promise<ActionResult<TaskDetailData>> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expirada=1");
  if (!Number.isInteger(taskId)) return { ok: false, error: messages.tasks.notFound };
  try {
    const detail = await getTaskDetail(taskId, user.role === "employee" ? user.id : undefined);
    if (!detail) return { ok: false, error: messages.tasks.notFound };
    return { ok: true, data: detail };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

// Solo se pueden asignar empleados activos (o los que ya estaban asignados, al editar).
async function validateAssignees(ids: string[], keepIds: string[] = []): Promise<boolean> {
  const rows = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.role, "employee")));
  if (rows.length !== ids.length) return false;
  return rows.every((r) => r.isActive || keepIds.includes(r.id));
}

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult<{ id: number }>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    const [station] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(and(eq(stations.id, d.stationId), eq(stations.isActive, true)))
      .limit(1);
    if (!station) {
      return { ok: false, error: messages.generic.saveError, fieldErrors: { stationId: "Elegí una estación válida" } };
    }

    if (!(await validateAssignees(d.assigneeIds))) {
      return { ok: false, error: messages.generic.saveError, fieldErrors: { assigneeIds: "Elegí solo empleados activos" } };
    }

    const id = await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(tasks)
        .values({
          stationId: d.stationId,
          incidentNumber: d.incidentNumber,
          description: d.description,
          location: d.location,
          estimatedHours: String(d.estimatedHours),
          createdBy: admin.id,
        })
        .returning({ id: tasks.id });
      await tx.insert(taskAssignees).values(d.assigneeIds.map((userId) => ({ taskId: task.id, userId })));
      return task.id;
    });
    refresh();
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, error: messages.generic.saveError };
  }
}

export async function updateTaskAction(taskId: number, input: UpdateTaskInput): Promise<ActionResult> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const d = parsed.data;

  try {
    const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return { ok: false, error: messages.tasks.notFound };

    const current = await db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, taskId));
    if (
      !(await validateAssignees(
        d.assigneeIds,
        current.map((c) => c.userId),
      ))
    ) {
      return { ok: false, error: messages.generic.saveError, fieldErrors: { assigneeIds: "Elegí solo empleados activos" } };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ description: d.description, location: d.location, updatedAt: sql`now()` })
        .where(eq(tasks.id, taskId));
      await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      await tx.insert(taskAssignees).values(d.assigneeIds.map((userId) => ({ taskId, userId })));
    });
    refresh();
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: messages.generic.saveError };
  }
}

const assignedTo = (taskId: number, userId: string) =>
  sql`EXISTS (SELECT 1 FROM ${taskAssignees} WHERE ${taskAssignees.taskId} = ${taskId} AND ${taskAssignees.userId} = ${userId})`;

export async function startTaskAction(taskId: number): Promise<ActionResult> {
  const user = await requireActionRole("employee");
  if (isFailure(user)) return user;
  if (!Number.isInteger(taskId)) return { ok: false, error: messages.tasks.notFound };

  try {
    // Transición atómica y condicional: solo avanza si sigue pendiente y el usuario está asignado.
    const updated = await db
      .update(tasks)
      .set({ status: "in_progress", startedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending"), assignedTo(taskId, user.id)))
      .returning({ id: tasks.id });

    if (updated.length === 0) {
      const [row] = await db
        .select({ status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), assignedTo(taskId, user.id)))
        .limit(1);
      refresh();
      if (!row) return { ok: false, error: messages.tasks.notFound };
      return { ok: false, error: messages.tasks.alreadyStarted };
    }
    refresh();
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function finishTaskAction(taskId: number): Promise<ActionResult<{ onTime: boolean }>> {
  const user = await requireActionRole("employee");
  if (isFailure(user)) return user;
  if (!Number.isInteger(taskId)) return { ok: false, error: messages.tasks.notFound };

  try {
    const updated = await db
      .update(tasks)
      .set({
        status: "completed",
        finishedAt: sql`now()`,
        onTime: sql`(now() - ${tasks.startedAt}) <= (${tasks.estimatedHours} * interval '1 hour')`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.status, "in_progress"), assignedTo(taskId, user.id)))
      .returning({ onTime: tasks.onTime });

    if (updated.length === 0) {
      const [row] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), assignedTo(taskId, user.id)))
        .limit(1);
      refresh();
      if (!row) return { ok: false, error: messages.tasks.notFound };
      return { ok: false, error: messages.tasks.notFinishable };
    }
    refresh();
    return { ok: true, data: { onTime: updated[0].onTime === true } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

export async function addNoteAction(taskId: number, input: { body: string }): Promise<ActionResult<NoteData>> {
  const user = await requireActionRole("employee");
  if (isFailure(user)) return user;

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  if (!Number.isInteger(taskId)) return { ok: false, error: messages.tasks.notFound };

  try {
    const [task] = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), assignedTo(taskId, user.id)))
      .limit(1);
    if (!task) return { ok: false, error: messages.tasks.notFound };
    if (task.status === "pending") return { ok: false, error: messages.tasks.noteNotAllowed };

    const [note] = await db
      .insert(taskNotes)
      .values({ taskId, authorId: user.id, body: parsed.data.body })
      .returning();
    refresh();
    return {
      ok: true,
      data: {
        id: note.id,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        authorName: `${user.firstName} ${user.lastName}`,
      },
    };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}
