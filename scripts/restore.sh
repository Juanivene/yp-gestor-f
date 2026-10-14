#!/usr/bin/env bash
# Restaura la base desde un backup .sql.gz. REEMPLAZA los datos actuales.
# Uso: scripts/restore.sh backups/ypf_2025-01-01_030000.sql.gz [--yes]
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
[ -f .env ] && . ./.env
set +a

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: $0 <archivo.sql.gz> [--yes]" >&2
  exit 1
fi

: "${POSTGRES_USER:?Falta POSTGRES_USER en .env}"
: "${POSTGRES_DB:?Falta POSTGRES_DB en .env}"

if [ "${2:-}" != "--yes" ]; then
  read -r -p "Esto reemplaza todos los datos actuales por los de $FILE. ¿Seguir? (escribí 'si'): " answer
  [ "$answer" = "si" ] || { echo "Cancelado."; exit 1; }
fi

gunzip -c "$FILE" | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restauración completa."
