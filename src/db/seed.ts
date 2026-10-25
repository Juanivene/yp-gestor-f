import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { generatePassword, hashPassword } from "../lib/auth/password";
import { stations, users } from "./schema";

const STATIONS = [
  "Opessa Mate 1",
  "Opessa Mate 2",
  "Opessa Tucumán",
  "Opessa Yerba Buena",
  "Opessa Bulnes",
  "Opessa Salta",
  "Opessa Jujuy",
];

const EMPLOYEES = [
  { username: "vnacusse", firstName: "Víctor", lastName: "Nacusse" },
  { username: "fhelguero", firstName: "Fabián", lastName: "Helguero" },
  { username: "dfrias", firstName: "Diego", lastName: "Frías" },
  { username: "lreinaga", firstName: "Luis", lastName: "Reinaga" },
  { username: "alazarte", firstName: "Alberto", lastName: "Lazarte" },
  { username: "marcosmedina", firstName: "Marcos", lastName: "Medina" },
  { username: "mauromedina", firstName: "Mauro", lastName: "Medina" },
  { username: "isantana", firstName: "Ignacio", lastName: "Santana" },
  { username: "wmorales", firstName: "Walter", lastName: "Morales" },
  { username: "rcastillo", firstName: "Rubén", lastName: "Castillo" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL.");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("Falta la variable SEED_ADMIN_PASSWORD (contraseña inicial del admin).");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await db
      .insert(stations)
      .values(STATIONS.map((name) => ({ name })))
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

    // Las contraseñas se generan al crear al empleado y solo se muestran en esta corrida.
    const created: { username: string; password: string }[] = [];
    for (const e of EMPLOYEES) {
      const password = generatePassword(10);
      const inserted = await db
        .insert(users)
        .values({
          username: e.username,
          passwordHash: await hashPassword(password),
          firstName: e.firstName,
          lastName: e.lastName,
          position: "Operario",
          role: "employee",
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      if (inserted.length > 0) created.push({ username: e.username, password });
    }

    console.log("\nSeed listo.");
    console.log("  Administrador: admin (si ya existía, se conserva su contraseña)");
    if (created.length > 0) {
      console.log("  Empleados nuevos (guardá estas contraseñas, no se vuelven a mostrar):");
      for (const c of created) console.log(`    ${c.username} / ${c.password}`);
    }
    console.log();
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error en el seed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
