# New HeadySwarm Concepts — Expansion Pack

## 5 New Specialized Swarm Formations

### 1. **ForensicSwarm** 🔬
- **Composition:** EchoLocatorBee (lead) + SentinelBee + ArchivistBee + IntelligenceBee
- **Purpose:** Activated during incidents — performs deep-dive root cause analysis by correlating traces, memory history, security events, and intelligence patterns
- **Activation:** Triggered when error rate exceeds PHI^3% (~4.236%) or latency exceeds PHI^5ms (~11.09s) at p95
- **Consensus Mode:** Unanimous — all 4 bees must agree on root cause before publishing
- **Outputs:** Incident post-mortem with timeline, root cause tree, remediation playbook, immunity vaccine for Digital Immune system
- **Duration:** Auto-dissolves after incident resolution or 89-minute timeout

### 2. **EvolutionSwarm** 🧬
- **Composition:** MutagenBee (lead) + ProphetBee + CartographerBee + CreativeBee
- **Purpose:** Runs scheduled evolution cycles that mutate, test, and select optimal configurations for prompts, routing tables, and agent strategies
- **Activation:** Scheduled Fibonacci intervals (daily for hot configs, weekly for warm, monthly for cold)
- **Consensus Mode:** Tournament selection — candidates compete via CSL fitness scoring
- **Outputs:** Next-generation configurations, fitness leaderboards, evolution history graphs
- **Duration:** 1 complete generation cycle (typically 34–55 minutes)

### 3. **DiplomacySwarm** 🏛️
- **Composition:** DiplomatBee (lead) + GovernanceBee + SecurityBee + OracleChain witness
- **Purpose:** Resolves multi-party resource conflicts, approves high-consequence operations (production deploys, schema migrations, key rotations)
- **Activation:** Any operation exceeding CSL HIGH (0.882) consequence threshold
- **Consensus Mode:** Tribunal — 3/4 must approve, with cryptographic audit trail via OracleChain
- **Outputs:** Approval/denial verdicts with reasoning chains, dissent records, signed receipts
- **Duration:** Synchronous — blocks until verdict (max 13-minute timeout)

### 4. **HarvestSwarm** 🌾
- **Composition:** HarvesterBee (lead) + PollinatorBee + VectorOpsBee + LoomBee
- **Purpose:** Bulk data ingestion campaigns — imports large datasets from external services, processes through embedding pipeline, cross-pollinates insights across domains
- **Activation:** Manual trigger or webhook batch events exceeding 89 items
- **Consensus Mode:** Pipeline — sequential processing with CSL quality gates between stages
- **Outputs:** Ingested and embedded datasets, cross-domain insight reports, knowledge graph updates
- **Duration:** Variable — scales with Fibonacci-sized batch processing

### 5. **DreamSwarm** 💭
- **Composition:** ProphetBee + CreativeBee + ArchivistBee + MutagenBee + LoomBee
- **Purpose:** Runs during low-activity periods (overnight, weekends) — traverses memory finding unexpected semantic connections, generating novel feature proposals, and consolidating knowledge
- **Activation:** System load drops below PSI^2 (38.2%) capacity for 34+ consecutive minutes
- **Consensus Mode:** Collaborative brainstorm — all bees contribute, ProphetBee scores for utility, CreativeBee scores for novelty
- **Outputs:** Dream reports with novel insights, feature proposals ranked by novelty×utility, consolidated memory packages
- **Duration:** Runs until system load rises above 61.8% capacity or 377-minute max

---

## Swarm Communication Protocol

All swarms use the standard HeadySwarm messaging pattern:

```javascript
// Swarm formation
const forensicSwarm = SwarmFactory.create({
  type: 'forensic',
  trigger: incidentEvent,
  consensus: 'unanimous',
  timeout: 89 * 60 * 1000, // 89 minutes in ms
  bees: ['echolocator', 'sentinel', 'archivist', 'intelligence']
});

// Swarm consensus voting
forensicSwarm.on('verdict', (result) => {
  if (result.consensus >= CSL_GATES.HIGH) {
    OracleChain.sign(result);
    publish(result.postMortem);
  }
});
```

## Sacred Geometry Swarm Placement

| Swarm | Primary Layer | Activation Pattern |
|-------|--------------|-------------------|
| ForensicSwarm | Middle (OBSERVER) | Reactive — incident-triggered |
| EvolutionSwarm | Ops (EVOLUTION) | Scheduled — Fibonacci intervals |
| DiplomacySwarm | Governance (ORACLE) | Synchronous — approval gates |
| HarvestSwarm | Outer (GATEWAY) | Batch — webhook/manual |
| DreamSwarm | Memory (DREAMER) | Opportunistic — low-load periods |
