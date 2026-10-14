# Decisiones tomadas

Cosas que no estaban especificadas (o que cambié por una buena razón), una o dos líneas cada una.

## Stack y estructura

- **Next.js 16:** es la última versión estable. En esta versión `middleware.ts` se renombró a `proxy.ts`; cumple el mismo rol (solo chequea que exista la cookie `session`).
- **Estructura:** `proxy.ts` está en `src/`, y las queries compartidas por las páginas viven en `src/lib/queries.ts`.
- **Componentes shadcn escritos a mano** con el paquete unificado `radix-ui` (sin CLI de shadcn), con el mismo estilo y variables de tema.
- **Zod 4** + `@hookform/resolvers` 5. Los formularios usan strings para números y el esquema los convierte (`z.coerce`); el servidor valida con el mismo esquema.
- **Conexión a la base perezosa:** `db` se abre al primer uso, así `next build` no necesita base ni variables de entorno.
- **Validación de entorno con Zod** (`src/lib/env.ts`): falla con un mensaje claro si falta `DATABASE_URL`. Las variables `POSTGRES_*` y `DOMAIN` las valida Docker Compose (`:?`).

## Autenticación

- **Cookie de sesión de 30 días, sesión real de `SESSION_TTL_HOURS`:** desde un Server Component no se puede reescribir la cookie, así que la vigencia la decide la base (`sessions.expires_at`) y la cookie dura más para poder renovar de forma deslizante.
- **Rate limit en memoria** por `usuario|IP`: 5 fallos cada 15 minutos; un login correcto limpia el contador. Se reinicia al reiniciar la app (suficiente para una sola instancia). La IP sale de `X-Forwarded-For`, que pone Caddy.
- **Sesión vencida:** layouts y Server Actions redirigen a `/login?expirada=1`, que muestra el aviso "Tu sesión venció, volvé a ingresar.".
- **Usuarios inactivos con sesión viva:** `getCurrentUser()` también los rechaza (defensa extra además de borrar las sesiones al dar de baja).
- **Usernames** se guardan en minúsculas, con índice único sobre `lower(username)` y un `CHECK` (minúsculas, mínimo 5 caracteres).
- **Admin:** no hay pantalla para crear administradores ni cambiar su clave; el único admin lo crea el seed. Cambiar su contraseña requiere SQL o volver a correr un seed con otra clave en una base nueva.

## Reglas de negocio

- **`on_time`** se calcula en SQL al finalizar: `(now() - started_at) <= estimated_hours * interval '1 hour'`. Ambas horas las pone el servidor.
- **Editar tarea** solo cambia descripción, ubicación y trabajadores (como pide la especificación); estación, incidencia y horas estimadas no se editan.
- **Al editar asignados** se reemplazan en una transacción. Un empleado dado de baja ya asignado se puede quitar pero no volver a agregar; el servidor lo valida.
- **`task_assignees.user_id` sin `on delete cascade`:** los usuarios nunca se borran, así que se conservan los vínculos con tareas viejas.
- **Cargo por defecto** `"Operario"` si el campo queda vacío.
- **Reset de contraseña:** 10 caracteres sin letras ambiguas (sin `0/O`, `1/l/I`) usando `crypto.randomInt`.
- **Contraseña al crear empleado:** la define el admin y se muestra una sola vez en la pantalla de confirmación (no se guarda en claro en ningún lado).
- **Número de incidencia** máximo 2.147.483.647 (entero de Postgres).
- **Orden de tareas:** en progreso → pendientes → completadas, y dentro de cada grupo la más nueva primero (por `created_at`, desempate por id).
- **Admin ve a los asignados** en la tarjeta (una línea con nombres); el empleado no, ya que son sus propias tareas.
- **Mensaje a tiempo:** diálogo verde grande con ícono. Fuera de tiempo: toast neutro "Tarea finalizada. ¡Gracias por tu trabajo!".
- **Búsqueda de empleados** con `unaccent(lower(nombre || ' ' || apellido)) LIKE`, escapando `%` y `_`. La extensión se crea en una migración (`0001_extensions_and_checks.sql`), que también agrega `CHECK` sobre horas, incidencia, usuario y notas.

## Docker y despliegue

- **Migraciones y seed en el contenedor:** se compilan con `tsup` a `dist/migrate.js` y `dist/seed.js` (bundle con drizzle y postgres incluidos). El binario nativo de argon2 se copia desde un stage con las dependencias de producción.
- **Seed en el contenedor:** `docker compose exec app node dist/seed.js` (no corre solo al arrancar, para no recrear datos de ejemplo en producción).
- **Healthcheck de la app** con `fetch` de Node a `/login` (la imagen slim no trae `curl` ni `wget`); Caddy espera a que la app esté sana.
- **Nombres de proyecto Compose** (`ypf` y `ypf-dev`) fijos, para que el compose de desarrollo y el de producción nunca se pisen.
- **Script `db:migrate`/`db:seed`** usan `--env-file-if-exists=.env` para leer el `.env` sin dependencias extra.
- **Backups:** `pg_dump --clean --if-exists --no-owner`, así `restore.sh` reemplaza el contenido de una base existente. Si el dump sale vacío, falla y no deja archivo.
- **Estaciones:** el seed usa `ON CONFLICT DO NOTHING` por nombre; agregar una estación es insertar una fila.

## UI

- **Tema oscuro fijo** (clase `dark` en `<html>`, variables en `:root`), acento ámbar discreto.
- **Modal de detalle** carga los datos por una Server Action (`getTaskDetailAction`) que valida que el empleado esté asignado, así nunca viajan tareas ajenas al cliente.
- **Botones de acción de la tarjeta** usan `stopPropagation`; el diálogo de felicitación vive en la grilla para sobrevivir a que la tarjeta cambie de estado al refrescar.
- **Íconos y favicon:** SVG simple en `src/app/icon.svg`. Sin fuentes externas (fuente del sistema).
- **Sin tests automáticos** (como se pidió); los flujos críticos se verificaron a mano contra el stack de Docker, incluyendo navegador mobile.
