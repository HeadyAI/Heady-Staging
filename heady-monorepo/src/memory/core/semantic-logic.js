/**
 * CSL — Heady™ Cognitive Semantic Logic
 * Core vector math operations used by vector-memory and hybrid-search.
 * All operations work on plain JS arrays or Float32/Float64Arrays.
 */
'use strict';

/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1], where 1 = identical direction.
 */
function cosine_similarity(a, b) {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom < 1e-10 ? 0 : dot / denom;
}

/**
 * Resonance gate — returns true if cosine similarity >= threshold.
 */
function resonance_gate(vec_a, vec_b, threshold = 0.95) {
    const similarity = cosine_similarity(vec_a, vec_b);
    return {
        similarity,
        resonant: similarity >= threshold,
        threshold,
    };
}

/**
 * Superposition gate — element-wise average of two vectors (50/50 blend).
 */
function superposition_gate(vec_a, vec_b) {
    const len = Math.min(vec_a.length, vec_b.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
        result[i] = (vec_a[i] + vec_b[i]) / 2;
    }
    return result;
}

/**
 * Weighted superposition — blend two vectors with a custom weight [0,1].
 * weight=0 → pure vec_a, weight=1 → pure vec_b.
 */
function weighted_superposition(vec_a, vec_b, weight = 0.5) {
    const w = Math.max(0, Math.min(1, weight));
    const len = Math.min(vec_a.length, vec_b.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
        result[i] = vec_a[i] * (1 - w) + vec_b[i] * w;
    }
    return result;
}

/**
 * Orthogonal gate — remove the component of target that aligns with reject vector.
 * Gram-Schmidt orthogonalization.
 */
function orthogonal_gate(target, reject) {
    const sim = cosine_similarity(target, reject);
    const len = Math.min(target.length, reject.length);
    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
        result[i] = target[i] - sim * reject[i];
    }
    return result;
}

/**
 * Batch orthogonalization — remove influence of multiple reject vectors.
 */
function batch_orthogonal(target, rejectVectors) {
    let result = Float64Array.from(target);
    for (const rv of rejectVectors) {
        result = orthogonal_gate(result, rv);
    }
    return result;
}

/**
 * Euclidean distance between two vectors.
 */
function euclidean_distance(a, b) {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length.
 */
function normalize(vec) {
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm < 1e-10) return Float64Array.from(vec);
    return Float64Array.from(vec.map(v => v / norm));
}

/**
 * Centroid of a set of vectors.
 */
function centroid(vectors) {
    if (!vectors || vectors.length === 0) return null;
    const dim = vectors[0].length;
    const sum = new Float64Array(dim);
    for (const v of vectors) {
        for (let i = 0; i < Math.min(dim, v.length); i++) {
            sum[i] += v[i];
        }
    }
    return sum.map(v => v / vectors.length);
}

module.exports = {
    cosine_similarity,
    resonance_gate,
    superposition_gate,
    weighted_superposition,
    orthogonal_gate,
    batch_orthogonal,
    euclidean_distance,
    normalize,
    centroid,
};
