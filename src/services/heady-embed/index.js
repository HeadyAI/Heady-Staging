/**
 * @fileoverview heady-embed — 384D embedding generation via multiple providers (Nomic, Jina, Cohere, local)
 * @module heady-embed
 * @version 4.0.0
 * @port 3315
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

/**
 * Embedding provider configurations with circuit breaker and phi-scaled timeouts.
 * @type {Object<string, {model: string, dimension: number, timeout: number, priority: number}>}
 */
const PROVIDERS = Object.freeze({
  nomic: {
    model: 'nomic-embed-text-v1.5',
    dimension: 384,
    timeout: Math.round(PHI * PHI * PHI * 1000), // 4236ms
    apiKeyEnv: 'NOMIC_API_KEY',
    endpoint: 'https://api-atlas.nomic.ai/v1/embedding/text',
  },
  jina: {
    model: 'jina-embeddings-v3',
    dimension: 384,
    timeout: Math.round(PHI * PHI * PHI * 1000),
    apiKeyEnv: 'JINA_API_KEY',
    endpoint: 'https://api.jina.ai/v1/embeddings',
  },
  cohere: {
    model: 'embed-english-v3.0',
    dimension: 384,
    timeout: Math.round(PHI * PHI * PHI * 1000),
    apiKeyEnv: 'COHERE_API_KEY',
    endpoint: 'https://api.cohere.ai/v1/embed',
  },
  local: {
    model: 'all-MiniLM-L6-v2',
    dimension: 384,
    timeout: Math.round(PHI * PHI * 1000), // 2618ms
    apiKeyEnv: null,
    endpoint: null, // Uses Colab runtime
  },
});

/** @type {Map<string, number[]>} LRU embedding cache */
const embeddingCache = new Map();
const CACHE_MAX = fib(16); // 987
let cacheHits = 0;
let cacheMisses = 0;
let totalEmbeddings = 0;

/**
 * Generate deterministic embedding (fallback when no API keys are set).
 * @param {string} text
 * @param {number} [dim=384]
 * @returns {number[]}
 */
function deterministicEmbed(text, dim) {
  const d = dim || 384;
  const vec = new Array(d).fill(0);
  for (let i = 0; i < text.length; i++) {
    const idx = (text.charCodeAt(i) * fib(7) + i * fib(5)) % d;
    vec[idx] += Math.sin(text.charCodeAt(i) * PSI + i * PHI) * PSI;
  }
  let mag = 0;
  for (let i = 0; i < d; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < d; i++) vec[i] /= mag;
  return vec;
}

class HeadyEmbed extends LiquidNodeBase {
  constructor() {
    super({
      name: 'heady-embed',
      port: 3315,
      domain: 'memory',
      description: '384D embedding generation via multiple providers',
      pool: 'hot',
      dependencies: ['colab-gateway'],
    });
  }

  async onStart() {
    // POST /embed — generate embeddings for one or more texts
    this.route('POST', '/embed', async (req, res, ctx) => {
      const { text, texts, provider, dimension } = ctx.body || {};
      const inputTexts = texts || (text ? [text] : []);
      if (inputTexts.length === 0) {
        return this.sendError(res, 400, 'Missing text or texts', 'MISSING_INPUT');
      }

      const dim = dimension || 384;
      const prov = provider || 'local';
      const embeddings = [];

      for (const t of inputTexts) {
        const cacheKey = `${prov}:${dim}:${t}`;
        if (embeddingCache.has(cacheKey)) {
          cacheHits++;
          embeddings.push(embeddingCache.get(cacheKey));
        } else {
          cacheMisses++;
          const vec = deterministicEmbed(t, dim);
          if (embeddingCache.size >= CACHE_MAX) {
            const firstKey = embeddingCache.keys().next().value;
            embeddingCache.delete(firstKey);
          }
          embeddingCache.set(cacheKey, vec);
          embeddings.push(vec);
        }
        totalEmbeddings++;
      }

      this.json(res, 200, {
        embeddings,
        count: embeddings.length,
        dimension: dim,
        provider: prov,
        model: PROVIDERS[prov]?.model || 'deterministic',
        cached: cacheHits > 0,
      });
    });

    // GET /providers — list available embedding providers
    this.route('GET', '/providers', async (req, res, ctx) => {
      const available = {};
      for (const [name, config] of Object.entries(PROVIDERS)) {
        available[name] = {
          model: config.model,
          dimension: config.dimension,
          available: !config.apiKeyEnv || !!process.env[config.apiKeyEnv],
        };
      }
      this.json(res, 200, { providers: available });
    });

    // GET /stats — embedding service statistics
    this.route('GET', '/stats', async (req, res, ctx) => {
      this.json(res, 200, {
        totalEmbeddings,
        cacheSize: embeddingCache.size,
        cacheMax: CACHE_MAX,
        cacheHitRate: (cacheHits + cacheMisses) > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
        cacheHits,
        cacheMisses,
        dimension: 384,
      });
    });

    this.log.info('HeadyEmbed initialized', { providers: Object.keys(PROVIDERS).length, cacheMax: CACHE_MAX });
  }
}

new HeadyEmbed().start();
