#!/usr/bin/env bash
set -euo pipefail

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require git; require dvc; require rsync; require python3

[ -d .git ] && [ -d .dvc ] || { echo "Run inside registry repo after bootstrap." >&2; exit 1; }
[ $# -eq 2 ] || { echo "Usage: $0 <source_path> <registry_rel_path>" >&2; exit 1; }

SRC="$1"; REL="$2"
[ -e "$SRC" ] || { echo "Missing source: $SRC" >&2; exit 1; }

case "$REL" in
  datasets/*|models/*|embeddings/*|artifacts/*) ;;
  *) echo "Path must start with datasets/ models/ embeddings/ artifacts/" >&2; exit 1 ;;
esac

mkdir -p "$(dirname "$REL")"
if [ -d "$SRC" ]; then
  mkdir -p "$REL"; rsync -a --delete "$SRC"/ "$REL"/
else
  cp -f "$SRC" "$REL"
fi

dvc add "$REL"
git add "${REL}.dvc" .gitignore
git commit -m "Add asset: ${REL}" || true
dvc push

echo "OK: added + pushed ${REL}"
