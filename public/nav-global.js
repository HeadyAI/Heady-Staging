// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: public/nav-global.js                                                    ║
// ║  LAYER: ui/public                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * HeadyOS Global Navigation — Injected into every page
 * Sacred Geometry v4.0 — φ-scaled spacing, glass morphism
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */
(function() {
  const PAGES = [
    { href: '/', label: 'Home', icon: '⌂', group: 'core' },
    { href: '/about.html', label: 'About', icon: '∞', group: 'core' },
    { href: '/pricing.html', label: 'Pricing', icon: '◈', group: 'core' },
    { href: '/documentation.html', label: 'Docs', icon: '📖', group: 'core' },
    { href: '/api-docs.html', label: 'API', icon: '⚡', group: 'developers' },
    { href: '/developer-guide.html', label: 'Dev Guide', icon: '🛠', group: 'developers' },
    { href: '/integrations.html', label: 'Integrations', icon: '🔗', group: 'developers' },
    { href: '/headyos-desktop.html', label: 'Desktop', icon: '🖥', group: 'products' },
    { href: '/headyos-mobile.html', label: 'Mobile', icon: '📱', group: 'products' },
    { href: '/headybuddy-integrated.html', label: 'HeadyBuddy', icon: '🤖', group: 'products' },
    { href: '/pipeline.html', label: 'Pipeline', icon: '⟐', group: 'system' },
    { href: '/brain.html', label: 'Brain', icon: '🧠', group: 'system' },
    { href: '/swarm.html', label: 'Swarm', icon: '🐝', group: 'system' },
    { href: '/liquid-nodes.html', label: 'Liquid Nodes', icon: '💧', group: 'system' },
    { href: '/translator.html', label: 'Translator', icon: '🌐', group: 'system' },
    { href: '/latent-space.html', label: 'Latent Space', icon: '◉', group: 'system' },
    { href: '/colab.html', label: 'Colab Ops', icon: '☁', group: 'system' },
    { href: '/mcp-dashboard.html', label: 'MCP', icon: '⬡', group: 'system' },
    { href: '/docker-orchestrator.html', label: 'Docker', icon: '🐳', group: 'system' },
    { href: '/sacred-geometry.html', label: 'Design System', icon: 'φ', group: 'resources' },
    { href: '/security.html', label: 'Security', icon: '🛡', group: 'resources' },
    { href: '/patents.html', label: 'Patents', icon: '📜', group: 'resources' },
    { href: '/changelog.html', label: 'Changelog', icon: '📋', group: 'resources' },
    { href: '/blog.html', label: 'Blog', icon: '✍', group: 'resources' },
    { href: '/team.html', label: 'Team', icon: '👥', group: 'resources' },
    { href: '/status.html', label: 'Status', icon: '●', group: 'resources' },
    { href: '/contact.html', label: 'Contact', icon: '✉', group: 'resources' },
    { href: '/auth.html', label: 'Sign In', icon: '→', group: 'auth' },
  ];

  const GROUPS = {
    core: 'Heady',
    products: 'Products',
    system: 'System',
    developers: 'Developers',
    resources: 'Resources',
    auth: ''
  };

  const currentPath = window.location.pathname;

  function isActive(href) {
    if (href === '/') return currentPath === '/' || currentPath === '/index.html';
    return currentPath === href;
  }

  const style = document.createElement('style');
  style.textContent = `
    #heady-global-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: rgba(10, 14, 39, 0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0, 255, 200, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.3s cubic-bezier(0.618, 0, 0.382, 1);
    }
    #heady-global-nav.nav-hidden { transform: translateY(-100%); }
    .heady-nav-inner {
      max-width: 1400px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 20px; height: 55px;
    }
    .heady-nav-brand {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; color: #fff; font-weight: 700; font-size: 18px;
    }
    .heady-nav-brand-logo {
      width: 34px; height: 34px; border-radius: 50%;
      background: conic-gradient(from 0deg, #00ffc8, #ff00c8, #d4af37, #00ffc8);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; color: #0a0e27;
      box-shadow: 0 0 15px rgba(0,255,200,0.4);
    }
    .heady-nav-links {
      display: flex; align-items: center; gap: 4px; flex-wrap: nowrap;
    }
    .heady-nav-group {
      position: relative;
    }
    .heady-nav-group-btn {
      background: none; border: none; color: rgba(255,255,255,0.7);
      font-size: 13px; padding: 8px 12px; cursor: pointer;
      border-radius: 8px; transition: all 0.2s;
      font-family: inherit; display: flex; align-items: center; gap: 4px;
    }
    .heady-nav-group-btn:hover, .heady-nav-group-btn.active {
      background: rgba(0,255,200,0.1); color: #00ffc8;
    }
    .heady-nav-group-btn .arrow { font-size: 8px; transition: transform 0.2s; }
    .heady-nav-group:hover .arrow { transform: rotate(180deg); }
    .heady-nav-dropdown {
      display: none; position: absolute; top: 100%; left: 0;
      background: rgba(10, 14, 39, 0.96); backdrop-filter: blur(20px);
      border: 1px solid rgba(0,255,200,0.2); border-radius: 12px;
      padding: 8px; min-width: 200px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .heady-nav-group:hover .heady-nav-dropdown { display: block; }
    .heady-nav-dropdown a {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; color: rgba(255,255,255,0.8);
      text-decoration: none; border-radius: 8px; font-size: 13px;
      transition: all 0.15s;
    }
    .heady-nav-dropdown a:hover {
      background: rgba(0,255,200,0.1); color: #00ffc8;
    }
    .heady-nav-dropdown a.nav-active {
      background: rgba(0,255,200,0.15); color: #00ffc8;
      border-left: 2px solid #00ffc8;
    }
    .heady-nav-dropdown .nav-icon { font-size: 16px; width: 24px; text-align: center; }
    .heady-nav-signin {
      background: linear-gradient(135deg, #00ffc8, #00c8ff);
      color: #0a0e27 !important; font-weight: 600; border-radius: 20px !important;
      padding: 7px 18px !important; font-size: 12px !important;
      text-decoration: none; transition: all 0.2s;
    }
    .heady-nav-signin:hover { box-shadow: 0 0 20px rgba(0,255,200,0.5); transform: scale(1.05); }
    .heady-nav-mobile-toggle {
      display: none; background: none; border: none; color: #fff;
      font-size: 24px; cursor: pointer; padding: 8px;
    }
    @media (max-width: 900px) {
      .heady-nav-links { display: none; }
      .heady-nav-links.open {
        display: flex; flex-direction: column; position: absolute;
        top: 55px; left: 0; right: 0; background: rgba(10,14,39,0.98);
        padding: 20px; gap: 4px; border-bottom: 1px solid rgba(0,255,200,0.2);
      }
      .heady-nav-mobile-toggle { display: block; }
      .heady-nav-group:hover .heady-nav-dropdown { position: static; box-shadow: none; border: none; }
    }
    body { padding-top: 55px !important; }

    /* Footer */
    #heady-global-footer {
      background: rgba(10, 14, 39, 0.95); border-top: 1px solid rgba(0,255,200,0.1);
      padding: 60px 20px 30px; margin-top: 80px; position: relative; z-index: 1;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .footer-inner { max-width: 1400px; margin: 0 auto; }
    .footer-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 40px; margin-bottom: 40px;
    }
    .footer-col h4 { color: #00ffc8; font-size: 14px; margin-bottom: 16px; letter-spacing: 1px; text-transform: uppercase; }
    .footer-col a {
      display: block; color: rgba(255,255,255,0.6); text-decoration: none;
      font-size: 13px; padding: 4px 0; transition: color 0.2s;
    }
    .footer-col a:hover { color: #00ffc8; }
    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 10px;
    }
    .footer-copyright { color: rgba(255,255,255,0.4); font-size: 12px; }
    .footer-badges { display: flex; gap: 8px; }
    .footer-badge {
      padding: 4px 10px; border-radius: 12px; font-size: 10px;
      background: rgba(0,255,200,0.1); color: #00ffc8; border: 1px solid rgba(0,255,200,0.2);
    }
  `;
  document.head.appendChild(style);

  // Build nav
  const nav = document.createElement('nav');
  nav.id = 'heady-global-nav';
  const grouped = {};
  PAGES.forEach(p => {
    if (!grouped[p.group]) grouped[p.group] = [];
    grouped[p.group].push(p);
  });

  let linksHtml = '';
  Object.entries(GROUPS).forEach(([key, label]) => {
    if (key === 'auth') {
      const authPage = grouped.auth?.[0];
      if (authPage) linksHtml += `<a href="${authPage.href}" class="heady-nav-signin">${authPage.label}</a>`;
      return;
    }
    const items = grouped[key] || [];
    if (!items.length) return;
    const hasActive = items.some(p => isActive(p.href));
    linksHtml += `<div class="heady-nav-group">
      <button class="heady-nav-group-btn ${hasActive ? 'active' : ''}">${label} <span class="arrow">▾</span></button>
      <div class="heady-nav-dropdown">${items.map(p =>
        `<a href="${p.href}" class="${isActive(p.href) ? 'nav-active' : ''}"><span class="nav-icon">${p.icon}</span>${p.label}</a>`
      ).join('')}</div>
    </div>`;
  });

  nav.innerHTML = `<div class="heady-nav-inner">
    <a href="/" class="heady-nav-brand"><div class="heady-nav-brand-logo">H</div>HeadyOS</a>
    <div class="heady-nav-links" id="navLinks">${linksHtml}</div>
    <button class="heady-nav-mobile-toggle" onclick="document.getElementById('navLinks').classList.toggle('open')">☰</button>
  </div>`;

  document.body.prepend(nav);

  // Auto-hide on scroll
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const curr = window.scrollY;
    nav.classList.toggle('nav-hidden', curr > lastScroll && curr > 100);
    lastScroll = curr;
  });

  // Build footer
  const footer = document.createElement('footer');
  footer.id = 'heady-global-footer';
  footer.innerHTML = `<div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-col"><h4>Platform</h4>
        <a href="/headyos-desktop.html">HeadyOS Desktop</a><a href="/headyos-mobile.html">HeadyOS Mobile</a>
        <a href="/headybuddy-integrated.html">HeadyBuddy AI</a><a href="/pricing.html">Pricing</a>
      </div>
      <div class="footer-col"><h4>System</h4>
        <a href="/pipeline.html">HCFullPipeline</a><a href="/brain.html">System Brain</a>
        <a href="/swarm.html">HeadyBee Swarm</a><a href="/liquid-nodes.html">Liquid Nodes</a>
        <a href="/translator.html">Protocol Translator</a><a href="/latent-space.html">Latent Space</a>
      </div>
      <div class="footer-col"><h4>Developers</h4>
        <a href="/documentation.html">Documentation</a><a href="/api-docs.html">API Reference</a>
        <a href="/developer-guide.html">Developer Guide</a><a href="/integrations.html">Integrations</a>
        <a href="/mcp-dashboard.html">MCP Dashboard</a><a href="/sacred-geometry.html">Design System</a>
      </div>
      <div class="footer-col"><h4>Company</h4>
        <a href="/about.html">About</a><a href="/team.html">Team</a>
        <a href="/blog.html">Blog</a><a href="/patents.html">Patents (51)</a>
        <a href="/security.html">Security</a><a href="/contact.html">Contact</a>
        <a href="/changelog.html">Changelog</a><a href="/status.html">Status</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span class="footer-copyright">© 2026 HeadySystems Inc. — Eric Haywood, Founder — Sacred Geometry v4.0</span>
      <div class="footer-badges">
        <span class="footer-badge">φ 1.618</span>
        <span class="footer-badge">51 Patents</span>
        <span class="footer-badge">Post-Quantum</span>
      </div>
    </div>
  </div>`;
  document.body.appendChild(footer);
})();
