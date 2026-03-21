---
title: "Law 05: Cross-Environment Purity"
domain: unbreakable-law
law_number: 5
semantic_tags: [localhost, environment, purity, no-local, cloud-deploy, configuration, secrets]
enforcement: ABSOLUTE_IMMUTABLE
---

# LAW 5: CROSS-ENVIRONMENT PURITY — ZERO LOCALHOST CONTAMINATION

Code works in ALL environments or it's broken. Localhost leaking to production is a **security incident**.

## Purity Checklist (Pre-Deploy Mandatory)

```
[ ] No hardcoded `localhost` in any non-dev-only file
[ ] No hardcoded port numbers — all from env vars
[ ] No ngrok, localtunnel, Cloudflare Tunnel, or any tunnel service references in production
[ ] No `127.0.0.1` in any configuration or code
[ ] No file paths assuming specific machine (e.g., /home/headyme/...)
[ ] Service discovery via domain-router, never direct URL construction
[ ] All API URLs built from env-based base URLs using URL constructor
[ ] CORS configured per-domain, never `*` in production
[ ] Auth tokens from Cloudflare Access or env vars, never inline in code
[ ] Database connections via pool with env-based connection URI
[ ] No `file://` protocol references in any web-facing code
[ ] No hardcoded IP addresses
[ ] No environment-specific branches (`if (env === 'development')` must be minimal and justified)
```

## Environment Resolution Order

1. **Environment variable** (highest priority, runtime-configurable)
2. **`.env` file** (development only, NEVER committed to git, in `.gitignore`)
3. **Cloudflare KV / Worker Secrets** (edge runtime)
4. **Google Secret Manager** (cloud runtime)
5. **Default value** (only for non-sensitive, non-URL config, always documented why)

## Pre-Deploy Scan (Automated Gate)

```bash
#!/bin/bash
# Must pass before ANY deployment — integrated into CI/CD
VIOLATIONS=$(grep -rn "localhost\|127\.0\.0\.1\|:3000\|:3001\|:8080\|:5432" \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.html" --include="*.yaml" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=_archive --exclude-dir=test \
  | grep -v "// dev-only" | grep -v "process.env" | grep -v ".env.example")
if [ -n "$VIOLATIONS" ]; then
  echo "🚨 BLOCKED: Localhost contamination found:"
  echo "$VIOLATIONS"
  exit 1
fi
```

## Domain Architecture

All Heady services resolve via canonical domains, never direct URLs:

- `headyme.com` — Primary portal
- `heady-ai.com` — AI services
- `headyapi.com` — Public API gateway
- `headybuddy.com` — Companion interface
- `headylearn.com` — Education platform
- `heady.build` — CI/CD and development tools
- Cloud Run services: `*.run.app` with custom domain mapping
- Cloudflare Workers: `*.workers.dev` with custom domain mapping
