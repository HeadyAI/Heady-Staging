# Extracted Bundle — Service Inventory

**Audit date:** 2026-03-10
**Bundles analyzed:**
- `heady-perplexity-full-system-context` (Perplexity bundle)
- `heady-system-build-current-state` (System-build bundle)
- `heady-full-rebuild-context` (Full-rebuild bundle)

---

## 1. Perplexity Bundle — Registry Components

**Source:** `heady-perplexity-bundle/12-heady-registry.json` (v3.2.0, updated 2026-02-08)

Lists 55 components across multiple types. Not all are runtime services — includes SDKs, extensions, governance entries, and planned items.

### Core Services (active, critical)

| ID | Type | Source of Truth |
|---|---|---|
| heady-manager | api-gateway | `heady-manager.js` |
| headyconductor | orchestration | `src/heady_project/heady_conductor.py` |
| headyregistry | registry | `heady-registry.json` |
| hc-supervisor | agent-routing | `packages/hc-supervisor/` |
| hc-brain | meta-controller | `packages/hc-brain/` |
| hc-checkpoint | checkpoint | `packages/hc-checkpoint/` |
| hc-readiness | readiness | `packages/hc-readiness/` |
| buddy-always-on | service | `configs/heady-buddy-always-on.yaml` (planned) |
| heady-auto-ide | orchestration | `docs/HEADY_AUTO_IDE.md` |

### Observability & Intelligence

| ID | Type | Source of Truth |
|---|---|---|
| headymaid | observability | `src/heady_maid.js` |
| headylens | observability | `packages/hc-health/` |
| pattern-engine | intelligence | `src/hc_pattern_engine.js` |
| self-critique-engine | intelligence | `src/hc_self_critique.js` |
| mc-plan-scheduler | optimizer | `src/hc_monte_carlo.js` |
| imagination-engine | ai-system | `src/hc_imagination.js` |

### Distribution & Extensions

| ID | Type | Status |
|---|---|---|
| browser-extension-chrome | browser-extension | active |
| browser-extension-firefox | browser-extension | active |
| browser-extension-edge | browser-extension | active |
| ide-extension-vscode | ide-extension | active |
| ide-extension-neovim | ide-extension | active |
| ide-extension-vim | ide-extension | active |
| ide-extension-emacs | ide-extension | active |
| ide-extension-sublime | ide-extension | active |
| heady-sdk-js | sdk | active |
| heady-sdk-python | sdk | active |
| heady-sdk-typescript | sdk | active |
| headyos-cli | cli | active |

### Governance Components

| ID | Type |
|---|---|
| aloha-protocol | governance |
| de-optimization-protocol | governance |
| stability-first | governance |

### Scaffold/Planned Items

| ID | Type | Status |
|---|---|---|
| heady-browser | browser | planned |
| headybrowser-mobile | mobile-app | scaffold |
| headybrowser-desktop | desktop-app | scaffold |
| headybuddy-mobile | mobile-app | scaffold |
| heady-ide | web-ide | planned |

---

## 2. System-Build Bundle — 50-Service Index

**Source:** `heady-system-build/services/SERVICE_INDEX.json` (v3.2.3, generated 2026-03-09, 50 services)

All services follow a consistent port scheme (3301–3350), each with 5 health endpoints.

| # | Service ID | Port | Domain | Description |
|---|---|---|---|---|
| 1 | heady-manager | 3301 | headysystems.com | Primary orchestration — 21-stage pipeline controller |
| 2 | heady-gateway | 3302 | headyapi.com | API Gateway — rate limiting, auth, CSL routing |
| 3 | heady-mcp | 3303 | headymcp.com | MCP Gateway — 42 registered tools, JSON-RPC 2.0 |
| 4 | heady-brain | 3304 | headysystems.com | 7-archetype cognitive orchestration, CSL fusion |
| 5 | heady-soul | 3305 | headyme.com | User intent control plane, pipeline entry |
| 6 | heady-hive | 3306 | headybee.co | Bee factory — 10K concurrent bees |
| 7 | heady-orchestration | 3307 | headysystems.com | Task DAG execution, stage transitions, gates |
| 8 | heady-router | 3308 | headysystems.com | Domain router — CSL cosine matching |
| 9 | heady-auth | 3309 | headysystems.com | JWT/Ed25519, mTLS, service identity |
| 10 | heady-drupal | 3310 | headyconnection.org | Drupal CMS bridge and proxy |
| 11 | heady-vector-memory | 3311 | headysystems.com | 3D spatial vector memory — pgvector, Graph RAG |
| 12 | heady-embeddings | 3312 | headysystems.com | Embedding service — local + Vertex AI |
| 13 | heady-inference-gateway | 3313 | headysystems.com | Multi-model routing: Claude/GPT/Gemini/Groq/Ollama |
| 14 | heady-model-router | 3314 | headysystems.com | CSL-based model selection |
| 15 | heady-buddy | 3315 | headybuddy.com | AI companion, persistent memory, empathic personas |
| 16 | heady-coder | 3316 | heady.io | Autonomous code generation, review, testing |
| 17 | heady-researcher | 3317 | heady.io | Perplexity-powered research and synthesis |
| 18 | heady-battle | 3318 | headysystems.com | Arena mode — multi-model competition, MC eval |
| 19 | heady-council | 3319 | headysystems.com | 7-model deliberation, CSL consensus gate |
| 20 | heady-mc | 3320 | headysystems.com | Monte Carlo simulation — 1K+ scenarios |
| 21 | heady-circuit-breaker | 3321 | headysystems.com | Flow/pause/probe recovery state machine |
| 22 | heady-saga | 3322 | headysystems.com | Distributed transactions, compensating txns |
| 23 | heady-bulkhead | 3323 | headysystems.com | Resource pool partitioning — Fibonacci-snapped |
| 24 | heady-event-store | 3324 | headysystems.com | Immutable event sourcing, time-travel debug |
| 25 | heady-cqrs | 3325 | headysystems.com | CQRS bus — command/query separation |
| 26 | heady-self-healing | 3326 | headysystems.com | Auto-discovery, register, partition recovery |
| 27 | heady-auto-tuner | 3327 | headysystems.com | Runtime φ-scaling of concurrency/timeouts |
| 28 | heady-pool-router | 3328 | headysystems.com | Fibonacci-ratio pool allocation |
| 29 | heady-bee-factory | 3329 | headybee.co | Spawn/manage/retire 10,000 bees, 89 types |
| 30 | heady-swarm-coordinator | 3330 | headybee.co | Cross-swarm messaging — <10ms latency |
| 31 | heady-seventeen-swarm | 3331 | headybee.co | 17-swarm orchestrator — golden-angle topology |
| 32 | heady-pipeline-core | 3332 | headysystems.com | 21-stage HCFullPipeline v4.0 |
| 33 | heady-csl-judge | 3333 | headysystems.com | Semantic gate eval — ternary logic, receipts |
| 34 | heady-auto-success | 3334 | headysystems.com | Auto-Success Engine — φ⁷-cycle background tasks |
| 35 | heady-hallucination-watchdog | 3335 | headysystems.com | Real-time output quality monitoring |
| 36 | heady-evolution-engine | 3336 | headysystems.com | Continuous learning, pattern DB updates |
| 37 | heady-budget-tracker | 3337 | headysystems.com | Token/cost tracking per bee/swarm/stage |
| 38 | heady-receipt-signer | 3338 | headysystems.com | Ed25519 cryptographic audit trail |
| 39 | heady-persona-router | 3339 | headyme.com | 10 animal archetypes — CSL empathic adaptation |
| 40 | heady-observability | 3340 | headysystems.com | Self-awareness telemetry, confidence monitoring |
| 41 | heady-telemetry | 3341 | headysystems.com | OTLP collector, Prometheus, Grafana |
| 42 | heady-drupal-proxy | 3342 | headyconnection.org | Drupal reverse proxy — content delivery |
| 43 | heady-cf-worker | 3343 | headysystems.com | Cloudflare Worker bridge — KV, D1, DO |
| 44 | heady-federation | 3344 | heady.io | Module federation — micro-frontend composition |
| 45 | heady-snapshot | 3345 | headysystems.com | Point-in-time state capture, time-travel restore |
| 46 | heady-sandbox | 3346 | heady.io | Isolated code evaluation environment |
| 47 | heady-trader | 3347 | headyme.com | Autonomous trading — phi-scaled market safeguards |
| 48 | heady-ableton | 3348 | headyme.com | Cloud MIDI sequencer, SysEx edge node |
| 49 | heady-lens | 3349 | headylens.ai | AR overlay intelligence — real-time visual context |
| 50 | heady-cache | 3350 | headysystems.com | φ⁸-TTL distributed cache — CSL-keyed invalidation |

### Service Scaffolds on Disk

Each service in `heady-system-build/services/<id>/` contains at minimum: `index.js`, `package.json`, `Dockerfile`, `health.js`. These are generated scaffolds, not verified running services (per `GAPS_FOUND.md`).

---

## 3. Full-Rebuild Bundle — AI Nodes

**Source:** `heady-full-rebuild/configs/heady-registry.json` (v3.2.3)

Lists 11 AI "nodes" (logical service roles) rather than port-mapped microservices.

| Node | Role | Layer | Description |
|---|---|---|---|
| HeadySoul | intelligence | hybrid | Core reasoning, analysis, optimization |
| HeadyBrains | reasoning | cloud-me | Multi-step reasoning, problem decomposition |
| HeadyVinci | pattern_recognition | local | Pattern learning, recognition, prediction |
| HeadyMemory | vector_memory | local | Semantic search, episodic memory (pgvector) |
| HeadyConductor | orchestrator | hybrid | Task routing, load balancing |
| HeadyArena | evaluation | cloud-sys | Battle arena — ranks candidate solutions |
| HeadyGovernance | policy | local | Safety, ethics, audit enforcement |
| HeadyBee | worker_agent | cloud-conn | Spawnable domain-specific workers |
| HeadyAutobiographer | narrative | local | Event logger, system story generator |
| HeadyBuddy | companion | hybrid | Always-on AI companion |
| HeadyLens | ar_overlay | cloud-conn | AR overlay intelligence |

### Source-Reference Implementations

The full-rebuild bundle includes reference JS files for key subsystems in `source-reference/`:

| File | Maps To |
|---|---|
| `pipeline-core.js` | heady-pipeline-core service |
| `hc-full-pipeline-v3.js` | Pipeline v3 implementation |
| `csl-gate-engine.js` | heady-csl-judge service |
| `csl-judge-scorer.js` | CSL scoring subsystem |
| `evolution-engine.js` | heady-evolution-engine service |
| `heady-council.js` | heady-council service |
| `liquid-orchestrator.js` | Orchestration layer |
| `persona-router.js` | heady-persona-router service |
| `budget-tracker.js` | heady-budget-tracker service |
| `ed25519-receipt-signer.js` | heady-receipt-signer service |
| `phi-compliance-checker.js` | Phi-math validation tooling |

---

## 4. Cross-Bundle Service Mismatches

### Service Count Discrepancy

| Bundle | Service Entities | Scope |
|---|---|---|
| Perplexity registry | 55 components | Includes SDKs, extensions, governance, planned items — not only services |
| System-build SERVICE_INDEX | 50 microservices | Port-mapped, scaffold-generated services |
| Full-rebuild registry | 11 AI nodes | Logical roles, not individually port-mapped |

### Notable Differences

1. **Perplexity lists non-service components as services.** Entries like `browser-extension-chrome`, `ide-extension-vscode`, `heady-sdk-js`, `aloha-protocol`, `stability-first` are not runtime services. System-build correctly excludes these.

2. **Full-rebuild uses a higher-level abstraction.** Its 11 "nodes" (HeadySoul, HeadyBrains, HeadyBee, etc.) map to groups of system-build services rather than 1:1 mappings. For example, `HeadyBee` (1 node) maps to `heady-hive`, `heady-bee-factory`, `heady-swarm-coordinator`, and `heady-seventeen-swarm` (4 services).

3. **MCP tool count varies.** Perplexity registry lists "31 registered tools" for MCP. System-build SERVICE_INDEX says "42 registered MCP tools." Full-rebuild registry says "31." No single authoritative count.

4. **Buddy domain inconsistency.** System-build SERVICE_INDEX assigns heady-buddy to domain `headybuddy.com`. Full-rebuild domains.yaml uses `headybuddy.org`. Perplexity site-registry has no headybuddy entry at all.

5. **Services in system-build without Perplexity registry entries:** `heady-hot-cold-router` (has scaffold dir, referenced in `GAPS_FOUND.md` as using superseded language), `heady-hallucination-watchdog`, `heady-snapshot`, `heady-sandbox`, `heady-trader`, `heady-ableton`, `heady-lens`.

6. **Perplexity registry components without system-build scaffolds:** `imagination-engine`, `pattern-engine`, `self-critique-engine`, `hc-supervisor`, `hc-brain`, `hc-checkpoint`, `hc-readiness`, `story-driver`, `headybuddy` (companion app), `heady-academy`, all IDE/browser extensions, all SDKs.

---

## 5. Skills in System-Build Bundle

**Source:** `heady-system-build/skills/` (14 skills)

| Skill | Category |
|---|---|
| heady-drupal-content-sync | CMS integration |
| heady-firebase-auth-orchestrator | Auth |
| heady-perplexity-code-review | Code review |
| heady-perplexity-competitor-intel | Competitive intelligence |
| heady-perplexity-computer-use | Computer use |
| heady-perplexity-content-generation | Content |
| heady-perplexity-deep-research | Research |
| heady-perplexity-domain-benchmarker | Benchmarking |
| heady-perplexity-eval-orchestrator | Evaluation |
| heady-perplexity-feedback-loop | Feedback |
| heady-perplexity-multi-agent-eval | Multi-agent eval |
| heady-perplexity-patent-search | Patent |
| heady-perplexity-rag-optimizer | RAG |
| heady-sacred-geometry-css-generator | CSS generation |

These are Perplexity-integrated skills for the operational platform, distinct from the local workspace skills in `/home/user/workspace/skills/`.
