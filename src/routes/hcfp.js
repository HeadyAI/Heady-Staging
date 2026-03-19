/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
/**
 * Heady™ HCFP Routes — Real Pipeline + Auto-Success Engine
 * ═══════════════════════════════════════════════════════════
 *
 * Wired to core/pipeline/engine.js (PipelineEngine) and
 * core/scheduler/auto-success.js (AutoSuccessScheduler) via
 * the bootstrap module.
 *
 * Replaces the previous hardcoded stub routes.
 *
 * @module src/routes/hcfp
 */
const express = require('../core/heady-server');
const router = express.Router();

// ─── Bootstrap: Import Real Engines ──────────────────────────────────────────

const { engine, scheduler, conductor, HEADY_DOMAINS } = require('../bootstrap/hcfp-bootstrap');

// Track server-level boot time
const serverStartTime = Date.now();

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /health — Combined engine + scheduler health
 */
router.get('/health', (req, res) => {
  const engineHealth = engine.health();
  const schedulerHealth = scheduler.health();

  const successRate = engineHealth.totalRuns > 0
    ? engineHealth.totalCompleted / engineHealth.totalRuns
    : 1.0;

  res.json({
    status: 'ACTIVE',
    service: 'heady-hcfp',
    mode: 'full-auto',
    ors: parseFloat((successRate * 100).toFixed(1)),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    engine: {
      totalRuns: engineHealth.totalRuns,
      totalCompleted: engineHealth.totalCompleted,
      totalFailed: engineHealth.totalFailed,
      activeRuns: engineHealth.activeRuns,
      queuedRuns: engineHealth.queuedRuns,
      circuitBreakers: engineHealth.circuitBreakers,
    },
    scheduler: {
      running: schedulerHealth.running,
      cycleCount: schedulerHealth.cycleCount,
      tasks: schedulerHealth.tasks,
      totalExecutions: schedulerHealth.totalExecutions,
      successRate: schedulerHealth.totalExecutions > 0
        ? parseFloat((schedulerHealth.totalSuccesses / schedulerHealth.totalExecutions * 100).toFixed(1))
        : 100.0,
    },
    ts: new Date().toISOString(),
  });
});

/**
 * GET /status — Current pipeline state
 */
router.get('/status', (req, res) => {
  const engineHealth = engine.health();
  const schedulerHealth = scheduler.health();

  res.json({
    ok: true,
    service: 'heady-hcfp',
    mode: 'full-auto',
    ors: engineHealth.totalRuns > 0
      ? parseFloat((engineHealth.totalCompleted / engineHealth.totalRuns * 100).toFixed(1))
      : 100.0,
    pipeline: {
      activeRuns: engineHealth.activeRuns,
      queuedRuns: engineHealth.queuedRuns,
      totalRuns: engineHealth.totalRuns,
      totalCompleted: engineHealth.totalCompleted,
      totalFailed: engineHealth.totalFailed,
    },
    autoSuccess: {
      running: schedulerHealth.running,
      tasks: schedulerHealth.tasks,
      cycles: schedulerHealth.cycleCount,
    },
    policies: {
      zero_headysystems: 'enforced',
      production_domains_only: 'enforced',
      HeadyBattle_mode: 'enforced',
    },
    ts: new Date().toISOString(),
  });
});

/**
 * POST /status — Execute a quick status pipeline run
 */
router.post('/status', async (req, res) => {
  try {
    const result = await engine.execute(req.body || {}, { variant: 'FAST' });
    res.json({
      ok: true,
      service: 'heady-hcfp',
      action: 'status-run',
      run: {
        runId: result.runId,
        variant: result.variant,
        state: result.state,
        stages: result.stages,
        elapsed: result.elapsed,
      },
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      ts: new Date().toISOString(),
    });
  }
});

/**
 * GET /metrics — Real pipeline and scheduler metrics
 */
router.get('/metrics', (req, res) => {
  const engineHealth = engine.health();
  const schedulerHealth = scheduler.health();

  res.json({
    ok: true,
    service: 'heady-hcfp',
    action: 'metrics',
    metrics: {
      ors: engineHealth.totalRuns > 0
        ? parseFloat((engineHealth.totalCompleted / engineHealth.totalRuns * 100).toFixed(1))
        : 100.0,
      successRate: engineHealth.totalRuns > 0
        ? `${(engineHealth.totalCompleted / engineHealth.totalRuns * 100).toFixed(1)}%`
        : '100%',
      totalRuns: engineHealth.totalRuns,
      totalCompleted: engineHealth.totalCompleted,
      totalFailed: engineHealth.totalFailed,
      activeRuns: engineHealth.activeRuns,
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      mode: 'full-auto',
      scheduler: {
        running: schedulerHealth.running,
        cycles: schedulerHealth.cycleCount,
        tasksRegistered: schedulerHealth.tasks.total,
        tasksEnabled: schedulerHealth.tasks.enabled,
        totalExecutions: schedulerHealth.totalExecutions,
        totalSuccesses: schedulerHealth.totalSuccesses,
        totalFailures: schedulerHealth.totalFailures,
      },
    },
    ts: new Date().toISOString(),
  });
});

/**
 * GET /dashboard — Full system dashboard
 */
router.get('/dashboard', (req, res) => {
  const engineHealth = engine.health();
  const schedulerHealth = scheduler.health();
  const tasksByCategory = scheduler.getTasksByCategory();

  // Load optional YAML configs (backward compatible)
  const fs = require('fs');
  const path = require('path');
  const yaml = require('../core/heady-yaml');
  const configDir = path.join(__dirname, '..', '..', '.heady');
  const loadYaml = (name) => {
    try { return yaml.load(fs.readFileSync(path.join(configDir, name), 'utf8')); }
    catch { return null; }
  };

  const mcConfig = loadYaml('HeadySims-config.yaml');
  const battleConfig = loadYaml('HeadyBattle-rules.yaml');
  const arenaConfig = loadYaml('arena-mode.yaml');
  const branchConfig = loadYaml('branch-automation.yaml');

  res.json({
    ok: true,
    service: 'heady-hcfp-dashboard',
    dashboard: {
      system: {
        mode: 'full-auto',
        ors: engineHealth.totalRuns > 0
          ? parseFloat((engineHealth.totalCompleted / engineHealth.totalRuns * 100).toFixed(1))
          : 100.0,
        uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
      },
      pipeline: {
        totalRuns: engineHealth.totalRuns,
        totalCompleted: engineHealth.totalCompleted,
        totalFailed: engineHealth.totalFailed,
        activeRuns: engineHealth.activeRuns,
        queuedRuns: engineHealth.queuedRuns,
        circuitBreakers: engineHealth.circuitBreakers,
      },
      autoSuccess: {
        running: schedulerHealth.running,
        cycles: schedulerHealth.cycleCount,
        tasks: schedulerHealth.tasks,
        totalExecutions: schedulerHealth.totalExecutions,
        successRate: schedulerHealth.totalExecutions > 0
          ? parseFloat((schedulerHealth.totalSuccesses / schedulerHealth.totalExecutions * 100).toFixed(1))
          : 100.0,
        categories: Object.entries(tasksByCategory).reduce((acc, [cat, tasks]) => {
          acc[cat] = { taskCount: tasks.length, tasks: tasks.map(t => t.taskId) };
          return acc;
        }, {}),
      },
      headysims: {
        algorithm: mcConfig?.monte_carlo?.algorithm || 'ucb1',
        simulation_runs: mcConfig?.monte_carlo?.simulation_runs || 1000,
        strategies: mcConfig?.strategies || [],
        evaluation_metrics: mcConfig?.evaluation || {},
      },
      headybattle: {
        enabled: battleConfig?.HeadyBattle?.enabled || false,
        interrogation_depth: battleConfig?.HeadyBattle?.interrogation_depth || 3,
        question_categories: battleConfig?.questions ? Object.keys(battleConfig.questions) : [],
        validation: battleConfig?.validation || {},
      },
      arena: {
        enabled: arenaConfig?.arena?.enabled || false,
        environment: arenaConfig?.arena?.environment || 'staging',
        frequency: arenaConfig?.arena?.simulation_frequency || 'continuous',
        max_candidates: arenaConfig?.candidates?.max_candidates || 7,
        promotion_threshold: arenaConfig?.promotion?.threshold || 0.75,
      },
      branch_sync: {
        dev_to_staging: branchConfig?.sync?.dev_to_staging || false,
        staging_to_main: branchConfig?.sync?.staging_to_main || false,
        require_headysims: branchConfig?.rules?.require_HeadySims || false,
        require_headybattle: branchConfig?.rules?.require_HeadyBattle || false,
      },
      policies: {
        zero_headysystems: 'enforced',
        production_domains_only: 'enforced',
        HeadyBattle_mode: 'enforced',
      },
    },
    ts: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /pipeline/execute — Execute a pipeline run
 * Body: { task, code, context, variant?, complexity?, confidence? }
 */
router.post('/pipeline/execute', async (req, res) => {
  try {
    const { task, code, context, variant, complexity, confidence } = req.body || {};
    const input = { task, code, context };

    const result = await engine.execute(input, {
      variant: variant || undefined,
      complexity: complexity !== undefined ? parseFloat(complexity) : undefined,
      confidence: confidence !== undefined ? parseFloat(confidence) : undefined,
    });

    res.json({
      ok: true,
      run: {
        runId: result.runId,
        variant: result.variant,
        state: result.state,
        stages: result.stages,
        results: result.results,
        timeline: result.timeline,
        elapsed: result.elapsed,
      },
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      ts: new Date().toISOString(),
    });
  }
});

/**
 * GET /pipeline/run/:id — Get run status
 */
router.get('/pipeline/run/:id', (req, res) => {
  const status = engine.getRunStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ ok: false, error: 'Run not found' });
  }
  res.json({ ok: true, run: status, ts: new Date().toISOString() });
});

/**
 * POST /pipeline/cancel/:id — Cancel a running pipeline
 */
router.post('/pipeline/cancel/:id', (req, res) => {
  const cancelled = engine.cancel(req.params.id);
  res.json({ ok: cancelled, runId: req.params.id, ts: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SUCCESS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /auto-success/tasks — List all registered tasks by category
 */
router.get('/auto-success/tasks', (req, res) => {
  const byCategory = scheduler.getTasksByCategory();
  const health = scheduler.health();

  res.json({
    ok: true,
    service: 'heady-auto-success',
    health,
    categories: byCategory,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /auto-success/task/:id — Get specific task status
 */
router.get('/auto-success/task/:id', (req, res) => {
  const status = scheduler.getTaskStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ ok: false, error: 'Task not found' });
  }
  res.json({ ok: true, task: status, ts: new Date().toISOString() });
});

/**
 * POST /auto-success/start — Start the scheduler
 */
router.post('/auto-success/start', (req, res) => {
  scheduler.start();
  res.json({
    ok: true,
    message: 'Auto-Success Scheduler started',
    health: scheduler.health(),
    ts: new Date().toISOString(),
  });
});

/**
 * POST /auto-success/stop — Stop the scheduler
 */
router.post('/auto-success/stop', (req, res) => {
  scheduler.stop();
  res.json({
    ok: true,
    message: 'Auto-Success Scheduler stopped',
    health: scheduler.health(),
    ts: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWARM ROUTES (Preserved from original)
// ═══════════════════════════════════════════════════════════════════════════════

const HONEYCOMB_PATH = require('path').join(__dirname, '..', '..', 'heady-hive-sdk', 'lib', '..', '..', 'data', 'honeycomb.json');

router.get('/swarm/status', (req, res) => {
  try {
    const fs = require('fs');
    let honeycombData = [];
    try { honeycombData = JSON.parse(fs.readFileSync(HONEYCOMB_PATH, 'utf8')); } catch { }

    const { execSync } = require('child_process');
    let processInfo = {};
    try {
      const pm2Data = JSON.parse(execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8' }));
      const swarmProc = pm2Data.find(p => p.name === 'hcfp-auto-success');
      if (swarmProc) {
        processInfo = {
          status: swarmProc.pm2_env.status,
          restarts: swarmProc.pm2_env.restart_time,
          uptime: Date.now() - swarmProc.pm2_env.pm_uptime,
          memory: swarmProc.monit.memory,
          cpu: swarmProc.monit.cpu,
        };
      }
    } catch { }

    res.json({
      ok: true,
      swarm: 'HeadySwarm',
      process: processInfo,
      honeycomb: { total: honeycombData.length, recentCategories: honeycombData.slice(-10).map(h => h.category) },
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

router.get('/swarm/honeycomb', (req, res) => {
  try {
    const fs = require('fs');
    let data = [];
    try { data = JSON.parse(fs.readFileSync(HONEYCOMB_PATH, 'utf8')); } catch { }
    const limit = parseInt(req.query.limit) || 20;
    res.json({ ok: true, entries: data.slice(-limit), total: data.length });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

router.post('/swarm/nudge', (req, res) => {
  try {
    const fs = require('fs');
    const nudgePath = require('path').join(__dirname, '..', '..', 'data', 'swarm-nudges.json');
    const { name, prompt, category, priority } = req.body || {};
    if (!prompt) return res.status(400).json({ ok: false, error: 'prompt is required' });

    let nudges = [];
    try { nudges = JSON.parse(fs.readFileSync(nudgePath, 'utf8')); } catch { }
    nudges.push({ name, prompt, category, priority, ts: new Date().toISOString() });
    fs.writeFileSync(nudgePath, JSON.stringify(nudges, null, 2));
    res.json({ ok: true, message: 'Flower queued for next round', queueSize: nudges.length });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
