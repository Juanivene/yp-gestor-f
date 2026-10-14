import { and, asc, desc, eq, exists, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { stations, taskAssignees, taskNotes, tasks, users } from "@/db/schema";

export type TaskStatus = "pending" | "in_progress" | "completed";

export type AssigneeInfo = { id: string; firstName: string; lastName: string; isActive: boolean };

export type TaskCardData = {
  id: number;
  stationId: number;
  stationName: string;
  incidentNumber: number | null;
  description: string;
  location: string;
  estimatedHours: string;
  status: TaskStatus;
  onTime: boolean | null;
  assignees: AssigneeInfo[];
};

export type NoteData = {
  id: number;
  body: string;
  createdAt: string;
  authorName: string;
};

export type TaskDetailData = TaskCardData & {
  startedAt: string | null;
  finishedAt: string | null;
  notes: NoteData[];
};

export type TaskFilters = {
  assigneeId?: string;
  onlyImportant?: boolean;
  onlyCompleted?: boolean;
  incident?: number;
};

const statusRank = sql`CASE ${tasks.status} WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END`;

async function attachAssignees<T extends { id: number }>(rows: T[]): Promise<(T & { assignees: AssigneeInfo[] })[]> {
  if (rows.length === 0) return [];
  const list = await db
    .select({
      taskId: taskAssignees.taskId,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .where(inArray(taskAssignees.taskId, rows.map((r) => r.id)))
    .orderBy(asc(users.firstName), asc(users.lastName));

  const byTask = new Map<number, AssigneeInfo[]>();
  for (const a of list) {
    const arr = byTask.get(a.taskId) ?? [];
    arr.push({ id: a.id, firstName: a.firstName, lastName: a.lastName, isActive: a.isActive });
    byTask.set(a.taskId, arr);
  }
  return rows.map((r) => ({ ...r, assignees: byTask.get(r.id) ?? [] }));
}

const taskColumns = {
  id: tasks.id,
  stationId: tasks.stationId,
  stationName: stations.name,
  incidentNumber: tasks.incidentNumber,
  description: tasks.description,
  location: tasks.location,
  estimatedHours: tasks.estimatedHours,
  status: tasks.status,
  onTime: tasks.onTime,
  startedAt: tasks.startedAt,
  finishedAt: tasks.finishedAt,
};

function isAssignedTo(userId: string): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, tasks.id), eq(taskAssignees.userId, userId))),
  );
}

export async function listTasks(filters: TaskFilters = {}): Promise<TaskCardData[]> {
  const conditions: SQL[] = [];
  if (filters.assigneeId) conditions.push(isAssignedTo(filters.assigneeId));
  if (filters.onlyImportant) conditions.push(isNotNull(tasks.incidentNumber));
  if (filters.onlyCompleted) conditions.push(eq(tasks.status, "completed"));
  if (filters.incident !== undefined) conditions.push(eq(tasks.incidentNumber, filters.incident));

  const rows = await db
    .select(taskColumns)
    .from(tasks)
    .innerJoin(stations, eq(stations.id, tasks.stationId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(statusRank, desc(tasks.createdAt), desc(tasks.id));

  return attachAssignees(
    rows.map((r) => ({
      id: r.id,
      stationId: r.stationId,
      stationName: r.stationName,
      incidentNumber: r.incidentNumber,
      description: r.description,
      location: r.location,
      estimatedHours: r.estimatedHours,
      status: r.status,
      onTime: r.onTime,
    })),
  );
}

// Si se pasa userId, solo devuelve la tarea cuando ese usuario está asignado.
export async function getTaskDetail(taskId: number, userId?: string): Promise<TaskDetailData | null> {
  const [row] = await db
    .select(taskColumns)
    .from(tasks)
    .innerJoin(stations, eq(stations.id, tasks.stationId))
    .where(and(eq(tasks.id, taskId), userId ? isAssignedTo(userId) : undefined))
    .limit(1);
  if (!row) return null;

  const [withAssignees] = await attachAssignees([row]);
  const notes = await db
    .select({
      id: taskNotes.id,
      body: taskNotes.body,
      createdAt: taskNotes.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(taskNotes)
    .innerJoin(users, eq(users.id, taskNotes.authorId))
    .where(eq(taskNotes.taskId, taskId))
    .orderBy(asc(taskNotes.createdAt), asc(taskNotes.id));

  return {
    ...withAssignees,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      authorName: `${n.firstName} ${n.lastName}`,
    })),
  };
}

export type EmployeeOption = { id: string; firstName: string; lastName: string };

export function listActiveEmployees(): Promise<EmployeeOption[]> {
  return db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(and(eq(users.role, "employee"), eq(users.isActive, true)))
    .orderBy(asc(users.firstName), asc(users.lastName));
}

export function listActiveStations() {
  return db
    .select({ id: stations.id, name: stations.name })
    .from(stations)
    .where(eq(stations.isActive, true))
    .orderBy(asc(stations.id));
}

export type UserCardData = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  position: string;
  deactivatedAt: string | null;
};

const userColumns = {
  id: users.id,
  username: users.username,
  firstName: users.firstName,
  lastName: users.lastName,
  position: users.position,
  deactivatedAt: users.deactivatedAt,
};

function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

export async function listEmployees(opts: { active: boolean; search?: string }): Promise<UserCardData[]> {
  const conditions: SQL[] = [eq(users.role, "employee"), eq(users.isActive, opts.active)];
  const term = opts.search ? normalizeTerm(opts.search) : "";
  if (term) {
    const pattern = `%${term.replace(/[\%_]/g, "\$&")}%`;
    conditions.push(
      sql`unaccent(lower(${users.firstName} || ' ' || ${users.lastName})) LIKE unaccent(lower(${pattern}))`,
    );
  }
  const rows = await db
    .select(userColumns)
    .from(users)
    .where(and(...conditions))
    .orderBy(opts.active ? asc(users.firstName) : desc(users.deactivatedAt), asc(users.lastName));
  return rows.map((r) => ({ ...r, deactivatedAt: r.deactivatedAt?.toISOString() ?? null }));
}
