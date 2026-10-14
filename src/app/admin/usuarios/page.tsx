import { SearchX, Users } from "lucide-react";
import { CreateUserDialog } from "@/components/create-user-dialog";
import { EmptyState } from "@/components/empty-state";
import { InactiveUsersDialog } from "@/components/inactive-users-dialog";
import { UserCard } from "@/components/user-card";
import { UserSearch } from "@/components/user-search";
import { listEmployees } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const search = (q ?? "").trim().slice(0, 100);
  const employees = await listEmployees({ active: true, search });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <div className="flex flex-wrap gap-2">
          <InactiveUsersDialog />
          <CreateUserDialog />
        </div>
      </div>

      <UserSearch key={search} current={search} resultCount={employees.length} />

      {employees.length === 0 ? (
        search ? (
          <EmptyState icon={SearchX} title="No encontramos empleados" description="Probá con otro nombre o limpiá la búsqueda." />
        ) : (
          <EmptyState icon={Users} title="Todavía no hay empleados" description="Creá el primero con el botón “Crear empleado”." />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {employees.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
