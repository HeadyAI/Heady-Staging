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
// ║  FILE: services/orchestrator/brain_api.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyBrain API — Per-Layer Intelligence Service
 *
 * Each cloud layer (Sys, Me, Conn) runs a HeadyBrain that owns:
 *   - Monte Carlo plan selection (via hc_monte_carlo.js)
 *   - Pattern Engine (via hc_pattern_engine.js)
 *   - Self-Critique (via hc_self_critique.js)
 *
 * Endpoints:
 *   POST /api/brain/plan     — Given a TaskDescriptor, returns a PlanSpec
 *   POST /api/brain/feedback — Receives metrics and outcomes for learning
 *   GET  /api/brain/health   — Health check
 *   GET  /api/brain/status   — Current brain state and recent plans
 */

const express = require('express');
const router = express.Router();
const { getBrainConnector } = require('../../src/brain_connector');

// Initialize brain connector with failover
const brainConnector = getBrainConnector({
  poolSize: 3,
  healthCheckInterval: 15000 // 15 seconds for faster recovery
});

// In-memory state for this brain instance
const brainState = {
  plans_generated: 0,
  feedback_received: 0,
  last_plan_ts: null,
  last_feedback_ts: null,
  recent_plans: [],
  performance: {
    avg_plan_latency_ms: 0,
    success_rate: 1.0,
    total_tasks: 0,
  },
};

// Try to load MC scheduler and pattern engine from src/
let monteCarlo = null;
let patternEngine = null;
let selfCritique = null;

try {
  monteCarlo = require('../../src/hc_monte_carlo');
  console.log('  ∞ Brain: Monte Carlo scheduler loaded');
} catch (e) {
  console.warn(`  ⚠ Brain: MC scheduler not loaded: ${e.message}`);
}

try {
  patternEngine = require('../../src/hc_pattern_engine');
  console.log('  ∞ Brain: Pattern engine loaded');
} catch (e) {
  console.warn(`  ⚠ Brain: Pattern engine not loaded: ${e.message}`);
}

try {
  selfCritique = require('../../src/hc_self_critique');
  console.log('  ∞ Brain: Self-critique loaded');
} catch (e) {
  console.warn(`  ⚠ Brain: Self-critique not loaded: ${e.message}`);
}

/**
 * GET /api/brain/health
 */
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'HeadyBrain',
    version: '1.0.0',
    subsystems: {
      monte_carlo: !!monteCarlo,
      pattern_engine: !!patternEngine,
      self_critique: !!selfCritique,
    },
    performance: brainState.performance,
    ts: new Date().toISOString(),
  });
});

/**
 * POST /api/brain/plan
 *
 * Accepts a TaskDescriptor and returns a PlanSpec using MC plan selection.
 *
 * Body: { task_id, type, priority, channel, complexity, privacy,
 *         cost_sensitivity, brain_profile_id, cloud_layer, message, context }
 */
router.post('/plan', async (req, res) => {
  const startTime = Date.now();
  const task = req.body;

  if (!task || !task.type) {
    return res.status(400).json({ error: 'TaskDescriptor required with at least a type field' });
  }

  try {
    // Try distributed brain processing first
    let planSpec = null;
    let distributed = false;
    
    // Check if we should use distributed brain
    if (task.cloud_layer && task.cloud_layer !== 'local') {
      try {
        const distributedPlan = await brainConnector.request('/api/brain/distributed-plan', {
          method: 'POST',
          data: task
        });
        planSpec = distributedPlan.plan;
        distributed = true;
        console.log(`[BrainAPI] Used distributed brain for task ${task.type}`);
      } catch (err) {
        console.warn(`[BrainAPI] Distributed brain failed, using local: ${err.message}`);
      }
    }
    
    // Fallback to local processing
    if (!planSpec) {
      // Use Monte Carlo to select strategy if available
      let strategy = { id: 'balanced', cost: 1.5, latency: 0.6 };
      if (monteCarlo && typeof monteCarlo.selectStrategy === 'function') {
        strategy = monteCarlo.selectStrategy(task);
      }

      // Build PlanSpec
      planSpec = {
        plan_id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        task_id: task.id || task.task_id,
        strategy: strategy.id || strategy,
        estimated_latency_ms: strategy.latency ? strategy.latency * 1000 : 600,
        estimated_cost: strategy.cost || 1.5,
        agents: task.agents || [],
        model_provider: task.model?.provider || 'gpt-4o',
        pipeline_stages: ['ingest', 'plan', 'execute', 'recover', 'self-critique', 'optimize', 'finalize'],
        created_at: new Date().toISOString(),
        distributed: false
      };
    } else {
      planSpec.distributed = true;
    }

    // Record metrics
    const latency = Date.now() - startTime;
    brainState.plans_generated++;
    brainState.last_plan_ts = new Date().toISOString();
    brainState.recent_plans.push({ 
      plan_id: planSpec.plan_id, 
      task_type: task.type, 
      latency_ms: latency,
      distributed 
    });
    if (brainState.recent_plans.length > 50) brainState.recent_plans.shift();
    brainState.performance.total_tasks++;
    brainState.performance.avg_plan_latency_ms =
      (brainState.performance.avg_plan_latency_ms * (brainState.performance.total_tasks - 1) + latency)
      / brainState.performance.total_tasks;

    // Feed timing to pattern engine if available
    if (patternEngine && typeof patternEngine.observe === 'function') {
      patternEngine.observe('brain_plan', { 
        latency_ms: latency, 
        strategy: planSpec.strategy,
        distributed 
      });
    }

    // Send feedback to distributed brain if used
    if (distributed) {
      brainConnector.request('/api/brain/feedback', {
        method: 'POST',
        data: {
          plan_id: planSpec.plan_id,
          task_id: task.id,
          status: 'generated',
          latency_ms: latency,
          node: process.env.BRAIN_NODE_ID || 'local'
        }
      }).catch(() => {}); // Fire and forget
    }

    res.json({ 
      ok: true, 
      plan: planSpec, 
      latency_ms: latency,
      distributed,
      brain_node: distributed ? 'distributed' : 'local'
    });
  } catch (err) {
    // Even if everything fails, return a basic plan
    const fallbackPlan = {
      plan_id: `plan-fallback-${Date.now()}`,
      task_id: task.id || task.task_id,
      strategy: 'fallback',
      estimated_latency_ms: 1000,
      estimated_cost: 2.0,
      agents: ['fallback-agent'],
      model_provider: 'fallback',
      pipeline_stages: ['fallback'],
      created_at: new Date().toISOString(),
      distributed: false,
      fallback: true
    };
    
    console.error(`[BrainAPI] All brain processing failed, using fallback: ${err.message}`);
    res.json({ 
      ok: true, 
      plan: fallbackPlan, 
      latency_ms: Date.now() - startTime,
      distributed: false,
      brain_node: 'fallback',
      warning: 'All brain endpoints unavailable, using fallback plan'
    });
  }
});

/**
 * POST /api/brain/feedback
 *
 * Receives execution outcome so the brain can learn and improve.
 *
 * Body: { plan_id, task_id, status, quality, latency_ms, cost, error?, user_correction? }
 */
router.post('/feedback', (req, res) => {
  const feedback = req.body;

  if (!feedback || !feedback.plan_id) {
    return res.status(400).json({ error: 'Feedback requires plan_id' });
  }

  try {
    brainState.feedback_received++;
    brainState.last_feedback_ts = new Date().toISOString();

    // Update success rate
    if (feedback.status === 'success') {
      brainState.performance.success_rate =
        (brainState.performance.success_rate * (brainState.feedback_received - 1) + 1)
        / brainState.feedback_received;
    } else {
      brainState.performance.success_rate =
        (brainState.performance.success_rate * (brainState.feedback_received - 1))
        / brainState.feedback_received;
    }

    // Feed to MC scheduler for reward update
    if (monteCarlo && typeof monteCarlo.updateReward === 'function') {
      monteCarlo.updateReward(feedback.plan_id, {
        quality: feedback.quality || 0.5,
        latency: feedback.latency_ms || 0,
        cost: feedback.cost || 0,
      });
    }

    // Feed to self-critique if user correction
    if (selfCritique && feedback.user_correction && typeof selfCritique.recordCorrection === 'function') {
      selfCritique.recordCorrection(feedback);
    }

    res.json({ ok: true, message: 'Feedback recorded', ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Feedback processing failed', message: err.message });
  }
});

/**
 * POST /api/brain/distributed-plan
 * 
 * Handles distributed plan requests from other brain nodes
 */
router.post('/distributed-plan', async (req, res) => {
  const task = req.body;
  const nodeId = req.headers['x-brain-node-id'] || 'unknown';
  
  console.log(`[BrainAPI] Distributed plan request from ${nodeId} for task ${task.type}`);
  
  // Use local processing but mark as distributed
  try {
    let strategy = { id: 'balanced', cost: 1.5, latency: 0.6 };
    if (monteCarlo && typeof monteCarlo.selectStrategy === 'function') {
      strategy = monteCarlo.selectStrategy(task);
    }

    const planSpec = {
      plan_id: `plan-dist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      task_id: task.id || task.task_id,
      strategy: strategy.id || strategy,
      estimated_latency_ms: strategy.latency ? strategy.latency * 1000 : 600,
      estimated_cost: strategy.cost || 1.5,
      agents: task.agents || [],
      model_provider: task.model?.provider || 'gpt-4o',
      pipeline_stages: ['ingest', 'plan', 'execute', 'recover', 'self-critique', 'optimize', 'finalize'],
      created_at: new Date().toISOString(),
      distributed: true,
      source_node: process.env.BRAIN_NODE_ID || 'local',
      requestor_node: nodeId
    };

    res.json({ 
      ok: true, 
      plan: planSpec,
      node_id: process.env.BRAIN_NODE_ID || 'local'
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Distributed plan failed', message: err.message });
  }
});

/**
 * GET /api/brain/status
 */
router.get('/status', (req, res) => {
  const connectorStats = brainConnector.getStats();
  
  res.json({
    ok: true,
    state: brainState,
    connector: {
      uptime: connectorStats.uptime,
      total_requests: connectorStats.totalRequests,
      success_rate: connectorStats.totalRequests > 0 
        ? (connectorStats.successfulRequests / connectorStats.totalRequests * 100).toFixed(2) + '%'
        : '100%',
      queue_length: connectorStats.queueLength,
      endpoints: connectorStats.endpointStats,
      circuit_breakers: connectorStats.circuitBreakers
    },
    node_id: process.env.BRAIN_NODE_ID || 'local',
    ts: new Date().toISOString(),
  });
});

/**
 * GET /api/brain/connector-status
 * 
 * Detailed connector status for monitoring
 */
router.get('/connector-status', (req, res) => {
  const stats = brainConnector.getStats();
  
  res.json({
    ok: true,
    connector: stats,
    endpoints: brainConnector.endpoints.map(ep => ({
      id: ep.id,
      url: ep.url,
      circuit: stats.circuitBreakers.find(cb => cb.id === ep.id)
    })),
    ts: new Date().toISOString()
  });
});

/**
 * POST /api/brain/reset-circuits
 * 
 * Reset all circuit breakers (admin only)
 */
router.post('/reset-circuits', (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ ok: false, error: 'Admin token required' });
  }
  
  brainConnector.resetCircuitBreakers();
  console.log('[BrainAPI] Circuit breakers reset by admin');
  
  res.json({ 
    ok: true, 
    message: 'All circuit breakers reset',
    ts: new Date().toISOString()
  });
});

module.exports = router;
