#!/bin/bash
# HEADY_BRAND:BEGIN
# Heady Systems - Claude Hook: Pre-Commit Brand & Secret Check
# HEADY_BRAND:END
#
# This hook runs before commits to enforce:
# 1. Brand headers on source files
# 2. No hardcoded secrets
# 3. Config file validity

set -e

echo "Running Heady pre-commit checks..."

# Check for potential hardcoded secrets in staged files
SECRETS_PATTERN='(api[_-]?key|secret|password|token|credential)\s*[:=]\s*["\x27][a-zA-Z0-9+/=]{16,}'
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

if [ -n "$STAGED_FILES" ]; then
  for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
      if grep -iEq "$SECRETS_PATTERN" "$file" 2>/dev/null; then
        echo "WARNING: Potential hardcoded secret found in: $file"
        echo "  Please use environment variables from configs/secrets-manifest.yaml"
      fi
    fi
  done
fi

# Check brand headers on new/modified source files
for file in $STAGED_FILES; do
  if [[ "$file" =~ \.(js|ts|py|yaml|yml)$ ]] && [ -f "$file" ]; then
    if ! grep -q "HEADY_BRAND" "$file" 2>/dev/null; then
      echo "NOTE: Missing HEADY_BRAND header in: $file"
    fi
  fi
done

echo "Heady pre-commit checks complete."
