#!/usr/bin/env bash
set -euo pipefail

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require dvc; require git

[ -d .git ] && [ -d .dvc ] || { echo "Run inside registry repo." >&2; exit 1; }

echo "== DVC doctor =="
dvc doctor || true
echo

echo "== DVC remotes =="
dvc remote list || true
echo

echo "== Tracked .dvc files =="
find datasets models embeddings artifacts -name "*.dvc" -print 2>/dev/null || true
echo

if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "== Remote status =="
  dvc status -c || true
else
  echo "Skipping remote check (no AWS credentials set)."
fi
