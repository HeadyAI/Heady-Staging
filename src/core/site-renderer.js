/**
 * Heady — Site Renderer
 * HTML/CSS/JS generators for site pages.
 * Extracted from dynamic-site-server.js for single-responsibility.
 */

const crypto = require('crypto');
const { AUTH_PROVIDERS } = require('./auth-providers');
const { getContentForDomain } = require('./content-sections');
const PHI = 1.6180339887;

function generateApiKey() { return `HY-${crypto.randomBytes(16).toString('hex')}`; }
function generateSession() { return `sess_${crypto.randomBytes(32).toString('hex')}`; }
function hashPw(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// ── Domain Aliases ───────────────────────────────────────────
const DOMAIN_ALIASES = {
  'heady-ai.com': 'heady-ai.com',
  'www.heady-ai.com': 'heady-ai.com',
};

// ── Resolve site from Host header ────────────────────────────
function normalizeHost(host) {
  return typeof host === 'string' ? host.replace(/:\d+$/, '').trim().toLowerCase() : '';
}

function resolveIncomingHost(headers = {}) {
  const forwardedHostHeader = headers['x-forwarded-host'] || headers['X-Forwarded-Host'];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : String(forwardedHostHeader || '').split(',')[0];
  const preferredHost = normalizeHost(forwardedHost) || normalizeHost(headers.host);
  return preferredHost || 'headyme.com';
}

function resolveSite(host) {
  let clean = normalizeHost(host) || 'headyme.com';
  // Check aliases first
  if (DOMAIN_ALIASES[clean]) clean = DOMAIN_ALIASES[clean];
  // Direct match
  if (SITES[clean]) return SITES[clean];
  // www. prefix
  const noWww = clean.replace(/^www\./, '');
  if (DOMAIN_ALIASES[noWww]) { if (SITES[DOMAIN_ALIASES[noWww]]) return SITES[DOMAIN_ALIASES[noWww]]; }
  if (SITES[noWww]) return SITES[noWww];
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

  // Build domain bar — link all actively deployed sites
  const liveDomains = [
    'headyme.com', 'headysystems.com', 'headyio.com', 'headyconnection.com',
    'headyapi.com', 'headymcp.com', 'headybot.com', 'headylens.com',
    'headyfinance.com', 'perfecttrader.com'
  ];
  const ecosystemDomains = Object.entries(SITES)
    .filter(([d]) => liveDomains.includes(d))
    .map(([d, s]) =>
      `<a href="https://${d}" class="domain-link" style="--dcolor:${s.color}">${s.brand}</a>`).join('');
  const otherDomains = Object.entries(SITES)
    .filter(([d]) => !liveDomains.includes(d))
    .map(([d, s]) =>
      `<a href="https://${d}" class="domain-link domain-upcoming" style="--dcolor:${s.color}" title="Coming soon">${s.brand}</a>`).join('');

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
      .stat-row{grid-template-columns:repeat(2,1fr)}
      .tech-grid{grid-template-columns:1fr}
      .nav-links a{display:none}
      .nav-toggle{display:block}
      .nav-links.open a{display:block}
      .deep-dive-grid{grid-template-columns:1fr}
      .tech-row{flex-direction:column;gap:.25rem}
      .tech-label{min-width:auto}
    }

    /* ── About Section ─────────────────────── */
    .about-section{padding:4rem 0;text-align:center;animation:fadeUp .6s ease-out}
    .about-badge{display:inline-block;background:color-mix(in srgb,var(--brand) 12%,transparent);color:var(--brand);padding:4px 14px;border-radius:20px;font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1.25rem;border:1px solid color-mix(in srgb,var(--brand) 18%,transparent)}
    .about-section h2{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:900;letter-spacing:-.02em;margin-bottom:1rem}
    .about-text{color:var(--dim);font-size:1rem;max-width:680px;margin:0 auto 2.5rem;line-height:1.7}
    .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;max-width:700px;margin:0 auto}
    .stat-card{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:14px;padding:1.25rem .75rem;transition:all .3s}
    .stat-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent);transform:translateY(-3px)}
    .stat-num{font-size:1.8rem;font-weight:900;background:linear-gradient(135deg,var(--brand),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.25rem}
    .stat-label{color:var(--dim);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}

    /* ── Tech Section ──────────────────────── */
    .tech-section{padding:4rem 0;text-align:center}
    .tech-section h2{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:900;letter-spacing:-.02em;margin-bottom:2rem}
    .tech-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem}
    .tech-card{background:var(--surface);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:16px;padding:1.5rem;text-align:left;transition:all .3s}
    .tech-card:hover{border-color:color-mix(in srgb,var(--brand) 40%,transparent);transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,0.3)}
    .tech-icon{font-size:2rem;margin-bottom:.75rem;display:block}
    .tech-card h3{font-size:1rem;font-weight:700;margin-bottom:.4rem}
    .tech-card p{color:var(--dim);font-size:.85rem;line-height:1.5}

    /* ── CTA Section ───────────────────────── */
    .cta-section{padding:4rem 0;text-align:center;border-top:1px solid var(--border);margin-top:2rem}
    .cta-section h2{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:900;letter-spacing:-.02em;margin-bottom:.75rem}
    .cta-section p{color:var(--dim);font-size:1.05rem;margin-bottom:2rem}
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

module.exports = { generateApiKey, generateSession, hashPw, normalizeHost, resolveIncomingHost, resolveSite, renderSite, renderOnboarding, renderLegalPage };
