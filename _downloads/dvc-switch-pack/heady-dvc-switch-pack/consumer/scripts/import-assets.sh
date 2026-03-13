#!/usr/bin/env bash
set -euo pipefail
HEADY_DATA_REGISTRY_URL="${HEADY_DATA_REGISTRY_URL:-https://github.com/HeadyMe/heady-data-registry}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require git; require dvc

[ -d .git ] && [ -d .dvc ] || { echo "Run after bootstrap." >&2; exit 1; }
[ $# -ge 1 ] || { echo "Usage: $0 <registry_rel_path> [...]" >&2; exit 1; }

for REL in "$@"; do
  TARGET="data/registry/${REL}"
  mkdir -p "$(dirname "$TARGET")"
  dvc import "$HEADY_DATA_REGISTRY_URL" "$REL" -o "$TARGET"
  git add "${TARGET}.dvc" .gitignore
done

git commit -m "Import shared assets from registry" || true
echo "OK: imports created. Run: source scripts/dvc-env.sh && dvc pull"
