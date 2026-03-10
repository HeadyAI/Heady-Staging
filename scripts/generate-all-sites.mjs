#!/usr/bin/env node
/**
 * Heady™ Mass Site Generator — Full Auto Mode
 * Generates premium HTML for ALL 61 Heady domains from site-content-data.json
 * Uses the headyme.com design system as the baseline.
 *
 * Usage: node scripts/generate-all-sites.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITES_DIR = process.env.SITES_OUT || join(ROOT, 'services', 'heady-web', 'sites');
// Fallback to /tmp if main dir is unwritable
const OUTPUT_DIR = (() => {
    try { writeFileSync(join(SITES_DIR, '.write-test'), ''); const { unlinkSync } = await import('fs'); unlinkSync(join(SITES_DIR, '.write-test')); return SITES_DIR; }
    catch { const tmp = '/tmp/heady-sites-generated'; mkdirSync(tmp, { recursive: true }); console.log('⚠ Using /tmp output (run: sudo cp -r /tmp/heady-sites-generated/* services/heady-web/sites/)'); return tmp; }
})();
const data = JSON.parse(readFileSync(join(__dirname, 'site-content-data.json'), 'utf-8'));

// ── Sacred Geometry Canvas JS (shared across all sites) ─────────────────────
const sacredGeoJS = `
(function(){
  const c=document.getElementById('sacred-geo-canvas');if(!c)return;
  const x=c.getContext('2d');let w,h,t=0;
  const PHI=1.6180339887,PSI=0.6180339887;
  function resize(){w=c.width=window.innerWidth;h=c.height=window.innerHeight;}
  window.addEventListener('resize',resize);resize();
  function draw(){
    x.clearRect(0,0,w,h);
    x.globalAlpha=0.06;
    const cx=w/2,cy=h/2,r=Math.min(w,h)*0.35;
    // Flower of Life pattern
    for(let i=0;i<6;i++){
      const a=(Math.PI/3)*i+t*0.1;
      const px=cx+Math.cos(a)*r*PSI;
      const py=cy+Math.sin(a)*r*PSI;
      x.beginPath();x.arc(px,py,r*PSI,0,Math.PI*2);
      x.strokeStyle=ACCENT;x.lineWidth=0.8;x.stroke();
    }
    // Center circle
    x.beginPath();x.arc(cx,cy,r*PSI,0,Math.PI*2);
    x.strokeStyle=ACCENT;x.lineWidth=1;x.stroke();
    // Rotating outer ring
    for(let i=0;i<12;i++){
      const a=(Math.PI/6)*i+t*0.05;
      const px=cx+Math.cos(a)*r;
      const py=cy+Math.sin(a)*r;
      x.beginPath();x.arc(px,py,4,0,Math.PI*2);
      x.fillStyle=ACCENT;x.globalAlpha=0.12;x.fill();
    }
    // Connecting lines
    x.globalAlpha=0.03;
    for(let i=0;i<6;i++){
      const a1=(Math.PI/3)*i+t*0.08;
      const a2=(Math.PI/3)*((i+2)%6)+t*0.08;
      x.beginPath();
      x.moveTo(cx+Math.cos(a1)*r,cy+Math.sin(a1)*r);
      x.lineTo(cx+Math.cos(a2)*r,cy+Math.sin(a2)*r);
      x.strokeStyle=ACCENT;x.lineWidth=0.5;x.stroke();
    }
    t+=0.008;requestAnimationFrame(draw);
  }
  draw();
})();`;

// ── HTML Generator ──────────────────────────────────────────────────────────

function generateFullSite(site) {
    const { domain, title, tagline, description, accent, accentAlt, heroStats, features, cta } = site;
    const slug = domain.replace(/\./g, '-');

    return `<!DOCTYPE html>
<html lang="en" data-heady-site="${slug}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${tagline}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://${domain}/">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${domain}/">
  <meta property="og:title" content="${title} — ${tagline}">
  <meta property="og:description" content="${description}">
  <meta property="og:site_name" content="${title}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} — ${tagline}">
  <meta name="twitter:description" content="${description}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${data.designTokens.fonts}&family=${data.designTokens.monoFont}&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebSite","name":"${title}","url":"https://${domain}","description":"${description}","publisher":{"@type":"Organization","name":"HeadySystems Inc.","url":"https://headysystems.com","founder":{"@type":"Person","name":"Eric Haywood"}}}
  </script>
  <style>
    :root{--phi:1.6180339887;--phi-inv:0.6180339887;--bg-base:#0a0e17;--bg-surface:#0d1221;--bg-card:#111827;--bg-glass:rgba(13,18,33,0.7);--border:rgba(255,255,255,0.08);--border-glow:${accent}40;--accent:${accent};--accent-dim:${accent}cc;--accent-glow:${accent}22;--accent-alt:${accentAlt};--text-primary:#f0f4ff;--text-secondary:#8b98b8;--text-muted:#4a5568;--font-display:'Outfit',sans-serif;--font-body:'Inter',sans-serif;--font-mono:'JetBrains Mono','Fira Code',monospace;--sp-1:4px;--sp-2:8px;--sp-3:13px;--sp-4:21px;--sp-5:34px;--sp-6:55px;--sp-7:89px;--sp-8:144px;--radius-sm:8px;--radius-md:13px;--radius-lg:21px;--radius-xl:34px}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth;font-size:16px}
    body{background:var(--bg-base);color:var(--text-primary);font-family:var(--font-body);line-height:1.618;overflow-x:hidden;-webkit-font-smoothing:antialiased}
    ::selection{background:var(--accent-glow);color:var(--accent)}
    a{color:inherit;text-decoration:none}

    /* NAV */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:var(--sp-4) var(--sp-6);display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);background:rgba(10,14,23,0.8);border-bottom:1px solid var(--border)}
    .nav-logo{display:flex;align-items:center;gap:var(--sp-3);font-family:var(--font-display);font-weight:700;font-size:1.25rem}
    .nav-logo .icon{width:32px;height:32px;background:var(--accent);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--bg-base);font-weight:800}
    .nav-links{display:flex;gap:var(--sp-6);list-style:none}
    .nav-links a{font-size:0.875rem;font-weight:500;color:var(--text-secondary);transition:color 0.2s}
    .nav-links a:hover{color:var(--text-primary)}
    .nav-cta{display:flex;gap:var(--sp-3)}
    .btn{display:inline-flex;align-items:center;gap:var(--sp-2);padding:var(--sp-3) var(--sp-5);border-radius:var(--radius-sm);font-family:var(--font-body);font-size:0.875rem;font-weight:600;cursor:pointer;border:none;transition:all 0.2s}
    .btn-primary{background:var(--accent);color:var(--bg-base)}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px ${accent}40}
    .btn-ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border)}
    .btn-ghost:hover{color:var(--text-primary);border-color:rgba(255,255,255,0.2)}

    /* HERO */
    .hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:var(--sp-8) var(--sp-6) var(--sp-7)}
    #sacred-geo-canvas{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none}
    .hero-content{position:relative;z-index:2;text-align:center;max-width:880px;margin:0 auto}
    .hero-badge{display:inline-flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-4);border:1px solid var(--border-glow);border-radius:100px;background:var(--accent-glow);font-size:0.875rem;font-weight:500;color:var(--accent);margin-bottom:var(--sp-5);backdrop-filter:blur(10px)}
    .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
    .hero-title{font-family:var(--font-display);font-size:clamp(2.25rem,8vw,4.5rem);font-weight:800;line-height:1.05;letter-spacing:-0.03em;margin-bottom:var(--sp-5)}
    .hero-title .accent{color:var(--accent)}
    .hero-title .accent-alt{color:var(--accent-alt)}
    .hero-subtitle{font-size:clamp(1.125rem,2.5vw,1.5rem);color:var(--text-secondary);line-height:1.618;margin-bottom:var(--sp-6);max-width:640px;margin-left:auto;margin-right:auto}
    .hero-cta{display:flex;align-items:center;justify-content:center;gap:var(--sp-4);flex-wrap:wrap;margin-bottom:var(--sp-7)}
    .hero-cta .btn{padding:var(--sp-4) var(--sp-6);font-size:1rem}
    .hero-stats{display:flex;justify-content:center;gap:var(--sp-7);flex-wrap:wrap}
    .hero-stat{text-align:center}
    .hero-stat-value{font-family:var(--font-display);font-size:1.875rem;font-weight:700;color:var(--accent);line-height:1}
    .hero-stat-label{font-size:0.875rem;color:var(--text-muted);margin-top:var(--sp-1)}
    .hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:200px;background:linear-gradient(to bottom,transparent,var(--bg-base));z-index:1}

    /* SECTIONS */
    .section{padding:var(--sp-8) var(--sp-6);max-width:1200px;margin:0 auto}
    .section-header{text-align:center;margin-bottom:var(--sp-7)}
    .section-label{font-size:0.875rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:var(--sp-3)}
    .section-title{font-family:var(--font-display);font-size:clamp(1.875rem,4vw,3rem);font-weight:700;line-height:1.15;letter-spacing:-0.02em;margin-bottom:var(--sp-4)}
    .section-desc{font-size:1.125rem;color:var(--text-secondary);max-width:560px;margin:0 auto;line-height:1.618}

    /* FEATURES */
    .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-4)}
    .feature-card{background:var(--bg-glass);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--sp-6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:all 0.3s;position:relative;overflow:hidden}
    .feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent-glow),transparent);opacity:0;transition:opacity 0.3s}
    .feature-card:hover{border-color:var(--border-glow);transform:translateY(-4px);box-shadow:0 20px 60px ${accent}14}
    .feature-card:hover::before{opacity:1}
    .feature-icon{width:48px;height:48px;border-radius:var(--radius-sm);background:var(--accent-glow);display:flex;align-items:center;justify-content:center;margin-bottom:var(--sp-4);font-size:22px}
    .feature-title{font-family:var(--font-display);font-size:1.25rem;font-weight:600;margin-bottom:var(--sp-3)}
    .feature-desc{font-size:0.875rem;color:var(--text-secondary);line-height:1.618}

    /* STATS */
    .stats-section{background:var(--bg-surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:var(--sp-7) var(--sp-6)}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-4);max-width:1000px;margin:0 auto}
    .stat-item{text-align:center;padding:var(--sp-5)}
    .stat-number{font-family:var(--font-display);font-size:clamp(1.875rem,4vw,3rem);font-weight:800;color:var(--accent);line-height:1}
    .stat-label{font-size:0.875rem;color:var(--text-muted);margin-top:var(--sp-2)}

    /* ECOSYSTEM */
    .ecosystem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--sp-3)}
    .eco-card{background:var(--bg-glass);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--sp-4);text-align:center;transition:all 0.2s;text-decoration:none;color:var(--text-primary)}
    .eco-card:hover{border-color:var(--border-glow);transform:translateY(-2px)}
    .eco-card h4{font-family:var(--font-display);font-size:0.875rem;font-weight:600;margin-bottom:var(--sp-1)}
    .eco-card p{font-size:0.75rem;color:var(--text-muted)}

    /* CTA */
    .cta-section{text-align:center;padding:var(--sp-8) var(--sp-6);position:relative}
    .cta-section::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,${accent}08,transparent 70%);pointer-events:none}
    .cta-title{font-family:var(--font-display);font-size:clamp(1.875rem,5vw,3.75rem);font-weight:800;margin-bottom:var(--sp-4);position:relative}
    .cta-desc{font-size:1.125rem;color:var(--text-secondary);margin-bottom:var(--sp-6);max-width:500px;margin-left:auto;margin-right:auto;position:relative}
    .cta-buttons{display:flex;justify-content:center;gap:var(--sp-4);flex-wrap:wrap;position:relative}
    .cta-buttons .btn{padding:var(--sp-4) var(--sp-6);font-size:1rem}

    /* FOOTER */
    .footer{border-top:1px solid var(--border);padding:var(--sp-7) var(--sp-6);text-align:center}
    .footer-links{display:flex;justify-content:center;gap:var(--sp-6);flex-wrap:wrap;margin-bottom:var(--sp-5)}
    .footer-links a{font-size:0.875rem;color:var(--text-secondary);transition:color 0.2s}
    .footer-links a:hover{color:var(--accent)}
    .footer-copy{font-size:0.75rem;color:var(--text-muted)}

    /* RESPONSIVE */
    @media(max-width:768px){
      .features-grid{grid-template-columns:1fr}
      .stats-grid{grid-template-columns:repeat(2,1fr)}
      .nav-links{display:none}
      .hero-stats{gap:var(--sp-5)}
    }
  </style>
</head>
<body>
  <canvas id="sacred-geo-canvas" aria-hidden="true"></canvas>

  <!-- NAV -->
  <nav class="nav" role="navigation" aria-label="Main navigation">
    <a href="https://${domain}/" class="nav-logo">
      <span class="icon">◆</span>
      <span>${title}</span>
    </a>
    <ul class="nav-links">
      <li><a href="#features">Features</a></li>
      <li><a href="#ecosystem">Ecosystem</a></li>
      <li><a href="https://headyio.com/docs">Docs</a></li>
      <li><a href="https://headyconnection.com">Community</a></li>
    </ul>
    <div class="nav-cta">
      <a href="https://heady-onboarding-bf4q4zywhq-ue.a.run.app" class="btn btn-ghost">Sign In</a>
      <a href="${cta.primaryHref}" class="btn btn-primary">${cta.primary}</a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-badge">
        <span class="hero-badge-dot"></span>
        <span>HeadySystems Inc. — 60+ Patents</span>
      </div>
      <h1 class="hero-title">
        <span class="accent">${title.split('™')[0]}</span>™<br>
        ${tagline}
      </h1>
      <p class="hero-subtitle">${description}</p>
      <div class="hero-cta">
        <a href="${cta.primaryHref}" class="btn btn-primary">${cta.primary} →</a>
        <a href="${cta.secondaryHref}" class="btn btn-ghost">${cta.secondary}</a>
      </div>
      <div class="hero-stats">
${heroStats.map(s => `        <div class="hero-stat"><span class="hero-stat-value">${s.value}</span><span class="hero-stat-label">${s.label}</span></div>`).join('\n')}
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="section" id="features">
    <div class="section-header">
      <p class="section-label">Capabilities</p>
      <h2 class="section-title">Built Different</h2>
      <p class="section-desc">Every component is engineered with Sacred Geometry mathematics and Continuous Semantic Logic.</p>
    </div>
    <div class="features-grid">
${features.map(f => `      <div class="feature-card">
        <div class="feature-icon">${f.icon}</div>
        <h3 class="feature-title">${f.title}</h3>
        <p class="feature-desc">${f.desc}</p>
      </div>`).join('\n')}
    </div>
  </section>

  <!-- STATS -->
  <section class="stats-section">
    <div class="stats-grid">
      <div class="stat-item"><span class="stat-number">60+</span><span class="stat-label">Patents Filed</span></div>
      <div class="stat-item"><span class="stat-number">21</span><span class="stat-label">Microservices</span></div>
      <div class="stat-item"><span class="stat-number">17</span><span class="stat-label">AI Swarms</span></div>
      <div class="stat-item"><span class="stat-number">φ</span><span class="stat-label">Sacred Geometry</span></div>
    </div>
  </section>

  <!-- ECOSYSTEM -->
  <section class="section" id="ecosystem">
    <div class="section-header">
      <p class="section-label">Platform</p>
      <h2 class="section-title">The Heady™ Ecosystem</h2>
      <p class="section-desc">A unified intelligence platform spanning every domain of AI.</p>
    </div>
    <div class="ecosystem-grid">
      <a class="eco-card" href="https://headyme.com"><h4>HeadyMe</h4><p>AI Operating System</p></a>
      <a class="eco-card" href="https://headysystems.com"><h4>HeadySystems</h4><p>Infrastructure Engine</p></a>
      <a class="eco-card" href="https://headyio.com"><h4>Heady I/O</h4><p>Developer Platform</p></a>
      <a class="eco-card" href="https://headyapi.com"><h4>HeadyAPI</h4><p>Intelligence Gateway</p></a>
      <a class="eco-card" href="https://headymcp.com"><h4>HeadyMCP</h4><p>MCP Server</p></a>
      <a class="eco-card" href="https://headyos.com"><h4>HeadyOS</h4><p>Latent OS</p></a>
      <a class="eco-card" href="https://headybuddy.org"><h4>HeadyBuddy</h4><p>AI Companion</p></a>
      <a class="eco-card" href="https://heady-ai.com"><h4>Heady AI</h4><p>Intelligence Hub</p></a>
      <a class="eco-card" href="https://headycloud.com"><h4>HeadyCloud</h4><p>Sovereign Infra</p></a>
      <a class="eco-card" href="https://headybot.com"><h4>HeadyBot</h4><p>Agent Orchestration</p></a>
      <a class="eco-card" href="https://headystore.com"><h4>HeadyStore</h4><p>AI Marketplace</p></a>
      <a class="eco-card" href="https://headyconnection.org"><h4>HeadyConnection</h4><p>AI for Good</p></a>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <h2 class="cta-title">Ready to <span class="accent">Start</span>?</h2>
    <p class="cta-desc">Join the Heady platform and experience AI without boundaries.</p>
    <div class="cta-buttons">
      <a href="${cta.primaryHref}" class="btn btn-primary">${cta.primary} →</a>
      <a href="${cta.secondaryHref}" class="btn btn-ghost">${cta.secondary}</a>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-links">
      <a href="https://headysystems.com">HeadySystems</a>
      <a href="https://headyio.com/docs">Documentation</a>
      <a href="https://headyconnection.com">Community</a>
      <a href="https://github.com/HeadyMe">GitHub</a>
      <a href="mailto:eric@headyconnection.org">Contact</a>
    </div>
    <p class="footer-copy">© 2026 HeadySystems Inc. — Sacred Geometry · Continuous Semantic Logic · 60+ Provisional Patents</p>
  </footer>

  <script>
    var ACCENT='${accent}';
    ${sacredGeoJS}
  </script>
</body>
</html>`;
}

function generateStubSite(stub) {
    const { slug, title, tagline, accent } = stub;
    const domain = slug.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '.com';

    return `<!DOCTYPE html>
<html lang="en" data-heady-site="${slug}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${tagline}</title>
  <meta name="description" content="${title} - ${tagline}. Part of the Heady™ intelligent platform by HeadySystems Inc.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${data.designTokens.fonts}&display=swap" rel="stylesheet">
  <style>
    :root{--accent:${accent};--bg:#0a0e17;--surface:#0d1221;--border:rgba(255,255,255,0.08);--text:#f0f4ff;--text2:#8b98b8;--text3:#4a5568;--font:'Outfit',sans-serif;--body:'Inter',sans-serif}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--text);font-family:var(--body);line-height:1.618;overflow-x:hidden;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px}
    .logo{font-family:var(--font);font-size:clamp(2rem,6vw,3.75rem);font-weight:800;margin-bottom:13px;letter-spacing:-0.03em}
    .logo .a{color:var(--accent)}
    .tagline{font-size:clamp(1rem,2.5vw,1.5rem);color:var(--text2);margin-bottom:34px;max-width:500px}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 21px;border:1px solid ${accent}40;border-radius:100px;background:${accent}15;font-size:0.875rem;color:var(--accent);margin-bottom:55px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:p 2s infinite}
    @keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:13px;max-width:900px;width:100%;margin-bottom:55px}
    .card{background:rgba(13,18,33,0.7);border:1px solid var(--border);border-radius:13px;padding:21px;backdrop-filter:blur(16px);transition:all .3s;text-decoration:none;color:var(--text)}
    .card:hover{border-color:${accent}40;transform:translateY(-3px)}
    .card h4{font-family:var(--font);font-size:.875rem;font-weight:600;margin-bottom:4px}
    .card p{font-size:.75rem;color:var(--text3)}
    .cta-row{display:flex;gap:13px;flex-wrap:wrap;justify-content:center}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:13px 34px;border-radius:8px;font-family:var(--body);font-size:.875rem;font-weight:600;cursor:pointer;border:none;transition:all .2s;text-decoration:none}
    .btn-p{background:var(--accent);color:var(--bg)}
    .btn-p:hover{transform:translateY(-1px);box-shadow:0 8px 24px ${accent}40}
    .btn-g{background:transparent;color:var(--text2);border:1px solid var(--border)}
    .btn-g:hover{color:var(--text);border-color:rgba(255,255,255,.2)}
    .footer{position:absolute;bottom:21px;font-size:.75rem;color:var(--text3)}
    canvas{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none}
  </style>
</head>
<body>
  <canvas id="sacred-geo-canvas" aria-hidden="true"></canvas>
  <div class="badge"><span class="badge-dot"></span>HeadySystems Inc. — 60+ Patents</div>
  <h1 class="logo"><span class="a">${title.split('™')[0]}</span>™</h1>
  <p class="tagline">${tagline}. Part of the Heady™ intelligent platform — Sacred Geometry powered AI infrastructure.</p>
  <div class="grid">
    <a class="card" href="https://headyme.com"><h4>HeadyMe</h4><p>AI Operating System</p></a>
    <a class="card" href="https://headysystems.com"><h4>HeadySystems</h4><p>Infrastructure</p></a>
    <a class="card" href="https://headyio.com"><h4>Heady I/O</h4><p>Developer SDK</p></a>
    <a class="card" href="https://headyapi.com"><h4>HeadyAPI</h4><p>AI Gateway</p></a>
    <a class="card" href="https://headymcp.com"><h4>HeadyMCP</h4><p>MCP Tools</p></a>
    <a class="card" href="https://headybuddy.org"><h4>HeadyBuddy</h4><p>AI Companion</p></a>
    <a class="card" href="https://headyos.com"><h4>HeadyOS</h4><p>Latent OS</p></a>
    <a class="card" href="https://heady-ai.com"><h4>Heady AI</h4><p>Intelligence Hub</p></a>
  </div>
  <div class="cta-row">
    <a href="https://heady-onboarding-bf4q4zywhq-ue.a.run.app" class="btn btn-p">Get Started →</a>
    <a href="https://headyio.com/docs" class="btn btn-g">Documentation</a>
  </div>
  <p class="footer">© 2026 HeadySystems Inc. — Sacred Geometry · Continuous Semantic Logic · 60+ Patents</p>
  <script>var ACCENT='${accent}';${sacredGeoJS}</script>
</body>
</html>`;
}

// ── MAIN ────────────────────────────────────────────────────────────────────

let generated = 0;
let skipped = 0;

// Generate full sites
for (const [slug, site] of Object.entries(data.sites)) {
    // Skip headyme — it already has premium content
    if (slug === 'headyme') { skipped++; continue; }

    const dir = join(SITES_DIR, slug);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const html = generateFullSite(site);
    writeFileSync(join(dir, 'index.html'), html, 'utf-8');
    generated++;
    console.log(`✓ ${slug} — full site (${(html.length / 1024).toFixed(1)}KB)`);
}

// Generate stub sites
for (const stub of data.stubSites) {
    const dir = join(SITES_DIR, stub.slug);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const html = generateStubSite(stub);
    writeFileSync(join(dir, 'index.html'), html, 'utf-8');
    generated++;
    console.log(`✓ ${stub.slug} — stub site (${(html.length / 1024).toFixed(1)}KB)`);
}

console.log(`\n◆ Done — ${generated} sites generated, ${skipped} skipped (already premium)`);
console.log(`  Sites directory: ${SITES_DIR}`);
