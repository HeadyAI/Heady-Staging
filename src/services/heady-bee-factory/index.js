/**
 * @fileoverview heady-bee-factory — Dynamic bee worker spawning factory — creates, tracks, and retires bee agents
 * @module heady-bee-factory
 * @version 4.0.0
 * @port 3319
 * @domain agents
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

/**
 * All 33 bee types with their roles.
 * @type {Object<string, {role: string, domain: string, pool: string}>}
 */
const BEE_TYPES = Object.freeze({
  'agents-bee':            { role: 'Agent creation and routing', domain: 'agents', pool: 'hot' },
  'auth-provider-bee':     { role: 'Authentication provider orchestration', domain: 'security', pool: 'hot' },
  'auto-success-bee':      { role: 'Automated success pipeline execution', domain: 'orchestration', pool: 'hot' },
  'brain-bee':             { role: 'LLM provider routing and model selection', domain: 'inference', pool: 'hot' },
  'config-bee':            { role: 'Configuration management and validation', domain: 'operations', pool: 'warm' },
  'connectors-bee':        { role: 'External service connector management', domain: 'integration', pool: 'warm' },
  'creative-bee':          { role: 'Creative content generation', domain: 'creative', pool: 'warm' },
  'deployment-bee':        { role: 'Cloud deployment automation', domain: 'operations', pool: 'warm' },
  'device-provisioner-bee':{ role: 'Device onboarding and provisioning', domain: 'operations', pool: 'cold' },
  'documentation-bee':     { role: 'Auto-documentation generation', domain: 'operations', pool: 'cold' },
  'engines-bee':           { role: 'Engine orchestration and lifecycle', domain: 'orchestration', pool: 'warm' },
  'governance-bee':        { role: 'Policy enforcement and compliance', domain: 'governance', pool: 'warm' },
  'health-bee':            { role: 'Health probe execution and reporting', domain: 'observability', pool: 'warm' },
  'intelligence-bee':      { role: 'Intelligence gathering and analysis', domain: 'inference', pool: 'warm' },
  'lifecycle-bee':         { role: 'Service lifecycle management', domain: 'operations', pool: 'warm' },
  'mcp-bee':               { role: 'MCP protocol tool execution', domain: 'integration', pool: 'hot' },
  'memory-bee':            { role: 'Memory operations', domain: 'memory', pool: 'hot' },
  'middleware-bee':        { role: 'Middleware chain management', domain: 'security', pool: 'warm' },
  'midi-bee':              { role: 'MIDI event processing', domain: 'creative', pool: 'cold' },
  'ops-bee':               { role: 'Operations automation', domain: 'operations', pool: 'warm' },
  'orchestration-bee':     { role: 'Multi-bee orchestration coordination', domain: 'orchestration', pool: 'hot' },
  'pipeline-bee':          { role: 'Pipeline stage execution', domain: 'orchestration', pool: 'hot' },
  'providers-bee':         { role: 'Provider health and failover', domain: 'inference', pool: 'warm' },
  'refactor-bee':          { role: 'Code refactoring automation', domain: 'operations', pool: 'cold' },
  'resilience-bee':        { role: 'Resilience pattern enforcement', domain: 'operations', pool: 'warm' },
  'routes-bee':            { role: 'API route management', domain: 'interface', pool: 'warm' },
  'security-bee':          { role: 'Security scanning and enforcement', domain: 'security', pool: 'hot' },
  'services-bee':          { role: 'Service catalog management', domain: 'operations', pool: 'warm' },
  'sync-projection-bee':   { role: 'Repo projection synchronization', domain: 'operations', pool: 'cold' },
  'telemetry-bee':         { role: 'Telemetry collection and export', domain: 'observability', pool: 'warm' },
  'trading-bee':           { role: 'Financial trading operations', domain: 'fintech', pool: 'warm' },
  'vector-ops-bee':        { role: 'Vector space operations', domain: 'memory', pool: 'hot' },
  'vector-template-bee':   { role: 'Vector template management', domain: 'memory', pool: 'warm' },
});

/** @type {Map<string, Object>} Active bee instances */
const activeBees = new Map();
/** @type {number} Total bees spawned */
let totalSpawned = 0;
/** @type {number} Total bees retired */
let totalRetired = 0;
const MAX_ACTIVE = fib(14); // 377 concurrent bees (scales to 10000 in production)

class HeadyBeeFactory extends LiquidNodeBase {
  constructor() {
    super({
      name: 'heady-bee-factory',
      port: 3319,
      domain: 'agents',
      description: 'Dynamic bee worker spawning factory',
      pool: 'hot',
      dependencies: ['heady-hive', 'heady-conductor'],
    });
  }

  async onStart() {
    // POST /spawn — create a new bee worker
    this.route('POST', '/spawn', async (req, res, ctx) => {
      const { type, config, taskId } = ctx.body || {};
      if (!type || !BEE_TYPES[type]) {
        return this.sendError(res, 400, `Unknown bee type: ${type}. Available: ${Object.keys(BEE_TYPES).join(', ')}`, 'UNKNOWN_BEE_TYPE');
      }
      if (activeBees.size >= MAX_ACTIVE) {
        return this.sendError(res, 503, 'Bee capacity reached', 'CAPACITY_EXCEEDED');
      }

      const beeId = correlationId('bee');
      const beeInfo = BEE_TYPES[type];
      const bee = {
        beeId,
        type,
        role: beeInfo.role,
        domain: beeInfo.domain,
        pool: beeInfo.pool,
        status: 'spawned',
        config: config || {},
        taskId: taskId || null,
        spawnedAt: Date.now(),
        lastActivity: Date.now(),
      };

      activeBees.set(beeId, bee);
      totalSpawned++;
      mesh.events.publish(`heady.agents.bee.spawned`, { beeId, type });

      this.json(res, 201, { beeId, type, status: 'spawned', role: beeInfo.role });
    });

    // POST /retire — retire a bee worker
    this.route('POST', '/retire', async (req, res, ctx) => {
      const { beeId } = ctx.body || {};
      if (!beeId) return this.sendError(res, 400, 'Missing beeId', 'MISSING_BEE_ID');
      const bee = activeBees.get(beeId);
      if (!bee) return this.sendError(res, 404, 'Bee not found', 'BEE_NOT_FOUND');

      activeBees.delete(beeId);
      totalRetired++;
      mesh.events.publish(`heady.agents.bee.retired`, { beeId, type: bee.type });

      this.json(res, 200, { beeId, retired: true, lifespan: Date.now() - bee.spawnedAt });
    });

    // GET /types — list all 33 bee types
    this.route('GET', '/types', async (req, res, ctx) => {
      this.json(res, 200, { count: Object.keys(BEE_TYPES).length, types: BEE_TYPES });
    });

    // GET /active — list active bees
    this.route('GET', '/active', async (req, res, ctx) => {
      const bees = Array.from(activeBees.values());
      const byType = {};
      for (const bee of bees) {
        byType[bee.type] = (byType[bee.type] || 0) + 1;
      }
      this.json(res, 200, { count: bees.length, maxActive: MAX_ACTIVE, byType, bees });
    });

    // GET /stats — factory statistics
    this.route('GET', '/stats', async (req, res, ctx) => {
      this.json(res, 200, {
        totalSpawned,
        totalRetired,
        active: activeBees.size,
        maxActive: MAX_ACTIVE,
        beeTypes: Object.keys(BEE_TYPES).length,
        utilization: activeBees.size / MAX_ACTIVE,
      });
    });

    this.log.info('BeeFactory initialized', { beeTypes: Object.keys(BEE_TYPES).length, maxActive: MAX_ACTIVE });
  }
}

new HeadyBeeFactory().start();
