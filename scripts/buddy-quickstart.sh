#!/usr/bin/env bash
# ============================================================================
# Heady™ Buddy Quickstart — scaffolds a new site or app in seconds
# Usage:
#   bash scripts/buddy-quickstart.sh website my-portfolio
#   bash scripts/buddy-quickstart.sh app my-saas-app
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TYPE="${1:-}"
NAME="${2:-}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

banner() {
  echo -e "${CYAN}"
  echo "  ◆ Heady™ Buddy Quickstart"
  echo "  ─────────────────────────"
  echo -e "${NC}"
}

usage() {
  banner
  echo "Usage: bash scripts/buddy-quickstart.sh <type> <name>"
  echo ""
  echo "  type:  'website' or 'app'"
  echo "  name:  your project name (lowercase, no spaces)"
  echo ""
  echo "Examples:"
  echo "  bash scripts/buddy-quickstart.sh website my-portfolio"
  echo "  bash scripts/buddy-quickstart.sh app my-saas-app"
  exit 1
}

# ── Validate ─────────────────────────────────────────────────────────────────

if [[ -z "$TYPE" || -z "$NAME" ]]; then
  usage
fi

if [[ "$TYPE" != "website" && "$TYPE" != "app" ]]; then
  echo "❌ Type must be 'website' or 'app', got: $TYPE"
  exit 1
fi

if [[ -d "$REPO_ROOT/$NAME" ]]; then
  echo "❌ Directory '$NAME' already exists in the repo root."
  exit 1
fi

banner

# ── Website scaffold ─────────────────────────────────────────────────────────

if [[ "$TYPE" == "website" ]]; then
  echo -e "${GREEN}→ Scaffolding website: $NAME${NC}"

  cp -r "$REPO_ROOT/templates/template-heady-ui" "$REPO_ROOT/$NAME"

  # Rename package
  sed -i "s/@heady-ai\/template-ui/@buddy\/$NAME/g" "$REPO_ROOT/$NAME/package.json"

  # Update title
  sed -i "s/HeadyWeb Control Surface/$NAME — Built with Heady™/g" "$REPO_ROOT/$NAME/public/index.html" 2>/dev/null || true

  echo -e "${GREEN}✓ Website scaffolded at: $REPO_ROOT/$NAME${NC}"
  echo ""
  echo "Next steps:"
  echo "  cd $NAME"
  echo "  pnpm install"
  echo "  pnpm dev          # → http://localhost:3000"
  echo "  pnpm build        # → production bundle"
  echo ""
  echo "Deploy:"
  echo "  gcloud run deploy $NAME --source . --region us-central1 --allow-unauthenticated"
fi

# ── App scaffold ─────────────────────────────────────────────────────────────

if [[ "$TYPE" == "app" ]]; then
  echo -e "${GREEN}→ Scaffolding app: $NAME${NC}"

  cp -r "$REPO_ROOT/services/heady-onboarding" "$REPO_ROOT/$NAME"

  # Clean build artifacts
  rm -rf "$REPO_ROOT/$NAME/.next" "$REPO_ROOT/$NAME/node_modules" "$REPO_ROOT/$NAME/.turbo"

  # Copy env template
  if [[ -f "$REPO_ROOT/$NAME/.env.example" ]]; then
    cp "$REPO_ROOT/$NAME/.env.example" "$REPO_ROOT/$NAME/.env"
    echo -e "${YELLOW}⚠  .env copied from .env.example — fill in your secrets!${NC}"
  fi

  echo -e "${GREEN}✓ App scaffolded at: $REPO_ROOT/$NAME${NC}"
  echo ""
  echo "Next steps:"
  echo "  cd $NAME"
  echo "  npm install"
  echo "  nano .env          # ← Fill in DATABASE_URL, NEXTAUTH_SECRET, OAuth keys"
  echo "  npx prisma generate"
  echo "  npx prisma db push"
  echo "  npm run dev        # → http://localhost:3000"
  echo ""
  echo "Deploy:"
  echo "  gcloud run deploy $NAME --source . --region us-east1 --allow-unauthenticated"
fi

echo ""
echo -e "${CYAN}📖 Full guide: docs/BUDDY-BUILDER-GUIDE.md${NC}"
echo -e "${CYAN}🆘 Support: eric@headyconnection.org${NC}"
echo ""
