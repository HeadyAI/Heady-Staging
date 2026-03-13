#!/usr/bin/env bash
# © 2026 HeadySystems Inc. — Incremental LFS→DVC migration (per-path)
set -euo pipefail

HEADY_DATA_REGISTRY_URL="${HEADY_DATA_REGISTRY_URL:-https://github.com/HeadyMe/heady-data-registry}"
HEADY_DATA_REGISTRY_CLONE="${HEADY_DATA_REGISTRY_CLONE:-../heady-data-registry}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require git; require dvc; require rsync

[ -d .git ] && [ -d .dvc ] || { echo "Run in consumer repo root after bootstrap." >&2; exit 1; }
[ -d "${HEADY_DATA_REGISTRY_CLONE}/.git" ] || { echo "Registry clone not ready at $HEADY_DATA_REGISTRY_CLONE" >&2; exit 1; }
[ $# -eq 2 ] || { echo "Usage: $0 <local_path> <registry_rel_path>" >&2; exit 1; }

LOCAL="$1"; REGREL="$2"
[ -e "$LOCAL" ] || { echo "Missing: $LOCAL" >&2; exit 1; }

DEST="${HEADY_DATA_REGISTRY_CLONE}/${REGREL}"
mkdir -p "$(dirname "$DEST")"

if [ -d "$LOCAL" ]; then
  mkdir -p "$DEST"; rsync -a --delete "$LOCAL"/ "$DEST"/
else
  cp -f "$LOCAL" "$DEST"
fi

pushd "$HEADY_DATA_REGISTRY_CLONE" >/dev/null
  dvc add "$REGREL"
  git add "${REGREL}.dvc" .gitignore
  git commit -m "Add migrated asset: ${REGREL}" || true
  dvc push
  git push origin "$(git branch --show-current)"
popd >/dev/null

rm -rf "$LOCAL" "${LOCAL}.dvc" || true
dvc import "$HEADY_DATA_REGISTRY_URL" "$REGREL" -o "$LOCAL"
git add "${LOCAL}.dvc" .gitignore
git commit -m "Replace ${LOCAL} with registry import" || true
echo "OK: migrated ${LOCAL} → ${REGREL}"
