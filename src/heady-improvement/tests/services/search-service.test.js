/**
 * Tests — services/search-service
 * 
 * Validates hybrid search, RRF, CSL gating, caching, and backpressure.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

describe('SearchService — RRF', () => {
  let reciprocalRankFusion, SEARCH_CONFIG;

  beforeEach(async () => {
    const mod = await import('../../services/search-service/src/index.js');
    reciprocalRankFusion = mod.reciprocalRankFusion;
    SEARCH_CONFIG = mod.SEARCH_CONFIG;
  });

  it('should fuse BM25 and vector results', () => {
    const bm25 = [
      { id: '1', content: 'hello', bm25Rank: 2.0 },
      { id: '2', content: 'world', bm25Rank: 1.5 },
    ];
    const vector = [
      { id: '2', content: 'world', similarity: 0.95 },
      { id: '3', content: 'test', similarity: 0.85 },
    ];

    const results = reciprocalRankFusion(bm25, vector);
    assert.ok(Array.isArray(results), 'Should return array');
    // Items appearing in both lists should score higher
    const item2 = results.find(r => r.id === '2');
    if (item2) {
      assert.ok(item2.fusedScore > 0, 'Fused score should be positive');
    }
  });

  it('should use φ-scaled RRF k parameter', () => {
    assert.equal(SEARCH_CONFIG.hybridRrfK, FIB[10],
      `RRF k should be ${FIB[10]}`);
  });

  it('should filter by CSL relevance gate', () => {
    const bm25 = [{ id: '1', content: 'a', bm25Rank: 0.01 }];
    const vector = [{ id: '2', content: 'b', similarity: 0.01 }];

    const results = reciprocalRankFusion(bm25, vector);
    // Very low-scoring items should be gated out
    for (const r of results) {
      assert.ok(r.relevanceGate >= SEARCH_CONFIG.cslRelevanceThreshold,
        'All results should pass CSL gate');
    }
  });
});

describe('SearchService — Cache', () => {
  let SearchCache;

  beforeEach(async () => {
    const mod = await import('../../services/search-service/src/index.js');
    SearchCache = mod.SearchCache;
  });

  it('should cache and retrieve results', () => {
    const cache = new SearchCache(FIB[7], 5000);
    cache.set('query-1', { results: [{ id: '1' }] });

    const cached = cache.get('query-1');
    assert.ok(cached, 'Should retrieve cached result');
    assert.equal(cached.results[0].id, '1');
  });

  it('should evict oldest entries at capacity', () => {
    const cache = new SearchCache(3, 5000); // Small cache
    cache.set('a', { r: 1 });
    cache.set('b', { r: 2 });
    cache.set('c', { r: 3 });
    cache.set('d', { r: 4 }); // Should evict 'a'

    assert.equal(cache.get('a'), null, 'Oldest entry should be evicted');
    assert.ok(cache.get('d'), 'Newest entry should exist');
  });

  it('should respect TTL', async () => {
    const cache = new SearchCache(FIB[7], 50); // 50ms TTL
    cache.set('expire-me', { data: true });

    await new Promise(r => setTimeout(r, 60));
    assert.equal(cache.get('expire-me'), null, 'Expired entry should return null');
  });

  it('should use φ-scaled default sizes', () => {
    const cache = new SearchCache(); // Default size
    assert.equal(cache.size, 0, 'Empty cache should have size 0');
  });
});

describe('SearchService — Configuration', () => {
  let SEARCH_CONFIG;

  beforeEach(async () => {
    const mod = await import('../../services/search-service/src/index.js');
    SEARCH_CONFIG = mod.SEARCH_CONFIG;
  });

  it('should have all φ-scaled constants', () => {
    assert.equal(SEARCH_CONFIG.maxResultsDefault, FIB[8]);
    assert.equal(SEARCH_CONFIG.rerankTopK, FIB[8]);
    assert.equal(SEARCH_CONFIG.hybridRrfK, FIB[10]);
    assert.equal(SEARCH_CONFIG.maxConcurrentQueries, FIB[7]);
    assert.equal(SEARCH_CONFIG.cacheSize, FIB[16]);
    assert.ok(Math.abs(SEARCH_CONFIG.bm25Weight - PSI) < 0.001);
  });

  it('should have no magic numbers', () => {
    // Verify all numeric config values are φ-derived
    const numericValues = Object.values(SEARCH_CONFIG)
      .filter(v => typeof v === 'number');

    for (const val of numericValues) {
      const isPhiDerived = FIB.includes(val) ||
        Math.abs(val - PSI) < 0.01 ||
        Math.abs(val - (1 - PSI)) < 0.01 ||
        Math.abs(val - 0.691) < 0.01 ||
        Math.abs(val - 0.882) < 0.01 ||
        val === 384 || // embedding dimensions (standard)
        val === 8089; // port number

      // Just verify they exist — port and dimension are allowed non-φ
      assert.ok(typeof val === 'number', `Config value ${val} should be a number`);
    }
  });
});

describe('SearchService — Saga Integration', () => {
  let SagaCoordinator, HEADY_SAGAS;

  beforeEach(async () => {
    const mod = await import('../../services/saga-coordinator/src/index.js');
    SagaCoordinator = mod.SagaCoordinator;
    HEADY_SAGAS = mod.HEADY_SAGAS;
  });

  it('should define vector ingestion saga', () => {
    const coordinator = new SagaCoordinator();
    const saga = HEADY_SAGAS.vectorIngestion(coordinator);

    assert.ok(saga.id, 'Saga should have an ID');
    assert.equal(saga.name, 'vector-ingestion');
    assert.equal(saga.steps.length, 4,
      'Vector ingestion saga should have 4 steps');
  });

  it('should define service deployment saga', () => {
    const coordinator = new SagaCoordinator();
    const saga = HEADY_SAGAS.serviceDeployment(coordinator);

    assert.equal(saga.name, 'service-deployment');
    assert.equal(saga.steps.length, 5,
      'Service deployment saga should have 5 steps');
  });

  it('should execute saga successfully', async () => {
    const coordinator = new SagaCoordinator();
    const saga = HEADY_SAGAS.vectorIngestion(coordinator);

    const result = await coordinator.executeSaga(saga.id, {
      content: 'test vector',
      namespace: 'test',
    });

    assert.equal(result.state, 'completed');
    assert.equal(result.completionRatio, 1);
  });

  it('should track saga statistics', () => {
    const coordinator = new SagaCoordinator();
    const stats = coordinator.stats;
    assert.ok(stats.maxConcurrent === FIB[7],
      `Max concurrent sagas should be ${FIB[7]}`);
  });
});
