#!/usr/bin/env bash
set -euo pipefail

# Heady Platform — Pre-deploy scan
# Checks for localhost references, console.log, and TODO/FIXME markers.
# Exit code 1 if blocking issues found; 0 if clean.

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCAN_DIRS=("services" "shared" "packages")
ERRORS=0
WARNINGS=0

echo ""
echo -e "${BOLD}Heady Platform — Pre-deploy Scan${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build scan path arguments
PATHS=()
for dir in "${SCAN_DIRS[@]}"; do
  TARGET="$ROOT_DIR/$dir"
  if [ -d "$TARGET" ]; then
    PATHS+=("$TARGET")
  fi
done

if [ ${#PATHS[@]} -eq 0 ]; then
  echo -e "${RED}No directories to scan.${NC}"
  exit 1
fi

# ─── Scan 1: localhost / 127.0.0.1 references ──────────
echo -e "${BOLD}[1/3] Scanning for localhost references...${NC}"

LOCALHOST_MATCHES=$(grep -rn \
  --include='*.js' --include='*.ts' --include='*.jsx' --include='*.tsx' \
  --include='*.json' \
  -E '(localhost|127\.0\.0\.1)' \
  "${PATHS[@]}" 2>/dev/null \
  | grep -v 'node_modules' \
  | grep -v '.env.example' \
  | grep -v 'README.md' \
  | grep -v '\.test\.' \
  | grep -v '\.spec\.' \
  | grep -v 'k6-load-tests' \
  || true)

if [ -n "$LOCALHOST_MATCHES" ]; then
  echo -e "${RED}✗ Found localhost/127.0.0.1 references:${NC}"
  echo "$LOCALHOST_MATCHES" | head -21
  MATCH_COUNT=$(echo "$LOCALHOST_MATCHES" | wc -l)
  if [ "$MATCH_COUNT" -gt 21 ]; then
    echo "  ... and $((MATCH_COUNT - 21)) more"
  fi
  ERRORS=$((ERRORS + 1))
  echo ""
else
  echo -e "${GREEN}✓ No localhost references found${NC}"
fi

# ─── Scan 2: console.log / console.debug / etc ─────────
echo ""
echo -e "${BOLD}[2/3] Scanning for console.log statements...${NC}"

CONSOLE_MATCHES=$(grep -rn \
  --include='*.js' --include='*.ts' --include='*.jsx' --include='*.tsx' \
  -E 'console\.(log|debug|info|warn|error|trace)' \
  "${PATHS[@]}" 2>/dev/null \
  | grep -v 'node_modules' \
  | grep -v '\.test\.' \
  | grep -v '\.spec\.' \
  | grep -v 'eslint' \
  | grep -v '// ' \
  || true)

if [ -n "$CONSOLE_MATCHES" ]; then
  echo -e "${RED}✗ Found console.log statements:${NC}"
  echo "$CONSOLE_MATCHES" | head -21
  MATCH_COUNT=$(echo "$CONSOLE_MATCHES" | wc -l)
  if [ "$MATCH_COUNT" -gt 21 ]; then
    echo "  ... and $((MATCH_COUNT - 21)) more"
  fi
  ERRORS=$((ERRORS + 1))
  echo ""
else
  echo -e "${GREEN}✓ No console.log statements found${NC}"
fi

# ─── Scan 3: TODO / FIXME / HACK / XXX markers ─────────
echo ""
echo -e "${BOLD}[3/3] Scanning for TODO/FIXME markers...${NC}"

TODO_MATCHES=$(grep -rn \
  --include='*.js' --include='*.ts' --include='*.jsx' --include='*.tsx' \
  -E '(TODO|FIXME|HACK|XXX)' \
  "${PATHS[@]}" 2>/dev/null \
  | grep -v 'node_modules' \
  | grep -v 'eslint' \
  || true)

if [ -n "$TODO_MATCHES" ]; then
  echo -e "${YELLOW}⚠ Found TODO/FIXME markers (warning only):${NC}"
  echo "$TODO_MATCHES" | head -21
  MATCH_COUNT=$(echo "$TODO_MATCHES" | wc -l)
  if [ "$MATCH_COUNT" -gt 21 ]; then
    echo "  ... and $((MATCH_COUNT - 21)) more"
  fi
  WARNINGS=$((WARNINGS + 1))
  echo ""
else
  echo -e "${GREEN}✓ No TODO/FIXME markers found${NC}"
fi

# ─── Summary ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}${BOLD}BLOCKED: ${ERRORS} blocking issue(s) found.${NC}"
  echo "Fix localhost references and console.log statements before deploying."
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}PASSED with ${WARNINGS} warning(s).${NC}"
else
  echo -e "${GREEN}${BOLD}PASSED: All scans clean.${NC}"
fi

exit 0
