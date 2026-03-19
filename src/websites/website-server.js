/**
 * Heady™ Website Server Factory v6.0
 * Unified server for all 9 Heady websites — ports 3371-3379
 * Each site gets its own Express-like handler with domain-specific content
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../../shared/logger');
const { HealthProbe } = require('../../shared/health');
const {
  PHI, PSI, fib, SERVICE_PORTS,
  CSL_THRESHOLDS,
} = require('../../shared/phi-math');

// ═══════════════════════════════════════════════════════════
// WEBSITE DEFINITIONS — 9 domains, ports 3371-3379
// ═══════════════════════════════════════════════════════════

const WEBSITES = Object.freeze({
  'headyme.com': {
    port: 3371,
    title: 'HeadyMe — Your AI Companion',
    description: 'Personal AI companion powered by Sacred Geometry and Continuous Semantic Logic',
    theme: { primary: '#6366F1', accent: '#8B5CF6', bg: '#0F0F23' },
    sections: ['companion', 'memory', 'intelligence', 'pricing'],
    ogImage: '/assets/headyme-og.png',
  },
  'headysystems.com': {
    port: 3372,
    title: 'HeadySystems — Sovereign AI Infrastructure',
    description: 'Enterprise AI orchestration built on phi-continuous mathematics',
    theme: { primary: '#3B82F6', accent: '#06B6D4', bg: '#0A0A1B' },
    sections: ['platform', 'architecture', 'enterprise', 'contact'],
    ogImage: '/assets/headysystems-og.png',
  },
  'heady-ai.com': {
    port: 3373,
    title: 'Heady AI — Intelligence That Evolves',
    description: 'Multi-model AI routing with liquid architecture and self-healing capabilities',
    theme: { primary: '#10B981', accent: '#34D399', bg: '#0B1120' },
    sections: ['capabilities', 'models', 'api', 'docs'],
    ogImage: '/assets/heady-ai-og.png',
  },
  'headyos.com': {
    port: 3374,
    title: 'HeadyOS — The Latent Operating System',
    description: 'A living operating system where every component exists in 384-dimensional vector space',
    theme: { primary: '#F59E0B', accent: '#FBBF24', bg: '#0F0E1A' },
    sections: ['latent-os', 'vector-space', 'self-aware', 'developer'],
    ogImage: '/assets/headyos-og.png',
  },
  'headyconnection.org': {
    port: 3375,
    title: 'HeadyConnection — Community Empowerment Through Technology',
    description: '501(c)(3) nonprofit bridging AI and community development',
    theme: { primary: '#EC4899', accent: '#F472B6', bg: '#1A0A14' },
    sections: ['mission', 'programs', 'impact', 'donate'],
    ogImage: '/assets/headyconnection-og.png',
  },
  'headyconnection.com': {
    port: 3376,
    title: 'HeadyConnection — Connect With Purpose',
    description: 'Technology-driven community connections powered by AI',
    theme: { primary: '#EF4444', accent: '#F87171', bg: '#1A0B0B' },
    sections: ['connect', 'community', 'events', 'partners'],
    ogImage: '/assets/headyconnection-com-og.png',
  },
  'headyex.com': {
    port: 3377,
    title: 'HeadyEx — AI Experience Platform',
    description: 'Experience the future of AI interaction and collaboration',
    theme: { primary: '#8B5CF6', accent: '#A78BFA', bg: '#0E0B1F' },
    sections: ['experience', 'showcase', 'playground', 'gallery'],
    ogImage: '/assets/headyex-og.png',
  },
  'headyfinance.com': {
    port: 3378,
    title: 'HeadyFinance — AI-Powered Financial Intelligence',
    description: 'Financial analysis and portfolio management through phi-harmonic models',
    theme: { primary: '#14B8A6', accent: '#2DD4BF', bg: '#0A1A1A' },
    sections: ['analysis', 'portfolio', 'signals', 'risk'],
    ogImage: '/assets/headyfinance-og.png',
  },
  'admin.headysystems.com': {
    port: 3379,
    title: 'Heady Admin — System Control Plane',
    description: 'Administrative dashboard for the Heady ecosystem',
    theme: { primary: '#6B7280', accent: '#9CA3AF', bg: '#111111' },
    sections: ['dashboard', 'services', 'agents', 'monitoring'],
    ogImage: '/assets/admin-og.png',
    requireAuth: true,
  },
});

// ═══════════════════════════════════════════════════════════
// WEBSITE SERVER CLASS
// ═══════════════════════════════════════════════════════════

class WebsiteServer {
  constructor(domain, config) {
    this.domain = domain;
    this.config = config;
    this.logger = createLogger(`website-${domain}`);
    this.health = new HealthProbe(`website-${domain}`);
    this.server = null;
    this.requestCount = 0;
  }

  async start() {
    this.server = http.createServer((req, res) => this._handleRequest(req, res));

    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        this.logger.info({
          message: 'Website server started',
          domain: this.domain,
          port: this.config.port,
        });
        this.health.markReady();
        resolve();
      });
    });
  }

  _handleRequest(req, res) {
    this.requestCount++;
    const url = new URL(req.url, `http://${process.env.HOST || "localhost"}:${this.config.port}`);

    // Security headers
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this._buildCSP(),
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    // Routes
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.health.getStatus()));
      return;
    }

    if (url.pathname === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        domain: this.domain,
        title: this.config.title,
        sections: this.config.sections,
        theme: this.config.theme,
      }));
      return;
    }

    if (url.pathname === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(this._generateRobotsTxt());
      return;
    }

    if (url.pathname === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(this._generateSitemap());
      return;
    }

    // Serve the SPA shell
    res.writeHead(200, headers);
    res.end(this._renderPage(url.pathname));
  }

  _renderPage(pathname) {
    const { title, description, theme, sections, ogImage } = this.config;
    const section = pathname === '/' ? sections[0] : pathname.slice(1);

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://${this.domain}${ogImage}">
  <meta property="og:url" content="https://${this.domain}${pathname}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://${this.domain}${pathname}">
  <style>
    :root {
      --phi: 1.618;
      --psi: 0.618;
      --primary: ${theme.primary};
      --accent: ${theme.accent};
      --bg: ${theme.bg};
      --text: #E2E8F0;
      --text-muted: #94A3B8;
      --surface: rgba(255,255,255,0.05);
      --border: rgba(255,255,255,0.08);
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: calc(1em * var(--phi));
    }
    
    /* Sacred Geometry grid */
    .grid { display: grid; gap: calc(1rem * var(--psi)); }
    .grid-phi { grid-template-columns: calc(100% * var(--psi)) 1fr; }
    
    /* Header */
    header {
      padding: calc(1rem * var(--phi)) calc(2rem * var(--phi));
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(13px);
      position: sticky;
      top: 0;
      z-index: 89;
    }
    
    .logo {
      font-size: calc(1rem * var(--phi));
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    nav a {
      color: var(--text-muted);
      text-decoration: none;
      margin-left: calc(1rem * var(--phi));
      transition: color 0.21s;
      font-size: 0.89rem;
    }
    nav a:hover, nav a.active { color: var(--primary); }
    
    /* Hero */
    .hero {
      padding: calc(5rem * var(--psi)) calc(2rem * var(--phi));
      text-align: center;
      max-width: 55rem;
      margin: 0 auto;
    }
    
    .hero h1 {
      font-size: calc(2rem * var(--phi));
      font-weight: 800;
      margin-bottom: calc(1rem * var(--psi));
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .hero p {
      font-size: calc(1rem * var(--phi) * var(--psi));
      color: var(--text-muted);
      max-width: 34rem;
      margin: 0 auto calc(2rem * var(--psi));
    }
    
    .cta {
      display: inline-block;
      padding: calc(0.5rem * var(--phi)) calc(1.5rem * var(--phi));
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white;
      border-radius: calc(0.5rem * var(--psi));
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.21s, box-shadow 0.21s;
    }
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 21px rgba(99,102,241,0.3);
    }
    
    /* Sections */
    .section {
      padding: calc(3rem * var(--psi)) calc(2rem * var(--phi));
      max-width: 55rem;
      margin: 0 auto;
    }
    
    .section h2 {
      font-size: calc(1.5rem * var(--psi) * var(--phi));
      margin-bottom: calc(1rem * var(--psi));
      color: var(--primary);
    }
    
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(calc(13rem * var(--phi)), 1fr));
      gap: calc(1rem * var(--psi));
    }
    
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: calc(0.5rem * var(--phi));
      padding: calc(1rem * var(--phi));
      transition: border-color 0.21s, transform 0.21s;
    }
    .card:hover {
      border-color: var(--primary);
      transform: translateY(-3px);
    }
    
    .card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
    .card p { color: var(--text-muted); font-size: 0.89rem; }
    
    /* Footer */
    footer {
      padding: calc(2rem * var(--psi)) calc(2rem * var(--phi));
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    
    /* Phi animation */
    @keyframes phiPulse {
      0%, 100% { opacity: 0.618; }
      50% { opacity: 1; }
    }
    
    .loading { animation: phiPulse 1.618s ease-in-out infinite; }
    
    /* Mobile */
    @media (max-width: 610px) {
      header { flex-direction: column; gap: 0.5rem; }
      nav a { margin-left: calc(0.5rem * var(--phi)); }
      .hero h1 { font-size: calc(1.5rem * var(--phi)); }
      .grid-phi { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">${title.split('—')[0].trim()}</div>
    <nav>
      ${sections.map(s => `<a href="/${s}" ${s === section ? 'class="active"' : ''}>${_capitalize(s)}</a>`).join('\n      ')}
    </nav>
  </header>
  
  <main>
    <div class="hero">
      <h1>${title}</h1>
      <p>${description}</p>
      <a href="/${sections[0]}" class="cta">Get Started</a>
    </div>
    
    <div class="section">
      <h2>Powered by Sacred Geometry</h2>
      <div class="cards">
        <div class="card">
          <h3>Phi-Continuous</h3>
          <p>Every parameter derives from the golden ratio — no magic numbers, pure mathematical harmony.</p>
        </div>
        <div class="card">
          <h3>384D Vector Space</h3>
          <p>All system state represented in high-dimensional embedding space for semantic reasoning.</p>
        </div>
        <div class="card">
          <h3>Self-Healing</h3>
          <p>Continuous coherence monitoring with automatic drift detection and recovery cycles.</p>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>The Heady Ecosystem</h2>
      <div class="cards">
        ${sections.map(s => `
        <div class="card">
          <h3>${_capitalize(s)}</h3>
          <p>Explore ${_capitalize(s).toLowerCase()} capabilities within the ${this.domain} ecosystem.</p>
        </div>`).join('')}
      </div>
    </div>
  </main>
  
  <footer>
    <p>&copy; ${new Date().getFullYear()} HeadySystems Inc. — Founded by Eric Haywood</p>
    <p>Built with Sacred Geometry &bull; Phi-Continuous Architecture &bull; 384D Vector Space</p>
  </footer>
  
  <script>
    // Client-side routing (SPA)
    document.querySelectorAll('nav a, .cta').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        history.pushState(null, '', href);
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
      });
    });
    
    window.addEventListener('popstate', () => {
      const path = location.pathname.slice(1) || '${sections[0]}';
      document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '/' + path);
      });
    });
  </script>
</body>
</html>`;
  }

  _buildCSP() {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.headysystems.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }

  _generateRobotsTxt() {
    if (this.config.requireAuth) {
      return 'User-agent: *\nDisallow: /\n';
    }
    return `User-agent: *\nAllow: /\nSitemap: https://${this.domain}/sitemap.xml\n`;
  }

  _generateSitemap() {
    const urls = ['/', ...this.config.sections.map(s => `/${s}`)];
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>https://${this.domain}${u}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
  }

  async shutdown() {
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
    }
    this.logger.info({ message: 'Website server stopped', domain: this.domain });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════

function _capitalize(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ═══════════════════════════════════════════════════════════
// MULTI-SITE LAUNCHER — Start all 9 websites
// ═══════════════════════════════════════════════════════════

async function startAllWebsites() {
  const logger = createLogger('website-launcher');
  const servers = [];

  for (const [domain, config] of Object.entries(WEBSITES)) {
    try {
      const server = new WebsiteServer(domain, config);
      await server.start();
      servers.push(server);
    } catch (error) {
      logger.error({ message: 'Failed to start website', domain, error: error.message });
    }
  }

  logger.info({ message: 'All websites started', count: servers.length });
  return servers;
}

// ═══════════════════════════════════════════════════════════
// STANDALONE — Launch single site or all
// ═══════════════════════════════════════════════════════════

if (require.main === module) {
  const targetDomain = process.env.HEADY_WEBSITE_DOMAIN;

  if (targetDomain && WEBSITES[targetDomain]) {
    const server = new WebsiteServer(targetDomain, WEBSITES[targetDomain]);
    server.start().catch(err => {
      createLogger('website').error({ message: 'Startup failed', error: err.message });
      process.exit(1);
    });
  } else {
    startAllWebsites().catch(err => {
      createLogger('website').error({ message: 'Multi-site startup failed', error: err.message });
      process.exit(1);
    });
  }
}

module.exports = { WebsiteServer, WEBSITES, startAllWebsites };
