# Heady™ Master Context — For Perplexity Computer Prompts
>
> **Version:** 3.2.3 | **Date:** 2026-03-08 | **Owner:** HeadySystems Inc. / HeadyMe

---

## 1. Identity & Organization

- **Company:** HeadySystems Inc.
- **Founder / CEO:** Eric Haywood (eric-haywood / headyme)
- **GitHub Org:** <https://github.com/HeadyMe> (32 repositories)
- **Main Repo:** `HeadyMe/Heady-pre-production-9f2f0642` (public, JavaScript, 21 open issues)
- **Package Name:** `heady-systems` v3.2.3
- **Architecture:** Continuous Latent Architecture (CLA) with Sacred Geometry (φ = 1.618)
- **IP:** 60+ provisional patents filed with USPTO
- **Monorepo Root:** `/home/headyme/Heady/`

---

## 2. GitHub Repositories (32 total)

### Active Production Repos

| Repo | Description | Visibility |
|------|-------------|------------|
| `Heady-pre-production-9f2f0642` | Official HeadySystems Inc. monorepo | Public |
| `heady-production` | Latent OS — Enterprise Production | Private |
| `headysystems-core` | AI Infrastructure Engine — self-healing, Sacred Geometry | Public |
| `headyos-core` | Operating System — latent OS powering continuous AI reasoning | Public |
| `headymcp-core` | Master Control Program — 31 MCP tools, autonomous orchestration | Public |
| `headybuddy-core` | AI Companion — personal AI buddy with persistent memory | Public |
| `headyconnection-core` | Community & Connection — collaborative AI workspace | Public |
| `headyapi-core` | API Gateway — unified API layer with rate limiting, auth, routing | Public |
| `headyio-core` | Developer SDK & IO — official SDK for building on Heady | Public |
| `headybot-core` | Bot Framework — autonomous bot orchestration with swarm intelligence | Public |
| `heady-docs` | Documentation Hub — Single Source of Truth | Public |
| `heady-production` | Live site: headysystems.com | Public |
| `headymcp-production` | Live site: headymcp.com | Public |
| `latent-core-dev` | Synaptic Dev Repo — two-way mirror between pgvector and Antigravity | Private |
| `ableton-edge-production` | Live Projection: Ableton SysEx Edge Node | Private |

### Templates

| Repo | Description |
|------|-------------|
| `template-heady-ui` | React micro-frontend with Module Federation |
| `template-swarm-bee` | Swarm Agent with Pub/Sub lifecycle |
| `template-mcp-server` | MCP protocol server shell |

### Archived Battle Arena Repos

`heady-rebuild-claude`, `heady-rebuild-gemini`, `heady-rebuild-gpt54`, `heady-rebuild-jules`, `heady-rebuild-perplexity`, `heady-rebuild-codex`, `heady-rebuild-headycoder`, `heady-rebuild-huggingface`

### Archived Legacy

`HeadyBuddy`, `HeadyAI-IDE`, `HeadyWeb`, `admin-ui`

---

## 3. Live Infrastructure — NEVER USE LOCALHOST

| Service | Live URL | Platform |
|---------|---------|----------|
| Onboarding + Auth | `https://heady-onboarding-bf4q4zywhq-ue.a.run.app` | Cloud Run |
| HeadyAI IDE | `https://heady-ide-bf4q4zywhq-ue.a.run.app` | Cloud Run |
| HeadyWeb IDE | `https://headyweb-ide-bf4q4zywhq-ue.a.run.app` | Cloud Run |
| headyos.com | CF Worker `headyos-site` | Cloudflare |
| heady-ai.com | CF Worker `heady-ai-org` | Cloudflare |
| headycloud.com | CF Worker `headycloud-site` | Cloudflare |
| headyme.com | CF Zone `7153f1efff9af0d91570c1c1be79e241` | Cloudflare |
| headybuddy.org | CF Zone `79ac0ab73fc7be9a5f0e475db078e592` | Cloudflare |
| headysystems.com | CF Zone `d71262d0faa509f890fd5fea413c39bc` | Cloudflare |

### GCP Project

- **Project ID:** `gen-lang-client-0920560496`
- **Region:** `us-east1`
- **Registry:** `us-east1-docker.pkg.dev/gen-lang-client-0920560496/cloud-run-source-deploy/`

### Cloudflare

- **Account ID:** `8b1fa38f282c691423c6399247d53323`
- **70+ domains** — all active zones

---

## 4. Monorepo Structure

```
/home/headyme/Heady/
├── services/                    # 25 service directories
│   ├── api-gateway.js           # Standalone gateway
│   ├── heady-brain/             # AI reasoning core (7 files)
│   ├── heady-buddy/             # AI companion widget (7 files)
│   ├── heady-cache/             # Caching layer (16 files)
│   ├── heady-chain/             # Blockchain/chain ops (16 files)
│   ├── heady-conductor/         # Auto-success orchestrator (7 files)
│   ├── heady-embed/             # Embedding service (11 files)
│   ├── heady-eval/              # Evaluation engine (20 files)
│   ├── heady-federation/        # Federation service (1 file)
│   ├── heady-guard/             # Security guard (18 files)
│   ├── heady-health/            # Health checks (12 files)
│   ├── heady-hive/              # Hive orchestration (1 file)
│   ├── heady-infer/             # Inference engine (21 files)
│   ├── heady-mcp/               # MCP protocol server (3 files)
│   ├── heady-midi/              # MIDI/music AI (24 files)
│   ├── heady-onboarding/        # Next.js auth + onboarding (71 files)
│   ├── heady-orchestration/     # Orchestration layer (2 files)
│   ├── heady-pilot-onboarding/  # Pilot onboarding flow (3 files)
│   ├── heady-projection/        # Projection engine (21 files)
│   ├── heady-security/          # Security services (6 files)
│   ├── heady-testing/           # Test framework (4 files)
│   ├── heady-ui/                # UI components + generative engine (9 files)
│   ├── heady-vector/            # Vector memory ops (15 files)
│   └── heady-web/               # Web portal + 12 sites + remotes (103 files)
├── packages/                    # 21 shared packages
│   ├── agent-identity/          # Agent ID management
│   ├── csl-router/              # CSL routing engine
│   ├── gateway/                 # Gateway package
│   ├── heady-sacred-geometry-sdk/ # Sacred Geometry SDK (21 files)
│   ├── heady-semantic-logic/    # Semantic logic (6 files)
│   ├── heady-semantic-logic-python/ # Python semantic logic
│   ├── kernel/                  # OS kernel
│   ├── latent-boundary/         # Latent boundary enforcement
│   ├── mcp-server/              # MCP server package
│   ├── memory-stream/           # Memory stream module
│   ├── observability-kernel/    # Observability
│   ├── orchestrator/            # Orchestrator package
│   ├── phi-math/                # Phi math utils
│   ├── phi-math-foundation/     # Full phi math foundation
│   ├── redis/                   # Redis client
│   ├── sdk/                     # Heady SDK
│   ├── shared/                  # Shared utilities (8 files)
│   ├── spatial-events/          # Spatial event system
│   ├── types/                   # TypeScript types
│   └── vector-memory/           # Vector memory package
├── src/                         # 2040 source files
│   ├── core/                    # CSL engine, API gateway v2
│   ├── services/                # Inference gateway, edge diffusion
│   ├── hcfp/                    # Continuous Fusion Protocol
│   ├── mcp/                     # MCP server + gateway
│   ├── edge-workers/            # Edge compute workers
│   ├── prompts/                 # System prompts
│   └── shared/                  # Phi-math, service connector
├── workers/                     # Cloudflare Workers
│   ├── api-gateway/             # API gateway worker
│   ├── auth-service/            # Auth worker
│   ├── edge-composer/           # Edge composition worker
│   └── mcp-transport/           # MCP transport worker
├── cloudflare/                  # Cloudflare configs
│   ├── heady-edge-node/         # Edge node (6 files)
│   ├── worker-ai-gateway/       # AI gateway worker
│   ├── worker-heady-router/     # Main router worker
│   ├── worker-mcp-telemetry/    # MCP telemetry worker
│   └── worker.js                # 22KB master worker
├── apps/                        # Web applications
│   ├── headyweb/                # Main HeadyWeb app (61 files)
│   ├── gateway/                 # Gateway app
│   ├── command-center/          # Command center UI
│   ├── heady-io-docs/           # HeadyIO documentation
│   └── heady-mcp-portal/        # MCP portal UI
├── platform-fixes/              # CF worker hotfixes (28 files)
├── infra/                       # Infrastructure (103 files)
├── enterprise/                  # Enterprise features (94 files)
├── configs/                     # Config files (273 files)
├── docs/                        # Documentation (567 files)
├── scripts/                     # Build/deploy scripts (73 files)
├── tests/                       # Test suites (226 files)
└── templates/                   # Templates (60 files)
```

---

## 5. 24 Web Properties (Canonical Site Registry)

### 8 Public Branded Domains

| ID | Domain | Purpose |
|----|--------|---------|
| headysystems | headysystems.com | Platform operations homepage |
| headyme | headyme.com | Personal AI command center |
| headyconnection | headyconnection.org | Nonprofit AI for social impact |
| headybuddy | headybuddy.org | Personal AI assistant & guide |
| headymcp | headymcp.com | MCP protocol hub & marketplace |
| headyio | headyio.com | Developer portal & SDK |
| headyapi | headyapi.com | Interactive API playground |
| headyos | headyos.com | AI agent operating system dashboard |

### 5 Internal/Secondary Sites

headyweb, admin-ui, headydocs, instant, 1ime1

### Additional Properties

- 6 alias/duplicate processes
- 2 Discord bots (heady-discord, heady-discord-connection)
- 3 HuggingFace Spaces (heady-ai, heady-systems, heady-connection)

---

## 6. Technology Stack

- **Runtime:** Node.js 20+
- **Frontend:** Next.js 14 (onboarding), React (remotes/apps), vanilla JS (sites)
- **Cloud:** Google Cloud Run, Cloudflare Workers, Cloudflare Pages
- **AI Providers:** Groq, Gemini, Claude, OpenAI, HuggingFace
- **Math Foundation:** Sacred Geometry — φ (1.618), Fibonacci sequences, CSL gates
- **Database:** PostgreSQL with pgvector, Redis, DuckDB
- **Observability:** OpenTelemetry, structured logging, health probes
- **Edge:** Cloudflare Workers with KV caching, Durable Objects
- **CI/CD:** GitHub Actions, Cloud Build, TruffleHog, CodeQL
- **Containerization:** Docker with φ-scaled resource limits
- **Package Manager:** pnpm (workspace)
- **Build:** Webpack 5 with Module Federation

---

## 7. Docker Production Services

From `docker-compose.production.yml` (v3.2.2):

- **postgres** — pgvector-enabled, φ-tuned settings (max_connections=55, random_page_cost=1.618)
- **redis** — allkeys-lru, 512MB, φ-tuned keepalive/hz
- **pgbouncer** — Fibonacci-scaled pool sizes (default=13, reserve=8, min=5)
- **otel-collector** — OpenTelemetry
- **heady-brain** — Core AI reasoning (port 8081, 1G RAM, 144 RPS rate limit)
- **heady-conductor** — Orchestration engine (port 8082, 55 concurrent agents)
- **heady-mcp** — MCP protocol server (port 8083, 13 tool slots, 89 sessions)

---

## 8. Sacred Rules (MUST FOLLOW)

1. **NEVER use localhost** — Everything goes through Cloud Run or Cloudflare
2. **φ-scaled everything** — spacing, sizing, scoring, routing all use golden ratio
3. **CSL gates replace boolean logic** — all decisions are confidence-weighted (0→1)
4. **Cloud-first** — deploy to Cloud Run/CF Workers, not local dev servers
5. **No placeholders** — every line of code must be real, functional, connected
6. **No asking permission for obvious fixes** — fix it and report results
7. **Fibonacci numbers for ALL numeric params** — 1,1,2,3,5,8,13,21,34,55,89,144,233,377

---

## 9. Deployment Commands

```bash
# Cloud Run (any service with Dockerfile or package.json):
gcloud run deploy SERVICE_NAME --source . --region us-east1 --allow-unauthenticated --quiet

# Cloudflare Worker:
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/8b1fa38f282c691423c6399247d53323/workers/scripts/WORKER_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "metadata=@metadata.json;type=application/json" \
  -F "worker.js=@worker.js;type=application/javascript+module"
```

---

## 10. Key Files

| File | Purpose |
|------|---------|
| `package.json` | heady-systems v3.2.3 monorepo root |
| `heady-registry.json` | Platform registry (services, deployments, projections) |
| `heady-manager.js` | Main entry point / micro-module manager |
| `services/heady-onboarding/src/app/api/brain/chat/route.ts` | Buddy chat backend |
| `services/heady-ui/generative-engine.js` | CSL-gated UI component factory |
| `src/services/inference-gateway.js` | Multi-provider AI gateway |
| `src/core/csl-engine/csl-engine.js` | Continuous Semantic Logic engine |
| `src/mcp/heady-mcp-server.js` | MCP stdio/SSE server |
| `configs/_domains/site-registry.yaml` | Canonical 24-site registry |
| `src/sites/site-registry.json` | Full site config with branding/features |
| `docker-compose.production.yml` | φ-scaled production Docker stack |
| `Dockerfile.production` | Production multi-stage Dockerfile |
| `cloudbuild.yaml` | GCP Cloud Build pipeline |
| `cloudflare/worker.js` | 22KB master Cloudflare worker |
| `cloudflare/wrangler.toml` | Wrangler configuration |
| `workers/wrangler.toml` | Workers gateway config |
| `ecosystem.config.cjs` | PM2 process management |
| `.env.template` | 25KB env template (all vars) |

---

## 11. Naming Conventions

### Package Scoping

- NPM scope: `@heady-ai/` (migrating from unscoped)
- Service naming: `heady-{service}` (e.g., `heady-brain`, `heady-conductor`)
- Worker naming: `worker-{purpose}` (e.g., `worker-ai-gateway`, `worker-heady-router`)
- Site IDs match domain slugs (e.g., `headysystems` for `headysystems.com`)

### Known Naming Inconsistencies to Fix

- `heady-registry.json` says version `3.0.1` but `package.json` says `3.2.3`
- `docker-compose.production.yml` references `v3.2.2`
- `heady-registry.json` says region `us-central1` but HEADY_CONTEXT says `us-east1`
- Some repos use `heady-rebuild-*` naming (archived battle arena)
- Mix of `-core` suffix repos and `-production` suffix repos
- Legacy `HeadyBuddy`, `HeadyAI-IDE`, `HeadyWeb` repos are PascalCase (archived)
- `headyconnection.org` vs `headyconnection.com` — two separate sites
- PM2 process names inconsistent: `site-headysystems` vs `site-headysystems-com`
- `src/sites/site-registry.json` has 12+ sites, `configs/_domains/site-registry.yaml` has 24
- Worker dir has `api-gateway/` but cloudflare dir also has `worker-ai-gateway/`

---

## 12. 20 Heady™ AI Nodes

HeadyBrain, HeadySwarm, HeadyCoder, HeadyCodex, HeadyCopilot, HeadyRefactor, HeadyBattle, HeadySims, HeadyMC, HeadyDecomp, HeadyMemory, HeadyEmbed, HeadySoul, HeadyVinci, HeadyDeploy, HeadyOps, HeadyHealth, HeadyMaid, HeadyMaintenance, HeadyResearch

---

## 13. Current Known Issues (Pre-Production → Production)

1. `heady-registry.json` environment says `"pre-production"` — needs `"production"`
2. Version mismatch: 3.0.1 (registry) vs 3.2.2 (docker) vs 3.2.3 (package.json)
3. Region mismatch: `us-central1` (registry) vs `us-east1` (HEADY_CONTEXT)
4. Several services have minimal file counts (heady-federation: 1, heady-hive: 1, heady-orchestration: 2)
5. `heady-pilot-onboarding` only has 3 files — may be incomplete
6. Workers and cloudflare directories have overlapping gateway configs
7. Some site directories in `~/sites/` may not match monorepo `services/heady-web/sites/`
8. Discord bots need deployment verification
9. HuggingFace spaces need content sync
10. `heady-buddy` exists both as top-level dir AND inside `services/`
