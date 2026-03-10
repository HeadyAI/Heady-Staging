/**
 * HDC/VSA Operations — Hyperdimensional Computing & Vector Symbolic Architecture
 * 
 * Three vector families: Binary BSC, Bipolar MAP, Real HRR
 * Core operations: BIND, BUNDLE, PERMUTE, ENCODE/DECODE
 * Used for compositional reasoning, sequence encoding, and symbolic AI.
 * 
 * Capacity: ~96 items at D=384 (analytical estimate)
 * 
 * @module core/vector-ops/hdc-operations
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** Default dimensionality */
const DEFAULT_DIM = 384;

/**
 * Random vector generators for each family
 */
const randomBinary = (dim = DEFAULT_DIM) => {
  const v = new Uint8Array(dim);
  for (let i = 0; i < dim; i++) v[i] = Math.random() < 0.5 ? 0 : 1;
  return v;
};

const randomBipolar = (dim = DEFAULT_DIM) => {
  const v = new Float64Array(dim);
  for (let i = 0; i < dim; i++) v[i] = Math.random() < 0.5 ? -1 : 1;
  return v;
};

const randomReal = (dim = DEFAULT_DIM) => {
  const v = new Float64Array(dim);
  for (let i = 0; i < dim; i++) v[i] = (Math.random() - PSI) * PHI;
  return v;
};

/**
 * Normalization
 */
const normalize = (v) => {
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  const result = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] / mag;
  return result;
};

/**
 * Cosine similarity
 */
const cosine = (a, b) => {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

// ============================================================
// BINARY BSC (Binary Spatter Codes)
// ============================================================

export const BinaryBSC = {
  /** Generate random binary hypervector */
  random: randomBinary,

  /** BIND: XOR binding — creates compositional representations */
  bind(a, b) {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) result[i] = a[i] ^ b[i];
    return result;
  },

  /** BUNDLE: Majority rule — aggregates multiple vectors */
  bundle(vectors) {
    if (vectors.length === 0) return new Uint8Array(0);
    const dim = vectors[0].length;
    const counts = new Float64Array(dim);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) counts[i] += v[i];
    }
    const threshold = vectors.length / 2;
    const result = new Uint8Array(dim);
    for (let i = 0; i < dim; i++) {
      result[i] = counts[i] > threshold ? 1 : (counts[i] === threshold ? (Math.random() < 0.5 ? 1 : 0) : 0);
    }
    return result;
  },

  /** PERMUTE: Cyclic shift — sequence encoding */
  permute(v, n = 1) {
    const dim = v.length;
    const shift = ((n % dim) + dim) % dim;
    const result = new Uint8Array(dim);
    for (let i = 0; i < dim; i++) result[i] = v[(i - shift + dim) % dim];
    return result;
  },

  /** Hamming distance (normalized to [0,1]) */
  distance(a, b) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += a[i] !== b[i] ? 1 : 0;
    return diff / a.length;
  },

  /** Similarity: 1 - normalized Hamming distance */
  similarity(a, b) {
    return 1 - this.distance(a, b);
  },
};

// ============================================================
// BIPOLAR MAP (Multiply-Add-Permute)
// ============================================================

export const BipolarMAP = {
  /** Generate random bipolar hypervector {-1, +1}^D */
  random: randomBipolar,

  /** BIND: Element-wise multiply — creates compositional representations */
  bind(a, b) {
    const result = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) result[i] = a[i] * b[i];
    return result;
  },

  /** BUNDLE: Element-wise add + sign threshold */
  bundle(vectors) {
    if (vectors.length === 0) return new Float64Array(0);
    const dim = vectors[0].length;
    const sum = new Float64Array(dim);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) sum[i] += v[i];
    }
    const result = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      result[i] = sum[i] >= 0 ? 1 : -1;
    }
    return result;
  },

  /** PERMUTE: Cyclic shift */
  permute(v, n = 1) {
    const dim = v.length;
    const shift = ((n % dim) + dim) % dim;
    const result = new Float64Array(dim);
    for (let i = 0; i < dim; i++) result[i] = v[(i - shift + dim) % dim];
    return result;
  },

  /** Cosine similarity */
  similarity(a, b) {
    return cosine(a, b);
  },
};

// ============================================================
// REAL HRR (Holographic Reduced Representations)
// ============================================================

/**
 * Simple circular convolution via FFT-like approach
 * For exact FFT, use a proper library; this is a direct O(n²) implementation
 * suitable for D=384 dimensions.
 */
const circularConvolution = (a, b) => {
  const n = a.length;
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i] += a[j] * b[(i - j + n) % n];
    }
  }
  return result;
};

/** Circular correlation (inverse convolution for unbinding) */
const circularCorrelation = (a, b) => {
  const n = a.length;
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i] += a[j] * b[(i + j) % n];
    }
  }
  return result;
};

export const RealHRR = {
  /** Generate random real-valued hypervector */
  random: randomReal,

  /** BIND: Circular convolution */
  bind(a, b) {
    return normalize(circularConvolution(a, b));
  },

  /** UNBIND: Circular correlation (approximate inverse) */
  unbind(a, b) {
    return normalize(circularCorrelation(a, b));
  },

  /** BUNDLE: Normalized superposition */
  bundle(vectors) {
    if (vectors.length === 0) return new Float64Array(0);
    const dim = vectors[0].length;
    const sum = new Float64Array(dim);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) sum[i] += v[i];
    }
    return normalize(sum);
  },

  /** PERMUTE: Cyclic shift */
  permute(v, n = 1) {
    const dim = v.length;
    const shift = ((n % dim) + dim) % dim;
    const result = new Float64Array(dim);
    for (let i = 0; i < dim; i++) result[i] = v[(i - shift + dim) % dim];
    return result;
  },

  /** Cosine similarity */
  similarity(a, b) {
    return cosine(a, b);
  },
};

// ============================================================
// Codebook — Encode/Decode symbols to/from hypervectors
// ============================================================

export class HDCCodebook {
  constructor(family = 'bipolar', dim = DEFAULT_DIM) {
    this.family = family;
    this.dim = dim;
    this.codebook = new Map();
    this.maxEntries = Math.round(PSI2 * dim); // ≈ 0.382 × D capacity estimate

    const generators = {
      binary: randomBinary,
      bipolar: randomBipolar,
      real: randomReal,
    };
    this._generator = generators[family] || randomBipolar;
  }

  /** Encode a symbol — returns its hypervector, creating if new */
  encode(symbol) {
    if (this.codebook.has(symbol)) {
      return this.codebook.get(symbol);
    }

    if (this.codebook.size >= this.maxEntries) {
      throw new Error(`Codebook capacity exceeded: ${this.maxEntries}`);
    }

    const hv = this._generator(this.dim);
    this.codebook.set(symbol, hv);
    return hv;
  }

  /** Decode: find the nearest symbol in the codebook */
  decode(vector) {
    let bestSymbol = null;
    let bestSim = -Infinity;

    for (const [symbol, hv] of this.codebook) {
      const sim = cosine(vector, hv);
      if (sim > bestSim) {
        bestSim = sim;
        bestSymbol = symbol;
      }
    }

    return { symbol: bestSymbol, similarity: bestSim };
  }

  /** Encode a sequence using permutation binding */
  encodeSequence(symbols) {
    const ops = this._getOps();
    let result = ops.random(this.dim);
    // Zero out
    if (result instanceof Float64Array) result.fill(0);
    else for (let i = 0; i < result.length; i++) result[i] = 0;

    for (let i = 0; i < symbols.length; i++) {
      const hv = this.encode(symbols[i]);
      const shifted = ops.permute(hv, i);
      // Accumulate
      if (result instanceof Float64Array) {
        for (let j = 0; j < this.dim; j++) result[j] += shifted[j];
      } else {
        for (let j = 0; j < this.dim; j++) result[j] += shifted[j];
      }
    }

    return this.family === 'real' ? normalize(result) : result;
  }

  /** Get number of encoded symbols */
  get size() {
    return this.codebook.size;
  }

  /** Get capacity */
  get capacity() {
    return this.maxEntries;
  }

  _getOps() {
    switch (this.family) {
      case 'binary': return BinaryBSC;
      case 'bipolar': return BipolarMAP;
      case 'real': return RealHRR;
      default: return BipolarMAP;
    }
  }
}

export { normalize, cosine, DEFAULT_DIM };
