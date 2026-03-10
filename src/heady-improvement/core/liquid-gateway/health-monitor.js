/**
 * HeadyLiquidGateway — Provider Health Monitor
 * 
 * Continuous health monitoring for AI providers with circuit-breaker pattern,
 * φ-backoff recovery, and CSL-gated degradation scoring.
 * 
 * @module core/liquid-gateway/health-monitor
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const PSI4 = PSI * PSI * PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** Phi-threshold levels */
const CSL_THRESHOLDS = {
  CRITICAL: 1 - Math.pow(PSI, 4) * 0.5,  // ≈ 0.927
  HIGH:     1 - Math.pow(PSI, 3) * 0.5,   // ≈ 0.882
  MEDIUM:   1 - Math.pow(PSI, 2) * 0.5,   // ≈ 0.809
  LOW:      1 - PSI * 0.5,                 // ≈ 0.691
  MINIMUM:  0.5,                            // noise floor
};

/** Pressure level boundaries */
const PRESSURE_LEVELS = {
  NOMINAL:  { min: 0, max: PSI2 },          // 0 – 0.382
  ELEVATED: { min: PSI2, max: PSI },         // 0.382 – 0.618
  HIGH:     { min: PSI, max: 1 - PSI3 },     // 0.618 – 0.854
  CRITICAL: { min: 1 - PSI4, max: 1.0 },     // 0.910 – 1.0
};

/** CSL sigmoid gate */
const cslGate = (value, cosScore, tau, temp = PSI3) =>
  value / (1 + Math.exp(-(cosScore - tau) / temp));

export class HealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.providers = new Map();
    this.probeIntervalMs = config.probeIntervalMs || Math.round(PHI * 1000 * FIB[7]); // ~34s
    this.degradationHistory = [];
    this.maxHistorySize = FIB[10]; // 55
    this.probeTimers = new Map();
    this.globalPressure = 0;
    this.started = false;
  }

  /**
   * Register a provider for health monitoring
   */
  registerProvider(name, options = {}) {
    this.providers.set(name, {
      name,
      status: 'healthy',
      healthScore: 1.0,
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      latencyHistory: [],
      maxLatencyHistory: FIB[8], // 21 samples
      errorRate: 0,
      errorWindow: [],
      maxErrorWindow: FIB[7], // 13 entries
      circuitState: 'closed', // closed | open | half-open
      circuitOpenedAt: null,
      halfOpenAttempts: 0,
      maxHalfOpenAttempts: FIB[4], // 3
      recoveryBackoff: Math.round(PHI * 1000), // 1618ms initial
      maxRecoveryBackoff: Math.round(PHI * 1000 * FIB[8]), // ~34s max
      lastProbeAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      degradationLevel: 'nominal',
      probeEndpoint: options.probeEndpoint || null,
      probeFn: options.probeFn || null,
      metadata: options.metadata || {},
    });

    if (this.started) {
      this._startProbe(name);
    }
  }

  /**
   * Start health monitoring for all registered providers
   */
  start() {
    if (this.started) return;
    this.started = true;

    for (const [name] of this.providers) {
      this._startProbe(name);
    }

    this.emit('monitor:started', { providers: [...this.providers.keys()] });
  }

  /**
   * Stop all health monitoring
   */
  stop() {
    this.started = false;
    for (const [name, timer] of this.probeTimers) {
      clearInterval(timer);
    }
    this.probeTimers.clear();
    this.emit('monitor:stopped');
  }

  /**
   * Record a successful request — update health metrics
   */
  recordSuccess(providerName, latencyMs) {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    provider.lastSuccessAt = Date.now();

    // Update latency percentiles
    provider.latencyHistory.push(latencyMs);
    if (provider.latencyHistory.length > provider.maxLatencyHistory) {
      provider.latencyHistory.shift();
    }
    this._recalculateLatencyPercentiles(provider);

    // Update error window — push success
    provider.errorWindow.push(0);
    if (provider.errorWindow.length > provider.maxErrorWindow) {
      provider.errorWindow.shift();
    }
    this._recalculateErrorRate(provider);

    // Recalculate composite health
    this._updateHealthScore(provider);

    // Handle circuit state transitions
    if (provider.circuitState === 'half-open') {
      provider.halfOpenAttempts++;
      if (provider.halfOpenAttempts >= provider.maxHalfOpenAttempts) {
        this._closeCircuit(provider);
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(providerName, error) {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    provider.lastFailureAt = Date.now();

    // Update error window — push failure
    provider.errorWindow.push(1);
    if (provider.errorWindow.length > provider.maxErrorWindow) {
      provider.errorWindow.shift();
    }
    this._recalculateErrorRate(provider);

    // Recalculate composite health
    this._updateHealthScore(provider);

    // Check circuit breaker
    if (provider.errorRate >= PSI) { // ≈ 0.618 error rate threshold
      if (provider.circuitState === 'closed') {
        this._openCircuit(provider);
      } else if (provider.circuitState === 'half-open') {
        this._openCircuit(provider);
        provider.recoveryBackoff = Math.min(
          provider.recoveryBackoff * PHI,
          provider.maxRecoveryBackoff
        );
      }
    }
  }

  /**
   * Get comprehensive health status for all providers
   */
  getHealthStatus() {
    const status = {};
    for (const [name, provider] of this.providers) {
      status[name] = {
        status: provider.status,
        healthScore: Math.round(provider.healthScore * 1000) / 1000,
        circuitState: provider.circuitState,
        degradationLevel: provider.degradationLevel,
        latency: {
          p50: Math.round(provider.latencyP50),
          p95: Math.round(provider.latencyP95),
          p99: Math.round(provider.latencyP99),
        },
        errorRate: Math.round(provider.errorRate * 1000) / 1000,
        lastSuccess: provider.lastSuccessAt,
        lastFailure: provider.lastFailureAt,
      };
    }
    return {
      providers: status,
      globalPressure: Math.round(this.globalPressure * 1000) / 1000,
      globalPressureLevel: this._getPressureLevel(this.globalPressure),
      healthyCount: [...this.providers.values()].filter(p => p.circuitState === 'closed').length,
      totalCount: this.providers.size,
    };
  }

  /**
   * Check if a provider is available for routing
   */
  isAvailable(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    return provider.circuitState !== 'open' && provider.healthScore > CSL_THRESHOLDS.MINIMUM;
  }

  /**
   * Get providers sorted by health score (for fallback ordering)
   */
  getHealthyProviders() {
    return [...this.providers.values()]
      .filter(p => p.circuitState !== 'open')
      .sort((a, b) => b.healthScore - a.healthScore)
      .map(p => ({ name: p.name, healthScore: p.healthScore, degradationLevel: p.degradationLevel }));
  }

  // === INTERNAL ===

  _startProbe(name) {
    const interval = setInterval(() => this._probe(name), this.probeIntervalMs);
    this.probeTimers.set(name, interval);
  }

  async _probe(name) {
    const provider = this.providers.get(name);
    if (!provider) return;

    provider.lastProbeAt = Date.now();

    try {
      if (provider.probeFn) {
        const start = Date.now();
        await provider.probeFn();
        const latency = Date.now() - start;
        this.recordSuccess(name, latency);
      }
    } catch (error) {
      this.recordFailure(name, error);
    }
  }

  _recalculateLatencyPercentiles(provider) {
    if (provider.latencyHistory.length === 0) return;

    const sorted = [...provider.latencyHistory].sort((a, b) => a - b);
    const len = sorted.length;

    provider.latencyP50 = sorted[Math.floor(len * 0.50)] || 0;
    provider.latencyP95 = sorted[Math.floor(len * 0.95)] || sorted[len - 1];
    provider.latencyP99 = sorted[Math.floor(len * 0.99)] || sorted[len - 1];
  }

  _recalculateErrorRate(provider) {
    if (provider.errorWindow.length === 0) {
      provider.errorRate = 0;
      return;
    }
    const sum = provider.errorWindow.reduce((a, b) => a + b, 0);
    provider.errorRate = sum / provider.errorWindow.length;
  }

  _updateHealthScore(provider) {
    // φ-fusion of latency score, error rate, and recency
    const maxAcceptableLatency = Math.round(PHI * 1000 * FIB[5]); // ~8090ms
    const latencyScore = Math.max(0, 1 - (provider.latencyP95 / maxAcceptableLatency));
    const errorScore = 1 - provider.errorRate;
    const recencyScore = provider.lastSuccessAt
      ? Math.max(0, 1 - ((Date.now() - provider.lastSuccessAt) / (this.probeIntervalMs * FIB[5])))
      : PSI2;

    // Phi-weighted fusion
    provider.healthScore =
      latencyScore * 0.486 +
      errorScore * 0.300 +
      recencyScore * 0.214;

    // Determine degradation level
    const prev = provider.degradationLevel;
    if (provider.healthScore >= CSL_THRESHOLDS.HIGH) {
      provider.status = 'healthy';
      provider.degradationLevel = 'nominal';
    } else if (provider.healthScore >= CSL_THRESHOLDS.MEDIUM) {
      provider.status = 'degraded';
      provider.degradationLevel = 'elevated';
    } else if (provider.healthScore >= CSL_THRESHOLDS.LOW) {
      provider.status = 'degraded';
      provider.degradationLevel = 'high';
    } else {
      provider.status = 'unhealthy';
      provider.degradationLevel = 'critical';
    }

    if (prev !== provider.degradationLevel) {
      this.emit('degradation:changed', {
        provider: provider.name,
        from: prev,
        to: provider.degradationLevel,
        healthScore: provider.healthScore,
      });
    }

    // Update global pressure
    this._recalculateGlobalPressure();
  }

  _recalculateGlobalPressure() {
    if (this.providers.size === 0) {
      this.globalPressure = 0;
      return;
    }

    let totalDegradation = 0;
    for (const [, provider] of this.providers) {
      totalDegradation += (1 - provider.healthScore);
    }
    this.globalPressure = totalDegradation / this.providers.size;
  }

  _getPressureLevel(pressure) {
    if (pressure >= PRESSURE_LEVELS.CRITICAL.min) return 'critical';
    if (pressure >= PRESSURE_LEVELS.HIGH.min) return 'high';
    if (pressure >= PRESSURE_LEVELS.ELEVATED.min) return 'elevated';
    return 'nominal';
  }

  _openCircuit(provider) {
    provider.circuitState = 'open';
    provider.circuitOpenedAt = Date.now();
    provider.halfOpenAttempts = 0;

    this.emit('circuit:opened', {
      provider: provider.name,
      errorRate: provider.errorRate,
      healthScore: provider.healthScore,
    });

    // Schedule half-open after φ-backoff
    setTimeout(() => {
      if (provider.circuitState === 'open') {
        provider.circuitState = 'half-open';
        this.emit('circuit:half-open', { provider: provider.name });
      }
    }, provider.recoveryBackoff);
  }

  _closeCircuit(provider) {
    provider.circuitState = 'closed';
    provider.circuitOpenedAt = null;
    provider.halfOpenAttempts = 0;
    provider.recoveryBackoff = Math.round(PHI * 1000); // reset backoff

    this.emit('circuit:closed', {
      provider: provider.name,
      healthScore: provider.healthScore,
    });
  }
}
