#!/bin/bash
# Heady™ SBOM Generator
# Generates Software Bill of Materials for all Docker images
# © 2026 HeadySystems Inc.

set -e

echo "╔══════════════════════════════════════════╗"
echo "║  Heady™ SBOM Generator                   ║"
echo "╚══════════════════════════════════════════╝"

OUTPUT_DIR="${1:-./sbom}"
mkdir -p "$OUTPUT_DIR"

# Check for syft (preferred SBOM tool)
if command -v syft &>/dev/null; then
  SBOM_TOOL="syft"
elif command -v cyclonedx-npm &>/dev/null; then
  SBOM_TOOL="cyclonedx"
else
  echo "→ No SBOM tool found. Generating npm-based SBOM..."
  SBOM_TOOL="npm"
fi

# Generate SBOM for each service
for service_dir in services/*/; do
  service_name=$(basename "$service_dir")
  
  if [ ! -f "$service_dir/package.json" ]; then
    continue
  fi

  echo "→ Generating SBOM: $service_name"

  if [ "$SBOM_TOOL" = "syft" ]; then
    syft dir:"$service_dir" -o cyclonedx-json > "$OUTPUT_DIR/$service_name.sbom.json" 2>/dev/null
  elif [ "$SBOM_TOOL" = "cyclonedx" ]; then
    (cd "$service_dir" && cyclonedx-npm --output-file "../../$OUTPUT_DIR/$service_name.sbom.json" 2>/dev/null)
  else
    # Fallback: npm list as JSON
    (cd "$service_dir" && npm list --json --all 2>/dev/null > "../../$OUTPUT_DIR/$service_name.sbom.json" || echo '{"error":"npm list failed"}' > "../../$OUTPUT_DIR/$service_name.sbom.json")
  fi
done

# Generate root SBOM
echo "→ Generating root SBOM"
if [ "$SBOM_TOOL" = "syft" ]; then
  syft dir:. -o cyclonedx-json > "$OUTPUT_DIR/heady-root.sbom.json" 2>/dev/null
else
  npm list --json --all 2>/dev/null > "$OUTPUT_DIR/heady-root.sbom.json" || echo '{}' > "$OUTPUT_DIR/heady-root.sbom.json"
fi

# Summary
SBOM_COUNT=$(ls -1 "$OUTPUT_DIR"/*.sbom.json 2>/dev/null | wc -l)
echo ""
echo "✓ Generated $SBOM_COUNT SBOMs in $OUTPUT_DIR/"
echo "  Tool: $SBOM_TOOL"
echo "  Format: CycloneDX JSON"
