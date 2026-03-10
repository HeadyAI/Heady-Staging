# Heady™ Latent OS — Changelog

## v5.3.0 (2026-03-10)

### Auth & Cross-Domain
- **NEW**: `shared/heady-domains.js` — Canonical domain registry (single source of truth for all 9 domains)
- **NEW**: `src/security/cross-domain-auth.js` — Cross-domain auth relay with one-time codes, PKCE, bridge iframe
- **NEW**: `src/security/token-manager.js` — Centralized token lifecycle (generate, verify, refresh, revoke)
- **NEW**: `src/security/security-headers.js` — CSP, HSTS, security response headers from canonical domain list
- **NEW**: `services/domain-router/` — Cross-domain link verification + auth handoff service (Port 3366)
- **FIX**: ALLOWED_ORIGINS mismatch — all services now import from `shared/heady-domains.js`

### Documentation Hub
- **NEW**: `docs/README.md` — Comprehensive documentation hub with navigation table
- **NEW**: `docs/getting-started/README.md` — Developer quickstart guide
- **NEW**: `docs/architecture/README.md` — System design, topology, data flow
- **NEW**: `docs/api-reference/README.md` — Complete endpoint reference for all 8 services
- **NEW**: `docs/services/` — Individual documentation for each of the 8 services
- **NEW**: `docs/security/README.md` — Auth flows, CSP, cross-domain security, CSL-gated confidence
- **NEW**: `docs/phi-compliance/README.md` — φ-math rules, threshold tables, compliance scoring
- **NEW**: ADR-004 (Cross-Domain Relay), ADR-005 (CSL over Boolean), ADR-006 (φ-Derived Constants)
- **NEW**: 8 operational runbooks + incident response runbook
- **NEW**: Indexed ADR and runbook directories

### Tests
- **NEW**: `tests/unit/cross-domain-auth.test.js` — 17 assertions
- **NEW**: `tests/unit/token-manager.test.js` — 12 assertions
- **NEW**: `tests/unit/heady-domains.test.js` — 17 assertions
- **NEW**: `tests/integration/domain-router.test.js` — 10 assertions
- **NEW**: `tests/integration/security-headers.test.js` — 8 assertions
- Total: 120+ assertions across 10 test files

## v5.2.0 (2026-03-09)
- Added API Gateway service (Port 3370)
- Added middleware layer (auth, CORS, errors, request-id)
- Added security layer (CSRF, input validation, secret management)
- Added utils (AppError, config loader, retry helper)
- Added liquid nodes (Durable Objects, edge workers)
- Added onboarding service (Port 3365)
- Added root Dockerfile and docker-compose.yml
- Added 2 integration test suites (35 assertions)
- Total: 117 files, 84 tests passing

## v5.1.0 (2026-03-09)
- Added 5 core services (auth, notification, analytics, scheduler, search)
- Added Colab integration (gateway, bridge, notebooks)
- Added security modules (CSP, rate limiter, prompt defense)
- Added observability (OpenTelemetry, Prometheus metrics)
- Added infrastructure (Docker, Envoy, Consul, Grafana, CI/CD)
- Added 3 unit test suites (49 assertions)
- Added 3 ADRs, ERROR_CODES.md, 2 runbooks
- Total: 87 files, 49 tests passing

## v5.0.0 (2026-03-09)
- Complete Latent OS core: 35 modules
- φ-math foundation: 100/100 compliance
- CSL engine, Sacred Geometry topology
- Resilience, memory, orchestration, pipeline, governance
- Budget tracking, semantic backpressure
- Self-healing, drift detection

## v4.0.0 (2026-03-09)
- Deep scan audit of 7 files + 13 repos
- Found and corrected 37 magic numbers
- Established zero-magic-numbers baseline
