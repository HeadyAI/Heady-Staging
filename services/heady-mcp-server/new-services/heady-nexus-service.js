'use strict';
const express = require('express');
const crypto = require('crypto');
const PORT = 3403;
const SERVICE_NAME = 'heady-nexus';
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const BASE_TTL = FIB[10] * 1000;
const HEALTH_CHECK_INTERVAL = FIB[8] * 1000;
/**
 * Structured JSON logger with correlation ID support.
 * @param {'info'|'warn'|'error'|'debug'} level - Log severity level.
 * @param {string} msg - Human-readable log message.
 * @param {Object} [meta={}] - Additional structured metadata.
 */
function log(level, msg, meta = {}) {
  const entry = { timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
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
    try {
      const result = await fn();
      this.failures = 0; this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++; this.lastFailure = Date.now();
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
/** TTL decreases exponentially via phi-decay: baseTTL * PSI^missedHeartbeats. */
function phiDecayTTL(missedHeartbeats) { return BASE_TTL * Math.pow(PSI, missedHeartbeats); }
/** Compute coherence for a service instance based on uptime and heartbeat freshness. */
function computeInstanceCoherence(instance) {
  const uptimeScore = Math.min((Date.now() - instance.registeredAt) / (FIB[13] * 1000), 1);
  const freshnessScore = Math.max(1 - ((Date.now() - instance.lastHeartbeat) / BASE_TTL), 0);
  const raw = (uptimeScore * POOLS.HOT + freshnessScore * POOLS.WARM) * PHI;
  return parseFloat(Math.min(Math.max(raw, CSL.MINIMUM), CSL.CRITICAL).toFixed(6));
}
/**
 * NexusBee — Service mesh control plane managing service discovery, health monitoring,
 * and traffic policies with phi-decay TTLs for service instance liveness.
 * Lifecycle: spawn() -> execute() -> report() -> retire()
 * @class
 */
class NexusBee {
  constructor() {
    this.registry = new Map(); this.policies = this.buildDefaultPolicies();
    this.breaker = new CircuitBreaker('nexus-discovery');
    this.healthInterval = null; this.startTime = Date.now(); this.evictionCount = 0;
  }
  /** Build default traffic policies with phi-scaled rate limits per pool tier. */
  buildDefaultPolicies() {
    return {
      rateLimits: {
        hot: { requestsPerSecond: Math.round(FIB[12] * POOLS.HOT), burstMultiplier: PHI },
        warm: { requestsPerSecond: Math.round(FIB[12] * POOLS.WARM), burstMultiplier: PHI },
        cold: { requestsPerSecond: Math.round(FIB[12] * POOLS.COLD), burstMultiplier: PHI },
        reserve: { requestsPerSecond: Math.round(FIB[12] * POOLS.RESERVE), burstMultiplier: PHI },
        governance: { requestsPerSecond: Math.round(FIB[12] * POOLS.GOVERNANCE), burstMultiplier: PHI }
      },
      retryPolicy: { maxRetries: FIB[5], backoffBase: PSI, backoffMultiplier: PHI },
      circuitBreaker: { threshold: FIB[8], resetTimeout: FIB[10] * 1000 }
    };
  }
  spawn() {
    log('info', 'NexusBee spawning');
    this.healthInterval = setInterval(() => this.runHealthChecks(), HEALTH_CHECK_INTERVAL);
    onShutdown(() => { clearInterval(this.healthInterval); log('info', 'Health check interval cleared'); });
  }
  /**
   * Register a service instance in the mesh.
   * @param {string} name - Service name.
   * @param {string} host - Host address.
   * @param {number} port - Port number.
   * @param {Object} [metadata={}] - Optional metadata.
   * @returns {{ name: string, instanceId: string, ttl: number }}
   */
  registerService(name, host, port, metadata = {}) {
    const instanceId = crypto.randomUUID();
    const instances = this.registry.get(name) || [];
    instances.push({ instanceId, name, host, port, health: 'healthy', registeredAt: Date.now(),
      lastHeartbeat: Date.now(), missedHeartbeats: 0, ttl: BASE_TTL, metadata });
    this.registry.set(name, instances);
    log('info', `Service registered: ${name} at ${host}:${port}`, { instanceId });
    return { name, instanceId, ttl: BASE_TTL };
  }
  /** @param {string} name - Remove all instances of this service. @returns {number} Removed count. */
  deregisterService(name) {
    const instances = this.registry.get(name);
    if (!instances) return 0;
    this.registry.delete(name);
    log('info', `Service deregistered: ${name}, removed ${instances.length} instances`);
    return instances.length;
  }
  /** Discover healthy instances sorted by coherence score descending. */
  discoverService(name) {
    return (this.registry.get(name) || [])
      .filter(i => i.health === 'healthy')
      .map(i => ({ ...i, coherence: computeInstanceCoherence(i) }))
      .sort((a, b) => b.coherence - a.coherence);
  }
  /** Run periodic health checks. Evict instances whose TTL expired below FIB[5]*1000ms. */
  runHealthChecks() {
    const now = Date.now();
    for (const [name, instances] of this.registry) {
      const surviving = [];
      for (const inst of instances) {
        if (now - inst.lastHeartbeat > phiDecayTTL(inst.missedHeartbeats)) {
          inst.missedHeartbeats++; inst.ttl = phiDecayTTL(inst.missedHeartbeats);
          if (inst.ttl < FIB[5] * 1000) { log('warn', `Evicting ${name} instance ${inst.instanceId}`); this.evictionCount++; continue; }
          inst.health = 'degraded';
        } else {
          inst.health = 'healthy'; inst.missedHeartbeats = Math.max(0, inst.missedHeartbeats - 1);
          inst.ttl = phiDecayTTL(inst.missedHeartbeats);
        }
        surviving.push(inst);
      }
      if (surviving.length === 0) this.registry.delete(name);
      else this.registry.set(name, surviving);
    }
  }
  /** Record a heartbeat for a specific instance, resetting its missed count. */
  heartbeat(name, instanceId) {
    const instances = this.registry.get(name);
    if (!instances) return false;
    const inst = instances.find(i => i.instanceId === instanceId);
    if (!inst) return false;
    inst.lastHeartbeat = Date.now(); inst.missedHeartbeats = 0; inst.health = 'healthy'; inst.ttl = BASE_TTL;
    return true;
  }
  execute() { log('info', 'NexusBee executing'); }
  report() {
    let total = 0; for (const v of this.registry.values()) total += v.length;
    return { service: SERVICE_NAME, registeredServices: this.registry.size, totalInstances: total,
      evictionCount: this.evictionCount, uptime: Date.now() - this.startTime, breakerState: this.breaker.state };
  }
  retire() { clearInterval(this.healthInterval); log('info', 'NexusBee retiring'); }
}
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const nexus = new NexusBee();
nexus.spawn();
nexus.execute();
app.get('/health', (_req, res) => {
  const r = nexus.report();
  res.json({ status: 'healthy', service: SERVICE_NAME, uptime: r.uptime, coherence: CSL.HIGH, timestamp: new Date().toISOString() });
});
app.post('/register', async (req, res) => {
  const { name, host, port, metadata } = req.body;
  if (!name || !host || !port) return res.status(400).json({ error: 'name, host, and port required' });
  try {
    const result = await nexus.breaker.execute(() => nexus.registerService(name, host, port, metadata));
    log('info', 'Service registered', { correlationId: req.correlationId, name });
    res.status(201).json({ correlationId: req.correlationId, ...result });
  } catch (err) {
    log('error', 'Registration failed', { correlationId: req.correlationId, error: err.message });
    res.status(503).json({ error: err.message });
  }
});
app.delete('/deregister/:name', (req, res) => {
  const removed = nexus.deregisterService(req.params.name);
  if (removed === 0) return res.status(404).json({ error: 'Service not found' });
  res.json({ correlationId: req.correlationId, removed });
});
app.get('/discover/:name', (req, res) => {
  const instances = nexus.discoverService(req.params.name);
  res.json({ correlationId: req.correlationId, service: req.params.name, instances, count: instances.length });
});
app.post('/heartbeat', (req, res) => {
  const { name, instanceId } = req.body;
  if (!name || !instanceId) return res.status(400).json({ error: 'name and instanceId required' });
  const updated = nexus.heartbeat(name, instanceId);
  if (!updated) return res.status(404).json({ error: 'Instance not found' });
  res.json({ correlationId: req.correlationId, status: 'acknowledged' });
});
app.get('/policies', (_req, res) => { res.json({ correlationId: _req.correlationId, policies: nexus.policies }); });
const server = app.listen(PORT, () => log('info', `${SERVICE_NAME} listening on port ${PORT}`));
onShutdown(() => new Promise(resolve => server.close(resolve)));
module.exports = { NexusBee, CircuitBreaker };
