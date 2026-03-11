#!/usr/bin/env bash
# pre-commit-secrets.sh — Scans staged files for secret patterns.
# Usage: bash scripts/pre-commit-secrets.sh   (or add as pre-commit hook)
# Exit 1 if secrets detected, 0 if clean.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VIOLATIONS=0

# ─── File-extension blocklist ───────────────────────────────────────────────
BLOCKED_EXTENSIONS=(
  ".pem"
  ".key"
  ".p12"
  ".pfx"
)

# ─── Content patterns (regex) ───────────────────────────────────────────────
SECRET_PATTERNS=(
  'sk-[a-zA-Z0-9]{20,}'                          # OpenAI / Anthropic API key
  'AKIA[0-9A-Z]{16}'                              # AWS access key
  'AIza[0-9A-Za-z_-]{35}'                         # Google API key
  'ghp_[a-zA-Z0-9]{36}'                           # GitHub PAT
  'gho_[a-zA-Z0-9]{36}'                           # GitHub OAuth
  'glpat-[a-zA-Z0-9_-]{20,}'                      # GitLab PAT
  'xoxb-[0-9]{10,}-[a-zA-Z0-9]{24}'               # Slack bot token
  'xoxp-[0-9]{10,}-[a-zA-Z0-9]{24}'               # Slack user token
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' # PEM private key block
  'JWT_SECRET=[^\$][^\{]'                          # Hardcoded JWT secret (not ${VAR} ref)
  'password\s*[:=]\s*["\x27][^$\{]'               # Hardcoded password
)

# ─── Excluded paths ─────────────────────────────────────────────────────────
EXCLUDES=(
  "node_modules"
  ".git"
  "_archive"
  "Heady-pre-production"
  ".env.example"
  ".env.template"
  ".env.rebuild.example"
  "pre-commit-secrets.sh"           # don't flag ourselves
)

build_exclude_args() {
  local args=""
  for ex in "${EXCLUDES[@]}"; do
    args="$args --exclude-dir=$ex"
  done
  echo "$args"
}

echo -e "${YELLOW}🔒 Heady Secret Scanner${NC}"
echo "────────────────────────────────────────"

# 1. Check for blocked file extensions in staged files (if in git context)
if git rev-parse --is-inside-work-tree &>/dev/null; then
  STAGED=$(git diff --cached --name-only 2>/dev/null || true)
  for ext in "${BLOCKED_EXTENSIONS[@]}"; do
    MATCHES=$(echo "$STAGED" | grep -E "\\${ext}$" || true)
    if [[ -n "$MATCHES" ]]; then
      echo -e "${RED}✘ Blocked file extension ${ext}:${NC}"
      echo "$MATCHES" | sed 's/^/    /'
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done

  # Check for .env files (non-example)
  ENV_MATCHES=$(echo "$STAGED" | grep -E '\.env$' | grep -v '.example' | grep -v '.template' || true)
  if [[ -n "$ENV_MATCHES" ]]; then
    echo -e "${RED}✘ .env file staged:${NC}"
    echo "$ENV_MATCHES" | sed 's/^/    /'
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
fi

# 2. Scan repo for secret patterns in source files
SCAN_DIR="${1:-.}"
EXCLUDE_ARGS=$(build_exclude_args)

for pattern in "${SECRET_PATTERNS[@]}"; do
  # shellcheck disable=SC2086
  HITS=$(grep -rnE "$pattern" "$SCAN_DIR" \
    --include='*.js' --include='*.ts' --include='*.json' \
    --include='*.yaml' --include='*.yml' --include='*.env' \
    --include='*.sh' --include='*.py' --include='*.toml' \
    $EXCLUDE_ARGS 2>/dev/null | head -5 || true)

  if [[ -n "$HITS" ]]; then
    echo -e "${RED}✘ Secret pattern detected: ${pattern:0:40}...${NC}"
    echo "$HITS" | sed 's/^/    /'
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# 3. Summary
echo "────────────────────────────────────────"
if [[ $VIOLATIONS -gt 0 ]]; then
  echo -e "${RED}✘ ${VIOLATIONS} violation(s) found. Commit blocked.${NC}"
  echo -e "${YELLOW}Fix: remove secrets from staged files or add to .gitignore${NC}"
  exit 1
else
  echo -e "${GREEN}✔ No secrets detected. Clean.${NC}"
  exit 0
fi
