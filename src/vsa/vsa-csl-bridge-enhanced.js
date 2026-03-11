/**
 * @file vsa-csl-bridge-enhanced.js
 * @description Enhanced VSA-CSL bridge providing full integration between Vector Symbolic
 *   Architecture (VSA) hyperdimensional computing and Continuous Semantic Logic (CSL) gates.
 *   All operations are confidence-gated with phi-derived thresholds.
 *
 * @module VSACSLBridge
 * @version 2.0.0
 * @author HeadySystems Inc.
 * @copyright © 2026 Heady™Systems Inc. All rights reserved.
 *
 * @patent US-PENDING-2026-HSI-001 — Phi-Harmonic Semantic Gate Architecture
 * @patent US-PENDING-2026-HSI-005 — VSA Hyperdimensional CSL Integration Protocol
 *
 * All numeric constants are derived from φ (phi) = 1.6180339887.
 *
 * VSA Operations supported:
 *   - Binding: element-wise XOR for binary, phi-weighted blend for continuous
 *   - Bundling: superposition (element-wise sum, normalized)
 *   - Similarity: cosine similarity as VSA resonance metric
 *   - Composition: nested binding/bundling chains
 *
 * CSL Gate Types:
 *   resonance_gate    — similarity-based activation
 *   superposition_gate — bundled vector confidence
 *   orthogonal_gate   — orthogonality detection
 *   soft_gate         — smooth sigmoid gate
 *   composition_gate  — compound operation gating
 *   phi_decision_gate — multi-criterion phi decision
 *   continuous_and    — geometric mean
 *   continuous_or     — probabilistic union
 *   continuous_not    — complement
 *   continuous_implies — material implication
 */

'use strict';

const { EventEmitter } = require('events');

// ─────────────────────────────────────────────────────────────────────────────
// PHI CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** @constant {number} PHI */
const PHI = 1.6180339887;

/** @constant {number} PSI = 1/PHI ≈ 0.6180339887 */
const PSI = 1 / PHI;

/** @constant {number} PSI2 = PSI² ≈ 0.3819660113 */
const PSI2 = PSI * PSI;

/** @constant {number} PHI2 = PHI² ≈ 2.6180339887 */
const PHI2 = PHI * PHI;

/** @constant {number} EPSILON */
const EPSILON = 1e-10;

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR MATH
// ─────────────────────────────────────────────────────────────────────────────

function l2Norm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

function normalize(v) {
  const n = l2Norm(v);
  if (n < EPSILON) return v.map(() => 0);
  return v.map(x => x / n);
}

function dotProduct(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const na = l2Norm(a), nb = l2Norm(b);
  if (na < EPSILON || nb < EPSILON) return 0;
  return dotProduct(a, b) / (na * nb);
}

function elementAdd(a, b) {
  return a.map((v, i) => v + (b[i] || 0));
}

function elementMul(a, b) {
  return a.map((v, i) => v * (b[i] || 0));
}

function scalarMul(v, s) {
  return v.map(x => x * s);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSL SCALAR OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Smooth CSL gate anchored to PSI/PSI2. */
function cslGate(confidence) {
  if (confidence >= PSI) return 1;
  if (confidence < PSI2) return 0;
  return (confidence - PSI2) / (PSI - PSI2);
}

/** Continuous AND: geometric mean */
function cslAnd(a, b) {
  return Math.sqrt(Math.max(0, a) * Math.max(0, b));
}

/** Continuous OR: probabilistic union */
function cslOr(a, b) {
  const ca = Math.max(0, Math.min(1, a));
  const cb = Math.max(0, Math.min(1, b));
  return ca + cb - ca * cb;
}

/** Continuous NOT: complement */
function cslNot(a) {
  return 1 - Math.max(0, Math.min(1, a));
}

/** Continuous XOR */
function cslXor(a, b) {
  return Math.abs(Math.max(0, Math.min(1, a)) - Math.max(0, Math.min(1, b)));
}

/** Continuous IMPLIES: ¬a ∨ b */
function cslImplies(a, b) {
  return cslOr(cslNot(a), b);
}

/** Classify confidence into CSL zone */
function classifyConfidence(confidence) {
  if (confidence > PSI)  return 'EXECUTE';
  if (confidence >= PSI2) return 'CAUTIOUS';
  return 'HALT';
}

/** Phi-geometric weight for index i in a sequence of n */
function phiGeometricWeight(i, n) {
  // w[i] = PHI^(n-1-i) / sum(PHI^k, k=0..n-1)
  const weights = Array.from({ length: n }, (_, k) => Math.pow(PHI, k));
  const total = weights.reduce((s, w) => s + w, 0);
  return Math.pow(PHI, i) / total;
}

// ─────────────────────────────────────────────────────────────────────────────
// VSA SEMANTIC GATES (base implementation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class VSASemanticGates
 * @description Core VSA gate operations: binding, bundling, and similarity gates.
 */
class VSASemanticGates {
  /**
   * Resonance gate: similarity-based activation.
   * @param {number[]} queryVec
   * @param {number[]} memoryVec
   * @param {number} [threshold=PSI]
   * @returns {{ resonance: number, activated: boolean, zone: string }}
   */
  resonanceGate(queryVec, memoryVec, threshold = PSI) {
    const sim = cosineSimilarity(queryVec, memoryVec);
    const resonance = Math.max(0, sim);
    return {
      resonance,
      activated: resonance >= threshold,
      zone: classifyConfidence(resonance),
      gateValue: cslGate(resonance),
    };
  }

  /**
   * Superposition gate: bundle multiple vectors and measure coherence.
   * @param {number[][]} vectors
   * @returns {{ bundle: number[], coherence: number }}
   */
  superpositionGate(vectors) {
    if (!vectors || vectors.length === 0) return { bundle: [], coherence: 0 };
    const dim = vectors[0].length;
    const sum = vectors.reduce((acc, v) => elementAdd(acc, v), new Array(dim).fill(0));
    const bundle = normalize(sum);
    // Coherence = mean similarity to bundle
    const coherence = vectors.length > 0
      ? vectors.reduce((s, v) => s + Math.max(0, cosineSimilarity(v, bundle)), 0) / vectors.length
      : 0;
    return { bundle, coherence };
  }

  /**
   * Orthogonal gate: detect orthogonality (low similarity = high gate).
   * @param {number[]} a
   * @param {number[]} b
   * @returns {{ orthogonality: number, activated: boolean }}
   */
  orthogonalGate(a, b) {
    const sim = Math.abs(cosineSimilarity(a, b));
    const orthogonality = 1 - sim;
    return {
      orthogonality,
      activated: orthogonality > PSI,
      zone: classifyConfidence(orthogonality),
    };
  }

  /**
   * Soft gate: smooth sigmoid centered at threshold.
   * @param {number} value
   * @param {number} [threshold=PSI]
   * @param {number} [steepness=PHI*4]
   * @returns {number} gate ∈ (0,1)
   */
  softGate(value, threshold = PSI, steepness = PHI * 4) {
    return 1 / (1 + Math.exp(-steepness * (value - threshold)));
  }

  /**
   * Composition gate: gate a compound binding/bundling result.
   * @param {number[]} bindA
   * @param {number[]} bindB
   * @returns {{ bound: number[], gate: number, zone: string }}
   */
  compositionGate(bindA, bindB) {
    // Binding via element-wise product + normalize
    const product = elementMul(normalize(bindA), normalize(bindB));
    const bound = normalize(product);
    const sim = cosineSimilarity(bound, normalize(bindA));
    const gate = cslGate(Math.max(0, sim));
    return { bound, gate, zone: classifyConfidence(Math.max(0, sim)) };
  }

  /**
   * Phi decision gate: multi-criterion weighted decision.
   * @param {Array<{value: number, weight: number}>} criteria
   * @returns {{ decision: number, zone: string }}
   */
  phiDecisionGate(criteria) {
    if (!criteria || criteria.length === 0) return { decision: 0, zone: 'HALT' };
    let weightedSum = 0;
    let totalWeight = 0;
    for (const c of criteria) {
      const w = c.weight * PHI_INV(c);
      weightedSum += c.value * w;
      totalWeight += w;
    }
    const decision = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return { decision, zone: classifyConfidence(decision) };
  }
}

// Helper: phi-harmonic weight modifier
function PHI_INV(criterion) {
  // Scale weight by phi factor of criterion value
  const v = Math.max(0, Math.min(1, criterion.value || 0));
  return 1 + (PHI - 1) * v;
}

// ─────────────────────────────────────────────────────────────────────────────
// VSA-CSL BRIDGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class VSACSLBridge
 * @extends EventEmitter
 * @description Full VSA-CSL bridge: wraps VSASemanticGates with CSL confidence
 *   gating, fusion, scripting, and decision-gate operations.
 */
class VSACSLBridge extends EventEmitter {
  /**
   * @param {number} [dim=256] — hypervector dimensionality
   * @param {object} [options]
   */
  constructor(dim = 256, options = {}) {
    super();
    this._dim = dim;
    this._gates = new VSASemanticGates();
    this._memory = new Map();    // concept name → normalized vector
    this._bindLog = [];
    this._verbose = Boolean(options.verbose);
  }

  // ── Memory Management ─────────────────────────────────────────────────────

  /**
   * Store a concept vector in memory.
   * @param {string} name
   * @param {number[]} vector
   * @returns {this}
   */
  store(name, vector) {
    this._memory.set(name, normalize(vector));
    return this;
  }

  /**
   * Retrieve a concept vector from memory.
   * @param {string} name
   * @returns {number[]|null}
   */
  retrieve(name) {
    return this._memory.get(name) || null;
  }

  // ── CSL Bind ──────────────────────────────────────────────────────────────

  /**
   * CSL-gated binding: only bind if resonance > PSI threshold.
   * Binding uses phi-weighted element-wise product of normalized vectors.
   *
   * @param {string|number[]} conceptA — name or vector
   * @param {string|number[]} conceptB — name or vector
   * @param {number} [threshold=PSI]
   * @returns {{ bound: number[]|null, resonance: number, bound: boolean, zone: string }}
   */
  cslBind(conceptA, conceptB, threshold = PSI) {
    const vecA = Array.isArray(conceptA) ? normalize(conceptA) : (this._memory.get(conceptA) || []);
    const vecB = Array.isArray(conceptB) ? normalize(conceptB) : (this._memory.get(conceptB) || []);

    if (vecA.length === 0 || vecB.length === 0) {
      return { bound: null, resonance: 0, didBind: false, zone: 'HALT' };
    }

    const resonance = Math.max(0, cosineSimilarity(vecA, vecB));
    const zone = classifyConfidence(resonance);

    if (resonance < threshold) {
      this.emit('cslBind:halted', { resonance, threshold });
      return { bound: null, resonance, didBind: false, zone };
    }

    // Phi-weighted binding: geometric blend
    const bound = normalize(elementMul(
      scalarMul(vecA, PSI),
      scalarMul(vecB, PHI - 1)
    ).map((v, i) => vecA[i] * PSI + vecB[i] * (1 - PSI)));

    this._bindLog.push({ resonance, zone, ts: Date.now() });
    this.emit('cslBind:success', { resonance, zone });
    return { bound, resonance, didBind: true, zone };
  }

  // ── CSL Query ─────────────────────────────────────────────────────────────

  /**
   * CSL-scored query: search memory for top-K vectors above threshold.
   * Results ranked by phi-scaled relevance score.
   *
   * @param {number[]} queryVec
   * @param {number} [threshold=PSI2]
   * @param {number} [topK=5]
   * @returns {Array<{name: string, similarity: number, relevance: number, zone: string}>}
   */
  cslQuery(queryVec, threshold = PSI2, topK = 5) {
    if (!Array.isArray(queryVec) || queryVec.length === 0) return [];
    const normQuery = normalize(queryVec);

    const results = [];
    for (const [name, vec] of this._memory) {
      const sim = cosineSimilarity(normQuery, vec);
      if (sim >= threshold) {
        // Phi-scaled relevance: sim ^ (1/PHI) to emphasize near-1 scores
        const relevance = Math.pow(Math.max(0, sim), 1 / PHI);
        results.push({ name, similarity: sim, relevance, zone: classifyConfidence(sim) });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, topK);
  }

  // ── CSL Decision Gate ─────────────────────────────────────────────────────

  /**
   * Phi decision gate using CSL confidence scoring.
   * Evaluates a set of rules against a state vector and returns the
   * highest-confidence matching rule.
   *
   * @param {number[]} state — current state vector
   * @param {Array<{name: string, condition: number[], action: any, weight?: number}>} rules
   * @returns {{ matched: object|null, confidence: number, zone: string, all: Array }}
   */
  cslDecisionGate(state, rules) {
    if (!Array.isArray(state) || !Array.isArray(rules)) {
      return { matched: null, confidence: 0, zone: 'HALT', all: [] };
    }

    const normState = normalize(state);
    const scored = rules.map(rule => {
      const sim = cosineSimilarity(normState, normalize(rule.condition));
      const confidence = Math.max(0, sim) * (rule.weight || 1);
      return { ...rule, confidence, zone: classifyConfidence(confidence) };
    });

    scored.sort((a, b) => b.confidence - a.confidence);
    const top = scored[0];
    const matched = top && top.confidence > PSI2 ? top : null;

    return {
      matched,
      confidence: top ? top.confidence : 0,
      zone: top ? classifyConfidence(top.confidence) : 'HALT',
      all: scored,
    };
  }

  // ── CSL Fusion Gate ───────────────────────────────────────────────────────

  /**
   * Weighted fusion with phi-geometric weights.
   * If weights not supplied, uses phi-geometric weights (w_i ∝ PHI^i).
   *
   * @param {number[][]} vectors
   * @param {number[]} [weights] — optional custom weights
   * @returns {{ fused: number[], coherence: number, weights: number[] }}
   */
  cslFusionGate(vectors, weights) {
    if (!Array.isArray(vectors) || vectors.length === 0) {
      return { fused: [], coherence: 0, weights: [] };
    }

    const n = vectors.length;
    const w = weights || vectors.map((_, i) => phiGeometricWeight(i, n));

    const dim = vectors[0].length;
    const fused = new Array(dim).fill(0);
    let totalWeight = 0;

    for (let i = 0; i < n; i++) {
      const wi = w[i] || 0;
      totalWeight += wi;
      const normed = normalize(vectors[i]);
      for (let j = 0; j < dim; j++) {
        fused[j] += normed[j] * wi;
      }
    }

    if (totalWeight > EPSILON) {
      for (let j = 0; j < dim; j++) fused[j] /= totalWeight;
    }

    const normFused = normalize(fused);

    // Coherence: mean similarity to fused
    const coherence = vectors.reduce(
      (s, v) => s + Math.max(0, cosineSimilarity(normalize(v), normFused)),
      0
    ) / n;

    return { fused: normFused, coherence, weights: w };
  }

  // ── Continuous Logic Layer ────────────────────────────────────────────────

  /**
   * Dispatch continuous logic operations.
   * @param {number} a ∈ [0,1]
   * @param {number} b ∈ [0,1]
   * @param {'and'|'or'|'not'|'implies'|'xor'|'equivalent'} operation
   * @returns {number}
   */
  continuousLogicLayer(a, b, operation) {
    switch (operation) {
      case 'and':       return cslAnd(a, b);
      case 'or':        return cslOr(a, b);
      case 'not':       return cslNot(a);       // b ignored
      case 'implies':   return cslImplies(a, b);
      case 'xor':       return cslXor(a, b);
      case 'equivalent': return 1 - Math.abs(
        Math.max(0, Math.min(1, a)) - Math.max(0, Math.min(1, b))
      );
      default:
        throw new Error(`Unknown CSL operation: "${operation}"`);
    }
  }

  // ── Composite Gate Accessors ──────────────────────────────────────────────

  /** Resonance gate passthrough */
  resonanceGate(a, b, threshold) {
    return this._gates.resonanceGate(a, b, threshold);
  }

  /** Superposition gate passthrough */
  superpositionGate(vectors) {
    return this._gates.superpositionGate(vectors);
  }

  /** Orthogonal gate passthrough */
  orthogonalGate(a, b) {
    return this._gates.orthogonalGate(a, b);
  }

  /** Soft gate passthrough */
  softGate(value, threshold, steepness) {
    return this._gates.softGate(value, threshold, steepness);
  }

  /** Composition gate passthrough */
  compositionGate(a, b) {
    return this._gates.compositionGate(a, b);
  }

  /** Phi decision gate passthrough */
  phiDecisionGate(criteria) {
    return this._gates.phiDecisionGate(criteria);
  }

  // ── CSL Script Engine ─────────────────────────────────────────────────────

  /**
   * Enhanced CSL script interpreter.
   * Supported commands:
   *   STORE <name> <vector_json>
   *   BIND <nameA|vecJson> <nameB|vecJson> [threshold]
   *   QUERY <vector_json> [threshold] [topK]
   *   GATE <value> [threshold]
   *   AND <a> <b>
   *   OR <a> <b>
   *   NOT <a>
   *   IMPLIES <a> <b>
   *   XOR <a> <b>
   *   FUSE <vectors_json> [weights_json]
   *   DECIDE <state_json> <rules_json>
   *
   * Lines starting with # are comments.
   *
   * @param {string} script
   * @returns {Array<{line: number, command: string, result: any, ok: boolean, error?: string}>}
   */
  cslScriptEngine(script) {
    const lines = script.split('\n');
    const results = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith('#')) continue;

      const lineNum = i + 1;
      let result;
      let ok = true;
      let error;
      let command = raw.split(/\s+/)[0].toUpperCase();

      try {
        const tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*'|\[[\s\S]*?\]|\{[\s\S]*?\})+/g) || [];
        const args = tokens.slice(1);

        switch (command) {
          case 'STORE': {
            const [name, vecJson] = args;
            const vec = JSON.parse(vecJson);
            this.store(name, vec);
            result = { stored: name, dim: vec.length };
            break;
          }

          case 'BIND': {
            const [aArg, bArg, threshArg] = args;
            const a = _parseVecOrName(aArg, this._memory);
            const b = _parseVecOrName(bArg, this._memory);
            const thresh = threshArg ? parseFloat(threshArg) : PSI;
            result = this.cslBind(a, b, thresh);
            break;
          }

          case 'QUERY': {
            const [vecJson, threshArg, topKArg] = args;
            const vec = JSON.parse(vecJson);
            const thresh = threshArg ? parseFloat(threshArg) : PSI2;
            const topK = topKArg ? parseInt(topKArg, 10) : 5;
            result = this.cslQuery(vec, thresh, topK);
            break;
          }

          case 'GATE': {
            const val = parseFloat(args[0]);
            const thresh = args[1] ? parseFloat(args[1]) : PSI;
            result = {
              value: val,
              gateOutput: cslGate(val),
              zone: classifyConfidence(val),
              passed: val >= thresh,
            };
            break;
          }

          case 'AND':  result = cslAnd(parseFloat(args[0]), parseFloat(args[1]));   break;
          case 'OR':   result = cslOr(parseFloat(args[0]), parseFloat(args[1]));    break;
          case 'NOT':  result = cslNot(parseFloat(args[0]));                        break;
          case 'IMPLIES': result = cslImplies(parseFloat(args[0]), parseFloat(args[1])); break;
          case 'XOR':  result = cslXor(parseFloat(args[0]), parseFloat(args[1]));   break;

          case 'FUSE': {
            const vecs = JSON.parse(args[0]);
            const w = args[1] ? JSON.parse(args[1]) : undefined;
            result = this.cslFusionGate(vecs, w);
            break;
          }

          case 'DECIDE': {
            const state = JSON.parse(args[0]);
            const rules = JSON.parse(args[1]);
            result = this.cslDecisionGate(state, rules);
            break;
          }

          default:
            throw new Error(`Unknown command: "${command}"`);
        }
      } catch (e) {
        ok = false;
        error = e.message;
        result = null;
      }

      results.push({ line: lineNum, command, result, ok, error });
    }

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCRIPT ENGINE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function _parseVecOrName(arg, memory) {
  if (!arg) return [];
  if (arg.startsWith('[')) return JSON.parse(arg);
  return memory.get(arg) || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Classes
  VSASemanticGates,
  VSACSLBridge,

  // Constants
  PHI,
  PSI,
  PSI2,
  PHI2,
  EPSILON,

  // Vector math
  l2Norm,
  normalize,
  dotProduct,
  cosineSimilarity,

  // CSL scalars
  cslGate,
  cslAnd,
  cslOr,
  cslNot,
  cslXor,
  cslImplies,
  classifyConfidence,
  phiGeometricWeight,
};
