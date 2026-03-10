#!/usr/bin/env bash
set -euo pipefail

# Heady Platform — Development Environment Setup
# Checks prerequisites, installs dependencies, starts infrastructure.

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

REQUIRED_NODE_MAJOR=20
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${BOLD}→${NC} $1"; }

ERRORS=0

echo ""
echo -e "${BOLD}Heady Platform — Development Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Check Node.js ≥ 20 ─────────────────────────────────
info "Checking Node.js..."
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
    pass "Node.js v${NODE_VERSION} (>= ${REQUIRED_NODE_MAJOR} required)"
  else
    fail "Node.js v${NODE_VERSION} — version ${REQUIRED_NODE_MAJOR}+ required"
    ERRORS=$((ERRORS + 1))
  fi
else
  fail "Node.js not found — install v${REQUIRED_NODE_MAJOR}+ from https://nodejs.org"
  ERRORS=$((ERRORS + 1))
fi

# ─── Check npm ───────────────────────────────────────────
if command -v npm &>/dev/null; then
  NPM_VERSION=$(npm -v)
  pass "npm v${NPM_VERSION}"
else
  fail "npm not found"
  ERRORS=$((ERRORS + 1))
fi

# ─── Check Docker ────────────────────────────────────────
info "Checking Docker..."
if command -v docker &>/dev/null; then
  DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
  pass "Docker v${DOCKER_VERSION}"

  if docker info &>/dev/null; then
    pass "Docker daemon is running"
  else
    fail "Docker daemon not running — start Docker Desktop or dockerd"
    ERRORS=$((ERRORS + 1))
  fi
else
  fail "Docker not found — install from https://docs.docker.com/get-docker/"
  ERRORS=$((ERRORS + 1))
fi

# ─── Check docker compose ───────────────────────────────
if docker compose version &>/dev/null; then
  COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
  pass "Docker Compose v${COMPOSE_VERSION}"
else
  warn "Docker Compose not found — needed for local infrastructure"
fi

# ─── Check gcloud (optional) ────────────────────────────
info "Checking gcloud CLI..."
if command -v gcloud &>/dev/null; then
  GCLOUD_VERSION=$(gcloud version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
  pass "gcloud CLI v${GCLOUD_VERSION}"
else
  warn "gcloud CLI not found — needed for GCP deployment (optional for local dev)"
fi

echo ""

# ─── Abort on errors ────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
  fail "${ERRORS} required prerequisite(s) missing. Fix the above errors and retry."
  exit 1
fi

echo -e "${GREEN}All prerequisites met.${NC}"
echo ""

# ─── Install dependencies ───────────────────────────────
info "Installing package dependencies..."

PACKAGES=(
  "packages/phi-math-foundation"
  "packages/structured-logger"
  "packages/health-probes"
  "packages/schema-registry"
)

SERVICES=(
  "services/auth-session-server"
  "services/notification-service"
  "services/analytics-service"
  "services/billing-service"
  "services/scheduler-service"
)

for dir in "${PACKAGES[@]}" "${SERVICES[@]}"; do
  TARGET="$ROOT_DIR/$dir"
  if [ -f "$TARGET/package.json" ]; then
    info "Installing $dir..."
    (cd "$TARGET" && npm install --silent) && pass "$dir" || warn "$dir install had warnings"
  fi
done

# ─── Link local packages ────────────────────────────────
info "Linking local @heady packages..."
for dir in "${PACKAGES[@]}"; do
  PKG_DIR="$ROOT_DIR/$dir"
  if [ -f "$PKG_DIR/package.json" ]; then
    (cd "$PKG_DIR" && npm link --silent 2>/dev/null) || true
  fi
done

for dir in "${SERVICES[@]}"; do
  SVC_DIR="$ROOT_DIR/$dir"
  if [ -f "$SVC_DIR/package.json" ]; then
    (cd "$SVC_DIR" && npm link @heady/phi-math-foundation @heady/structured-logger @heady/health-probes @heady/schema-registry --silent 2>/dev/null) || true
  fi
done
pass "Local packages linked"

# ─── Start infrastructure ───────────────────────────────
echo ""
info "Starting infrastructure services..."

COMPOSE_FILE="$ROOT_DIR/infra/docker/docker-compose.services.yml"
if [ -f "$COMPOSE_FILE" ]; then
  info "Starting PostgreSQL, Redis, PgBouncer, NATS..."
  (cd "$ROOT_DIR" && docker compose -f "$COMPOSE_FILE" up -d postgres redis pgbouncer nats 2>/dev/null) && \
    pass "Infrastructure containers started" || \
    warn "Could not start infrastructure — check Docker"
else
  warn "docker-compose.services.yml not found — skipping infrastructure startup"
fi

echo ""
echo -e "${BOLD}${GREEN}Setup complete.${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example files to .env in each service directory"
echo "  2. Fill in secrets (HMAC_SECRET, FIREBASE_SERVICE_ACCOUNT, STRIPE keys)"
echo "  3. Start services: cd services/<name> && npm start"
echo "  4. Health check: curl http://localhost:3380/health"
echo ""
