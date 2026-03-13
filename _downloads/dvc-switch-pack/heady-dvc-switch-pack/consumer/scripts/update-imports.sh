#!/usr/bin/env bash
set -euo pipefail

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require git; require dvc

[ -d .git ] && [ -d .dvc ] || { echo "Run inside consumer repo." >&2; exit 1; }

UPDATED=0
while IFS= read -r -d '' file; do
  if grep -q '^repo:' "$file"; then
    dvc update "$file"
    git add "$file"
    UPDATED=1
  fi
done < <(find data/registry -name "*.dvc" -print0 2>/dev/null || true)

if [ "$UPDATED" -eq 1 ]; then
  git commit -m "Update DVC imports from registry" || true
  echo "Imports updated."
else
  echo "No imported .dvc files found under data/registry."
fi
