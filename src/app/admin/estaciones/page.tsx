import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StationDialog } from "@/components/station-dialog";
import { StationCard } from "@/components/station-card";
import { listAllStations } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  const stations = await listAllStations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Estaciones</h1>
        <StationDialog />
      </div>

      {stations.length === 0 ? (
        <EmptyState icon={Building2} title="Todavía no hay estaciones" description="Creá la primera con el botón “Nueva estación”." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {stations.map((s) => (
            <StationCard key={s.id} station={s} />
          ))}
        </div>
      )}
    </div>
  );
}
