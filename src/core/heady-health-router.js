/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ UNIFIED HEALTH ROUTER                                    ║
 * ║  Aggregates health from all services, phi-weighted coherence     ║
 * ║  scoring, CSL gate classification, Sacred Geometry tagging       ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║  © 2026 HeadySystems Inc. — All Rights Reserved                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module heady-health-router
 * @version 1.0.0
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');
const {
  PHI, PSI, FIB_SEQUENCE,
  CSL_THRESHOLDS, phiFusionWeights,
  fib, phiMs, PHI_TIMING,
  cosineSimilarity,
} = require('../lib/phi-helpers');

// ─── SACRED GEOMETRY LAYER MAP ─────────────────────────────────────────────

/**
 * Sacred Geometry layer classification for services.
 * Each service belongs to a topology ring.
 */
const SACRED_GEOMETRY_LAYERS = Object.freeze({
  // Central Hub
  'heady-soul':              { ring: 0, layer: 'Central',    weight: PHI },
  // Inner Ring — Processing Core
  'heady-brains':            { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  'heady-conductor':         { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  'heady-vinci':             { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  'auto-success-pipeline':   { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  'hcfull-pipeline-v7':      { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  'conductor-router':        { ring: 1, layer: 'Inner',      weight: PHI * PSI },
  // Middle Ring — Execution Layer
  'jules':                   { ring: fib(3), layer: 'Middle', weight: PSI },
  'builder':                 { ring: fib(3), layer: 'Middle', weight: PSI },
  'observer':                { ring: fib(3), layer: 'Middle', weight: PSI },
  'murphy':                  { ring: fib(3), layer: 'Middle', weight: PSI },
  'atlas':                   { ring: fib(3), layer: 'Middle', weight: PSI },
  'pythia':                  { ring: fib(3), layer: 'Middle', weight: PSI },
  // Outer Ring — Specialists
  'bridge':                  { ring: fib(4), layer: 'Outer',  weight: Math.pow(PSI, fib(3)) },
  'muse':                    { ring: fib(4), layer: 'Outer',  weight: Math.pow(PSI, fib(3)) },
  'sentinel':                { ring: fib(4), layer: 'Outer',  weight: Math.pow(PSI, fib(3)) },
  'nova':                    { ring: fib(4), layer: 'Outer',  weight: Math.pow(PSI, fib(3)) },
  // Governance Shell
  'heady-observability-mesh':{ ring: fib(5), layer: 'Governance', weight: Math.pow(PSI, fib(4)) },
  'heady-check':             { ring: fib(5), layer: 'Governance', weight: Math.pow(PSI, fib(4)) },
  'heady-assure':            { ring: fib(5), layer: 'Governance', weight: Math.pow(PSI, fib(4)) },
  'heady-aware':             { ring: fib(5), layer: 'Governance', weight: Math.pow(PSI, fib(4)) },
  // Bee layer
  'telemetry-bee':           { ring: fib(5) + 1, layer: 'Bee', weight: Math.pow(PSI, fib(4)) },
  'health-bee':              { ring: fib(5) + 1, layer: 'Bee', weight: Math.pow(PSI, fib(4)) },
  'pipeline-bee':            { ring: fib(5) + 1, layer: 'Bee', weight: Math.pow(PSI, fib(4)) },
  'security-bee':            { ring: fib(5) + 1, layer: 'Bee', weight: Math.pow(PSI, fib(4)) },
  'governance-bee':          { ring: fib(5) + 1, layer: 'Bee', weight: Math.pow(PSI, fib(4)) },
});

/** Default layer for unregistered services */
const DEFAULT_LAYER = Object.freeze({ ring: fib(6), layer: 'External', weight: Math.pow(PSI, fib(5)) });

// ─── SERVICE HEALTH REGISTRY ───────────────────────────────────────────────

/**
 * ServiceHealthEntry — tracks health state for a single registered service.
 */
class ServiceHealthEntry {
  /**
   * @param {string} name - Service name
   * @param {Function} checker - Health check function returning {status, coherence, ...}
   * @param {Object} [options]
   */
  constructor(name, checker, options = {}) {
    this.name = name;
    this.checker = checker;
    this.sacredGeometry = SACRED_GEOMETRY_LAYERS[name] || DEFAULT_LAYER;
    this.lastResult = null;
    this.lastCheckTime = 0;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = fib(6); // 8
    this.checkIntervalMs = options.checkIntervalMs || PHI_TIMING.CYCLE; // ~29s
    this.history = [];
    this.maxHistory = fib(8); // 21
  }

  /**
   * Run the health check.
   * @returns {Promise<Object>}
   */
  async check() {
    const startMs = Date.now();
    try {
      const result = typeof this.checker === 'function'
        ? await this.checker()
        : { status: 'healthy', coherence: CSL_THRESHOLDS.HIGH };

      const entry = {
        status: result.status || 'healthy',
        coherence: result.coherence || CSL_THRESHOLDS.HIGH,
        durationMs: Date.now() - startMs,
        timestamp: Date.now(),
        error: null,
        sacredGeometryLayer: this.sacredGeometry.layer,
        ring: this.sacredGeometry.ring,
      };

      this.lastResult = entry;
      this.lastCheckTime = Date.now();
      this.consecutiveFailures = 0;

      this.history.push(entry);
      if (this.history.length > this.maxHistory) this.history.shift();

      return entry;
    } catch (err) {
      this.consecutiveFailures++;
      const entry = {
        status: 'error',
        coherence: 0,
        durationMs: Date.now() - startMs,
        timestamp: Date.now(),
        error: err.message,
        sacredGeometryLayer: this.sacredGeometry.layer,
        ring: this.sacredGeometry.ring,
      };

      this.lastResult = entry;
      this.lastCheckTime = Date.now();

      this.history.push(entry);
      if (this.history.length > this.maxHistory) this.history.shift();

      return entry;
    }
  }

  /**
   * Get last known health or run a fresh check if stale.
   * @returns {Promise<Object>}
   */
  async getHealth() {
    const stale = Date.now() - this.lastCheckTime > this.checkIntervalMs;
    if (stale || !this.lastResult) {
      return this.check();
    }
    return this.lastResult;
  }

  /**
   * Compute trend from history: improving, stable, or degrading.
   * @returns {string}
   */
  getTrend() {
    if (this.history.length < fib(4)) return 'stable';
    const recent = this.history.slice(-fib(5));
    const older = this.history.slice(-fib(8), -fib(5));

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((s, h) => s + h.coherence, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.coherence, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > Math.pow(PSI, fib(5))) return 'improving';
    if (diff < -Math.pow(PSI, fib(5))) return 'degrading';
    return 'stable';
  }
}

// ─── UNIFIED HEALTH ROUTER ────────────────────────────────────────────────

/**
 * HeadyHealthRouter — Unified health aggregation service.
 *
 * Aggregates health from all registered sub-services, computes phi-weighted
 * composite coherence, classifies overall system health via CSL gates,
 * and provides Express-compatible endpoints.
 *
 * Endpoints:
 *   GET /health          — Summary health (status + coherence)
 *   GET /health/detailed — Per-service breakdown
 *   GET /health/coherence — Coherence score only
 */
class HeadyHealthRouter extends EventEmitter {
  constructor(config = {}) {
    super();
    this._startTime = Date.now();
    this._version = config.version || '1.0.0';
    this._serviceName = config.serviceName || 'heady-health-router';

    /** @type {Map<string, ServiceHealthEntry>} */
    this._services = new Map();

    /** Periodic health sweep */
    this._sweepIntervalMs = config.sweepIntervalMs || PHI_TIMING.CYCLE;
    this._sweepHandle = null;

    /** Cached composite health */
    this._cachedComposite = null;
    this._cacheExpiry = 0;
    this._cacheTtlMs = PHI_TIMING.PULSE; // ~1618ms cache
  }

  /**
   * Register a service for health tracking.
   *
   * @param {string} name - Service name (should match SACRED_GEOMETRY_LAYERS keys)
   * @param {Function} checker - Health check function: () => Promise<{status, coherence}>
   * @param {Object} [options] - Check interval, etc.
   */
  registerService(name, checker, options = {}) {
    const entry = new ServiceHealthEntry(name, checker, options);
    this._services.set(name, entry);
    this.emit('service:registered', { name, layer: entry.sacredGeometry.layer });
  }

  /**
   * Deregister a service.
   * @param {string} name
   */
  deregisterService(name) {
    this._services.delete(name);
    this.emit('service:deregistered', { name });
  }

  /**
   * Start periodic health sweeps.
   */
  startSweep() {
    if (this._sweepHandle) return;
    this._sweepHandle = setInterval(() => {
      this._sweepAll().catch(() => {});
    }, this._sweepIntervalMs);
  }

  /**
   * Stop periodic health sweeps.
   */
  stopSweep() {
    if (this._sweepHandle) {
      clearInterval(this._sweepHandle);
      this._sweepHandle = null;
    }
  }

  /**
   * Sweep all registered services.
   * @returns {Promise<void>}
   */
  async _sweepAll() {
    const promises = [...this._services.values()].map(entry => entry.check());
    await Promise.allSettled(promises);
    this._cachedComposite = null;
    this._cacheExpiry = 0;
  }

  /**
   * Compute phi-weighted composite coherence across all services.
   * Services are weighted by their Sacred Geometry layer weight.
   *
   * @returns {Promise<{coherence: number, cslGate: string, serviceCount: number, healthyCount: number, degradedCount: number}>}
   */
  async computeComposite() {
    if (this._cachedComposite && Date.now() < this._cacheExpiry) {
      return this._cachedComposite;
    }

    const entries = [...this._services.values()];
    if (entries.length === 0) {
      return {
        coherence: 1.0,
        cslGate: 'HIGH',
        serviceCount: 0,
        healthyCount: 0,
        degradedCount: 0,
      };
    }

    // Get health from all services
    const healthResults = await Promise.all(
      entries.map(async (entry) => ({
        name: entry.name,
        health: await entry.getHealth(),
        weight: entry.sacredGeometry.weight,
        layer: entry.sacredGeometry.layer,
      }))
    );

    // Compute phi-weighted composite coherence
    const totalWeight = healthResults.reduce((s, r) => s + r.weight, 0);
    const weightedCoherence = totalWeight > 0
      ? healthResults.reduce((s, r) => s + r.health.coherence * r.weight, 0) / totalWeight
      : 0;

    const healthyCount = healthResults.filter(r => r.health.status === 'healthy' || r.health.status === 'UP').length;
    const degradedCount = healthResults.length - healthyCount;

    // CSL gate classification
    let cslGate = 'MINIMUM';
    if (weightedCoherence >= CSL_THRESHOLDS.CRITICAL) cslGate = 'CRITICAL';
    else if (weightedCoherence >= CSL_THRESHOLDS.HIGH) cslGate = 'HIGH';
    else if (weightedCoherence >= CSL_THRESHOLDS.MEDIUM) cslGate = 'MEDIUM';
    else if (weightedCoherence >= CSL_THRESHOLDS.LOW) cslGate = 'LOW';

    const composite = {
      coherence: parseFloat(weightedCoherence.toFixed(fib(5))),
      cslGate,
      serviceCount: entries.length,
      healthyCount,
      degradedCount,
    };

    this._cachedComposite = composite;
    this._cacheExpiry = Date.now() + this._cacheTtlMs;

    return composite;
  }

  /**
   * Get summary health status.
   * @returns {Promise<Object>}
   */
  async getSummary() {
    const composite = await this.computeComposite();
    const uptimeMs = Date.now() - this._startTime;

    return {
      service: this._serviceName,
      status: composite.coherence >= CSL_THRESHOLDS.MINIMUM ? 'healthy' : 'degraded',
      coherence: composite.coherence,
      csl_gate: composite.cslGate,
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
      uptime_seconds: parseFloat((uptimeMs / PHI_TIMING.TICK).toFixed(fib(3))),
      version: this._version,
      phi: PHI,
      psi: PSI,
      services: {
        total: composite.serviceCount,
        healthy: composite.healthyCount,
        degraded: composite.degradedCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed per-service health breakdown.
   * @returns {Promise<Object>}
   */
  async getDetailed() {
    const entries = [...this._services.values()];
    const services = {};

    for (const entry of entries) {
      const health = await entry.getHealth();
      services[entry.name] = {
        status: health.status,
        coherence: health.coherence,
        durationMs: health.durationMs,
        sacredGeometryLayer: entry.sacredGeometry.layer,
        ring: entry.sacredGeometry.ring,
        weight: parseFloat(entry.sacredGeometry.weight.toFixed(fib(5))),
        consecutiveFailures: entry.consecutiveFailures,
        trend: entry.getTrend(),
        lastCheck: health.timestamp,
        error: health.error || null,
      };
    }

    const composite = await this.computeComposite();
    const uptimeMs = Date.now() - this._startTime;

    return {
      service: this._serviceName,
      status: composite.coherence >= CSL_THRESHOLDS.MINIMUM ? 'healthy' : 'degraded',
      coherence: composite.coherence,
      csl_gate: composite.cslGate,
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
      uptime_seconds: parseFloat((uptimeMs / PHI_TIMING.TICK).toFixed(fib(3))),
      version: this._version,
      composite,
      services,
      layerSummary: this._computeLayerSummary(entries),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get coherence score only.
   * @returns {Promise<Object>}
   */
  async getCoherence() {
    const composite = await this.computeComposite();
    return {
      coherence: composite.coherence,
      csl_gate: composite.cslGate,
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
      serviceCount: composite.serviceCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Compute health summary by Sacred Geometry layer.
   * @param {ServiceHealthEntry[]} entries
   * @returns {Object}
   */
  _computeLayerSummary(entries) {
    const layers = {};
    for (const entry of entries) {
      const layer = entry.sacredGeometry.layer;
      if (!layers[layer]) {
        layers[layer] = { services: 0, avgCoherence: 0, ring: entry.sacredGeometry.ring };
      }
      layers[layer].services++;
      const result = entry.lastResult;
      layers[layer].avgCoherence += result ? result.coherence : 0;
    }

    for (const layer of Object.values(layers)) {
      layer.avgCoherence = layer.services > 0
        ? parseFloat((layer.avgCoherence / layer.services).toFixed(fib(5)))
        : 0;
    }

    return layers;
  }

  /**
   * Create an Express-compatible router with health endpoints.
   * @returns {Function} Router function (req, res, next)
   */
  createRouter() {
    const self = this;
    const routes = [];

    function router(req, res, next) {
      const method = req.method;
      const url = (req.url || '').split('?')[0];

      for (const route of routes) {
        if (route.method === method && route.path === url) {
          return route.handler(req, res);
        }
      }
      if (typeof next === 'function') next();
    }

    // GET /health — Summary
    routes.push({
      method: 'GET',
      path: '/health',
      handler: async (req, res) => {
        try {
          const summary = await self.getSummary();
          const statusCode = summary.status === 'healthy' ? 200 : 503;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(summary));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, status: 'error' }));
        }
      },
    });

    // GET /health/detailed — Per-service breakdown
    routes.push({
      method: 'GET',
      path: '/health/detailed',
      handler: async (req, res) => {
        try {
          const detailed = await self.getDetailed();
          const statusCode = detailed.status === 'healthy' ? 200 : 503;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(detailed));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, status: 'error' }));
        }
      },
    });

    // GET /health/coherence — Score only
    routes.push({
      method: 'GET',
      path: '/health/coherence',
      handler: async (req, res) => {
        try {
          const coherence = await self.getCoherence();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(coherence));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, status: 'error' }));
        }
      },
    });

    return router;
  }

  /**
   * Health check for the health router itself.
   * @returns {Object}
   */
  health() {
    return {
      service: this._serviceName,
      status: 'healthy',
      registeredServices: this._services.size,
      sweepActive: !!this._sweepHandle,
      sweepIntervalMs: this._sweepIntervalMs,
      uptime_ms: Date.now() - this._startTime,
      version: this._version,
      phi_compliance: true,
      sacred_geometry_layer: 'Governance',
    };
  }

  /**
   * Graceful shutdown — LIFO cleanup.
   */
  shutdown() {
    this.stopSweep();
    this._services.clear();
    this._cachedComposite = null;
    this.removeAllListeners();
  }
}

// ─── MODULE EXPORTS ────────────────────────────────────────────────────────

module.exports = {
  HeadyHealthRouter,
  ServiceHealthEntry,
  SACRED_GEOMETRY_LAYERS,
  DEFAULT_LAYER,
};
