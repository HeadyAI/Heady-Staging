# Heady™ Platform — Complete System Reference

**Version**: 3.2.0 Orion Patch  
**Updated**: 2026-03-10  
**Founder**: Eric Haywood (eric-head / headyme)
**Organization**: HeadyMe (GitHub: HeadyMe)  
**Cloud**: Google Cloud Run (gen-lang-client-0920560496, us-central1)  
**Edge**: Cloudflare Workers + DNS proxy (11 zones)  
**Repository**: ~36,740 files across services, workers, scripts, docs, infra, and sacred-projections  

---

## 1. Platform Overview

Heady™ is a sovereign AI platform built on Sacred Geometry principles (φ-ratio scaling, Fibonacci sequences, Continuous Semantic Logic). It operates as a Liquid Latent OS — a dynamic, self-healing, multi-agent system that routes AI workloads across providers (OpenAI, Anthropic, Google, Groq, Perplexity) with intelligent failover, caching, and cost optimization.

### Core Philosophy

- **Sovereign AI**: Users own their data, keys, and compute choices (BYOK)
- **Sacred Geometry**: All parameters, thresholds, and scaling use φ (1.618) and Fibonacci
- **Continuous Semantic Logic (CSL)**: Vector operations as logical gates — cosine AND, superposition OR, orthogonal NOT
- **Liquid Architecture**: Services, agents, and routing adapt dynamically based on load, cost, and quality signals
- **60+ provisional patents** covering CSL gates, geometric AI, and sovereign compute patterns

---

## 2. Domain Architecture

### Active Public Domains (12)

All domains serve branded sites via a single Cloud Run service (`headyme-site`) with host-based routing through Cloudflare Workers (`liquid-gateway-worker`).

| Domain | Brand | Tagline | Focus |
|--------|-------|---------|-------|
| headyme.com | HeadyMe | Your Sovereign AI | Primary platform / identity hub |
| headysystems.com | HeadySystems | Enterprise AI Architecture | Enterprise infrastructure |
| headyio.com | HeadyIO | Developer Platform | Developer APIs and tools |
| headyapi.com | HeadyAPI | Gateway Intelligence | API gateway and routing |
| headymcp.com | HeadyMCP | Tool Protocol | MCP server / tool protocol |
| headyos.com | HeadyOS | Liquid Operating System | Latent OS runtime |
| headyweb.com | HeadyWeb | Web Intelligence | Web-based AI interfaces |
| heady-ai.com | HeadyAI | Artificial Intelligence | AI capabilities hub |
| headybot.com | HeadyBot | Your AI Companion | Conversational agent |
| headyfinance.com | HeadyFinance | Sovereign Finance | Trading / FinOps |
| headylens.com | HeadyLens | Sovereign Sight | Vision AI / OCR / Design |
| headyconnection.org | HeadyConnection | Community Platform | Nonprofit / community (501c3) |

### Domain DNS Pattern

- A record: `192.0.2.1` (Cloudflare proxy)
- AAAA record: `100::` (Cloudflare proxy)
- Worker route: `domain.com/*` → `liquid-gateway-worker`
- Host header forwarding: `X-Forwarded-Host` → Cloud Run `dynamic-site-server.js`

---

## 3. Service Architecture

### Cloud Run Services

- **headyme-site**: Dynamic site server (Node.js) — renders all 12 branded sites
  - Host-based routing via `resolveSite(host)` function
  - Documentation routes: `/docs`, `/api-docs`, `/mcp-docs`
  - Auth providers: Google, GitHub, Anthropic, OpenAI, Groq, Perplexity, Hugging Face
  - Health endpoint: `/api/health`

### Backend Services

| Service | Purpose |
|---------|---------|
| api-gateway | Central API routing, structured pino logging |
| auth-session-server | Authentication sessions, cookie management |
| notification-service | Webhook and notification delivery |
| heady-onboarding | User onboarding, Firebase Auth integration |
| hcfullpipeline-executor | Pipeline task execution engine |
| heady-admin | Admin dashboard and management |
| heady-buddy | AI companion / conversational agent |
| heady-manager | Service orchestration with AutoContext |

### Cloudflare Workers (16)

| Worker | Purpose |
|--------|---------|
| liquid-gateway-worker | Main traffic routing for all domains |
| api-gateway | Edge API routing |
| auth-service | Edge authentication |
| edge-auth-worker | Edge authorization |
| edge-composer | Edge content composition |
| edge-proxy | Edge reverse proxy |
| gateway-worker | Gateway routing |
| heady-buddy-worker | AI companion edge logic |
| heady-mcp-worker | MCP protocol handler |
| mcp-transport | MCP transport layer (SSE/WebSocket) |
| secret-service | Secrets management |
| user-secret-service | User secrets vault |
| service-worker | Generic service worker |
| heartbeat.js | Health monitoring |

---

## 4. Source Code Modules

### Core (`src/`)

| Module | Purpose |
|--------|---------|
| heady_intelligence_verifier.js | AI output quality validation |
| hc_autobuild.js | Automated build orchestration |
| heady_story_driver.js | Story-driven AI generation |
| heady_maid.js | Cleanup and maintenance automation |
| hc_task_scheduler.js | Task scheduling with phi-scaled intervals |
| recon.js | Codebase reconnaissance and scanning |
| hc_billing.js | Billing and usage metering |
| hc_cloudflare.js | Cloudflare API integration |
| hc_integration_fabric.js | Service integration mesh |
| hc_store_driver.js | Data store abstraction |

### Services (`src/services/`)

- scanner-mcp-bridge.js — MCP tool interface for codebase scanner
- scheduler/scheduler-service.js — Job scheduling
- analytics/analytics-service.js — Usage analytics
- notification/notification-service.js — Notification delivery
- auth/auth-session-server.js — Auth session management

### Agents (`src/agents/`)

- claude-code-agent.js — Claude coding agent integration
- pipeline-handlers.js — Pipeline stage handlers

### Routes (`src/routes/`)

- auth-routes.js, claude-routes.js, imagination-routes.js
- notification-routes.js, swarm-routes.js, analytics-routes.js
- vm-token-routes.js

---

## 5. Frontend Components

### UI Components (`frontend/src/components/`)

| Component | Purpose |
|-----------|---------|
| Terminal.js | In-browser terminal emulator |
| FileTree.js | File browser with tree navigation |
| SettingsModal.js | User settings and preferences |

### Frontend Utilities (`frontend/src/utils/`)

- auth.js — Client-side authentication helpers, BroadcastChannel sync

---

## 6. HCFullPipeline — Master Pipeline

**Version**: 3.1.0  
**Total Tasks**: 70 (TB-001 through TB-070)  
**Stages**: ingest → plan → execute → optimize → self-critique → deploy  
**Config**: `configs/hcfullpipeline.yaml`

### Global Configuration

- Max concurrent tasks: 8
- Max retries: 3 (backoff: 500, 2000, 8000ms)
- Daily cost budget: $50
- Rate limit: 120 req/min
- Monte Carlo plan selection: enabled
- Self-critique loop: enabled
- Pattern engine: enabled

### Critical Priority Tasks

| ID | Task |
|----|------|
| TB-054 | Wire Firebase Admin SDK for server-side token verification |
| TB-057 | Implement session storage backend with httpOnly cookies |

### Major Priority Tasks

| ID | Task |
|----|------|
| TB-055 | Structured logging migration (50+ service files) |
| TB-058 | Implement CSL engine core (AND/OR/NOT/GATE/IMPLY) |
| TB-059 | Implement bee lifecycle, work-stealing, backpressure |
| TB-060 | Add OWASP guards, rate limits, Cloud Run min-instances |
| TB-068 | Complete OAuth token exchange for Google and GitHub |
| TB-069 | Eliminate CORS wildcard Access-Control-Allow-Origin: '*' |

### Minor Priority Tasks

| ID | Task |
|----|------|
| TB-056 | Remove duplicate cors-policy file |
| TB-061 | Create wrangler.toml for Cloudflare Workers CI/CD |
| TB-062 | Wire pytest/vitest test suite into package.json |
| TB-063 | Integrate HeadySystems v13 multi-site architecture |
| TB-064 | Wire scanner-mcp-bridge into MCP server |
| TB-065 | Deploy notification-service to Cloud Run |
| TB-066 | Integrate intelligence verifier into pipeline |
| TB-067 | Wire domain connectivity tests into CI |
| TB-070 | Map Colab Pro+ memberships as latent space operators |

---

## 7. AI Provider Integration

### Supported Providers

| Provider | Models | Use Case |
|----------|--------|----------|
| OpenAI | gpt-5.4-xhigh-fast | Primary code generation, chat |
| Anthropic | claude-opus-4.6-thinking | Deep reasoning, analysis |
| Google | gemini-3.1-pro-preview, gemini-3-flash-preview | Fast inference, multimodal |
| Groq | llama-3.3-70b-versatile | Ultra-low latency |
| Perplexity | sonar-pro, sonar-deep-research | Web search, citations |
| Hugging Face | Various | Embeddings, specialized models |

### Routing Strategy

- **fastest-wins**: Race providers, return first response
- **race_and_failover**: Race top 2, failover to next on failure
- **cost-optimized**: Route to cheapest provider meeting quality threshold
- **CSL-gated**: Use cosine similarity scoring to select best provider per task

---

## 8. Security Architecture

### Authentication

- Firebase Auth (client-side, server verification TODO)
- OAuth: Google, GitHub (launch routes + signed flow cookies)
- API Keys: OpenAI, Anthropic, Groq, Perplexity, Hugging Face (BYOK)
- Session: httpOnly cookies (backend implementation in progress)

### Edge Security

- Cloudflare WAF + DDoS protection on all 12 domains
- Workers-based request filtering
- CORS: Migrating from wildcard `*` to explicit domain whitelist

### Infrastructure

- Cloud Run with containerized services
- Docker Compose for local development
- Envoy proxy for service mesh routing
- Post-quantum cryptography (PQC) research in progress

---

## 9. Infrastructure

### Google Cloud

- **Project**: gen-lang-client-0920560496
- **Region**: us-central1
- **Services**: Cloud Run, Cloud Build, Artifact Registry
- **Firebase**: Auth, Hosting, Firestore (planned)

### Cloudflare

- **Zones**: 12 active domains
- **Workers**: 16 deployed workers
- **DNS**: Proxied A/AAAA records for all domains
- **Nameservers**: Cloudflare-managed (e.g., sunny.ns.cloudflare.com, vick.ns.cloudflare.com)

### Git Remotes

| Remote | Repository |
|--------|-----------|
| heady-testing | HeadyMe/Heady-Testing |
| staging | HeadyMe/Heady-Staging |
| production | HeadyMe/heady-production |

---

## 10. Agent Skills (60+)

The Heady ecosystem includes 60+ agent skills defined as structured instruction sets:

### Core Skills

- heady-deep-scan — Project-wide context mapping
- heady-memory-ops — 3D vector memory operations
- heady-code-generation — Multi-model code gen
- heady-deployment — Deploy, monitor, scale services
- heady-research — Web research with citations
- heady-multi-model — Cross-provider AI routing
- heady-security-audit — Vulnerability scanning

### Architecture Skills

- heady-liquid-gateway — Dynamic routing with provider racing
- heady-edge-ai — Ultra-low latency inference on Cloudflare
- heady-mcp-streaming-interface — MCP-compatible tool interface
- heady-gateway-routing — Multi-provider AI gateway
- heady-ide-control-plane — IDE as latent OS control plane

### Memory & Knowledge

- heady-companion-memory — Persistent long-term memory
- heady-memory-knowledge-os — Knowledge layer architecture
- heady-graph-rag-memory — Graph RAG for multi-hop reasoning
- heady-hybrid-vector-search — BM25 + dense vector search
- heady-embedding-router — Multi-provider embedding routing

### Operations

- heady-bee-swarm-ops — Worker lifecycle, 30+ bee types
- heady-incident-ops — Incident response and governance
- heady-reliability-orchestrator — Self-healing services
- heady-self-healing-lifecycle — Failure detection + recovery
- heady-drift-detection — Output drift monitoring

### Security

- heady-pqc-security — Post-quantum cryptography
- heady-mcp-gateway-zero-trust — Zero-trust tool execution
- heady-middleware-armor — Security headers, CORS, resilience

### Specialized

- heady-csl-engine — Continuous Semantic Logic implementation
- heady-phi-math-foundation — Golden ratio scaling for all params
- heady-battle-arena — Competitive AI evaluation
- heady-trading-intelligence — Trading signals + risk models
- heady-voice-relay — Speech-to-text, text-to-speech
- heady-midi-creative — MIDI music + creative AI
- heady-monetization-platform — Stripe billing, feature gates

---

## 11. Documentation Inventory

### Architecture & Design (docs/)

- ARCHITECTURE.md — System architecture overview
- HEADY_CONTEXT.md — Full system context (58KB)
- INFRASTRUCTURE_SETUP.md — Infrastructure setup guide
- SECURITY_MODEL.md — Security architecture (23KB)
- IDE_INTEGRATION.md — IDE integration protocol
- IMAGINATION_ENGINE.md — Imagination engine design
- HeadyAI-IDE-Fusion-Plan.md — IDE fusion architecture (34KB)
- HEADY_AUTOIDE.md — Auto IDE design (52KB)

### Operations

- HCFP_INTEGRATION_GUIDE.md — Pipeline integration guide
- HCFP_AUTO_DEPLOYMENT.md — Auto deployment guide
- SYSTEM_STATUS_OVERVIEW.md — System status dashboard
- heady-services-manual.md — Services operations manual (44KB)
- SERVICE_DEBUG_GUIDE.md — Debug and troubleshooting
- ERROR_REPORTING_RULES.md — Error handling standards (21KB)

### Reference

- heady-notebooklm-source.md — This document
- skills-summary.md — All 60+ skills cataloged (42KB)
- Pattern-Library.md — Design pattern library (17KB)
- URL_DOMAIN_STYLE_GUIDE.md — Domain standards (15KB)
- HEADY_NAMING_STANDARDS.md — Naming conventions (14KB)
- PATENT_MAP.md — Patent portfolio map

### Guides

- ONBOARDING.md — New user onboarding
- HeadyVM-Setup-Guide.md — VM setup instructions (17KB)
- final-deployment-report.md — Deployment history (20KB)
- Heady-Commands-Guide.md — CLI commands reference

### ADRs (Architecture Decision Records)

- 001-architecture-overview.md
- 001-why-50-services.md
- 0003-liquid-gateway.md

---

## 12. Testing & Validation

### Test Files

- tests/integration/domain-connectivity.test.js — Validates all 12 domains
- tests/test-db-connection.js — Database connectivity check
- training/hello-headystack.js — Stack training examples

### Validation Scripts

- scripts/validate-branding.js — Brand consistency checks
- scripts/health-check-all.mjs — Multi-service health check
- scripts/smoke-test.mjs — Post-deploy smoke tests
- scripts/domain-connectivity-test.js — Domain resolution tests
- scripts/phi-compliance-check.js — φ-ratio compliance validation

---

## 13. Key Metrics & Status

| Metric | Value |
|--------|-------|
| Total files | ~36,740 |
| Active domains | 12 |
| Cloud Run services | 1 (multi-site) |
| Cloudflare Workers | 16 |
| Pipeline tasks | 70 (TB-001–TB-070) |
| Agent skills | 60+ |
| Documentation files | 60+ |
| Scripts | 250+ |
| Provisional patents | 60+ |
| AI providers | 6 (OpenAI, Anthropic, Google, Groq, Perplexity, HuggingFace) |
| Git remotes | 3 (testing, staging, production) |

---

## 14. Sacred Geometry Constants

All system parameters derive from the golden ratio (φ ≈ 1.618033988749895):

| Constant | Value | Usage |
|----------|-------|-------|
| φ (phi) | 1.618033988749895 | Base scaling factor |
| 1/φ | 0.618033988749895 | Inverse scaling |
| φ² | 2.618033988749895 | Squared scaling |
| Fibonacci sequence | 1,1,2,3,5,8,13,21,34,55,89,144... | Cache sizes, batch sizes, queue depths |
| Sacred seed | heady-sacred-geometry-seed | Deterministic randomness |
| Bee capacity | 6765 (Fibonacci) | Max bee swarm size |
| Pipeline stages | 21 (Fibonacci) | Pipeline stage count |
| Auto-success cycle | 29034ms (φ-derived) | Base automation interval |

---

## 15. Brand Identity

- **Primary brand**: Heady™
- **Founder**: Eric Haywood
- **Tagline**: "Organic Systems · Breathing Interfaces"
- **Version format**: v3.x.x · [Patch Name]
- **Current version**: v3.2.0 · Orion Patch
- **Brand header**: ASCII art banner with Sacred Geometry branding
- **Color palette**: Dark theme with gradient accents per domain

---

*This document is the canonical source for Google NotebookLM. Upload this file as a source to create an AI-powered notebook for the entire Heady™ platform.*
