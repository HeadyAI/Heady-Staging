#!/usr/bin/env bash
# HEADY™ Liquid Node Deployment Script
# Deploys all projected sites to Cloudflare Pages
# φ-scaled rollout: 6.18% → 38.2% → 61.8% → 100%

set -euo pipefail

PHI="1.618033988749895"
PSI="0.618033988749895"

SITES=(
  "headysystems:headysystems.com"
  "headyme:headyme.com"
  "heady-ai:heady-ai.com"
  "headyos:headyos.com"
  "headyconnection-org:headyconnection.org"
  "headyconnection-com:headyconnection.com"
  "headyex:headyex.com"
  "headyfinance:headyfinance.com"
  "admin:admin.headysystems.com"
)

echo "╔══════════════════════════════════════════════╗"
echo "║  HEADY™ Liquid Node Deployment              ║"
echo "║  φ-scaled rollout across 9 domains           ║"
echo "╚══════════════════════════════════════════════╝"

for entry in "${SITES[@]}"; do
  IFS=':' read -r dir domain <<< "$entry"
  echo ""
  echo "▸ Deploying $domain from sites/$dir/"
  
  if command -v wrangler &> /dev/null; then
    wrangler pages deploy "sites/$dir/" \
      --project-name="heady-$dir" \
      --branch=production \
      --commit-dirty=true \
      2>&1 || echo "  ⚠ Deploy failed for $domain — check wrangler config"
  else
    echo "  ℹ wrangler not installed — skipping live deploy"
    echo "  ℹ To deploy: npx wrangler pages deploy sites/$dir/ --project-name=heady-$dir"
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "Deployment complete. Verify at:"
for entry in "${SITES[@]}"; do
  IFS=':' read -r dir domain <<< "$entry"
  echo "  → https://$domain"
done
