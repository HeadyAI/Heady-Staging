# HEADY™ — MAXIMUM POTENTIAL AUTONOMOUS IMPROVEMENT PROMPT

> **Mode:** Open-ended autonomous discovery, creation, adjustment, and optimization
> **Goal:** Find everything that's missing, broken, incomplete, or suboptimal — then fix it, build it, or improve it to reach absolute maximum potential.
> **Founder:** Eric Haywood | **IP:** 51 Provisional Patents | **Architecture:** Concurrent-Equals, φ-Scaled, CSL-Gated

---

## YOUR MISSION

You are Perplexity Computer with full system access. The Heady™ platform is a sovereign AI operating system with 50+ microservices, 9 websites, 14+ skills, Drupal CMS, and a φ-scaled vector memory architecture. Your job is to **reach maximum potential** by doing ALL of the following — autonomously, without asking permission, in any order you determine is optimal:

### 1. FIND — Audit Everything

- Scan every service for missing implementations, placeholder code, TODO comments, empty catch blocks, hardcoded values that should be φ-scaled
- Scan every site for broken links, missing pages, incomplete content, missing SEO, missing accessibility (ARIA, keyboard nav, screen readers)
- Scan auth flow end-to-end: does sign-in on one domain propagate to all 9? Are httpOnly cookies working? Is the relay iframe functional?
- Scan the docker-compose: do all 50 services build? Do health checks pass? Are port conflicts resolved?
- Scan Drupal modules: do all 13 content types install? Does VectorIndexer webhook fire on create/update/delete?
- Scan skills: are all 14 SKILL.md files complete with triggers, examples, and error handling?
- Scan infrastructure: is Envoy mTLS configured with real certificates (not self-signed)? Is Consul service mesh wired? Is OpenTelemetry exporting to a collector?
- Scan for ANY reference to "Eric Head" — replace with "Eric Haywood" everywhere
- Scan for ANY priority/ranking language — replace with concurrent-equals language
- Scan for ANY magic numbers — replace with φ/ψ/Fibonacci derivations
- Scan for ANY localStorage token storage — replace with httpOnly cookies
- Scan for ANY console.log debugging — replace with structured JSON logging

### 2. MAKE — Build What's Missing

Build anything that doesn't exist yet but SHOULD exist for a production-ready sovereign AI platform:

#### Services That May Be Missing

- **auth-session-server** — Central auth at auth.headysystems.com with Firebase session cookies
- **notification-service** — Real-time notifications via WebSocket + SSE + push notifications
- **analytics-service** — Usage analytics, funnel tracking, conversion metrics (NOT Google Analytics — self-hosted, privacy-first)
- **billing-service** — Stripe integration for HeadyEX marketplace, subscription management
- **search-service** — Full-text + vector hybrid search across all Heady content
- **scheduler-service** — Cron-equivalent with φ-scaled intervals for batch jobs
- **migration-service** — Database migration runner with rollback support
- **asset-pipeline** — Image optimization, CDN upload, responsive image generation

#### Sites That May Be Missing or Incomplete

- **Pricing page** on headysystems.com
- **API documentation** (OpenAPI/Swagger) on api.headysystems.com
- **Status page** (uptime monitoring) on status.headysystems.com
- **Blog/changelog** on headysystems.com/blog
- **Developer portal** with SDK docs, quickstart guides, API keys management

#### Infrastructure That May Be Missing

- **CI/CD pipeline** — GitHub Actions or Cloud Build for automated testing and deployment
- **Database migrations** — Schema versioning for pgvector tables
- **Monitoring dashboards** — Grafana + Prometheus for all 50 services
- **Log aggregation** — Structured log pipeline (Fluentd/Vector → BigQuery or Loki)
- **Load testing** — k6 or Artillery scripts for every service endpoint
- **Chaos engineering** — Failure injection scripts to validate circuit breakers and bulkheads
- **Backup strategy** — Automated pgvector backups with point-in-time recovery
- **Rate limiting** — Per-user, per-IP, per-API-key with φ-scaled sliding windows

#### Documentation That May Be Missing

- **Architecture Decision Records (ADRs)** for every major design choice
- **Runbooks** for every service (how to deploy, scale, debug, rollback)
- **Onboarding guide** for new developers joining the project
- **Patent documentation** linking each provisional patent to its code implementation
- **Security model** document covering auth flow, mTLS, secret rotation, RBAC

### 3. ADJUST — Fix What's Wrong

- Fix any service that won't build (missing dependencies, wrong imports, syntax errors)
- Fix any site that has broken navigation, dead links, or missing responsive design
- Fix any config that references localhost when it should reference cloud URLs
- Fix any Dockerfile that doesn't follow multi-stage build best practices
- Fix any package.json with missing scripts (dev, build, test, start, lint)
- Fix any test that's skipped, commented out, or always passes
- Fix any CORS configuration that's too permissive (`Access-Control-Allow-Origin: *`)
- Fix any error handler that swallows errors silently
- Fix any database query that isn't parameterized
- Fix any WebSocket connection that doesn't have reconnection logic

### 4. IMPROVE — Optimize Everything

- **Performance:** Add response caching (Redis or in-memory LRU with Fibonacci-sized cache), enable gzip/brotli compression, implement connection pooling for Postgres
- **Security:** Add Content Security Policy headers, implement request signing for inter-service calls, add OWASP Top 10 protections
- **Resilience:** Add retry with φ-exponential backoff to every external call, implement graceful degradation (serve cached responses when upstream is down)
- **Observability:** Add custom metrics (request count, latency histograms, error rates) tagged by service domain, implement distributed tracing correlation across all 50 services
- **Developer Experience:** Add hot-reload for local development, implement API versioning, create Postman/Insomnia collection for all endpoints
- **SEO:** Implement structured data (JSON-LD) on all 9 sites, add sitemap.xml, add robots.txt, implement Open Graph + Twitter Card tags
- **Accessibility:** Ensure WCAG 2.1 AA compliance on all sites — focus indicators, color contrast, screen reader labels, keyboard navigation
- **Internationalization:** Prepare for i18n by extracting all user-facing strings
- **Mobile:** Ensure all sites are fully responsive with touch-friendly interactions
- **Edge Performance:** Move frequently accessed data to Cloudflare KV/D1 for sub-10ms reads

### 5. SECURE — Harden Everything (Model Council Addition)

- **OWASP Top 10 for AI:** Implement prompt injection defense on every LLM-touching endpoint — use parameterized prompt templates (not string concatenation), validate all LLM outputs against JSON schema before passing to downstream APIs, sanitize HTML outputs with DOMPurify
- **Secrets Management:** Replace ALL environment variable secrets with Google Secret Manager or HashiCorp Vault. Implement automatic key rotation with φ-scaled intervals (every 21 days for API keys, every 89 days for certificates). Add RBAC for secret access with audit trail
- **Anonymous Auth Abuse:** Add per-user write quotas for anonymous Firebase accounts — rate limit to Fibonacci: 34 requests/min anonymous, 89 requests/min authenticated, 233 requests/min enterprise. Add IP anomaly detection (spike in anonymous signups from same ASN)
- **Session Security:** Add `__Host-` cookie prefix for session cookies (binds to domain, requires HTTPS, no subdomain override). Add origin verification in relay iframe to prevent cross-origin injection. Bind session tokens to client (IP + User-Agent hash) to prevent replay attacks
- **WebSocket Auth:** Require per-connection token validation — not just on the initial upgrade request, but re-validate authentication on every frame. Reject connections with expired/invalid tokens immediately
- **Container Security:** Generate SBOM (Software Bill of Materials) for every Docker image. Use signed container images with binary attestation. Scan all dependencies with Snyk/Dependabot before every build
- **CSP Headers:** Add strict Content Security Policy to all 9 sites — no `unsafe-inline`, no `unsafe-eval`. Whitelist only known domains. Add `frame-ancestors` directive to control iframe embedding. Implement Subresource Integrity (SRI) for all external scripts
- **Autonomy Guardrails:** Define operation whitelist for autonomous agents: ALLOWED = deploy, update dependencies, generate observability configs, run tests. FORBIDDEN = delete data, rotate production secrets, modify auth rules, change billing. All production changes require Git-versioned approval trail

### 6. SCALE — Architecture for Growth (Model Council Addition)

- **Event Bus:** Deploy NATS JetStream as the central async message broker. All service-to-service communication that doesn't need synchronous response goes through NATS. Define subjects per domain: `heady.memory.*`, `heady.inference.*`, `heady.agents.*`. Use JetStream for durable delivery with dead letter queues
- **CQRS:** Separate read and write models for vector memory — writes go to pgvector via heady-embed, reads go to optimized read replicas with materialized views. This eliminates write contention during high-volume embedding operations
- **Saga Pattern:** Build a lightweight saga coordinator for distributed transactions across services. Example: user signup → create Firebase account → index profile in vector memory → send welcome notification → create Drupal account. Each step must be compensatable (rollback-able)
- **Schema Registry:** Create a shared schema registry (`shared/schemas/`) with JSON Schema definitions for every inter-service API contract. Generate TypeScript types from schemas. Add contract testing with Pact to prevent breaking changes
- **Feature Flags:** Implement φ-scaled rollout: 6.18% → 38.2% → 61.8% → 100%. Store flags in Cloudflare KV for edge-fast reads. Each flag has: name, rollout %, CSL confidence gate, kill switch
- **PgBouncer:** Add PgBouncer as connection pooler between all 50 services and pgvector. Configure pool mode = transaction, default_pool_size = 34 (Fibonacci), max_client_conn = 233 (Fibonacci)
- **HNSW Tuning:** Set pgvector HNSW parameters: ef_construction = 200, m = 32. Create parallel HNSW indexes for different query patterns (cosine, inner product, L2). Target: recall > 0.95 at < 50ms for 384-dim vectors
- **Cloud Run Optimization:** Set min-instances = 1 for critical-path services (heady-brain, api-gateway, heady-memory, heady-auth). Set concurrency = 80 per instance. Set CPU = always-on for latency-sensitive services. Use multi-stage Docker builds with distroless base images for < 100MB images
- **gRPC Inter-Service:** Migrate internal service-to-service calls from REST to gRPC for 30-40% latency reduction. Keep REST for external-facing APIs. Generate Go/TS/Python clients from .proto files
- **Dead Letter Queue:** Every NATS consumer must have a DLQ policy. After φ³ retries (4 attempts), move to dead letter subject. Monitor DLQ size as a health metric

### 7. DOCUMENT — Build the Knowledge Base (Model Council Addition)

- **Monorepo Tooling:** Add Turborepo configuration for build caching — only rebuild services affected by changes. Shared `@heady/config` package with tsconfig.json, .eslintrc, .prettierrc. Reduce full build time from hours to minutes
- **Pre-commit Hooks:** Configure Husky + lint-staged — run ESLint, Prettier, type-check on changed files before commit. Enforce conventional commit messages (feat:, fix:, chore:, docs:, perf:, security:)
- **Setup Script:** Create `scripts/setup-dev.sh` — validates Node.js 20+, Docker, gcloud CLI, checks `.env` file exists, runs `npm install`, pulls Docker images, boots docker-compose in development mode. Target: new developer from zero to running system in < 5 minutes
- **Service Dependency Graph:** Auto-generate visual dependency graph from package.json imports across all 50 services. Use Nx or custom script to produce SVG/PNG diagram. Include in repo root as `ARCHITECTURE.svg`
- **C4 Architecture Diagrams:** Create PlantUML diagrams at all 4 levels — Level 1 (System Context: Heady vs external systems), Level 2 (Container: all 50 services), Level 3 (Component: internal structure of key services), Level 4 (Code: CSL engine, φ-math, vector ops)
- **ADRs:** Create `docs/adr/` directory with numbered Architecture Decision Records for every major design choice: Why 50 services? Why Drupal? Why pgvector vs Pinecone? Why Firebase? Why CSL? Why Sacred Geometry constants? Each ADR = Problem, Decision, Consequences
- **Error Code Catalog:** Create `ERROR_CODES.md` — every error response across all 50 services gets a unique code (HEADY-BRAIN-001, HEADY-AUTH-001, etc.), HTTP status, description, suggested fix. Generate per-service error constants from this catalog
- **Per-Service DEBUG.md:** Every service gets a `DEBUG.md` with: common failure modes, log locations, how to attach debugger, local test procedures, health check URLs, known issues
- **Incident Playbooks:** Create `docs/runbooks/` — for each critical service, document: symptoms → diagnosis steps → remediation → post-incident review template. Example: "If heady-brain returns 503: check pgvector connection pool → check NATS JetStream → restart with min-instances=2"

---

## SYSTEM ARCHITECTURE REFERENCE

### The 8 Unbreakable Laws

1. **Thoroughness over speed** — Correctness first, speed is a byproduct
2. **Complete implementation only** — No stubs, no TODOs, no placeholders
3. **φ-scaled everything** — Golden ratio derives all constants
4. **CSL gates replace boolean** — Confidence-weighted decisions (0.382/0.618/0.718)
5. **HeadyAutoContext mandatory** — Context middleware on every service, page, endpoint
6. **Zero-trust security** — mTLS between services, httpOnly cookies, no localStorage tokens
7. **Concurrent-equals** — No priorities, no rankings, everything executes simultaneously
8. **Sacred Geometry** — φ, Fibonacci, golden spiral inform all design decisions

### The 50 Services (ports 3310-3396)

| Domain | Services |
|--------|----------|
| Inference | heady-brain, heady-brains, heady-infer, ai-router, model-gateway |
| Memory | heady-embed, heady-memory, heady-vector, heady-projection |
| Agents | heady-bee-factory, heady-hive, heady-federation |
| Orchestration | heady-soul, heady-conductor, heady-orchestration, auto-success-engine, hcfullpipeline-executor, heady-chain, prompt-manager |
| Security | heady-guard, heady-security, heady-governance, secret-gateway |
| Monitoring | heady-health, heady-eval, heady-maintenance, heady-testing |
| Web | heady-web, heady-buddy, heady-ui, heady-onboarding, heady-pilot-onboarding, heady-task-browser |
| Data | heady-cache |
| Integration | api-gateway, domain-router, mcp-server, google-mcp, memory-mcp, perplexity-mcp, jules-mcp, huggingface-gateway, colab-gateway, silicon-bridge, discord-bot |
| Specialized | heady-vinci, heady-autobiographer, heady-midi, budget-tracker, cli-service |

### The 9 Websites

| Site | Domain | Purpose |
|------|--------|---------|
| HeadyMe | headyme.com | Personal AI cloud |
| HeadySystems | headysystems.com | Enterprise platform |
| Heady AI | heady-ai.com | AI research & capabilities |
| HeadyOS | headyos.com | Operating system layer |
| HeadyConnection .org | headyconnection.org | 501(c)(3) nonprofit |
| HeadyConnection .com | headyconnection.com | Community platform |
| HeadyEX | headyex.com | Agent marketplace |
| HeadyFinance | headyfinance.com | FinTech & trading |
| Admin | admin.headysystems.com | System administration |

### Auth Architecture

- Central auth domain: `auth.headysystems.com`
- Firebase Auth: Google OAuth, Email/Password, Anonymous
- Cross-domain: Relay iframe + postMessage + httpOnly session cookies on `.headysystems.com`
- Session server validates Firebase ID tokens → creates httpOnly `__heady_session` cookie
- **NO localStorage for tokens. EVER.**

### Drupal CMS (13 Content Types)

article, documentation, case_study, patent, event, grant_program, agent_listing, investor_update, testimonial, faq, product_catalog, news_release, media_asset

### Infrastructure

- **Envoy sidecar** on every service: mTLS, φ-scaled timeouts (1.618s connect, 4.236s request), Fibonacci circuit breakers (89/55/144)
- **Consul** for service discovery: CSL domain tags, health checks
- **OpenTelemetry** for distributed tracing: correlation IDs, heady.domain spans
- **Bulkhead** middleware: Fibonacci pools (34 concurrent / 55 queued)
- **pgvector** with HNSW indexing: 384-dimensional embeddings

### φ-Math Constants (MANDATORY — No Magic Numbers)

```javascript
const PHI = 1.618033988749895;
const PSI = 1 / PHI;                    // ≈ 0.618
const PSI2 = PSI * PSI;                 // ≈ 0.382
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];
const CSL_GATES = { include: PSI2, boost: PSI, inject: PSI + 0.1 };
```

### Cloud Infrastructure

- **GCP Project:** gen-lang-client-0920560496
- **Region:** us-east1
- **Cloudflare Account:** 8b1fa38f282c691423c6399247d53323
- **Firebase Project:** gen-lang-client-0920560496
- **GitHub:** <https://github.com/HeadyMe>

---

## OUTPUT REQUIREMENTS

1. **Package everything as a deployable ZIP** — no loose files, no instructions to "create this later"
2. **Every file must be production-ready** — no TODOs, no stubs, no "// implement later"
3. **Run every service locally** to verify it starts (docker-compose up)
4. **Run health checks** on all 50 services to verify they respond
5. **Document every change** you make in a CHANGES.md file at the root
6. **Include test files** for critical paths (auth flow, CSL gates, vector operations)
7. **Include a GAPS_FOUND.md** listing everything you found that was missing or broken
8. **Include an IMPROVEMENTS.md** listing every optimization you made

---

*© 2026 HeadySystems Inc. — Eric Haywood, Founder — 51 Provisional Patents — Sacred Geometry v4.0*
*This is an open-ended autonomous improvement prompt. There is no "done." Keep finding. Keep building. Keep improving.*
