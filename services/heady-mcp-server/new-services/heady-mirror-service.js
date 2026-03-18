'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-mirror';
const PORT = 3422;
const PROMOTION_THRESHOLD = 1 - CSL.HIGH; // 0.118

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) { this.name = name; this.state = 'CLOSED'; this.failures = 0; this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0; }
  async execute(fn) {
    if (this.state === 'OPEN') { const elapsed = Date.now() - this.lastFailure; if (elapsed < this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]))) throw new Error(`Circuit ${this.name} OPEN`); this.state = 'HALF_OPEN'; }
    try { const r = await fn(); this.failures = 0; this.state = 'CLOSED'; return r; } catch (e) { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) this.state = 'OPEN'; throw e; }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) { log('info', `${signal} received, graceful shutdown`); while (shutdownHandlers.length) await shutdownHandlers.pop()(); process.exit(0); }
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

class BaseHeadyBee {
  constructor(name) { this.name = name; this.startedAt = Date.now(); this.status = 'idle'; }
  async spawn() { this.status = 'spawned'; log('info', `${this.name} spawned`); }
  async execute() { this.status = 'executing'; }
  async report() { this.status = 'reporting'; }
  async retire() { this.status = 'retired'; log('info', `${this.name} retired`); }
}

/**
 * MirrorBee — Shadow execution environment that runs proposed changes in an
 * isolated sandbox before production. Promotion is CSL-gated: only changes with
 * divergence score below PROMOTION_THRESHOLD (1 - CSL.HIGH = 0.118) pass.
 * @class MirrorBee
 * @extends BaseHeadyBee
 */
class MirrorBee extends BaseHeadyBee {
  constructor() { super('MirrorBee'); this.sandboxes = new Map(); this.execBreaker = new CircuitBreaker('mirror-exec', { threshold: FIB[7] }); }

  /** Create a sandbox with baseline data for divergence comparison. */
  createSandbox(name, config, baseline) {
    const id = crypto.randomUUID();
    const sb = { id, name, config: config || {}, baseline: baseline || {}, status: 'created', createdAt: Date.now(), results: [], promotionHistory: [], divergenceScore: null };
    this.sandboxes.set(id, sb);
    log('info', `Sandbox created: ${name}`, { sandboxId: id });
    return sb;
  }

  /**
   * Run shadow execution: apply config transformations to inputs, capture outputs.
   * @param {string} id - Sandbox ID.
   * @param {Array} inputs - Test input objects.
   * @returns {Object} Execution result with outputs and elapsed time.
   */
  async executeShadow(id, inputs) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox ${id} not found`);
    sb.status = 'executing';
    const start = Date.now();
    const outputs = [];
    for (const input of inputs) {
      const output = await this.execBreaker.execute(() => {
        const o = {};
        const weights = sb.config.weights || {};
        for (const [key, value] of Object.entries(input)) {
          if (typeof value === 'number') { o[key] = parseFloat((value * (weights[key] !== undefined ? weights[key] : PHI) * PSI).toFixed(6)); }
          else { o[key] = value; }
        }
        o._processedAt = Date.now();
        o._configHash = crypto.createHash('sha256').update(JSON.stringify(sb.config)).digest('hex').slice(0, FIB[7]);
        return Promise.resolve(o);
      });
      outputs.push(output);
    }
    const result = { executedAt: Date.now(), elapsed: Date.now() - start, inputCount: inputs.length, outputs };
    sb.results.push(result);
    sb.status = 'executed';
    log('info', `Shadow execution complete: ${sb.name}`, { sandboxId: id, elapsed: result.elapsed });
    return result;
  }

  /**
   * Compute divergence between shadow outputs and baseline. Returns normalized
   * mean absolute difference across all numeric fields.
   * @param {string} id - Sandbox ID.
   * @returns {Object} Divergence analysis with field-level and aggregate scores.
   */
  computeDiff(id) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox ${id} not found`);
    if (sb.results.length === 0) throw new Error('No execution results to diff');
    const latest = sb.results[sb.results.length - 1];
    const fieldDivs = {};
    let total = 0, count = 0;
    for (const output of latest.outputs) {
      for (const [key, val] of Object.entries(output)) {
        if (key.startsWith('_') || typeof val !== 'number') continue;
        const base = sb.baseline[key] !== undefined ? sb.baseline[key] : val;
        const div = Math.abs(val - base) / Math.max(Math.abs(base), Math.abs(val), 1);
        if (!fieldDivs[key]) fieldDivs[key] = [];
        fieldDivs[key].push(div);
        total += div; count++;
      }
    }
    sb.divergenceScore = count > 0 ? parseFloat((total / count).toFixed(6)) : 0;
    const fields = {};
    for (const [k, vals] of Object.entries(fieldDivs)) fields[k] = { avgDivergence: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(6)), samples: vals.length };
    return { sandboxId: id, divergenceScore: sb.divergenceScore, promotionThreshold: PROMOTION_THRESHOLD, eligible: sb.divergenceScore < PROMOTION_THRESHOLD, fields };
  }

  /** Attempt CSL-gated promotion. Only passes if divergence < PROMOTION_THRESHOLD (0.118). */
  attemptPromotion(id) {
    const sb = this.sandboxes.get(id);
    if (!sb) throw new Error(`Sandbox ${id} not found`);
    if (sb.divergenceScore === null) this.computeDiff(id);
    const passed = sb.divergenceScore < PROMOTION_THRESHOLD;
    const result = { sandboxId: id, name: sb.name, passed, divergenceScore: sb.divergenceScore, threshold: PROMOTION_THRESHOLD, cslGate: 'HIGH', cslValue: CSL.HIGH, promotedAt: passed ? Date.now() : null };
    sb.promotionHistory.push(result);
    sb.status = passed ? 'promoted' : 'rejected';
    log('info', `Promotion ${passed ? 'PASSED' : 'REJECTED'}: ${sb.name}`, { divergence: sb.divergenceScore });
    return result;
  }

  listSandboxes() {
    const list = [];
    for (const sb of this.sandboxes.values()) list.push({ id: sb.id, name: sb.name, status: sb.status, createdAt: sb.createdAt, divergenceScore: sb.divergenceScore, executionCount: sb.results.length });
    return list;
  }

  async execute() { await super.execute(); log('info', 'MirrorBee executing'); }
  async report() { await super.report(); return this.listSandboxes(); }
  async retire() { await super.retire(); }
}

const app = express();
app.use(express.json());
const bee = new MirrorBee();
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

/** @route GET /health — Service health check with coherence. */
app.get('/health', (_req, res) => {
  const uptime = (Date.now() - bee.startedAt) / 1000;
  res.json({ status: 'ok', service: SERVICE_NAME, uptime, coherence: parseFloat(Math.min(CSL.HIGH, CSL.MEDIUM + (uptime / (uptime + FIB[10])) * (CSL.HIGH - CSL.MEDIUM)).toFixed(6)), timestamp: new Date().toISOString() });
});

/** @route POST /sandbox — Create a sandbox with baseline. */
app.post('/sandbox', (req, res) => { if (!req.body.name) return res.status(400).json({ error: 'Sandbox name required' }); res.status(201).json(bee.createSandbox(req.body.name, req.body.config, req.body.baseline)); });

/** @route POST /sandbox/:id/execute — Run shadow execution with test inputs. */
app.post('/sandbox/:id/execute', async (req, res) => { try { res.json(await bee.executeShadow(req.params.id, Array.isArray(req.body) ? req.body : req.body.inputs || [req.body])); } catch (e) { res.status(404).json({ error: e.message }); } });

/** @route GET /sandbox/:id/diff — Divergence analysis vs baseline. */
app.get('/sandbox/:id/diff', (req, res) => { try { res.json(bee.computeDiff(req.params.id)); } catch (e) { res.status(e.message.includes('not found') ? 404 : 400).json({ error: e.message }); } });

/** @route POST /sandbox/:id/promote — CSL-gated promotion attempt. */
app.post('/sandbox/:id/promote', (req, res) => { try { res.json(bee.attemptPromotion(req.params.id)); } catch (e) { res.status(e.message.includes('not found') ? 404 : 400).json({ error: e.message }); } });

/** @route GET /sandboxes — List all sandboxes with status. */
app.get('/sandboxes', (_req, res) => { res.json(bee.listSandboxes()); });

bee.spawn().then(() => { bee.execute(); const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`)); onShutdown(() => new Promise(r => server.close(r))); onShutdown(() => bee.retire()); });

module.exports = { MirrorBee, CircuitBreaker, app };
