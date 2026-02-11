/**
 * HCSysOrchestrator — Multi-Brain Router & Task Orchestrator
 * 
 * Routes tasks to the correct HeadyBrain based on workspace, domain,
 * and brain_profile_id. Coordinates across cloud layers, manages
 * Arena Mode for cross-brain comparisons, and feeds results into
 * HCFullPipeline for deterministic execution.
 * 
 * Inputs per request:
 *   - workspace_id
 *   - brain_profile_id (or inferred from domain/workspace)
 *   - cloud_layer (local/internal/production)
 *   - privacy_level, cost_sensitivity, task_type
 * 
 * @module HCSysOrchestrator
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class HCSysOrchestrator {
  constructor(configDir) {
    this.configDir = configDir || path.join(__dirname, '../../configs');
    this.brainProfiles = {};
    this.cloudLayers = {};
    this.productRepos = {};
    this.brainEndpoints = new Map();
    this.metrics = { requests: 0, errors: 0, latency: [] };
    this.loadConfigs();
  }

  loadConfigs() {
    try {
      const brainPath = path.join(this.configDir, 'brain-profiles.yaml');
      const layerPath = path.join(this.configDir, 'cloud-layers.yaml');
      const productPath = path.join(this.configDir, 'product-repos.yaml');

      if (fs.existsSync(brainPath)) {
        this.brainProfiles = yaml.load(fs.readFileSync(brainPath, 'utf8'));
      }
      if (fs.existsSync(layerPath)) {
        this.cloudLayers = yaml.load(fs.readFileSync(layerPath, 'utf8'));
      }
      if (fs.existsSync(productPath)) {
        this.productRepos = yaml.load(fs.readFileSync(productPath, 'utf8'));
      }

      this._buildBrainEndpointMap();
      console.log('[HCSysOrchestrator] Configs loaded successfully');
    } catch (err) {
      console.error('[HCSysOrchestrator] Config load error:', err.message);
    }
  }

  _buildBrainEndpointMap() {
    const layers = this.cloudLayers?.layers || {};
    for (const [layerId, layer] of Object.entries(layers)) {
      if (layer.services?.brain) {
        this.brainEndpoints.set(layerId, layer.services.brain);
      }
    }
  }

  /**
   * Resolve brain profile from request context.
   * Resolution order: explicit > workspace > domain > fallback
   */
  resolveBrainProfile(request) {
    const routing = this.brainProfiles?.routing || {};
    const profiles = this.brainProfiles?.profiles || {};

    // 1. Explicit brain_profile_id
    if (request.brain_profile_id && profiles[request.brain_profile_id]) {
      return profiles[request.brain_profile_id];
    }

    // 2. From domain
    if (request.domain && routing.domain_to_brain) {
      const brainId = routing.domain_to_brain[request.domain];
      if (brainId && profiles[brainId]) return profiles[brainId];
    }

    // 3. From workspace type
    if (request.workspace_type && routing.workspace_type_to_brain) {
      const brainId = routing.workspace_type_to_brain[request.workspace_type];
      if (brainId && profiles[brainId]) return profiles[brainId];
    }

    // 4. Fallback
    return profiles['production'] || Object.values(profiles)[0] || null;
  }

  /**
   * Resolve cloud layer from request context
   */
  resolveCloudLayer(request) {
    const layers = this.cloudLayers?.layers || {};
    if (request.cloud_layer && layers[request.cloud_layer]) {
      return layers[request.cloud_layer];
    }
    return layers['production'] || Object.values(layers)[0] || null;
  }

  /**
   * Select model based on brain profile, cloud layer, and task context
   */
  selectModel(brainProfile, cloudLayer, taskContext) {
    const matrix = this.cloudLayers?.model_routing?.matrix || [];
    const policy = brainProfile?.model_policy || {};

    for (const rule of matrix) {
      const when = rule.when || {};
      let match = true;

      if (when.layer && when.layer !== cloudLayer?.id) match = false;
      if (when.task_type && when.task_type !== taskContext?.task_type) match = false;
      if (when.privacy && when.privacy !== (taskContext?.privacy || policy?.privacy)) match = false;
      if (when.cost_sensitivity && when.cost_sensitivity !== policy?.cost_sensitivity) match = false;

      if (match) {
        const allowed = policy?.allowed || [];
        if (allowed.length === 0 || allowed.includes(rule.use)) {
          return { model: rule.use, fallback: rule.fallback };
        }
      }
    }

    // Default from brain policy
    const preference = policy?.preference || 'quality-first';
    const allowed = policy?.allowed || ['gpt-4o'];
    return { model: allowed[0], fallback: allowed[1] || null };
  }

  /**
   * Build a TaskDescriptor from incoming request
   */
  buildTaskDescriptor(request) {
    const brainProfile = this.resolveBrainProfile(request);
    const cloudLayer = this.resolveCloudLayer(request);

    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      workspace_id: request.workspace_id || 'default',
      brain_profile_id: brainProfile?.id || 'production',
      cloud_layer: cloudLayer?.id || 'production',
      task_type: request.task_type || 'GENERAL',
      privacy: request.privacy || brainProfile?.model_policy?.privacy || 'normal',
      cost_sensitivity: request.cost_sensitivity || brainProfile?.model_policy?.cost_sensitivity || 'medium',
      message: request.message || '',
      channel: request.channel || 'api',
      agents: brainProfile?.agents || [],
      model: this.selectModel(brainProfile, cloudLayer, request),
      rag_indices: brainProfile?.rag?.indices || [],
      brain_endpoint: this.brainEndpoints.get(cloudLayer?.id) || null
    };
  }

  /**
   * Route a task to the appropriate HeadyBrain
   */
  async routeTask(request) {
    const start = Date.now();
    this.metrics.requests++;

    try {
      const descriptor = this.buildTaskDescriptor(request);

      console.log(`[HCSysOrchestrator] Routing task ${descriptor.id}`);
      console.log(`  Brain: ${descriptor.brain_profile_id}`);
      console.log(`  Layer: ${descriptor.cloud_layer}`);
      console.log(`  Model: ${descriptor.model.model}`);
      console.log(`  Agents: ${descriptor.agents.map(a => a.role).join(', ')}`);

      // Call HeadyBrain for plan
      const plan = await this.callBrainPlan(descriptor);

      const latency = Date.now() - start;
      this.metrics.latency.push(latency);

      return {
        success: true,
        task_id: descriptor.id,
        brain_profile: descriptor.brain_profile_id,
        cloud_layer: descriptor.cloud_layer,
        model: descriptor.model.model,
        plan,
        latency_ms: latency
      };
    } catch (err) {
      this.metrics.errors++;
      const latency = Date.now() - start;
      this.metrics.latency.push(latency);

      console.error(`[HCSysOrchestrator] Route error:`, err.message);
      return {
        success: false,
        error: err.message,
        latency_ms: latency
      };
    }
  }

  /**
   * Call a HeadyBrain's plan endpoint
   */
  async callBrainPlan(descriptor) {
    const endpoint = descriptor.brain_endpoint;
    if (!endpoint) {
      return {
        strategy: 'direct',
        agents: descriptor.agents.map(a => a.role),
        model: descriptor.model.model,
        estimated_latency_ms: 2000
      };
    }

    try {
      const url = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
      const response = await fetch(`${url}/api/brain/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(descriptor),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Brain responded with ${response.status}`);
    } catch (err) {
      console.warn(`[HCSysOrchestrator] Brain unreachable, using local plan:`, err.message);
      return {
        strategy: 'local-fallback',
        agents: descriptor.agents.map(a => a.role),
        model: descriptor.model.model,
        estimated_latency_ms: 3000
      };
    }
  }

  /**
   * Arena Mode: fan same task to multiple brains, compare results
   */
  async arenaRoute(request, brainIds) {
    const arena = this.brainProfiles?.arena || {};
    if (!arena.enabled) {
      return this.routeTask(request);
    }

    const maxParallel = arena.max_parallel_brains || 3;
    const selectedBrains = brainIds.slice(0, maxParallel);

    console.log(`[HCSysOrchestrator] Arena Mode: ${selectedBrains.join(', ')}`);

    const results = await Promise.allSettled(
      selectedBrains.map(brainId =>
        this.routeTask({ ...request, brain_profile_id: brainId })
      )
    );

    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);

    if (successful.length === 0) {
      return { success: false, error: 'All arena brains failed' };
    }

    // Pick best by latency (simple heuristic; extend with quality scoring)
    successful.sort((a, b) => a.latency_ms - b.latency_ms);

    return {
      success: true,
      mode: 'arena',
      winner: successful[0],
      all_results: successful,
      attribution: successful.map(r => ({
        brain: r.brain_profile,
        latency: r.latency_ms,
        model: r.model
      }))
    };
  }

  /**
   * Get orchestrator health and metrics
   */
  getHealth() {
    const avgLatency = this.metrics.latency.length > 0
      ? Math.round(this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length)
      : 0;

    return {
      status: 'healthy',
      version: '1.0.0',
      metrics: {
        total_requests: this.metrics.requests,
        total_errors: this.metrics.errors,
        error_rate: this.metrics.requests > 0
          ? (this.metrics.errors / this.metrics.requests).toFixed(4)
          : '0.0000',
        avg_latency_ms: avgLatency
      },
      brains_loaded: Object.keys(this.brainProfiles?.profiles || {}).length,
      layers_loaded: Object.keys(this.cloudLayers?.layers || {}).length,
      brain_endpoints: Object.fromEntries(this.brainEndpoints)
    };
  }

  /**
   * Express router middleware
   */
  createRouter() {
    const express = require('express');
    const router = express.Router();

    router.get('/health', (req, res) => {
      res.json(this.getHealth());
    });

    router.post('/route', async (req, res) => {
      const result = await this.routeTask(req.body);
      res.json(result);
    });

    router.post('/arena', async (req, res) => {
      const { brainIds, ...request } = req.body;
      const result = await this.arenaRoute(request, brainIds || []);
      res.json(result);
    });

    router.post('/brain/plan', async (req, res) => {
      const descriptor = this.buildTaskDescriptor(req.body);
      res.json({
        strategy: 'direct',
        descriptor,
        agents: descriptor.agents,
        model: descriptor.model
      });
    });

    router.post('/brain/feedback', (req, res) => {
      const { task_id, outcome, latency_ms, quality_score } = req.body;
      console.log(`[HCSysOrchestrator] Feedback for ${task_id}: quality=${quality_score}, latency=${latency_ms}ms`);
      res.json({ received: true, task_id });
    });

    router.get('/configs/reload', (req, res) => {
      this.loadConfigs();
      res.json({ reloaded: true, health: this.getHealth() });
    });

    return router;
  }
}

module.exports = { HCSysOrchestrator };
