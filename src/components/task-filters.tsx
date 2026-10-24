"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Combobox, type ComboOption } from "@/components/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskFilters } from "@/lib/queries";
import { filtersToQuery } from "@/lib/task-filters";

const ALL = "all";

type Draft = {
  text: string;
  incident: string;
  status: string;
  stationId: string;
  assigneeId: string;
  punctuality: string;
  evidence: string;
  createdFrom: string;
  createdTo: string;
  sort: string;
};

function toDraft(f: TaskFilters): Draft {
  return {
    text: f.text ?? "",
    incident: f.incident?.toString() ?? "",
    status: f.status ?? ALL,
    stationId: f.stationId?.toString() ?? ALL,
    assigneeId: f.assigneeId ?? ALL,
    punctuality: f.punctuality ?? ALL,
    evidence: f.evidence ?? ALL,
    createdFrom: f.createdFrom ?? "",
    createdTo: f.createdTo ?? "",
    sort: f.sort ?? ALL,
  };
}

function fromDraft(d: Draft): TaskFilters {
  const f: TaskFilters = {};
  const incident = Number.parseInt(d.incident, 10);
  if (d.text.trim()) f.text = d.text.trim();
  if (Number.isInteger(incident) && incident > 0) f.incident = incident;
  if (d.status !== ALL) f.status = d.status as TaskFilters["status"];
  if (d.stationId !== ALL) f.stationId = Number(d.stationId);
  if (d.assigneeId !== ALL) f.assigneeId = d.assigneeId;
  if (d.punctuality !== ALL) f.punctuality = d.punctuality as TaskFilters["punctuality"];
  if (d.evidence !== ALL) f.evidence = d.evidence as TaskFilters["evidence"];
  if (d.createdFrom) f.createdFrom = d.createdFrom;
  if (d.createdTo) f.createdTo = d.createdTo;
  if (d.sort !== ALL) f.sort = d.sort as TaskFilters["sort"];
  return f;
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// Input con botón para vaciarlo cuando tiene contenido. `offset` deja lugar al ícono nativo (fechas).
function ClearableInput({
  value,
  onClear,
  label,
  offset = false,
  ...props
}: React.ComponentProps<typeof Input> & { value: string; onClear: () => void; label: string; offset?: boolean }) {
  return (
    <div className="relative">
      <Input value={value} className={value ? "pr-9" : undefined} {...props} />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Borrar ${label}`}
          className={cn(
            "absolute top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
            offset ? "right-9" : "right-2",
          )}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

// "Todos" va primero y equivale a no filtrar.
function FilterCombo({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
}) {
  return (
    <FilterField label={label}>
      <Combobox
        ariaLabel={label}
        value={value}
        onChange={onChange}
        placeholder="Todos"
        options={[{ value: ALL, label: "Todos" }, ...options]}
      />
    </FilterField>
  );
}

const EXTRA_KEYS = ["incident", "assigneeId", "punctuality", "evidence", "createdFrom", "createdTo"] as const;

export function TaskFiltersBar({
  current,
  resultCount,
  stations,
  employees,
  basePath = "/admin",
}: {
  basePath?: string;
  current: TaskFilters;
  resultCount: number;
  stations: { id: number; name: string }[];
  employees: { id: string; firstName: string; lastName: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const activeCount = Object.keys(current).length;
  const extraActive = EXTRA_KEYS.filter((k) => current[k] !== undefined).length;
  const [showMore, setShowMore] = useState(extraActive > 0);

  function apply(next: Draft) {
    setDraft(next);
    router.push(`${basePath}${filtersToQuery(fromDraft(next))}`);
  }

  // Los combos y las fechas aplican al instante; el texto y la incidencia al enviar.
  const set = (patch: Partial<Draft>) => apply({ ...draft, ...patch });

  return (
    <form
      role="search"
      className="space-y-4 rounded-xl border bg-card p-3 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply(draft);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField label="Descripción o lugar" htmlFor="filter-text">
          <ClearableInput
            id="filter-text"
            label="búsqueda"
            onClear={() => set({ text: "" })}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="Buscar…"
            maxLength={100}
            className="sm:col-span-2 lg:col-span-1"
          />
        </FilterField>
        <FilterCombo
          label="Estación"
          value={draft.stationId}
          onChange={(v) => set({ stationId: v })}
          options={stations.map((s) => ({ value: String(s.id), label: s.name }))}
        />
        <FilterCombo
          label="Estado"
          value={draft.status}
          onChange={(v) => set({ status: v })}
          options={[
            { value: "pending", label: "Pendiente" },
            { value: "in_progress", label: "En progreso" },
            { value: "completed", label: "Completada" },
          ]}
        />
        <FilterField label="Ordenar por">
          <Combobox
            ariaLabel="Ordenar por"
            value={draft.sort}
            onChange={(v) => set({ sort: v })}
            placeholder="Por estado"
            options={[
              { value: ALL, label: "Por estado (predeterminado)" },
              { value: "newest", label: "Más nuevas primero" },
              { value: "oldest", label: "Más antiguas primero" },
              { value: "station", label: "Estación (A-Z)" },
              { value: "incident", label: "Nº de incidencia" },
              { value: "finished", label: "Finalizadas recientemente" },
            ]}
          />
        </FilterField>
      </div>

      {showMore && (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterField label="Nº de incidencia" htmlFor="filter-incident">
            <ClearableInput
              id="filter-incident"
              label="incidencia"
              offset
              onClear={() => set({ incident: "" })}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={draft.incident}
              onChange={(e) => setDraft({ ...draft, incident: e.target.value })}
              placeholder="Ej: 4821"
            />
          </FilterField>
          <FilterCombo
            label="Trabajador"
            value={draft.assigneeId}
            onChange={(v) => set({ assigneeId: v })}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName}${e.isActive ? "" : " (De baja)"}`,
            }))}
          />
          <FilterCombo
            label="Puntualidad"
            value={draft.punctuality}
            onChange={(v) => set({ punctuality: v })}
            options={[
              { value: "on_time", label: "En tiempo" },
              { value: "late", label: "Fuera de tiempo" },
            ]}
          />
          <FilterCombo
            label="Evidencia"
            value={draft.evidence}
            onChange={(v) => set({ evidence: v })}
            options={[
              { value: "required", label: "Requiere evidencia" },
              { value: "with", label: "Con evidencia" },
              { value: "missing", label: "Sin evidencia declarada" },
            ]}
          />
          <FilterField label="Creada desde" htmlFor="filter-from">
            <ClearableInput
              id="filter-from"
              label="fecha desde"
              offset
              onClear={() => set({ createdFrom: "" })}
              type="date"
              value={draft.createdFrom}
              max={draft.createdTo || undefined}
              onChange={(e) => set({ createdFrom: e.target.value })}
            />
          </FilterField>
          <FilterField label="Creada hasta" htmlFor="filter-to">
            <ClearableInput
              id="filter-to"
              label="fecha hasta"
              offset
              onClear={() => set({ createdTo: "" })}
              type="date"
              value={draft.createdTo}
              min={draft.createdFrom || undefined}
              onChange={(e) => set({ createdTo: e.target.value })}
            />
          </FilterField>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="secondary">
          <Search />
          Buscar
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
        >
          <ChevronDown className={cn("transition-transform", showMore && "rotate-180")} />
          {showMore ? "Ver menos filtros" : "Ver más filtros"}
          {!showMore && extraActive > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{extraActive}</span>
          )}
        </Button>
        {activeCount > 0 && (
          <Button type="button" variant="ghost" onClick={() => apply(toDraft({}))}>
            <X />
            Limpiar filtros
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
          {resultCount === 1 ? "1 tarea" : `${resultCount} tareas`}
        </span>
      </div>
    </form>
  );
}