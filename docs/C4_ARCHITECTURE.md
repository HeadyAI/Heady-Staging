# C4_ARCHITECTURE.md — Heady Latent OS Architecture Model

> C4-style architecture documentation for the Heady platform.
> Author: Eric Haywood.

---

## Level 1: System Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                        External Systems                              │
│                                                                      │
│  [Users]     [Firebase Auth]   [LLM Providers]   [NATS/PgBouncer]   │
│     │              │                  │                  │            │
│     └──────────────┴──────────────────┴──────────────────┘            │
│                            │                                         │
│                    ┌───────▼────────┐                                 │
│                    │  Heady Latent  │                                 │
│                    │      OS        │                                 │
│                    └───────┬────────┘                                 │
│                            │                                         │
│     ┌──────────────┬───────┴───────┬──────────────┐                  │
│  [Cloudflare]  [Cloud Run]  [PostgreSQL/pgvector] [GitHub]           │
└──────────────────────────────────────────────────────────────────────┘
```

### External Dependencies
- **Firebase Auth**: Identity provider, relay iframe, postMessage, httpOnly cookies
- **LLM Providers**: Claude, GPT-4o, Gemini, Groq, Perplexity Sonar, Local Ollama
- **NATS**: JetStream event bus for inter-service communication
- **PgBouncer**: Connection pooling for PostgreSQL/pgvector
- **Cloudflare**: Edge compute (Workers, Pages), CDN, WAF
- **Cloud Run**: Container hosting (GCP project: gen-lang-client-0920560496, us-east1)
- **GitHub**: HeadyMe org — source of truth (genetic code)

---

## Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Heady Latent OS                             │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Shared     │  │    Core     │  │    Auth     │                  │
│  │  Foundation  │  │   Engine    │  │   Gateway   │                  │
│  │ (φ-Math,CSL, │  │(Evolution, │  │ (Firebase   │                  │
│  │  SacredGeo)  │  │ Persona,   │  │  relay,     │                  │
│  │  3 modules   │  │ Council..) │  │  httpOnly)  │                  │
│  └──────┬───────┘  │ 10 modules │  └──────┬──────┘                  │
│         │          └──────┬──────┘         │                         │
│  ┌──────▼──────────────────▼───────────────▼──────┐                  │
│  │                  Services Layer                 │                  │
│  │  auth-session | notification | analytics |      │                  │
│  │  billing | search | scheduler | migration |     │                  │
│  │  asset-pipeline | service-registry | mesh       │                  │
│  │  10 modules — Ports 3310-3317                   │                  │
│  └──────┬──────────────────────────────────────────┘                  │
│         │                                                            │
│  ┌──────▼──────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Agents    │  │    Memory    │  │  Orchestr.   │                │
│  │ BeeFactory, │  │ VectorStore, │  │ HCFP, Arena, │                │
│  │ Hive, Fed.  │  │ Embedding,  │  │ Swarm, Socr. │                │
│  │  3 modules  │  │ Projection, │  │  4 modules   │                │
│  └─────────────┘  │ Cache       │  └──────────────┘                │
│                   │  4 modules  │                                    │
│                   └─────────────┘                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Security   │  │   Scaling   │  │  Monitoring  │              │
│  │ RBAC,Crypto, │  │ CQRS,Saga, │  │ Health,Drift │              │
│  │ CSP,OWASP,  │  │ NATS,HNSW, │  │ Telemetry,  │              │
│  │ Logger,CORS │  │ PgBouncer, │  │ Incident    │              │
│  │ 12 modules  │  │ CloudRun,  │  │  4 modules  │              │
│  └──────────────┘  │ gRPC,Flags │  └──────────────┘              │
│                    │ 15 modules │                                  │
│                    └─────────────┘                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Deploy     │  │   Config    │  │   Websites   │              │
│  │ Container,  │  │ HeadyConfig │  │  Registry    │              │
│  │ CloudRun,   │  │ Pipeline,   │  │  9 domains   │              │
│  │ Cloudflare  │  │ Environment │  │  1 module    │              │
│  │  3 modules  │  │  3 modules  │  └──────────────┘              │
│  └──────────────┘  └─────────────┘                                │
│                                                                    │
│  ┌──────────────────────────────────────────────────┐              │
│  │              Infrastructure                       │              │
│  │  Docker | Envoy | NATS | PgBouncer | Consul |    │              │
│  │  OTel | Prometheus | CI/CD | Tests               │              │
│  │  8 infra + 2 CI + 6 tests + 2 scripts            │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Level 3: Component Diagram — Core Engine

```
┌───────────────────────────────────────────────────────────────┐
│                         Core Engine                           │
│                                                               │
│  HeadyManagerKernel ─── orchestrates all core components      │
│       │                                                       │
│       ├── EvolutionEngine ──── self-improving capability       │
│       ├── PersonaRouter ────── multi-persona AI routing        │
│       ├── WisdomStore ──────── semantic lesson accumulation    │
│       ├── BudgetTracker ────── LLM cost tracking & caps       │
│       ├── HeadyLens ────────── observation & introspection     │
│       ├── CouncilMode ──────── multi-model deliberation        │
│       ├── AutoSuccessEngine ── 7-stage automated pipeline      │
│       ├── HeadyBrains ──────── context gathering preprocessor  │
│       └── HeadyAutobiographer  event narrative construction    │
│                                                               │
│  All components:                                              │
│  - Import from shared/phi-math-v2.js for φ constants          │
│  - Use CSL gates instead of boolean if/else                   │
│  - Export via ESM (export default / export {})                 │
│  - SHA-256 hash all outputs                                   │
└───────────────────────────────────────────────────────────────┘
```

---

## Level 3: Component Diagram — Security Layer

```
┌───────────────────────────────────────────────────────────────┐
│                       Security Layer                          │
│                                                               │
│  ┌─ Zero-Trust Perimeter ──────────────────────────────────┐  │
│  │  CorsStrict ──────── origin allowlisting (15 domains)   │  │
│  │  CspMiddleware ───── nonce-based CSP headers             │  │
│  │  RequestSigner ───── HMAC-SHA256 with key rotation       │  │
│  │  WebsocketAuth ───── ticket-based WS + heartbeat         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ AI-Specific Defense ───────────────────────────────────┐  │
│  │  OWASPAIDefense ──── ML01-ML10 coverage                 │  │
│  │  PromptInjectionGuard  14 detection patterns + canary   │  │
│  │  AutonomyGuardrails ── action categorization + HITL     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Audit & Compliance ───────────────────────────────────┐  │
│  │  RbacEngine ──────── CSL-gated role permissions         │  │
│  │  CryptoAuditTrail ── SHA-256 chained audit log          │  │
│  │  StructuredLogger ── tamper-evident JSON logging         │  │
│  │  SecretManager ───── encrypted secret storage            │  │
│  │  SbomGenerator ───── CycloneDX + SPDX generation        │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
User Request → Cloudflare Edge
  → CorsStrict (origin check)
  → CspMiddleware (nonce injection)
  → RequestSigner (HMAC verification)
  → AuthGateway (Firebase relay, httpOnly cookie)
  → HeadyManagerKernel
    → HeadyBrains (context assembly)
    → PersonaRouter (classify intent)
    → HiveCoordinator (task decomposition + dispatch)
      → BeeFactory (spawn/reuse workers)
      → VectorStore (memory retrieval)
      → EmbeddingPipeline (generate embeddings)
      → LLM Router (model selection + failover)
    → ConsensusEngine (validate results)
    → ResultFusion (merge outputs)
  → StructuredLogger (audit entry)
  → CryptoAuditTrail (hash chain)
  → Response → User
```

---

## Deployment Topology

| Component | Host | Port Range | Profile |
|-----------|------|------------|---------|
| Inference Services | Cloud Run | 3310-3319 | inference |
| Memory Services | Cloud Run | 3320-3329 | worker |
| Agent Services | Cloud Run | 3330-3339 | worker |
| Orchestration Services | Cloud Run | 3340-3349 | api |
| Security Services | Cloud Run | 3350-3359 | api |
| Monitoring Services | Cloud Run | 3360-3369 | worker |
| Web Services | Cloudflare Pages | 443 | web |
| Data Services | Cloud Run | 3370-3379 | batch |
| Integration Services | Cloud Run | 3380-3389 | api |
| Specialized Services | Cloud Run | 3390-3396 | varies |
| PostgreSQL + pgvector | Cloud SQL | 5432 | — |
| PgBouncer | Sidecar | 6432 | — |
| NATS JetStream | Cloud Run | 4222 | — |
| Envoy Proxy | Sidecar | 9901 | — |
| Prometheus | Cloud Run | 9090 | — |
