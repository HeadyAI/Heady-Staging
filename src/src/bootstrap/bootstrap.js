/**
 * Heady™ Latent OS — Bootstrap
 * 10-phase boot sequence with phi-backoff retry and LIFO graceful shutdown.
 *
 * Phases:
 *   1. Config          — load and validate system configuration
 *   2. Logger          — initialise HeadyLogger factory
 *   3. EventBus        — start spatial event bus
 *   4. VectorMemory    — initialise vector memory store
 *   5. CSLEngine       — start Coherence-Scoring Layer engine
 *   6. Conductor       — start Heady™ Conductor (orchestration)
 *   7. Pipeline        — initialise processing pipeline
 *   8. AutoSuccess     — start Auto-Success Engine cycle loop
 *   9. HealthProbes    — register dependencies, mark startup complete
 *  10. Ready           — emit system-ready event
 *
 * Boot contract:
 *   - Each phase must return a teardown function (or null)
 *   - Teardowns are stored in LIFO order and called on SIGTERM/SIGINT
 *   - Phase failures trigger phi-backoff retry (max fib(4)=3 attempts)
 *   - Phase timing logged at DEBUG + INFO levels
 *
 * © 2026-2026 HeadySystems Inc. All Rights Reserved. 60+ Provisional Patents.
 */

'use strict';

const path = require('path');
const {
  fib, PHI, PSI,
  phiBackoff,
  PHI_TIMING,
  AUTO_SUCCESS,
  CSL_THRESHOLDS,
} = require('../../shared/phi-math');

const { createLogger }          = require('../core/heady-logger');
const { bus }                   = require('../core/event-bus');
const { markStartupComplete, registerService } = require('../core/health-probes');

const log = createLogger('bootstrap');

// ─── Phase Constants ──────────────────────────────────────────────────────────

/** Maximum boot attempts per phase: fib(4) = 3 */
const MAX_PHASE_RETRIES = fib(4); // 3

/** Phase names (ordered) */
const PHASE_NAMES = Object.freeze([
  'Config',
  'Logger',
  'EventBus',
  'VectorMemory',
  'CSLEngine',
  'Conductor',
  'Pipeline',
  'AutoSuccess',
  'HealthProbes',
  'Ready',
]);

// Total phases must match fib(5)=5 doubled = 10 (not a fib, but fib(7)-3 = 10)
// Documented as "10-phase boot sequence" in spec.

// ─── Boot State ───────────────────────────────────────────────────────────────

/** LIFO teardown stack: push on phase-up, pop on shutdown */
const _teardownStack = [];

/** Map of phase name → { ok, durationMs, startedAt } */
const _phaseResults = {};

/** System is fully booted */
let _booted = false;

// ─── Phase Implementations ────────────────────────────────────────────────────

/**
 * @typedef {Object} PhaseResult
 * @property {boolean}         ok
 * @property {number}          durationMs
 * @property {Function|null}   teardown
 * @property {string}          [error]
 */

// Phase 1 — Config
async function phaseConfig() {
  const yaml = require('js-yaml');   // eslint-disable-line global-require
  const fs   = require('fs');        // eslint-disable-line global-require

  const cfgPath = path.resolve(__dirname, '../../configs/system.yaml');
  let cfg;

  if (fs.existsSync(cfgPath)) {
    cfg = yaml.load(fs.readFileSync(cfgPath, 'utf8'));
  } else {
    log.warn('system.yaml not found — using default config', { cfgPath });
    cfg = {
      system:  { name: 'heady-latent-os', version: '1.0.0', env: process.env.NODE_ENV || 'development' },
      budgets: { daily: 50.00, per_request: 0.001 },
    };
  }

  // Attach to process for global access
  process.env.HEADY_ENV      = process.env.HEADY_ENV      || cfg.system.env     || 'development';
  process.env.HEADY_VERSION  = process.env.HEADY_VERSION  || cfg.system.version || '1.0.0';

  // Store config on global for other modules (avoid circular deps)
  global.__headyConfig = cfg;

  log.debug('Config loaded', { env: process.env.HEADY_ENV, version: process.env.HEADY_VERSION });
  return () => { delete global.__headyConfig; };
}

// Phase 2 — Logger
async function phaseLogger() {
  // createLogger is already initialised (module-level singleton);
  // here we configure env-based log level
  const { HeadyLogger } = require('../core/heady-logger'); // eslint-disable-line global-require
  const level = process.env.LOG_LEVEL || 'INFO';

  // Re-apply level to all existing loggers
  // (factory is already bootstrapped; this adjusts runtime level)
  log.setLevel(level);
  log.info('Logger phase complete', { level });

  return null; // logger has no teardown
}

// Phase 3 — EventBus
async function phaseEventBus() {
  // bus is module-level singleton — already created on require
  bus.emit('lifecycle', {
    type:     'bus_ready',
    data:     { channels: require('../core/event-bus').CHANNELS },
    temporal: PSI,
    semantic: CSL_THRESHOLDS.HIGH,
    spatial:  PSI,
  });

  log.debug('EventBus ready', { channels: require('../core/event-bus').CHANNELS.length });

  return () => {
    bus.removeAllListeners();
    log.info('EventBus listeners cleared');
  };
}

// Phase 4 — VectorMemory
async function phaseVectorMemory() {
  const { VectorMemory } = require('../memory/vector-memory'); // eslint-disable-line global-require
  const vm = new VectorMemory();

  if (typeof vm.init === 'function') await vm.init();
  global.__headyVectorMemory = vm;

  log.debug('VectorMemory initialised');

  registerService({
    name:        'vector-memory',
    criticality: 'required',
    check:       async () => ({
      ok:    Boolean(global.__headyVectorMemory),
      score: global.__headyVectorMemory ? CSL_THRESHOLDS.HIGH : 0,
    }),
  });

  return async () => {
    if (global.__headyVectorMemory && typeof global.__headyVectorMemory.shutdown === 'function') {
      await global.__headyVectorMemory.shutdown();
    }
    delete global.__headyVectorMemory;
    log.info('VectorMemory shut down');
  };
}

// Phase 5 — CSLEngine
async function phaseCSLEngine() {
  const { CSLEngine } = require('../../shared/csl-engine'); // eslint-disable-line global-require
  const csl = new CSLEngine();

  if (typeof csl.init === 'function') await csl.init();
  global.__headyCSL = csl;

  log.debug('CSLEngine initialised');

  registerService({
    name:        'csl-engine',
    criticality: 'required',
    check:       async () => ({
      ok:    Boolean(global.__headyCSL),
      score: CSL_THRESHOLDS.HIGH,
    }),
  });

  return async () => {
    if (global.__headyCSL && typeof global.__headyCSL.shutdown === 'function') {
      await global.__headyCSL.shutdown();
    }
    delete global.__headyCSL;
    log.info('CSLEngine shut down');
  };
}

// Phase 6 — Conductor
async function phaseConductor() {
  const { HeadyConductor } = require('../orchestration/heady-conductor'); // eslint-disable-line global-require
  const conductor = new HeadyConductor({
    vectorMemory: global.__headyVectorMemory,
    csl:          global.__headyCSL,
    bus,
  });

  if (typeof conductor.start === 'function') await conductor.start();
  global.__headyConductor = conductor;

  log.debug('Conductor started');

  registerService({
    name:        'conductor',
    criticality: 'required',
    check:       async () => ({
      ok:    Boolean(global.__headyConductor),
      score: CSL_THRESHOLDS.HIGH,
    }),
  });

  return async () => {
    if (global.__headyConductor && typeof global.__headyConductor.shutdown === 'function') {
      await global.__headyConductor.shutdown();
    }
    delete global.__headyConductor;
    log.info('Conductor shut down');
  };
}

// Phase 7 — Pipeline
async function phasePipeline() {
  const { PipelineCore } = require('../../pipeline/pipeline-core'); // eslint-disable-line global-require
  const pipeline = new PipelineCore({
    conductor: global.__headyConductor,
    bus,
  });

  if (typeof pipeline.start === 'function') await pipeline.start();
  global.__headyPipeline = pipeline;

  log.debug('Pipeline initialised');

  registerService({
    name:        'pipeline',
    criticality: 'required',
    check:       async () => ({
      ok:    Boolean(global.__headyPipeline),
      score: CSL_THRESHOLDS.HIGH,
    }),
  });

  return async () => {
    if (global.__headyPipeline && typeof global.__headyPipeline.shutdown === 'function') {
      await global.__headyPipeline.shutdown();
    }
    delete global.__headyPipeline;
    log.info('Pipeline shut down');
  };
}

// Phase 8 — AutoSuccess
async function phaseAutoSuccess() {
  const { engine } = require('../../orchestration/auto-success-engine'); // eslint-disable-line global-require
  engine.start();
  global.__headyAutoSuccess = engine;

  log.debug('AutoSuccess Engine started', {
    cycleMs:    AUTO_SUCCESS.CYCLE_MS,
    categories: AUTO_SUCCESS.CATEGORIES,
    tasks:      AUTO_SUCCESS.TASKS_TOTAL,
  });

  registerService({
    name:        'auto-success',
    criticality: 'optional',
    check:       async () => {
      const s = engine.stats();
      return { ok: s.running, score: s.running ? CSL_THRESHOLDS.HIGH : PSI };
    },
  });

  return async () => {
    await engine.shutdown();
    delete global.__headyAutoSuccess;
    log.info('AutoSuccess Engine shut down');
  };
}

// Phase 9 — HealthProbes
async function phaseHealthProbes() {
  // All services registered in previous phases — mark startup complete
  markStartupComplete(_phaseResults);
  log.debug('HealthProbes activated', { phases: Object.keys(_phaseResults).length });

  return null; // probes are stateless routes, no teardown needed
}

// Phase 10 — Ready
async function phaseReady() {
  _booted = true;

  bus.emit('lifecycle', {
    type:     'system_ready',
    data:     {
      phases:    PHASE_NAMES.length,
      env:       process.env.HEADY_ENV,
      version:   process.env.HEADY_VERSION,
      uptimeMs:  process.uptime() * 1000,
    },
    temporal: 1.0,
    semantic: CSL_THRESHOLDS.CRITICAL,
    spatial:  1.0,
  });

  log.info('System READY', {
    env:     process.env.HEADY_ENV,
    version: process.env.HEADY_VERSION,
    phases:  PHASE_NAMES.length,
  });

  return null;
}

// ─── Phase Table ─────────────────────────────────────────────────────────────

const PHASES = [
  { name: 'Config',       fn: phaseConfig },
  { name: 'Logger',       fn: phaseLogger },
  { name: 'EventBus',     fn: phaseEventBus },
  { name: 'VectorMemory', fn: phaseVectorMemory },
  { name: 'CSLEngine',    fn: phaseCSLEngine },
  { name: 'Conductor',    fn: phaseConductor },
  { name: 'Pipeline',     fn: phasePipeline },
  { name: 'AutoSuccess',  fn: phaseAutoSuccess },
  { name: 'HealthProbes', fn: phaseHealthProbes },
  { name: 'Ready',        fn: phaseReady },
];

// ─── Phase Runner ─────────────────────────────────────────────────────────────

/**
 * Run a single phase with phi-backoff retry.
 * @param {{ name: string, fn: Function }} phase
 * @returns {Promise<PhaseResult>}
 */
async function runPhase(phase) {
  let attempt  = 0;
  const maxTries = MAX_PHASE_RETRIES; // fib(4) = 3

  while (attempt < maxTries) {
    const startMs = Date.now();
    log.info(`Phase [${phase.name}] starting`, { attempt });

    bus.emit('lifecycle', {
      type:     'phase_start',
      data:     { phase: phase.name, attempt },
      temporal: PSI,
      semantic: PSI,
      spatial:  PSI,
    });

    try {
      const teardown   = await phase.fn();
      const durationMs = Date.now() - startMs;

      if (typeof teardown === 'function') {
        _teardownStack.push({ name: phase.name, fn: teardown });
      }

      _phaseResults[phase.name] = { ok: true, durationMs, attempt };

      log.info(`Phase [${phase.name}] complete`, { durationMs, attempt });
      bus.emit('lifecycle', {
        type:     'phase_complete',
        data:     { phase: phase.name, durationMs, attempt },
        temporal: PSI,
        semantic: CSL_THRESHOLDS.HIGH,
        spatial:  PSI,
      });

      return { ok: true, durationMs, teardown };

    } catch (err) {
      const durationMs = Date.now() - startMs;
      attempt++;

      log.error(`Phase [${phase.name}] failed`, {
        attempt,
        durationMs,
        error: err.message,
        stack: err.stack,
      });

      _phaseResults[phase.name] = { ok: false, durationMs, attempt, error: err.message };

      if (attempt < maxTries) {
        const backoffMs = phiBackoff(attempt); // φ^attempt × 1000ms
        log.warn(`Phase [${phase.name}] retry after ${backoffMs}ms phi-backoff`, { attempt });
        await new Promise(r => setTimeout(r, backoffMs));
      } else {
        throw new Error(
          `Phase [${phase.name}] failed after ${maxTries} attempts: ${err.message}`
        );
      }
    }
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let _shuttingDown = false;

/**
 * Execute LIFO teardown of all initialised phases.
 * @param {string} reason  'SIGTERM' | 'SIGINT' | 'error'
 */
async function gracefulShutdown(reason) {
  if (_shuttingDown) return;
  _shuttingDown = true;

  log.info('Graceful shutdown initiated', { reason, teardowns: _teardownStack.length });
  bus.emit('lifecycle', { type: 'shutdown_start', data: { reason } });

  // LIFO: last phase up → first phase down
  while (_teardownStack.length > 0) {
    const { name, fn } = _teardownStack.pop();
    try {
      await Promise.race([
        fn(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('teardown timeout')), PHI_TIMING.PHI_5) // 11,090ms
        ),
      ]);
      log.info(`Teardown [${name}] complete`);
    } catch (err) {
      log.error(`Teardown [${name}] failed`, { error: err.message });
    }
  }

  log.info('Graceful shutdown complete');
  process.exit(0);
}

// ─── Signal Handlers ──────────────────────────────────────────────────────────

function _registerSignalHandlers() {
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT',  () => gracefulShutdown('SIGINT'));
  process.once('uncaughtException', async (err) => {
    log.fatal('Uncaught exception — initiating shutdown', { error: err.message, stack: err.stack });
    await gracefulShutdown('uncaughtException');
  });
  process.once('unhandledRejection', async (reason) => {
    log.fatal('Unhandled rejection — initiating shutdown', { reason: String(reason) });
    await gracefulShutdown('unhandledRejection');
  });
}

// ─── boot() ──────────────────────────────────────────────────────────────────

/**
 * Execute the full 10-phase boot sequence.
 * Registers OS-level signal handlers for graceful shutdown.
 *
 * @returns {Promise<void>}
 */
async function boot() {
  _registerSignalHandlers();

  const bootStart = Date.now();
  log.info('Heady Latent OS boot sequence initiated', {
    phases:  PHASES.length,
    version: process.env.HEADY_VERSION || 'unknown',
    phi:     PHI,
    psi:     PSI,
  });

  for (const phase of PHASES) {
    await runPhase(phase);
  }

  const totalBootMs = Date.now() - bootStart;
  log.info('Boot sequence complete', {
    totalBootMs,
    phases: PHASES.length,
    phi:    PHI,
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  boot,
  gracefulShutdown,
  PHASES,
  PHASE_NAMES,
  MAX_PHASE_RETRIES,
  isBooted: () => _booted,
  phaseResults: () => Object.assign({}, _phaseResults),
};
