/**
 * HeadyConductor Routing Table Update
 * Registers all 25 new services into the conductor routing matrix
 * © 2026 HeadySystems Inc.
 */
'use strict';

const PHI = 1.618033988749895;
const CSL = { MIN: 0.500, LOW: 0.691, MED: 0.809, HIGH: 0.882, CRIT: 0.927 };

const NEW_ROUTES = [
  // Inner Ring — Hot Pool
  { domain: 'neural-routing',    primary: 'heady-cortex-service',    fallback: 'heady-conductor', pool: 'Hot', cslGate: CSL.HIGH },
  { domain: 'context-assembly',  primary: 'heady-weaver-service',    fallback: 'heady-brain',     pool: 'Hot', cslGate: CSL.HIGH },

  // Middle Ring — Hot/Warm Pool
  { domain: 'prediction',        primary: 'heady-oracle-service',    fallback: 'heady-eval',      pool: 'Warm', cslGate: CSL.MED },
  { domain: 'event-sourcing',    primary: 'heady-chronicle-service', fallback: 'heady-hive',      pool: 'Warm', cslGate: CSL.MED },
  { domain: 'stream-processing', primary: 'heady-flux-service',      fallback: 'heady-conductor', pool: 'Hot',  cslGate: CSL.HIGH },
  { domain: 'optimization',      primary: 'heady-catalyst-service',  fallback: 'heady-eval',      pool: 'Warm', cslGate: CSL.MED },
  { domain: 'distributed-trace', primary: 'heady-echo-service',      fallback: 'heady-health',    pool: 'Warm', cslGate: CSL.MED },
  { domain: 'dependency-graph',  primary: 'heady-atlas-mapping-service', fallback: 'heady-health', pool: 'Warm', cslGate: CSL.MED },
  { domain: 'message-broker',    primary: 'heady-synapse-service',   fallback: 'heady-conductor', pool: 'Hot',  cslGate: CSL.HIGH },
  { domain: 'scaffolding',       primary: 'heady-genesis-service',   fallback: 'heady-conductor', pool: 'Warm', cslGate: CSL.MED },

  // Outer Ring — Warm Pool
  { domain: 'alerting',          primary: 'heady-beacon-service',    fallback: 'heady-health',    pool: 'Warm', cslGate: CSL.LOW },
  { domain: 'semantic-search',   primary: 'heady-compass-service',   fallback: 'heady-vector',    pool: 'Warm', cslGate: CSL.MED },
  { domain: 'data-transform',    primary: 'heady-prism-service',     fallback: 'api-gateway',     pool: 'Warm', cslGate: CSL.MED },
  { domain: 'runtime-security',  primary: 'heady-guardian-service',  fallback: 'heady-security',  pool: 'Hot',  cslGate: CSL.CRIT },
  { domain: 'container-registry',primary: 'heady-harbor-service',    fallback: 'heady-security',  pool: 'Cold', cslGate: CSL.MED },
  { domain: 'cicd-pipeline',     primary: 'heady-forge-service',     fallback: 'heady-conductor', pool: 'Warm', cslGate: CSL.MED },
  { domain: 'feature-flags',     primary: 'heady-spectrum-service',  fallback: 'api-gateway',     pool: 'Warm', cslGate: CSL.MED },
  { domain: 'secret-management', primary: 'heady-vault-service',     fallback: 'heady-security',  pool: 'Warm', cslGate: CSL.HIGH },
  { domain: 'dashboard-metrics', primary: 'heady-aurora-service',    fallback: 'heady-health',    pool: 'Warm', cslGate: CSL.LOW },
  { domain: 'shadow-execution',  primary: 'heady-mirror-service',    fallback: 'heady-conductor', pool: 'Warm', cslGate: CSL.MED },

  // Governance — Governance Pool
  { domain: 'coherence-monitor', primary: 'heady-resonance-service', fallback: 'heady-health',    pool: 'Governance', cslGate: CSL.HIGH },
  { domain: 'evolution',         primary: 'heady-genome-service',    fallback: 'heady-eval',      pool: 'Cold',      cslGate: CSL.MED },
  { domain: 'geo-routing',       primary: 'heady-meridian-service',  fallback: 'api-gateway',     pool: 'Hot',       cslGate: CSL.HIGH },

  // Recovery — Reserve Pool
  { domain: 'disaster-recovery', primary: 'heady-phoenix-service',   fallback: 'heady-health',    pool: 'Reserve',   cslGate: CSL.CRIT },
  { domain: 'service-mesh',      primary: 'heady-nexus-service',     fallback: 'heady-conductor', pool: 'Hot',       cslGate: CSL.HIGH }
];

/**
 * Apply routing updates to HeadyConductor
 */
function applyRoutingUpdate(conductor) {
  for (const route of NEW_ROUTES) {
    conductor.registerRoute(route);
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: 'route_registered',
      domain: route.domain,
      primary: route.primary,
      pool: route.pool,
      cslGate: route.cslGate
    }));
  }
  return { registered: NEW_ROUTES.length, timestamp: Date.now() };
}

module.exports = { NEW_ROUTES, applyRoutingUpdate };
