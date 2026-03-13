#!/usr/bin/env bash
set -euo pipefail

HEADY_DATA_REGISTRY_URL="${HEADY_DATA_REGISTRY_URL:-https://github.com/HeadyMe/heady-data-registry}"
HEADY_DATA_REGISTRY_CLONE="${HEADY_DATA_REGISTRY_CLONE:-../heady-data-registry}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require git; require dvc; require rsync; require python3

[ -d .git ] && [ -d .dvc ] || { echo "Run in consumer repo root." >&2; exit 1; }
[ -d "${HEADY_DATA_REGISTRY_CLONE}/.git" ] && [ -d "${HEADY_DATA_REGISTRY_CLONE}/.dvc" ] || {
  echo "Registry clone not ready at $HEADY_DATA_REGISTRY_CLONE" >&2; exit 1
}
[ $# -eq 2 ] || { echo "Usage: $0 <local_path> <registry_rel_path>" >&2; exit 1; }

LOCAL="$1"; REGREL="$2"
[ -e "$LOCAL" ] || { echo "Missing local path: $LOCAL" >&2; exit 1; }

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

# Remove old local content
if git ls-files --error-unmatch "$LOCAL" >/dev/null 2>&1; then
  git rm -r --cached "$LOCAL" || true
fi
rm -rf "$LOCAL" "${LOCAL}.dvc" || true

# Strip matching LFS lines from .gitattributes
if [ -f .gitattributes ]; then
  python3 -c "
import sys
from pathlib import Path
path = sys.argv[1]
ga = Path('.gitattributes')
lines = ga.read_text().splitlines()
new = [l for l in lines if not l.strip().startswith(path + ' ')]
ga.write_text(chr(10).join(new).rstrip() + (chr(10) if new else ''))
" "$LOCAL"
  git add .gitattributes || true
fi

# Replace with DVC import
dvc import "$HEADY_DATA_REGISTRY_URL" "$REGREL" -o "$LOCAL"
git add "${LOCAL}.dvc" .gitignore
git commit -m "Replace ${LOCAL} with registry import" || true

echo "OK: migrated ${LOCAL} -> ${REGREL}"
