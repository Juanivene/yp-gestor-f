import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskGrid } from "@/components/task-grid";
import { requireRole } from "@/lib/auth/guards";
import { listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EmployeeHomePage() {
  const user = await requireRole("employee");
  const tasks = await listTasks({ assigneeId: user.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mis tareas</h1>
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Todavía no tenés tareas"
          description="Cuando te asignen un trabajo, lo vas a ver acá."
        />
      ) : (
        <TaskGrid tasks={tasks} role="employee" showActions />
      )}
    </div>
  );
}
