#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Heady™ Developer Setup Script
# Sets up a local development environment in < 5 minutes
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

HEADY_MIN_NODE=20
HEADY_MIN_NPM=10

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗"
echo "  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  ███████║█████╗  ███████║██║  ██║ ╚████╔╝ "
echo "  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝  "
echo "  ██║  ██║███████╗██║  ██║██████╔╝   ██║   "
echo "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝   "
echo -e "${NC}"
echo "  ∞ Sacred Geometry · φ-Scaled · CSL-Gated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

errors=0

# ─── Check Node.js ────────────────────────────────────────────────
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found${NC} — install v${HEADY_MIN_NODE}+ from https://nodejs.org"
        ((errors++))
        return
    fi
    local ver=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -ge "$HEADY_MIN_NODE" ]; then
        echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
    else
        echo -e "${RED}✗ Node.js $(node -v) — need v${HEADY_MIN_NODE}+${NC}"
        ((errors++))
    fi
}

# ─── Check npm ────────────────────────────────────────────────────
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        ((errors++))
        return
    fi
    local ver=$(npm -v | cut -d. -f1)
    if [ "$ver" -ge "$HEADY_MIN_NPM" ]; then
        echo -e "${GREEN}✓ npm $(npm -v)${NC}"
    else
        echo -e "${YELLOW}⚠ npm $(npm -v) — recommend v${HEADY_MIN_NPM}+${NC}"
    fi
}

# ─── Check Docker ─────────────────────────────────────────────────
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')${NC}"
    else
        echo -e "${YELLOW}⚠ Docker not found — optional for local services${NC}"
    fi
}

# ─── Check gcloud CLI ─────────────────────────────────────────────
check_gcloud() {
    if command -v gcloud &> /dev/null; then
        local proj=$(gcloud config get-value project 2>/dev/null || echo "none")
        echo -e "${GREEN}✓ gcloud CLI — project: ${proj}${NC}"
    else
        echo -e "${YELLOW}⚠ gcloud CLI not found — needed for Cloud Run deployment${NC}"
    fi
}

# ─── Check .env ───────────────────────────────────────────────────
check_env() {
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
    elif [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠ No .env file — copying from .env.example${NC}"
        cp .env.example .env
        echo -e "${GREEN}  Created .env from .env.example — edit with your values${NC}"
    else
        echo -e "${YELLOW}⚠ No .env file — create one with required environment variables${NC}"
    fi
}

# ─── Run checks ───────────────────────────────────────────────────
echo "Checking prerequisites..."
echo ""
check_node
check_npm
check_docker
check_gcloud
check_env
echo ""

if [ "$errors" -gt 0 ]; then
    echo -e "${RED}✗ ${errors} critical issue(s) found — fix before continuing${NC}"
    exit 1
fi

# ─── Install dependencies ─────────────────────────────────────────
if [ "${1:-}" != "--check" ]; then
    echo "Installing dependencies..."
    npm install 2>&1 | tail -5
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "✓ Heady™ dev environment ready!"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  Start dev server:     npm run dev"
    echo "  Run tests:            npm test"
    echo "  Run pipeline:         node src/orchestration/hc-full-pipeline.js"
    echo "  Docker compose:       docker-compose up"
    echo ""
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "✓ All prerequisite checks passed!"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi
