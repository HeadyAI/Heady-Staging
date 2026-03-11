#!/usr/bin/env bash
# ============================================================
# HeadyMe — Create Active Production Repo
#
# The context file references github.com/HeadyMe/heady-production
# but no such public repo exists. All repos are archived.
#
# This script creates the heady-production repo as the active
# canonical monorepo for ongoing development.
#
# Prerequisites:
#   - GITHUB_TOKEN with repo and admin:org permissions
#   - gh CLI installed
#
# Usage: GITHUB_TOKEN=ghp_xxx bash create-production-repo.sh
# ============================================================

set -euo pipefail

ORG="HeadyMe"
REPO="heady-production"
DESCRIPTION="Heady AI Platform — Production Monorepo (Sacred Geometry Architecture v3.2.2)"

if ! command -v gh &> /dev/null; then
  echo "ERROR: gh CLI not installed"
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN not set"
  exit 1
fi

export GH_TOKEN="${GITHUB_TOKEN}"

echo "=== Creating ${ORG}/${REPO} ==="

# Check if repo already exists
EXISTS=$(gh repo view "${ORG}/${REPO}" --json name -q '.name' 2>/dev/null || echo "NOT_FOUND")

if [[ "$EXISTS" != "NOT_FOUND" ]]; then
  echo "Repo already exists: https://github.com/${ORG}/${REPO}"
  echo "Skipping creation."
else
  echo "Creating repo..."
  gh repo create "${ORG}/${REPO}" \
    --description "${DESCRIPTION}" \
    --private \
    --clone=false \
    --disable-wiki \
    --disable-issues=false

  echo "Created: https://github.com/${ORG}/${REPO}"
fi

echo ""
echo "=== Setting up repo structure ==="

# Create a temp directory for initial commit
TMPDIR=$(mktemp -d)
cd "$TMPDIR"

git init
git remote add origin "https://github.com/${ORG}/${REPO}.git"

# Create monorepo structure
mkdir -p {src/{bees,orchestration,pipeline,resilience,lifecycle,routes,prompts},configs/{prompts,domains,env},scripts,docs,services/{heady-brain,heady-buddy,heady-cache,heady-conductor,heady-embed,heady-eval,heady-federation,heady-guard,heady-health,heady-hive,heady-infer,heady-mcp,heady-onboarding,heady-orchestration,heady-projection,heady-security,heady-testing,heady-ui,heady-vector,heady-web},cloudflare/{workers,pages},infra/{docker,kubernetes,cloudflare},tests}

# Root package.json
cat > package.json << 'PACKAGE'
{
  "name": "heady-production",
  "version": "3.2.2",
  "description": "Heady AI Platform — Production Monorepo",
  "main": "src/heady-manager.js",
  "scripts": {
    "start": "node src/heady-manager.js",
    "dev": "node --watch src/heady-manager.js",
    "health": "node scripts/health-check.js",
    "healthcheck": "node scripts/health-check.js --full",
    "status": "pm2 list",
    "test": "jest --passWithNoTests",
    "lint": "eslint src/ --fix",
    "deploy": "bash scripts/deploy.sh",
    "deploy:auto": "bash scripts/deploy-auto.sh",
    "deploy:hf": "bash scripts/deploy-hf.sh",
    "build": "bash scripts/build-sites.sh",
    "vector:project": "node scripts/vector-project.js",
    "vector:autopilot": "node scripts/vector-autopilot.js",
    "vector:bootstrap": "node scripts/vector-bootstrap.js",
    "unified:runtime": "node scripts/unified-runtime.js",
    "system:sync": "node scripts/system-sync.js",
    "rebuild:unified": "bash scripts/rebuild-unified.sh",
    "rebuild:autonomy": "bash scripts/rebuild-autonomy.sh",
    "scan:stale": "node scripts/scan-stale.js",
    "scan:seo": "node scripts/scan-seo.js",
    "scan:quality": "node scripts/scan-quality.js",
    "brand:check": "node scripts/brand-check.js",
    "brand:fix": "node scripts/brand-fix.js",
    "test:domains": "node scripts/verify-domains.mjs",
    "test:branding": "node scripts/test-branding.js",
    "pipeline": "node scripts/run-pipeline.js",
    "hcfp": "node scripts/run-pipeline.js --full",
    "battle": "node scripts/battle-arena.js",
    "maintenance:ops": "node scripts/maintenance-ops.js",
    "headybee:optimize": "node scripts/optimize-bees.js",
    "ops:projection-maintenance": "node scripts/projection-maintenance.js"
  },
  "engines": {
    "node": ">=20"
  },
  "private": true
}
PACKAGE

# README
cat > README.md << 'README'
# Heady Production

> Sacred Geometry Architecture v3.2.2 | Codename: Aether

Heady AI Platform — multi-agent AI operating system with 20 specialized intelligence nodes,
federated liquid routing, Sacred Geometry orchestration, and post-quantum security.

## Quick Start

```bash
npm install
npm run health
npm start
```

## Architecture

See `docs/ARCHITECTURE.md` for the full system topology.

## Deployment

- **Cloud Run:** `npm run deploy`
- **Cloudflare Workers:** `cd cloudflare/workers && wrangler deploy`
- **HuggingFace:** `npm run deploy:hf`

## License

Proprietary — HeadySystems Inc.
README

# .gitignore
cat > .gitignore << 'GITIGNORE'
node_modules/
.env
.env.*
!.env.example
dist/
build/
*.log
.DS_Store
coverage/
.wrangler/
GITIGNORE

# Initial commit
git add -A
git commit -m "feat: initialize heady-production monorepo (v3.2.2 Aether)"

echo ""
echo "=== Ready to push ==="
echo "Run: cd ${TMPDIR} && git push -u origin main"
echo ""
echo "After pushing, set up:"
echo "  1. Branch protection on 'main'"
echo "  2. GitHub Actions (copy .github/workflows/ci.yml from this package)"
echo "  3. Secrets: CLOUDFLARE_API_TOKEN, GCP_SA_KEY, HF_TOKEN"

# Cleanup note
echo ""
echo "Temp directory: ${TMPDIR}"
echo "You can also clone and push from your own machine."
