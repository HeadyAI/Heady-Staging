#!/usr/bin/env bash
# ============================================================
# HuggingFace Spaces — Wake & Status Check
#
# FIX: Both headyme-heady-ai.hf.space and headyme-heady-demo.hf.space
# are unreachable (timeout / HTTP 000). Spaces are likely sleeping
# or paused.
#
# This script:
#   1. Checks Space status via HF API
#   2. Wakes sleeping Spaces
#   3. Restarts errored Spaces
#   4. Verifies they respond
#
# Prerequisites:
#   - HF_TOKEN (HuggingFace User Access Token with write scope)
#
# Usage: HF_TOKEN=hf_xxx bash wake-spaces.sh
# ============================================================

set -euo pipefail

HF_API="https://huggingface.co/api/spaces"
OWNER="HeadyMe"
SPACES=("heady-ai" "heady-demo")

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "ERROR: HF_TOKEN not set"
  echo "Get one at: https://huggingface.co/settings/tokens"
  exit 1
fi

HEADERS=(
  -H "Authorization: Bearer ${HF_TOKEN}"
  -H "Content-Type: application/json"
)

check_and_wake() {
  local space_name=$1
  local full_name="${OWNER}/${space_name}"
  local endpoint="https://${OWNER,,}-${space_name}.hf.space"
  
  echo "=== ${full_name} ==="
  
  # Get Space info
  echo "  Checking status..."
  local info
  info=$(curl -s "${HF_API}/${full_name}" "${HEADERS[@]}" 2>/dev/null)
  
  local runtime_stage
  runtime_stage=$(echo "$info" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    stage = data.get('runtime', {}).get('stage', 'UNKNOWN')
    hardware = data.get('runtime', {}).get('hardware', {}).get('current', 'unknown')
    print(f'{stage}|{hardware}')
except:
    print('UNKNOWN|unknown')
" 2>/dev/null)
  
  local stage="${runtime_stage%%|*}"
  local hardware="${runtime_stage##*|}"
  
  echo "  Stage: ${stage}"
  echo "  Hardware: ${hardware}"
  
  case "$stage" in
    RUNNING)
      echo "  Space is running. Testing endpoint..."
      local http_code
      http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$endpoint" 2>/dev/null || echo "000")
      echo "  HTTP: ${http_code}"
      if [[ "$http_code" == "200" ]]; then
        echo "  Status: HEALTHY"
      else
        echo "  Status: RUNNING but endpoint not responding (may need restart)"
        echo "  Restarting..."
        restart_space "$full_name"
      fi
      ;;
    
    SLEEPING|PAUSED|BUILD_ERROR|RUNTIME_ERROR|STOPPED)
      echo "  Space is ${stage}. Waking..."
      restart_space "$full_name"
      ;;
    
    BUILDING)
      echo "  Space is building. Wait for build to complete."
      ;;
    
    *)
      echo "  Unknown stage: ${stage}"
      echo "  Attempting restart..."
      restart_space "$full_name"
      ;;
  esac
  
  echo ""
}

restart_space() {
  local full_name=$1
  
  # Factory restart via API
  local result
  result=$(curl -s -X POST "${HF_API}/${full_name}/restart" "${HEADERS[@]}" 2>/dev/null)
  
  local success
  success=$(echo "$result" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('ok') or data.get('stage'):
        print('true')
    else:
        print('false')
except:
    print('false')
" 2>/dev/null)
  
  if [[ "$success" == "true" ]]; then
    echo "  Restart initiated. Space will rebuild and come online in 1-5 minutes."
  else
    echo "  Restart may have failed. Response: ${result}"
    echo "  Try manual restart at: https://huggingface.co/spaces/${full_name}/settings"
  fi
}

echo "HuggingFace Spaces — Wake & Status Check"
echo "Owner: ${OWNER}"
echo "Spaces: ${SPACES[*]}"
echo ""

for space in "${SPACES[@]}"; do
  check_and_wake "$space"
done

echo "=== Verification (wait 2-3 minutes then run) ==="
echo "curl -s -o /dev/null -w '%{http_code}' https://headyme-heady-ai.hf.space"
echo "curl -s -o /dev/null -w '%{http_code}' https://headyme-heady-demo.hf.space"
