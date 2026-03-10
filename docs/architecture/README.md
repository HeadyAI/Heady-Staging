# Heady™ Architecture Guide

> System design, topology, data flow, and deployment architecture

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE & EDGE LAYER                     │
│  Cloudflare Pages  |  CDN  |  Edge Workers  |  WAF           │
├─────────────────────────────────────────────────────────────┤
│                   GATEWAY & ROUTING LAYER                     │
│  API Gateway (3370)  |  Domain Router (3366)  |  Envoy        │
├─────────────────────────────────────────────────────────────┤
│                  AUTH & SECURITY LAYER                        │
│  Auth Session (3360)  |  CSRF  |  CSP  |  Token Manager      │
├─────────────────────────────────────────────────────────────┤
│               ORCHESTRATION & EXECUTION LAYER                │
│  HeadyConductor  |  Pipeline (HCFP)  |  Liquid Scheduler     │
│  Bee Factory  |  Swarm Coordinator  |  Auto-Success Engine    │
├─────────────────────────────────────────────────────────────┤
│                 INTELLIGENCE & MODEL LAYER                    │
│  CSL Engine  |  CSL Router  |  Embedding Router               │
│  Vector Memory  |  Context Window Manager                     │
├─────────────────────────────────────────────────────────────┤
│                PERSISTENCE & MEMORY LAYER                    │
│  PostgreSQL + pgvector  |  Redis  |  3D Vector Memory         │
├─────────────────────────────────────────────────────────────┤
│              OBSERVABILITY & GOVERNANCE LAYER                 │
│  OpenTelemetry  |  Prometheus  |  Grafana  |  Budget Tracker  │
│  Governance Gate  |  Semantic Backpressure                    │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow

```
User Request
    │
    ▼
Cloudflare Edge Worker (edge-worker.js)
    │ ── CSL gate check (edge routing confidence)
    │ ── Edge caching for hot paths
    ▼
API Gateway (:3370)
    │ ── Request ID injection
    │ ── Auth verification (httpOnly cookie)
    │ ── CORS validation (9 domains)
    │ ── Rate limiting (φ-derived windows)
    │ ── CSP headers injection
    ▼
Domain Router (:3366) [if cross-domain]
    │ ── Route verification against canonical registry
    │ ── CSL-gated routing confidence
    │ ── Auth handoff relay code generation
    ▼
HeadyConductor (orchestration)
    │ ── Intent classification
    │ ── Node selection (Sacred Geometry topology)
    │ ── Pool assignment (Hot/Warm/Cold)
    ▼
Target Service(s)
    │ ── Business logic execution
    │ ── Vector memory operations
    │ ── CSL-gated decisions throughout
    ▼
HeadyCheck + HeadyAssure (governance)
    │ ── Quality validation
    │ ── Compliance certification
    ▼
Response → User
```

## Service Topology

| Service | Port | Protocol | Pool | Dependencies |
|---------|------|----------|------|-------------|
| API Gateway | 3370 | HTTP/REST | Hot | Auth, Router |
| Auth Session | 3360 | HTTP/REST | Hot | Firebase, Redis |
| Notification | 3361 | HTTP/SSE | Warm | Redis, Templates |
| Analytics | 3362 | HTTP/REST | Cold | PostgreSQL, pgvector |
| Scheduler | 3363 | HTTP/REST | Warm | Redis |
| Search | 3364 | HTTP/REST | Hot | pgvector, Embeddings |
| Onboarding | 3365 | HTTP/REST | Warm | Auth, Templates |
| Domain Router | 3366 | HTTP/REST | Hot | Domain Registry |

## Cross-Domain Auth Flow

```
User on headyme.com clicks "Go to HeadyAI"
    │
    ▼
Domain Router: verifyRoute('headyme.com', 'https://headyai.com')
    │ ── Checks canonical domain registry
    │ ── CSL gate: min(0.809, 0.882) = 0.809 ≥ 0.500 ✓
    ▼
Domain Router: initiateAuthHandoff(userId, 'headyme.com', 'https://headyai.com')
    │ ── Generates one-time relay code (21 bytes, base64url)
    │ ── Returns handoff URL: auth.headysystems.com/relay?code=...&dest=...
    ▼
Browser redirects to auth.headysystems.com/relay
    │ ── Relay verifies code (one-time, expires in 11 090ms)
    │ ── Sets httpOnly __Host-heady_session cookie for headyai.com
    │ ── Redirects to destination: headyai.com
    ▼
headyai.com loads with valid session
    │ ── Hidden iframe to auth.headysystems.com/bridge
    │ ── postMessage confirms session status
    │ ── All subsequent requests use httpOnly cookie
```

## Resilience Patterns

### Circuit Breaker (φ-scaled)
- **Failure threshold**: fib(5) = 5 consecutive failures
- **Open duration**: PHI_TIMING.PHI_6 = 17 944ms
- **Half-open probe**: 1 request allowed, φ-backoff on re-failure

### Exponential Backoff (φ-based)
- Base: 1 000ms
- Factor: φ (1.618...)
- Sequence: 1000 → 1618 → 2618 → 4236 → 6854 → 11090ms
- Jitter: ±ψ² (±38.2%)
- Max: PHI_TIMING.PHI_8 = 46 979ms

### Self-Healer
- Drift detection via cosine similarity (threshold: CSL_THRESHOLDS.MEDIUM = 0.809)
- Automatic node restart after fib(5) = 5 health check failures
- Quarantine and respawn with φ-backoff

### Semantic Backpressure
- SRE adaptive throttling with φ-derived pressure levels
- Semantic deduplication via cosine similarity
- CSL-gated priority scoring for load shedding

## Deployment

### Cloud Infrastructure
- **GCP Project**: gen-lang-client-0920560496
- **Region**: us-east1
- **Cloudflare Account**: 8b1fa38f282c691423c6399247d53323

### Docker Compose

```bash
# Full stack
docker-compose up -d

# Individual service
docker-compose up auth-session
```

### CI/CD Pipeline

```yaml
# Triggered on push to main
test → build → deploy-staging → integration-test → deploy-production
```

See [infrastructure/ci-cd/deploy.yaml](../../infrastructure/ci-cd/deploy.yaml) for full pipeline.
