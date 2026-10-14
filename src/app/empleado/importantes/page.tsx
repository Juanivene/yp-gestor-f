import { Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskGrid } from "@/components/task-grid";
import { requireRole } from "@/lib/auth/guards";
import { listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ImportantTasksPage() {
  const user = await requireRole("employee");
  const tasks = await listTasks({ assigneeId: user.id, onlyImportant: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Importantes</h1>
      <p className="-mt-4 text-sm text-muted-foreground">Las tareas que tienen número de incidencia.</p>
      {tasks.length === 0 ? (
        <EmptyState icon={Star} title="No tenés tareas importantes" description="Acá aparecen las que tienen número de incidencia." />
      ) : (
        <TaskGrid tasks={tasks} role="employee" />
      )}
    </div>
  );
}
