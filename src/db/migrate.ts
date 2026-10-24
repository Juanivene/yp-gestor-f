import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL.");
  const folder = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");
  const client = postgres(url, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: folder });
    console.log("Migraciones aplicadas.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error al migrar:", err instanceof Error ? err.message : err);
  process.exit(1);
});
