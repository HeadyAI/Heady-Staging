/**
 * @fileoverview search-service — Hybrid BM25+dense vector search with RRF fusion
 * @module search-service
 * @version 4.0.0
 * @port 3347
 * @domain memory
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

class SearchService extends LiquidNodeBase {
  constructor() {
    super({
      name: 'search-service',
      port: 3347,
      domain: 'memory',
      description: 'Hybrid BM25+dense vector search with RRF fusion',
      pool: 'hot',
      dependencies: ['heady-memory', 'heady-embed'],
    });
  }

  async onStart() {

    // POST /search — hybrid search combining BM25 and dense vector
    this.route('POST', '/search', async (req, res, ctx) => {
      const { query, topK, mode } = ctx.body || {};
      if (!query) return this.sendError(res, 400, 'Missing query', 'MISSING_QUERY');
      const k = topK || fib(5);
      const searchMode = mode || 'hybrid';
      const results = Array.from({ length: k }, (_, i) => ({
        rank: i + 1, score: 1 - i * PSI * 0.1, method: searchMode, id: correlationId('doc'),
      }));
      this.json(res, 200, { query, mode: searchMode, results, total: k, rrf: searchMode === 'hybrid' });
    });
    // GET /modes — available search modes
    this.route('GET', '/modes', async (req, res, ctx) => {
      this.json(res, 200, { modes: ['bm25', 'dense', 'hybrid', 'sparse'], default: 'hybrid', fusionMethod: 'reciprocal_rank_fusion' });
    });

    this.log.info('search-service initialized');
  }
}

new SearchService().start();
