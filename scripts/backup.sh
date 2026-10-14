#!/usr/bin/env bash
# Backup comprimido de la base. Guarda en ./backups y borra los de más de 14 días.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
[ -f .env ] && . ./.env
set +a

: "${POSTGRES_USER:?Falta POSTGRES_USER en .env}"
: "${POSTGRES_DB:?Falta POSTGRES_DB en .env}"

mkdir -p backups
FILE="backups/ypf_$(date +%Y-%m-%d_%H%M%S).sql.gz"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner \
  | gzip > "$FILE"

# Si el dump falló, no dejamos un archivo vacío dando falsa seguridad.
if [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  echo "El backup falló." >&2
  exit 1
fi

find backups -name 'ypf_*.sql.gz' -type f -mtime +14 -delete
echo "Backup creado: $FILE"
