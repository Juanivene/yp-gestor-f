import { Archive, SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TaskFiltersBar } from "@/components/task-filters";
import { TaskGrid } from "@/components/task-grid";
import { parseTaskFilters } from "@/lib/task-filters";
import { listAllEmployeeOptions, listAllStations, listTasks } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminArchivedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTaskFilters(await searchParams);
  const hasFilters = Object.keys(filters).length > 0;

  const [tasks, allStations, employeeOptions] = await Promise.all([
    listTasks({ ...filters, archived: true }),
    listAllStations(),
    listAllEmployeeOptions(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Archivados</h1>

      <TaskFiltersBar
        key={JSON.stringify(filters)}
        basePath="/admin/archivados"
        current={filters}
        resultCount={tasks.length}
        stations={allStations.map((s) => ({ id: s.id, name: s.name }))}
        employees={employeeOptions}
      />

      {tasks.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No hay tareas archivadas con esos filtros"
            description="Probá con otros criterios o limpiá los filtros."
          />
        ) : (
          <EmptyState
            icon={Archive}
            title="No hay tareas archivadas"
            description="Seleccioná tareas completadas en Tareas y archivalas para verlas acá."
          />
        )
      ) : (
        <TaskGrid tasks={tasks} role="admin" selectable />
      )}
    </div>
  );
}
