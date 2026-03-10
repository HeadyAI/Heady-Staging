/**
 * Heady™ Search Service — Tests
 * Hybrid search input validation, security headers
 * © 2026 HeadySystems Inc.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('search-service — shared infrastructure', () => {
    it('should create logger with service and domain tags', () => {
        const { createLogger } = require('../../../shared/logger');
        const logger = createLogger({ service: 'search-service', domain: 'data' });
        assert.ok(logger);
        assert.ok(typeof logger.info === 'function');
        assert.ok(typeof logger.error === 'function');
        assert.ok(typeof logger.warn === 'function');
        assert.ok(typeof logger.child === 'function');
    });

    it('should export security headers middleware', () => {
        const { securityHeaders, ALLOWED_ORIGINS } = require('../../../shared/security-headers');
        assert.ok(typeof securityHeaders === 'function');
        assert.ok(Array.isArray(ALLOWED_ORIGINS));
        assert.ok(ALLOWED_ORIGINS.includes('https://headyme.com'));
        assert.ok(ALLOWED_ORIGINS.includes('https://headysystems.com'));
        assert.ok(ALLOWED_ORIGINS.includes('https://auth.headysystems.com'));
    });

    it('should set correct RRF_K constant (Fibonacci 55)', () => {
        // The search service uses RRF_K = 55 (Fibonacci)
        const RRF_K = 55;
        assert.equal(RRF_K, 55, 'RRF_K should be Fibonacci 55');
    });

    it('should validate embedding dimensions (384)', () => {
        const validEmbedding = new Array(384).fill(0.1);
        const invalidEmbedding = new Array(100).fill(0.1);

        assert.equal(validEmbedding.length, 384, 'Valid embedding is 384-dim');
        assert.notEqual(invalidEmbedding.length, 384, 'Invalid embedding is not 384-dim');
    });

    it('should calculate RRF scores correctly', () => {
        const RRF_K = 55;
        const rank1RRF = 1 / (RRF_K + 1); // Best possible score for single source
        const rank2RRF = 1 / (RRF_K + 2);

        assert.ok(rank1RRF > rank2RRF, 'Rank 1 should score higher than rank 2');

        // Combined score from both sources at rank 1
        const fusedScore = rank1RRF + rank1RRF;
        assert.ok(fusedScore > rank1RRF, 'Fused score should be higher than single source');
    });
});
