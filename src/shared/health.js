/**
 * Heady™ Health Probe System v5.0
 * K8s-compatible liveness/readiness/startup probes
 * All timing derived from phi
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const { PHI, PSI, fib, TIMING, CSL_THRESHOLDS, getPressureLevel } = require('./phi-math');
const { createLogger } = require('./logger');

const logger = createLogger('health-probes');

class HealthProbe {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.ready = false;
    this.alive = true;
    this.checks = new Map();
    this.coherenceScore = 1.0;
    this.pressure = 0;
    this.checkInterval = options.checkInterval || TIMING.HEALTH_CHECK_MS;
    this._intervalHandle = null;
  }

  registerCheck(name, checkFn) {
    this.checks.set(name, { fn: checkFn, lastResult: null, lastCheck: 0 });
  }

  async runChecks() {
    const results = {};
    let allHealthy = true;

    for (const [name, check] of this.checks) {
      try {
        const result = await check.fn();
        check.lastResult = result;
        check.lastCheck = Date.now();
        results[name] = { status: result.healthy ? 'UP' : 'DOWN', ...result };
        if (!result.healthy) allHealthy = false;
      } catch (err) {
        check.lastResult = { healthy: false, error: err.message };
        check.lastCheck = Date.now();
        results[name] = { status: 'ERROR', error: err.message };
        allHealthy = false;
      }
    }

    this.alive = allHealthy;
    this.pressure = this._calculatePressure(results);

    return {
      service: this.serviceName,
      status: allHealthy ? 'HEALTHY' : 'DEGRADED',
      uptime: Date.now() - this.startTime,
      coherence: this.coherenceScore,
      pressure: this.pressure,
      pressureLevel: getPressureLevel(this.pressure),
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  _calculatePressure(results) {
    const total = Object.keys(results).length;
    if (total === 0) return 0;
    const unhealthy = Object.values(results).filter(r => r.status !== 'UP').length;
    return unhealthy / total;
  }

  setReady(ready) {
    this.ready = ready;
    logger.info('readiness_changed', { service: this.serviceName, ready });
  }

  setCoherence(score) {
    const prev = this.coherenceScore;
    this.coherenceScore = score;
    if (score < CSL_THRESHOLDS.MEDIUM && prev >= CSL_THRESHOLDS.MEDIUM) {
      logger.warn('coherence_drift_detected', {
        service: this.serviceName,
        previous: prev,
        current: score,
        threshold: CSL_THRESHOLDS.MEDIUM,
      });
    }
  }

  startPeriodicChecks() {
    this._intervalHandle = setInterval(() => this.runChecks(), this.checkInterval);
  }

  stopPeriodicChecks() {
    if (this._intervalHandle) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }
  }

  livenessHandler(req, res) {
    res.status(this.alive ? 200 : 503).json({
      status: this.alive ? 'ALIVE' : 'DEAD',
      service: this.serviceName,
    });
  }

  readinessHandler(req, res) {
    res.status(this.ready ? 200 : 503).json({
      status: this.ready ? 'READY' : 'NOT_READY',
      service: this.serviceName,
    });
  }

  async fullHealthHandler(req, res) {
    const health = await this.runChecks();
    res.status(health.status === 'HEALTHY' ? 200 : 503).json(health);
  }

  mountRoutes(app) {
    app.get('/health/live', (req, res) => this.livenessHandler(req, res));
    app.get('/health/ready', (req, res) => this.readinessHandler(req, res));
    app.get('/health', (req, res) => this.fullHealthHandler(req, res));
  }
}

module.exports = { HealthProbe };
