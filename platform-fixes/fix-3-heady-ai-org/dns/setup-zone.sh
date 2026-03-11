#!/usr/bin/env bash
# ============================================================
# heady-ai.org — Cloudflare Zone Setup
#
# FIX: heady-ai.org returns HTTP 000 (DNS failure).
# This script creates the Cloudflare zone and required DNS records.
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN with Zone:Edit, DNS:Edit permissions
#   - CLOUDFLARE_ACCOUNT_ID set in environment
#   - Domain registrar nameservers pointed to Cloudflare
#
# Usage: bash setup-zone.sh
# ============================================================

set -euo pipefail

DOMAIN="heady-ai.org"
CF_API="https://api.cloudflare.com/client/v4"

# Validate env
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_ACCOUNT_ID not set"
  exit 1
fi

HEADERS=(
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
  -H "Content-Type: application/json"
)

echo "=== Step 1: Check if zone exists ==="
ZONE_CHECK=$(curl -s "${CF_API}/zones?name=${DOMAIN}" "${HEADERS[@]}")
ZONE_COUNT=$(echo "$ZONE_CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin)['result_info']['count'])" 2>/dev/null || echo "0")

if [[ "$ZONE_COUNT" == "0" ]]; then
  echo "Zone ${DOMAIN} not found. Creating..."
  
  ZONE_CREATE=$(curl -s -X POST "${CF_API}/zones" "${HEADERS[@]}" \
    -d "{\"name\":\"${DOMAIN}\",\"account\":{\"id\":\"${CLOUDFLARE_ACCOUNT_ID}\"},\"jump_start\":true}")
  
  ZONE_ID=$(echo "$ZONE_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])" 2>/dev/null)
  
  if [[ -z "$ZONE_ID" || "$ZONE_ID" == "None" ]]; then
    echo "ERROR: Failed to create zone"
    echo "$ZONE_CREATE" | python3 -m json.tool 2>/dev/null || echo "$ZONE_CREATE"
    exit 1
  fi
  
  echo "Zone created: ${ZONE_ID}"
  
  # Get assigned nameservers
  NS=$(echo "$ZONE_CREATE" | python3 -c "import sys,json; ns=json.load(sys.stdin)['result']['name_servers']; print('\n'.join(ns))" 2>/dev/null)
  echo ""
  echo "IMPORTANT: Update your domain registrar nameservers to:"
  echo "$NS"
  echo ""
else
  ZONE_ID=$(echo "$ZONE_CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])" 2>/dev/null)
  echo "Zone exists: ${ZONE_ID}"
fi

echo ""
echo "=== Step 2: Create DNS records ==="

# Root A record (proxied) — points to Cloudflare Workers
create_dns() {
  local type=$1 name=$2 content=$3 proxied=${4:-true}
  echo "Creating ${type} ${name} → ${content} (proxied: ${proxied})"
  curl -s -X POST "${CF_API}/zones/${ZONE_ID}/dns_records" "${HEADERS[@]}" \
    -d "{\"type\":\"${type}\",\"name\":\"${name}\",\"content\":\"${content}\",\"proxied\":${proxied},\"ttl\":1}" \
    | python3 -c "import sys,json; r=json.load(sys.stdin); print('  OK' if r.get('success') else f'  WARN: {r}')" 2>/dev/null
}

# Root and www
create_dns "A" "${DOMAIN}" "192.0.2.1" "true"  # Dummy IP, Worker handles it
create_dns "CNAME" "www" "${DOMAIN}" "true"

# Subdomains matching heady-ai.org zone in context file
create_dns "A" "research" "192.0.2.1" "true"
create_dns "A" "models" "192.0.2.1" "true"

echo ""
echo "=== Step 3: Set SSL to Full (Strict) ==="
curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/ssl" "${HEADERS[@]}" \
  -d '{"value":"strict"}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('SSL: ' + r['result']['value'])" 2>/dev/null

echo ""
echo "=== Step 4: Enable Always Use HTTPS ==="
curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/always_use_https" "${HEADERS[@]}" \
  -d '{"value":"on"}' \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('Always HTTPS: ' + r['result']['value'])" 2>/dev/null

echo ""
echo "=== Step 5: Enable Auto Minify ==="
curl -s -X PATCH "${CF_API}/zones/${ZONE_ID}/settings/minify" "${HEADERS[@]}" \
  -d '{"value":{"js":"on","css":"on","html":"on"}}' \
  | python3 -c "import sys,json; print('Minify: enabled')" 2>/dev/null

echo ""
echo "=== DONE ==="
echo "Zone ID: ${ZONE_ID}"
echo "Next steps:"
echo "  1. Verify nameservers at your domain registrar"
echo "  2. Deploy the Worker: cd ../cloudflare && wrangler deploy"
echo "  3. Verify: curl -I https://${DOMAIN}"
