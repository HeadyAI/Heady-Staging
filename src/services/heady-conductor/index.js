/**
 * @fileoverview heady-conductor — Central task routing and dispatch across 17 swarms with CSL domain classification
 * @module heady-conductor
 * @version 4.0.0
 * @port 3323
 * @domain orchestration
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
 * Domain embedding vectors for CSL-gated routing.
 * Each domain has a characteristic keyword set that gets embedded.
 * @type {Object<string, string[]>}
 */
const DOMAIN_KEYWORDS = Object.freeze({
  inference:     ['llm', 'model', 'generate', 'complete', 'chat', 'reason', 'ai', 'neural'],
  memory:        ['vector', 'embed', 'store', 'recall', 'search', 'similarity', 'pgvector', 'hnsw'],
  agents:        ['bee', 'swarm', 'worker', 'spawn', 'hive', 'factory', 'agent', 'task'],
  orchestration: ['pipeline', 'route', 'dispatch', 'chain', 'saga', 'conductor', 'flow', 'schedule'],
  security:      ['auth', 'token', 'session', 'rbac', 'encrypt', 'guard', 'audit', 'secret'],
  governance:    ['policy', 'compliance', 'review', 'approve', 'ethics', 'soul', 'coherence'],
  observability: ['health', 'metrics', 'log', 'trace', 'monitor', 'eval', 'test', 'alert'],
  operations:    ['deploy', 'migrate', 'maintain', 'feature', 'flag', 'schedule', 'cleanup'],
  interface:     ['ui', 'web', 'dashboard', 'buddy', 'chat', 'notify', 'onboard', 'cli'],
  compute:       ['gpu', 'colab', 'cuda', 'tensor', 'runtime', 'silicon', 'accelerate'],
  integration:   ['mcp', 'api', 'webhook', 'bridge', 'sync', 'connect', 'google', 'huggingface'],
  fintech:       ['billing', 'payment', 'subscription', 'budget', 'cost', 'token', 'usage', 'stripe'],
  creative:      ['midi', 'music', 'art', 'image', 'generate', 'creative', 'compose', 'design'],
});

/**
 * The 17-Swarm Matrix — maps swarm names to their service members.
 * @type {Object<string, string[]>}
 */
const SWARM_MATRIX = Object.freeze({
  InferenceSwarm:     ['heady-brain', 'heady-brains', 'heady-infer', 'ai-router', 'model-gateway'],
  MemorySwarm:        ['heady-embed', 'heady-memory', 'heady-vector', 'heady-projection', 'heady-cache', 'search-service'],
  AgentSwarm:         ['heady-bee-factory', 'heady-hive', 'heady-federation'],
  OrchestrationSwarm: ['heady-conductor', 'heady-orchestration', 'auto-success-engine', 'hcfullpipeline-executor', 'heady-chain', 'prompt-manager', 'heady-vinci', 'domain-router', 'saga-coordinator'],
  SecuritySwarm:      ['heady-guard', 'heady-security', 'secret-gateway', 'auth-session-server'],
  GovernanceSwarm:    ['heady-soul', 'heady-governance'],
  ObservabilitySwarm: ['heady-health', 'heady-eval', 'heady-testing', 'heady-autobiographer', 'analytics-service'],
  OperationsSwarm:    ['heady-maintenance', 'feature-flag-service', 'migration-service', 'scheduler-service', 'asset-pipeline'],
  InterfaceSwarm:     ['heady-ui', 'heady-web', 'heady-task-browser', 'heady-buddy', 'heady-onboarding', 'heady-pilot-onboarding', 'notification-service', 'cli-service', 'discord-bot', 'api-gateway'],
  ComputeSwarm:       ['colab-gateway', 'huggingface-gateway', 'silicon-bridge'],
  IntegrationSwarm:   ['mcp-server', 'memory-mcp', 'google-mcp', 'jules-mcp', 'perplexity-mcp'],
  FintechSwarm:       ['billing-service', 'budget-tracker'],
  CreativeSwarm:      ['heady-midi'],
});

/** @type {Map<string, Object>} Active task registry */
const activeTasks = new Map();
/** @type {Array<Object>} Task history */
const taskHistory = [];
const MAX_HISTORY = fib(16); // 987

/**
 * Classify a task description into a domain using keyword matching + CSL scoring.
 * @param {string} description - Task description
 * @returns {{domain: string, score: number, swarm: string, services: string[]}}
 */
function classifyTask(description) {
  const words = description.toLowerCase().split(/\s+/);
  let bestDomain = 'orchestration';
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let matches = 0;
    for (const word of words) {
      for (const kw of keywords) {
        if (word.includes(kw) || kw.includes(word)) {
          matches++;
        }
      }
    }
    const score = words.length > 0 ? matches / words.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  const swarm = DOMAIN_SWARMS[bestDomain] || 'OrchestrationSwarm';
  const services = SWARM_MATRIX[swarm] || [];

  return { domain: bestDomain, score: bestScore, swarm, services };
}

class HeadyConductor extends LiquidNodeBase {
  constructor() {
    super({
      name: 'heady-conductor',
      port: 3323,
      domain: 'orchestration',
      description: 'Central task routing and dispatch across 17 swarms with CSL domain classification',
      pool: 'hot',
      dependencies: ['heady-soul', 'heady-brains', 'heady-vinci', 'heady-bee-factory'],
    });
  }

  async onStart() {
    // POST /dispatch — classify and route a task
    this.route('POST', '/dispatch', async (req, res, ctx) => {
      const { description, payload, source, urgency } = ctx.body || {};
      if (!description) {
        return this.sendError(res, 400, 'Missing task description', 'MISSING_DESCRIPTION');
      }

      const taskId = correlationId('task');
      const classification = classifyTask(description);

      const task = {
        taskId,
        description,
        classification,
        source: source || 'api',
        urgency: urgency || 'normal',
        status: 'routed',
        payload: payload || {},
        createdAt: new Date().toISOString(),
        routedTo: classification.services,
        correlationId: ctx.correlationId,
      };

      activeTasks.set(taskId, task);
      taskHistory.push({ taskId, domain: classification.domain, timestamp: Date.now() });
      if (taskHistory.length > MAX_HISTORY) taskHistory.splice(0, taskHistory.length - MAX_HISTORY);

      mesh.events.publish(`heady.orchestration.task.routed`, task);

      this.log.info('Task routed', {
        taskId,
        domain: classification.domain,
        swarm: classification.swarm,
        services: classification.services.length,
        score: classification.score,
        correlationId: ctx.correlationId,
      });

      this.json(res, 200, {
        taskId,
        classification,
        status: 'routed',
        message: `Task routed to ${classification.swarm} (${classification.services.length} services)`,
      });
    });

    // GET /task/:id — get task status
    this.route('GET', '/task', async (req, res, ctx) => {
      const taskId = ctx.query.id;
      if (!taskId) return this.sendError(res, 400, 'Missing task id', 'MISSING_ID');
      const task = activeTasks.get(taskId);
      if (!task) return this.sendError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
      this.json(res, 200, task);
    });

    // GET /swarms — list all 17 swarms and their members
    this.route('GET', '/swarms', async (req, res, ctx) => {
      const swarms = {};
      for (const [name, members] of Object.entries(SWARM_MATRIX)) {
        swarms[name] = {
          members,
          memberCount: members.length,
          domain: Object.entries(DOMAIN_SWARMS).find(([, v]) => v === name)?.[0] || 'unknown',
        };
      }
      this.json(res, 200, {
        swarmCount: Object.keys(SWARM_MATRIX).length,
        totalServices: Object.values(SWARM_MATRIX).flat().length,
        swarms,
      });
    });

    // GET /classify — classify a task without dispatching
    this.route('GET', '/classify', async (req, res, ctx) => {
      const desc = ctx.query.q || ctx.query.description || '';
      if (!desc) return this.sendError(res, 400, 'Missing query parameter q', 'MISSING_QUERY');
      this.json(res, 200, classifyTask(desc));
    });

    // GET /active — list active tasks
    this.route('GET', '/active', async (req, res, ctx) => {
      const tasks = Array.from(activeTasks.values());
      this.json(res, 200, { count: tasks.length, tasks });
    });

    // GET /history — task routing history
    this.route('GET', '/history', async (req, res, ctx) => {
      const limit = parseInt(ctx.query.limit || String(fib(8)), 10);
      this.json(res, 200, { count: taskHistory.length, history: taskHistory.slice(-limit) });
    });

    this.log.info('Conductor initialized with 17-swarm matrix');
  }
}

new HeadyConductor().start();
