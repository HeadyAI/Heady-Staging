# Heady Platform Onboarding Guide

## Welcome
This guide covers everything needed to understand, develop, and deploy the Heady Latent OS platform.

## Quick Start

### Prerequisites
- Node.js 20+ (ESM support required)
- Docker and Docker Compose
- GCP CLI (gcloud) configured for project gen-lang-client-0920560496
- Cloudflare CLI (wrangler)

### Setup
```bash
# Clone the repository
git clone https://github.com/HeadyMe/Heady-pre-production.git
cd Heady-pre-production

# Run setup script
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# Start all services
docker compose -f infra/docker-compose.yml up -d

# Verify health
curl http://localhost:3310/health  # Auth Session Server
curl http://localhost:3314/health  # Search Service
```

## Architecture Overview

### Module Organization
```
heady-max-potential/
├── shared/          # φ-math, CSL engine, Sacred Geometry (imported by all)
├── core/            # Evolution, persona, wisdom, brains, manager kernel
├── auth/            # Auth gateway (Firebase relay)
├── services/        # 10 microservices (ports 3310-3317 + mesh + registry)
├── security/        # 8 security modules (RBAC, crypto, CSP, guardrails, etc.)
├── monitoring/      # Health probes, drift detection, telemetry, incident response
├── scaling/         # 10 modules (auto-scaler, CQRS, saga, feature flags, etc.)
├── orchestration/   # HCFP runner, arena mode, swarm definitions, Socratic loop
├── deploy/          # Container, Cloud Run, Cloudflare deployers
├── config/          # Environment, pipeline, Heady config
├── websites/        # Website registry (9 domains)
├── infra/           # Docker, Envoy, NATS, PgBouncer, Prometheus, OTel, Consul
├── ci/              # GitHub Actions, Cloud Build
├── scripts/         # Dev setup, Turbo config
├── tests/           # 6 test suites (shared, services, scaling, security, integration, compliance)
└── docs/            # ADRs, error codes, security model, guides, runbooks
```

### Core Principles (8 Unbreakable Laws)
1. **Thoroughness over speed** — Complete implementation only
2. **Complete implementation only** — No stubs, no TODOs, no placeholders
3. **φ-scaled everything** — All constants derive from golden ratio
4. **CSL gates replace boolean** — Continuous logic instead of if/else
5. **HeadyAutoContext mandatory** — Full context in every interaction
6. **Zero-trust security** — Every request verified
7. **Concurrent-equals** — No priority/ranking language
8. **Sacred Geometry** — Geometric orchestration topology

### The Golden Ratio Constants
```javascript
φ  = 1.6180339887   // Golden ratio
ψ  = 0.6180339887   // Conjugate (1/φ)
ψ² = 0.3819660113   // ψ squared
// Fibonacci: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597
```

### Service Ports
| Port | Service |
|------|---------|
| 3310 | Auth Session Server |
| 3311 | Notification Service |
| 3312 | Analytics Service |
| 3313 | Billing Service |
| 3314 | Search Service |
| 3315 | Scheduler Service |
| 3316 | Migration Service |
| 3317 | Asset Pipeline |
| 3380 | CQRS Manager |
| 3381 | Saga Coordinator |
| 3382 | Feature Flags |
| 3383 | Dead Letter Queue |
| 3384 | API Contracts |
| 3385 | Error Codes |
| 3386 | Proto Service |
| 3390 | CSP Middleware |
| 3391 | Prompt Injection Guard |
| 3392 | WebSocket Auth |
| 3393 | SBOM Generator |
| 3394 | Autonomy Guardrails |

## Development Workflow
1. All code must pass compliance audit (tests/compliance.test.js)
2. All constants must use φ-math (no magic numbers)
3. All decisions use CSL gates (no hard if/else)
4. All exports use ESM (no CommonJS)
5. All auth uses httpOnly cookies (no localStorage)
6. All names reference "Eric Haywood" (not "Eric Head")
7. All outputs hashed with SHA-256

## Deployment
- **Cloud Run**: GCP us-east1, project gen-lang-client-0920560496
- **Cloudflare**: Account 8b1fa38f282c691423c6399247d53323
- **CI/CD**: GitHub Actions (ci/github-actions.yml) + Cloud Build (ci/cloudbuild.yaml)
- **Monitoring**: Prometheus (infra/prometheus.yml) + OpenTelemetry (infra/otel-collector.yaml)
