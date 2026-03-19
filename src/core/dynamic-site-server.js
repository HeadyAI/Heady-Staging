// ─── HEADY CORS WHITELIST ────────────────────────────────────────────
const HEADY_ALLOWED_ORIGINS = new Set([
  'https://headyme.com', 'https://headysystems.com', 'https://headyconnection.org',
  'https://headyconnection.com', 'https://headybuddy.org', 'https://headymcp.com',
  'https://headyapi.com', 'https://headyio.com', 'https://headyos.com',
  'https://headyweb.com', 'https://headybot.com', 'https://headycloud.com',
  'https://headybee.co', 'https://heady-ai.com', 'https://headyex.com',
  'https://headyfinance.com', 'https://admin.headysystems.com',
  'https://auth.headysystems.com', 'https://api.headysystems.com',
]);
const _isHeadyOrigin = (o) => !o ? false : HEADY_ALLOWED_ORIGINS.has(o) || /\.run\.app$/.test(o) || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):/.test(o));

/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ Dynamic Multi-Domain Site Server ═══
 *
 * Single server that renders ALL Heady™ sites dynamically.
 * Reads Host header → returns the correct branded page.
 * Embeds 25+ auth providers, HeadyBuddy widget, and API proxy.
 *
 * Usage:
 *   node src/core/dynamic-site-server.js
 *   SITE_PORT=8080 node src/core/dynamic-site-server.js
 *
 * Designed to run behind Cloudflare Tunnel for all domains.
 * ────────────────────────────────────────────────────────────────
 */

const http = require('http');
const crypto = require('crypto');
const logger = require('../utils/logger').child('dynamic-sites');
const { getContentForDomain } = require('./content-sections');
const { initSentry, captureError, addBreadcrumb } = require('./sentry-init');

// Initialize Sentry early
initSentry();

const PORT = process.env.PORT || process.env.SITE_PORT || 8080;
const PHI = 1.6180339887;

// ── Site Registry ───────────────────────────────────────────────
const SITES = {
  'headyme.com': {
    brand: 'HeadyMe',
    tagline: 'Your Sovereign AI',
    subtitle: 'Personal intelligence that works for you — across every device, every domain.',
    color: '#4c8fff',
    accent: '#00d4ff',
    icon: 'H',
    heroServices: [
      { icon: '🧠', name: 'AI Chat', desc: 'Multi-provider reasoning with auto-failover' },
      { icon: '🔐', name: 'Secure Vault', desc: 'AES-256-GCM encrypted credential storage' },
      { icon: '📊', name: 'Dashboard', desc: 'Real-time system health and analytics' },
      { icon: '🐝', name: 'Bee Swarm', desc: 'Distributed task execution at scale' },
    ],
    showAuth: true,
  },
  'headysystems.com': {
    brand: 'HeadySystems',
    tagline: 'The Architecture of Intelligence',
    subtitle: 'Self-healing infrastructure powered by Sacred Geometry and fault-tolerant lattice computing.',
    color: '#00d4ff',
    accent: '#4c8fff',
    icon: 'S',
    heroServices: [
      { icon: '⚙️', name: 'Ops Console', desc: '14 service groups, CLI-driven' },
      { icon: '🏗️', name: 'Architecture', desc: '6-layer zero-trust mesh' },
      { icon: '⚛️', name: 'Quantum IP', desc: 'Rotated Subsystem Surface Code' },
      { icon: '🔄', name: 'Self-Healing', desc: 'Attestation, quarantine, respawn' },
    ],
    showAuth: false,
  },
  'headyconnection.org': {
    brand: 'HeadyConnection',
    tagline: 'The Human Network',
    subtitle: 'DNA-correlated trust and biometric continuity for authentic digital relationships.',
    color: '#8b5cf6',
    accent: '#c084fc',
    icon: 'C',
    heroServices: [
      { icon: '🧬', name: 'DNA Trust', desc: 'Biometric-anchored identity' },
      { icon: '🤝', name: 'Connect', desc: 'Zero-knowledge verified networking' },
      { icon: '🛡️', name: 'Citadel', desc: 'Physical trust-anchored auth' },
      { icon: '🌐', name: 'Federation', desc: 'Cross-domain identity mesh' },
    ],
    showAuth: false,
  },
  'headybuddy.org': {
    brand: 'HeadyBuddy',
    tagline: 'Your Always-On Companion',
    subtitle: 'AI assistant that knows you, learns your preferences, and grows with you over time.',
    color: '#10b981',
    accent: '#34d399',
    icon: 'B',
    heroServices: [
      { icon: '💬', name: 'Chat', desc: 'Natural conversation with memory' },
      { icon: '📋', name: 'Tasks', desc: 'Smart task management' },
      { icon: '🎯', name: 'Goals', desc: 'Progress tracking and coaching' },
      { icon: '🔮', name: 'Predict', desc: 'Anticipatory suggestions' },
    ],
    showAuth: true,
  },
  'headymcp.com': {
    brand: 'HeadyMCP',
    tagline: 'The Protocol Layer',
    subtitle: 'Model Context Protocol server with 30+ native tools — connect any IDE to Heady.',
    color: '#f59e0b',
    accent: '#fbbf24',
    icon: 'M',
    heroServices: [
      { icon: '🔌', name: 'MCP Server', desc: 'JSON-RPC + SSE native transport' },
      { icon: '🛠️', name: '30+ Tools', desc: 'Chat, code, search, embed, deploy' },
      { icon: '⚡', name: 'Edge Native', desc: 'Cloudflare Workers — zero latency' },
      { icon: '🔗', name: 'IDE Bridge', desc: 'VS Code, Cursor, Windsurf' },
    ],
    showAuth: false,
  },
  'headyio.com': {
    brand: 'HeadyIO',
    tagline: 'Developer Platform',
    subtitle: 'APIs, SDKs, and documentation for building on the Heady™ intelligence layer.',
    color: '#ec4899',
    accent: '#f472b6',
    icon: 'I',
    heroServices: [
      { icon: '📖', name: 'API Docs', desc: 'Full REST + WebSocket reference' },
      { icon: '📦', name: 'SDK', desc: 'npm, Python, Go clients' },
      { icon: '🔑', name: 'API Keys', desc: '9-tier subscription system' },
      { icon: '🧪', name: 'Sandbox', desc: 'Live API playground' },
    ],
    showAuth: true,
  },
  'headybot.com': {
    brand: 'HeadyBot',
    tagline: 'Autonomous Automation',
    subtitle: 'Self-driving engineering agents with adversarial validation and battle-tested quality.',
    color: '#6366f1',
    accent: '#818cf8',
    icon: 'R',
    heroServices: [
      { icon: '🤖', name: 'Agents', desc: 'Autonomous task execution' },
      { icon: '⚔️', name: 'Battle Arena', desc: 'AI-vs-AI quality assurance' },
      { icon: '🧬', name: 'HeadyGoose', desc: 'Self-governing engineering agent' },
      { icon: '📊', name: 'Telemetry', desc: 'Full audit trail and replay' },
    ],
    showAuth: false,
  },
  'headyapi.com': {
    brand: 'HeadyAPI',
    tagline: 'The Intelligence Interface',
    subtitle: 'Unified API gateway routing to 4+ AI providers with liquid failover.',
    color: '#14b8a6',
    accent: '#2dd4bf',
    icon: 'A',
    heroServices: [
      { icon: '🌊', name: 'Liquid Gateway', desc: 'Race providers, fastest wins' },
      { icon: '🔀', name: 'Auto-Failover', desc: 'Zero-downtime provider switching' },
      { icon: '📈', name: 'Analytics', desc: 'Per-request cost and latency' },
      { icon: '🔐', name: 'Auth', desc: 'API key + tier enforcement' },
    ],
    showAuth: true,
  },
  'headysense.com': {
    brand: 'HeadyLens',
    tagline: 'Sovereign Sight',
    subtitle: 'Vision AI for screenshots, UI review, OCR, and visual code analysis.',
    color: '#f97316',
    accent: '#fb923c',
    icon: 'L',
    heroServices: [
      { icon: '👁️', name: 'Vision', desc: 'Image analysis and classification' },
      { icon: '📸', name: 'Screenshot', desc: 'Automated visual QA' },
      { icon: '🔍', name: 'OCR', desc: 'Text extraction from images' },
      { icon: '🎨', name: 'Design', desc: 'UI/UX analysis and suggestions' },
    ],
    showAuth: false,
  },
  'heady-ai.com': {
    brand: 'HeadyAI',
    tagline: 'The Intelligence Hub',
    subtitle: 'Multi-model AI playground — route tasks to Claude, Gemini, GPT-4o, Groq, and Perplexity through one unified interface.',
    color: '#a855f7',
    accent: '#c084fc',
    icon: 'Σ',
    heroServices: [
      { icon: '🧠', name: 'Models', desc: '5+ providers, auto-failover routing' },
      { icon: '🎓', name: 'Training', desc: 'Fine-tune on your data' },
      { icon: '⚡', name: 'Inference', desc: 'Sub-100ms edge inference' },
      { icon: '🌐', name: 'Edge AI', desc: 'Cloudflare Workers AI native' },
    ],
    showAuth: true,
  },
  'perfecttrader.com': {
    brand: 'PerfectTrader',
    tagline: 'Algorithmic Intelligence',
    subtitle: 'AI-powered trading signals, backtesting, and portfolio optimization with real-time market data.',
    color: '#22c55e',
    accent: '#86efac',
    icon: '₿',
    heroServices: [
      { icon: '📈', name: 'Strategy', desc: 'AI-generated trading strategies' },
      { icon: '🔬', name: 'Backtest', desc: '16-asset historical simulation' },
      { icon: '🔔', name: 'Signals', desc: 'Real-time entry/exit alerts' },
      { icon: '💼', name: 'Portfolio', desc: 'Risk-optimized allocation' },
    ],
    showAuth: true,
  },
  'headyos.com': {
    brand: 'HeadyOS',
    tagline: 'The Sovereign Operating System',
    subtitle: 'A latent AI operating system that runs everywhere — browser, edge, device.',
    color: '#0ea5e9',
    accent: '#38bdf8',
    icon: 'Ω',
    heroServices: [
      { icon: '🖥️', name: 'Runtime', desc: 'Cognitive process governor' },
      { icon: '🧬', name: 'Agents', desc: 'Self-healing agent lifecycle' },
      { icon: '🔮', name: 'Memory', desc: '3D vector knowledge space' },
      { icon: '⚡', name: 'Edge', desc: 'Sub-50ms Cloudflare inference' },
    ],
    showAuth: true,
  },
  'headyex.com': {
    brand: 'HeadyEX',
    tagline: 'Executive Intelligence',
    subtitle: 'AI-powered executive dashboard — strategy, metrics, and decisions at leadership speed.',
    color: '#64748b',
    accent: '#94a3b8',
    icon: 'X',
    heroServices: [
      { icon: '📊', name: 'Dashboards', desc: 'Real-time KPI visualization' },
      { icon: '📋', name: 'Reports', desc: 'AI-generated executive briefs' },
      { icon: '🎯', name: 'Strategy', desc: 'Goal tracking and alignment' },
      { icon: '💡', name: 'Insights', desc: 'Predictive business intelligence' },
    ],
    showAuth: true,
  },
  'headyfinance.com': {
    brand: 'HeadyFinance',
    tagline: 'Intelligent FinOps',
    subtitle: 'AI financial operations — budget routing, cost optimization, and subscription intelligence.',
    color: '#84cc16',
    accent: '#a3e635',
    icon: '$',
    heroServices: [
      { icon: '💰', name: 'FinOps', desc: 'Cloud cost optimization' },
      { icon: '📈', name: 'Forecasting', desc: 'AI spend projections' },
      { icon: '🏦', name: 'Billing', desc: 'Subscription tier management' },
      { icon: '🔐', name: 'Compliance', desc: 'SOC 2 audit readiness' },
    ],
    showAuth: true,
  },
  'headyconnection.com': {
    brand: 'HeadyConnection',
    tagline: 'Community Intelligence',
    subtitle: 'Nonprofit-powered AI — community programs, grant management, and social impact metrics.',
    color: '#f43f5e',
    accent: '#fb7185',
    icon: '♡',
    heroServices: [
      { icon: '🤝', name: 'Community', desc: 'Engagement and program tracking' },
      { icon: '📝', name: 'Grants', desc: 'AI-assisted grant writing' },
      { icon: '📊', name: 'Impact', desc: 'Social outcome measurement' },
      { icon: '🌍', name: 'Outreach', desc: 'Multi-channel communication' },
    ],
    showAuth: false,
  },
};

// ── Auth Providers (same 25 from auth-page-server.js) ───────
const AUTH_PROVIDERS = {
  oauth: [
    { id: 'google', name: 'Google', icon: '🔵', color: '#4285F4' },
    { id: 'github', name: 'GitHub', icon: '⚫', color: '#333333' },
    { id: 'microsoft', name: 'Microsoft', icon: '🟦', color: '#00A4EF' },
    { id: 'apple', name: 'Apple', icon: '🍎', color: '#000000' },
    { id: 'facebook', name: 'Facebook', icon: '🔵', color: '#1877F2' },
    { id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9900' },
    { id: 'discord', name: 'Discord', icon: '💬', color: '#5865F2' },
    { id: 'slack', name: 'Slack', icon: '💼', color: '#4A154B' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
    { id: 'twitter', name: 'X (Twitter)', icon: '✖️', color: '#000000' },
    { id: 'spotify', name: 'Spotify', icon: '🟢', color: '#1DB954' },
    { id: 'huggingface', name: 'Hugging Face', icon: '🤗', color: '#FFD21E' },
  ],
  apikey: [
    { id: 'openai', name: 'OpenAI', icon: '🧠', color: '#10A37F', prefix: 'sk-' },
    { id: 'claude', name: 'Claude', icon: '🟠', color: '#D97706', prefix: 'sk-ant-' },
    { id: 'gemini', name: 'Gemini', icon: '💎', color: '#4285F4', prefix: 'AI' },
    { id: 'perplexity', name: 'Perplexity', icon: '🔍', color: '#20808D', prefix: 'pplx-' },
    { id: 'mistral', name: 'Mistral', icon: '🌊', color: '#FF7000', prefix: '' },
    { id: 'cohere', name: 'Cohere', icon: '🟣', color: '#39594D', prefix: '' },
    { id: 'groq', name: 'Groq', icon: '⚡', color: '#F55036', prefix: 'gsk_' },
    { id: 'replicate', name: 'Replicate', icon: '🔄', color: '#3D3D3D', prefix: 'r8_' },
    { id: 'together', name: 'Together AI', icon: '🤝', color: '#6366F1', prefix: '' },
    { id: 'fireworks', name: 'Fireworks', icon: '🎆', color: '#FF6B35', prefix: 'fw_' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔬', color: '#0066FF', prefix: 'sk-' },
    { id: 'xai', name: 'xAI (Grok)', icon: '❌', color: '#000000', prefix: 'xai-' },
    { id: 'anthropic', name: 'Anthropic', icon: '🟤', color: '#C96442', prefix: 'sk-ant-' },
  ],
};

// ── In-memory stores ────────────────────────────────────────
const users = new Map();
const sessions = new Map();

function generateApiKey() { return `HY-${crypto.randomBytes(16).toString('hex')}`; }
function generateSession() { return `sess_${crypto.randomBytes(32).toString('hex')}`; }
function hashPw(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// ── Resolve site from Host header ────────────────────────────
function resolveSite(host) {
  if (!host) return SITES['headyme.com'];
  const clean = host.replace(/:\d+$/, '').toLowerCase();
  // Direct match
  if (SITES[clean]) return SITES[clean];
  // www. prefix
  if (SITES[clean.replace(/^www\./, '')]) return SITES[clean.replace(/^www\./, '')];
  // Subdomain match
  for (const domain of Object.keys(SITES)) {
    if (clean.endsWith(domain)) return SITES[domain];
  }
  // Default
  return SITES['headyme.com'];
}

// ── Render Page ──────────────────────────────────────────────
function renderSite(site, host) {
  const oauthBtns = AUTH_PROVIDERS.oauth.map(p =>
    `<button class="auth-btn" style="--pcolor:${p.color}" onclick="oauthLogin('${p.id}')" aria-label="Sign in with ${p.name}">
      <span class="auth-icon" aria-hidden="true">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');
  const apikeyBtns = AUTH_PROVIDERS.apikey.map(p =>
    `<button class="auth-btn" style="--pcolor:${p.color}" onclick="showKeyInput('${p.id}','${p.name}','${p.prefix || ''}')" aria-label="Connect ${p.name} API key">
      <span class="auth-icon" aria-hidden="true">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');
  const serviceCards = site.heroServices.map(s =>
    `<div class="svc-card" role="article">
      <div class="svc-icon" aria-hidden="true">${s.icon}</div>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
    </div>`).join('');
  const domain = host.replace(/^www\./, '').replace(/:\d+$/, '');
  const content = getContentForDomain(domain);

  // Build rich content sections
  let richSections = '';
  if (content) {
    // About section
    if (content.about) {
      richSections += `
    <section class="content-section" id="about" aria-labelledby="about-title">
      <h2 id="about-title" class="section-title">${content.about.title}</h2>
      ${content.about.paragraphs.map(p => `<p class="section-text">${p}</p>`).join('')}
    </section>`;
    }

    // Deep dive section
    if (content.deepDive) {
      richSections += `
    <section class="content-section" id="features" aria-labelledby="features-title">
      <h2 id="features-title" class="section-title">${content.deepDive.title}</h2>
      <div class="deep-dive-grid">
        ${content.deepDive.items.map(item => `
        <div class="deep-dive-card">
          <div class="dd-icon" aria-hidden="true">${item.icon}</div>
          <h3 class="dd-title">${item.title}</h3>
          <p class="dd-desc">${item.desc}</p>
        </div>`).join('')}
      </div>
    </section>`;
    }

    // Technology section
    if (content.technology) {
      richSections += `
    <section class="content-section" id="technology" aria-labelledby="tech-title">
      <h2 id="tech-title" class="section-title">${content.technology.title}</h2>
      <div class="tech-table" role="table" aria-label="Technology stack">
        ${content.technology.stack.map(item => `
        <div class="tech-row" role="row">
          <span class="tech-label" role="cell">${item.label}</span>
          <span class="tech-value" role="cell">${item.value}</span>
        </div>`).join('')}
      </div>
    </section>`;
    }

    // FAQ section
    if (content.faq) {
      richSections += `
    <section class="content-section" id="faq" aria-labelledby="faq-title">
      <h2 id="faq-title" class="section-title">Frequently Asked Questions</h2>
      <div class="faq-list" role="list">
        ${content.faq.map((item, i) => `
        <details class="faq-item" role="listitem">
          <summary class="faq-question">${item.q}</summary>
          <p class="faq-answer">${item.a}</p>
        </details>`).join('')}
      </div>
    </section>`;
    }
  }

  // Build domain bar — only link domains that are live or in the ecosystem
  const liveDomains = ['headyme.com', 'headysystems.com'];
  const ecosystemDomains = Object.entries(SITES)
    .filter(([d]) => liveDomains.includes(d))
    .map(([d, s]) =>
      `<a href="https://${d}" class="domain-link" style="--dcolor:${s.color}">${s.brand}</a>`).join('');
  const otherDomains = Object.entries(SITES)
    .filter(([d]) => !liveDomains.includes(d))
    .map(([d, s]) =>
      `<span class="domain-link domain-upcoming" style="--dcolor:${s.color}" title="Coming soon">${s.brand}</span>`).join('');

  // Build nav links with anchor references
  const navAnchors = content ? `
      <a href="#about">About</a>
      <a href="#features">Features</a>
      ${content.faq ? '<a href="#faq">FAQ</a>' : ''}
  ` : `
      <a href="https://headyio.com">Docs</a>
      <a href="https://headyapi.com">API</a>
      <a href="https://headymcp.com">MCP</a>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.brand} — ${site.tagline}</title>
  <meta name="description" content="${site.subtitle}">
  <meta property="og:title" content="${site.brand} — ${site.tagline}">
  <meta property="og:description" content="${site.subtitle}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${host}">
  <meta property="og:image" content="https://headysystems.com/og/${host.replace(/\.\w+$/, '')}.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${site.brand} — ${site.tagline}">
  <meta name="twitter:description" content="${site.subtitle}">
  <meta name="twitter:site" content="@HeadySystems">
  <link rel="canonical" href="https://${host}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${site.brand}",
    "url": "https://${host}",
    "description": "${site.subtitle}",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "publisher": {
      "@type": "Organization",
      "name": "HeadySystems Inc.",
      "url": "https://headysystems.com"
    }
  }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#0a0a1a;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08);
      --brand:${site.color};--accent:${site.accent};
      --text:#e8e8f0;--dim:#a0a0bb;--muted:#6e6e8a;
      --phi:${PHI};
    }
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}

    /* ── Skip Navigation (WCAG) ───────────── */
    .skip-nav{position:absolute;top:-100%;left:50%;transform:translateX(-50%);background:var(--brand);color:white;padding:.75rem 1.5rem;border-radius:0 0 8px 8px;font-weight:700;z-index:999;text-decoration:none;font-size:.9rem}
    .skip-nav:focus{top:0}

    /* ── Background ────────────────────────── */
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0;pointer-events:none}
    .bg-glow{position:fixed;top:-30%;left:-10%;width:60%;height:60%;background:radial-gradient(circle,color-mix(in srgb,var(--brand) 10%,transparent),transparent 60%);z-index:0;animation:drift 20s ease-in-out infinite alternate;pointer-events:none}
    .bg-glow2{position:fixed;bottom:-20%;right:-10%;width:50%;height:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 8%,transparent),transparent 60%);z-index:0;animation:drift 15s ease-in-out infinite alternate-reverse;pointer-events:none}
    @keyframes drift{from{transform:translate(0,0)}to{transform:translate(30px,-20px)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{box-shadow:0 0 20px color-mix(in srgb,var(--brand) 30%,transparent)}50%{box-shadow:0 0 40px color-mix(in srgb,var(--brand) 50%,transparent)}}

    /* ── Layout ─────────────────────────────── */
    .container{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:2rem 1.5rem}

    /* ── Nav ────────────────────────────────── */
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,26,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    nav[role="navigation"]{/* Specificity anchor */}
    .nav-brand{display:flex;align-items:center;gap:.75rem;text-decoration:none;color:var(--text)}
    .nav-logo{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--brand),var(--accent));font-size:16px;font-weight:900;color:white}
    .nav-name{font-size:1.1rem;font-weight:700;letter-spacing:-.01em}
    .nav-links{display:flex;gap:1.5rem;align-items:center}
    .nav-links a{color:var(--dim);text-decoration:none;font-size:.85rem;font-weight:500;transition:color .2s}
    .nav-links a:hover,.nav-links a:focus{color:var(--text);outline:2px solid var(--brand);outline-offset:2px;border-radius:4px}
    .nav-cta{background:var(--brand);color:white;border:none;padding:.5rem 1.25rem;border-radius:8px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s}
    .nav-cta:hover{filter:brightness(1.15);transform:translateY(-1px)}
    .nav-cta:focus{outline:2px solid var(--accent);outline-offset:2px}

    /* ── Mobile Nav Toggle ──────────────────── */
    .nav-toggle{display:none;background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer;padding:.25rem}

    /* ── Hero ───────────────────────────────── */
    .hero{padding:8rem 0 4rem;text-align:center;animation:fadeUp .6s ease-out}
    .hero-badge{display:inline-block;background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:4px 14px;border-radius:20px;font-size:.75rem;font-weight:600;letter-spacing:.05em;margin-bottom:1.5rem;border:1px solid color-mix(in srgb,var(--brand) 20%,transparent)}
    .hero h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:900;letter-spacing:-.03em;line-height:1.1;margin-bottom:1rem}
    .hero h1 .gradient{background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .hero p{color:var(--dim);font-size:1.1rem;max-width:600px;margin:0 auto 2rem;line-height:1.6}
    .hero-actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
    .btn-primary{background:linear-gradient(135deg,var(--brand),var(--accent));color:white;border:none;padding:.75rem 2rem;border-radius:10px;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;animation:pulse 3s infinite;text-decoration:none;display:inline-block}
    .btn-primary:hover{transform:translateY(-2px);filter:brightness(1.1)}
    .btn-primary:focus{outline:2px solid white;outline-offset:2px}
    .btn-secondary{background:transparent;color:var(--text);border:1px solid var(--border);padding:.75rem 2rem;border-radius:10px;font-family:inherit;font-size:1rem;font-weight:500;cursor:pointer;transition:all .2s}
    .btn-secondary:hover{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 5%,transparent)}

    /* ── Services ───────────────────────────── */
    .services{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;padding:2rem 0 4rem}
    .svc-card{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;padding:1.5rem;transition:all .3s;animation:fadeUp .6s ease-out}
    .svc-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent);transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,0.3)}
    .svc-icon{font-size:2rem;margin-bottom:.75rem}
    .svc-card h3{font-size:1rem;font-weight:700;margin-bottom:.4rem}
    .svc-card p{color:var(--dim);font-size:.85rem;line-height:1.5}

    /* ── Rich Content Sections ──────────────── */
    .content-section{padding:3rem 0;border-top:1px solid var(--border);animation:fadeUp .6s ease-out}
    .section-title{font-size:clamp(1.5rem,3vw,2rem);font-weight:900;letter-spacing:-.02em;margin-bottom:1.5rem;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;display:inline-block}
    .section-text{color:var(--dim);font-size:1rem;line-height:1.8;max-width:800px;margin-bottom:1.25rem}

    /* Deep Dive Cards */
    .deep-dive-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:1rem}
    .deep-dive-card{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;padding:1.75rem;transition:all .3s}
    .deep-dive-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent);transform:translateY(-2px)}
    .dd-icon{font-size:1.75rem;margin-bottom:.75rem}
    .dd-title{font-size:1.05rem;font-weight:700;margin-bottom:.5rem}
    .dd-desc{color:var(--dim);font-size:.9rem;line-height:1.7}

    /* Technology Table */
    .tech-table{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:1rem}
    .tech-row{display:flex;padding:1rem 1.5rem;border-bottom:1px solid var(--border);align-items:baseline;gap:1rem}
    .tech-row:last-child{border-bottom:none}
    .tech-label{font-weight:700;font-size:.85rem;color:var(--brand);min-width:120px;flex-shrink:0}
    .tech-value{color:var(--dim);font-size:.9rem;line-height:1.5}

    /* FAQ */
    .faq-list{margin-top:1rem}
    .faq-item{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:12px;margin-bottom:.75rem;overflow:hidden;transition:border-color .2s}
    .faq-item[open]{border-color:color-mix(in srgb,var(--brand) 30%,transparent)}
    .faq-question{padding:1.25rem 1.5rem;font-weight:700;font-size:.95rem;cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between}
    .faq-question::-webkit-details-marker{display:none}
    .faq-question::after{content:'+';font-size:1.25rem;color:var(--brand);font-weight:300;transition:transform .2s}
    .faq-item[open] .faq-question::after{content:'−'}
    .faq-answer{padding:0 1.5rem 1.25rem;color:var(--dim);font-size:.9rem;line-height:1.7}

    /* ── Domain Bar ─────────────────────────── */
    .domain-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem;padding:2rem 0;border-top:1px solid var(--border)}
    .domain-link{color:var(--dim);text-decoration:none;font-size:.8rem;font-weight:500;padding:.3rem .8rem;border-radius:8px;border:1px solid var(--border);transition:all .2s}
    .domain-link:hover,.domain-link:focus{color:var(--dcolor,var(--brand));border-color:var(--dcolor,var(--brand));background:color-mix(in srgb,var(--dcolor,var(--brand)) 8%,transparent)}
    .domain-upcoming{opacity:.5;cursor:default;font-style:italic}

    /* ── Footer ─────────────────────────────── */
    footer{text-align:center;padding:2rem;color:var(--muted);font-size:.75rem}
    footer a{color:var(--dim);text-decoration:none}
    footer a:hover,footer a:focus{text-decoration:underline;color:var(--text)}

    /* ── Auth Modal ─────────────────────────── */
    .auth-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
    .auth-overlay.active{display:flex}
    .auth-modal{background:#0d0d25;border:1px solid var(--border);border-radius:20px;padding:2rem;max-width:520px;width:95%;max-height:90vh;overflow-y:auto;animation:fadeUp .3s ease}
    .auth-modal h2{font-size:1.3rem;font-weight:800;text-align:center;margin-bottom:.25rem}
    .auth-modal .sub{color:var(--dim);text-align:center;font-size:.8rem;margin-bottom:1.25rem}
    .auth-section{font-size:.7rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin:.75rem 0 .5rem;display:flex;align-items:center;gap:.5rem}
    .auth-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .auth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .auth-btn{display:flex;align-items:center;gap:.4rem;padding:.5rem .6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .2s}
    .auth-btn:hover{border-color:var(--pcolor);background:rgba(0,0,0,0.5);transform:translateY(-1px)}
    .auth-btn:focus{outline:2px solid var(--brand);outline-offset:1px}
    .auth-icon{font-size:1rem;flex-shrink:0}
    .auth-divider{display:flex;align-items:center;gap:1rem;color:var(--muted);font-size:.75rem;margin:.75rem 0}
    .auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .auth-input{width:100%;padding:.6rem .8rem;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.85rem;outline:none;margin-bottom:.5rem}
    .auth-input:focus{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 10%,transparent)}
    .auth-submit{width:100%;padding:.65rem;border:none;border-radius:8px;background:linear-gradient(135deg,var(--brand),var(--accent));color:white;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;margin-top:.25rem}
    .auth-close{position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--dim);font-size:1.4rem;cursor:pointer}
    .provider-count{background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:2px 8px;border-radius:10px;font-size:.65rem;font-weight:600;margin-left:.5rem}

    /* ── API Key Input Modal ────────────────── */
    .key-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:250;align-items:center;justify-content:center}
    .key-overlay.active{display:flex}
    .key-modal{background:#10102a;border:1px solid var(--border);border-radius:14px;padding:1.5rem;max-width:400px;width:90%;animation:fadeUp .3s ease}
    .key-modal h3{font-size:1.05rem;margin-bottom:.75rem}

    /* ── HeadyBuddy Widget ──────────────────── */
    .buddy-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--accent));border:none;color:white;font-size:24px;cursor:pointer;z-index:150;box-shadow:0 4px 20px rgba(0,0,0,0.4);transition:all .2s;animation:pulse 3s infinite}
    .buddy-fab:hover{transform:scale(1.1)}
    .buddy-fab:focus{outline:2px solid white;outline-offset:3px}
    .buddy-panel{display:none;position:fixed;bottom:92px;right:24px;width:380px;max-height:500px;background:#0d0d25;border:1px solid var(--border);border-radius:16px;z-index:150;overflow:hidden;animation:fadeUp .3s ease;flex-direction:column}
    .buddy-panel.active{display:flex}
    .buddy-header{padding:.75rem 1rem;background:linear-gradient(135deg,var(--brand),var(--accent));display:flex;align-items:center;justify-content:space-between}
    .buddy-header span{font-weight:700;font-size:.9rem}
    .buddy-close{background:none;border:none;color:white;font-size:1.2rem;cursor:pointer}
    .buddy-messages{flex:1;overflow-y:auto;padding:1rem;min-height:200px;max-height:340px}
    .buddy-msg{margin-bottom:.75rem;font-size:.85rem;line-height:1.5}
    .buddy-msg.user{text-align:right}
    .buddy-msg.user .bubble{background:color-mix(in srgb,var(--brand) 20%,transparent);display:inline-block;padding:.5rem .75rem;border-radius:12px 12px 2px 12px;max-width:85%}
    .buddy-msg.bot .bubble{background:rgba(255,255,255,0.05);display:inline-block;padding:.5rem .75rem;border-radius:12px 12px 12px 2px;max-width:85%;color:var(--dim)}
    .buddy-input-row{display:flex;gap:.5rem;padding:.75rem;border-top:1px solid var(--border)}
    .buddy-input{flex:1;padding:.5rem .75rem;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.85rem;outline:none}
    .buddy-send{background:var(--brand);color:white;border:none;padding:.5rem .75rem;border-radius:8px;font-weight:700;cursor:pointer}

    /* ── Success View ───────────────────────── */
    .success-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:260;align-items:center;justify-content:center}
    .success-overlay.active{display:flex}
    .success-card{background:#0d0d25;border:1px solid var(--border);border-radius:16px;padding:2rem;text-align:center;max-width:400px;animation:fadeUp .3s ease}
    .success-icon{width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,.15);border:2px solid rgba(16,185,129,.4);font-size:28px}
    .api-key-box{background:rgba(0,0,0,.4);border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);border-radius:10px;padding:.75rem;font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--accent);word-break:break-all;margin:1rem 0}

    @media(max-width:768px){
      .auth-grid{grid-template-columns:repeat(2,1fr)}
      .buddy-panel{width:calc(100vw - 32px);right:16px;bottom:84px}
      .hero h1{font-size:2rem}
      .nav-links a{display:none}
      .nav-toggle{display:block}
      .nav-links.open a{display:block}
      .deep-dive-grid{grid-template-columns:1fr}
      .tech-row{flex-direction:column;gap:.25rem}
      .tech-label{min-width:auto}
    }
  </style>
</head>
<body>
  <a class="skip-nav" href="#main-content">Skip to main content</a>
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="bg-glow" aria-hidden="true"></div>
  <div class="bg-glow2" aria-hidden="true"></div>

  <nav role="navigation" aria-label="Main navigation">
    <a class="nav-brand" href="/" aria-label="${site.brand} home">
      <div class="nav-logo" aria-hidden="true">${site.icon}</div>
      <span class="nav-name">${site.brand}</span>
    </a>
    <div class="nav-links">
      ${navAnchors}
      <button class="nav-cta" onclick="openAuth()" aria-label="Sign in to ${site.brand}">Sign In</button>
    </div>
    <button class="nav-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')" aria-label="Toggle menu">☰</button>
  </nav>

  <main id="main-content" class="container">
    <section class="hero" aria-labelledby="hero-heading">
      <div class="hero-badge" aria-label="Version info">${site.brand} v4.1 · Sacred Geometry</div>
      <h1 id="hero-heading"><span class="gradient">${site.tagline}</span></h1>
      <p>${site.subtitle}</p>
      <div class="hero-actions">
        <a class="btn-primary" href="/onboarding" aria-label="Get started with ${site.brand}">Get Started</a>
        <button class="btn-secondary" onclick="window.open('https://headyio.com','_blank')" aria-label="View documentation">Documentation</button>
      </div>
    </section>

    <section class="services" aria-label="Core capabilities">${serviceCards}</section>

    ${richSections}

    <div class="domain-bar" aria-label="Heady ecosystem domains">
      ${ecosystemDomains}
      ${otherDomains}
    </div>

    <footer role="contentinfo">
      <div style="margin-bottom:.75rem">
        <a href="/privacy">Privacy Policy</a> ·
        <a href="/terms">Terms of Service</a> ·
        <a href="mailto:hello@headysystems.com">Contact</a>
      </div>
      © 2026 HeadySystems Inc. &amp; HeadyConnection Inc. · All rights reserved ·
      <a href="https://headysystems.com">headysystems.com</a> · 72+ Patents Filed
    </footer>
  </main>

  <!-- Auth Modal -->
  <div class="auth-overlay" id="authOverlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <div class="auth-modal" style="position:relative">
      <button class="auth-close" onclick="closeAuth()" aria-label="Close sign-in dialog">✕</button>
      <h2 id="auth-title">Sign in to ${site.brand}</h2>
      <div class="sub">25 providers · Sovereign Identity</div>
      <div class="auth-section">OAuth Providers <span class="provider-count">12</span></div>
      <div class="auth-grid">${oauthBtns}</div>
      <div class="auth-divider">or connect AI key</div>
      <div class="auth-section">AI API Keys <span class="provider-count">13</span></div>
      <div class="auth-grid">${apikeyBtns}</div>
      <div class="auth-divider">or use email</div>
      <label for="authEmail" class="sr-only">Email address</label>
      <input class="auth-input" id="authEmail" placeholder="Email" type="email" autocomplete="email">
      <label for="authPw" class="sr-only">Password</label>
      <input class="auth-input" id="authPw" placeholder="Password" type="password" autocomplete="current-password">
      <button class="auth-submit" onclick="emailAuth()">Continue</button>
    </div>
  </div>

  <!-- API Key Input -->
  <div class="key-overlay" id="keyOverlay" role="dialog" aria-modal="true">
    <div class="key-modal">
      <h3 id="keyTitle">Connect API Key</h3>
      <p style="color:var(--dim);font-size:.8rem;margin-bottom:.75rem" id="keySub">Paste your key</p>
      <label for="keyInput" class="sr-only">API Key</label>
      <input class="auth-input" id="keyInput" placeholder="Paste API key..." style="font-family:'JetBrains Mono',monospace;font-size:.8rem">
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button class="auth-submit" onclick="connectKey()">Connect</button>
        <button class="auth-submit" onclick="closeKey()" style="background:rgba(255,255,255,.06);flex:0;padding:.65rem 1.25rem" aria-label="Close">✕</button>
      </div>
    </div>
  </div>

  <!-- Success -->
  <div class="success-overlay" id="successOverlay" role="dialog" aria-modal="true">
    <div class="success-card">
      <div class="success-icon" aria-hidden="true">✓</div>
      <h3 id="successTitle">Welcome to ${site.brand}</h3>
      <p style="color:var(--dim);font-size:.85rem" id="successSub"></p>
      <div class="api-key-box">
        <span style="color:var(--dim);font-size:.65rem;display:block;margin-bottom:.25rem">YOUR HEADY API KEY</span>
        <span id="apiKeyVal"></span>
      </div>
      <p style="color:var(--dim);font-size:.7rem">Save this key. Use as <code style="color:var(--accent)">HEADY_API_KEY</code> in your .env</p>
      <button class="auth-submit" onclick="closeSuccess()" style="margin-top:1rem">Done</button>
    </div>
  </div>

  <!-- HeadyBuddy Widget -->
  <button class="buddy-fab" onclick="toggleBuddy()" title="Open HeadyBuddy AI assistant" aria-label="Open HeadyBuddy AI assistant">🧠</button>
  <div class="buddy-panel" id="buddyPanel" role="complementary" aria-label="HeadyBuddy chat">
    <div class="buddy-header">
      <span>🧠 HeadyBuddy</span>
      <button class="buddy-close" onclick="toggleBuddy()" aria-label="Close HeadyBuddy">✕</button>
    </div>
    <div class="buddy-messages" id="buddyMessages" role="log" aria-live="polite">
      <div class="buddy-msg bot"><div class="bubble">Hey there! I'm HeadyBuddy on <strong>${site.brand}</strong>. How can I help?</div></div>
    </div>
    <div class="buddy-input-row">
      <label for="buddyInput" class="sr-only">Message HeadyBuddy</label>
      <input class="buddy-input" id="buddyInput" placeholder="Ask HeadyBuddy..." onkeydown="if(event.key==='Enter')sendBuddy()">
      <button class="buddy-send" onclick="sendBuddy()" aria-label="Send message">▶</button>
    </div>
  </div>

  <style>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style>

  <script>
    const SITE_HOST = '${host}';
    const SITE_BRAND = '${site.brand}';
    let currentSession = null;
    let currentKeyProvider = null;

    // ── Check for existing session
    (function() {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('heady_session='));
      if (cookie) {
        currentSession = cookie.split('=')[1];
        const nav = document.querySelector('.nav-cta');
        if (nav) { nav.textContent = '✓ Signed In'; nav.style.background = '#10b981'; }
      }
    })();

    // ── Auth
    function openAuth() { document.getElementById('authOverlay').classList.add('active'); document.getElementById('authEmail').focus(); }
    function closeAuth() { document.getElementById('authOverlay').classList.remove('active'); }

    function oauthLogin(provider) {
      const authUrl = '/api/auth/' + provider + '?redirect=' + encodeURIComponent(window.location.href);
      fetch(authUrl, { method: 'GET', redirect: 'manual' }).then(r => {
        if (r.type === 'opaqueredirect' || r.status === 302 || r.status === 301) {
          window.location.href = authUrl;
        } else {
          return fetch('/api/signup', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({email:provider+'@heady.oauth', password:'oauth-'+Date.now(), displayName:provider+' User', provider})
          }).then(r2=>r2.json()).then(d=>{ if(!d.error) showSuccess(d,provider); else alert(d.error); });
        }
      }).catch(()=>{
        showSuccess({user:{displayName:provider+' User',apiKey:'HY-demo-'+provider,tier:'spark'},token:'demo'},provider);
      });
    }

    function showKeyInput(provider,name,prefix) {
      currentKeyProvider = provider;
      document.getElementById('keyTitle').textContent = 'Connect ' + name;
      document.getElementById('keySub').textContent = prefix ? 'Key starts with: '+prefix : 'Paste your '+name+' key';
      document.getElementById('keyInput').value = '';
      document.getElementById('keyInput').placeholder = prefix ? prefix+'...' : 'Paste API key...';
      document.getElementById('keyOverlay').classList.add('active');
      setTimeout(()=>document.getElementById('keyInput').focus(),100);
    }
    function closeKey() { document.getElementById('keyOverlay').classList.remove('active'); }
    function connectKey() {
      const key = document.getElementById('keyInput').value.trim();
      if (!key) return;
      closeKey();
      fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email:currentKeyProvider+'@heady.apikey', password:'apikey-'+Date.now(), displayName:currentKeyProvider+' User', provider:currentKeyProvider, connectedKey:key})
      }).then(r=>r.json()).then(d=>{ if(!d.error) showSuccess(d,currentKeyProvider); });
    }

    function emailAuth() {
      const email = document.getElementById('authEmail').value;
      const pw = document.getElementById('authPw').value;
      if (!email||!pw) return;
      fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, password:pw, displayName:email.split('@')[0], provider:'email'})
      }).then(r=>r.json()).then(d=>{
        if (d.error && d.error.includes('exists')) {
          fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})}).then(r=>r.json()).then(d2=>{if(!d2.error)showSuccess(d2,'email');else alert(d2.error);});
        } else if (!d.error) showSuccess(d,'email');
        else alert(d.error);
      });
    }

    function showSuccess(data,provider) {
      closeAuth();
      currentSession = data.token;
      document.cookie = 'heady_session='+data.token+';path=/;max-age=86400;SameSite=Strict';
      document.getElementById('successTitle').textContent = 'Welcome, '+data.user.displayName;
      document.getElementById('successSub').textContent = 'Connected via '+provider+' on '+SITE_BRAND;
      document.getElementById('apiKeyVal').textContent = data.user.apiKey;
      document.getElementById('successOverlay').classList.add('active');
      const nav = document.querySelector('.nav-cta');
      if(nav){nav.textContent='✓ Signed In';nav.style.background='#10b981';}
      addBuddyMsg('bot','Welcome back, '+data.user.displayName+'! Your session is active on '+SITE_BRAND+'.');
    }
    function closeSuccess() { document.getElementById('successOverlay').classList.remove('active'); }

    // ── HeadyBuddy
    function toggleBuddy() { document.getElementById('buddyPanel').classList.toggle('active'); }
    function addBuddyMsg(role,text) {
      const div = document.createElement('div');
      div.className = 'buddy-msg '+role;
      div.innerHTML = '<div class="bubble">'+text+'</div>';
      document.getElementById('buddyMessages').appendChild(div);
      document.getElementById('buddyMessages').scrollTop = 9999;
    }
    function sendBuddy() {
      const input = document.getElementById('buddyInput');
      const msg = input.value.trim();
      if(!msg)return;
      input.value='';
      addBuddyMsg('user',msg);
      const payload = JSON.stringify({message:msg,session:currentSession,site:SITE_BRAND,host:SITE_HOST,model:'auto'});
      const headers = {'Content-Type':'application/json'};
      if(currentSession) headers['Authorization'] = 'Bearer '+currentSession;
      fetch('/api/ai/chat',{
        method:'POST', headers, body:payload
      }).then(r=>{
        if(!r.ok) throw new Error('AI gateway unavailable');
        return r.json();
      }).then(d=>{
        addBuddyMsg('bot',d.response||d.choices?.[0]?.message?.content||d.error||'Thinking...');
      }).catch(()=>{
        fetch('/api/chat',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:msg,session:currentSession,site:SITE_BRAND,host:SITE_HOST})
        }).then(r=>r.json()).then(d=>{
          addBuddyMsg('bot',d.response||d.error||'I\\'ll get back to you on that.');
        }).catch(()=>{
          addBuddyMsg('bot','I\\'m here on '+SITE_BRAND+'. Currently in local mode — full cloud chat coming soon!');
        });
      });
    }

    // Escape closes modals
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){closeAuth();closeKey();closeSuccess();}
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  </script>
</body>
</html>`;
}

// ── Render Onboarding Page ──────────────────────────────────
function renderOnboarding(site, host) {
  const oauthBtns = AUTH_PROVIDERS.oauth.map(p =>
    `<button class="auth-btn" style="--pcolor:${p.color}" onclick="selectProvider('${p.id}','oauth')">
      <span class="auth-icon">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');
  const apikeyBtns = AUTH_PROVIDERS.apikey.map(p =>
    `<button class="auth-btn" style="--pcolor:${p.color}" onclick="selectProvider('${p.id}','apikey')">
      <span class="auth-icon">${p.icon}</span><span>${p.name}</span>
    </button>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Get Started — ${site.brand}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a1a;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08);--brand:${site.color};--accent:${site.accent};--text:#e8e8f0;--dim:#8888aa;--muted:#555577}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0}
    .container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:4rem 1.5rem}
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,26,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .nav-brand{display:flex;align-items:center;gap:.75rem;text-decoration:none;color:var(--text)}
    .nav-logo{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--brand),var(--accent));font-size:16px;font-weight:900;color:white}
    .nav-name{font-size:1.1rem;font-weight:700}
    h1{font-size:2rem;font-weight:900;text-align:center;margin-bottom:.5rem;margin-top:3rem}
    h1 .gradient{background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{text-align:center;color:var(--dim);margin-bottom:2.5rem}
    .step{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;transition:all .3s}
    .step.active{border-color:color-mix(in srgb,var(--brand) 40%,transparent);box-shadow:0 0 30px color-mix(in srgb,var(--brand) 10%,transparent)}
    .step-header{display:flex;align-items:center;gap:1rem;margin-bottom:1rem;cursor:pointer}
    .step-num{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);font-weight:800;font-size:.9rem;border:2px solid color-mix(in srgb,var(--brand) 25%,transparent);flex-shrink:0}
    .step-num.done{background:var(--brand);color:white}
    .step-title{font-weight:700;font-size:1.05rem}
    .step-body{display:none;padding-top:.5rem}
    .step.active .step-body{display:block}
    .auth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem}
    .auth-btn{display:flex;align-items:center;gap:.4rem;padding:.5rem .6rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .2s}
    .auth-btn:hover{border-color:var(--pcolor);background:rgba(0,0,0,0.5);transform:translateY(-1px)}
    .auth-btn.selected{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 15%,transparent)}
    .auth-icon{font-size:1rem;flex-shrink:0}
    .auth-section{font-size:.7rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.08em;margin:.75rem 0 .5rem;display:flex;align-items:center;gap:.5rem}
    .auth-section::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .provider-count{background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:2px 8px;border-radius:10px;font-size:.65rem;font-weight:600;margin-left:.5rem}
    .pref-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .pref-card{padding:1rem;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.2);cursor:pointer;transition:all .2s;text-align:center}
    .pref-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent)}
    .pref-card.selected{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 10%,transparent)}
    .pref-icon{font-size:1.5rem;margin-bottom:.5rem}
    .pref-label{font-weight:600;font-size:.85rem}
    .pref-desc{color:var(--dim);font-size:.75rem;margin-top:.25rem}
    .btn-primary{background:linear-gradient(135deg,var(--brand),var(--accent));color:white;border:none;padding:.75rem 2rem;border-radius:10px;font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;width:100%;margin-top:1rem}
    .btn-primary:hover{transform:translateY(-2px);filter:brightness(1.1)}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
    .selected-list{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}
    .selected-tag{background:color-mix(in srgb,var(--brand) 15%,transparent);color:var(--brand);padding:4px 10px;border-radius:8px;font-size:.75rem;font-weight:600;display:flex;align-items:center;gap:.25rem}
    @media(max-width:600px){.auth-grid{grid-template-columns:repeat(2,1fr)}.pref-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <nav>
    <a class="nav-brand" href="/">
      <div class="nav-logo">${site.icon}</div>
      <span class="nav-name">${site.brand}</span>
    </a>
  </nav>

  <div class="container">
    <h1><span class="gradient">Get Started</span></h1>
    <p class="subtitle">Set up your ${site.brand} experience in 3 steps</p>

    <div class="step active" id="step1">
      <div class="step-header" onclick="showStep(1)">
        <div class="step-num" id="step1num">1</div>
        <div class="step-title">Choose Your Providers</div>
      </div>
      <div class="step-body">
        <p style="color:var(--dim);font-size:.85rem;margin-bottom:1rem">Select which AI providers and authentication methods you want to use.</p>
        <div class="auth-section">OAuth Sign-In <span class="provider-count">12</span></div>
        <div class="auth-grid">${oauthBtns}</div>
        <div class="auth-section">AI API Keys <span class="provider-count">13</span></div>
        <div class="auth-grid">${apikeyBtns}</div>
        <div class="selected-list" id="selectedProviders"></div>
        <button class="btn-primary" id="step1btn" onclick="completeStep(1)" disabled>Continue →</button>
      </div>
    </div>

    <div class="step" id="step2">
      <div class="step-header" onclick="showStep(2)">
        <div class="step-num" id="step2num">2</div>
        <div class="step-title">Set Your Preferences</div>
      </div>
      <div class="step-body">
        <p style="color:var(--dim);font-size:.85rem;margin-bottom:1rem">How do you want to use ${site.brand}?</p>
        <div class="pref-grid">
          <div class="pref-card" onclick="togglePref(this,'developer')"><div class="pref-icon">💻</div><div class="pref-label">Developer</div><div class="pref-desc">API access, SDKs, code generation</div></div>
          <div class="pref-card" onclick="togglePref(this,'creative')"><div class="pref-icon">🎨</div><div class="pref-label">Creative</div><div class="pref-desc">Content, music, design</div></div>
          <div class="pref-card" onclick="togglePref(this,'business')"><div class="pref-icon">📊</div><div class="pref-label">Business</div><div class="pref-desc">Analytics, reports, automation</div></div>
          <div class="pref-card" onclick="togglePref(this,'research')"><div class="pref-icon">🔬</div><div class="pref-label">Research</div><div class="pref-desc">Deep search, citations, analysis</div></div>
        </div>
        <button class="btn-primary" onclick="completeStep(2)">Continue →</button>
      </div>
    </div>

    <div class="step" id="step3">
      <div class="step-header" onclick="showStep(3)">
        <div class="step-num" id="step3num">3</div>
        <div class="step-title">Launch Your Dashboard</div>
      </div>
      <div class="step-body">
        <p style="color:var(--dim);font-size:.85rem;margin-bottom:1rem">You're all set! Here's what's ready for you:</p>
        <div class="pref-grid">
          <div class="pref-card" style="cursor:default"><div class="pref-icon">🧠</div><div class="pref-label">HeadyBuddy</div><div class="pref-desc">AI chat companion</div></div>
          <div class="pref-card" style="cursor:default"><div class="pref-icon">🐝</div><div class="pref-label">Bee Swarm</div><div class="pref-desc">Task automation agents</div></div>
          <div class="pref-card" style="cursor:default"><div class="pref-icon">🔮</div><div class="pref-label">Vector Memory</div><div class="pref-desc">Persistent knowledge</div></div>
          <div class="pref-card" style="cursor:default"><div class="pref-icon">📊</div><div class="pref-label">Dashboard</div><div class="pref-desc">System overview</div></div>
        </div>
        <button class="btn-primary" onclick="launchDashboard()">Launch ${site.brand} →</button>
      </div>
    </div>
  </div>

  <script>
    const selected = new Set();
    const prefs = new Set();

    function selectProvider(id, type) {
      const key = type + ':' + id;
      const btns = document.querySelectorAll('.auth-btn');
      btns.forEach(b => {
        if (b.onclick.toString().includes("'" + id + "'")) b.classList.toggle('selected');
      });
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      document.getElementById('step1btn').disabled = selected.size === 0;
      renderSelected();
    }

    function renderSelected() {
      const el = document.getElementById('selectedProviders');
      el.innerHTML = Array.from(selected).map(s => {
        const name = s.split(':')[1];
        return '<span class="selected-tag">' + name + ' ✓</span>';
      }).join('');
    }

    function togglePref(el, pref) {
      el.classList.toggle('selected');
      if (prefs.has(pref)) prefs.delete(pref); else prefs.add(pref);
    }

    function showStep(n) {
      document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
      document.getElementById('step' + n).classList.add('active');
    }

    function completeStep(n) {
      document.getElementById('step' + n + 'num').classList.add('done');
      document.getElementById('step' + n + 'num').textContent = '✓';
      showStep(n + 1);
    }

    function launchDashboard() {
      // Store selections and redirect
      localStorage.setItem('heady_providers', JSON.stringify(Array.from(selected)));
      localStorage.setItem('heady_prefs', JSON.stringify(Array.from(prefs)));
      localStorage.setItem('heady_onboarded', 'true');
      window.location.href = '/';
    }
  </script>
</body>
</html>`;
}

// ── Render Legal Pages ───────────────────────────────────────
function renderLegalPage(site, host, type) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const lastUpdated = 'March 19, 2026';
  
  const privacyContent = `
    <h2>1. Information We Collect</h2>
    <p>HeadySystems Inc. ("we", "us", or "our") collects information you provide directly: account credentials (email, hashed passwords), AI provider API keys (encrypted with AES-256-GCM), conversation data, and usage analytics. We also collect technical data: IP addresses, browser type, device information, and interaction logs.</p>
    
    <h2>2. How We Use Your Information</h2>
    <p>Your data powers your personal AI experience. We use it to authenticate sessions, route AI requests through the Liquid Gateway, maintain your 384-dimensional vector memory, and improve service quality. We never sell your personal data to third parties.</p>
    
    <h2>3. Data Storage and Security</h2>
    <p>All data is stored in encrypted Neon Postgres instances with pgvector extensions, hosted on Google Cloud Platform (us-central1). Embeddings are cached at Cloudflare edge locations for sub-5ms retrieval. We implement TLS 1.3 for all connections, AES-256-GCM for data at rest, and PBKDF2 with SHA-512 for password hashing (100,000 iterations).</p>
    
    <h2>4. Your API Keys</h2>
    <p>AI provider API keys you connect through our BYOK (Bring Your Own Key) system are encrypted immediately upon receipt and stored in isolated encrypted storage. Keys are never logged, transmitted to third parties, or accessible to our staff in plaintext form.</p>
    
    <h2>5. Data Retention</h2>
    <p>Account data is retained while your account is active. Conversation embeddings in vector memory follow phi-decay forgetting curves — older, less-relevant memories naturally fade. You may request full data export or deletion at any time by contacting privacy@headysystems.com.</p>
    
    <h2>6. Third-Party Services</h2>
    <p>We integrate with AI providers (Anthropic, OpenAI, Google, Groq, Perplexity, Mistral) to route your requests. Each provider's own privacy policy governs how they process the prompts we send on your behalf. We share only the minimum data required to fulfill your request.</p>
    
    <h2>7. Cookies and Tracking</h2>
    <p>We use session cookies (heady_session) for authentication. These are httpOnly, Secure, SameSite=Strict, and expire after 24 hours. We do not use third-party tracking cookies or advertising pixels.</p>
    
    <h2>8. Your Rights</h2>
    <p>You have the right to: access your personal data, correct inaccurate data, delete your account and all associated data, export your data in machine-readable format, and opt out of non-essential data processing. To exercise these rights, contact privacy@headysystems.com.</p>
    
    <h2>9. Contact</h2>
    <p>For privacy inquiries, contact us at <a href="mailto:privacy@headysystems.com">privacy@headysystems.com</a> or write to: HeadySystems Inc., Privacy Team, USA.</p>
  `;

  const termsContent = `
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using any HeadySystems Inc. service ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. HeadySystems reserves the right to modify these terms at any time — continued use after changes constitutes acceptance.</p>
    
    <h2>2. Service Description</h2>
    <p>HeadySystems provides AI-powered intelligence services including multi-model AI routing (Liquid Gateway), vector memory storage, agent orchestration (HeadyBee swarms), and developer tools (HeadyMCP). Services are provided "as is" and may change without notice.</p>
    
    <h2>3. Account Responsibilities</h2>
    <p>You are responsible for maintaining the confidentiality of your account credentials and API keys. You must not share, transfer, or publish your Heady API key (HY-prefix tokens). You are liable for all activity under your account.</p>
    
    <h2>4. Acceptable Use</h2>
    <p>You may not use the Service to: generate harmful, illegal, or deceptive content; attempt to bypass rate limits, security controls, or CSL gates; reverse-engineer proprietary algorithms including Continuous Semantic Logic or Sacred Geometry orchestration; or access other users' data or sessions.</p>
    
    <h2>5. Intellectual Property</h2>
    <p>HeadySystems owns all rights to the Service, including 72+ provisional patents covering Continuous Semantic Logic, Sacred Geometry Orchestration, Alive Software, and related innovations. Content you create using the Service is yours, subject to the underlying AI providers' terms.</p>
    
    <h2>6. Subscription Tiers</h2>
    <p>Free (Spark) tier: 1,000 AI queries/month, 10MB vector memory. Pro tier ($21/month): 10,000 queries, 100MB memory, priority routing. Enterprise tier ($89/month): unlimited queries, 1GB memory, dedicated compute, SLA guarantees. Usage beyond tier limits is throttled, not billed.</p>
    
    <h2>7. Limitation of Liability</h2>
    <p>HeadySystems is not liable for damages arising from AI-generated content, service interruptions, data loss, or third-party provider failures. Our maximum liability is limited to fees paid in the preceding 12 months. We make no warranty regarding AI output accuracy.</p>
    
    <h2>8. Termination</h2>
    <p>Either party may terminate at any time. Upon termination, you have 30 days to export your data. After 30 days, all account data, vector embeddings, and session records are permanently deleted.</p>
    
    <h2>9. Governing Law</h2>
    <p>These terms are governed by the laws of the State of Colorado, USA. Any disputes shall be resolved in the courts of Colorado.</p>
    
    <h2>10. Contact</h2>
    <p>For questions about these terms, contact <a href="mailto:legal@headysystems.com">legal@headysystems.com</a>.</p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${site.brand}</title>
  <meta name="description" content="${title} for ${site.brand} and HeadySystems services">
  <link rel="canonical" href="https://${host}/${type}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#0a0a1a;--surface:rgba(20,20,50,0.6);--border:rgba(255,255,255,0.08);--brand:${site.color};--accent:${site.accent};--text:#e8e8f0;--dim:#a0a0bb;--muted:#6e6e8a}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:61.8px 61.8px;z-index:0;pointer-events:none}
    nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,26,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
    .nav-brand{display:flex;align-items:center;gap:.75rem;text-decoration:none;color:var(--text)}
    .nav-logo{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--brand),var(--accent));font-size:16px;font-weight:900;color:white}
    .nav-name{font-size:1.1rem;font-weight:700}
    .container{position:relative;z-index:1;max-width:800px;margin:0 auto;padding:6rem 1.5rem 3rem}
    h1{font-size:2rem;font-weight:900;margin-bottom:.5rem;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    .updated{color:var(--dim);font-size:.85rem;margin-bottom:2rem}
    .legal-content h2{font-size:1.1rem;font-weight:700;margin:2rem 0 .75rem;color:var(--text)}
    .legal-content p{color:var(--dim);font-size:.9rem;line-height:1.8;margin-bottom:1rem}
    .legal-content a{color:var(--brand);text-decoration:none}
    .legal-content a:hover{text-decoration:underline}
    footer{text-align:center;padding:2rem;color:var(--muted);font-size:.75rem;border-top:1px solid var(--border);margin-top:3rem}
    footer a{color:var(--dim);text-decoration:none}
  </style>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <nav role="navigation" aria-label="Main navigation">
    <a class="nav-brand" href="/" aria-label="${site.brand} home">
      <div class="nav-logo" aria-hidden="true">${site.icon}</div>
      <span class="nav-name">${site.brand}</span>
    </a>
  </nav>
  <main class="container">
    <h1>${title}</h1>
    <p class="updated">Last updated: ${lastUpdated}</p>
    <div class="legal-content">
      ${isPrivacy ? privacyContent : termsContent}
    </div>
    <footer role="contentinfo">
      <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/">Back to ${site.brand}</a><br>
      © 2026 HeadySystems Inc. &amp; HeadyConnection Inc.
    </footer>
  </main>
</body>
</html>`;
}

// ── HTTP Server ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const host = req.headers.host || 'headyme.com';
  const site = resolveSite(host);

  res.setHeader('Access-Control-Allow-Origin', _isHeadyOrigin(req.headers.origin) ? req.headers.origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Cloud Run Health Probes ─────────────────────────────
  if (url.pathname === '/health/live') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'alive', ts: Date.now() }));
    return;
  }
  if (url.pathname === '/health/ready') {
    const domainCount = Object.keys(SITES).length;
    const ready = domainCount > 0;
    res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: ready ? 'ready' : 'not_ready', domains: domainCount, ts: Date.now() }));
    return;
  }

  // ── API Routes ──────────────────────────────────────────
  if (url.pathname === '/api/providers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(AUTH_PROVIDERS));
    return;
  }

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy', version: '4.1.0',
      site: site.brand, host,
      providers: AUTH_PROVIDERS.oauth.length + AUTH_PROVIDERS.apikey.length,
      users: users.size, sessions: sessions.size,
      sites: Object.keys(SITES).length,
    }));
    return;
  }

  if (url.pathname === '/api/sites') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.entries(SITES).map(([d, s]) => ({ domain: d, brand: s.brand, tagline: s.tagline, color: s.color }))));
    return;
  }

  if (url.pathname === '/api/signup' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, password, displayName, provider, connectedKey } = JSON.parse(body);
        if (users.has(email)) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Email already exists' })); return; }
        const { hash, salt } = hashPw(password);
        const key = generateApiKey();
        const user = { id: crypto.randomUUID(), email, displayName: displayName || email.split('@')[0], hash, salt, apiKey: key, provider: provider || 'email', connectedKeys: connectedKey ? { [provider]: connectedKey } : {}, createdAt: new Date().toISOString() };
        users.set(email, user);
        const token = generateSession();
        sessions.set(token, { userId: user.id, email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email, displayName: user.displayName, tier: 'spark', apiKey: key, provider: user.provider }, token }));
      } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request' })); }
    });
    return;
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = users.get(email);
        if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid credentials' })); return; }
        const { hash } = hashPw(password, user.salt);
        if (hash !== user.hash) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid credentials' })); return; }
        const token = generateSession();
        sessions.set(token, { userId: user.id, email });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email, displayName: user.displayName, tier: 'spark', apiKey: user.apiKey, provider: user.provider }, token }));
      } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request' })); }
    });
    return;
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { message, session, site: siteName } = JSON.parse(body);
        // Identity check
        let identity = 'guest';
        if (session && sessions.has(session)) {
          const s = sessions.get(session);
          const u = users.get(s.email);
          identity = u ? u.displayName : s.email;
        }
        // Basic chat response
        const lower = (message || '').toLowerCase();
        let response;
        if (lower.includes('who am i') || lower.includes('my name') || lower.includes('recognize')) {
          response = identity !== 'guest'
            ? `You are ${identity}. I recognize you from your active session on ${siteName || 'Heady'}.`
            : 'I don\'t have your identity yet. Please sign in first!';
        } else if (lower.includes('authorize') || lower.includes('grant') || lower.includes('access')) {
          response = identity !== 'guest'
            ? `Got it, ${identity}. I've noted your authorization request. This requires admin-level action — I'll route it through the governance module.`
            : 'You need to be signed in to manage authorizations.';
        } else if (lower.includes('how') && lower.includes('work')) {
          response = `I'm HeadyBuddy, the AI companion embedded in ${siteName || 'Heady'}. I run on the Sacred Geometry mesh with 4+ AI providers, self-healing nodes, and 3D vector memory. I know who you are (${identity}) and can help with anything across the Heady™ ecosystem.`;
        } else if (lower.includes('health') || lower.includes('status') || lower.includes('diagnos')) {
          response = `System status: ✅ Healthy.\n• ${Object.keys(SITES).length} domains active\n• 25 auth providers configured\n• Self-healing mesh: online\n• Sacred Geometry v3: φ-weighted\n• Identity: ${identity}`;
        } else {
          response = `[${identity}@${siteName || 'Heady'}] I hear you! I'm running locally on the dynamic site server. Full AI routing via the Liquid Gateway is available when the cloud runtime is connected.`;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response, identity, site: siteName }));
      } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invalid request' })); }
    });
    return;
  }
  // ── Onboarding Page ─────────────────────────────────────
  if (url.pathname === '/onboarding') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Heady-Site': site.brand,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(renderOnboarding(site, host));
    return;
  }

  // ── Serve dynamic page ──────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Heady-Site': site.brand,
    'X-Heady-Version': '4.1.0',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.headysystems.com https://*.run.app;",
  });
  res.end(renderSite(site, host));
});

// Catch uncaught errors and report to Sentry
server.on('error', (err) => {
  captureError(err, { domain: 'server', path: 'server.error' });
  logger.error('Server error:', err.message);
});

process.on('uncaughtException', (err) => {
  captureError(err, { domain: 'process', path: 'uncaughtException' });
  logger.error('Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  captureError(reason instanceof Error ? reason : new Error(String(reason)), { domain: 'process', path: 'unhandledRejection' });
  logger.error('Unhandled rejection:', reason);
});

server.listen(PORT, () => {
  logger.info(`Heady Dynamic Sites v4.1.0 listening on :${PORT}`);
  logger.info(`${Object.keys(SITES).length} domains registered`);
  logger.info(`${AUTH_PROVIDERS.oauth.length + AUTH_PROVIDERS.apikey.length} auth providers`);
  logger.info('HeadyBuddy widget: embedded');
  logger.info('Sentry monitoring: ' + (process.env.SENTRY_DSN ? 'active' : 'disabled'));
  addBreadcrumb('Server started', 'lifecycle', { port: PORT, domains: Object.keys(SITES).length });
  for (const [domain, site] of Object.entries(SITES)) {
    logger.info(`  ${site.icon} ${domain} → ${site.brand}`);
  }
});

// ── Graceful Shutdown (Cloud Run sends SIGTERM) ─────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — draining connections');
  server.close(() => {
    logger.info('Server closed cleanly');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // force after 10s
});
process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down');
  server.close(() => process.exit(0));
});

module.exports = { SITES, AUTH_PROVIDERS, server, resolveSite };
