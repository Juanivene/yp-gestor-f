import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskGrid } from "@/components/task-grid";
import { requireRole } from "@/lib/auth/guards";
import { listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchivedTasksPage() {
  const user = await requireRole("employee");
  const tasks = await listTasks({ assigneeId: user.id, archived: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Archivadas</h1>
      {tasks.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No tenés tareas archivadas"
          description="Las tareas que archives después de finalizarlas quedan guardadas acá."
        />
      ) : (
        <TaskGrid tasks={tasks} role="employee" selectable />
      )}
    </div>
  );
}
