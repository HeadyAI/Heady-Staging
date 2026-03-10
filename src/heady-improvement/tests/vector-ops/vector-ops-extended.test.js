/**
 * Tests — core/vector-ops (extended)
 * 
 * Validates CSL engine, embedding router, hybrid search,
 * and all φ-scaled vector space operations.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('VectorOps — CSLEngine', () => {
  let CSLEngine;

  beforeEach(async () => {
    const mod = await import('../../core/vector-ops/csl-engine.js');
    CSLEngine = mod.CSLEngine;
  });

  it('should compute CSL AND (cosine similarity)', () => {
    const engine = new CSLEngine();
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const result = engine.cslAND(a, b);
    assert.ok(Math.abs(result - 1.0) < 1e-10,
      'Identical vectors: CSL AND should be 1.0');
  });

  it('should compute CSL AND for orthogonal vectors (logical FALSE)', () => {
    const engine = new CSLEngine();
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const result = engine.cslAND(a, b);
    assert.ok(Math.abs(result) < 1e-10,
      'Orthogonal vectors: CSL AND should be ≈0');
  });

  it('should compute CSL OR (superposition)', () => {
    const engine = new CSLEngine();
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const result = engine.cslOR(a, b);
    // Superposition: normalized sum
    assert.ok(Array.isArray(result), 'CSL OR should return a vector');
    assert.equal(result.length, 3, 'Result vector should have same dimensions');
    // Magnitude should be ≈1 (normalized)
    const mag = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
    assert.ok(Math.abs(mag - 1.0) < 0.01,
      `CSL OR result should be normalized, got magnitude ${mag}`);
  });

  it('should compute CSL NOT (orthogonal projection)', () => {
    const engine = new CSLEngine();
    const a = [1, 1, 0];
    const b = [1, 0, 0];
    const result = engine.cslNOT(a, b);
    // NOT should project a onto orthogonal complement of b
    assert.ok(Array.isArray(result), 'CSL NOT should return a vector');
    // Result should be orthogonal to b
    const dot = result.reduce((s, v, i) => s + v * b[i], 0);
    assert.ok(Math.abs(dot) < 1e-10,
      `CSL NOT result should be orthogonal to b, dot=${dot}`);
  });

  it('should compute CSL GATE (sigmoid)', () => {
    const engine = new CSLEngine();
    // High similarity → gate should pass
    const highGate = engine.cslGate(1.0, 0.95, 0.809);
    assert.ok(highGate > 0.5, `High similarity gate should pass, got ${highGate}`);

    // Low similarity → gate should block
    const lowGate = engine.cslGate(1.0, 0.3, 0.809);
    assert.ok(lowGate < 0.5, `Low similarity gate should block, got ${lowGate}`);
  });

  it('should compute CSL IMPLY (projection)', () => {
    const engine = new CSLEngine();
    const a = [1, 1, 0];
    const b = [1, 0, 0];
    const result = engine.cslIMPLY(a, b);
    // IMPLY projects a onto b
    assert.ok(Array.isArray(result));
    // Result should be parallel to b
    const cross = [
      result[1] * b[2] - result[2] * b[1],
      result[2] * b[0] - result[0] * b[2],
      result[0] * b[1] - result[1] * b[0],
    ];
    const crossMag = Math.sqrt(cross.reduce((s, v) => s + v * v, 0));
    assert.ok(crossMag < 1e-10,
      `IMPLY result should be parallel to b, cross product magnitude=${crossMag}`);
  });

  it('should use φ-scaled gate thresholds', () => {
    const engine = new CSLEngine();
    const thresholds = engine.getThresholds();

    assert.ok(Math.abs(thresholds.MINIMUM - 0.5) < 0.01);
    assert.ok(Math.abs(thresholds.LOW - 0.691) < 0.01);
    assert.ok(Math.abs(thresholds.MEDIUM - 0.809) < 0.01);
    assert.ok(Math.abs(thresholds.HIGH - 0.882) < 0.01);
    assert.ok(Math.abs(thresholds.CRITICAL - 0.927) < 0.01);
  });
});

describe('VectorOps — EmbeddingRouter', () => {
  let EmbeddingRouter;

  beforeEach(async () => {
    const mod = await import('../../core/vector-ops/embedding-router.js');
    EmbeddingRouter = mod.EmbeddingRouter;
  });

  it('should route to default provider', () => {
    const router = new EmbeddingRouter();
    const provider = router.selectProvider('general');
    assert.ok(provider, 'Should select a provider');
    assert.ok(provider.name, 'Provider should have a name');
  });

  it('should support multiple providers', () => {
    const router = new EmbeddingRouter();
    const providers = router.listProviders();
    assert.ok(providers.length >= 1, 'Should have at least 1 provider');
    // Should include known providers
    const names = providers.map(p => p.name);
    assert.ok(names.some(n => ['nomic', 'jina', 'cohere', 'voyage', 'ollama'].includes(n)),
      'Should include known embedding providers');
  });

  it('should use φ-scaled cache for embeddings', () => {
    const router = new EmbeddingRouter();
    const config = router.cacheConfig;
    assert.ok(FIB.includes(config.maxSize),
      `Cache size ${config.maxSize} must be a Fibonacci number`);
  });

  it('should implement circuit breaker per provider', () => {
    const router = new EmbeddingRouter();
    const circuitState = router.getCircuitState('nomic');
    assert.ok(['closed', 'open', 'half-open'].includes(circuitState),
      `Invalid circuit state: ${circuitState}`);
  });

  it('should track provider health scores', () => {
    const router = new EmbeddingRouter();
    const health = router.getProviderHealth();
    for (const [name, score] of Object.entries(health)) {
      assert.ok(score >= 0 && score <= 1,
        `Provider "${name}" health ${score} must be in [0,1]`);
    }
  });
});

describe('VectorOps — HybridSearch', () => {
  let HybridSearch;

  beforeEach(async () => {
    const mod = await import('../../core/vector-ops/hybrid-search.js');
    HybridSearch = mod.HybridSearch;
  });

  it('should compute Reciprocal Rank Fusion', () => {
    const search = new HybridSearch();
    const bm25 = [
      { id: 'a', score: 2.5 },
      { id: 'b', score: 2.0 },
      { id: 'c', score: 1.5 },
    ];
    const vector = [
      { id: 'b', score: 0.95 },
      { id: 'a', score: 0.85 },
      { id: 'd', score: 0.80 },
    ];

    const fused = search.reciprocalRankFusion(bm25, vector);
    assert.ok(fused.length > 0, 'Should produce fused results');
    // 'a' and 'b' appear in both — should rank high
    const topIds = fused.slice(0, 2).map(r => r.id);
    assert.ok(topIds.includes('a') || topIds.includes('b'),
      'Top results should include items from both lists');
  });

  it('should use φ-scaled RRF k parameter', () => {
    const search = new HybridSearch();
    const config = search.config;
    assert.equal(config.rrfK, FIB[10],
      `RRF k should be FIB[10]=${FIB[10]}, got ${config.rrfK}`);
  });

  it('should use φ-scaled weights for BM25 and vector', () => {
    const search = new HybridSearch();
    const config = search.config;

    assert.ok(Math.abs(config.bm25Weight - PSI) < 0.01,
      `BM25 weight should be ≈ψ=${PSI}, got ${config.bm25Weight}`);
    assert.ok(Math.abs(config.vectorWeight - PSI2) < 0.01,
      `Vector weight should be ≈ψ²=${PSI2}, got ${config.vectorWeight}`);
  });

  it('should CSL-gate low-relevance results', () => {
    const search = new HybridSearch();
    const results = [
      { id: 'high', fusedScore: 0.9 },
      { id: 'low', fusedScore: 0.2 },
    ];

    const filtered = search.cslFilter(results, 0.691);
    assert.ok(!filtered.find(r => r.id === 'low'),
      'Low-relevance result should be filtered out');
    assert.ok(filtered.find(r => r.id === 'high'),
      'High-relevance result should pass');
  });
});

describe('VectorOps — Colab Runtime Integration', () => {
  let ColabRuntime;

  beforeEach(async () => {
    const mod = await import('../../core/liquid-nodes/colab-runtime.js');
    ColabRuntime = mod.ColabRuntime;
  });

  it('should manage 3 runtimes for vector space ops', () => {
    const runtime = new ColabRuntime();
    const runtimes = runtime.getRuntimes();
    assert.equal(runtimes.length, 3, 'Must have 3 Colab Pro+ runtimes');
  });

  it('should route embedding jobs to embedding runtime', () => {
    const runtime = new ColabRuntime();
    const target = runtime.routeJob({ type: 'embedding' });
    assert.equal(target.role, 'embedding');
  });

  it('should route inference jobs to inference runtime', () => {
    const runtime = new ColabRuntime();
    const target = runtime.routeJob({ type: 'inference' });
    assert.equal(target.role, 'inference');
  });

  it('should route training jobs to training runtime', () => {
    const runtime = new ColabRuntime();
    const target = runtime.routeJob({ type: 'training' });
    assert.equal(target.role, 'training');
  });

  it('should use φ-scaled batch sizes for all runtime types', () => {
    const runtime = new ColabRuntime();
    const config = runtime.getConfig();
    assert.ok(FIB.includes(config.batchSize),
      `Batch size ${config.batchSize} must be a Fibonacci number`);
  });
});
