/**
 * @fileoverview prompt-manager — Prompt template registry and versioning — manages all system prompts
 * @module prompt-manager
 * @version 4.0.0
 * @port 3328
 * @domain orchestration
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

class PromptManager extends LiquidNodeBase {
  constructor() {
    super({
      name: 'prompt-manager',
      port: 3328,
      domain: 'orchestration',
      description: 'Prompt template registry and versioning — manages all system prompts',
      pool: 'warm',
      dependencies: [],
    });
  }

  async onStart() {

    /** @type {Map<string, Object>} Prompt templates */
    const templates = new Map();
    // POST /template — register a prompt template
    this.route('POST', '/template', async (req, res, ctx) => {
      const { name, template, version, variables } = ctx.body || {};
      if (!name || !template) return this.sendError(res, 400, 'Missing name and template', 'MISSING_INPUT');
      const tplId = correlationId('tpl');
      templates.set(name, { id: tplId, name, template, version: version || '1.0.0', variables: variables || [], createdAt: Date.now() });
      this.json(res, 201, { id: tplId, name, registered: true });
    });
    // POST /render — render a template with variables
    this.route('POST', '/render', async (req, res, ctx) => {
      const { name, variables } = ctx.body || {};
      const tpl = templates.get(name);
      if (!tpl) return this.sendError(res, 404, 'Template not found', 'TEMPLATE_NOT_FOUND');
      let rendered = tpl.template;
      for (const [k, v] of Object.entries(variables || {})) { rendered = rendered.replace(new RegExp(`\{\{${k}\}\}`, 'g'), v); }
      this.json(res, 200, { name, rendered, version: tpl.version });
    });
    // GET /templates — list all templates
    this.route('GET', '/templates', async (req, res, ctx) => {
      this.json(res, 200, { count: templates.size, templates: Array.from(templates.values()).map(t => ({ name: t.name, version: t.version, variables: t.variables })) });
    });

    this.log.info('prompt-manager initialized');
  }
}

new PromptManager().start();
