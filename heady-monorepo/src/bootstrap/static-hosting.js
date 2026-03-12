/**
 * ∞ Static Hosting — Heady™ Static File Middleware
 *
 * Mounts per-domain static file hosting from the sites/ directory.
 * Serves public assets, favicon, and robots.txt for each registered domain.
 *
 * © 2026 Heady™Systems Inc. All rights reserved.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const SITES_DIR = path.join(ROOT, 'src', 'sites');

/**
 * Mount static hosting middleware for all registered domains.
 * Serves files from src/sites/public/<domain>/ if they exist.
 *
 * @param {Express.Application} app - Express app instance
 * @param {string} [projectRoot] - Optional override for project root
 */
function mountStaticHosting(app, projectRoot) {
    const rootDir = projectRoot || ROOT;

    // Try to load express static middleware
    let expressStatic;
    try {
        const express = require('../core/heady-server');
        expressStatic = express.static;
    } catch (_e) {
        try {
            const express = require('express');
            expressStatic = express.static;
        } catch (_e2) {
            // No express available — skip static hosting
            return;
        }
    }

    // Serve global public directory if present
    const globalPublic = path.join(rootDir, 'public');
    if (fs.existsSync(globalPublic)) {
        app.use(expressStatic(globalPublic, { maxAge: '1d', etag: true }));
    }

    // Serve per-domain static files if sites/public/<domain> exists
    const sitesPublic = path.join(SITES_DIR, 'public');
    if (fs.existsSync(sitesPublic)) {
        try {
            const domains = fs.readdirSync(sitesPublic, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
            for (const domain of domains) {
                const domainPublic = path.join(sitesPublic, domain);
                app.use(`/${domain}`, expressStatic(domainPublic, { maxAge: '1d', etag: true }));
            }
        } catch (_e) { /* non-critical */ }
    }

    // Health check for static hosting
    app.get('/api/static-hosting/health', (_req, res) => {
        res.json({ ok: true, service: 'static-hosting', ts: new Date().toISOString() });
    });
}

module.exports = { mountStaticHosting };
