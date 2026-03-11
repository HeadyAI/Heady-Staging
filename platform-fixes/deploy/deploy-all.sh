#!/usr/bin/env bash
# ============================================================
# Heady Platform — Master Deploy Script
#
# Deploys all 5 fixes in the correct order with verification.
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN (Cloudflare Workers deploy)
#   - CLOUDFLARE_ACCOUNT_ID (Zone setup)
#   - HF_TOKEN (HuggingFace Spaces)
#   - GITHUB_TOKEN (repo operations)
#   - wrangler CLI installed
#   - node >= 20 installed
#
# Usage: bash deploy-all.sh [--skip-hf] [--skip-repos] [--dry-run]
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Parse flags
SKIP_HF=false
SKIP_REPOS=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --skip-hf) SKIP_HF=true ;;
    --skip-repos) SKIP_REPOS=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[DEPLOY]${NC} $1"; }
ok()  { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
fail() { echo -e "${RED}  ❌ $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      HEADY PLATFORM — MASTER DEPLOYMENT v3.2.2           ║"
echo "║      $(date -u +%Y-%m-%dT%H:%M:%SZ)                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "🔵 DRY RUN MODE — no changes will be made"
  echo ""
fi

# ── Pre-flight checks ────────────────────────────────────

log "Phase 0: Pre-flight checks"

check_env() {
  local var_name=$1
  local required=${2:-true}
  if [[ -z "${!var_name:-}" ]]; then
    if [[ "$required" == "true" ]]; then
      fail "${var_name} not set"
      return 1
    else
      warn "${var_name} not set (optional)"
    fi
  else
    ok "${var_name} set"
  fi
}

check_env "CLOUDFLARE_API_TOKEN" true
check_env "CLOUDFLARE_ACCOUNT_ID" true
check_env "HF_TOKEN" false
check_env "GITHUB_TOKEN" false

if command -v wrangler &> /dev/null; then
  ok "wrangler CLI found"
else
  fail "wrangler CLI not found (npm install -g wrangler)"
  exit 1
fi

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  ok "Node.js ${NODE_VERSION}"
else
  fail "node not found"
  exit 1
fi

echo ""

# ── Phase 1: Domain baseline ─────────────────────────────

log "Phase 1: Domain baseline (pre-deploy)"
if [[ "$DRY_RUN" == "false" ]]; then
  node "${ROOT_DIR}/domain-verification/verify-all-domains.mjs" 2>/dev/null || true
fi
echo ""

# ── Phase 2: Fix headyos.com (530) ───────────────────────

log "Phase 2: Fix headyos.com (530 → Worker origin)"
if [[ "$DRY_RUN" == "false" ]]; then
  cd "${ROOT_DIR}/fix-2-headyos/cloudflare"
  wrangler deploy 2>&1 && ok "headyos.com Worker deployed" || warn "headyos.com Worker deploy failed"
  cd "$ROOT_DIR"
else
  ok "Would deploy headyos.com Worker"
fi
echo ""

# ── Phase 3: Fix heady-ai.org (DNS) ──────────────────────

log "Phase 3: Fix heady-ai.org (DNS zone + Worker)"
if [[ "$DRY_RUN" == "false" ]]; then
  # Create zone first
  bash "${ROOT_DIR}/fix-3-heady-ai-org/dns/setup-zone.sh" 2>&1 || warn "Zone setup had issues (may already exist)"
  
  # Deploy Worker
  cd "${ROOT_DIR}/fix-3-heady-ai-org/cloudflare"
  wrangler deploy 2>&1 && ok "heady-ai.org Worker deployed" || warn "heady-ai.org Worker deploy failed"
  cd "$ROOT_DIR"
else
  ok "Would create heady-ai.org DNS zone and deploy Worker"
fi
echo ""

# ── Phase 4: Fix headycloud.com (403) ────────────────────

log "Phase 4: Fix headycloud.com (403 → WAF fix + Worker)"
if [[ "$DRY_RUN" == "false" ]]; then
  # Audit WAF rules
  bash "${ROOT_DIR}/fix-4-headycloud/cloudflare/fix-waf-rules.sh" 2>&1 || warn "WAF audit had issues"
  
  # Deploy Worker
  cd "${ROOT_DIR}/fix-4-headycloud/cloudflare"
  wrangler deploy 2>&1 && ok "headycloud.com Worker deployed" || warn "headycloud.com Worker deploy failed"
  cd "$ROOT_DIR"
else
  ok "Would fix WAF rules and deploy headycloud.com Worker"
fi
echo ""

# ── Phase 5: Wake HuggingFace Spaces ─────────────────────

log "Phase 5: Wake HuggingFace Spaces"
if [[ "$SKIP_HF" == "true" ]]; then
  warn "Skipped (--skip-hf flag)"
elif [[ -z "${HF_TOKEN:-}" ]]; then
  warn "Skipped (HF_TOKEN not set)"
elif [[ "$DRY_RUN" == "false" ]]; then
  bash "${ROOT_DIR}/fix-5-huggingface/scripts/wake-spaces.sh" 2>&1 || warn "HF wake had issues"
else
  ok "Would wake HuggingFace Spaces"
fi
echo ""

# ── Phase 6: Repo Bootstrap ──────────────────────────────

log "Phase 6: Repo Bootstrap"
if [[ "$SKIP_REPOS" == "true" ]]; then
  warn "Skipped (--skip-repos flag)"
elif [[ -z "${GITHUB_TOKEN:-}" ]]; then
  warn "Skipped (GITHUB_TOKEN not set)"
elif [[ "$DRY_RUN" == "false" ]]; then
  bash "${ROOT_DIR}/repo-bootstrap/scripts/unarchive-repos.sh" 2>&1 || warn "Unarchive had issues"
  bash "${ROOT_DIR}/repo-bootstrap/scripts/create-production-repo.sh" 2>&1 || warn "Repo creation had issues"
else
  ok "Would unarchive repos and create heady-production"
fi
echo ""

# ── Phase 7: Post-deploy verification ────────────────────

log "Phase 7: Post-deploy domain verification"
if [[ "$DRY_RUN" == "false" ]]; then
  echo "  Waiting 30s for DNS/Worker propagation..."
  sleep 30
  node "${ROOT_DIR}/domain-verification/verify-all-domains.mjs" 2>/dev/null || true
fi
echo ""

# ── Summary ───────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                     ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Fix 2: headyos.com       — Worker deployed (was 530)    ║"
echo "║  Fix 3: heady-ai.org      — DNS + Worker (was DNS fail)  ║"
echo "║  Fix 4: headycloud.com    — WAF fix + Worker (was 403)   ║"
echo "║  Fix 5: HuggingFace       — Spaces woken (were sleeping) ║"
echo "║  Fix 6: Repo Bootstrap    — Repos unarchived + monorepo  ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Fix 1 (Onboarding) requires manual deploy to headyme.com ║"
echo "║  Copy fix-1-onboarding/src into your Next.js project     ║"
echo "║  and deploy via Cloudflare Pages or npm run deploy        ║"
echo "║                                                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next: Deploy onboarding fix to headyme.com, then run:"
echo "  node domain-verification/verify-all-domains.mjs"
