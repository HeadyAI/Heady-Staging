# Heady™ Developer Onboarding Guide

**Welcome to HeadySystems Inc.** — the sovereign AI operating system built by Eric Haywood.

## Prerequisites

- **Node.js 20+**: `node --version` must show v20.x or higher
- **Docker**: `docker --version` and `docker compose version`
- **gcloud CLI**: `gcloud --version` (for Cloud Run deployments)
- **Git**: configured with access to github.com/HeadyMe

## Getting Started (< 5 minutes)

```bash
git clone https://github.com/HeadyMe/Heady.git && cd Heady
./scripts/setup-dev.sh
curl http://localhost:3300/health   # API Gateway
curl http://localhost:3310/health   # Heady Brain
```

## Architecture

### 50+ Microservices in 9 Domains
Inference, Memory, Agents, Orchestration, Security, Monitoring, Web, Data, Integration.

### 9 Websites
headyme.com, headysystems.com, heady-ai.com, headyos.com, headyconnection.org/.com, headyex.com, headyfinance.com, admin.headysystems.com

### 17-Swarm Matrix
Agents organized into 17 concurrent-equals swarms. No priority hierarchy.

## Key Concepts

### Sacred Geometry (φ = 1.618)
All constants: `@heady/phi-math-foundation`
- Timeouts: φ^n × 1000ms (1618, 2618, 4236ms)
- Caches: Fibonacci (34, 55, 89, 144, 233)
- Thresholds: phiThreshold(level)
- Rates: FIB[9]=34 anon, FIB[11]=89 auth, FIB[13]=233 enterprise

### CSL (Continuous Semantic Logic)
Confidence-weighted gates [0,1] replacing boolean.
MINIMUM≈0.500 → LOW≈0.691 → MEDIUM≈0.809 → HIGH≈0.882 → CRITICAL≈0.927

### Vector Memory
384-dim embeddings (all-MiniLM-L6-v2) in pgvector with HNSW indexing.

## Development Workflow

### Branches: feat/, fix/, docs/, perf/, security/
### Commits: Conventional (feat:, fix:, chore:, docs:, perf:, security:)
### PR: CI → lint/test/scan → review → squash merge

## Testing
- Unit: Jest (`npm test` per service)
- Load: k6 (`infra/k6-load-tests/`)
- Scan: `./scripts/scan-localhost.sh`

## Deployment (CI/CD)
Push → CI → Docker → Artifact Registry → Cloud Run canary (6.18% → 38.2% → 61.8% → 100%)

## Monitoring
- Prometheus: scrapes every 21s (FIB[8])
- Grafana: request rate, errors, latency
- Alerts: warning at ψ=0.618, critical at 0.809
