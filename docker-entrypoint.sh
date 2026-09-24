#!/bin/sh
set -e

mkdir -p /app/data/db /app/data/uploads

# Crea o actualiza las tablas. Si un cambio borraría datos, se detiene en vez de seguir.
prisma db push --schema /app/prisma/schema.prisma --skip-generate

# Productos y materiales de ejemplo (solo si la base está vacía): SEED_DEMO=1
if [ "${SEED_DEMO:-0}" = "1" ]; then
  node /app/prisma/seed.js
fi

exec "$@"
