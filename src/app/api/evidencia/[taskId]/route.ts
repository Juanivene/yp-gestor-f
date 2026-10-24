import { and, eq, exists } from "drizzle-orm";
import { db } from "@/db";
import { taskAssignees, taskEvidence } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

// La foto solo la ve un admin o un empleado asignado a la tarea.
export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const taskId = Number((await params).taskId);
  if (!Number.isInteger(taskId)) return new Response(null, { status: 404 });

  const [row] = await db
    .select({ photo: taskEvidence.photo, mimeType: taskEvidence.mimeType })
    .from(taskEvidence)
    .where(
      and(
        eq(taskEvidence.taskId, taskId),
        user.role === "employee"
          ? exists(
              db
                .select({ one: taskAssignees.taskId })
                .from(taskAssignees)
                .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, user.id))),
            )
          : undefined,
      ),
    )
    .limit(1);
  if (!row) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(row.photo), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
