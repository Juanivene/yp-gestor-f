# Mantenimiento de Estaciones

Sistema para una constructora que hace trabajos de mantenimiento en estaciones de servicio. Hay dos roles:

- **Administrador:** crea y reparte tareas, administra al personal.
- **Empleado:** ve sus tareas, las empieza, las finaliza y deja notas (pensado para el celular).

Stack: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, PostgreSQL (Neon), Drizzle ORM, login propio con sesiones. Despliegue en **Netlify**.

## Usuarios iniciales (los crea el seed)

- **Administrador:** usuario `admin`, con la contraseña que definas en `SEED_ADMIN_PASSWORD`.
- **Empleados:** el seed los crea con contraseñas aleatorias que se imprimen una sola vez en la consola; el admin puede cambiarlas desde la app.

## 1. Base de datos (Neon)

Netlify no incluye Postgres propio, así que se usa Neon (plan gratis):

1. Creá un proyecto en https://neon.new o https://console.neon.tech (o en Netlify: *Extensions → Neon*, que crea la base y carga `DATABASE_URL` solo).
2. Copiá la *connection string* (con `sslmode=require`; preferí la versión *pooled*).

## 2. Desarrollo local

Requisitos: Node.js 22+.

```bash
cp .env.example .env     # pegá tu DATABASE_URL de Neon
npm install
npm run db:setup         # migra y carga datos de ejemplo (se puede repetir sin duplicar)
npm run dev              # http://localhost:3000
```

Otros scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run db:generate` (genera una migración desde `src/db/schema.ts`), `npm run db:studio`.

## 3. Despliegue en Netlify

1. Subí el repo a GitHub.
2. En Netlify: *Add new site → Import an existing project* y elegí el repo. `netlify.toml` ya define el build.
3. En *Site configuration → Environment variables* cargá:
   - `DATABASE_URL` (la de Neon; si usaste la extensión ya está)
   - `SESSION_TTL_HOURS` (opcional, 8 por defecto)
   - `SEED_ADMIN_PASSWORD` (obligatoria para correr el seed; no la subas al repositorio)
4. Deploy. En cada build se ejecuta `npm run db:setup` (migraciones + seed idempotente) y luego `next build`.

Los datos quedan en Neon, así que persisten entre deploys. Para una instalación sin datos de ejemplo, cambiá `db:setup` por `db:migrate` en `netlify.toml` y creá el admin a mano.

## Estructura

```
src/
  app/            login, admin/, empleado/ (layouts protegidos), not-found, error
  components/     ui/ (shadcn) y componentes propios
  db/             schema.ts, index.ts, migrate.ts, seed.ts
  lib/            auth/ (sesiones, hash, rate limit, guards), validations/ (Zod), messages.ts, queries.ts
  actions/        Server Actions por dominio
drizzle/          migraciones SQL versionadas
netlify.toml      configuración de build
```

Las decisiones tomadas por cuenta propia están en [DECISIONS.md](DECISIONS.md).
