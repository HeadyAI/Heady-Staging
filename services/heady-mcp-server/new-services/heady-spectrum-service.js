'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-spectrum-service';
const PORT = 3409;
const startTime = Date.now();

/** Structured JSON logger with correlation ID support. */
function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name; this.state = 'CLOSED'; this.failures = 0;
    this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try { const result = await fn(); this.failures = 0; this.state = 'CLOSED'; return result; }
    catch (err) { this.failures++; this.lastFailure = Date.now(); if (this.failures >= this.threshold) this.state = 'OPEN'; throw err; }
  }
}

const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/** Deterministic hash of a string to a float in [0, 1). Used for consistent variant assignment. */
function deterministicHash(input) {
  const hash = crypto.createHash('sha256').update(input).digest();
  return hash.readUInt32BE(0) / 0xFFFFFFFF;
}

/**
 * Compute chi-squared statistic and p-value for A/B test significance.
 * @param {number} cC - Control conversions. @param {number} cT - Control total.
 * @param {number} vC - Variant conversions. @param {number} vT - Variant total.
 * @returns {{ chiSquared: number, pValue: number, significant: boolean }}
 */
function chiSquaredTest(cC, cT, vC, vT) {
  const total = cT + vT;
  if (total === 0) return { chiSquared: 0, pValue: 1, significant: false };
  const totalConv = cC + vC, totalNon = total - totalConv;
  const eCC = (cT * totalConv) / total, eCN = (cT * totalNon) / total;
  const eVC = (vT * totalConv) / total, eVN = (vT * totalNon) / total;
  const cells = [{ o: cC, e: eCC }, { o: cT - cC, e: eCN }, { o: vC, e: eVC }, { o: vT - vC, e: eVN }];
  let chiSq = 0;
  for (const c of cells) { if (c.e > 0) chiSq += Math.pow(c.o - c.e, 2) / c.e; }
  const pValue = Math.exp(-chiSq / 2);
  return { chiSquared: parseFloat(chiSq.toFixed(6)), pValue: parseFloat(pValue.toFixed(6)), significant: pValue < (1 - CSL.HIGH) };
}

/**
 * SpectrumBee — A/B testing and feature flag bee with phi-weighted variant allocation.
 * Manages experiments, feature flags, and statistical significance testing.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class SpectrumBee {
  constructor() {
    this.experiments = new Map(); this.flags = new Map();
    this.breaker = new CircuitBreaker('spectrum-eval');
    this.stats = { experimentsCreated: 0, evaluations: 0, conversions: 0, flagsCreated: 0 };
  }
  /** Initialize the bee. */
  spawn() { log('info', 'SpectrumBee spawned', { phase: 'spawn' }); this.spawnedAt = Date.now(); }
  /**
   * Execute experiment creation with phi-weighted variant allocation.
   * @param {{ name: string, variants: string[], cslGate: number }} config
   * @returns {object} Created experiment record.
   */
  async execute(config) {
    const { name, variants, cslGate } = config;
    const id = crypto.randomUUID();
    const allocation = {};
    if (variants.length === 2) { allocation[variants[0]] = PSI; allocation[variants[1]] = 1 - PSI; }
    else {
      let remaining = 1.0;
      for (let i = 0; i < variants.length; i++) {
        const share = i === variants.length - 1 ? remaining : remaining * (1 - PSI);
        allocation[variants[i]] = parseFloat(share.toFixed(6)); remaining -= share;
      }
    }
    const experiment = {
      id, name, variants, allocation, cslGate: cslGate || CSL.MINIMUM,
      tracking: Object.fromEntries(variants.map(v => [v, { impressions: 0, conversions: 0 }])),
      createdAt: Date.now(), status: 'active',
    };
    this.experiments.set(name, experiment); this.stats.experimentsCreated++;
    log('info', 'Experiment created', { name, id, variants, allocation });
    return experiment;
  }
  /**
   * Evaluate which variant a user should see using deterministic hashing.
   * @param {string} experimentName - The experiment name.
   * @param {string} userId - The user identifier.
   * @returns {object} Variant assignment with coherence score.
   */
  evaluate(experimentName, userId) {
    const exp = this.experiments.get(experimentName);
    if (!exp) return null;
    if (exp.status !== 'active') return { variant: null, reason: 'experiment_inactive' };
    const hashValue = deterministicHash(`${experimentName}:${userId}`);
    let cumulative = 0, assignedVariant = exp.variants[exp.variants.length - 1];
    for (const [variant, share] of Object.entries(exp.allocation)) { cumulative += share; if (hashValue < cumulative) { assignedVariant = variant; break; } }
    exp.tracking[assignedVariant].impressions++; this.stats.evaluations++;
    const coherence = exp.tracking[assignedVariant].impressions > FIB[8] ? CSL.HIGH : CSL.MEDIUM;
    return { experiment: experimentName, userId, variant: assignedVariant, hashValue: parseFloat(hashValue.toFixed(6)), coherence };
  }
  /** Track a conversion event for an experiment variant. */
  trackConversion(experimentName, variant, count = 1) {
    const exp = this.experiments.get(experimentName);
    if (!exp || !exp.tracking[variant]) return null;
    exp.tracking[variant].conversions += count; this.stats.conversions += count;
    return { experiment: experimentName, variant, conversions: exp.tracking[variant].conversions };
  }
  /** Get experiment results with statistical significance via chi-squared test. */
  getResults(experimentName) {
    const exp = this.experiments.get(experimentName);
    if (!exp) return null;
    const variantResults = {};
    for (const [v, d] of Object.entries(exp.tracking)) variantResults[v] = { ...d, conversionRate: d.impressions > 0 ? parseFloat((d.conversions / d.impressions).toFixed(6)) : 0 };
    const vk = Object.keys(exp.tracking); let significance = null;
    if (vk.length === 2) { const c = exp.tracking[vk[0]], v = exp.tracking[vk[1]]; significance = chiSquaredTest(c.conversions, c.impressions, v.conversions, v.impressions); }
    return { experiment: experimentName, variants: variantResults, significance, totalImpressions: Object.values(exp.tracking).reduce((s, t) => s + t.impressions, 0), totalConversions: Object.values(exp.tracking).reduce((s, t) => s + t.conversions, 0) };
  }
  /** Create or update a feature flag with CSL gate and rollout rules. */
  setFlag(name, config) {
    const flag = { name, enabled: config.enabled !== false, cslGate: config.cslGate || CSL.MINIMUM, rolloutPercentage: config.rolloutPercentage || 1.0, rules: config.rules || [], updatedAt: Date.now() };
    this.flags.set(name, flag); this.stats.flagsCreated++;
    return flag;
  }
  /** Evaluate a feature flag for a given context with CSL gating and rule matching. */
  evaluateFlag(name, context = {}) {
    const flag = this.flags.get(name);
    if (!flag) return null;
    const coherence = flag.enabled ? CSL.HIGH : CSL.MINIMUM;
    if (coherence < flag.cslGate) return { name, enabled: false, reason: 'coherence_below_gate', coherence, gate: flag.cslGate };
    if (!flag.enabled) return { name, enabled: false, reason: 'flag_disabled', coherence };
    if (deterministicHash(`${name}:${JSON.stringify(context)}`) > flag.rolloutPercentage) return { name, enabled: false, reason: 'outside_rollout', coherence, rollout: flag.rolloutPercentage };
    for (const rule of flag.rules) {
      const cv = context[rule.field];
      if (rule.operator === 'eq' && cv !== rule.value) return { name, enabled: false, reason: 'rule_mismatch', rule: rule.field, coherence };
      if (rule.operator === 'neq' && cv === rule.value) return { name, enabled: false, reason: 'rule_mismatch', rule: rule.field, coherence };
      if (rule.operator === 'in' && !rule.value.includes(cv)) return { name, enabled: false, reason: 'rule_mismatch', rule: rule.field, coherence };
    }
    return { name, enabled: true, coherence };
  }
  /** Return statistics report. */
  report() { return { ...this.stats, activeExperiments: [...this.experiments.values()].filter(e => e.status === 'active').length, activeFlags: [...this.flags.values()].filter(f => f.enabled).length, uptime: Date.now() - this.spawnedAt }; }
  /** Retire the bee. */
  retire() { log('info', 'SpectrumBee retiring', { stats: this.stats }); }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const bee = new SpectrumBee();
bee.spawn();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: CSL.HIGH, timestamp: new Date().toISOString() });
});
/** POST /experiment — Create an experiment with phi-weighted variant allocation. */
app.post('/experiment', async (req, res) => {
  const { name, variants, cslGate } = req.body;
  if (!name || !variants || !Array.isArray(variants) || variants.length < 2) return res.status(400).json({ error: 'name and variants (array, min 2) are required' });
  try { const result = await bee.execute({ name, variants, cslGate }); log('info', 'Experiment created via API', { correlationId: req.correlationId, name }); res.status(201).json(result); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
/** GET /evaluate/:experiment/:userId — Deterministic variant assignment using hash. */
app.get('/evaluate/:experiment/:userId', (req, res) => {
  const result = bee.evaluate(req.params.experiment, req.params.userId);
  if (!result) return res.status(404).json({ error: 'Experiment not found' });
  res.json(result);
});
/** POST /track/:experiment — Track a conversion event for a variant. */
app.post('/track/:experiment', (req, res) => {
  const { variant, count } = req.body;
  if (!variant) return res.status(400).json({ error: 'variant is required' });
  const result = bee.trackConversion(req.params.experiment, variant, count || 1);
  if (!result) return res.status(404).json({ error: 'Experiment or variant not found' });
  res.json(result);
});
/** GET /results/:experiment — Conversion rates, chi-squared test, p-value, significance flag. */
app.get('/results/:experiment', (req, res) => {
  const result = bee.getResults(req.params.experiment);
  if (!result) return res.status(404).json({ error: 'Experiment not found' });
  res.json(result);
});
/** POST /flags — Create or update a feature flag with CSL gate. */
app.post('/flags', (req, res) => {
  const { name, enabled, cslGate, rolloutPercentage, rules } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const flag = bee.setFlag(name, { enabled, cslGate, rolloutPercentage, rules });
  log('info', 'Feature flag set', { correlationId: req.correlationId, name, enabled: flag.enabled });
  res.status(201).json(flag);
});
/** GET /flags/:name/:context — Evaluate flag for context, returns boolean + coherence. */
app.get('/flags/:name/:context', (req, res) => {
  let context = {};
  try { context = JSON.parse(decodeURIComponent(req.params.context)); } catch (_e) { context = { id: req.params.context }; }
  const result = bee.evaluateFlag(req.params.name, context);
  if (!result) return res.status(404).json({ error: 'Flag not found' });
  res.json(result);
});

const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening`, { port: PORT }));
onShutdown(() => new Promise(resolve => { bee.retire(); server.close(resolve); }));
module.exports = { app, SpectrumBee, deterministicHash, chiSquaredTest };
