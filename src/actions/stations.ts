"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { stations, tasks } from "@/db/schema";
import { isFailure, requireActionRole, type ActionResult } from "@/lib/auth/guards";
import { messages } from "@/lib/messages";
import { stationSchema, type StationInput } from "@/lib/validations/station";
import { fieldErrorsFrom, isUniqueViolation } from "./utils";

const refresh = () => revalidatePath("/", "layout");

const taken = {
  ok: false as const,
  error: messages.stations.nameTaken,
  fieldErrors: { name: messages.stations.nameTaken },
};

export async function createStationAction(input: StationInput): Promise<ActionResult> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;

  const parsed = stationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(sql`lower(${stations.name}) = lower(${name})`)
      .limit(1);
    if (existing) return taken;

    await db.insert(stations).values({ name });
    refresh();
    return { ok: true, data: null };
  } catch (err) {
    if (isUniqueViolation(err)) return taken;
    return { ok: false, error: messages.generic.saveError };
  }
}

export async function renameStationAction(id: number, input: StationInput): Promise<ActionResult> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;
  if (!Number.isInteger(id)) return { ok: false, error: messages.stations.notFound };

  const parsed = stationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: messages.generic.saveError, fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(and(sql`lower(${stations.name}) = lower(${name})`, ne(stations.id, id)))
      .limit(1);
    if (existing) return taken;

    const updated = await db.update(stations).set({ name }).where(eq(stations.id, id)).returning({ id: stations.id });
    if (updated.length === 0) return { ok: false, error: messages.stations.notFound };
    refresh();
    return { ok: true, data: null };
  } catch (err) {
    if (isUniqueViolation(err)) return taken;
    return { ok: false, error: messages.generic.saveError };
  }
}

export async function setStationActiveAction(id: number, isActive: boolean): Promise<ActionResult<{ name: string }>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;
  if (!Number.isInteger(id)) return { ok: false, error: messages.stations.notFound };

  try {
    const [row] = await db.update(stations).set({ isActive }).where(eq(stations.id, id)).returning({ name: stations.name });
    if (!row) return { ok: false, error: messages.stations.notFound };
    refresh();
    return { ok: true, data: { name: row.name } };
  } catch {
    return { ok: false, error: messages.generic.error };
  }
}

// Solo se puede borrar una estación sin tareas; si no, se desactiva.
export async function deleteStationAction(id: number): Promise<ActionResult<{ name: string }>> {
  const admin = await requireActionRole("admin");
  if (isFailure(admin)) return admin;
  if (!Number.isInteger(id)) return { ok: false, error: messages.stations.notFound };

  try {
    const [row] = await db
      .delete(stations)
      .where(and(eq(stations.id, id), sql`NOT EXISTS (SELECT 1 FROM ${tasks} WHERE ${tasks.stationId} = ${stations.id})`))
      .returning({ name: stations.name });
    if (!row) {
      const [exists] = await db.select({ id: stations.id }).from(stations).where(eq(stations.id, id)).limit(1);
      return { ok: false, error: exists ? messages.stations.hasTasks : messages.stations.notFound };
    }
    refresh();
    return { ok: true, data: { name: row.name } };
  } catch {
    return { ok: false, error: messages.stations.hasTasks };
  }
}
