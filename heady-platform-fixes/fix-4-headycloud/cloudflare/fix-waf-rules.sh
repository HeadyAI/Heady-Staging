#!/usr/bin/env bash
# ============================================================
# headycloud.com — WAF/Access Rule Cleanup
#
# FIX: headycloud.com returns 403 Forbidden.
# This script audits and removes overly restrictive rules.
#
# Possible causes:
#   1. Cloudflare Access (Zero Trust) app blocking public access
#   2. WAF custom rule with default-deny
#   3. IP Access Rules blocking
#   4. Hotlink protection or browser integrity check
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN with Zone:Edit permissions
#   - CLOUDFLARE_ACCOUNT_ID set in environment
#
# Usage: bash fix-waf-rules.sh
# ============================================================

set -euo pipefail

DOMAIN="headycloud.com"
CF_API="https://api.cloudflare.com/client/v4"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

HEADERS=(
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
  -H "Content-Type: application/json"
)

# Get zone ID
echo "=== Finding zone ID for ${DOMAIN} ==="
ZONE_RESULT=$(curl -s "${CF_API}/zones?name=${DOMAIN}" "${HEADERS[@]}")
ZONE_ID=$(echo "$ZONE_RESULT" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else 'NOT_FOUND')" 2>/dev/null)

if [[ "$ZONE_ID" == "NOT_FOUND" ]]; then
  echo "ERROR: Zone not found for ${DOMAIN}"
  exit 1
fi
echo "Zone ID: ${ZONE_ID}"

echo ""
echo "=== Step 1: Check Firewall Rules (legacy) ==="
FIREWALL_RULES=$(curl -s "${CF_API}/zones/${ZONE_ID}/firewall/rules" "${HEADERS[@]}")
echo "$FIREWALL_RULES" | python3 -c "
import sys, json
rules = json.load(sys.stdin).get('result', [])
if not rules:
    print('  No legacy firewall rules found')
else:
    for r in rules:
        print(f'  Rule: {r[\"id\"]} | Action: {r[\"action\"]} | Expression: {r.get(\"filter\",{}).get(\"expression\",\"N/A\")}')
        if r['action'] == 'block':
            print(f'    ^ BLOCKING RULE — this may be causing the 403')
" 2>/dev/null

echo ""
echo "=== Step 2: Check WAF Custom Rules (rulesets) ==="
RULESETS=$(curl -s "${CF_API}/zones/${ZONE_ID}/rulesets" "${HEADERS[@]}")
echo "$RULESETS" | python3 -c "
import sys, json
rulesets = json.load(sys.stdin).get('result', [])
if not rulesets:
    print('  No custom rulesets found')
else:
    for rs in rulesets:
        print(f'  Ruleset: {rs[\"id\"]} | Phase: {rs.get(\"phase\",\"unknown\")} | Name: {rs.get(\"name\",\"unnamed\")}')
" 2>/dev/null

echo ""
echo "=== Step 3: Check Access Applications (Zero Trust) ==="
if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  ACCESS_APPS=$(curl -s "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps" "${HEADERS[@]}")
  echo "$ACCESS_APPS" | python3 -c "
import sys, json
apps = json.load(sys.stdin).get('result', [])
cloud_apps = [a for a in apps if '${DOMAIN}' in str(a.get('domain','')) or '${DOMAIN}' in str(a.get('self_hosted_domains',[]))]
if not cloud_apps:
    print('  No Access apps found for ${DOMAIN}')
else:
    for a in cloud_apps:
        print(f'  Access App: {a[\"id\"]} | Name: {a[\"name\"]} | Type: {a.get(\"type\",\"unknown\")}')
        print(f'    ^ This Access application may be gating public access')
        print(f'    To remove: curl -X DELETE \"{CF_API}/accounts/\${CLOUDFLARE_ACCOUNT_ID}/access/apps/{a[\"id\"]}\"')
" 2>/dev/null
else
  echo "  Skipped (CLOUDFLARE_ACCOUNT_ID not set)"
fi

echo ""
echo "=== Step 4: Check IP Access Rules ==="
IP_RULES=$(curl -s "${CF_API}/zones/${ZONE_ID}/firewall/access_rules/rules" "${HEADERS[@]}")
echo "$IP_RULES" | python3 -c "
import sys, json
rules = json.load(sys.stdin).get('result', [])
block_rules = [r for r in rules if r.get('mode') == 'block']
if not block_rules:
    print('  No IP block rules found')
else:
    for r in block_rules:
        print(f'  IP Block: {r[\"id\"]} | Target: {r[\"configuration\"][\"target\"]}:{r[\"configuration\"][\"value\"]}')
" 2>/dev/null

echo ""
echo "=== Step 5: Check Security Settings ==="
echo "Browser Integrity Check:"
curl -s "${CF_API}/zones/${ZONE_ID}/settings/browser_check" "${HEADERS[@]}" \
  | python3 -c "import sys,json; print('  ' + json.load(sys.stdin)['result']['value'])" 2>/dev/null

echo "Security Level:"
curl -s "${CF_API}/zones/${ZONE_ID}/settings/security_level" "${HEADERS[@]}" \
  | python3 -c "import sys,json; print('  ' + json.load(sys.stdin)['result']['value'])" 2>/dev/null

echo ""
echo "=== Step 6: Recommended Fixes ==="
echo "1. Deploy the Worker (see wrangler.toml) — this provides an explicit origin"
echo "2. If Access app found: remove it or add an Allow rule for everyone"
echo "3. If blocking firewall rule found: delete or modify to Allow"
echo "4. Set security level to 'medium' if currently 'high' or 'under_attack':"
echo "   curl -X PATCH '${CF_API}/zones/${ZONE_ID}/settings/security_level' \\"
echo "     -H 'Authorization: Bearer \${CLOUDFLARE_API_TOKEN}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"value\":\"medium\"}'"
echo ""
echo "=== DONE ==="
echo "After fixing, verify: curl -I https://${DOMAIN}"
