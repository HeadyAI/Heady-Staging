#!/usr/bin/env bash
# © 2026 HeadySystems Inc. — Bootstrap consumer repo for DVC imports
set -euo pipefail

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
append()  { touch "$1"; grep -Fqx "$2" "$1" || echo "$2" >> "$1"; }

require git; require dvc
[ -d .git ] || { echo "Run inside consumer repo root." >&2; exit 1; }

[ -d .dvc ] || dvc init
mkdir -p data/registry scripts

append .gitignore ".dvc/cache/"
append .gitignore ".dvc/tmp/"
append .gitignore ".dvc/config.local"
append .gitignore ".env.dvc"

git add .dvc .gitignore data/registry
git commit -m "Bootstrap consumer repo for DVC imports" || true
echo "OK: consumer bootstrapped"
