import { ClipboardList, SearchX } from "lucide-react";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { IncidentSearch } from "@/components/incident-search";
import { TaskGrid } from "@/components/task-grid";
import { listActiveEmployees, listActiveStations, listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<{ incidencia?: string }> }) {
  const { incidencia } = await searchParams;
  const parsed = incidencia ? Number.parseInt(incidencia, 10) : NaN;
  const incident = Number.isInteger(parsed) && parsed > 0 && parsed <= 2147483647 ? parsed : null;

  const [tasks, employees, stations] = await Promise.all([
    listTasks({ incident: incident ?? undefined }),
    listActiveEmployees(),
    listActiveStations(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tareas</h1>
        <CreateTaskDialog stations={stations} employees={employees} />
      </div>

      <IncidentSearch key={incident ?? "all"} current={incident} resultCount={tasks.length} />

      {tasks.length === 0 ? (
        incident !== null ? (
          <EmptyState
            icon={SearchX}
            title={`No hay tareas con la incidencia #${incident}`}
            description="Revisá el número o limpiá los filtros para ver todas las tareas."
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay tareas"
            description="Creá la primera con el botón “Nueva tarea”."
          />
        )
      ) : (
        <TaskGrid tasks={tasks} role="admin" employees={employees} />
      )}
    </div>
  );
}
