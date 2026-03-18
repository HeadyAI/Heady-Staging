/**
 * Heady New Node Definitions — Sacred Geometry Topology Extension
 * 15 new nodes placed across the Sacred Geometry rings
 * © 2026 HeadySystems Inc. — Eric Head, Founder — 60+ Provisional Patents
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];
const CSL = { MIN: 0.500, LOW: 0.691, MED: 0.809, HIGH: 0.882, CRIT: 0.927, DEDUP: 0.972 };

/**
 * SACRED GEOMETRY TOPOLOGY — Extended Node Map
 *
 * CENTER (HeadySoul)
 *   └─ SPINE — Nervous system backbone connecting all rings
 *
 * INNER RING (Processing Core)
 *   ├─ HeadyBrains, HeadyConductor, HeadyVinci, HeadyAutoSuccess
 *   ├─ CORTEX — Neural routing with learned path optimization
 *   └─ WEAVER — Context assembly with phi-weighted priority
 *
 * MIDDLE RING (Execution Layer)
 *   ├─ JULES, BUILDER, OBSERVER, MURPHY, ATLAS, PYTHIA
 *   ├─ ORACLE — Monte Carlo prediction engine
 *   ├─ CHRONICLE — Event sourcing and system timeline
 *   ├─ FLUX — Stream processing and real-time pipelines
 *   └─ CATALYST — Performance optimization engine
 *
 * OUTER RING (Specialized Capabilities)
 *   ├─ BRIDGE, MUSE, SENTINEL, NOVA, JANITOR, SOPHIA, CIPHER, LENS
 *   ├─ BEACON — Multi-channel alerting with phi-escalation
 *   ├─ COMPASS — Semantic search across all resources
 *   ├─ PRISM — Multi-modal data transformation
 *   ├─ GUARDIAN — Runtime security monitoring
 *   └─ HARBOR — Container registry and image management
 *
 * GOVERNANCE SHELL
 *   ├─ HeadyCheck, HeadyAssure, HeadyAware, HeadyPatterns, HeadyMC, HeadyRisk
 *   ├─ RESONANCE — System-wide coherence monitoring
 *   ├─ GENOME — Genetic algorithm optimization
 *   └─ MERIDIAN — Global traffic routing and geo-compliance
 *
 * RECOVERY LAYER (New)
 *   ├─ PHOENIX — Disaster recovery orchestration
 *   ├─ MIRROR — Shadow execution and sandbox testing
 *   └─ NEXUS — Service mesh control plane
 */

const NEW_NODES = [
  // Inner Ring Extensions
  {
    name: 'CORTEX',
    ring: 'inner',
    type: 'orchestrator',
    description: 'Neural routing cortex — learns optimal service paths using Hebbian learning with phi-weighted synapse strengthening',
    pool: 'Hot',
    resourcePct: 0.05,
    services: ['heady-cortex-service'],
    bees: ['cortex-bee'],
    cslThreshold: CSL.HIGH,
    capabilities: ['neural-routing', 'path-optimization', 'hebbian-learning', 'traffic-shaping'],
    connections: ['HeadyConductor', 'SPINE', 'ORACLE', 'RESONANCE']
  },
  {
    name: 'WEAVER',
    ring: 'inner',
    type: 'orchestrator',
    description: 'Context assembly node — weaves optimal context windows with phi-weighted priority ordering',
    pool: 'Hot',
    resourcePct: 0.04,
    services: ['heady-weaver-service'],
    bees: ['weaver-bee'],
    cslThreshold: CSL.HIGH,
    capabilities: ['context-assembly', 'phi-priority', 'deduplication', 'embedding-scoring'],
    connections: ['HeadyBrains', 'HeadyVinci', 'COMPASS']
  },

  // Middle Ring Extensions
  {
    name: 'ORACLE',
    ring: 'middle',
    type: 'analyzer',
    description: 'Monte Carlo prediction engine — forecasts load, cost, failures with phi-scaled sampling',
    pool: 'Warm',
    resourcePct: 0.03,
    services: ['heady-oracle-service'],
    bees: ['oracle-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['monte-carlo', 'load-forecasting', 'cost-prediction', 'failure-probability'],
    connections: ['ATLAS', 'PYTHIA', 'CATALYST', 'HeadyMC']
  },
  {
    name: 'CHRONICLE',
    ring: 'middle',
    type: 'recorder',
    description: 'Event sourcing node — immutable system timeline with phi-scaled snapshot intervals',
    pool: 'Warm',
    resourcePct: 0.03,
    services: ['heady-chronicle-service'],
    bees: ['chronicle-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['event-sourcing', 'timeline-management', 'snapshot-restore', 'replay'],
    connections: ['OBSERVER', 'LENS', 'RESONANCE', 'HeadyPatterns']
  },
  {
    name: 'FLUX',
    ring: 'middle',
    type: 'processor',
    description: 'Stream processing node — real-time data pipelines with backpressure and phi-windowing',
    pool: 'Hot',
    resourcePct: 0.04,
    services: ['heady-flux-service'],
    bees: ['pipeline-bee'],
    cslThreshold: CSL.HIGH,
    capabilities: ['stream-processing', 'backpressure', 'windowing', 'exactly-once'],
    connections: ['BUILDER', 'CHRONICLE', 'SYNAPSE']
  },
  {
    name: 'CATALYST',
    ring: 'middle',
    type: 'optimizer',
    description: 'Performance optimization engine — profiles, identifies bottlenecks, phi-auto-tunes',
    pool: 'Warm',
    resourcePct: 0.02,
    services: ['heady-catalyst-service'],
    bees: ['catalyst-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['profiling', 'bottleneck-detection', 'auto-tuning', 'phi-optimization'],
    connections: ['OBSERVER', 'ORACLE', 'RESONANCE']
  },

  // Outer Ring Extensions
  {
    name: 'BEACON',
    ring: 'outer',
    type: 'alerter',
    description: 'Multi-channel alerting — phi-escalation thresholds, Slack/email/SMS/webhook',
    pool: 'Warm',
    resourcePct: 0.02,
    services: ['heady-beacon-service'],
    bees: ['beacon-bee'],
    cslThreshold: CSL.LOW,
    capabilities: ['alerting', 'escalation', 'multi-channel', 'suppression'],
    connections: ['SENTINEL', 'RESONANCE', 'OBSERVER']
  },
  {
    name: 'COMPASS',
    ring: 'outer',
    type: 'searcher',
    description: 'Semantic search across all Heady resources — 384D hybrid BM25+vector search',
    pool: 'Warm',
    resourcePct: 0.03,
    services: ['heady-compass-service'],
    bees: ['memory-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['semantic-search', 'hybrid-search', 'cross-resource', 'ranking'],
    connections: ['SOPHIA', 'ATLAS', 'WEAVER']
  },
  {
    name: 'PRISM',
    ring: 'outer',
    type: 'transformer',
    description: 'Multi-modal data transformation — JSON/XML/CSV/Protobuf/Avro with schema validation',
    pool: 'Warm',
    resourcePct: 0.02,
    services: ['heady-prism-service'],
    bees: ['prism-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['data-transform', 'schema-validation', 'format-conversion', 'batch-processing'],
    connections: ['BRIDGE', 'FLUX', 'BUILDER']
  },
  {
    name: 'GUARDIAN',
    ring: 'outer',
    type: 'security',
    description: 'Runtime security — prompt injection detection, exfiltration prevention, CSL threat scoring',
    pool: 'Hot',
    resourcePct: 0.03,
    services: ['heady-guardian-service'],
    bees: ['guardian-bee'],
    cslThreshold: CSL.CRIT,
    capabilities: ['threat-detection', 'prompt-injection', 'dlp', 'threat-scoring'],
    connections: ['MURPHY', 'SENTINEL', 'CIPHER']
  },
  {
    name: 'HARBOR',
    ring: 'outer',
    type: 'registry',
    description: 'Container registry — OCI signatures, vulnerability scanning, SBOM generation',
    pool: 'Cold',
    resourcePct: 0.02,
    services: ['heady-harbor-service'],
    bees: ['deployment-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['container-registry', 'vulnerability-scan', 'sbom', 'oci-signing'],
    connections: ['FORGE', 'JANITOR', 'SENTINEL']
  },

  // Governance Shell Extensions
  {
    name: 'RESONANCE',
    ring: 'governance',
    type: 'monitor',
    description: 'System-wide coherence monitor — CSL cosine similarity across all services, drift alerting',
    pool: 'Governance',
    resourcePct: 0.02,
    services: ['heady-resonance-service'],
    bees: ['resonance-bee'],
    cslThreshold: CSL.HIGH,
    capabilities: ['coherence-monitoring', 'drift-detection', 'system-health', 'alerting'],
    connections: ['HeadyAware', 'HeadyCheck', 'BEACON', 'HeadySoul']
  },
  {
    name: 'GENOME',
    ring: 'governance',
    type: 'evolver',
    description: 'Genetic algorithm optimization — evolves agent configs, prompts, routing tables',
    pool: 'Cold',
    resourcePct: 0.02,
    services: ['heady-genome-service'],
    bees: ['genome-bee'],
    cslThreshold: CSL.MED,
    capabilities: ['genetic-algorithm', 'evolution', 'prompt-optimization', 'config-tuning'],
    connections: ['HeadyPatterns', 'HeadyMC', 'ORACLE']
  },
  {
    name: 'MERIDIAN',
    ring: 'governance',
    type: 'router',
    description: 'Global traffic routing — geo-aware load balancing, data residency, phi-latency optimization',
    pool: 'Hot',
    resourcePct: 0.03,
    services: ['heady-meridian-service'],
    bees: ['ops-bee'],
    cslThreshold: CSL.HIGH,
    capabilities: ['geo-routing', 'load-balancing', 'data-residency', 'latency-optimization'],
    connections: ['CORTEX', 'HeadyConductor', 'NEXUS']
  },

  // Recovery Layer (New Ring)
  {
    name: 'PHOENIX',
    ring: 'recovery',
    type: 'recovery',
    description: 'Disaster recovery orchestrator — failover, Neon branching, phi-staged rollback, RTO/RPO',
    pool: 'Reserve',
    resourcePct: 0.03,
    services: ['heady-phoenix-service'],
    bees: ['phoenix-bee'],
    cslThreshold: CSL.CRIT,
    capabilities: ['disaster-recovery', 'failover', 'rollback', 'rto-rpo-tracking'],
    connections: ['NEXUS', 'MIRROR', 'HeadyAssure', 'HeadySoul']
  }
];

// Node lifecycle states
const NODE_STATES = ['SPAWNING', 'READY', 'ACTIVE', 'DEGRADED', 'RECOVERING', 'SHUTDOWN'];

// Validate all nodes have proper connections
function validateTopology(nodes) {
  const nodeNames = new Set(nodes.map(n => n.name));
  const issues = [];
  for (const node of nodes) {
    for (const conn of node.connections) {
      if (!nodeNames.has(conn) && !['HeadySoul','HeadyBrains','HeadyConductor','HeadyVinci','HeadyAutoSuccess',
        'JULES','BUILDER','OBSERVER','MURPHY','ATLAS','PYTHIA','BRIDGE','MUSE','SENTINEL','NOVA','JANITOR',
        'SOPHIA','CIPHER','LENS','HeadyCheck','HeadyAssure','HeadyAware','HeadyPatterns','HeadyMC','HeadyRisk',
        'SPINE','SYNAPSE','FORGE','NEXUS','MIRROR'].includes(conn)) {
        issues.push(`${node.name} → ${conn}: target not found`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

// Compute total resource allocation
function computeResourceAllocation(nodes) {
  const byPool = {};
  for (const node of nodes) {
    byPool[node.pool] = (byPool[node.pool] || 0) + node.resourcePct;
  }
  return byPool;
}

module.exports = { NEW_NODES, NODE_STATES, validateTopology, computeResourceAllocation };
