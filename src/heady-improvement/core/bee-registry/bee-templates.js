/**
 * HeadyBee Template Registry — Canonical 33 Bee Type Definitions
 * 
 * Every bee type in the Heady ecosystem with its lifecycle config,
 * domain embedding (8D), swarm affinity, resource class, and capability profile.
 * All parameters use φ-scaled constants.
 * 
 * @module core/bee-registry/bee-templates
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/**
 * Resource classes with φ-scaled limits
 */
const RESOURCE_CLASSES = {
  lightweight: {
    maxMemoryMB: FIB[8] * 8,       // 168 MB
    maxCpuShares: FIB[8],           // 21
    timeoutMs: Math.round(PHI * 1000 * FIB[5]),  // ~8090ms
    maxConcurrent: FIB[7],          // 13
  },
  standard: {
    maxMemoryMB: FIB[10] * 8,      // 440 MB
    maxCpuShares: FIB[9],           // 34
    timeoutMs: Math.round(PHI * 1000 * FIB[7]),  // ~21s
    maxConcurrent: FIB[6],          // 8
  },
  heavy: {
    maxMemoryMB: FIB[12] * 8,      // 1152 MB
    maxCpuShares: FIB[10],          // 55
    timeoutMs: Math.round(PHI * 1000 * FIB[9]),  // ~55s
    maxConcurrent: FIB[5],          // 5
  },
  critical: {
    maxMemoryMB: FIB[13] * 8,      // 1864 MB
    maxCpuShares: FIB[11],          // 89
    timeoutMs: Math.round(PHI * 1000 * FIB[10]), // ~89s
    maxConcurrent: FIB[4],          // 3
  },
};

/**
 * Swarm affinities — which of the 17 canonical swarms each bee can join
 */
const SWARM_TYPES = [
  'Deploy', 'Battle', 'Research', 'Security', 'Memory', 'Creative',
  'Trading', 'Health', 'Governance', 'Documentation', 'Testing',
  'Migration', 'Monitoring', 'Cleanup', 'Onboarding', 'Analytics', 'Emergency',
];

/**
 * Canonical 33 Bee Type Templates
 * 
 * Domain embedding: 8D vector [reasoning, coding, creative, speed, cost, multimodal, context, reliability]
 * Values represent capability strength on 0–1 scale
 */
export const BEE_TEMPLATES = {
  'agents-bee': {
    displayName: 'Agents Bee',
    description: 'Manages agent creation, routing, and lifecycle orchestration',
    module: 'src/bees/agents-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.85, 0.70, 0.40, 0.75, 0.60, 0.30, 0.80, 0.90],
    swarmAffinity: ['Deploy', 'Onboarding', 'Emergency'],
    pool: 'hot',
    retries: FIB[5],        // 5
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['agent-spawn', 'agent-route', 'agent-retire'],
  },

  'auth-provider-bee': {
    displayName: 'Auth Provider Bee',
    description: 'Authentication provider orchestration and token management',
    module: 'src/bees/auth-provider-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.60, 0.75, 0.10, 0.90, 0.80, 0.10, 0.40, 0.95],
    swarmAffinity: ['Security', 'Onboarding'],
    pool: 'hot',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['auth-validate', 'token-refresh', 'session-manage'],
  },

  'auto-success-bee': {
    displayName: 'Auto Success Bee',
    description: 'Automated success pipeline execution (HeadyAutoFlow)',
    module: 'src/bees/auto-success-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.90, 0.85, 0.60, 0.50, 0.40, 0.50, 0.90, 0.85],
    swarmAffinity: ['Battle', 'Testing', 'Analytics'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['pipeline-execute', 'battle-mode', 'pattern-capture'],
  },

  'brain-bee': {
    displayName: 'Brain Bee',
    description: 'LLM provider routing and model selection intelligence',
    module: 'src/bees/brain-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.95, 0.80, 0.70, 0.80, 0.50, 0.60, 0.90, 0.88],
    swarmAffinity: ['Research', 'Creative', 'Analytics'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['model-select', 'provider-route', 'context-assemble'],
  },

  'config-bee': {
    displayName: 'Config Bee',
    description: 'Configuration management, validation, and distribution',
    module: 'src/bees/config-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.50, 0.65, 0.10, 0.85, 0.90, 0.10, 0.60, 0.92],
    swarmAffinity: ['Deploy', 'Governance', 'Onboarding'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['config-validate', 'config-distribute', 'env-manage'],
  },

  'connectors-bee': {
    displayName: 'Connectors Bee',
    description: 'External service connector management and OAuth flows',
    module: 'src/bees/connectors-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.55, 0.80, 0.20, 0.70, 0.60, 0.40, 0.50, 0.85],
    swarmAffinity: ['Deploy', 'Onboarding', 'Migration'],
    pool: 'warm',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['connector-register', 'oauth-flow', 'webhook-manage'],
  },

  'creative-bee': {
    displayName: 'Creative Bee',
    description: 'Creative content generation — images, music, text, UX',
    module: 'src/bees/creative-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.65, 0.40, 0.95, 0.50, 0.35, 0.90, 0.70, 0.80],
    swarmAffinity: ['Creative', 'Documentation'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['image-generate', 'text-create', 'music-compose', 'ux-design'],
  },

  'deployment-bee': {
    displayName: 'Deployment Bee',
    description: 'Cloud deployment automation across GCP, Cloudflare, Docker',
    module: 'src/bees/deployment-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.70, 0.90, 0.15, 0.60, 0.50, 0.20, 0.70, 0.92],
    swarmAffinity: ['Deploy', 'Emergency'],
    pool: 'warm',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['docker-build', 'cloud-run-deploy', 'cf-deploy', 'rollback'],
  },

  'device-provisioner-bee': {
    displayName: 'Device Provisioner Bee',
    description: 'Device onboarding, provisioning, and cross-device bridge',
    module: 'src/bees/device-provisioner-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.45, 0.70, 0.15, 0.80, 0.75, 0.30, 0.40, 0.88],
    swarmAffinity: ['Onboarding', 'Security'],
    pool: 'cold',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[9]),
    capabilities: ['device-register', 'device-provision', 'bridge-setup'],
  },

  'documentation-bee': {
    displayName: 'Documentation Bee',
    description: 'Auto-documentation generation from code and architecture',
    module: 'src/bees/documentation-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.75, 0.70, 0.80, 0.60, 0.65, 0.30, 0.85, 0.85],
    swarmAffinity: ['Documentation', 'Research'],
    pool: 'cold',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 1500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[9]),
    capabilities: ['doc-generate', 'api-doc', 'readme-update', 'changelog'],
  },

  'engines-bee': {
    displayName: 'Engines Bee',
    description: 'Engine orchestration — start, stop, monitor compute engines',
    module: 'src/bees/engines-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.65, 0.80, 0.20, 0.75, 0.55, 0.30, 0.65, 0.90],
    swarmAffinity: ['Deploy', 'Monitoring', 'Emergency'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['engine-start', 'engine-stop', 'engine-scale'],
  },

  'governance-bee': {
    displayName: 'Governance Bee',
    description: 'Policy enforcement, compliance gates, approval workflows',
    module: 'src/bees/governance-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.80, 0.55, 0.15, 0.70, 0.75, 0.10, 0.75, 0.95],
    swarmAffinity: ['Governance', 'Security'],
    pool: 'hot',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['policy-enforce', 'approval-gate', 'audit-log'],
  },

  'health-bee': {
    displayName: 'Health Bee',
    description: 'Health probe execution, liveness, readiness reporting',
    module: 'src/bees/health-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.45, 0.55, 0.10, 0.95, 0.90, 0.10, 0.40, 0.95],
    swarmAffinity: ['Health', 'Monitoring', 'Emergency'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['liveness-probe', 'readiness-probe', 'dependency-check'],
  },

  'intelligence-bee': {
    displayName: 'Intelligence Bee',
    description: 'Intelligence gathering, analysis, and insight synthesis',
    module: 'src/bees/intelligence-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.92, 0.60, 0.50, 0.55, 0.40, 0.50, 0.90, 0.85],
    swarmAffinity: ['Research', 'Analytics', 'Battle'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['intel-gather', 'trend-analyze', 'insight-synthesize'],
  },

  'lifecycle-bee': {
    displayName: 'Lifecycle Bee',
    description: 'Service lifecycle management — graceful shutdown, LIFO cleanup',
    module: 'src/bees/lifecycle-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.55, 0.70, 0.10, 0.85, 0.80, 0.10, 0.50, 0.95],
    swarmAffinity: ['Deploy', 'Cleanup', 'Emergency'],
    pool: 'hot',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['graceful-shutdown', 'lifo-cleanup', 'state-persist'],
  },

  'mcp-bee': {
    displayName: 'MCP Bee',
    description: 'MCP protocol tool execution and transport management',
    module: 'src/bees/mcp-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.70, 0.85, 0.25, 0.80, 0.60, 0.40, 0.65, 0.90],
    swarmAffinity: ['Deploy', 'Research'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['tool-execute', 'transport-manage', 'schema-validate'],
  },

  'memory-bee': {
    displayName: 'Memory Bee',
    description: 'Vector memory operations — store, retrieve, embed, search',
    module: 'src/bees/memory-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.75, 0.65, 0.30, 0.80, 0.55, 0.40, 0.95, 0.90],
    swarmAffinity: ['Memory', 'Research', 'Analytics'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['vector-store', 'vector-search', 'embed', 'memory-compress'],
  },

  'middleware-bee': {
    displayName: 'Middleware Bee',
    description: 'Middleware chain management and request pipeline protection',
    module: 'src/bees/middleware-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.50, 0.75, 0.10, 0.90, 0.85, 0.10, 0.45, 0.92],
    swarmAffinity: ['Security', 'Governance'],
    pool: 'hot',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['middleware-chain', 'request-filter', 'response-transform'],
  },

  'midi-bee': {
    displayName: 'MIDI Bee',
    description: 'MIDI event processing and music integration',
    module: 'src/bees/midi-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.30, 0.40, 0.95, 0.70, 0.80, 0.60, 0.30, 0.75],
    swarmAffinity: ['Creative'],
    pool: 'cold',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[9]),
    capabilities: ['midi-process', 'audio-generate', 'rhythm-analyze'],
  },

  'ops-bee': {
    displayName: 'Ops Bee',
    description: 'Operations automation — cron, batch jobs, maintenance tasks',
    module: 'src/bees/ops-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.60, 0.75, 0.15, 0.70, 0.70, 0.15, 0.60, 0.90],
    swarmAffinity: ['Cleanup', 'Monitoring', 'Migration'],
    pool: 'cold',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['cron-manage', 'batch-execute', 'maintenance-run'],
  },

  'orchestration-bee': {
    displayName: 'Orchestration Bee',
    description: 'Multi-bee orchestration coordination and swarm dispatch',
    module: 'src/bees/orchestration-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.85, 0.70, 0.35, 0.75, 0.55, 0.30, 0.85, 0.92],
    swarmAffinity: ['Deploy', 'Battle', 'Emergency'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['swarm-dispatch', 'bee-coordinate', 'workflow-chain'],
  },

  'pipeline-bee': {
    displayName: 'Pipeline Bee',
    description: 'Pipeline stage execution for HCFullPipeline',
    module: 'src/bees/pipeline-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.80, 0.80, 0.40, 0.60, 0.45, 0.40, 0.85, 0.90],
    swarmAffinity: ['Battle', 'Testing', 'Analytics'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['stage-execute', 'pipeline-chain', 'checkpoint-save'],
  },

  'providers-bee': {
    displayName: 'Providers Bee',
    description: 'AI provider health monitoring and failover management',
    module: 'src/bees/providers-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.55, 0.60, 0.15, 0.85, 0.70, 0.20, 0.50, 0.92],
    swarmAffinity: ['Health', 'Monitoring'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['provider-health', 'failover-manage', 'circuit-break'],
  },

  'refactor-bee': {
    displayName: 'Refactor Bee',
    description: 'Code refactoring automation and quality improvement',
    module: 'src/bees/refactor-bee.js',
    resourceClass: 'heavy',
    domainEmbedding: [0.80, 0.95, 0.30, 0.50, 0.40, 0.20, 0.85, 0.85],
    swarmAffinity: ['Battle', 'Testing', 'Documentation'],
    pool: 'cold',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[9]),
    capabilities: ['code-refactor', 'dead-code-remove', 'pattern-apply'],
  },

  'resilience-bee': {
    displayName: 'Resilience Bee',
    description: 'Resilience pattern enforcement — circuit breakers, retries, bulkheads',
    module: 'src/bees/resilience-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.65, 0.70, 0.10, 0.85, 0.80, 0.10, 0.55, 0.95],
    swarmAffinity: ['Health', 'Emergency', 'Monitoring'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['circuit-break', 'retry-manage', 'bulkhead-enforce'],
  },

  'routes-bee': {
    displayName: 'Routes Bee',
    description: 'API route management and endpoint registration',
    module: 'src/bees/routes-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.45, 0.80, 0.10, 0.90, 0.85, 0.15, 0.40, 0.90],
    swarmAffinity: ['Deploy', 'Governance'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['route-register', 'route-validate', 'openapi-generate'],
  },

  'security-bee': {
    displayName: 'Security Bee',
    description: 'Security scanning, vulnerability detection, and enforcement',
    module: 'src/bees/security-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.80, 0.75, 0.10, 0.70, 0.60, 0.15, 0.70, 0.95],
    swarmAffinity: ['Security', 'Governance', 'Emergency'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['vuln-scan', 'secret-detect', 'policy-enforce', 'audit-trail'],
  },

  'services-bee': {
    displayName: 'Services Bee',
    description: 'Service catalog management and discovery',
    module: 'src/bees/services-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.50, 0.65, 0.15, 0.80, 0.80, 0.15, 0.55, 0.90],
    swarmAffinity: ['Deploy', 'Monitoring', 'Onboarding'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['service-register', 'service-discover', 'catalog-manage'],
  },

  'sync-projection-bee': {
    displayName: 'Sync Projection Bee',
    description: 'Repository projection synchronization and monorepo management',
    module: 'src/bees/sync-projection-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.60, 0.85, 0.15, 0.60, 0.60, 0.10, 0.70, 0.88],
    swarmAffinity: ['Deploy', 'Migration'],
    pool: 'cold',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 2000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[9]),
    capabilities: ['repo-sync', 'projection-map', 'diff-detect'],
  },

  'telemetry-bee': {
    displayName: 'Telemetry Bee',
    description: 'Telemetry collection, aggregation, and export',
    module: 'src/bees/telemetry-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.50, 0.60, 0.10, 0.90, 0.85, 0.15, 0.55, 0.90],
    swarmAffinity: ['Monitoring', 'Analytics', 'Health'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[6]),
    capabilities: ['metric-collect', 'trace-export', 'log-aggregate'],
  },

  'trading-bee': {
    displayName: 'Trading Bee',
    description: 'Financial trading operations and HeadyCoin management',
    module: 'src/bees/trading-bee.js',
    resourceClass: 'critical',
    domainEmbedding: [0.85, 0.70, 0.20, 0.90, 0.30, 0.30, 0.75, 0.95],
    swarmAffinity: ['Trading', 'Analytics', 'Security'],
    pool: 'hot',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 500),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[5]),
    capabilities: ['trade-execute', 'risk-assess', 'ledger-update'],
  },

  'vector-ops-bee': {
    displayName: 'Vector Ops Bee',
    description: 'Vector space operations — CSL gates, embeddings, similarity',
    module: 'src/bees/vector-ops-bee.js',
    resourceClass: 'standard',
    domainEmbedding: [0.80, 0.75, 0.25, 0.75, 0.60, 0.40, 0.90, 0.88],
    swarmAffinity: ['Memory', 'Research', 'Analytics'],
    pool: 'hot',
    retries: FIB[5],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[7]),
    capabilities: ['csl-gate', 'vector-embed', 'similarity-search', 'hdc-bind'],
  },

  'vector-template-bee': {
    displayName: 'Vector Template Bee',
    description: 'Vector template management and codebook operations',
    module: 'src/bees/vector-template-bee.js',
    resourceClass: 'lightweight',
    domainEmbedding: [0.60, 0.65, 0.20, 0.80, 0.75, 0.30, 0.85, 0.85],
    swarmAffinity: ['Memory', 'Documentation'],
    pool: 'warm',
    retries: FIB[4],
    backoffBaseMs: Math.round(PHI * 1000),
    healthCheckIntervalMs: Math.round(PHI * 1000 * FIB[8]),
    capabilities: ['template-create', 'codebook-manage', 'embedding-cache'],
  },
};

/** Pool distribution counts — φ-scaled resource allocation */
export const POOL_DISTRIBUTION = {
  hot: Object.values(BEE_TEMPLATES).filter(b => b.pool === 'hot').length,
  warm: Object.values(BEE_TEMPLATES).filter(b => b.pool === 'warm').length,
  cold: Object.values(BEE_TEMPLATES).filter(b => b.pool === 'cold').length,
};

export { RESOURCE_CLASSES, SWARM_TYPES };
