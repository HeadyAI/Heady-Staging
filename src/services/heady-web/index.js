/**
 * @fileoverview heady-web — Web application server — serves HeadyMe web app
 * @module heady-web
 * @version 4.0.0
 * @port 3338
 * @domain interface
 *
 * Heady™ Latent OS — Sacred Geometry v4.0
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 * 51 Provisional Patents — All Rights Reserved
 */

'use strict';

const { LiquidNodeBase, CSL_THRESHOLDS, PHI, PSI, PSI2, FIB, fib, phiThreshold, phiBackoff, correlationId } = require('../../shared/liquid-node-base');
const { ServiceMesh, SERVICE_CATALOG, DOMAIN_SWARMS } = require('../../shared/service-mesh');

const mesh = ServiceMesh.instance();

class HeadyWeb extends LiquidNodeBase {
  constructor() {
    super({
      name: 'heady-web',
      port: 3338,
      domain: 'interface',
      description: 'Web application server — serves HeadyMe web app',
      pool: 'hot',
      dependencies: [],
    });
  }

  async onStart() {

    // GET /config — web app configuration
    this.route('GET', '/config', async (req, res, ctx) => {
      this.json(res, 200, { apiGateway: '/api/v1', wsEndpoint: '/ws', version: '4.0.0', features: ['chat', 'dashboard', 'vector-explorer', 'bee-hive'] });
    });

    this.log.info('heady-web initialized');
  }
}

new HeadyWeb().start();
