#!/usr/bin/env bash
# ============================================================
# HeadyMe — Unarchive Repos
#
# All 7 public repos in HeadyMe org are archived as of 2026-03-07.
# This script unarchives them so development can resume.
#
# Prerequisites:
#   - GITHUB_TOKEN with admin:org and repo permissions
#   - gh CLI installed (https://cli.github.com)
#
# Usage: GITHUB_TOKEN=ghp_xxx bash unarchive-repos.sh
# ============================================================

set -euo pipefail

ORG="HeadyMe"

REPOS=(
  "headybuddy-web"
  "Heady"
  "sandbox"
  "Heady-pre-production"
  "sandbox-pre-production"
  "ai-workflow-engine"
  "main"
)

# Check prerequisites
if ! command -v gh &> /dev/null; then
  echo "ERROR: gh CLI not installed"
  echo "Install: https://cli.github.com"
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN not set"
  exit 1
fi

echo "=== HeadyMe Repo Unarchive ==="
echo "Org: ${ORG}"
echo "Repos: ${#REPOS[@]}"
echo ""

export GH_TOKEN="${GITHUB_TOKEN}"

for repo in "${REPOS[@]}"; do
  echo "--- ${ORG}/${repo} ---"
  
  # Check current state
  archived=$(gh repo view "${ORG}/${repo}" --json isArchived -q '.isArchived' 2>/dev/null || echo "error")
  
  if [[ "$archived" == "true" ]]; then
    echo "  Status: Archived"
    echo "  Unarchiving..."
    
    # Use API directly (gh repo unarchive doesn't exist in all versions)
    response=$(curl -s -X PATCH \
      -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${ORG}/${repo}" \
      -d '{"archived": false}')
    
    new_archived=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('archived', 'unknown'))" 2>/dev/null)
    
    if [[ "$new_archived" == "False" ]]; then
      echo "  Result: UNARCHIVED"
    else
      echo "  Result: May need admin permissions. Check manually."
      echo "  URL: https://github.com/${ORG}/${repo}/settings"
    fi
  elif [[ "$archived" == "false" ]]; then
    echo "  Status: Already active"
  else
    echo "  Status: Could not check (may be private or deleted)"
  fi
  
  echo ""
done

echo "=== Summary ==="
echo "Verify at: https://github.com/orgs/${ORG}/repositories"
echo ""
echo "After unarchiving, recommended next steps:"
echo "  1. Run create-production-repo.sh to set up the active monorepo"
echo "  2. Configure branch protection on main branches"
echo "  3. Set up GitHub Actions CI/CD"
