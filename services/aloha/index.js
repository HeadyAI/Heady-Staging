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
// ║  FILE: services/aloha/index.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const express = require('express');
const router = express.Router();
const { createLogger } = require('../../packages/structured-logger');
const log = createLogger('aloha-service');

/**
 * Aloha Protocol State
 * Manages the always-on protocol system for system stability and health
 */
let alohaState = {
  mode: 'aloha_first',
  activeSince: new Date().toISOString(),
  protocols: ['stability-first', 'de-optimization', 'web-baseline'],
  stabilityDiagnosticMode: false,
  crashReports: [],
  deOptChecks: 0,
};

let _deps = {};

/**
 * Initialize the Aloha service with dependencies
 * @param {Object} deps - Dependencies object
 * @param {Object} deps.alohaProtocol - Aloha protocol configuration
 * @param {Object} deps.deOptProtocol - De-optimization protocol configuration
 * @param {Object} deps.stabilityFirst - Stability-first protocol configuration
 * @param {Function} deps.loadYamlConfig - Function to load YAML config files
 */
function init(deps) {
  _deps = deps;
  if (_deps.alohaProtocol) {
    log.info('Aloha Protocol: LOADED');
  }
  if (_deps.deOptProtocol) {
    log.info('De-Optimization Protocol: LOADED (simplicity > speed)');
  }
  if (_deps.stabilityFirst) {
    log.info('Stability First: LOADED (the canoe must not sink)');
  }
}

/**
 * GET /status
 * Get Aloha protocol status
 */
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    mode: alohaState.mode,
    activeSince: alohaState.activeSince,
    protocols: alohaState.protocols,
    stabilityDiagnosticMode: alohaState.stabilityDiagnosticMode,
    crashReportsCount: alohaState.crashReports.length,
    deOptChecksCount: alohaState.deOptChecks,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /protocol
 * Get Aloha protocol configuration
 */
router.get('/protocol', (req, res) => {
  if (!_deps.alohaProtocol) {
    return res.status(404).json({ error: 'Aloha protocol not found' });
  }
  res.json({
    ok: true,
    ..._deps.alohaProtocol,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /de-optimization
 * Get de-optimization protocol configuration
 */
router.get('/de-optimization', (req, res) => {
  if (!_deps.deOptProtocol) {
    return res.status(404).json({ error: 'De-optimization protocol not found' });
  }
  res.json({
    ok: true,
    ..._deps.deOptProtocol,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /stability
 * Get stability-first protocol configuration
 */
router.get('/stability', (req, res) => {
  if (!_deps.stabilityFirst) {
    return res.status(404).json({ error: 'Stability first protocol not found' });
  }
  res.json({
    ok: true,
    ..._deps.stabilityFirst,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /priorities
 * Get Aloha protocol priorities and no-assist rules
 */
router.get('/priorities', (req, res) => {
  if (!_deps.alohaProtocol) {
    return res.status(404).json({ error: 'Aloha protocol not found' });
  }
  res.json({
    ok: true,
    priorities: _deps.alohaProtocol.priorities,
    no_assist: _deps.alohaProtocol.no_assist,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /checklist
 * Get de-optimization checklist and code generation rules
 */
router.get('/checklist', (req, res) => {
  if (!_deps.deOptProtocol) {
    return res.status(404).json({ error: 'De-optimization protocol not found' });
  }
  res.json({
    ok: true,
    checklist: _deps.deOptProtocol.checklist,
    code_rules: _deps.deOptProtocol.code_generation,
    ts: new Date().toISOString(),
  });
});

/**
 * POST /crash-report
 * Record a crash or system failure report
 * @body {string} description - Description of the crash
 * @body {string} context - Context where crash occurred
 * @body {string} severity - Severity level (critical, high, medium, low)
 */
router.post('/crash-report', (req, res) => {
  const { description, context, severity } = req.body;
  const report = {
    id: `crash-${Date.now()}`,
    description: description || 'IDE/system crash reported',
    context: context || 'unknown',
    severity: severity || 'high',
    timestamp: new Date().toISOString(),
  };

  alohaState.crashReports.push(report);
  log.warn(`Crash report recorded: ${report.id}`, { report });

  res.json({
    ok: true,
    reportId: report.id,
    message: 'Crash report received and logged',
  });
});

/**
 * POST /de-opt-check
 * Record a de-optimization check
 * @body {string} suggestion - De-optimization suggestion analyzed
 * @body {string} context - Context of the suggestion
 */
router.post('/de-opt-check', (req, res) => {
  const { suggestion, context } = req.body;
  alohaState.deOptChecks++;

  const result = {
    checkNumber: alohaState.deOptChecks,
    suggestion: suggestion || 'unknown',
    context: context || 'unknown',
    timestamp: new Date().toISOString(),
    approved: true,
  };

  log.info(`De-optimization check #${result.checkNumber}`, { result });

  res.json({
    ok: true,
    checkNumber: result.checkNumber,
    message: 'De-optimization check recorded',
  });
});

/**
 * GET /web-baseline
 * Get web baseline requirements (non-negotiable)
 */
router.get('/web-baseline', (req, res) => {
  if (!_deps.alohaProtocol) {
    return res.status(404).json({ error: 'Aloha protocol not found' });
  }
  res.json({
    ok: true,
    non_negotiable: true,
    requirements: _deps.alohaProtocol.web_baseline,
    ts: new Date().toISOString(),
  });
});

/**
 * GET /layer
 * Get current system layer information
 */
router.get('/layer', (req, res) => {
  res.json({
    ok: true,
    current: alohaState.mode,
    available: ['aloha_first', 'de_optimization_first', 'stability_first'],
    ts: new Date().toISOString(),
  });
});

/**
 * POST /layer/switch
 * Switch to a different system layer
 * @body {string} layer - Target layer name
 */
router.post('/layer/switch', (req, res) => {
  const { layer } = req.body;
  const validLayers = ['aloha_first', 'de_optimization_first', 'stability_first'];

  if (!layer || !validLayers.includes(layer)) {
    return res.status(400).json({
      error: `Invalid layer. Valid layers: ${validLayers.join(', ')}`,
    });
  }

  const previousLayer = alohaState.mode;
  alohaState.mode = layer;
  alohaState.activeSince = new Date().toISOString();

  log.info(`Layer switched from ${previousLayer} to ${layer}`);

  res.json({
    ok: true,
    previousLayer,
    currentLayer: layer,
    activeSince: alohaState.activeSince,
    message: `Successfully switched to ${layer}`,
  });
});

module.exports = {
  router,
  init,
  alohaState,
};
