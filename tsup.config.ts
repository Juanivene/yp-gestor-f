import { defineConfig } from "tsup";

// Compila migrate y seed a JS autocontenido para correrlos dentro del contenedor.
export default defineConfig({
  entry: { migrate: "src/db/migrate.ts", seed: "src/db/seed.ts" },
  outDir: "dist",
  format: ["cjs"],
  platform: "node",
  target: "node22",
  clean: true,
  noExternal: [/.*/],
  external: ["@node-rs/argon2"],
});
