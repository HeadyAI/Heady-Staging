/**
 * Heady Ecosystem Wiring Manifest
 * Complete inter-service communication map ensuring all components
 * communicate optimally as a perfect liquid dynamic parallel async
 * distributed intelligently orchestrated Latent OS
 *
 * © 2026 HeadySystems Inc. — Eric Head, Founder
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];
const CSL = { MIN: 0.500, LOW: 0.691, MED: 0.809, HIGH: 0.882, CRIT: 0.927, DEDUP: 0.972 };

/**
 * WIRING PRINCIPLES:
 * 1. Every service connects through the HeadyConductor or HeadySynapse message broker
 * 2. All connections use circuit breakers with phi-backoff
 * 3. Service discovery via HeadyNexus service mesh
 * 4. Authentication via HeadyGuard/Firebase with CSL-gated RBAC
 * 5. All inter-service calls carry correlation IDs for distributed tracing
 * 6. Phi-scaled timeout chains: edge(34ms) → gateway(89ms) → service(233ms) → db(610ms)
 */

const WIRING_MAP = {
  // ============================================
  // EDGE LAYER (Cloudflare)
  // ============================================
  'cloudflare-workers': {
    description: 'Edge compute layer — first contact for all requests',
    connections: {
      'api-gateway': { protocol: 'HTTPS', timeout: FIB[10], retry: 3, breakerThreshold: 5 },
      'heady-meridian-service': { protocol: 'HTTPS', timeout: FIB[9], purpose: 'geo-routing decisions' },
      'cloudflare-kv': { protocol: 'KV-API', timeout: FIB[7], purpose: 'edge state cache' },
      'cloudflare-vectorize': { protocol: 'Vectorize-API', timeout: FIB[8], purpose: 'edge embedding cache' }
    }
  },

  // ============================================
  // GATEWAY LAYER
  // ============================================
  'api-gateway': {
    description: 'Central API gateway — auth, rate limiting, routing',
    connections: {
      'heady-conductor': { protocol: 'gRPC', timeout: FIB[9], purpose: 'task classification and routing' },
      'auth-session-server': { protocol: 'HTTP', timeout: FIB[8], purpose: 'session validation' },
      'heady-cortex-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'neural path optimization' },
      'heady-echo-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'distributed tracing' },
      'heady-spectrum-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'feature flag evaluation' }
    }
  },

  // ============================================
  // ORCHESTRATION LAYER (Inner Ring)
  // ============================================
  'heady-conductor': {
    description: 'Central orchestration authority — classifies and routes all tasks',
    connections: {
      'heady-brain': { protocol: 'HTTP', timeout: FIB[9], purpose: 'LLM inference routing' },
      'heady-infer': { protocol: 'HTTP', timeout: FIB[9], purpose: 'AI model inference' },
      'heady-cortex-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'learned routing optimization' },
      'heady-weaver-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'context assembly' },
      'heady-synapse-service': { protocol: 'AMQP', timeout: FIB[8], purpose: 'async task dispatch' },
      'heady-flux-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'stream processing' },
      'auto-success-engine': { protocol: 'HTTP', timeout: FIB[9], purpose: 'HCFullPipeline execution' }
    }
  },

  // ============================================
  // INTELLIGENCE LAYER (Middle Ring)
  // ============================================
  'heady-brain': {
    description: 'LLM provider routing with model selection',
    connections: {
      'heady-infer': { protocol: 'HTTP', timeout: FIB[10], purpose: 'model inference' },
      'heady-embed': { protocol: 'HTTP', timeout: FIB[8], purpose: '384D embedding generation' },
      'heady-vector': { protocol: 'HTTP', timeout: FIB[8], purpose: 'vector memory operations' },
      'heady-oracle-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'prediction queries' },
      'heady-weaver-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'context retrieval' }
    }
  },

  // ============================================
  // MEMORY LAYER
  // ============================================
  'heady-vector': {
    description: '384D vector memory with pgvector backend',
    connections: {
      'neon-postgres': { protocol: 'PostgreSQL', timeout: FIB[10], purpose: 'pgvector HNSW index' },
      'heady-embed': { protocol: 'HTTP', timeout: FIB[8], purpose: 'embedding generation' },
      'heady-compass-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'semantic search queries' },
      'heady-chronicle-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'memory change events' },
      'upstash-redis': { protocol: 'Redis', timeout: FIB[7], purpose: 'embedding cache L2' }
    }
  },

  // ============================================
  // SECURITY LAYER
  // ============================================
  'heady-security': {
    description: 'Security enforcement and monitoring',
    connections: {
      'heady-guardian-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'runtime threat detection' },
      'heady-vault-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'secret management' },
      'heady-harbor-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'container security' },
      'auth-session-server': { protocol: 'HTTP', timeout: FIB[7], purpose: 'auth validation' },
      'heady-guard': { protocol: 'HTTP', timeout: FIB[7], purpose: 'Ed25519 signing' }
    }
  },

  // ============================================
  // OBSERVABILITY LAYER
  // ============================================
  'heady-health': {
    description: 'Health monitoring and observability',
    connections: {
      'heady-echo-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'distributed trace aggregation' },
      'heady-resonance-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'coherence monitoring' },
      'heady-aurora-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'dashboard metrics' },
      'heady-beacon-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'alert dispatch' },
      'heady-catalyst-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'performance profiling' }
    }
  },

  // ============================================
  // MCP LAYER
  // ============================================
  'heady-mcp': {
    description: 'Model Context Protocol server and gateway',
    connections: {
      'heady-conductor': { protocol: 'JSON-RPC', timeout: FIB[9], purpose: 'tool routing' },
      'heady-nexus-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'service discovery' },
      'heady-prism-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'data transformation' },
      'heady-compass-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'resource search' },
      'heady-forge-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'deployment triggers' }
    }
  },

  // ============================================
  // GOVERNANCE LAYER
  // ============================================
  'heady-governance': {
    description: 'Glass Box governance and compliance',
    connections: {
      'heady-resonance-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'coherence reports' },
      'heady-genome-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'evolution cycles' },
      'heady-chronicle-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'audit trail' },
      'heady-meridian-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'compliance routing' }
    }
  },

  // ============================================
  // RECOVERY LAYER
  // ============================================
  'heady-recovery': {
    description: 'Disaster recovery and resilience',
    connections: {
      'heady-phoenix-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'failover orchestration' },
      'heady-mirror-service': { protocol: 'HTTP', timeout: FIB[9], purpose: 'shadow execution' },
      'heady-nexus-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'service mesh control' },
      'neon-postgres': { protocol: 'PostgreSQL', timeout: FIB[8], purpose: 'branch failover' }
    }
  },

  // ============================================
  // EVOLUTION LAYER
  // ============================================
  'heady-evolution': {
    description: 'System self-improvement and learning',
    connections: {
      'heady-genome-service': { protocol: 'HTTP', timeout: FIB[9], purpose: 'genetic optimization' },
      'heady-oracle-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'prediction feeds' },
      'heady-catalyst-service': { protocol: 'HTTP', timeout: FIB[8], purpose: 'performance data' },
      'heady-chronicle-service': { protocol: 'HTTP', timeout: FIB[7], purpose: 'historical learning' }
    }
  }
};

// Compute total connections
function computeWiringStats(map) {
  let totalConnections = 0;
  let totalServices = Object.keys(map).length;
  const allTargets = new Set();

  for (const [source, config] of Object.entries(map)) {
    const connCount = Object.keys(config.connections).length;
    totalConnections += connCount;
    for (const target of Object.keys(config.connections)) {
      allTargets.add(target);
    }
  }

  return {
    totalSources: totalServices,
    totalTargets: allTargets.size,
    totalConnections,
    avgConnectionsPerService: (totalConnections / totalServices).toFixed(1),
    connectionDensity: (totalConnections / (totalServices * allTargets.size)).toFixed(3)
  };
}

module.exports = { WIRING_MAP, computeWiringStats };
