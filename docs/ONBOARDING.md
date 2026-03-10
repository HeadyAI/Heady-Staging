# Heady Platform — Developer Onboarding Guide

## Prerequisites
- Node.js 20+ LTS, Docker, Git (HeadyMe org SSH), PostgreSQL 16+ client, gcloud CLI, wrangler CLI

## Setup
```bash
git clone git@github.com:HeadyMe/Heady-pre-production.git
cd Heady-pre-production && npm ci && cp .env.example .env
```

## Architecture (5 Layers)
1. **Edge** (Cloudflare): Workers, Durable Objects, Pages
2. **Gateway**: Nginx + HeadyGateway (3340)
3. **Core Services**: 60+ Node.js microservices (ports 3310-3369)
4. **Infrastructure**: PostgreSQL/pgvector, NATS, PgBouncer, Prometheus/Grafana
5. **Security**: Session server, RBAC, CSP, vault, audit logger

## Key Concepts
- **Phi-Math**: All constants from phi/psi/Fibonacci (`shared/phi-math.js`)
- **CSL Engine**: Vector operations for routing (`shared/csl-engine.js`)
- **Sacred Geometry**: Concentric ring topology
- **Zero Magic Numbers**: Every constant must trace to phi/Fibonacci
- **CommonJS only**: require/module.exports (no ESM)
- **Structured JSON logging**: No console.log in production
- **httpOnly sessions**: NEVER store tokens in localStorage

## Making Changes
1. Feature branch from develop
2. Implement with full JSDoc
3. Add tests (assert module, no external frameworks)
4. Update CHANGELOG.md and ADRs
5. Run tests + security scan
6. Submit PR
