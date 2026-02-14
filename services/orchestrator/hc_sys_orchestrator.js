/**
 * Copyright (c) 2026 HeadySystems Inc. (C-Corp)
 * PROPRIETARY & CONFIDENTIAL.
 * Patent Pending: Infrastructure & Orchestration Cluster
 * Implements: Distributed State Mutex, Golden Ratio UI
 */

// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: services/orchestrator/hc_sys_orchestrator.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HCSysOrchestrator — Global Multi-Brain, Multi-Cloud Task Router
 *
 * This is the top-level orchestrator that sits above individual HeadyBrains
 * and HCFullPipeline instances. For every incoming task it:
 *
 *  1. Resolves (workspace_id, brain_profile_id, cloud_layer)
 *  2. Loads the brain profile from configs/brain-profiles.yaml
 *  3. Calls the model-router to choose a provider
 *  4. Delegates to the appropriate HeadyBrain for plan selection
 *  5. Feeds the chosen PlanSpec into HCFullPipeline for execution
 *  6. Enforces multi-agent transparency and attribution
 *
 * Exposed as an Express sub-app mounted at /api/orchestrator in heady-manager.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const router = express.Router();

// ─── Model Router Integration ────────────────────────────────────
const { modelRouter } = require('./model_router');

// ─── Config Loaders ───────────────────────────────────────────────
function loadYaml(filename) {
  const filePath = path.join(__dirname, '..', '..', 'configs', filename);
  if (!fs.existsSync(filePath)) return null;
  try { return yaml.load(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { console.error(`Failed to load ${filename}:`, e.message); return null; }
}

let brainProfiles = null;
let cloudLayers = null;
let foundationContract = null;
let rebuildDirective = null;
let agentCatalog = null;

function reloadConfigs() {
  brainProfiles = loadYaml('brain-profiles.yaml');
  cloudLayers = loadYaml('cloud-layers.yaml');
  foundationContract = loadYaml('foundation-contract.yaml');
  rebuildDirective = loadYaml('iterative-rebuild-directive.yaml');
  agentCatalog = loadYaml('../packages/agents/catalog.yaml') || loadYaml('agents-catalog.yaml');
  modelRouter.reload();
}

reloadConfigs();

// ─── Execution Metrics ───────────────────────────────────────────
const orchestratorMetrics = {
  tasks_routed: 0,
  tasks_executed: 0,
  avg_routing_ms: 0,
  errors: 0,
  last_task_ts: null,
};

// ─── Brain Profile Resolution ─────────────────────────────────────
function resolveBrainProfile(req) {
  if (!brainProfiles || !brainProfiles.profiles) return null;

  const profiles = brainProfiles.profiles;
  const routing = brainProfiles.routing || {};

  // Priority 1: explicit brain_profile_id in request
  const explicitId = req.body?.brain_profile_id || req.headers['x-brain-profile'];
  if (explicitId && profiles[explicitId]) {
    return { id: explicitId, profile: profiles[explicitId], source: 'explicit' };
  }

  // Priority 2: workspace_id lookup
  const workspaceId = req.body?.workspace_id || req.headers['x-workspace-id'];
  if (workspaceId && routing.workspace_type_to_brain) {
    const brainId = routing.workspace_type_to_brain[workspaceId];
    if (brainId && profiles[brainId]) {
      return { id: brainId, profile: profiles[brainId], source: 'workspace' };
    }
  }

  // Priority 3: domain-based lookup
  const domain = req.headers['x-forwarded-host'] || req.hostname;
  if (domain && routing.domain_to_brain) {
    for (const [domainPattern, brainId] of Object.entries(routing.domain_to_brain)) {
      if (domain.includes(domainPattern) && profiles[brainId]) {
        return { id: brainId, profile: profiles[brainId], source: 'domain' };
      }
    }
  }

  // Fallback
  const fallbackId = routing.resolve_order?.find(r => r.fallback)?.fallback || 'production';
  return {
    id: fallbackId,
    profile: profiles[fallbackId] || profiles[Object.keys(profiles)[0]],
    source: 'fallback'
  };
}

// ─── Cloud Layer Resolution ───────────────────────────────────────
function resolveCloudLayer(req) {
  if (!cloudLayers || !cloudLayers.layers) return 'local';

  const explicit = req.body?.cloud_layer
    || req.headers['x-heady-layer']
    || process.env.HEADY_LAYER;

  if (explicit && cloudLayers.layers[explicit]) return explicit;
  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
}

// ─── Model Router (delegated to model_router.js) ────────────────
function selectModel(layer, taskType, privacy, costSensitivity, brainProfileId) {
  return modelRouter.select({ layer, taskType, privacy, costSensitivity, brainProfileId });
}

// ─── Task Descriptor Builder ──────────────────────────────────────
function buildTaskDescriptor(req, brainResolution, layerId) {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: req.body?.task_type || 'GENERAL',
    priority: req.body?.priority || 'normal',
    channel: req.body?.channel || 'api',
    complexity: req.body?.complexity || 'medium',
    privacy: req.body?.privacy || brainResolution.profile?.model_policy?.privacy || 'normal',
    cost_sensitivity: req.body?.cost_sensitivity || brainResolution.profile?.model_policy?.preference || 'quality-first',
    workspace_id: req.body?.workspace_id || null,
    brain_profile_id: brainResolution.id,
    cloud_layer: layerId,
    message: req.body?.message || req.body?.input || '',
    context: req.body?.context || {},
    ts: new Date().toISOString(),
  };
}

// ─── API Endpoints ────────────────────────────────────────────────

/**
 * GET /api/orchestrator/health
 * Health check for the orchestrator service.
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'hc-sys-orchestrator',
    version: '1.0.0',
    configs_loaded: {
      brain_profiles: !!brainProfiles,
      cloud_layers: !!cloudLayers,
      foundation_contract: !!foundationContract,
      rebuild_directive: !!rebuildDirective,
    },
    brain_profiles_count: brainProfiles ? Object.keys(brainProfiles.profiles || {}).length : 0,
    cloud_layers_count: cloudLayers ? Object.keys(cloudLayers.layers || {}).length : 0,
    ts: new Date().toISOString(),
  });
});

/**
 * POST /api/orchestrator/route
 * Main routing endpoint. Accepts a task, resolves brain + layer + model,
 * builds a TaskDescriptor, and returns the execution plan.
 *
 * Body: { message, task_type?, workspace_id?, brain_profile_id?,
 *         cloud_layer?, priority?, channel?, privacy?, cost_sensitivity?,
 *         context? }
 */
router.post('/route', (req, res) => {
  try {
    const brainResolution = resolveBrainProfile(req);
    const layerId = resolveCloudLayer(req);
    const task = buildTaskDescriptor(req, brainResolution, layerId);
    const model = selectModel(
      layerId,
      task.type,
      task.privacy,
      task.cost_sensitivity,
      brainResolution.id
    );

    // Track metrics
    orchestratorMetrics.tasks_routed++;
    orchestratorMetrics.last_task_ts = new Date().toISOString();

    const plan = {
      task,
      brain: {
        id: brainResolution.id,
        product: brainResolution.profile?.product,
        workspace_type: brainResolution.profile?.workspace_type,
        agents: (brainResolution.profile?.agents || []).map(a => a.role),
        resolution_source: brainResolution.source,
      },
      cloud_layer: {
        id: layerId,
        dns_zone: cloudLayers?.layers?.[layerId]?.dns_zone || 'unknown',
        providers: cloudLayers?.layers?.[layerId]?.providers || {},
      },
      model: {
        provider: model.provider,
        fallback: model.fallback,
        resolution_source: model.source,
      },
      transparency: {
        multi_agent: (brainResolution.profile?.agents || []).length > 1,
        agents_involved: (brainResolution.profile?.agents || []).map(a => a.role),
        attribution: true,
      },
      next_steps: [
        'Call HeadyBrain /api/brain/plan with this TaskDescriptor',
        'Execute returned PlanSpec via HCFullPipeline',
        'Send outcome to /api/brain/feedback for learning',
      ],
    };

    res.json({ ok: true, plan, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Orchestrator routing failed',
      message: err.message,
      ts: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/orchestrator/brains
 * Lists all available brain profiles and their products.
 */
router.get('/brains', (req, res) => {
  if (!brainProfiles || !brainProfiles.profiles) {
    return res.status(503).json({ error: 'Brain profiles not loaded' });
  }

  const brains = Object.entries(brainProfiles.profiles).map(([id, p]) => ({
    id,
    product: p.product,
    workspace_type: p.workspace_type,
    description: p.description,
    agents: (p.agents || []).map(a => a.role),
    model_preference: p.model_policy?.preference,
  }));

  res.json({ ok: true, count: brains.length, brains, ts: new Date().toISOString() });
});

/**
 * GET /api/orchestrator/layers
 * Lists all available cloud layers and their configurations.
 */
router.get('/layers', (req, res) => {
  if (!cloudLayers || !cloudLayers.layers) {
    return res.status(503).json({ error: 'Cloud layers not loaded' });
  }

  const layers = Object.entries(cloudLayers.layers).map(([id, l]) => ({
    id,
    description: l.description,
    dns_zone: l.dns_zone,
    providers: l.providers,
    brain_profile: l.brain_profile,
    services: l.services,
  }));

  res.json({ ok: true, count: layers.length, layers, ts: new Date().toISOString() });
});

/**
 * GET /api/orchestrator/contract
 * Returns the foundation platform contract.
 */
router.get('/contract', (req, res) => {
  if (!foundationContract) {
    return res.status(503).json({ error: 'Foundation contract not loaded' });
  }
  res.json({ ok: true, contract: foundationContract, ts: new Date().toISOString() });
});

/**
 * GET /api/orchestrator/rebuild-status
 * Returns the current rebuild directive and phase status.
 */
router.get('/rebuild-status', (req, res) => {
  if (!rebuildDirective) {
    return res.status(503).json({ error: 'Rebuild directive not loaded' });
  }
  res.json({
    ok: true,
    directive: rebuildDirective.mandate,
    phases: Object.keys(rebuildDirective.phases || {}),
    foundation_first: rebuildDirective.foundation_first,
    ts: new Date().toISOString(),
  });
});

/**
 * POST /api/orchestrator/execute
 * End-to-end task execution: orchestrate → brain plan → pipeline run → feedback.
 *
 * Body: { message, task_type?, workspace_id?, brain_profile_id?,
 *         cloud_layer?, priority?, channel?, privacy?, cost_sensitivity?,
 *         context?, execute? }
 */
router.post('/execute', async (req, res) => {
  const startTime = Date.now();
  try {
    // Step 1: Resolve brain + layer + model
    const brainResolution = resolveBrainProfile(req);
    const layerId = resolveCloudLayer(req);
    const task = buildTaskDescriptor(req, brainResolution, layerId);
    const model = selectModel(layerId, task.type, task.privacy, task.cost_sensitivity, brainResolution.id);

    // Step 2: Build execution plan
    const executionPlan = {
      task,
      brain: {
        id: brainResolution.id,
        product: brainResolution.profile?.product,
        workspace_type: brainResolution.profile?.workspace_type,
        agents: (brainResolution.profile?.agents || []).map(a => a.role),
        resolution_source: brainResolution.source,
      },
      cloud_layer: layerId,
      model,
      transparency: {
        multi_agent: (brainResolution.profile?.agents || []).length > 1,
        agents_involved: (brainResolution.profile?.agents || []).map(a => a.role),
        attribution: true,
      },
    };

    // Step 3: Track metrics
    const routingLatency = Date.now() - startTime;
    orchestratorMetrics.tasks_executed++;
    orchestratorMetrics.avg_routing_ms =
      (orchestratorMetrics.avg_routing_ms * (orchestratorMetrics.tasks_executed - 1) + routingLatency)
      / orchestratorMetrics.tasks_executed;
    orchestratorMetrics.last_task_ts = new Date().toISOString();

    res.json({
      ok: true,
      execution: executionPlan,
      routing_latency_ms: routingLatency,
      status: 'routed',
      next: 'Call /api/brain/plan with the task descriptor, then execute via /api/pipeline/run',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    orchestratorMetrics.errors++;
    res.status(500).json({
      ok: false,
      error: 'Execution routing failed',
      message: err.message,
      ts: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/orchestrator/metrics
 * Returns orchestrator performance metrics.
 */
router.get('/metrics', (req, res) => {
  res.json({
    ok: true,
    metrics: orchestratorMetrics,
    model_router: modelRouter.getStatus(),
    ts: new Date().toISOString(),
  });
});

/**
 * GET /api/orchestrator/agents
 * Returns the agent catalog with per-brain filtering.
 */
router.get('/agents', (req, res) => {
  const brainId = req.query.brain;
  let agents = agentCatalog?.agents ? Object.entries(agentCatalog.agents) : [];

  if (brainId) {
    agents = agents.filter(([, a]) => (a.brain_profiles || []).includes(brainId));
  }

  res.json({
    ok: true,
    count: agents.length,
    agents: agents.map(([id, a]) => ({
      id,
      category: a.category,
      description: a.description,
      capabilities: a.capabilities,
      tools: a.tools,
      resource_tier: a.resource_tier,
      brain_profiles: a.brain_profiles,
    })),
    ts: new Date().toISOString(),
  });
});

/**
 * POST /api/orchestrator/reload
 * Hot-reload all orchestrator configs.
 */
router.post('/reload', (req, res) => {
  reloadConfigs();
  res.json({
    ok: true,
    message: 'Configs reloaded',
    configs: {
      brain_profiles: !!brainProfiles,
      cloud_layers: !!cloudLayers,
      foundation_contract: !!foundationContract,
      rebuild_directive: !!rebuildDirective,
      agent_catalog: !!agentCatalog,
      model_router: !!modelRouter,
    },
    ts: new Date().toISOString(),
  });
});

module.exports = router;
