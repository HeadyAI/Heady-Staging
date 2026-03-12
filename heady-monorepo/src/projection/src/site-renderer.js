/**
 * Site Renderer — Projected Domain Rendering Engine
 *
 * This is a projected copy of the site rendering engine.
 * It renders HTML pages for standalone Heady™ domain sites.
 * © 2026 Heady™Systems Inc.
 */

'use strict';

/**
 * Render a complete HTML page for a domain site.
 * @param {object} siteConfig - The site configuration object
 * @param {string} domain - The domain being rendered
 * @returns {string} - Full HTML string
 */
function renderSite(siteConfig, domain) {
    const name = siteConfig.name || 'Heady';
    const tagline = siteConfig.tagline || 'Powered by the Heady Latent OS';
    const description = siteConfig.description || '';
    const primaryColor = siteConfig.primaryColor || '#6B5BFF';
    const icon = siteConfig.icon || '🐝';

    const featureItems = (siteConfig.features || [])
        .map((f) => `<li><strong>${f.icon || ''} ${f.title}</strong> — ${f.desc || ''}</li>`)
        .join('\n        ');

    const statsItems = (siteConfig.stats || [])
        .map((s) => `<div class="stat"><span class="stat-value">${s.value}</span><span class="stat-label">${s.label}</span></div>`)
        .join('\n        ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${tagline}</title>
  <meta name="description" content="${description}">
  <style>
    :root { --primary: ${primaryColor}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f0f0f0; }
    .hero { padding: 80px 40px; text-align: center; background: linear-gradient(135deg, #0a0a0a, #1a1a2e); }
    .hero h1 { font-size: 3rem; color: var(--primary); margin-bottom: 16px; }
    .hero p { font-size: 1.25rem; color: #aaa; max-width: 600px; margin: 0 auto; }
    .features { padding: 60px 40px; max-width: 900px; margin: 0 auto; }
    .features ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .features li { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 20px; }
    .stats { display: flex; justify-content: center; gap: 40px; padding: 40px; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 2rem; font-weight: bold; color: var(--primary); }
    .stat-label { font-size: 0.875rem; color: #aaa; }
    footer { text-align: center; padding: 40px; color: #555; font-size: 0.875rem; border-top: 1px solid #222; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${icon} ${name}</h1>
    <p>${tagline}</p>
  </div>
  ${featureItems ? `<section class="features"><ul>${featureItems}</ul></section>` : ''}
  ${statsItems ? `<div class="stats">${statsItems}</div>` : ''}
  <footer>
    <p>© 2026 Heady™Systems Inc. · ${domain} · Projected from the Heady™ Latent OS</p>
  </footer>
</body>
</html>`;
}

/**
 * Render a minimal health-check HTML page.
 */
function renderHealth(siteConfig) {
    return `<html><body><h1>${siteConfig.name || 'Heady'} — OK</h1></body></html>`;
}

module.exports = { renderSite, renderHealth };
