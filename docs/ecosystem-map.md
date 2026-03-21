# Heady Ecosystem Map — Complete Reference

> © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

---

## Domain Map

| Domain | Role | Stack |
|--------|------|-------|
| headyme.com | Command center — main orchestration dashboard | Next.js + Cloudflare Pages |
| headysystems.com | Core architecture engine — technical docs & API reference | Next.js + Cloud Run |
| headyconnection.org | 501(c)(3) nonprofit — community programs, grants, equity | Drupal 11 |
| headybuddy.org | AI companion experience — conversational interface | Next.js + WebSocket |
| headymcp.com | MCP layer — tool routing, transport, zero-trust gateway | Cloudflare Workers |
| headyio.com | Developer platform — SDKs, APIs, integration guides | Next.js + Cloud Run |
| headybot.com | Automation and agents — bot management, swarm dashboard | Next.js + Cloud Run |
| headyapi.com | Public intelligence interface — API gateway, rate limiting | Cloudflare Workers + Cloud Run |
| heady-ai.com | Intelligence routing hub — model selection, liquid gateway | Cloudflare Workers |

---

## Node Registry — Sacred Geometry Topology

### Center (HeadySoul)

| Node | Role | Pool |
|------|------|------|
| HeadySoul | Awareness layer, values arbiter, coherence guardian | Governance |

### Inner Ring (Processing Core)

| Node | Role | Pool |
|------|------|------|
| HeadyBrains | Computational pre-processor, context gathering | Hot |
| HeadyConductor | Central orchestration, task classification & routing | Hot |
| HeadyVinci | Session planner, topology maintainer, multi-step planning | Hot |

### Middle Ring (Execution Layer)

| Node | Role | Pool |
|------|------|------|
| JULES | Code generation, implementation | Hot |
| BUILDER | Full-stack system building | Hot |
| OBSERVER | Code review, monitoring, quality assessment | Hot |
| MURPHY | Security analysis, vulnerability detection | Hot |
| ATLAS | Architecture documentation, system mapping | Warm |
| PYTHIA | Predictive analysis, forecasting | Warm |

### Outer Ring (Specialized Capabilities)

| Node | Role | Pool |
|------|------|------|
| BRIDGE | Translation, cross-domain communication | Warm |
| MUSE | Creative content generation, UX design | Warm |
| SENTINEL | Real-time security monitoring, threat detection | Warm |
| NOVA | Innovation, experimental approaches | Warm |
| JANITOR | Code cleanup, technical debt reduction | Cold |
| SOPHIA | Research, wisdom synthesis, deep analysis | Warm |
| CIPHER | Encryption, PQC, cryptographic operations | Warm |
| LENS | System observation, detailed inspection | Warm |

### Governance Shell (Quality & Oversight)

| Node | Role | Pool |
|------|------|------|
| HeadyCheck | Output validation, quality gate | Governance |
| HeadyAssure | Deployment certification, assurance gate | Governance |
| HeadyAware | Ethics monitoring, bias detection | Governance |
| HeadyPatterns | Pattern detection, drift classification, learning | Cold |
| HeadyMC | Monte Carlo simulation for optimization | Cold |
| HeadyRisks | Risk assessment, security audit | Governance |

### Memory & Intelligence Nodes

| Node | Role | Pool |
|------|------|------|
| HeadyMemory | Vector memory read/write (384D, RAM-first) | Hot |
| HeadyEmbed | Embedding generation (multi-provider routing) | Hot |
| HeadyAutobiographer | Event logging, narrative construction | Cold |
| HeadyResearch | Deep research with web citations | Warm |
| HeadyCodex | Code documentation generation | Warm |
| HeadyMaid | Cleanup scheduling, cache management | Cold |
| HeadyMaintenance | Backup, update, restore operations | Cold |

---

## Bee Registry — 30+ HeadyBee Types

Every bee follows the BaseHeadyBee lifecycle: `spawn() → execute() → report() → retire()`

| Bee Type | Module | Role |
|----------|--------|------|
| agents-bee | src/bees/agents-bee.js | Agent creation and routing |
| auth-provider-bee | src/bees/auth-provider-bee.js | Authentication provider orchestration |
| auto-success-bee | src/bees/auto-success-bee.js | Automated success pipeline execution |
| brain-bee | src/bees/brain-bee.js | LLM provider routing and model selection |
| config-bee | src/bees/config-bee.js | Configuration management and validation |
| connectors-bee | src/bees/connectors-bee.js | External service connector management |
| creative-bee | src/bees/creative-bee.js | Creative content generation (images, music, text) |
| deployment-bee | src/bees/deployment-bee.js | Cloud deployment automation |
| device-provisioner-bee | src/bees/device-provisioner-bee.js | Device onboarding and provisioning |
| documentation-bee | src/bees/documentation-bee.js | Auto-documentation generation |
| engines-bee | src/bees/engines-bee.js | Engine orchestration and lifecycle |
| governance-bee | src/bees/governance-bee.js | Policy enforcement and compliance |
| health-bee | src/bees/health-bee.js | Health probe execution and reporting |
| intelligence-bee | src/bees/intelligence-bee.js | Intelligence gathering and analysis |
| lifecycle-bee | src/bees/lifecycle-bee.js | Service lifecycle management |
| mcp-bee | src/bees/mcp-bee.js | MCP protocol tool execution |
| memory-bee | src/bees/memory-bee.js | Memory operations (store, retrieve, embed) |
| middleware-bee | src/bees/middleware-bee.js | Middleware chain management |
| midi-bee | src/bees/midi-bee.js | MIDI event processing |
| ops-bee | src/bees/ops-bee.js | Operations automation |
| orchestration-bee | src/bees/orchestration-bee.js | Multi-bee orchestration coordination |
| pipeline-bee | src/bees/pipeline-bee.js | Pipeline stage execution |
| providers-bee | src/bees/providers-bee.js | Provider health and failover |
| refactor-bee | src/bees/refactor-bee.js | Code refactoring automation |
| resilience-bee | src/bees/resilience-bee.js | Resilience pattern enforcement |
| routes-bee | src/bees/routes-bee.js | API route management |
| security-bee | src/bees/security-bee.js | Security scanning and enforcement |
| services-bee | src/bees/services-bee.js | Service catalog management |
| sync-projection-bee | src/bees/sync-projection-bee.js | Repo projection synchronization |
| telemetry-bee | src/bees/telemetry-bee.js | Telemetry collection and export |
| trading-bee | src/bees/trading-bee.js | Financial trading operations |
| vector-ops-bee | src/bees/vector-ops-bee.js | Vector space operations |
| vector-template-bee | src/bees/vector-template-bee.js | Vector template management |

---

## Conductor Routing Matrix

| Task Type | Primary Node | Fallback 1 | Fallback 2 | Pool |
|-----------|-------------|------------|------------|------|
| Code Generation | Claude 3.5 Sonnet → JULES | GPT-4o → BUILDER | Groq Llama | Hot |
| Code Review | Claude 3.5 Sonnet → OBSERVER | GPT-4o | Gemini Pro | Hot |
| Security Audit | Claude 3.5 Sonnet → MURPHY | GPT-4o | Claude Opus | Hot |
| Architecture | Claude 3 Opus → ATLAS/PYTHIA | GPT-4o → HeadyVinci | Claude Sonnet | Hot |
| Research | Perplexity Sonar → SOPHIA | Claude Sonnet | GPT-4o | Warm |
| Documentation | GPT-4o → ATLAS/HeadyCodex | Claude Sonnet | Gemini Pro | Warm |
| Quick Tasks | Groq Llama (edge) | GPT-4o-mini | Gemini Flash | Hot |
| Creative | Claude 3 Opus → MUSE | GPT-4o → NOVA | Gemini Pro | Warm |
| Cleanup | HeadyMaid → JANITOR | HeadyMaintenance | — | Cold |
| Analytics | HeadyPatterns → HeadyMC | DuckDB local | — | Cold |
| Embeddings | Cloudflare Edge (bge-base) | Nomic v2 | Local Ollama | Hot |

---

## Resource Pool Allocation (Fibonacci Ratios)

| Pool | % Resources | Fibonacci Basis | Use For |
|------|------------|----------------|---------|
| Hot | 34% | fib(9)/Σ | User-facing, latency-critical (< 30s) |
| Warm | 21% | fib(8)/Σ | Background processing (< 5 min) |
| Cold | 13% | fib(7)/Σ | Batch, analytics, ingestion (< 30 min) |
| Reserve | 8% | fib(6)/Σ | Burst capacity for traffic spikes |
| Governance | 5% | fib(5)/Σ | HeadyCheck, HeadyAssure, HeadyAware |

---

## Infrastructure Topology

```
                    ┌─────────────────────────────────┐
                    │         CLOUDFLARE EDGE          │
                    │  Workers │ Pages │ KV │ Vectorize│
                    │  Durable Objects │ Workers AI    │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │        LIQUID GATEWAY            │
                    │  Auth │ Routing │ Cache │ Stream │
                    └─────────────┬───────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────┴─────────┐ ┌──────┴──────┐ ┌─────────┴─────────┐
    │   CLOUD RUN        │ │  FIREBASE   │ │    COLAB PRO+     │
    │   (Origin)         │ │  Auth + DB  │ │  3 GPU Runtimes   │
    │   HeadyManager     │ │  Firestore  │ │  Vector │ LLM │   │
    │   HCFullPipeline   │ │  Storage    │ │  Train  │     │   │
    └─────────┬─────────┘ └──────┬──────┘ └─────────┬─────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │     POSTGRESQL + PGVECTOR        │
                    │  Source of truth │ HNSW indexes  │
                    │  Graph RAG │ BM25 │ Audit logs   │
                    └─────────────────────────────────┘
```

### Edge-Origin Routing (Phi-Scored Complexity)

| Complexity Score | Route | Examples |
|-----------------|-------|---------|
| < ψ² (0.382) | Edge-only | Simple lookups, embeddings, classification |
| ψ² – ψ (0.382–0.618) | Edge-preferred | Moderate queries with edge fallback |
| > ψ (0.618) | Origin-required | Complex reasoning, multi-step, code gen |

---

## HCFullPipeline (HCFP) — 8-Stage Sequence

```
1. Context Assembly    → HeadyBrains gathers all relevant context
2. Intent Classification → HeadyConductor determines task type + domain
3. Node Selection      → CSL-scored capability routing picks optimal nodes
4. Execution           → Parallel or sequential node activation
5. Quality Gate        → HeadyCheck validates output
6. Assurance Gate      → HeadyAssure certifies for deployment
7. Pattern Capture     → HeadyPatterns logs the workflow for learning
8. Story Update        → HeadyAutobiographer records the narrative
```

---

## Self-Healing Cycle

```
1. Monitor  → Continuous embedding comparison (cosine similarity)
2. Detect   → Semantic drift when similarity < 0.809 (MEDIUM threshold)
3. Alert    → HeadySoul notified of coherence violation
4. Diagnose → HeadyAnalyze + HeadyPatterns identify root cause
5. Heal     → HeadyMaintenance + HeadyMaid apply corrective action
6. Verify   → HeadyCheck + HeadyAssure confirm restoration
7. Learn    → HeadyPatterns + HeadyMC record for future prevention
```

---

## 3 Unbreakable Laws

Every code mutation must satisfy:

1. **Structural Integrity**: Code compiles, passes type checks, respects module boundaries
2. **Semantic Coherence**: The change's embedding stays within tolerance of the intended design
3. **Mission Alignment**: The change serves HeadyConnection's mission (community, equity, empowerment)

---

## Phi-Math Quick Reference

| Constant | Value | Use |
|----------|-------|-----|
| φ (PHI) | 1.618 | Scaling ratio, typography, layout |
| ψ (PSI) | 0.618 | Conjugate, weights, thresholds |
| φ² | 2.618 | Token budget scaling |
| φ³ | 4.236 | Timing multipliers |
| fib(5) | 5 | Circuit breaker threshold |
| fib(6) | 8 | Batch sizes, max concurrent |
| fib(7) | 13 | Small limits, trial days |
| fib(8) | 21 | HNSW m, rerankTopK |
| fib(9) | 34 | Sliding windows |
| fib(10) | 55 | Max entities |
| fib(11) | 89 | efSearch, retention days |
| fib(12) | 144 | ef_construction |
| fib(13) | 233 | Queue depth |
| fib(16) | 987 | Cache sizes |
| fib(20) | 6765 | Large LRU caches |

---

## GitHub Repository Map

| Organization | Key Repos |
|-------------|-----------|
| HeadyMe (13 repos) | Heady-pre-production-9f2f0642 (monorepo), headyme-core, headybuddy-core, headymcp-core, headyapi-core, headyai-core, headybot-core, headyio-core, headycloud-core |
| HeadySystems (7 repos) | headysystems-core, infrastructure, docs, configs |
| HeadyConnection | Empty (to be populated with nonprofit repos) |

Source monorepo projects to 9 domain-specific repos via sync-projection-bee + projection-manifest-generator.

---

*This ecosystem map is the canonical reference for all Heady development.*
*Φ ≈ 1.618 · Sacred Geometry v4.0 · Alive Software Architecture*
