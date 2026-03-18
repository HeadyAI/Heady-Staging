'use strict';
const express = require('express');
const crypto = require('crypto');

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };

const SERVICE_NAME = 'heady-harbor';
const PORT = 3414;

/** Map vulnerability severity strings to CSL scores */
const SEVERITY_CSL = { LOW: CSL.LOW, MEDIUM: CSL.MEDIUM, HIGH: CSL.HIGH, CRITICAL: CSL.CRITICAL };

/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failures = 0;
    this.threshold = opts.threshold || FIB[8];
    this.resetTimeout = opts.resetTimeout || FIB[10] * 1000;
    this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      throw err;
    }
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

/**
 * HarborBee - Container registry and image management bee.
 * Manages OCI image metadata, SBOM generation, vulnerability scanning,
 * and image signing with promotion gates based on CSL thresholds.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class HarborBee {
  constructor() {
    this.images = new Map();
    this.signatures = new Map();
    this.circuit = new CircuitBreaker('harbor-registry');
    this.startTime = Date.now();
    this.coherence = CSL.HIGH;
  }

  spawn() { log('info', 'HarborBee spawned', { phase: 'spawn' }); }
  execute() { log('info', 'HarborBee executing — registry online', { phase: 'execute' }); }
  report() {
    let totalTags = 0;
    for (const tags of this.images.values()) totalTags += tags.size;
    return { service: SERVICE_NAME, imageCount: this.images.size, totalTags, signatureCount: this.signatures.size, uptime: Date.now() - this.startTime };
  }
  retire() { log('info', 'HarborBee retiring — registry sealed', { phase: 'retire' }); }

  _imageKey(name, tag) { return `${name}:${tag}`; }

  registerImage(name, tag, metadata) {
    if (!this.images.has(name)) this.images.set(name, new Map());
    const digest = crypto.createHash('sha256').update(`${name}:${tag}:${Date.now()}`).digest('hex');
    const image = {
      name, tag, digest: `sha256:${digest}`,
      size: metadata.size || 0,
      layers: metadata.layers || [],
      dependencies: metadata.dependencies || [],
      vulnerabilities: metadata.vulnerabilities || [],
      createdAt: Date.now()
    };
    this.images.get(name).set(tag, image);
    log('info', `Image registered: ${name}:${tag}`, { digest: image.digest });
    return { name, tag, digest: image.digest, createdAt: new Date(image.createdAt).toISOString() };
  }

  listTags(name) {
    const tags = this.images.get(name);
    if (!tags) throw new Error(`Image ${name} not found`);
    const result = [];
    for (const [tag, img] of tags) {
      result.push({ tag, digest: img.digest, size: img.size, createdAt: new Date(img.createdAt).toISOString() });
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  generateSBOM(name, tag) {
    const tags = this.images.get(name);
    if (!tags || !tags.has(tag)) throw new Error(`Image ${name}:${tag} not found`);
    const image = tags.get(tag);
    const components = image.dependencies.map((dep, idx) => ({
      type: 'library', name: dep.name || `dep-${idx}`, version: dep.version || '0.0.0',
      purl: `pkg:generic/${dep.name || 'dep-' + idx}@${dep.version || '0.0.0'}`,
      hashes: [{ alg: 'SHA-256', content: crypto.createHash('sha256').update(`${dep.name}${dep.version}`).digest('hex') }]
    }));
    return {
      bomFormat: 'CycloneDX', specVersion: '1.4', version: 1,
      metadata: { timestamp: new Date().toISOString(), component: { type: 'container', name, version: tag, hashes: [{ alg: 'SHA-256', content: image.digest.replace('sha256:', '') }] } },
      components, dependencies: components.map(c => ({ ref: c.purl, dependsOn: [] }))
    };
  }

  scanImage(name, tag) {
    const tags = this.images.get(name);
    if (!tags || !tags.has(tag)) throw new Error(`Image ${name}:${tag} not found`);
    const image = tags.get(tag);
    const vulns = image.vulnerabilities.map(v => {
      const severity = (v.severity || 'LOW').toUpperCase();
      const cslScore = SEVERITY_CSL[severity] || CSL.LOW;
      return { id: v.id || crypto.randomUUID().slice(0, 8), package: v.package || 'unknown', severity, cslScore, description: v.description || 'No description', fixAvailable: v.fixAvailable !== undefined ? v.fixAvailable : false };
    });
    let aggregateScore = 0;
    if (vulns.length > 0) {
      aggregateScore = vulns.reduce((sum, v) => sum + v.cslScore, 0) / vulns.length;
      const maxScore = Math.max(...vulns.map(v => v.cslScore));
      aggregateScore = aggregateScore * PSI + maxScore * (1 - PSI);
    }
    aggregateScore = Math.round(aggregateScore * 1000) / 1000;
    const promotable = aggregateScore < CSL.MEDIUM;
    return { name, tag, digest: image.digest, vulnerabilityCount: vulns.length, aggregateScore, promotable, threshold: CSL.MEDIUM, vulnerabilities: vulns };
  }

  signImage(name, tag) {
    const tags = this.images.get(name);
    if (!tags || !tags.has(tag)) throw new Error(`Image ${name}:${tag} not found`);
    const image = tags.get(tag);
    const payload = JSON.stringify({ digest: image.digest, name, tag, timestamp: Date.now() });
    const signature = crypto.createHash('sha256').update(payload).digest('hex');
    const key = this._imageKey(name, tag);
    const sigRecord = { signature: `sha256:${signature}`, payload, signedAt: Date.now(), algorithm: 'SHA-256' };
    this.signatures.set(key, sigRecord);
    log('info', `Image signed: ${name}:${tag}`, { signature: sigRecord.signature });
    return { name, tag, digest: image.digest, signature: sigRecord.signature, signedAt: new Date(sigRecord.signedAt).toISOString() };
  }
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });

const bee = new HarborBee();
bee.spawn();
bee.execute();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: process.uptime(), coherence: bee.coherence, timestamp: new Date().toISOString() });
});

app.post('/images', async (req, res) => {
  try {
    const { name, tag, size, layers, dependencies, vulnerabilities } = req.body;
    if (!name || !tag) return res.status(400).json({ error: 'name and tag required' });
    const result = await bee.circuit.execute(() => bee.registerImage(name, tag, { size, layers, dependencies, vulnerabilities }));
    log('info', 'Image registered', { name, tag, correlationId: req.correlationId });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.message.includes('OPEN') ? 503 : 400).json({ error: err.message });
  }
});

app.get('/images/:name/tags', (req, res) => {
  try {
    res.json(bee.listTags(req.params.name));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/images/:name/:tag/sbom', (req, res) => {
  try {
    res.json(bee.generateSBOM(req.params.name, req.params.tag));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/images/:name/:tag/scan', (req, res) => {
  try {
    res.json(bee.scanImage(req.params.name, req.params.tag));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/images/:name/:tag/sign', async (req, res) => {
  try {
    const result = await bee.circuit.execute(() => bee.signImage(req.params.name, req.params.tag));
    log('info', 'Image signed', { name: req.params.name, tag: req.params.tag, correlationId: req.correlationId });
    res.json(result);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 503).json({ error: err.message });
  }
});

onShutdown(() => { bee.retire(); return Promise.resolve(); });
const server = app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} listening on port ${PORT}`, { port: PORT, pools: POOLS });
});
onShutdown(() => new Promise(resolve => server.close(resolve)));

module.exports = { app, HarborBee };
