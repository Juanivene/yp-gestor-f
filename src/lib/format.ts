const TZ = "America/Argentina/Buenos_Aires";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// dd/MM/yyyy HH:mm
export function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  return dateTime.format(new Date(value)).replace(",", "");
}

export function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return dateOnly.format(new Date(value));
}

export function formatHours(value: string | number): string {
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toString().replace(/\.?0+$/, "")} h`;
}

export function formatDuration(from: Date | string, to: Date | string): string {
  const minutes = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`;
}
