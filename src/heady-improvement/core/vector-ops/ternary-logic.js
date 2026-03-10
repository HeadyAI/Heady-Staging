/**
 * Ternary Logic — Continuous Three-Valued Logic in Vector Space
 * 
 * Maps logical truth values to cosine similarity:
 *   TRUE  → cos ≈ +1 (aligned)
 *   UNKNOWN → cos ≈ 0 (orthogonal)
 *   FALSE → cos ≈ -1 (antipodal)
 * 
 * Five logic modes: Kleene K3, Łukasiewicz, Gödel, Product, CSL-continuous
 * All thresholds use φ-scaled constants.
 * 
 * @module core/vector-ops/ternary-logic
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** Ternary truth values mapped to continuous range [-1, +1] */
const TRUTH = {
  TRUE: 1.0,
  UNKNOWN: 0.0,
  FALSE: -1.0,
};

/** 
 * Discretization threshold: cos > τ → TRUE, cos < -τ → FALSE, else UNKNOWN
 * Using ψ² ≈ 0.382 as the boundary (φ-derived)
 */
const TRUTH_THRESHOLD = PSI2;

/** Discretize continuous value to ternary */
const discretize = (value) => {
  if (value > TRUTH_THRESHOLD) return TRUTH.TRUE;
  if (value < -TRUTH_THRESHOLD) return TRUTH.FALSE;
  return TRUTH.UNKNOWN;
};

/** Label a discretized value */
const label = (value) => {
  if (value > TRUTH_THRESHOLD) return 'TRUE';
  if (value < -TRUTH_THRESHOLD) return 'FALSE';
  return 'UNKNOWN';
};

// ============================================================
// KLEENE K3 (Strong Kleene Logic)
// ============================================================

export const KleeneK3 = {
  name: 'Kleene K3',

  /** AND: min(a, b) */
  and(a, b) {
    return Math.min(a, b);
  },

  /** OR: max(a, b) */
  or(a, b) {
    return Math.max(a, b);
  },

  /** NOT: -a */
  not(a) {
    return -a;
  },

  /** IMPLY: max(-a, b) */
  imply(a, b) {
    return Math.max(-a, b);
  },

  /** Designated value: TRUE only */
  isDesignated(a) {
    return a > TRUTH_THRESHOLD;
  },
};

// ============================================================
// ŁUKASIEWICZ (Bounded Sum Logic)
// ============================================================

export const Lukasiewicz = {
  name: 'Łukasiewicz',

  /** AND: max(a + b - 1, -1) — bounded conjunction */
  and(a, b) {
    return Math.max(a + b - 1, -1);
  },

  /** OR: min(a + b + 1, 1) — bounded disjunction */
  or(a, b) {
    return Math.min(a + b + 1, 1);
  },

  /** NOT: -a */
  not(a) {
    return -a;
  },

  /** IMPLY: min(1, 1 - a + b) → mapped to [-1,1]: min(1, -a + b + 1) */
  imply(a, b) {
    return Math.min(1, -a + b + 1);
  },

  /** Designated value: TRUE only */
  isDesignated(a) {
    return a > TRUTH_THRESHOLD;
  },
};

// ============================================================
// GÖDEL (Min/Max Logic)
// ============================================================

export const Godel = {
  name: 'Gödel',

  /** AND: min(a, b) */
  and(a, b) {
    return Math.min(a, b);
  },

  /** OR: max(a, b) */
  or(a, b) {
    return Math.max(a, b);
  },

  /** NOT: 1 if a = -1, else -1 (crisp negation in [-1,1]) */
  not(a) {
    return a <= -1 + 1e-10 ? 1 : -1;
  },

  /** IMPLY: b if a > b, else 1 */
  imply(a, b) {
    return a > b ? b : 1;
  },

  isDesignated(a) {
    return a > TRUTH_THRESHOLD;
  },
};

// ============================================================
// PRODUCT (Probabilistic Logic)
// ============================================================

export const ProductLogic = {
  name: 'Product',

  /** AND: (a+1)/2 * (b+1)/2 mapped back to [-1,1] */
  and(a, b) {
    const pa = (a + 1) / 2;
    const pb = (b + 1) / 2;
    return pa * pb * 2 - 1;
  },

  /** OR: pa + pb - pa*pb mapped back to [-1,1] */
  or(a, b) {
    const pa = (a + 1) / 2;
    const pb = (b + 1) / 2;
    return (pa + pb - pa * pb) * 2 - 1;
  },

  /** NOT: 1 - (a+1)/2 mapped back */
  not(a) {
    return -a;
  },

  /** IMPLY: min(1, pb/pa) mapped */
  imply(a, b) {
    const pa = (a + 1) / 2;
    const pb = (b + 1) / 2;
    if (pa < 1e-10) return 1;
    return Math.min(1, pb / pa) * 2 - 1;
  },

  isDesignated(a) {
    return a > TRUTH_THRESHOLD;
  },
};

// ============================================================
// CSL-CONTINUOUS (Heady's native Continuous Semantic Logic)
// ============================================================

/** CSL sigmoid gate */
const sigmoid = (x, tau, temp) => 1 / (1 + Math.exp(-(x - tau) / temp));

export const CSLContinuous = {
  name: 'CSL-Continuous',

  /** AND: cosine similarity (semantic alignment) — here as smooth min */
  and(a, b) {
    // Smooth minimum using sigmoid weighting
    const temp = PSI * PSI * PSI; // ≈ 0.236
    const w = sigmoid(a - b, 0, temp);
    return b * w + a * (1 - w);
  },

  /** OR: smooth maximum via superposition */
  or(a, b) {
    const temp = PSI * PSI * PSI;
    const w = sigmoid(a - b, 0, temp);
    return a * w + b * (1 - w);
  },

  /** NOT: smooth negation — orthogonal projection principle */
  not(a) {
    // In vector space: NOT removes the component. In scalar [-1,1]: negate with smoothing
    return -a;
  },

  /** IMPLY: CSL projection gate */
  imply(a, b) {
    // a → b: if a is true, b must be true. Smooth version.
    return this.or(this.not(a), b);
  },

  /** XOR: exclusive-or via CSL */
  xor(a, b) {
    return this.and(this.or(a, b), this.not(this.and(a, b)));
  },

  /** CONSENSUS: weighted average for multi-agent agreement */
  consensus(values, weights) {
    if (values.length === 0) return TRUTH.UNKNOWN;
    const w = weights || values.map(() => 1 / values.length);
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i] * (w[i] || 0);
    return Math.max(-1, Math.min(1, sum));
  },

  /** GATE: sigmoid gating — smooth threshold */
  gate(value, gateSignal, tau = PSI2, temp = PSI * PSI * PSI) {
    return value * sigmoid(gateSignal, tau, temp);
  },

  isDesignated(a) {
    return a > TRUTH_THRESHOLD;
  },
};

// ============================================================
// Unified Ternary Logic Interface
// ============================================================

const MODES = {
  kleene: KleeneK3,
  lukasiewicz: Lukasiewicz,
  godel: Godel,
  product: ProductLogic,
  csl: CSLContinuous,
};

export class TernaryLogic {
  constructor(mode = 'csl') {
    this.mode = mode;
    this.engine = MODES[mode];
    if (!this.engine) throw new Error(`Unknown ternary logic mode: ${mode}`);
  }

  and(a, b) { return this.engine.and(a, b); }
  or(a, b) { return this.engine.or(a, b); }
  not(a) { return this.engine.not(a); }
  imply(a, b) { return this.engine.imply(a, b); }

  /** XOR: available on all modes via composition */
  xor(a, b) {
    if (this.engine.xor) return this.engine.xor(a, b);
    return this.and(this.or(a, b), this.not(this.and(a, b)));
  }

  /** Consensus (multi-agent) — delegates to CSL or falls back to average */
  consensus(values, weights) {
    if (this.engine.consensus) return this.engine.consensus(values, weights);
    if (values.length === 0) return TRUTH.UNKNOWN;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  /** Gate (threshold control) */
  gate(value, gateSignal, tau, temp) {
    if (this.engine.gate) return this.engine.gate(value, gateSignal, tau, temp);
    return this.and(value, gateSignal);
  }

  /** Check if a value is designated (considered "true enough") */
  isDesignated(a) { return this.engine.isDesignated(a); }

  /** Discretize to ternary */
  discretize(a) { return discretize(a); }

  /** Get human-readable label */
  label(a) { return label(a); }

  /** Get the current mode name */
  get modeName() { return this.engine.name; }

  /** Switch logic mode */
  setMode(mode) {
    this.mode = mode;
    this.engine = MODES[mode];
    if (!this.engine) throw new Error(`Unknown ternary logic mode: ${mode}`);
  }

  /** List available modes */
  static get modes() {
    return Object.keys(MODES);
  }

  /** Get truth constants */
  static get TRUTH() {
    return TRUTH;
  }
}

export { TRUTH, TRUTH_THRESHOLD, discretize, label, MODES };
