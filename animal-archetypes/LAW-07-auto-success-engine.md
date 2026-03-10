---
title: "Law 07: Auto-Success Engine Integrity"
domain: unbreakable-law
law_number: 7
semantic_tags: [auto-success, heartbeat, background-tasks, dynamic-phi-scaled, csl-orchestration, parallel-agents]
enforcement: MANDATORY_IMMUTABLE
---

# LAW 7: AUTO-SUCCESS ENGINE INTEGRITY — DYNAMIC φ-SCALED HEARTBEAT

The Auto-Success Engine runs a **dynamically computed number of parallel background tasks** across **CSL-discovered categories** on a **φ⁷-derived cycle (29,034ms)**. Task counts, category counts, and parallelism are NEVER fixed — they are computed at runtime using Sacred Geometry φ-scaling, CSL resonance scoring, and Fibonacci distribution. This heartbeat is sacrosanct. No change may degrade, slow, or disrupt it.

## Dynamic Scaling Principles

### Task Count: Dynamic, NOT Fixed

- Tasks are **discovered** by scanning the task catalog at startup and on each cycle
- Each category spawns **fib(6)=8 to fib(8)=21 parallel agents** depending on system load
- Agent count per category is computed by: `floor(totalBudget × φ_distribution_weight)`
- The total task count is an emergent property — NEVER a hardcoded constant

### Category Count: CSL-Discovered

- Categories are registered via the task catalog, not hardcoded
- New categories can be added without code changes (drop a file, it auto-registers)
- Category priority is scored using CSL cosine similarity to current system needs
- Current baseline: **fib(7) = 13 categories** (can grow as system evolves)

### Cycle Timing: φ-Power Derived

- Heartbeat cycle: **φ⁷ × 1000 = 29,034ms** (replaces arbitrary 30,000)
- Individual task timeout: **φ³ × 1000 = 4,236ms** (replaces arbitrary 5,000)
- Retry backoff: φ¹ → φ² → φ³ (1,618ms → 2,618ms → 4,236ms)

## The Thirteen Categories (φ-Ratio Weighted)

### Tier 1: Critical (38.2% of agent budget — 1 - 1/φ)

#### 1. Security

Vulnerability scanning, secret detection, access control audit, CORS validation, CSP verification, auth token monitoring, SSL cert check, CVE scan, injection pattern detection, rate limit verify, permission escalation detection, header completeness

#### 2. Intelligence

Embedding freshness, vector index quality, CSL gate calibration, model routing accuracy, response quality scoring, hallucination detection, context retrieval relevance, multi-model agreement, prompt effectiveness, knowledge completeness, Graph RAG freshness, semantic search precision

#### 3. Availability

Health probes, uptime calculation, circuit breaker monitoring, dependency health, DNS verification, CDN status, edge worker availability, database health, Redis health, MCP connectivity, webhook delivery, streaming availability, failover readiness

### Tier 2: High (23.6% of agent budget — 1/φ²)

#### 4. Performance

Response time P50/P95/P99, memory usage, CPU trending, queue depth, event loop lag, GC frequency, connection pool utilization, cache hit ratio, DB query latency, embedding throughput, API throughput, worker utilization

#### 5. Code Quality

ESLint checks, TypeScript validation, dead code detection, import cycles, complexity scoring, duplication scan, pattern compliance, naming audit, deprecated API scan, bundle size, test coverage, documentation completeness

#### 6. Learning

Pattern extraction from Arena results, wisdom.json updates, HeadyVinci refresh, embedding freshness, knowledge gap detection, preference model update, error pattern catalog, optimization catalog, pattern reinforcement, cross-swarm correlation, discovery alerting

### Tier 3: Standard (14.6% of agent budget — 1/φ³)

#### 7. Communication

Notification delivery, webhook health, MCP connectivity, email processing, chat integration health, API doc freshness, changelog triggers, status page updates, incident readiness, HeadyBuddy sampling, cross-device sync, escalation paths

#### 8. Infrastructure

DNS validation, SSL expiry warning, container freshness, pod health, Cloud Run status, Cloudflare Worker status, migration status, storage quota, log rotation, backup completion, CDN purge, edge cache warm, network policy, drift detection

#### 9. Compliance

License checks, patent zone integrity, IP protection, GDPR audit, API versioning, SLA monitoring, data retention, backup verification, DR readiness, audit log integrity, regulatory monitoring, privacy consistency, accessibility

### Tier 4: Growth (9.0% of agent budget — 1/φ⁴)

#### 10. Cost Optimization

Resource utilization → cost mapping, idle instance detection, over-provisioned flagging, API cost-per-request analysis, cheaper alternative suggestions

#### 11. Discovery

Scan for new tools/libraries, AI research papers, competitor innovations, emerging patterns, architecture innovations (powered by CONTINUOUS_SEARCH stage)

#### 12. Evolution

Track parameter mutation fitness, measure improvement velocity, propose candidate mutations, evaluate evolution opportunities (powered by EVOLUTION stage)

#### 13. Self-Assessment

Confidence calibration accuracy, blind spot tracking, bias detection rate, assumption validity, prediction accuracy trending (powered by SELF_AWARENESS stage)

## Invariants

- Cycle timing MUST use φ⁷ × 1000 = 29,034ms (NO arbitrary round numbers)
- Individual task timeout: φ³ × 1000 = 4,236ms (flag and optimize if exceeded)
- Failed tasks retry with phi-backoff: φ¹ → φ² → φ³ (max fib(4) = 3 per cycle, max fib(6) = 8 total before incident)
- Agent count per category is COMPUTED, never hardcoded
- New tasks require CSL-scored category assignment and φ-ratio budget allocation
- Total task count is an EMERGENT PROPERTY of: `Σ(category_weight × available_agents)`
- Cycle metrics exposed via `observability-kernel` to HeadyConductor dashboard
- All timing constants derived from `phi-math-foundation` package — ZERO magic numbers
