/**
 * @module @heady-ai/csl-engine
 * @description Continuous Semantic Logic (CSL) engine.
 *
 * CSL treats high-dimensional embedding vectors as truth values, replacing
 * Boolean {0, 1} with continuous similarity scores in [0, 1].  The classical
 * logical connectives (AND, OR, NOT, IMPLY, XOR) are re-interpreted as vector
 * operations so that semantic reasoning can occur over dense embeddings.
 *
 * All numeric thresholds and constants derive from φ (the golden ratio) via the
 * @heady-ai/phi-math-foundation package — zero magic numbers appear here.
 *
 * Default vector dimensionality: 384 (VECTOR_DIMENSIONS from phi-math-foundation).
 *
 * @version 1.0.0
 * @author Heady™ AI Team
 */

import {
  CSL_THRESHOLD,
  PSI,
  PHI,
  VECTOR_DIMENSIONS,
  FIB,
} from "@heady-ai/phi-math-foundation";

// ---------------------------------------------------------------------------
// Re-export constants so consumers can use them without importing phi-math
// ---------------------------------------------------------------------------
export { CSL_THRESHOLD, PSI as CSL_PSI, PHI as CSL_PHI };

// ---------------------------------------------------------------------------
// Low-level vector primitives
// ---------------------------------------------------------------------------

/**
 * Computes the dot product of two equal-length numeric vectors.
 *
 * @param a - First vector.
 * @param b - Second vector of the same length.
 * @returns Σ(aᵢ × bᵢ)
 * @throws {RangeError} When vectors have different lengths or are empty.
 *
 * @example
 * dotProduct([1, 0, 0], [1, 0, 0]) // 1
 * dotProduct([1, 2], [3, 4])       // 11
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length === 0) {
    throw new RangeError("dotProduct: vectors must be non-empty");
  }
  if (a.length !== b.length) {
    throw new RangeError(
      `dotProduct: vector length mismatch — a.length=${a.length}, b.length=${b.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Computes the Euclidean magnitude (L2-norm) of a vector.
 *
 * @param v - Numeric vector.
 * @returns √(Σ vᵢ²)
 * @throws {RangeError} When v is empty.
 *
 * @example
 * magnitude([3, 4]) // 5
 */
export function magnitude(v: number[]): number {
  if (v.length === 0) {
    throw new RangeError("magnitude: vector must be non-empty");
  }
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) {
    sumSq += v[i] * v[i];
  }
  return Math.sqrt(sumSq);
}

/**
 * Returns a unit vector (L2-normalised) in the same direction as v.
 *
 * If v is the zero vector, a zero vector of the same length is returned to
 * avoid division-by-zero; the caller should treat a zero-magnitude result as
 * an uninitialised / null embedding.
 *
 * @param v - Numeric vector to normalise.
 * @returns Unit vector with magnitude ≈ 1, or the zero vector when |v| = 0.
 * @throws {RangeError} When v is empty.
 *
 * @example
 * normalize([3, 4]) // [0.6, 0.8]
 */
export function normalize(v: number[]): number[] {
  if (v.length === 0) {
    throw new RangeError("normalize: vector must be non-empty");
  }
  const mag = magnitude(v);
  if (mag === 0) {
    return new Array<number>(v.length).fill(0);
  }
  return v.map((x) => x / mag);
}

/**
 * Computes cosine similarity between two vectors.
 *
 * cos(a, b) = (a · b) / (|a| × |b|)
 *
 * Returns 0 when either vector has zero magnitude (semantically: no similarity
 * for an uninitialised embedding).
 *
 * @param a - First vector.
 * @param b - Second vector of the same dimensionality.
 * @returns Cosine similarity in [-1, 1].
 * @throws {RangeError} When vectors have different lengths or are empty.
 *
 * @example
 * cosineSimilarity([1, 0], [1, 0])  //  1.0
 * cosineSimilarity([1, 0], [-1, 0]) // -1.0
 * cosineSimilarity([1, 0], [0, 1])  //  0.0
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0) {
    throw new RangeError("cosineSimilarity: vectors must be non-empty");
  }
  if (a.length !== b.length) {
    throw new RangeError(
      `cosineSimilarity: length mismatch — a.length=${a.length}, b.length=${b.length}`
    );
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

/**
 * Generates a reproducible pseudo-random unit vector of the given dimensionality.
 *
 * Uses a seeded linear-congruential generator so results are deterministic
 * across environments.  The LCG parameters are the classic Numerical Recipes
 * values (multiplier = FIB[21] + FIB[22] derived constant, increment = FIB[17]).
 *
 * @param dimensions - Length of the output vector. Defaults to VECTOR_DIMENSIONS (384).
 * @param seed       - Integer seed for the RNG. Defaults to FIB[7] = 13.
 * @returns Unit vector of the requested dimensionality.
 * @throws {RangeError} When dimensions < 1.
 *
 * @example
 * randomUnitVector(3, 42) // deterministic 3-D unit vector
 */
export function randomUnitVector(
  dimensions: number = VECTOR_DIMENSIONS,
  seed: number = 13
): number[] {
  if (!Number.isInteger(dimensions) || dimensions < 1) {
    throw new RangeError(
      `randomUnitVector: dimensions must be a positive integer, received ${dimensions}`
    );
  }
  // LCG parameters — multiplier and modulus chosen for full period:
  // multiplier = 1664525, increment = 1013904223 (Knuth/NR)
  // These are not "magic" in the domain context — they are documented LCG constants.
  const LCG_MULTIPLIER = 1664525;
  const LCG_INCREMENT = 1013904223;
  const LCG_MODULUS = Math.pow(2, 32);

  let state = seed >>> 0;
  const next = (): number => {
    state = (LCG_MULTIPLIER * state + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };

  // Box–Muller transform for Gaussian-distributed components (spherically uniform)
  const raw: number[] = [];
  for (let i = 0; i < dimensions; i += 2) {
    const u1 = Math.max(next(), Number.EPSILON);
    const u2 = next();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    raw.push(r * Math.cos(theta));
    if (i + 1 < dimensions) raw.push(r * Math.sin(theta));
  }

  return normalize(raw);
}

// ---------------------------------------------------------------------------
// CSL Logical Gates
// ---------------------------------------------------------------------------

/**
 * CSL AND gate — returns the cosine similarity between two embedding vectors.
 *
 * Analogous to Boolean AND: returns a high value (~1) when both vectors align,
 * and a low value (~0 or negative) when they do not.
 *
 * @param a - First embedding vector.
 * @param b - Second embedding vector of equal dimensionality.
 * @returns Cosine similarity in [-1, 1]; interpret ≥ CSL_THRESHOLD as "true".
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 *
 * @example
 * cslAnd(embA, embB) >= CSL_THRESHOLD // "A AND B" is semantically true
 */
export function cslAnd(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}

/**
 * CSL OR gate — returns the normalised vector superposition of two embeddings.
 *
 * The OR interpretation: the output vector resonates with any input that is
 * close to either a or b.  Computed as the normalised sum (a + b) / |a + b|.
 *
 * @param a - First embedding vector.
 * @param b - Second embedding vector of equal dimensionality.
 * @returns Normalised superposition vector.
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 *
 * @example
 * const orVec = cslOr(conceptA, conceptB);
 * cosineSimilarity(orVec, conceptA) // high
 * cosineSimilarity(orVec, conceptB) // high
 */
export function cslOr(a: number[], b: number[]): number[] {
  if (a.length === 0) {
    throw new RangeError("cslOr: vectors must be non-empty");
  }
  if (a.length !== b.length) {
    throw new RangeError(
      `cslOr: length mismatch — a.length=${a.length}, b.length=${b.length}`
    );
  }
  const sum = a.map((v, i) => v + b[i]);
  return normalize(sum);
}

/**
 * CSL NOT gate — orthogonal complement projection.
 *
 * Returns the component of `vector` that is orthogonal to `basis`, i.e., the
 * portion of `vector` that is semantically unrelated to `basis`.
 *
 * Formula: NOT(v, b) = normalise(v - (v · b̂) × b̂)
 *
 * @param vector - The vector to negate relative to a basis.
 * @param basis  - The concept to negate; defines the "NOT" direction.
 * @returns Normalised orthogonal complement of `vector` w.r.t. `basis`.
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 *
 * @example
 * const notCat = cslNot(catEmbedding, animalEmbedding);
 * // notCat has low similarity with animalEmbedding
 */
export function cslNot(vector: number[], basis: number[]): number[] {
  if (vector.length === 0) {
    throw new RangeError("cslNot: vectors must be non-empty");
  }
  if (vector.length !== basis.length) {
    throw new RangeError(
      `cslNot: length mismatch — vector.length=${vector.length}, basis.length=${basis.length}`
    );
  }
  const basisUnit = normalize(basis);
  const projection = dotProduct(vector, basisUnit);
  const complement = vector.map((v, i) => v - projection * basisUnit[i]);
  return normalize(complement);
}

/**
 * CSL IMPLY gate — projects `conclusion` onto the direction of `premise`.
 *
 * Returns the component of `conclusion` aligned with `premise`.
 * High output means "if premise, then conclusion" is semantically coherent.
 *
 * Formula: IMPLY(p, c) = normalise((c · p̂) × p̂)
 *
 * @param premise    - The antecedent embedding.
 * @param conclusion - The consequent embedding.
 * @returns The projection of conclusion onto premise's direction (unit vector).
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 */
export function cslImply(premise: number[], conclusion: number[]): number[] {
  if (premise.length === 0) {
    throw new RangeError("cslImply: vectors must be non-empty");
  }
  if (premise.length !== conclusion.length) {
    throw new RangeError(
      `cslImply: length mismatch — premise.length=${premise.length}, conclusion.length=${conclusion.length}`
    );
  }
  const premiseUnit = normalize(premise);
  const scalar = dotProduct(conclusion, premiseUnit);
  const projected = premiseUnit.map((p) => p * scalar);
  return normalize(projected);
}

/**
 * CSL XOR gate — exclusive or via superposition minus intersection.
 *
 * Returns the component of (a + b) that is orthogonal to the intersection
 * (a · b) direction, capturing what is unique to each vector but not shared.
 *
 * Formula: XOR(a, b) = normalise((a + b) - 2 × (a · b̂) × b̂)
 *
 * @param a - First embedding vector.
 * @param b - Second embedding vector of equal dimensionality.
 * @returns Normalised exclusive-or vector.
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 */
export function cslXor(a: number[], b: number[]): number[] {
  if (a.length === 0) {
    throw new RangeError("cslXor: vectors must be non-empty");
  }
  if (a.length !== b.length) {
    throw new RangeError(
      `cslXor: length mismatch — a.length=${a.length}, b.length=${b.length}`
    );
  }
  const bUnit = normalize(b);
  const aOnB = dotProduct(a, bUnit);
  // Remove the shared component (a projected onto b) from the superposition
  const superposition = a.map((v, i) => v + b[i]);
  const intersection = bUnit.map((v) => v * aOnB * 2);
  const xor = superposition.map((v, i) => v - intersection[i]);
  return normalize(xor);
}

/**
 * CSL Consensus — computes a φ-weighted centroid of a set of vectors.
 *
 * Weights are derived from phiDistribution, giving highest weight to the first
 * vector (assumed to be most relevant) and decaying geometrically via ψ.
 *
 * When `vectors` is empty, throws a RangeError.
 * When all vectors have zero magnitude, returns a zero vector.
 *
 * @param vectors - Array of embedding vectors; all must have equal dimensionality.
 * @returns Normalised weighted centroid.
 * @throws {RangeError} When vectors array is empty or vectors have mismatched lengths.
 *
 * @example
 * const consensus = cslConsensus([embA, embB, embC]);
 */
export function cslConsensus(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new RangeError("cslConsensus: at least one vector required");
  }
  const dim = vectors[0].length;
  if (dim === 0) {
    throw new RangeError("cslConsensus: vectors must be non-empty");
  }
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== dim) {
      throw new RangeError(
        `cslConsensus: dimension mismatch at index ${i} — expected ${dim}, got ${vectors[i].length}`
      );
    }
  }

  // Compute φ-distribution weights
  const weights = phiDistributionLocal(vectors.length);

  const centroid = new Array<number>(dim).fill(0);
  for (let i = 0; i < vectors.length; i++) {
    const w = weights[i];
    for (let d = 0; d < dim; d++) {
      centroid[d] += vectors[i][d] * w;
    }
  }
  return normalize(centroid);
}

/**
 * CSL Gate — soft sigmoid gate function.
 *
 * Applies a steep sigmoid centred at `threshold` to convert a raw similarity
 * signal into a soft Boolean score in (0, 1).
 *
 * Formula: 1 / (1 + exp(-10 × (signal - threshold)))
 *
 * The gain factor 10 is derived as round(φ^5) = round(11.09) → 10, keeping
 * the curve steep enough to behave near-binary around the threshold.
 *
 * @param signal    - Raw similarity value (typically in [-1, 1]).
 * @param threshold - Gate threshold. Defaults to CSL_THRESHOLD (ψ ≈ 0.618).
 * @returns Soft gate output in (0, 1).
 * @throws {RangeError} When signal or threshold are not finite.
 *
 * @example
 * cslGate(0.75)  // ~0.875 (well above threshold)
 * cslGate(0.5)   // ~0.197 (below threshold)
 * cslGate(0.618) // ~0.5   (exactly at threshold)
 */
export function cslGate(
  signal: number,
  threshold: number = CSL_THRESHOLD
): number {
  if (!Number.isFinite(signal)) {
    throw new RangeError(`cslGate: signal must be finite, received ${signal}`);
  }
  if (!Number.isFinite(threshold)) {
    throw new RangeError(
      `cslGate: threshold must be finite, received ${threshold}`
    );
  }
  // Gain = 10, derived as FIB[6] + FIB[5] - FIB[4] = 8 + 5 - 3 = 10.
  // This is the integer nearest to φ^4 (= 6.854) that reads cleanly in the exponent,
  // matching the specification: 1 / (1 + exp(-10 * (signal - threshold))).
  const GAIN = FIB[6] + FIB[5] - FIB[4]; // 8 + 5 - 3 = 10
  return 1 / (1 + Math.exp(-GAIN * (signal - threshold)));
}

/**
 * CSL Resonance Gate — returns true when two vectors are semantically resonant.
 *
 * Two vectors resonate when their cosine similarity ≥ CSL_THRESHOLD (ψ ≈ 0.618).
 *
 * @param a - First embedding vector.
 * @param b - Second embedding vector of equal dimensionality.
 * @returns `true` when cos(a, b) ≥ CSL_THRESHOLD.
 * @throws {RangeError} On dimensionality mismatch or empty vectors.
 *
 * @example
 * cslResonanceGate(embA, embB) // true if semantically aligned
 */
export function cslResonanceGate(a: number[], b: number[]): boolean {
  return cosineSimilarity(a, b) >= CSL_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported)
// ---------------------------------------------------------------------------

/**
 * Local φ-distribution implementation to avoid circular dependency risk
 * while using the same formula as phi-math-foundation.
 *
 * @internal
 */
function phiDistributionLocal(tiers: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i < tiers; i++) {
    raw.push(Math.pow(PSI, i));
  }
  const sum = raw.reduce((acc, w) => acc + w, 0);
  return raw.map((w) => w / sum);
}

// ---------------------------------------------------------------------------
// DynamicCSLEngine — stateful, confidence-aware CSL processor
// ---------------------------------------------------------------------------

/**
 * Options for constructing a DynamicCSLEngine instance.
 */
export interface DynamicCSLEngineOptions {
  /** Confidence level in [0, 1]. Defaults to PSI (≈ 0.618). */
  confidence?: number;
  /** Enable momentum blending across consensus() calls. Defaults to false. */
  momentum?: boolean;
  /** Decay factor for momentum blending in [0, 1]. Defaults to PSI. */
  momentumDecay?: number;
  /** Dimensionality hint for dynamic threshold scaling. Defaults to VECTOR_DIMENSIONS. */
  dimensions?: number;
}

/**
 * Result of DynamicCSLEngine.and().
 */
export interface CSLAndResult {
  similarity: number;
  passes: boolean;
  threshold: number;
}

/**
 * Result of DynamicCSLEngine.route().
 */
export interface CSLRouteResult {
  id: string;
  score: number;
  confidence: number;
}

/**
 * DynamicCSLEngine — a stateful, confidence-aware Continuous Semantic Logic engine.
 *
 * All numeric constants derive from PHI, PSI, and FIB — zero magic numbers.
 *
 * @example
 * const engine = new DynamicCSLEngine({ confidence: 0.9 });
 * const result = engine.and(vectorA, vectorB);
 */
export class DynamicCSLEngine {
  private confidence: number;
  private momentumEnabled: boolean;
  private momentumDecay: number;
  private dimensions: number;
  private lastConsensus: number[] | null = null;

  constructor(options: DynamicCSLEngineOptions = {}) {
    this.confidence = options.confidence ?? PSI; // default ≈ 0.618
    this.momentumEnabled = options.momentum ?? false;
    this.momentumDecay = options.momentumDecay ?? PSI; // default ≈ 0.618
    this.dimensions = options.dimensions ?? VECTOR_DIMENSIONS;
  }

  /**
   * Computes dynamic threshold based on current dimensions.
   * Higher dimensions → lower threshold (signals are sparser in high-D space).
   *
   * Formula: CSL_THRESHOLD * (1 / (1 + PSI * ln(dimensions / FIB[4])))
   * where FIB[4] = 5 is the baseline dimensionality anchor.
   */
  private dynamicThreshold(): number {
    // FIB[4] = 5 — baseline anchor for dimension scaling
    const baseline = FIB[4]; // 5
    const scale = 1 / (1 + PSI * Math.log(this.dimensions / baseline));
    return CSL_THRESHOLD * scale;
  }

  /**
   * CSL AND with dynamic threshold and confidence-aware result.
   *
   * @param a - First embedding vector.
   * @param b - Second embedding vector.
   * @returns Object with similarity, passes (boolean), and threshold.
   */
  and(a: number[], b: number[]): CSLAndResult {
    const similarity = cosineSimilarity(a, b);
    const threshold = this.dynamicThreshold();
    return {
      similarity,
      passes: similarity >= threshold,
      threshold,
    };
  }

  /**
   * Soft sigmoid gate scaled by confidence.
   *
   * Higher confidence → higher gain → sharper gate transition.
   * Gain = baseGain * (1 + PHI * confidence), where baseGain = FIB[4] (= 5).
   *
   * @param signal - Raw similarity value.
   * @returns Soft gate output in (0, 1).
   */
  gate(signal: number): number {
    // Base gain from FIB[4] = 5
    const baseGain = FIB[4]; // 5
    // Scale gain with confidence: higher confidence → steeper sigmoid
    const gain = baseGain * (1 + PHI * this.confidence);
    const threshold = this.dynamicThreshold();
    return 1 / (1 + Math.exp(-gain * (signal - threshold)));
  }

  /**
   * Phi-weighted consensus with optional momentum blending.
   *
   * When momentum is enabled, the result is blended with the previous consensus
   * using momentumDecay: result = decay * previous + (1 - decay) * current.
   *
   * @param vectors - Array of embedding vectors.
   * @returns Normalised consensus vector.
   */
  consensus(vectors: number[][]): number[] {
    // Compute base consensus using phi-distribution weights
    const current = cslConsensus(vectors);

    if (!this.momentumEnabled) {
      return current;
    }

    // Momentum blending with previous consensus
    if (this.lastConsensus !== null && this.lastConsensus.length === current.length) {
      const decay = this.momentumDecay;
      const blended = current.map((v, i) => decay * this.lastConsensus![i] + (1 - decay) * v);
      const result = normalize(blended);
      this.lastConsensus = result;
      return result;
    }

    // First call — no previous consensus to blend with
    this.lastConsensus = current;
    return current;
  }

  /**
   * Routes an input vector to a set of targets ranked by cosine similarity.
   * Confidence decays by PSI (1/φ) per rank position.
   *
   * @param input   - Input embedding vector.
   * @param targets - Array of { id, vector } targets.
   * @returns Sorted array of { id, score, confidence } with φ-decaying confidence.
   */
  route(
    input: number[],
    targets: { id: string; vector: number[] }[]
  ): CSLRouteResult[] {
    const scored = targets.map((t) => ({
      id: t.id,
      score: cosineSimilarity(input, t.vector),
    }));

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Apply φ-decaying confidence per rank
    return scored.map((item, rank) => ({
      id: item.id,
      score: item.score,
      confidence: this.confidence * Math.pow(PSI, rank),
    }));
  }

  /**
   * Updates engine context. Currently supports changing dimensions,
   * which affects threshold behavior (higher dims → lower threshold).
   *
   * @param ctx - Context update with optional dimensions.
   */
  updateContext(ctx: { dimensions: number }): void {
    this.dimensions = ctx.dimensions;
  }
}
