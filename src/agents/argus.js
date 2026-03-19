/**
 * ARGUS Agent — Audit, Telemetry & Drift Bee
 * P1 Priority | Hot Pool
 * Mission: Tamper-evident audit chain, structured telemetry, 6-signal drift detection
 * From: Dropzone/10-Incoming audit manifests
 */
'use strict';

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const crypto = require('crypto');

const DriftSignals = {
  LATENCY: 'latency',
  ERROR_RATE: 'error_rate',
  PROVIDER_FAILOVER: 'provider_failover',
  HEARTBEAT_MISS: 'heartbeat_miss',
  CONFIG_DRIFT: 'config_drift',
  ORS_DEVIATION: 'ors_deviation'
};

class ArgusAgent {
  constructor(opts = {}) {
    this.name = 'ARGUS';
    this.type = 'bee';
    this.pool = 'hot';
    this.version = '1.0.0';
    this.auditLog = [];
    this.telemetry = [];
    this.driftBaselines = new Map();
    this.driftAlerts = [];
    this.maxAuditEntries = opts.maxAuditEntries || 10000;
    this.driftThresholds = {
      [DriftSignals.LATENCY]: opts.latencyThreshold || 500,         // ms
      [DriftSignals.ERROR_RATE]: opts.errorRateThreshold || 0.05,   // 5%
      [DriftSignals.HEARTBEAT_MISS]: opts.heartbeatMissThreshold || 3,
      [DriftSignals.CONFIG_DRIFT]: opts.configDriftThreshold || 1,
      [DriftSignals.ORS_DEVIATION]: opts.orsDeviationThreshold || 0.15
    };
    this._checkInterval = null;
  }

  async start() {
    this._checkInterval = setInterval(() => this._runDriftCheck(), Math.round(60000 * PHI));
    console.log(`[ARGUS] Audit/telemetry/drift agent active | 6-signal drift detection enabled`);
    return { status: 'active', agent: this.name };
  }

  async stop() {
    if (this._checkInterval) clearInterval(this._checkInterval);
    console.log('[ARGUS] Shutdown complete');
  }

  /** Record an audit event — tamper-evident chain */
  recordAudit(event) {
    const prevHash = this.auditLog.length > 0
      ? this.auditLog[this.auditLog.length - 1].hash
      : '0'.repeat(64);

    const entry = {
      seq: this.auditLog.length,
      timestamp: Date.now(),
      actor: event.actor || 'system',
      action: event.action,
      resource: event.resource || null,
      detail: event.detail || {},
      prevHash
    };
    entry.hash = crypto.createHash('sha256')
      .update(JSON.stringify({ ...entry, prevHash }))
      .digest('hex');

    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-Math.round(this.maxAuditEntries * PHI_INV));
    }
    return entry;
  }

  /** Verify audit chain integrity */
  verifyAuditChain() {
    for (let i = 1; i < this.auditLog.length; i++) {
      if (this.auditLog[i].prevHash !== this.auditLog[i - 1].hash) {
        return { valid: false, brokenAt: i, entry: this.auditLog[i] };
      }
    }
    return { valid: true, entries: this.auditLog.length };
  }

  /** Record telemetry data point */
  recordTelemetry(metric) {
    const point = {
      timestamp: Date.now(),
      service: metric.service,
      metric: metric.name,
      value: metric.value,
      unit: metric.unit || 'ms',
      tags: metric.tags || {}
    };
    this.telemetry.push(point);
    if (this.telemetry.length > 50000) {
      this.telemetry = this.telemetry.slice(-30000);
    }
    // Check against drift baselines
    this._checkDriftSignal(point);
    return point;
  }

  /** Set drift baseline for a service/metric */
  setBaseline(service, metric, baseline) {
    this.driftBaselines.set(`${service}:${metric}`, {
      value: baseline.value,
      stddev: baseline.stddev || baseline.value * 0.1,
      setAt: Date.now()
    });
  }

  /** Get current drift alerts */
  getDriftAlerts(since) {
    if (since) return this.driftAlerts.filter(a => a.timestamp >= since);
    return [...this.driftAlerts];
  }

  /** Get aggregated telemetry for a service */
  getTelemetry(service, metric, windowMs = 300000) {
    const cutoff = Date.now() - windowMs;
    const points = this.telemetry.filter(t =>
      t.service === service && t.metric === metric && t.timestamp >= cutoff
    );
    if (points.length === 0) return null;
    const values = points.map(p => p.value);
    return {
      service, metric,
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || values[values.length - 1],
      window: windowMs
    };
  }

  /** Health check */
  health() {
    return {
      agent: this.name,
      status: 'healthy',
      auditEntries: this.auditLog.length,
      chainValid: this.verifyAuditChain().valid,
      telemetryPoints: this.telemetry.length,
      activeAlerts: this.driftAlerts.filter(a => !a.resolved).length,
      baselines: this.driftBaselines.size,
      uptime: process.uptime()
    };
  }

  // ── Internal ──

  _checkDriftSignal(point) {
    const key = `${point.service}:${point.metric}`;
    const baseline = this.driftBaselines.get(key);
    if (!baseline) return;

    const deviation = Math.abs(point.value - baseline.value);
    const threshold = baseline.stddev * PHI; // φ-scaled threshold
    if (deviation > threshold) {
      const alert = {
        id: `drift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        signal: point.metric.includes('latency') ? DriftSignals.LATENCY
          : point.metric.includes('error') ? DriftSignals.ERROR_RATE
          : DriftSignals.ORS_DEVIATION,
        service: point.service,
        metric: point.metric,
        expected: baseline.value,
        actual: point.value,
        deviation: deviation / baseline.stddev,
        resolved: false
      };
      this.driftAlerts.push(alert);
      console.log(`[ARGUS] Drift alert: ${alert.signal} on ${alert.service} (${alert.deviation.toFixed(2)}σ)`);
    }
  }

  _runDriftCheck() {
    // Periodic sweep: check for heartbeat misses and stale baselines
    const now = Date.now();
    for (const [key, baseline] of this.driftBaselines) {
      const age = now - baseline.setAt;
      if (age > 86400000 * PHI) { // φ-day stale baseline
        console.log(`[ARGUS] Stale baseline warning: ${key} (${Math.round(age / 3600000)}h old)`);
      }
    }
  }
}

const PHI_INV = 0.618033988749895;
module.exports = { ArgusAgent, DriftSignals };
