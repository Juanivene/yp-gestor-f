#!/bin/sh
set -e

echo "Aplicando migraciones…"
node dist/migrate.js

echo "Iniciando el servidor…"
exec node server.js
