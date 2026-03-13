#!/usr/bin/env bash
# © 2026 HeadySystems Inc. — DVC Registry Bootstrap
set -euo pipefail

HEADY_B2_PREFIX="${HEADY_B2_PREFIX:-dvcstore}"
HEADY_B2_ENDPOINT_URL="${HEADY_B2_ENDPOINT_URL:-https://s3.us-west-002.backblazeb2.com}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
append()  { touch "$1"; grep -Fqx "$2" "$1" || echo "$2" >> "$1"; }

require git; require dvc; require python3

[ -d .git ] || { echo "Run inside registry repo root." >&2; exit 1; }
[ -n "${HEADY_B2_BUCKET:-}" ] || { echo "HEADY_B2_BUCKET required." >&2; exit 1; }

[ -d .dvc ] || dvc init
REMOTE_URL="s3://${HEADY_B2_BUCKET}/${HEADY_B2_PREFIX}"

if ! dvc remote list | awk '{print $1}' | grep -qx "heady-b2"; then
  dvc remote add -d heady-b2 "$REMOTE_URL"
else
  dvc remote modify heady-b2 url "$REMOTE_URL"
fi
dvc remote modify heady-b2 endpointurl "$HEADY_B2_ENDPOINT_URL"

mkdir -p datasets/{core,experiments,synthetic} models/{base,finetuned,legacy} embeddings/{text,vision} artifacts/{renders,logs}

append .gitignore ".dvc/cache/"
append .gitignore ".dvc/tmp/"
append .gitignore ".dvc/config.local"
append .gitignore ".env"
append .gitignore ".env.*"

git add .dvc .gitignore datasets models embeddings artifacts
git commit -m "Bootstrap registry for DVC + B2" || true
echo "OK: registry bootstrapped — Remote: $REMOTE_URL"
