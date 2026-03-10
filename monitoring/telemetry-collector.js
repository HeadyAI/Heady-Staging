// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Telemetry Collector — Self-Awareness Telemetry Loop
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI2, PSI3, FIB, CSL_THRESHOLDS,
  phiFusionWeights, cslGate, sha256
} from '../shared/phi-math-v2.js';

class TelemetryCollector {
  #metrics;
  #collections;
  #collectionInterval;
  #maxCollections;

  constructor() {
    this.#metrics = new Map();
    this.#collections = [];
    this.#collectionInterval = FIB[8] * 1000;
    this.#maxCollections = FIB[16];
  }

  collect(moduleName, metrics) {
    const key = moduleName;
    if (!this.#metrics.has(key)) this.#metrics.set(key, []);

    const entry = { moduleName, metrics, timestamp: Date.now() };
    this.#metrics.get(key).push(entry);

    const series = this.#metrics.get(key);
    if (series.length > this.#maxCollections) {
      this.#metrics.set(key, series.slice(-this.#maxCollections));
    }

    return entry;
  }

  aggregate() {
    const aggregated = {};
    for (const [module, series] of this.#metrics) {
      const latest = series[series.length - 1];
      const recentValues = series.slice(-FIB[8]);
      aggregated[module] = {
        latest: latest.metrics,
        sampleCount: series.length,
        firstSeen: series[0].timestamp,
        lastSeen: latest.timestamp,
      };
    }
    return { modules: aggregated, totalModules: this.#metrics.size, timestamp: Date.now() };
  }

  getAwareness() {
    const agg = this.aggregate();
    const moduleCount = agg.totalModules;
    const avgSamples = moduleCount > 0
      ? Array.from(this.#metrics.values()).reduce((s, v) => s + v.length, 0) / moduleCount
      : 0;

    const awarenessScore = cslGate(
      moduleCount / FIB[10],
      avgSamples / FIB[8],
      CSL_THRESHOLDS.LOW, PSI3
    );

    return {
      score: Math.min(1, awarenessScore),
      trackedModules: moduleCount,
      avgSamplesPerModule: avgSamples,
      collectionInterval: this.#collectionInterval,
      timestamp: Date.now(),
    };
  }

  getMetrics(moduleName = null) {
    if (moduleName) {
      return this.#metrics.get(moduleName)?.slice(-FIB[8]) || [];
    }
    const result = {};
    for (const [key, series] of this.#metrics) {
      result[key] = series.slice(-FIB[5]);
    }
    return result;
  }

  async exportTelemetry() {
    return {
      aggregated: this.aggregate(),
      awareness: this.getAwareness(),
      hash: await sha256(JSON.stringify(this.aggregate())),
      exportedAt: Date.now(),
    };
  }
}

export { TelemetryCollector };
export default TelemetryCollector;
