---
name: heady-perplexity-computer-use
description: Skill for Perplexity Computer to build, test, and deploy full Heady system components. Use when asked to build services, wire infrastructure, generate code artifacts, run shell commands, create files, or deploy Heady components to Cloud Run or Cloudflare Workers. Triggers on phrases like "build the backend", "create the service", "deploy to Cloud Run", "wire up the infra", or any construction/deployment task in the Heady ecosystem.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: heady-system-build
---

# Heady Perplexity Computer Use

## When to Use This Skill

Use this skill when:

- Building Heady microservices (50+ services with /health endpoints and AutoContext middleware)
- Creating infrastructure configs (Envoy, Consul, OpenTelemetry, Kubernetes manifests)
- Generating skill files for the Heady platform
- Deploying services to Cloud Run (`gen-lang-client-0920560496 / us-east1`)
- Deploying to Cloudflare Workers (account `8b1fa38f282c691423c6399247d53323`)
- Wiring service registries, domain routers, or auth systems
- Running tests, linters, or build pipelines in the workspace

## Instructions

### Step 1 — Load Context Before Every Action

Before any build action:

1. Load `/home/user/workspace/heady-build-inputs.md` for the current spec
2. Read relevant source from `/home/user/workspace/heady-src/heady-preprod`
3. Check `/home/user/workspace/heady-perplexity-full-system-context/heady-perplexity-bundle/` for system directives
4. Verify the build output target: `/home/user/workspace/heady-system-build/`

### Step 2 — Apply Unbreakable Laws to All Generated Code

Every file must satisfy all 8 Unbreakable Laws:

1. **Thoroughness**: typed error classes, full error handling, not just happy path
2. **Root Cause**: no workarounds — solve the actual problem
3. **Context Maximization**: HeadyAutoContext middleware on every endpoint
4. **Deployable**: no stand-in markers, no DEFERRED_WORK_MARKERs, no scaffold markers without implementation
5. **No Localhost**: all URLs use environment variables, never hardcoded loopback literals
6. **10,000-Bee Scale**: Fibonacci pool sizes, phi-scaled timeouts
7. **Auto-Success Integrity**: phi-heartbeat, dynamic allocation
8. **Arena Mode**: generate 2+ candidate solutions, keep the best

### Step 3 — Service Generation Pattern

For every service:

```javascript
// Required: health endpoint
GET /health → { status: 'ok', service, uptime, activeRequests, version }
GET /healthz → same

// Required: AutoContext middleware on ALL routes
import { autoContextMiddleware } from '../../shared/auto-context-middleware.js';

// Required: structured logging with correlation IDs
import { log, emitSpan } from '../../shared/service-base.js';

// Required: phi-scaled timeouts
const timeout = Math.round(baseMs * PHI);

// Required: no priority fields — CSL domain match ONLY
// ❌ NEVER: priority: 'HIGH'
// ✅ ALWAYS: domain: 'security', cslScore: 0.882
```

### Step 4 — Ranking Language Removal Checklist

Before finalizing any orchestration artifact, verify:

- [ ] No `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` in task classification
- [ ] No `priority` field on tasks, bees, or swarms
- [ ] No priority queue sorting or ordering
- [ ] Stage 4 TRIAGE routes by CSL domain match, not importance
- [ ] All tasks dispatched concurrently via `Promise.all` or `setImmediate`
- [ ] Resource allocation uses phi-ratios, not priority tiers

### Step 5 — Deployment Targets

| Target | Command Pattern |
|--------|----------------|
| Cloud Run | `gcloud run deploy {service} --region us-east1 --project gen-lang-client-0920560496` |
| Cloudflare | `wrangler deploy --env production` in workers/ directory |
| Docker | `docker build -t gcr.io/gen-lang-client-0920560496/{service}:latest .` |
| Kubernetes | `kubectl apply -f infra/kubernetes/{service}/deployment.yaml` |

### Step 6 — Quality Gate Before Delivery

- All files under 500 lines (split if needed)
- All imports resolve to real files (no broken imports)
- All environment variables documented in comments
- Health endpoint tested through the container hostname or deployed service DNS

## Examples

**Input**: "Build the heady-brain service"
**Output**: Full service at `/home/user/workspace/heady-system-build/services/core-intelligence/heady-brain/` with `index.js`, `Dockerfile`, `package.json`, and Kubernetes manifest

**Input**: "Refactor swarm-coordinator to remove ranking"
**Output**: `swarm-coordinator-refactored.js` with all priority enums removed, CSL domain routing added

**Input**: "Wire Drupal webhook sync"
**Output**: Complete `drupal-vector-sync.js` with HMAC verification, JSON:API client, and polling loop
