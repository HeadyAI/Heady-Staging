// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ CSL Engine v2.0 — Continuous Semantic Logic with HDC/VSA Operations
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// Geometric logic gates: AND, OR, NOT, IMPLY, XOR, CONSENSUS, GATE
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI2, PSI3, CSL_THRESHOLDS, FIB,
  cosineSimilarity, normalize, sigmoid, cslGate, sha256,
  deterministicRandom, SEED
} from './phi-math-v2.js';

const DIMENSIONS = FIB[14] - FIB[5]; // 384 - 5 = 379... use exact 384
const DIM = 384;
const PHI_TEMPERATURE = PSI3;

// ─── CORE CSL GATES ──────────────────────────────────────────────────────────

function cslAND(a, b) {
  return cosineSimilarity(a, b);
}

function cslOR(a, b) {
  const sum = a.map((v, i) => v + b[i]);
  return normalize(sum);
}

function cslNOT(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const bMag = b.reduce((s, v) => s + v * v, 0);
  const proj = bMag === 0 ? b : b.map(v => v * (dot / bMag));
  return normalize(a.map((v, i) => v - proj[i]));
}

function cslIMPLY(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const bMag = b.reduce((s, v) => s + v * v, 0);
  return bMag === 0 ? b : b.map(v => v * (dot / bMag));
}

function cslXOR(a, b) {
  const orVec = cslOR(a, b);
  const mutual = cslIMPLY(a, b);
  return normalize(orVec.map((v, i) => v - mutual[i]));
}

function cslCONSENSUS(vectors, weights = null) {
  const n = vectors.length;
  const w = weights || vectors.map(() => 1 / n);
  const dim = vectors[0].length;
  const sum = new Float64Array(dim);
  for (let i = 0; i < n; i++) {
    for (let d = 0; d < dim; d++) {
      sum[d] += w[i] * vectors[i][d];
    }
  }
  return normalize(Array.from(sum));
}

function cslGATE(value, gateVec, inputVec, tau = CSL_THRESHOLDS.MEDIUM, temp = PHI_TEMPERATURE) {
  const cos = cosineSimilarity(inputVec, gateVec);
  return value * sigmoid((cos - tau) / temp);
}

function phiGATE(input, gateVec, level = 2) {
  const tau = 1 - Math.pow(PSI, level) * PSI;
  return cslGATE(1.0, gateVec, input, tau, PHI_TEMPERATURE);
}

function adaptiveGATE(input, gateVec, entropy, maxEntropy) {
  const ratio = entropy / maxEntropy;
  const temp = PHI_TEMPERATURE * (1 + ratio * PHI);
  return cslGATE(1.0, gateVec, input, CSL_THRESHOLDS.MEDIUM, temp);
}

// ─── HDC / VSA OPERATIONS ───────────────────────────────────────────────────

function hdcBind(a, b) {
  return a.map((v, i) => v * b[i]);
}

function hdcBundle(vectors) {
  const dim = vectors[0].length;
  const sum = new Float64Array(dim);
  for (const v of vectors) {
    for (let d = 0; d < dim; d++) sum[d] += v[d];
  }
  return normalize(Array.from(sum));
}

function hdcPermute(a, n = 1) {
  const result = [...a];
  for (let k = 0; k < n; k++) {
    const last = result.pop();
    result.unshift(last);
  }
  return result;
}

function generateRandomVector(dim = DIM, seed = SEED) {
  const rng = deterministicRandom(seed);
  const v = Array.from({ length: dim }, () => rng() * 2 - 1);
  return normalize(v);
}

// ─── TERNARY LOGIC ──────────────────────────────────────────────────────────

const TERNARY = Object.freeze({
  TRUE: 1,
  UNKNOWN: 0,
  FALSE: -1,
});

function toTernary(cosScore, threshold = CSL_THRESHOLDS.MINIMUM) {
  if (cosScore >= threshold) return TERNARY.TRUE;
  if (cosScore <= -threshold) return TERNARY.FALSE;
  return TERNARY.UNKNOWN;
}

function kleeneAND(a, b) { return Math.min(a, b); }
function kleeneOR(a, b) { return Math.max(a, b); }
function kleeneNOT(a) { return -a; }
function lukasiewiczAND(a, b) { return Math.max(-1, a + b - 1); }
function lukasiewiczOR(a, b) { return Math.min(1, a + b + 1); }

// ─── MOE CSL ROUTER ─────────────────────────────────────────────────────────

class MoECSLRouter {
  #expertGates;
  #temperature;
  #topK;
  #antiCollapseWeight;

  constructor(numExperts, dim = DIM) {
    this.#temperature = PHI_TEMPERATURE;
    this.#topK = FIB[3]; // 2
    this.#antiCollapseWeight = Math.pow(PSI, 8);
    this.#expertGates = Array.from({ length: numExperts }, (_, i) =>
      generateRandomVector(dim, SEED + i + 1)
    );
  }

  route(inputVec) {
    const scores = this.#expertGates.map(gate => cosineSimilarity(inputVec, gate));
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp((s - maxScore) / this.#temperature));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probs = expScores.map(e => e / sumExp);
    const indexed = probs.map((p, i) => ({ index: i, prob: p }));
    indexed.sort((a, b) => b.prob - a.prob);
    const selected = indexed.slice(0, this.#topK);
    const selectedSum = selected.reduce((a, s) => a + s.prob, 0);
    return selected.map(s => ({ expertIndex: s.index, weight: s.prob / selectedSum }));
  }

  detectCollapse() {
    const dim = this.#expertGates[0].length;
    let minDist = Infinity;
    for (let i = 0; i < this.#expertGates.length; i++) {
      for (let j = i + 1; j < this.#expertGates.length; j++) {
        const cos = cosineSimilarity(this.#expertGates[i], this.#expertGates[j]);
        if (1 - cos < minDist) minDist = 1 - cos;
      }
    }
    return minDist < Math.pow(PSI, 9);
  }

  getExpertCount() { return this.#expertGates.length; }
  getTopK() { return this.#topK; }
  getTemperature() { return this.#temperature; }
}

// ─── EMBEDDINGS UTILITY ─────────────────────────────────────────────────────

function textToEmbedding(text, dim = DIM) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return generateRandomVector(dim, Math.abs(hash));
}

async function hashEmbedding(embedding) {
  return sha256(embedding.join(','));
}

export {
  DIM, PHI_TEMPERATURE,
  cslAND, cslOR, cslNOT, cslIMPLY, cslXOR, cslCONSENSUS, cslGATE,
  phiGATE, adaptiveGATE,
  hdcBind, hdcBundle, hdcPermute,
  generateRandomVector, textToEmbedding, hashEmbedding,
  TERNARY, toTernary,
  kleeneAND, kleeneOR, kleeneNOT, lukasiewiczAND, lukasiewiczOR,
  MoECSLRouter,
};

export default {
  DIM, PHI_TEMPERATURE,
  cslAND, cslOR, cslNOT, cslIMPLY, cslXOR, cslCONSENSUS, cslGATE,
  phiGATE, adaptiveGATE,
  hdcBind, hdcBundle, hdcPermute,
  generateRandomVector, textToEmbedding, hashEmbedding,
  TERNARY, toTernary,
  kleeneAND, kleeneOR, kleeneNOT, lukasiewiczAND, lukasiewiczOR,
  MoECSLRouter,
};
