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
// ║  FILE: services/pipeline/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * Pipeline Microservice Router
 * Extracted from heady-manager.js
 * Handles pipeline execution, state management, and configuration serving
 */

const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../packages/structured-logger');

const log = createLogger('pipeline-service');

/**
 * Load YAML configuration files from configs directory
 * @param {string} filename - The YAML filename to load
 * @returns {Object|null} - Parsed YAML object or null if not found
 */
function loadYamlConfig(filename) {
  try {
    const filePath = path.join(__dirname, '../../configs', filename);
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    log.warn('YAML config not found', { filename, error: err.message });
    return null;
  }
}

// Dependencies injected at runtime
let _deps = {};

/**
 * Initialize the service with dependencies
 * @param {Object} deps - Dependencies object containing:
 *   - pipeline: HCFullPipeline instance
 *   - mcPlanScheduler: MC Plan Scheduler instance
 *   - continuousPipeline: Continuous Pipeline instance
 */
function init(deps) {
  _deps = deps;
  log.info('Pipeline service initialized', { deps: Object.keys(deps) });
}

// ─── Pipeline Configuration Endpoint ──────────────────────────────────────

/**
 * @swagger
 * /config:
 *   get:
 *     tags:
 *       - Pipeline
 *     summary: Get pipeline configuration
 *     responses:
 *       200:
 *         description: Pipeline configuration
 */
router.get('/config', (req, res) => {
  log.debug('GET /api/pipeline/config');
  try {
    const config = loadYamlConfig('hcfullpipeline.yaml') || loadYamlConfig('pipeline.yaml');
    if (!config) {
      return res.status(404).json({ ok: false, error: 'Pipeline config not found' });
    }
    res.json({ ok: true, config, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading pipeline config', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Pipeline Status Endpoint ─────────────────────────────────────────────

/**
 * @swagger
 * /status:
 *   get:
 *     tags:
 *       - Pipeline
 *     summary: Get current pipeline status and summary
 *     responses:
 *       200:
 *         description: Pipeline status and execution summary
 */
router.get('/status', (req, res) => {
  log.debug('GET /api/pipeline/status');
  try {
    const pipeline = _deps.pipeline;
    if (!pipeline) {
      return res.status(503).json({ ok: false, error: 'Pipeline not initialized' });
    }

    const summary = pipeline.getSummary ? pipeline.getSummary() : {
      state: 'uninitialized',
      activeStages: 0,
      completedStages: 0,
      failedStages: 0
    };

    res.json({
      ok: true,
      ...summary,
      sacred_geometry: 'FULLY_ACTIVATED',
      ts: new Date().toISOString()
    });
  } catch (err) {
    log.error('Error getting pipeline status', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Pipeline Run Endpoint ────────────────────────────────────────────────

/**
 * @swagger
 * /run:
 *   post:
 *     tags:
 *       - Pipeline
 *     summary: Execute pipeline run
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stages:
 *                 type: array
 *                 items:
 *                   type: string
 *               parallelMode:
 *                 type: boolean
 *               dryRun:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pipeline run started successfully
 */
router.post('/run', (req, res) => {
  log.debug('POST /api/pipeline/run', { body: req.body });
  try {
    const pipeline = _deps.pipeline;
    if (!pipeline) {
      return res.status(503).json({ ok: false, error: 'Pipeline not initialized' });
    }

    const { stages, parallelMode = false, dryRun = false } = req.body;
    const result = pipeline.run ? pipeline.run({
      stages,
      parallelMode,
      dryRun
    }) : {
      runId: `run-${Date.now()}`,
      status: 'started',
      metrics: {}
    };

    res.json({
      ok: true,
      runId: result.runId,
      status: result.status,
      metrics: result.metrics,
      ts: new Date().toISOString()
    });
  } catch (err) {
    log.error('Error running pipeline', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Pipeline State Endpoint ──────────────────────────────────────────────

/**
 * @swagger
 * /state:
 *   get:
 *     tags:
 *       - Pipeline
 *     summary: Get last pipeline execution state
 *     responses:
 *       200:
 *         description: Last pipeline execution state
 */
router.get('/state', (req, res) => {
  log.debug('GET /api/pipeline/state');
  try {
    const pipeline = _deps.pipeline;
    if (!pipeline) {
      return res.status(503).json({ ok: false, error: 'Pipeline not initialized' });
    }

    const state = pipeline.getState ? pipeline.getState() : null;
    if (!state) {
      return res.json({ ok: true, state: null, message: 'No run executed yet' });
    }

    res.json({
      ok: true,
      runId: state.runId,
      status: state.status,
      metrics: state.metrics,
      ts: new Date().toISOString()
    });
  } catch (err) {
    log.error('Error getting pipeline state', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Training Endpoint ────────────────────────────────────────────────────

/**
 * @swagger
 * /train:
 *   post:
 *     tags:
 *       - Pipeline
 *     summary: Start training job
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataset:
 *                 type: string
 *               epochs:
 *                 type: integer
 *               batchSize:
 *                 type: integer
 *               validateOnly:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Training job started
 *       503:
 *         description: Pipeline not available
 */
router.post('/train', (req, res) => {
  log.debug('POST /api/v1/train (routed to pipeline)', { body: req.body });
  try {
    const pipeline = _deps.pipeline;
    if (!pipeline) {
      return res.status(503).json({ ok: false, error: 'Pipeline service unavailable' });
    }

    const { dataset, epochs = 10, batchSize = 32, validateOnly = false } = req.body;

    if (!dataset) {
      return res.status(400).json({ ok: false, error: 'Dataset is required' });
    }

    const result = pipeline.train ? pipeline.train({
      dataset,
      epochs,
      batchSize,
      validateOnly
    }) : {
      jobId: `train-${Date.now()}`,
      status: 'started',
      progress: 0
    };

    res.json({
      ok: true,
      jobId: result.jobId,
      status: result.status,
      progress: result.progress || 0,
      ts: new Date().toISOString()
    });
  } catch (err) {
    log.error('Error starting training', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── IDE Specification Endpoint ───────────────────────────────────────────

/**
 * @swagger
 * /spec:
 *   get:
 *     tags:
 *       - IDE
 *     summary: Get IDE specification and schema
 *     responses:
 *       200:
 *         description: IDE specification
 */
router.get('/spec', (req, res) => {
  log.debug('GET /api/ide/spec');
  try {
    const ideConfig = loadYamlConfig('heady-ide.yaml') || loadYamlConfig('heady-auto-ide.yaml');
    if (!ideConfig) {
      return res.status(404).json({ ok: false, error: 'IDE spec not found' });
    }
    res.json({ ok: true, spec: ideConfig, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading IDE spec', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── IDE Agents Endpoint ──────────────────────────────────────────────────

/**
 * @swagger
 * /agents:
 *   get:
 *     tags:
 *       - IDE
 *     summary: Get available IDE agents
 *     responses:
 *       200:
 *         description: List of available agents
 */
router.get('/agents', (req, res) => {
  log.debug('GET /api/ide/agents');
  try {
    const agentsConfig = loadYamlConfig('service-catalog.yaml');
    const agents = agentsConfig?.agents || [];
    res.json({ ok: true, agents, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading IDE agents', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Playbook Configuration Endpoint ──────────────────────────────────────

/**
 * @swagger
 * /playbook:
 *   get:
 *     tags:
 *       - Configuration
 *     summary: Get playbook configuration
 *     responses:
 *       200:
 *         description: Playbook configuration
 */
router.get('/playbook', (req, res) => {
  log.debug('GET /api/playbook');
  try {
    const playbookConfig = loadYamlConfig('build-playbook.yaml');
    if (!playbookConfig) {
      return res.status(404).json({ ok: false, error: 'Playbook not found' });
    }
    res.json({ ok: true, playbook: playbookConfig, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading playbook', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Agentic Coding Configuration Endpoint ────────────────────────────────

/**
 * @swagger
 * /agentic:
 *   get:
 *     tags:
 *       - Configuration
 *     summary: Get agentic coding configuration
 *     responses:
 *       200:
 *         description: Agentic coding configuration
 */
router.get('/agentic', (req, res) => {
  log.debug('GET /api/agentic');
  try {
    const agenticConfig = loadYamlConfig('agentic-coding.yaml');
    if (!agenticConfig) {
      return res.status(404).json({ ok: false, error: 'Agentic config not found' });
    }
    res.json({ ok: true, agentic: agenticConfig, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading agentic config', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Activation Manifest Endpoint ────────────────────────────────────────

/**
 * @swagger
 * /activation:
 *   get:
 *     tags:
 *       - Configuration
 *     summary: Get activation manifest
 *     responses:
 *       200:
 *         description: Activation manifest configuration
 */
router.get('/activation', (req, res) => {
  log.debug('GET /api/activation');
  try {
    const activationConfig = loadYamlConfig('activation-manifest.yaml');
    if (!activationConfig) {
      return res.status(404).json({ ok: false, error: 'Activation manifest not found' });
    }
    res.json({ ok: true, activation: activationConfig, ts: new Date().toISOString() });
  } catch (err) {
    log.error('Error loading activation manifest', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check for pipeline service
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  const pipelineAvailable = _deps.pipeline ? true : false;
  res.json({
    ok: true,
    service: 'pipeline',
    status: pipelineAvailable ? 'healthy' : 'degraded',
    dependencies: {
      pipeline: pipelineAvailable,
      logger: true
    },
    ts: new Date().toISOString()
  });
});

module.exports = {
  router,
  init,
  loadYamlConfig
};
