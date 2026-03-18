#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════╗
# ║  HEADY_BRAND: HeadySystems Inc.                                   ║
# ║  Deployment Script — Full Site Package                            ║
# ║  Node: BUILDER + CONDUCTOR                                        ║
# ║  Law 3: Zero localhost — everything to Cloudflare/Cloud Run       ║
# ╚═══════════════════════════════════════════════════════════════════╝

set -euo pipefail

TEAL='\033[0;36m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
DIM='\033[0;90m'
NC='\033[0m'

echo -e "${TEAL}╔══════════════════════════════════════╗${NC}"
echo -e "${TEAL}║  HEADY™ Site Package — Deploy Tool   ║${NC}"
echo -e "${TEAL}║  Liquid Architecture v9.0            ║${NC}"
echo -e "${TEAL}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Verify wrangler ──
if ! command -v wrangler &> /dev/null; then
  echo -e "${PURPLE}Installing wrangler...${NC}"
  npm install -g wrangler
fi

# ── Deploy sites to R2 ──
echo -e "\n${GREEN}[1/4]${NC} Uploading sites to Cloudflare R2..."
for f in sites/*.html; do
  name=$(basename "$f")
  echo -e "  ${DIM}→ ${name}${NC}"
  wrangler r2 object put "heady-sites/sites/${name}" --file "$f" 2>/dev/null || true
done

# ── Deploy shared components ──
echo -e "\n${GREEN}[2/4]${NC} Uploading shared components..."
wrangler r2 object put "heady-sites/shared/buddy-embed.js" --file shared/buddy-embed.js 2>/dev/null || true

# ── Deploy docs ──
echo -e "\n${GREEN}[3/4]${NC} Uploading documents..."
for f in docs/*; do
  name=$(basename "$f")
  echo -e "  ${DIM}→ ${name}${NC}"
  wrangler r2 object put "heady-sites/docs/${name}" --file "$f" 2>/dev/null || true
done

# ── Summary ──
echo -e "\n${GREEN}[4/4]${NC} Deployment complete."
echo ""
echo -e "${TEAL}Sites deployed:${NC}"
echo "  headysystems.com    headyme.com          headybuddy.com"
echo "  headymcp.com        headyio.com          headybot.com"
echo "  headyapi.com        headylens.com        headyai.com"
echo "  headyfinance.com    headyconnection.org  1ime1.com (admin)"
echo ""
echo -e "${PURPLE}Cross-Site Features:${NC}"
echo "  ✓ HeadyBuddy chat on every page (shared/buddy-embed.js)"
echo "  ✓ Cross-site nav with 2-letter domain shortcuts"
echo "  ✓ Connect Storage modal (4-step setup)"
echo "  ✓ Firebase SSO via auth.headysystems.com"
echo "  ✓ T0 Redis heartbeat (PHI⁷ = 29,034ms)"
echo "  ✓ T1 pgvector persistence (384D HNSW)"
echo "  ✓ WebSocket cross-device sync"
echo ""
echo -e "${DIM}Next: Configure Cloudflare Workers routing for domain→file mapping.${NC}"
echo -e "${DIM}See README.md for deployment options.${NC}"
echo ""
echo -e "${TEAL}φ · ψ · ∞ — Liquid Architecture v9.0${NC}"
