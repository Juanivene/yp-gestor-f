import type { TaskFilters, TaskStatus } from "@/lib/queries";

type Params = Record<string, string | string[] | undefined>;

const STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];
const PUNCTUALITY = ["on_time", "late"] as const;
const EVIDENCE = ["missing", "with", "required"] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

function positiveInt(v: string | undefined): number | undefined {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : undefined;
}

function validDate(v: string | undefined): string | undefined {
  return v && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
}

// Convierte los query params de /admin en filtros válidos; lo que no sirve se ignora.
export function parseTaskFilters(params: Params): TaskFilters {
  const out: TaskFilters = {};
  const incident = positiveInt(first(params.incidencia));
  if (incident) out.incident = incident;
  const status = first(params.estado);
  if (STATUSES.includes(status as TaskStatus)) out.status = status as TaskStatus;
  const station = positiveInt(first(params.estacion));
  if (station) out.stationId = station;
  const assignee = first(params.trabajador);
  if (assignee && UUID.test(assignee)) out.assigneeId = assignee;
  const punctuality = first(params.puntualidad);
  if (PUNCTUALITY.includes(punctuality as (typeof PUNCTUALITY)[number])) out.punctuality = punctuality as TaskFilters["punctuality"];
  const evidence = first(params.evidencia);
  if (EVIDENCE.includes(evidence as (typeof EVIDENCE)[number])) out.evidence = evidence as TaskFilters["evidence"];
  const text = first(params.q)?.slice(0, 100);
  if (text) out.text = text;
  const from = validDate(first(params.desde));
  if (from) out.createdFrom = from;
  const to = validDate(first(params.hasta));
  if (to) out.createdTo = to;
  return out;
}

// Inverso de parseTaskFilters, para armar la URL.
export function filtersToQuery(f: TaskFilters): string {
  const p = new URLSearchParams();
  if (f.text) p.set("q", f.text);
  if (f.incident) p.set("incidencia", String(f.incident));
  if (f.status) p.set("estado", f.status);
  if (f.stationId) p.set("estacion", String(f.stationId));
  if (f.assigneeId) p.set("trabajador", f.assigneeId);
  if (f.punctuality) p.set("puntualidad", f.punctuality);
  if (f.evidence) p.set("evidencia", f.evidence);
  if (f.createdFrom) p.set("desde", f.createdFrom);
  if (f.createdTo) p.set("hasta", f.createdTo);
  const s = p.toString();
  return s ? `?${s}` : "";
}
