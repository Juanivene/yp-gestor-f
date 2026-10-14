import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskGrid } from "@/components/task-grid";
import { requireRole } from "@/lib/auth/guards";
import { listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CompletedTasksPage() {
  const user = await requireRole("employee");
  const tasks = await listTasks({ assigneeId: user.id, onlyCompleted: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Completadas</h1>
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Todavía no completaste tareas"
          description="Cuando finalices un trabajo, queda guardado acá."
        />
      ) : (
        <TaskGrid tasks={tasks} role="employee" />
      )}
    </div>
  );
}
