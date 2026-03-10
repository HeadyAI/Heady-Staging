#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Heady™ Developer Setup Script
# Zero to running system in < 5 minutes
# © 2026 HeadySystems Inc. — Eric Haywood, Founder
# ──────────────────────────────────────────────────────────────

set -euo pipefail

PHI="1.618"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}
╔════════════════════════════════════════════════╗
║   Heady™ Developer Setup — Sacred Geometry     ║
║   φ = $PHI | Concurrent-Equals Architecture    ║
╚════════════════════════════════════════════════╝${NC}"

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
  local label="$1"
  local cmd="$2"
  local required="${3:-true}"

  if eval "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $label"
    ((CHECKS_PASSED++))
  else
    if [ "$required" = "true" ]; then
      echo -e "  ${RED}✗${NC} $label (REQUIRED)"
      ((CHECKS_FAILED++))
    else
      echo -e "  ${YELLOW}⚠${NC} $label (optional)"
    fi
  fi
}

# ── 1. Prerequisites ──────────────────────────────────────────
echo -e "\n${CYAN}[1/5] Checking prerequisites...${NC}"

check "Node.js >= 20" "node -v | grep -E 'v(2[0-9]|[3-9][0-9])'"
check "pnpm installed" "command -v pnpm"
check "Docker" "docker --version"
check "Docker Compose" "docker compose version"
check "gcloud CLI" "gcloud --version" false
check "Git" "git --version"

# ── 2. Environment ────────────────────────────────────────────
echo -e "\n${CYAN}[2/5] Checking environment...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env" ]; then
  echo -e "  ${GREEN}✓${NC} .env file exists"
  ((CHECKS_PASSED++))
else
  echo -e "  ${YELLOW}⚠${NC} .env file missing — copying from .env.example"
  if [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo -e "  ${GREEN}✓${NC} Created .env from .env.example (edit with your values)"
    ((CHECKS_PASSED++))
  else
    echo -e "  ${RED}✗${NC} No .env.example found"
    ((CHECKS_FAILED++))
  fi
fi

# ── 3. Dependencies ───────────────────────────────────────────
echo -e "\n${CYAN}[3/5] Installing dependencies...${NC}"

cd "$PROJECT_ROOT"

if command -v pnpm &>/dev/null; then
  echo -e "  Installing via pnpm..."
  pnpm install --prefer-offline 2>&1 | tail -3
  echo -e "  ${GREEN}✓${NC} Dependencies installed"
  ((CHECKS_PASSED++))
else
  echo -e "  ${YELLOW}⚠${NC} pnpm not found, trying npm..."
  npm install 2>&1 | tail -3
  echo -e "  ${GREEN}✓${NC} Dependencies installed via npm"
  ((CHECKS_PASSED++))
fi

# ── 4. Docker Images ──────────────────────────────────────────
echo -e "\n${CYAN}[4/5] Pulling Docker images...${NC}"

if command -v docker &>/dev/null; then
  docker pull postgres:16 2>/dev/null && echo -e "  ${GREEN}✓${NC} postgres:16" || echo -e "  ${YELLOW}⚠${NC} postgres:16 (pull failed)"
  docker pull node:22-bookworm-slim 2>/dev/null && echo -e "  ${GREEN}✓${NC} node:22-bookworm-slim" || echo -e "  ${YELLOW}⚠${NC} node:22 (pull failed)"
  docker pull redis:7-alpine 2>/dev/null && echo -e "  ${GREEN}✓${NC} redis:7-alpine" || echo -e "  ${YELLOW}⚠${NC} redis (pull failed)"
else
  echo -e "  ${YELLOW}⚠${NC} Docker not available — skipping image pull"
fi

# ── 5. Summary ─────────────────────────────────────────────────
echo -e "\n${CYAN}[5/5] Setup Summary${NC}"
echo -e "  Passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "  Failed: ${RED}${CHECKS_FAILED}${NC}"

if [ "$CHECKS_FAILED" -gt 0 ]; then
  echo -e "\n${RED}Some checks failed. Fix the issues above before proceeding.${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ Setup complete! Start developing:${NC}"
echo -e "  ${CYAN}pnpm run dev${NC}          — Start all services in dev mode"
echo -e "  ${CYAN}docker compose up -d${NC}  — Start Docker services (Postgres, Redis)"
echo -e "  ${CYAN}pnpm run test${NC}         — Run all tests"
echo -e "  ${CYAN}pnpm run smoke${NC}        — Run smoke tests"
echo ""
echo -e "  ${CYAN}© 2026 HeadySystems Inc. — Eric Haywood, Founder${NC}"
