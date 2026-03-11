/**
 * @file csl-routes-enhanced.js
 * @description Express-style route handler factory exposing the CSL analytics API.
 *   Routes are registered via `registerCSLRoutes(app, gateway)` and cover gate
 *   evaluation, scoring, consensus, decision ranking, and risk gating.
 *
 * @module CSLRoutesEnhanced
 * @version 2.0.0
 * @author HeadySystems Inc.
 * @copyright © 2026 Heady™Systems Inc. All rights reserved.
 *
 * @patent US-PENDING-2026-HSI-001 — Phi-Harmonic Semantic Gate Architecture
 * @patent US-PENDING-2026-HSI-003 — CSL API Route Schema v2
 *
 * Routes:
 *   GET  /api/csl/health      — Engine health + operation counts
 *   GET  /api/csl/thresholds  — All phi-scaled CSL thresholds
 *   POST /api/csl/gate        — Single gate evaluation
 *   POST /api/csl/score       — Pairwise cosine similarity matrix
 *   POST /api/csl/consensus   — Weighted consensus vector
 *   POST /api/csl/decide      — Ranked decision output
 *   POST /api/csl/risk-gate   — Risk exposure gate evaluation
 *   GET  /api/csl/metrics     — Full metrics dashboard
 */

'use strict';

const {
  CSLServiceGateway,
  PHI, PSI, PSI2, PHI2, PHI_HALF, PHI_INV2,
  CSL_THRESHOLDS,
  cosineSimilarity,
  normalize,
  cslGate,
  classifyConfidence,
  cslAnd,
  cslOr,
  cslNot,
  cslImplies,
  geometricMean,
} = require('../services/csl-service-integration-global');

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a value is a numeric array with at least one element.
 * @param {*} v
 * @returns {boolean}
 */
function isNumericArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every(x => typeof x === 'number' && isFinite(x));
}

/**
 * Build a standard error response body.
 * @param {string} message
 * @param {number} [status=400]
 * @returns {{ ok: false, error: string, status: number, ts: string }}
 */
function errorBody(message, status = 400) {
  return { ok: false, error: message, status, ts: new Date().toISOString() };
}

/**
 * Build a standard success response body.
 * @param {object} payload
 * @returns {{ ok: true, ts: string, ...payload }}
 */
function successBody(payload) {
  return { ok: true, ...payload, ts: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK GATE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a risk exposure against a limit using a phi-anchored sigmoid gate.
 *
 * Gate formula: confidence = 1 / (1 + exp(steepness * (exposure/limit - tau)))
 * where tau = PSI and steepness = PHI * 4
 *
 * @param {number} exposure — current exposure value
 * @param {number} limit    — maximum allowed limit
 * @param {number} [tau=PSI]        — inflection point (fraction of limit)
 * @param {number} [steepness=PHI*4] — gate steepness
 * @returns {{ confidence: number, zone: string, safeCapacity: number, utilizationRate: number }}
 */
function evaluateRiskGate(exposure, limit, tau, steepness) {
  const t = tau !== undefined ? tau : PSI;
  const s = steepness !== undefined ? steepness : PHI * 4;
  const utilization = limit > 0 ? exposure / limit : 1;
  const confidence = 1 / (1 + Math.exp(s * (utilization - t)));
  const zone = classifyConfidence(confidence);
  const safeCapacity = Math.max(0, limit * PSI - exposure);

  return {
    confidence,
    zone,
    utilization,
    safeCapacity,
    utilizationRate: Math.min(1, utilization),
    exceeded: utilization > 1,
    phiSafe: utilization <= PSI,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAIRWISE SIMILARITY MATRIX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a full pairwise cosine similarity matrix for N vectors.
 * @param {number[][]} vectors
 * @returns {number[][]} N×N matrix, diagonal = 1
 */
function pairwiseSimilarityMatrix(vectors) {
  const normed = vectors.map(v => normalize(v));
  return normed.map((a, i) =>
    normed.map((b, j) => {
      if (i === j) return 1;
      return cosineSimilarity(a, b);
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register all CSL analytics routes on an Express-compatible `app`.
 *
 * The function attaches handlers for both standard Express (req, res) and
 * a lightweight test harness. Each handler:
 *   1. Validates request body / params
 *   2. Executes CSL computation
 *   3. Returns { ok: true, ...result, ts }
 *
 * @param {object} app     — Express app (or compatible router)
 * @param {CSLServiceGateway} gateway — shared gateway instance
 * @returns {object} routeMap keyed by "METHOD /path" for testing
 */
function registerCSLRoutes(app, gateway) {
  if (!gateway || !(gateway instanceof CSLServiceGateway)) {
    throw new TypeError('gateway must be a CSLServiceGateway instance');
  }

  /** @type {Map<string, Function>} */
  const routeMap = {};

  // ── Helper: mount & track ─────────────────────────────────────────────────
  function mount(method, path, handler) {
    const key = `${method.toUpperCase()} ${path}`;
    routeMap[key] = handler;
    if (app && typeof app[method.toLowerCase()] === 'function') {
      app[method.toLowerCase()](path, handler);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/csl/health
  // ─────────────────────────────────────────────────────────────────────────
  mount('GET', '/api/csl/health', (req, res) => {
    const metrics = gateway.getMetrics();
    const body = successBody({
      status: 'healthy',
      engine: 'CSLServiceGateway',
      version: '2.0.0',
      services: gateway.listServices().length,
      operationCounts: {
        routes: metrics.totalRoutes,
        gateEvals: metrics.totalGateEvals,
        batchEvals: metrics.totalBatchEvals,
        consensus: metrics.totalConsensus,
        decisions: metrics.totalDecisions,
      },
      phi: PHI,
      uptime: process.uptime(),
    });
    if (res && typeof res.json === 'function') res.json(body);
    return body;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/csl/thresholds
  // ─────────────────────────────────────────────────────────────────────────
  mount('GET', '/api/csl/thresholds', (req, res) => {
    const body = successBody({
      thresholds: { ...CSL_THRESHOLDS },
      zones: {
        EXECUTE: `confidence > ${PSI.toFixed(7)} (PSI = 1/PHI)`,
        CAUTIOUS: `${PSI2.toFixed(7)} ≤ confidence ≤ ${PSI.toFixed(7)}`,
        HALT: `confidence < ${PSI2.toFixed(7)} (PSI² = 1/PHI²)`,
      },
    });
    if (res && typeof res.json === 'function') res.json(body);
    return body;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/csl/gate
  // Body: { input: number[], gateVector: number[], threshold?: number }
  // ─────────────────────────────────────────────────────────────────────────
  mount('POST', '/api/csl/gate', (req, res) => {
    const body = (req && req.body) ? req.body : req;

    if (!isNumericArray(body.input)) {
      const err = errorBody('input must be a non-empty numeric array');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }
    if (!isNumericArray(body.gateVector)) {
      const err = errorBody('gateVector must be a non-empty numeric array');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }
    if (body.input.length !== body.gateVector.length) {
      const err = errorBody(`Vector dimension mismatch: input(${body.input.length}) vs gateVector(${body.gateVector.length})`);
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const threshold = body.threshold !== undefined ? body.threshold : PSI;
    const similarity = cosineSimilarity(body.input, body.gateVector);
    const confidence = Math.max(0, similarity);
    const activation = cslGate(confidence);
    const zone = classifyConfidence(confidence);
    const passed = confidence >= threshold;

    const result = successBody({ similarity, confidence, activation, zone, passed, threshold });
    if (res && typeof res.json === 'function') res.json(result);
    return result;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/csl/score
  // Body: { vectors: number[][] }
  // ─────────────────────────────────────────────────────────────────────────
  mount('POST', '/api/csl/score', (req, res) => {
    const body = (req && req.body) ? req.body : req;

    if (!Array.isArray(body.vectors) || body.vectors.length < 2) {
      const err = errorBody('vectors must be an array with at least 2 elements');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const invalidIdx = body.vectors.findIndex(v => !isNumericArray(v));
    if (invalidIdx !== -1) {
      const err = errorBody(`vectors[${invalidIdx}] is not a valid numeric array`);
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const matrix = pairwiseSimilarityMatrix(body.vectors);
    const n = body.vectors.length;
    let offDiagSum = 0;
    let pairs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        offDiagSum += matrix[i][j];
        pairs++;
      }
    }
    const avgSimilarity = pairs > 0 ? offDiagSum / pairs : 1;

    const result = successBody({ matrix, avgSimilarity, n });
    if (res && typeof res.json === 'function') res.json(result);
    return result;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/csl/consensus
  // Body: { vectors: number[][], weights?: number[] }
  // ─────────────────────────────────────────────────────────────────────────
  mount('POST', '/api/csl/consensus', (req, res) => {
    const body = (req && req.body) ? req.body : req;

    if (!Array.isArray(body.vectors) || body.vectors.length === 0) {
      const err = errorBody('vectors must be a non-empty array');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const invalidIdx = body.vectors.findIndex(v => !isNumericArray(v));
    if (invalidIdx !== -1) {
      const err = errorBody(`vectors[${invalidIdx}] is not a valid numeric array`);
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    if (body.weights !== undefined) {
      if (!isNumericArray(body.weights)) {
        const err = errorBody('weights must be a numeric array when provided');
        if (res && typeof res.status === 'function') res.status(400).json(err);
        return err;
      }
      if (body.weights.length !== body.vectors.length) {
        const err = errorBody('weights length must match vectors length');
        if (res && typeof res.status === 'function') res.status(400).json(err);
        return err;
      }
    }

    const { consensus: consensusVec, coherence } = gateway.consensus(body.vectors, body.weights);
    const zone = classifyConfidence(coherence);

    const result = successBody({ consensus: consensusVec, coherence, zone });
    if (res && typeof res.json === 'function') res.json(result);
    return result;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/csl/decide
  // Body: { candidates: [{id, vector, ...}], query: number[] }
  // ─────────────────────────────────────────────────────────────────────────
  mount('POST', '/api/csl/decide', (req, res) => {
    const body = (req && req.body) ? req.body : req;

    if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
      const err = errorBody('candidates must be a non-empty array of {id, vector} objects');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    if (!isNumericArray(body.query)) {
      const err = errorBody('query must be a non-empty numeric array');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const invalidIdx = body.candidates.findIndex(c => !isNumericArray(c.vector));
    if (invalidIdx !== -1) {
      const err = errorBody(`candidates[${invalidIdx}].vector is not a valid numeric array`);
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const ranked = gateway.decide(body.candidates, body.query);

    const result = successBody({
      ranked,
      topChoice: ranked[0] || null,
      count: ranked.length,
    });
    if (res && typeof res.json === 'function') res.json(result);
    return result;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/csl/risk-gate
  // Body: { exposure: number, limit: number, tau?: number, steepness?: number }
  // ─────────────────────────────────────────────────────────────────────────
  mount('POST', '/api/csl/risk-gate', (req, res) => {
    const body = (req && req.body) ? req.body : req;

    if (typeof body.exposure !== 'number' || !isFinite(body.exposure)) {
      const err = errorBody('exposure must be a finite number');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }
    if (typeof body.limit !== 'number' || !isFinite(body.limit) || body.limit <= 0) {
      const err = errorBody('limit must be a positive finite number');
      if (res && typeof res.status === 'function') res.status(400).json(err);
      return err;
    }

    const evaluation = evaluateRiskGate(body.exposure, body.limit, body.tau, body.steepness);
    const result = successBody(evaluation);
    if (res && typeof res.json === 'function') res.json(result);
    return result;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/csl/metrics
  // ─────────────────────────────────────────────────────────────────────────
  mount('GET', '/api/csl/metrics', (req, res) => {
    const metrics = gateway.getMetrics();
    const body = successBody({
      metrics,
      dashboard: {
        totalOperations:
          metrics.totalRoutes +
          metrics.totalGateEvals +
          metrics.totalBatchEvals +
          metrics.totalConsensus +
          metrics.totalDecisions,
        gateBreakdown: {
          execute: metrics.executeCount,
          cautious: metrics.cautiousCount,
          halt: metrics.haltCount,
        },
        avgConfidence: metrics.avgConfidence,
        gateActivationRate: metrics.gateActivationRate,
        thresholds: {
          PSI: PSI,
          PSI2: PSI2,
          PHI: PHI,
        },
      },
    });
    if (res && typeof res.json === 'function') res.json(body);
    return body;
  });

  return routeMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  registerCSLRoutes,
  evaluateRiskGate,
  pairwiseSimilarityMatrix,
  errorBody,
  successBody,
  isNumericArray,
};
