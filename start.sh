#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm no esta instalado o no esta disponible en PATH." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  npm ci
fi

MODE="${1:-dev}"

if [ "$MODE" = "docker" ]; then
  # Construye la imagen y levanta el contenedor en segundo plano (puerto APP_PORT, 3000 por defecto).
  exec docker compose --env-file .env.local up -d --build
fi

case "$MODE" in
  prod)
    npm run build
    exec npm run start
    ;;
  dev)
    if [ "$#" -gt 0 ]; then
      shift
    fi
    exec npm run dev -- "$@"
    ;;
  *)
    exec npm run dev -- "$@"
    ;;
esac
