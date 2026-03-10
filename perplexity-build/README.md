# HEADY™ Full System Build v2 — Deployable Package

**Generated**: 2026-03-09 (v2 Enhanced)
**Files**: 291
**Author**: HeadySystems Inc. (eric@headyconnection.org)

## Architecture Principles

1. **INSTANTANEOUS** — No priorities, no rankings, no orderings, no hierarchies. Everything concurrent and equal.
2. **φ-Scaled Everything** — Golden ratio constants, Fibonacci sequences, zero magic numbers
3. **CSL Gates** — 0.382 include, 0.618 boost, 0.718 inject
4. **HeadyAutoContext Everywhere** — Every service, page, bee, swarm, API endpoint
5. **Sacred Geometry** — Governs all numeric constants, visual patterns, orchestration topology
6. **51+ Patents** — CSL, Sacred Geometry, φ-scaling, HeadyBee architecture
7. **Zero Trust Security** — mTLS, httpOnly cookies, CSRF protection, redirect allowlists
8. **No Placeholders** — Production-ready, deployable code

## Contents

### /shared/ — Shared Libraries
- `js/phi-math.js` — φ-scaled constants, Fibonacci sequences, CSL thresholds
- `js/csl-engine.js` — CSL gate operations (AND, OR, NOT, IMPLY, XOR, CONSENSUS, GATE)
- `js/sacred-geometry-canvas.js` — 9 canvas patterns
- `js/heady-auth-widget.js` — Cross-site auth widget (relay iframe, heartbeat, CSRF, global sign-out)
- `js/heady-auto-context.js` — HeadyAutoContext (octree spatial index, CSL gates, vector memory, bee worker)
- `js/heady-bee-injector.js` — HeadyBee content injection
- `js/heady-cross-nav.js` — Cross-site navigation
- `js/heady-faq.js` — FAQ accordion
- `js/heady-scroll-counter.js` — Animated counters
- `css/heady-design-system.css` — Full φ-scaled design system
- `envoy-sidecar.yaml` — Envoy proxy config (mTLS, φ-scaled timeouts, circuit breakers)
- `consul-service.json` — Consul service discovery registration template
- `otel-config.yaml` — OpenTelemetry collector config
- `source-reference/` — 6 upstream source files for reference

### /auth/ — Firebase Authentication (Hardened)
- `auth.html` — Central auth page with:
  - httpOnly Secure SameSite=Strict cookies (NOT localStorage)
  - State/nonce parameters for OAuth flows
  - Redirect URL allowlist (CSRF protection)
  - Short JWT expiry (15 min) + refresh tokens
  - Token revocation blacklist via Firestore
  - Anonymous sign-in rate limiting (5/hour)
  - Relay iframe for cross-domain token sync

### /sites/ — 9 Production Websites (2000+ words each)
| Site | Domain | Words | Pattern |
|------|--------|-------|---------|
| HeadyMe | headyme.com | 2,399 | flower-of-life |
| HeadySystems | headysystems.com | 2,194 | metatrons-cube |
| HeadyAI | heady-ai.com | 2,170 | sri-yantra |
| HeadyOS | headyos.com | 2,015 | torus |
| HeadyConnection | headyconnection.org | 2,111 | seed-of-life |
| HeadyConnection Community | headyconnection.com | 2,029 | seed-of-life |
| HeadyEX | headyex.com | 2,133 | fibonacci-spiral |
| HeadyFinance | headyfinance.com | 2,117 | vesica-piscis |
| Admin Portal | admin.headysystems.com | 2,025 | metatrons-cube |

### /services/ — 50 Microservices (Enhanced)
Each service contains: `index.js`, `package.json`, `Dockerfile`

**Infrastructure patterns in every service:**
- HeadyAutoContext middleware (MANDATORY)
- OpenTelemetry distributed tracing (W3C Trace Context)
- Bulkhead pattern (Fibonacci-sized concurrent/queue limits)
- Consul service discovery registration
- φ-scaled timeouts, Fibonacci retry counts
- Structured JSON logging with correlation IDs
- 4 health endpoints: /health, /healthz, /health/live, /health/ready
- CSL domain-match routing (NEVER priority-based)

### /skills/ — 14 Perplexity Agent Skills
computer-use, deep-research, code-review, content-generation, patent-search, competitor-intel, drupal-content-sync, firebase-auth-orchestrator, sacred-geometry-css-generator, eval-orchestrator, rag-optimizer, feedback-loop, multi-agent-eval, domain-benchmarker

### /drupal-config/ — Drupal CMS Integration
- **13 content type definitions**: article, documentation, case_study, patent, event, grant_program, agent_listing, investor_update, testimonial, faq, product_catalog, news_release, media_asset
- **heady_vector_sync module**: Real-time webhook indexing (hook_entity_insert/update/delete) with φ-scaled polling fallback (5-15 min)
- **heady_cms, heady_admin, heady_control, heady_config, heady_content, heady_tasks, heady_sites modules**

### /animal-archetypes/ — 7 Cognitive Layers
OWL (wisdom), EAGLE (omniscience), DOLPHIN (creativity), RABBIT (multiplication), ANT (repetitive tasks), ELEPHANT (memory), BEAVER (structured building)

### Configuration & Docs
- `docker-compose.yml` — Full local dev: all 50 services + PostgreSQL/pgvector + Consul + OTel + Drupal
- `.env.template` — Environment variables
- `domain-aliases.json` — 22 domain alias mappings
- `site-specs.json` + `site-registry-v2.json` — Site configurations
- `UNBREAKABLE_LAWS.md` — 8 system laws (zero priority language)
- `MASTER_DIRECTIVES.md` — 10 operational directives
- `SYSTEM_PRIME_DIRECTIVE.md` — Identity + cognitive archetypes
- `HEADY_CONTEXT.md` — Project overview + infra map
- `heady-registry.json` — Full service registry

## Quick Start

```bash
# 1. Configure environment
cp .env.template .env
# Edit .env with your credentials

# 2. Start everything locally
docker compose up -d

# 3. Verify all services healthy
for port in $(seq 3310 3396); do
  curl -s http://localhost:$port/health | jq .service 2>/dev/null
done

# 4. Deploy to Cloud Run
gcloud run deploy SERVICE_NAME --image IMAGE --region us-east1 --project gen-lang-client-0920560496
```

## Deployment Targets
- **Cloud Run:** gen-lang-client-0920560496 / us-east1
- **Cloudflare:** Account 8b1fa38f282c691423c6399247d53323
- **Firebase:** Project gen-lang-client-0920560496
- **GitHub:** https://github.com/HeadyMe

---
© 2026 HeadySystems Inc. All Rights Reserved. 51+ Provisional Patents.
Built with Sacred Geometry · φ-Scaled Everything · INSTANTANEOUS
