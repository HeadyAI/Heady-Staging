#!/usr/bin/env bash
set -euo pipefail

# Heady Platform — Software Bill of Materials (SBOM) Generator
# Generates CycloneDX format SBOMs for all services using syft.
# Output: sbom/ directory with per-service and combined SBOMs.

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/sbom"
FORMAT="cyclonedx-json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${BOLD}→${NC} $1"; }

echo ""
echo -e "${BOLD}Heady Platform — SBOM Generation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Format: CycloneDX JSON"
echo "Timestamp: $TIMESTAMP"
echo ""

# ─── Check syft ─────────────────────────────────────────
if ! command -v syft &>/dev/null; then
  fail "syft not found."
  echo ""
  echo "Install syft:"
  echo "  curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin"
  echo "  # or"
  echo "  brew install syft"
  echo ""
  exit 1
fi

SYFT_VERSION=$(syft version 2>/dev/null | grep -oP 'Version:\s+\K.*' || syft --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
pass "syft v${SYFT_VERSION}"

# ─── Create output directory ────────────────────────────
mkdir -p "$OUTPUT_DIR"

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

ERRORS=0

# ─── Generate per-component SBOMs ──────────────────────
echo ""
info "Generating SBOMs for packages..."

for dir in "${PACKAGES[@]}"; do
  TARGET="$ROOT_DIR/$dir"
  NAME=$(basename "$dir")
  OUTPUT_FILE="$OUTPUT_DIR/${NAME}.cdx.json"

  if [ -d "$TARGET" ]; then
    info "Scanning $dir..."
    if syft "$TARGET" -o "$FORMAT" > "$OUTPUT_FILE" 2>/dev/null; then
      pass "$NAME → $(basename "$OUTPUT_FILE")"
    else
      fail "$NAME — syft scan failed"
      ERRORS=$((ERRORS + 1))
    fi
  else
    warn "$dir not found, skipping"
  fi
done

echo ""
info "Generating SBOMs for services..."

for dir in "${SERVICES[@]}"; do
  TARGET="$ROOT_DIR/$dir"
  NAME=$(basename "$dir")
  OUTPUT_FILE="$OUTPUT_DIR/${NAME}.cdx.json"

  if [ -d "$TARGET" ]; then
    info "Scanning $dir..."
    if syft "$TARGET" -o "$FORMAT" > "$OUTPUT_FILE" 2>/dev/null; then
      pass "$NAME → $(basename "$OUTPUT_FILE")"
    else
      fail "$NAME — syft scan failed"
      ERRORS=$((ERRORS + 1))
    fi
  else
    warn "$dir not found, skipping"
  fi
done

# ─── Generate Docker image SBOMs if images exist ───────
echo ""
info "Checking for Docker images..."

for dir in "${SERVICES[@]}"; do
  NAME=$(basename "$dir")
  IMAGE="heady/${NAME}:latest"
  OUTPUT_FILE="$OUTPUT_DIR/${NAME}-image.cdx.json"

  if docker image inspect "$IMAGE" &>/dev/null; then
    info "Scanning image $IMAGE..."
    if syft "$IMAGE" -o "$FORMAT" > "$OUTPUT_FILE" 2>/dev/null; then
      pass "$IMAGE → $(basename "$OUTPUT_FILE")"
    else
      warn "$IMAGE — image scan failed (non-blocking)"
    fi
  fi
done

# ─── Summary ────────────────────────────────────────────
echo ""
SBOM_COUNT=$(find "$OUTPUT_DIR" -name '*.cdx.json' -type f | wc -l)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}Generated ${SBOM_COUNT} SBOM file(s) in ${OUTPUT_DIR}/${NC}"

if [ "$ERRORS" -gt 0 ]; then
  fail "${ERRORS} scan(s) failed."
  exit 1
fi

pass "All SBOM scans complete."
echo ""

# List output files
ls -la "$OUTPUT_DIR"/*.cdx.json 2>/dev/null || true
echo ""
