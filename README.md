# Mantenimiento de Estaciones

Sistema interno para una constructora que hace trabajos de mantenimiento en estaciones de servicio. Hay dos roles:

- **Administrador:** crea y reparte tareas, administra al personal (computadora o celular).
- **Empleado:** ve sus tareas, las empieza, las finaliza y deja notas (pensado para el celular).

Stack: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, PostgreSQL 16, Drizzle ORM, login propio con sesiones, Docker Compose + Caddy (HTTPS automático). Todo open source, sin servicios pagos.

## Credenciales de prueba (después de correr el seed)

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin` | `admin12345` (o el valor de `SEED_ADMIN_PASSWORD`) |
| Empleados | `mgomez`, `lfernandez`, `drodriguez`, `csosa` | `empleado123` |
| Empleado dado de baja | `racosta` | no puede ingresar |

> En producción cambiá `SEED_ADMIN_PASSWORD` antes de correr el seed y eliminá/reseteá las cuentas de prueba.

---

## 1. Desarrollo local

Requisitos: Node.js 22+, npm y Docker.

```bash
cp .env.example .env                              # los valores por defecto sirven para desarrollo
docker compose -f docker-compose.dev.yml up -d    # Postgres en localhost:5432
npm install
npm run db:migrate                                # aplica las migraciones
npm run db:seed                                   # carga estaciones, usuarios y tareas de ejemplo
npm run dev                                       # http://localhost:3000
```

Otros scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run db:generate` (genera una migración nueva a partir de `src/db/schema.ts`), `npm run db:studio`.

El seed se puede correr las veces que quieras: no duplica nada.

## 2. Probar la versión de producción en local

```bash
cp .env.example .env     # DOMAIN=localhost
docker compose up -d --build
docker compose exec app node dist/seed.js     # datos de ejemplo
```

Abrí https://localhost. Caddy usa un certificado interno, así que el navegador va a avisar que no es de confianza: aceptalo para seguir (o ejecutá `docker compose exec caddy caddy trust` y reiniciá el navegador).

Si ya tenés algo usando los puertos 80/443, frená eso primero.

## 3. Despliegue en una VM Ubuntu, paso a paso

### 3.1 Crear la VM y entrar por SSH con llave

1. Creá una VM Ubuntu 22.04/24.04 (1 vCPU y 1–2 GB de RAM alcanzan) en el proveedor que prefieras.
2. En tu computadora generá una llave (si no tenés): `ssh-keygen -t ed25519`.
3. Cargá la llave pública (`~/.ssh/id_ed25519.pub`) al crear la VM, o copiala con `ssh-copy-id usuario@IP_DE_LA_VM`.
4. Entrá: `ssh usuario@IP_DE_LA_VM`.

### 3.2 Deshabilitar el login con contraseña

Probá primero que entrás con la llave, y recién después:

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Dejá abierta la sesión actual y verificá desde otra terminal que seguís pudiendo entrar.

### 3.3 Firewall (solo 22, 80 y 443)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> Docker publica puertos salteándose `ufw`. Por eso en `docker-compose.yml` **solo Caddy** publica puertos (80 y 443); la base y la app quedan en la red interna.

### 3.4 Actualizaciones automáticas de seguridad

```bash
sudo apt update && sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades    # elegí "Sí"
```

### 3.5 Instalar Docker (script oficial)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# cerrá la sesión SSH y volvé a entrar para que aplique el grupo
docker compose version
```

### 3.6 Clonar el repo y crear el `.env`

```bash
git clone <URL_DE_TU_REPO> mantenimiento && cd mantenimiento
cp .env.example .env
```

Generá contraseñas fuertes (hexadecimales, así no rompen la URL de conexión):

```bash
openssl rand -hex 24      # usalo para POSTGRES_PASSWORD
openssl rand -hex 12      # usalo para SEED_ADMIN_PASSWORD
```

Editá `.env` (`nano .env`):

```dotenv
POSTGRES_USER=ypf
POSTGRES_PASSWORD=<la_que_generaste>
POSTGRES_DB=ypf
DOMAIN=mantenimiento.midominio.com.ar
SESSION_TTL_HOURS=8
SEED_ADMIN_PASSWORD=<la_que_generaste>
NODE_ENV=production
```

`DATABASE_URL` no hace falta en producción: `docker-compose.yml` la arma con las variables `POSTGRES_*`.

> Cambiar `POSTGRES_PASSWORD` después de la primera vez no cambia la contraseña de la base ya creada. Definila bien desde el principio.

### 3.7 Apuntar un dominio

Caddy necesita que el dominio resuelva a la IP pública de la VM para sacar el certificado HTTPS automáticamente.

**Opción A: subdominio gratis con DuckDNS**

1. Entrá a https://www.duckdns.org e ingresá con tu cuenta.
2. Creá un subdominio, por ejemplo `micontructora` → `micontructora.duckdns.org`.
3. En "current ip" poné la IP pública de la VM y guardá.
4. En `.env`: `DOMAIN=micontructora.duckdns.org`.

**Opción B: dominio propio**

1. En el panel DNS de tu dominio creá un registro **A**: nombre `mantenimiento`, valor = IP pública de la VM.
2. En `.env`: `DOMAIN=mantenimiento.midominio.com.ar`.
3. Esperá a que propague (`dig +short mantenimiento.midominio.com.ar` debería devolver la IP).

### 3.8 Levantar todo, seed y backups

```bash
docker compose up -d --build
docker compose ps                              # los 3 servicios deben estar "Up" (db y app "healthy")
docker compose exec app node dist/seed.js      # crea el admin y los datos de ejemplo
```

Las migraciones corren solas cada vez que arranca la app. Entrá a `https://TU_DOMINIO` e ingresá con `admin`.

> El seed carga empleados y tareas de ejemplo. Para una instalación real podés borrarlos desde la app o saltear el seed y crear el admin a mano. Si vas a usar el seed igual, cambiá las contraseñas de los empleados de prueba (reseteándolas) o dalos de baja.

**Backups diarios con cron:**

```bash
chmod +x scripts/*.sh
crontab -e
```

Agregá esta línea (todos los días a las 3 a.m.; ajustá la ruta):

```cron
0 3 * * * cd /home/usuario/mantenimiento && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Los backups quedan en `./backups` (se borran los de más de 14 días). Para restaurar:

```bash
./scripts/restore.sh backups/ypf_2025-01-01_030000.sql.gz
```

Conviene copiar `./backups` periódicamente a otro lugar fuera de la VM.

## 4. Cómo actualizar a una versión nueva

```bash
cd mantenimiento
./scripts/backup.sh               # por las dudas
git pull
docker compose up -d --build
```

Los datos **no se pierden**: viven en el volumen `pgdata`, que sobrevive a reconstruir las imágenes. Las migraciones nuevas se aplican solas al arrancar la app. (Ojo: `docker compose down -v` sí borra los volúmenes, no lo uses salvo que quieras empezar de cero.)

## 5. Cómo agregar una estación nueva

Alcanza con insertar una fila en `stations`. Aparece sola en el selector de "Nueva tarea":

```bash
docker compose exec db psql -U ypf -d ypf -c "INSERT INTO stations (name) VALUES ('Estación 5');"
```

Para ocultar una estación sin borrarla (sus tareas se conservan): `UPDATE stations SET is_active = false WHERE name = 'Estación 5';`

Para que una instalación nueva ya la traiga, agregala también a la lista de `src/db/seed.ts`.

## 6. Comandos útiles

```bash
docker compose logs -f app                 # logs de la app
docker compose logs -f caddy               # logs del proxy / certificados
docker compose restart app                 # reiniciar la app
docker compose ps                          # estado de los servicios
docker compose exec db psql -U ypf -d ypf  # entrar a la base (usá tu POSTGRES_USER / POSTGRES_DB)
docker compose down                        # frenar todo (los datos quedan)
```

## Estructura

```
src/
  app/            login, admin/, empleado/ (layouts protegidos), not-found, error
  components/     ui/ (shadcn) y componentes propios
  db/             schema.ts, index.ts, migrate.ts, seed.ts
  lib/            auth/ (sesiones, hash, rate limit, guards), validations/ (Zod), messages.ts, queries.ts
  actions/        Server Actions por dominio
drizzle/          migraciones SQL versionadas
scripts/          backup.sh, restore.sh, entrypoint.sh
```

Todos los textos que se muestran en toasts están centralizados en `src/lib/messages.ts`. Las decisiones tomadas por cuenta propia están en [DECISIONS.md](DECISIONS.md).
