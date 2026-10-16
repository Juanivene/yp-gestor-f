import { ClipboardList, SearchX } from "lucide-react";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { TaskFiltersBar } from "@/components/task-filters";
import { TaskGrid } from "@/components/task-grid";
import { parseTaskFilters } from "@/lib/task-filters";
import { listActiveEmployees, listActiveStations, listAllEmployeeOptions, listAllStations, listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTaskFilters(await searchParams);
  const hasFilters = Object.keys(filters).length > 0;

  const [tasks, employees, activeStations, allStations, employeeOptions] = await Promise.all([
    listTasks(filters),
    listActiveEmployees(),
    listActiveStations(),
    listAllStations(),
    listAllEmployeeOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tareas</h1>
        <CreateTaskDialog stations={activeStations} employees={employees} />
      </div>

      <TaskFiltersBar
        key={JSON.stringify(filters)}
        current={filters}
        resultCount={tasks.length}
        stations={allStations.map((s) => ({ id: s.id, name: s.name }))}
        employees={employeeOptions}
      />

      {tasks.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No hay tareas con esos filtros"
            description="Probá con otros criterios o limpiá los filtros para ver todas las tareas."
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
