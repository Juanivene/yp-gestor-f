import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Borra todos los datos menos el usuario "admin" (y su sesión). Destructivo.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL.");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`TRUNCATE tasks, stations RESTART IDENTITY CASCADE`);
      await tx.execute(sql`DELETE FROM users WHERE username <> 'admin'`);
    });
    console.log("Base limpia: solo queda el usuario admin.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al limpiar la base:", err instanceof Error ? err.message : err);
  process.exit(1);
});
