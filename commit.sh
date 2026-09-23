#!/usr/bin/env bash

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Este directorio no es un repositorio Git."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  git add .
else
  echo "No hay cambios para commitear."
  exit 0
fi

MESSAGE="${1:-chore: update project}"

git commit -m "$MESSAGE" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
