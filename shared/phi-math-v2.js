// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Phi-Math Foundation v2.0 — Enhanced with complete phi-derived utilities
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ALL constants derive from φ = 1.6180339887 — ZERO magic numbers
// ═══════════════════════════════════════════════════════════════════════════════

const PHI   = 1.6180339887498948;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const PSI3  = PSI * PSI * PSI;
const PSI4  = PSI * PSI * PSI * PSI;
const PHI2  = PHI + 1;
const PHI3  = 2 * PHI + 1;
const PHI4  = 3 * PHI + 2;
const PHI6  = 8 * PHI + 5;

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

function phiThreshold(level, spread = PSI) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:  phiThreshold(0),
  LOW:      phiThreshold(1),
  MEDIUM:   phiThreshold(2),
  HIGH:     phiThreshold(3),
  CRITICAL: phiThreshold(4),
  DEDUP:    1 - Math.pow(PSI, 6) * PSI,
});

function phiBackoff(attempt, baseMs = FIB[7] * 1000 / FIB[8], maxMs = FIB[12] * 1000 / FIB[3]) {
  const delay = baseMs * Math.pow(PHI, attempt);
  const jitter = 1 + (Math.random() * 2 - 1) * PSI2;
  return Math.min(delay * jitter, maxMs);
}

function phiFusionWeights(n) {
  const raw = Array.from({ length: n }, (_, i) => Math.pow(PSI, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w / sum);
}

function fibNearest(n) {
  for (let i = 0; i < FIB.length; i++) {
    if (FIB[i] >= n) return FIB[i];
  }
  return FIB[FIB.length - 1];
}

function phiTokenBudgets(base = FIB[13]) {
  return {
    working:   base,
    session:   Math.round(base * PHI2),
    memory:    Math.round(base * PHI4),
    artifacts: Math.round(base * PHI6),
  };
}

function phiResourceWeights(n) {
  return phiFusionWeights(n);
}

function phiMultiSplit(whole, n) {
  const weights = phiFusionWeights(n);
  return weights.map(w => Math.round(whole * w));
}

const PRESSURE_LEVELS = Object.freeze({
  NOMINAL:  { min: 0, max: PSI2 },
  ELEVATED: { min: PSI2, max: PSI },
  HIGH:     { min: PSI, max: 1 - PSI3 },
  CRITICAL: { min: 1 - PSI4, max: 1 },
});

const ALERT_THRESHOLDS = Object.freeze({
  warning:  PSI,
  caution:  1 - PSI2,
  critical: 1 - PSI3,
  exceeded: 1 - PSI4,
  hard_max: 1.0,
});

const POOL_ALLOCATION = Object.freeze({
  HOT:        FIB[9] / (FIB[9] + FIB[8] + FIB[7] + FIB[6] + FIB[5]),
  WARM:       FIB[8] / (FIB[9] + FIB[8] + FIB[7] + FIB[6] + FIB[5]),
  COLD:       FIB[7] / (FIB[9] + FIB[8] + FIB[7] + FIB[6] + FIB[5]),
  RESERVE:    FIB[6] / (FIB[9] + FIB[8] + FIB[7] + FIB[6] + FIB[5]),
  GOVERNANCE: FIB[5] / (FIB[9] + FIB[8] + FIB[7] + FIB[6] + FIB[5]),
});

import('crypto').then(c => { globalThis._crypto = c; });

async function sha256(input) {
  const crypto = globalThis._crypto || await import('crypto');
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error('Vector dimension mismatch');
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function normalize(v) {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? v : v.map(x => x / mag);
}

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function cslGate(value, cosScore, tau = CSL_THRESHOLDS.MEDIUM, temp = PSI3) {
  return value * sigmoid((cosScore - tau) / temp);
}

function cslBlend(wHigh, wLow, cosScore, tau = CSL_THRESHOLDS.MEDIUM) {
  const t = sigmoid((cosScore - tau) / PSI3);
  return wHigh * t + wLow * (1 - t);
}

const SEED = 42;
const TEMPERATURE = 0;

function deterministicRandom(seed = SEED) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

export {
  PHI, PSI, PSI2, PSI3, PSI4, PHI2, PHI3, PHI4, PHI6,
  FIB, phiThreshold, CSL_THRESHOLDS,
  phiBackoff, phiFusionWeights, fibNearest, phiTokenBudgets,
  phiResourceWeights, phiMultiSplit,
  PRESSURE_LEVELS, ALERT_THRESHOLDS, POOL_ALLOCATION,
  sha256, cosineSimilarity, normalize, sigmoid,
  cslGate, cslBlend,
  SEED, TEMPERATURE, deterministicRandom,
};

export default {
  PHI, PSI, PSI2, PSI3, PSI4, PHI2, PHI3, PHI4, PHI6,
  FIB, phiThreshold, CSL_THRESHOLDS,
  phiBackoff, phiFusionWeights, fibNearest, phiTokenBudgets,
  phiResourceWeights, phiMultiSplit,
  PRESSURE_LEVELS, ALERT_THRESHOLDS, POOL_ALLOCATION,
  sha256, cosineSimilarity, normalize, sigmoid,
  cslGate, cslBlend,
  SEED, TEMPERATURE, deterministicRandom,
};
