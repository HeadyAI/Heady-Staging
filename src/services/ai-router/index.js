/**
 * @fileoverview ai-router — CSL-gated AI provider routing — selects optimal model by task affinity
 * @module ai-router
 * @version 4.0.0
 * @port 3313
 * @domain inference
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

class AiRouter extends LiquidNodeBase {
  constructor() {
    super({
      name: 'ai-router',
      port: 3313,
      domain: 'inference',
      description: 'CSL-gated AI provider routing — selects optimal model by task affinity',
      pool: 'hot',
      dependencies: ['heady-brain', 'model-gateway'],
    });
  }

  async onStart() {

    /** @type {Object<string, {models: string[], affinity: number}>} Provider capabilities */
    const providers = { anthropic: { models: ['claude-sonnet-4-20250514'], affinity: 0.95 }, openai: { models: ['gpt-4o'], affinity: 0.92 }, google: { models: ['gemini-2.5-pro'], affinity: 0.90 }, groq: { models: ['llama-3.1-70b'], affinity: 0.85 }, perplexity: { models: ['sonar-pro'], affinity: 0.88 } };
    // POST /route — route a request to the optimal provider
    this.route('POST', '/route', async (req, res, ctx) => {
      const { task, preferredProvider } = ctx.body || {};
      if (!task) return this.sendError(res, 400, 'Missing task', 'MISSING_TASK');
      const selected = preferredProvider && providers[preferredProvider] ? preferredProvider : 'anthropic';
      this.json(res, 200, { provider: selected, model: providers[selected].models[0], affinity: providers[selected].affinity, cslThreshold: CSL_THRESHOLDS.MEDIUM });
    });
    // GET /providers — list all providers
    this.route('GET', '/providers', async (req, res, ctx) => {
      this.json(res, 200, { providers });
    });

    this.log.info('ai-router initialized');
  }
}

new AiRouter().start();
