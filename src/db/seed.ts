import { count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../lib/auth/password";
import { stations, taskAssignees, taskNotes, tasks, users } from "./schema";

const HOUR = 60 * 60 * 1000;
const EMPLOYEE_PASSWORD = "empleado123";

const EMPLOYEES = [
  { username: "mgomez", firstName: "Martín", lastName: "Gómez", position: "Electricista" },
  { username: "lfernandez", firstName: "Lucía", lastName: "Fernández", position: "Operaria" },
  { username: "drodriguez", firstName: "Diego", lastName: "Rodríguez", position: "Plomero" },
  { username: "csosa", firstName: "Camila", lastName: "Sosa", position: "Operaria" },
];

type SeedTask = {
  station: string;
  incident: number | null;
  description: string;
  location: string;
  hours: number;
  assignees: string[];
  status: "pending" | "in_progress" | "completed";
  // Para en progreso: hace cuántas horas empezó. Para completadas: horas trabajadas y hace cuántas horas terminó.
  startedHoursAgo?: number;
  workedHours?: number;
  requiresEvidence?: boolean;
  notes?: { author: string; body: string }[];
};

const TASKS: SeedTask[] = [
  { station: "YPF", incident: 4821, description: "Arreglar aire acondicionado del salón de ventas", location: "Av. Libertador 4500, CABA", hours: 3, assignees: ["mgomez"], status: "in_progress", startedHoursAgo: 1.5, notes: [{ author: "mgomez", body: "Falla el compresor, pido repuesto al proveedor." }] },
  { station: "Opessa", incident: null, description: "Cambiar luminarias de la playa", location: "Ruta 9 km 52, Campana", hours: 4, assignees: ["lfernandez", "csosa"], status: "in_progress", startedHoursAgo: 2, notes: [{ author: "lfernandez", body: "Ya cambiamos 6 de las 10 luminarias." }] },
  { station: "Estación 3", incident: 5034, description: "Reparar surtidor 3: no entrega combustible", location: "Av. San Martín 1200, Morón", hours: 2.5, assignees: ["drodriguez"], status: "pending" },
  { station: "YPF", incident: null, description: "Destapar desagüe del lavadero", location: "Av. Libertador 4500, CABA", hours: 1.5, assignees: ["drodriguez", "mgomez"], status: "pending" },
  { station: "Estación 4", incident: 5102, description: "Reemplazar cartel de precios dañado por la tormenta", location: "Ruta 3 km 38, Cañuelas", hours: 5, assignees: ["csosa"], status: "pending" },
  { station: "Opessa", incident: null, description: "Pintar cordones y señalización de la playa", location: "Ruta 9 km 52, Campana", hours: 6, assignees: ["lfernandez"], status: "pending" },
  { station: "Estación 3", incident: 4710, description: "Revisar pérdida en el tanque de gasoil", location: "Av. San Martín 1200, Morón", hours: 4, assignees: ["mgomez", "drodriguez"], status: "completed", workedHours: 3.2, startedHoursAgo: 30, notes: [{ author: "drodriguez", body: "Era una junta del conducto. Se cambió y quedó sin pérdidas." }, { author: "mgomez", body: "Probamos presión durante 30 minutos, todo en orden." }] },
  { station: "YPF", incident: 4655, description: "Reparar puerta automática del minimercado", location: "Av. Libertador 4500, CABA", hours: 2, assignees: ["csosa"], status: "completed", requiresEvidence: true, workedHours: 3.1, startedHoursAgo: 52, notes: [{ author: "csosa", body: "Se trabó el sensor. Costó más de lo previsto por el repuesto." }] },
  { station: "Estación 4", incident: null, description: "Cambiar flexibles de los surtidores 1 y 2", location: "Ruta 3 km 38, Cañuelas", hours: 3, assignees: ["lfernandez"], status: "completed", workedHours: 2.4, startedHoursAgo: 75, notes: [{ author: "lfernandez", body: "Listo, se cambiaron los cuatro flexibles." }] },
  { station: "Opessa", incident: 4590, description: "Reparar baño de caballeros: pérdida en canilla y cisterna", location: "Ruta 9 km 52, Campana", hours: 2, assignees: ["drodriguez"], status: "completed", workedHours: 1.7, startedHoursAgo: 100 },
  { station: "YPF", incident: null, description: "Instalar tomacorrientes nuevos en la oficina", location: "Av. Libertador 4500, CABA", hours: 2.5, assignees: ["mgomez"], status: "completed", workedHours: 2.6, startedHoursAgo: 130 },
  { station: "Estación 3", incident: 4388, description: "Cambiar vidrio roto de la vidriera del salón", location: "Av. San Martín 1200, Morón", hours: 3, assignees: ["racosta"], status: "completed", workedHours: 2.5, startedHoursAgo: 600, notes: [{ author: "racosta", body: "Vidrio templado colocado y sellado." }] },
  { station: "Estación 4", incident: 4301, description: "Reparar portón del depósito", location: "Ruta 3 km 38, Cañuelas", hours: 2, assignees: ["racosta", "csosa"], status: "completed", workedHours: 2.8, startedHoursAgo: 720 },
  { station: "YPF", incident: 5210, description: "Revisar tablero eléctrico: salta la térmica del lavadero", location: "Av. Libertador 4500, CABA", hours: 2, assignees: ["mgomez", "csosa"], status: "pending" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL.");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345";

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await db
      .insert(stations)
      .values(["YPF", "Opessa", "Estación 3", "Estación 4"].map((name) => ({ name })))
      .onConflictDoNothing();

    const [existingAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.username, "admin"));
    if (!existingAdmin) {
      await db.insert(users).values({
        username: "admin",
        passwordHash: await hashPassword(adminPassword),
        firstName: "Admin",
        lastName: "Sistema",
        position: "Administrador",
        role: "admin",
      });
    }

    const employeeHash = await hashPassword(EMPLOYEE_PASSWORD);
    const allEmployees = [
      ...EMPLOYEES.map((e) => ({ ...e, active: true })),
      { username: "racosta", firstName: "Roberto", lastName: "Acosta", position: "Operario", active: false },
    ];
    for (const e of allEmployees) {
      await db
        .insert(users)
        .values({
          username: e.username,
          passwordHash: employeeHash,
          firstName: e.firstName,
          lastName: e.lastName,
          position: e.position,
          role: "employee",
          isActive: e.active,
          deactivatedAt: e.active ? null : new Date(Date.now() - 20 * 24 * HOUR),
        })
        .onConflictDoNothing();
    }

    const [{ total }] = await db.select({ total: count() }).from(tasks);
    if (total === 0) {
      const userRows = await db.select({ id: users.id, username: users.username }).from(users);
      const idOf = new Map(userRows.map((u) => [u.username, u.id]));
      const stationRows = await db.select({ id: stations.id, name: stations.name }).from(stations);
      const stationId = new Map(stationRows.map((s) => [s.name, s.id]));
      const adminId = idOf.get("admin")!;
      const now = Date.now();

      await db.transaction(async (tx) => {
        for (const t of TASKS) {
          const startedAt = t.startedHoursAgo !== undefined ? new Date(now - t.startedHoursAgo * HOUR) : null;
          const finishedAt =
            t.status === "completed" && startedAt ? new Date(startedAt.getTime() + (t.workedHours ?? t.hours) * HOUR) : null;
          const createdAt = new Date((startedAt?.getTime() ?? now) - 12 * HOUR);

          const [row] = await tx
            .insert(tasks)
            .values({
              stationId: stationId.get(t.station)!,
              incidentNumber: t.incident,
              description: t.description,
              location: t.location,
              estimatedHours: String(t.hours),
              status: t.status,
              startedAt,
              finishedAt,
              requiresEvidence: t.requiresEvidence ?? false,
              onTime: finishedAt ? (t.workedHours ?? t.hours) <= t.hours : null,
              createdBy: adminId,
              createdAt,
              updatedAt: finishedAt ?? startedAt ?? createdAt,
            })
            .returning({ id: tasks.id });

          await tx.insert(taskAssignees).values(t.assignees.map((u) => ({ taskId: row.id, userId: idOf.get(u)! })));

          const base = (startedAt ?? new Date(now)).getTime();
          const notes = t.notes ?? [];
          for (const [i, n] of notes.entries()) {
            await tx.insert(taskNotes).values({
              taskId: row.id,
              authorId: idOf.get(n.author)!,
              body: n.body,
              createdAt: new Date(base + (i + 1) * 20 * 60 * 1000),
            });
          }
        }
      });
    }

    // Mantiene el contador de ids sincronizado por si se cargaron filas a mano.
    await db.execute(sql`SELECT setval(pg_get_serial_sequence('tasks', 'id'), COALESCE((SELECT MAX(id) FROM tasks), 1))`);

    console.log("\nSeed listo. Credenciales de prueba:");
    console.log(`  Administrador: admin / ${adminPassword}`);
    console.log(`  Empleados:     ${EMPLOYEES.map((e) => e.username).join(", ")} / ${EMPLOYEE_PASSWORD}`);
    console.log("  Dado de baja:  racosta (no puede ingresar)\n");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error en el seed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
