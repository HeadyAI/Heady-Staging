/**
 * Heady™ Site Renderer — Multi-domain site serving engine.
 * Maps hostnames to site configurations and renders appropriate content.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Domain → site config mapping
const SITE_MAP = {
    'headyme.com': { id: 'headyme', name: 'HeadyMe', theme: 'personal', template: 'main' },
    'www.headyme.com': { id: 'headyme', name: 'HeadyMe', theme: 'personal', template: 'main' },
    'headysystems.com': { id: 'headysystems', name: 'Heady Systems', theme: 'enterprise', template: 'corporate' },
    'www.headysystems.com': { id: 'headysystems', name: 'Heady Systems', theme: 'enterprise', template: 'corporate' },
    'headyconnection.org': { id: 'headyconnection', name: 'Heady Connection', theme: 'community', template: 'nonprofit' },
    'headymcp.com': { id: 'headymcp', name: 'Heady MCP', theme: 'developer', template: 'api-docs' },
    'headybuddy.org': { id: 'headybuddy', name: 'Heady Buddy', theme: 'companion', template: 'buddy' },
    'headybot.com': { id: 'headybot', name: 'Heady Bot', theme: 'bot', template: 'bot-platform' },
    'headyos.com': { id: 'headyos', name: 'Heady OS', theme: 'os', template: 'os-platform' },
    'headyapi.com': { id: 'headyapi', name: 'Heady API', theme: 'api', template: 'api-docs' },
    'headyio.com': { id: 'headyio', name: 'Heady IO', theme: 'io', template: 'main' },
    'localhost': { id: 'dev', name: 'Heady Dev', theme: 'dev', template: 'main' },
};

// Default site for unrecognized hosts
const DEFAULT_SITE = { id: 'default', name: 'Heady', theme: 'default', template: 'main' };

/**
 * Resolve a hostname to a site config
 * @param {string} hostname
 * @returns {Object} site config
 */
function resolveSite(hostname) {
    if (!hostname) return DEFAULT_SITE;
    // Strip port
    const host = hostname.split(':')[0].toLowerCase();
    return SITE_MAP[host] || DEFAULT_SITE;
}

/**
 * Render a site config to HTML
 * @param {Object} site - site config from resolveSite()
 * @param {Object} opts - { path, query, data }
 * @returns {string} HTML content
 */
function renderSite(site, opts = {}) {
    const { id, name, theme, template } = site;

    // Look for static site files first
    const staticPath = path.join(__dirname, '..', '..', 'public', id, 'index.html');
    if (fs.existsSync(staticPath)) {
        return fs.readFileSync(staticPath, 'utf8');
    }

    // Try generic template
    const templatePath = path.join(__dirname, '..', '..', 'public', 'templates', `${template}.html`);
    if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf8')
            .replace(/{{SITE_NAME}}/g, name)
            .replace(/{{SITE_ID}}/g, id)
            .replace(/{{THEME}}/g, theme);
    }

    // Fallback: generate minimal HTML
    return generateFallbackHTML(site, opts);
}

function generateFallbackHTML(site, opts = {}) {
    const { name, id, theme } = site;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Heady™ AI Platform</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0a0a0f; color: #e8e8f0; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; }
    .container { text-align: center; max-width: 640px; padding: 2rem; }
    h1 { font-size: 3rem; font-weight: 700; letter-spacing: -0.03em;
         background: linear-gradient(135deg, #7c6fff, #4cc9f0);
         -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { color: #8888aa; margin-top: 1rem; font-size: 1.1rem; }
    .phi { font-size: 0.8rem; color: #444; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${name}</h1>
    <p>Autonomous AI Platform · Sacred Geometry · φ = 1.618</p>
    <div class="phi">∞ HEADY SYSTEMS · ${id} · ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`;
}

/**
 * List all registered site domains
 * @returns {string[]}
 */
function listDomains() {
    return Object.keys(SITE_MAP);
}

/**
 * Register a new site mapping
 * @param {string} hostname
 * @param {Object} siteConfig
 */
function registerSite(hostname, siteConfig) {
    SITE_MAP[hostname] = siteConfig;
    logger.logSystem(`SiteRenderer: registered ${hostname} → ${siteConfig.id}`);
}

module.exports = { resolveSite, renderSite, listDomains, registerSite, SITE_MAP };
