# New HeadyBee Types — Expansion Pack

## 10 New Specialized HeadyBee Workers

### 1. **CartographerBee** 🗺️
- **Domain:** Knowledge Layer
- **Purpose:** Continuously maps the entire Heady ecosystem topology — services, dependencies, data flows, skill coverage gaps — into navigable knowledge graphs
- **Triggers:** New service deployment, dependency changes, skill creation, orphaned code detection
- **CSL Gate:** MEDIUM (0.809) — must reach coherence before publishing a new ecosystem map
- **Outputs:** Living dependency DAGs, gap reports, service heat maps, orphan detection alerts
- **Phi-scaling:** Fibonacci-timed full scans (every 89 minutes), incremental diffs every 13 minutes

### 2. **PollinatorBee** 🌸
- **Domain:** Cross-Service Intelligence
- **Purpose:** Transfers knowledge, patterns, and learned optimizations between disconnected services — the "cross-pollination" agent
- **Triggers:** When one service discovers an optimization or pattern that could benefit another
- **CSL Gate:** HIGH (0.882) — cross-service contamination prevention
- **Outputs:** Knowledge transfer receipts, pattern propagation logs, cross-domain insight reports
- **Phi-scaling:** PSI-weighted relevance scoring for knowledge transfer decisions

### 3. **ArchivistBee** 📜
- **Domain:** Memory Layer
- **Purpose:** Manages long-term memory consolidation, compression, and retrieval optimization across all HeadyMemory tiers
- **Triggers:** Memory pressure thresholds, stale data detection, retrieval latency spikes
- **CSL Gate:** LOW (0.691) — background maintenance operations
- **Outputs:** Compressed memory snapshots, retrieval optimization reports, memory health metrics
- **Phi-scaling:** Fibonacci-spaced consolidation cycles (1, 2, 3, 5, 8, 13 hour intervals)

### 4. **SentinelBee** 🛡️
- **Domain:** Security Layer
- **Purpose:** Real-time threat detection combining semantic firewall analysis with behavioral anomaly patterns
- **Triggers:** Unusual access patterns, prompt injection attempts, CSL coherence drops, rate limit violations
- **CSL Gate:** CRITICAL (0.927) — zero tolerance for false negatives on security events
- **Outputs:** Threat assessment reports, quarantine decisions, immunity memory updates
- **Phi-scaling:** PHI-backoff escalation (1.618x severity multiplier per consecutive detection)

### 5. **HarvesterBee** 🌾
- **Domain:** Data Ingestion
- **Purpose:** Collects, validates, normalizes, and routes external data from connected services (GitHub, Notion, Drive, HuggingFace, etc.)
- **Triggers:** Webhook events, scheduled polling, user-initiated imports
- **CSL Gate:** MEDIUM (0.809) — data quality validation before ingestion
- **Outputs:** Normalized data packets, ingestion receipts, data quality reports
- **Phi-scaling:** Fibonacci-sized batch processing (5, 8, 13, 21, 34 items per batch)

### 6. **DiplomatBee** 🤝
- **Domain:** Inter-Agent Negotiation
- **Purpose:** Resolves resource conflicts, mediates priority disputes between competing agent requests, and enforces fair scheduling
- **Triggers:** Resource contention events, scheduling deadlocks, priority inversions
- **CSL Gate:** HIGH (0.882) — fair mediation requires high coherence
- **Outputs:** Mediation verdicts, resource allocation adjustments, fairness audit logs
- **Phi-scaling:** Golden ratio resource splitting (61.8% / 38.2%) for contested resources

### 7. **EchoLocatorBee** 📡
- **Domain:** Observability
- **Purpose:** Distributed tracing across the entire Heady ecosystem — correlating events across edge, origin, DB, and LLM providers into coherent narratives
- **Triggers:** Latency anomalies, error correlation, performance regression detection
- **CSL Gate:** LOW (0.691) — always-on background observability
- **Outputs:** Trace narratives, latency flame charts, cross-service correlation reports
- **Phi-scaling:** Phi-sampled tracing rates (Hot 100%, Warm 61.8%, Cold 38.2%)

### 8. **ProphetBee** 🔮
- **Domain:** Predictive Intelligence
- **Purpose:** Forecasts system load, cost trajectories, drift timelines, and failure probabilities using temporal analysis
- **Triggers:** Trend deviation detection, approaching capacity thresholds, budget milestones
- **CSL Gate:** HIGH (0.882) — predictions must meet confidence gate before alerting
- **Outputs:** Forecast reports, capacity planning recommendations, cost projections
- **Phi-scaling:** Fibonacci-windowed trend analysis (8h, 13h, 21h, 34h, 55h lookbacks)

### 9. **MutagenBee** 🧬
- **Domain:** Evolution Engine
- **Purpose:** Generates controlled mutations of prompts, configurations, and routing strategies for A/B testing and evolutionary optimization
- **Triggers:** Performance plateaus, new optimization opportunities, scheduled evolution cycles
- **CSL Gate:** MEDIUM (0.809) — mutations must pass coherence check before deployment
- **Outputs:** Mutation candidates, fitness scores, evolution generation reports
- **Phi-scaling:** PSI-scaled mutation rates (0.618 * base_rate for conservative, PHI * base_rate for aggressive)

### 10. **LoomBee** 🕸️
- **Domain:** Context Engineering
- **Purpose:** Weaves optimal context windows for each agent and task by scoring, deduplicating, and assembling context capsules
- **Triggers:** New task assignment, context overflow warnings, agent performance drops
- **CSL Gate:** MEDIUM (0.809) — context quality directly impacts agent performance
- **Outputs:** Context capsules, relevance scores, compression reports
- **Phi-scaling:** Phi-weighted priority ordering: system(PHI^3) > task(PHI^2) > history(PHI) > ambient(1)

---

## Integration Pattern

All new bees follow the standard HeadyBee lifecycle:
```
SPAWNING → READY → RUNNING → SUSPENDED → RETIRING → TERMINATED
```

Register via BeeFactory:
```javascript
BeeFactory.register('cartographer-bee', CartographerBeeTemplate);
BeeFactory.register('pollinator-bee', PollinatorBeeTemplate);
// ... etc
```

Each bee receives Sacred Geometry layer assignment based on domain:
- **Center:** ProphetBee (CONDUCTOR placement)
- **Inner:** LoomBee, PollinatorBee (ARCHITECT, OPTIMIZER)
- **Middle:** SentinelBee, EchoLocatorBee (OBSERVER, MURPHY)
- **Outer:** HarvesterBee, CartographerBee (external-facing)
- **Governance:** DiplomatBee (ORACLE placement)
- **Memory:** ArchivistBee
- **Ops:** MutagenBee (EVOLUTION placement)
