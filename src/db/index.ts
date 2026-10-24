import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Db };

function createDb(): Db {
  const client = postgres(getEnv().DATABASE_URL, {
    // Serverless: una conexión por instancia y sin prepared statements (compatible con el pooler de Neon).
    max: 1,
    prepare: false,
  });
  return drizzle(client, { schema });
}

// Conexión perezosa: no se abre al compilar, solo al primer uso.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    globalForDb.__db ??= createDb();
    return Reflect.get(globalForDb.__db, prop, receiver);
  },
});

export { schema };
