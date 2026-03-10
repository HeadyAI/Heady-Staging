// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Drift Detector — Semantic Drift Detection Engine (384D)
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI3, FIB, CSL_THRESHOLDS,
  cosineSimilarity, sha256, cslGate
} from '../shared/phi-math-v2.js';
import { textToEmbedding, DIM } from '../shared/csl-engine-v2.js';

class DriftDetector {
  #baselines;
  #alerts;
  #history;
  #maxHistory;
  #driftThreshold;

  constructor(driftThreshold = CSL_THRESHOLDS.LOW) {
    this.#baselines = new Map();
    this.#alerts = [];
    this.#history = [];
    this.#maxHistory = FIB[16];
    this.#driftThreshold = driftThreshold;
  }

  detect(componentId, currentEmbedding) {
    const baseline = this.#baselines.get(componentId);
    if (!baseline) return { drifted: false, reason: 'No baseline', componentId };

    const similarity = cosineSimilarity(currentEmbedding, baseline.embedding);
    const drift = 1 - similarity;
    const gated = cslGate(drift, similarity, this.#driftThreshold, PSI3);
    const drifted = similarity < this.#driftThreshold;

    const record = {
      componentId, similarity, drift, drifted,
      threshold: this.#driftThreshold,
      timestamp: Date.now(),
    };

    this.#history.push(record);
    if (this.#history.length > this.#maxHistory) {
      this.#history = this.#history.slice(-this.#maxHistory);
    }

    if (drifted) {
      const alert = {
        componentId, similarity, drift,
        severity: similarity < CSL_THRESHOLDS.MINIMUM ? 'critical' : 'warning',
        timestamp: Date.now(),
      };
      this.#alerts.push(alert);
    }

    return record;
  }

  getBaseline(componentId) {
    return this.#baselines.get(componentId) || null;
  }

  setBaseline(componentId, embedding) {
    this.#baselines.set(componentId, { embedding, setAt: Date.now() });
    return { componentId, set: true };
  }

  getAlerts(limit = FIB[8]) { return this.#alerts.slice(-limit); }
  getDriftHistory(limit = FIB[8]) { return this.#history.slice(-limit); }
  clearAlerts() { this.#alerts = []; }
}

export { DriftDetector };
export default DriftDetector;
