#!/usr/bin/env node
/**
 * Heady Site Generator v3 — SACRED GEOMETRY EDITION
 * Produces visually-immense, breathing interfaces using cosmic starfields
 * and sacred geometric patterns as requested.
 */

const fs = require('fs');
const path = require('path');

const SITES_DIR = '/home/headyme/sites';

// ── Shared Content Elements ──────────────────────────────────────────

const HEADY_LOOP_STEPS = [
  { name: 'Ask', desc: 'Intent captured via voice, chat, or API.' },
  { name: 'Plan', desc: 'HeadyJules decomposes into DAG subtasks.' },
  { name: 'Route', desc: 'HeadyPromoter selects optimal AI nodes.' },
  { name: 'Execute', desc: 'Concurrent execution across 7 AI models.' },
  { name: 'Validate', desc: 'Arena Mode & HeadyBattle Socratic review.' },
  { name: 'Prove', desc: 'Cryptographic receipt of models, cost, and scores.' },
];

// ── Site Definitions ─────────────────────────────────────────────────
const sites = [
  {
    id: 'headyme', dir: 'headyme',
    title: 'HeadyMe — Your Personal Cloud',
    tagline: 'Everything you worked on. Everything that\'s next.',
    description: 'Your AI-powered personal cloud hub. HeadyMe is the command center for your entire digital life — connecting all Heady verticals into one unified experience.',
    gradient: ['#7C3AED', '#2563EB'], accent: '#818cf8', icon: '🧠',
    geoType: 'Flower of Life',
    buyer: 'Individual prosumer / power user',
    workflow: '"Show me everything I worked on this week across all devices, and what\'s left"',
    integrations: ['Calendar', 'Email', 'File Storage', 'GitHub', 'Notion'],
    features: [
      { icon: '🔄', title: 'Cross-Device Memory', desc: 'Your context follows you across every device, every session.' },
      { icon: '📋', title: 'AI Task Planning', desc: 'Auto-generates daily plans from your calendar, projects, and goals.' },
      { icon: '🏆', title: 'Arena Optimization', desc: 'Multiple AI strategies compete to find the best approach to your tasks.' },
      { icon: '🔐', title: 'Private by Design', desc: 'Your data stays yours. Local-first with optional cloud sync.' },
    ],
    cta: 'Launch Your Dashboard', ctaHref: 'https://app.headyme.com', domain: 'headyme.com',
  },
  {
    id: 'headysystems', dir: 'headysystems',
    title: 'HeadySystems — Platform Operations Intelligence',
    tagline: 'Self-healing infrastructure. Arena-validated remediation.',
    description: 'Operations backbone — monitor 18+ services, auto-detect drift, and let AI strategies compete to find the optimal fix.',
    gradient: ['#059669', '#0D9488'], accent: '#34D399', icon: '⚡',
    geoType: 'Metatrons Cube',
    buyer: 'Platform/DevOps team lead',
    workflow: '"Show me all services, their health, and what needs attention — with auto-fix proposals"',
    integrations: ['PM2', 'Cloudflare', 'Docker', 'Coolify', 'GitHub Actions'],
    features: [
      { icon: '📊', title: 'Service Observatory', desc: '18 PM2 processes, Cloudflare Workers, and edge nodes — one view.' },
      { icon: '🔧', title: 'Self-Healing Ops', desc: 'Arena Mode proposes 3 competing fixes for every issue. You pick or auto-approve.' },
      { icon: '🛡️', title: 'Drift Detection', desc: 'Continuous compliance audits catch config drift before it causes outages.' },
      { icon: '📈', title: 'FinOps Dashboard', desc: 'Track cost-per-request, model selection efficiency, and infrastructure spend.' },
    ],
    cta: 'Open Operations Console', ctaHref: 'https://app.headysystems.com', domain: 'headysystems.com',
  },
  {
    id: 'headyconnection', dir: 'headyconnection',
    title: 'HeadyConnection — AI for Nonprofit Impact',
    tagline: 'Amplify your mission with intelligent automation.',
    description: 'Empowers nonprofits with AI-powered grant writing, impact reporting, and donor engagement — with full Proof View transparency.',
    gradient: ['#D97706', '#DC2626'], accent: '#FBBF24', icon: '🤝',
    geoType: 'Seed of Life',
    buyer: 'Nonprofit exec / program manager',
    workflow: '"Generate a grant application for our new community program using our data"',
    integrations: ['Donor CRM', 'Impact Tracking', 'Document Generation'],
    features: [
      { icon: '📝', title: 'AI Grant Writing', desc: 'Generate grant applications backed by your real data. Every claim verified.' },
      { icon: '📊', title: 'Impact Reporting', desc: 'Auto-generate reports that show measurable outcomes and program effectiveness.' },
      { icon: '✅', title: 'Proof View Receipts', desc: 'Every AI output comes with a transparent audit trail. No hallucination risk.' },
      { icon: '👥', title: 'Volunteer Intelligence', desc: 'Match volunteers to opportunities using AI-driven skill and schedule analysis.' },
    ],
    cta: 'Start Amplifying Impact', ctaHref: 'https://app.headyconnection.org', domain: 'headyconnection.org',
  },
  {
    id: 'headymcp', dir: 'headymcp',
    title: 'HeadyMCP — Verified AI Connector Marketplace',
    tagline: 'Find it. Trust it. Ship it.',
    description: 'The trusted registry for Model Context Protocol connectors — verified publishers, quality scoring, one-click install.',
    gradient: ['#7C3AED', '#EC4899'], accent: '#C084FC', icon: '🔌',
    geoType: 'Metatrons Cube',
    buyer: 'Developer building AI integrations',
    workflow: '"Find a connector for Stripe, verify it\'s safe, install it with one click"',
    integrations: ['npm', 'GitHub', 'Security Scanners', 'Telemetry'],
    features: [
      { icon: '🔍', title: 'Connector Discovery', desc: 'Search hundreds of MCP connectors by category, quality score, and publisher.' },
      { icon: '✓', title: 'Trust Scoring', desc: 'Every connector is security-scanned, rated, and verified before listing.' },
      { icon: '⚡', title: 'One-Click Install', desc: 'Install connectors to HeadyBuddy, IDEs, or apps instantly.' },
      { icon: '🏗️', title: 'Publish Your Own', desc: 'Build and publish connectors with full governance pipeline support.' },
    ],
    cta: 'Browse Connectors', ctaHref: 'https://headymcp.com', domain: 'headymcp.com',
  },
  {
    id: 'headyio', dir: 'headyio',
    title: 'HeadyIO — Developer Portal & API',
    tagline: 'Build with Heady. Ship with confidence.',
    description: 'Developer hub — API documentation, SDKs, code examples, and everything you need to integrate the Heady ecosystem.',
    gradient: ['#1E40AF', '#3B82F6'], accent: '#60A5FA', icon: '💻',
    geoType: 'Metatrons Cube',
    buyer: 'Developer / technical architect',
    workflow: '"Show me how to add AI to my app in 5 minutes using the Heady API"',
    integrations: ['API Sandbox', 'Code Examples', 'SDK Packages'],
    features: [
      { icon: '📚', title: 'API Documentation', desc: 'Complete REST API reference with interactive examples and response schemas.' },
      { icon: '🧰', title: 'SDKs & Libraries', desc: 'JavaScript, Python, and Go SDKs for rapid integration.' },
      { icon: '🏎️', title: 'Arena Mode API', desc: 'Run multi-model competitions programmatically via the Arena API.' },
      { icon: '🔑', title: 'API Keys & Auth', desc: 'Generate API keys, configure scopes, and manage access.' },
    ],
    cta: 'Read the Docs', ctaHref: 'https://api.headyio.com', domain: 'headyio.com',
  },
  {
    id: 'headybuddy', dir: 'headybuddy',
    title: 'HeadyBuddy — Your AI Companion',
    tagline: 'Always learning. Always there. Always you.',
    description: 'Personal AI companion — voice-activated, cross-device, with persistent memory that learns from every interaction.',
    gradient: ['#EC4899', '#8B5CF6'], accent: '#F472B6', icon: '🤖',
    geoType: 'Flower of Life',
    buyer: 'Knowledge worker / prosumer',
    workflow: '"Hey Buddy, summarize my unread messages and draft replies"',
    integrations: ['Email', 'Calendar', 'Slack', 'Browser Tabs', 'HeadyMemory'],
    features: [
      { icon: '🎤', title: 'Voice Activation', desc: 'Talk naturally. HeadyBuddy listens, understands, and acts across devices.' },
      { icon: '🧠', title: 'Persistent Memory', desc: 'HeadyBuddy remembers your preferences, context, and conversation history.' },
      { icon: '🔄', title: 'Cross-Device Sync', desc: 'Start a conversation on your phone, continue on your laptop. Seamlessly.' },
      { icon: '🛡️', title: 'Arena-Validated', desc: 'Every response is evaluated by competing AI strategies for accuracy.' },
    ],
    cta: 'Meet Your Buddy', ctaHref: 'https://app.headybuddy.org', domain: 'headybuddy.org',
  }
];

// Combine standard and aliased versions
const allSites = [...sites];
sites.forEach(s => {
  if (s.id !== 'headyme') {
    const alias = { ...s, id: s.id + '-com', dir: s.dir + '-com' };
    if (s.id === 'headybuddy' || s.id === 'headyconnection') {
      alias.id = s.id + '-org'; alias.dir = s.dir + '-org';
    }
    allSites.push(alias);
  } else {
    allSites.push({ ...s, id: 'headyme-com', dir: 'headyme-com' });
  }
});
allSites.push({
  id: 'instant', dir: 'instant',
  title: '1ime1 — Instant Everything', tagline: 'One time. Every time. All the time.',
  description: 'Instant access to AI-powered tools, creative generation, and rapid deployment.',
  gradient: ['#F59E0B', '#EF4444'], accent: '#FCD34D', icon: '⚡',
  geoType: 'Seed of Life',
  buyer: 'Speed-focused creators', workflow: '"Build and deploy my idea in 60 seconds"',
  integrations: ['Web', 'API', 'Design'],
  features: [
    { icon: '🚀', title: 'Instant Deploy', desc: 'Ship websites, APIs, and AI workflows in seconds. Zero config.' },
    { icon: '🎨', title: 'AI Creative', desc: 'Generate images, copy, and designs with one prompt.' },
    { icon: '⏱️', title: 'Real-Time', desc: 'Everything streams. Everything updates live. No refreshing.' },
    { icon: '🔮', title: 'Predictive', desc: 'AI anticipates what you need before you ask for it.' },
  ],
  cta: 'Try it Now', ctaHref: 'https://1ime1.com', domain: '1ime1.com'
});

// ── HTML Generator ───────────────────────────────────────────────────

function generateSite(site) {
  const [g1, g2] = site.gradient;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.title}</title>
  <meta name="description" content="${site.description}">
  <meta name="theme-color" content="${g1}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${site.icon}</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --g1: ${g1}; --g2: ${g2}; --accent: ${site.accent};
      --bg: #000000; --surface: rgba(15,15,20,0.18); --surface-2: rgba(25,25,35,0.4);
      --text: #e2e8f0; --text-muted: rgba(255,255,255,0.6); --border: rgba(255,255,255,0.06);
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      background: #000000; color: var(--text);
      line-height: 1.6; overflow-x: hidden; min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    #cosmic-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    .site-wrap { position: relative; z-index: 10; display: flex; flex-direction: column; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    
    /* ── Header ── */
    header { padding: 24px 0; display: flex; justify-content: space-between; align-items: center; }
    .logo-wrap { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-title { font-size: 1.4rem; font-weight: 700; color: var(--accent); letter-spacing: 1px; text-shadow: 0 0 10px rgba(129,140,248,0.4); }
    .logo-sub { font-size: 0.65rem; color: var(--text-muted); letter-spacing: 0.15em; text-transform: uppercase; }
    nav { display: flex; gap: 8px; background: rgba(20,20,25,0.12); padding: 6px; border-radius: 100px; backdrop-filter: blur(10px); border: 1px solid var(--border); }
    nav a { padding: 6px 16px; border-radius: 50px; font-size: 0.75rem; font-weight: 500; color: var(--text-muted); text-decoration: none; transition: all 0.3s; }
    nav a:hover, nav a.active { background: var(--accent); color: #000; box-shadow: 0 0 15px var(--accent); }

    /* ── Hero ── */
    .hero { flex: 1; padding: 100px 0 60px; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 50px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); backdrop-filter: blur(10px); font-size: 0.7rem; color: #fff; margin-bottom: 2rem; letter-spacing: 1px; text-transform: uppercase; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 2s ease infinite; box-shadow: 0 0 10px var(--accent); }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.8); } }
    .hero h1 { font-size: clamp(3rem, 8vw, 5rem); font-weight: 800; color: var(--accent); margin-bottom: 1rem; letter-spacing: -0.03em; text-shadow: 0 0 30px rgba(129,140,248,0.3); }
    .hero-sub { font-size: 1.2rem; color: #fff; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 1rem; opacity: 0.9; }
    .sacred-badge { display: inline-block; padding: 6px 18px; border: 1px solid rgba(129,140,248,0.25); border-radius: 50px; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; color: var(--accent); text-transform: uppercase; margin-bottom: 2rem; backdrop-filter: blur(8px); }
    .hero-mantra { font-size: 0.9rem; color: var(--text-muted); max-width: 600px; margin-bottom: 3rem; letter-spacing: 0.05em; }
    
    .btn { padding: 14px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; transition: all 0.3s; cursor: pointer; border: none; font-size: 1rem; }
    .btn-primary { background: var(--accent); color: #000; box-shadow: 0 0 20px var(--accent)44; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 30px var(--accent)66; }

    /* ── Playbook Metadata ── */
    .playbook { padding: 60px 0; border-top: 1px solid var(--border); }
    .p-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .p-card { background: var(--surface); padding: 32px; border-radius: 24px; backdrop-filter: blur(12px); border: 1px solid var(--border); }
    .p-card h3 { font-size: 0.7rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; }
    .p-card p { font-size: 1rem; font-weight: 500; color: #fff; line-height: 1.5; }

    /* ── Features ── */
    .features { padding: 80px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .f-card { background: var(--surface); padding: 40px; border-radius: 24px; backdrop-filter: blur(12px); border: 1px solid var(--border); transition: all 0.4s; position: relative; overflow: hidden; }
    .f-card:hover { transform: translateY(-5px); border-color: rgba(129,140,248,0.3); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .f-icon { font-size: 2rem; margin-bottom: 1.5rem; color: var(--accent); }
    .f-card h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #fff; }
    .f-card p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.8; }

    /* ── Footer ── */
    footer { padding: 60px 0; text-align: center; color: var(--text-muted); font-size: 0.75rem; letter-spacing: 1px; }

    @media (max-width: 768px) {
      .p-grid { grid-template-columns: 1fr; }
      nav { display: none; }
      .hero h1 { font-size: 2.8rem; }
    }
  </style>
</head>
<body>
  <canvas id="cosmic-canvas"></canvas>
  <div class="site-wrap">
    <div class="container">
      <header>
        <a class="logo-wrap" href="#">
          <div class="logo-title">${site.title.split('—')[0].trim()}</div>
          <div class="logo-sub">${site.tagline.split('.')[0]}</div>
        </a>
        <nav>
          <a href="#" class="active">Ecosystem</a>
          <a href="https://headyio.com">Developers</a>
          <a href="https://headymcp.com">Marketplace</a>
        </nav>
      </header>

      <section class="hero">
        <div class="status"><span class="status-dot"></span> Heady Ecosystem Online</div>
        <h1>${site.title.split('—')[0].trim()}</h1>
        <p class="hero-sub">${site.tagline.split('.')[0]}</p>
        <div class="sacred-badge">${site.geoType.toUpperCase()} · SACRED GEOMETRY v3</div>
        <p class="hero-mantra">${site.description}</p>
        <a href="${site.ctaHref}" class="btn btn-primary">${site.cta}</a>
      </section>

      <section class="playbook">
        <div class="p-grid">
          <div class="p-card"><h3>Target Buyer</h3><p>${site.buyer}</p></div>
          <div class="p-card" style="grid-column: span 2;"><h3>Killer Workflow</h3><p><i>${site.workflow}</i></p></div>
        </div>
      </section>

      <section class="features">
        ${site.features.map(f => `
        <div class="f-card">
          <div class="f-icon">${f.icon}</div>
          <h3>${f.title}</h3>
          <p>${f.desc}</p>
        </div>`).join('')}
      </section>

      <footer>
        © ${new Date().getFullYear()} ${site.title.split('—')[0].trim()} — ∞ SACRED GEOMETRY ∞ — Powered by HCFP Auto-Success 135
      </footer>
    </div>
  </div>

  <script>
    (function(){
        const canvas = document.getElementById('cosmic-canvas');
        const ctx = canvas.getContext('2d');
        let width, height, cx, cy;
        let stars = [];
        let time = 0;
        const baseColor = '${site.accent}';
        const geoType = '${site.geoType}';
        
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            cx = width / 2; cy = height / 2;
            stars = [];
            const numStars = (width * height) / 4000;
            for(let i=0; i<numStars; i++) {
                stars.push({ x: Math.random() * width, y: Math.random() * height, z: Math.random() * 2, size: Math.random() * 1.5, speed: Math.random() * 0.005 + 0.002, offset: Math.random() * Math.PI * 2 });
            }
        }
        function drawStars() {
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, width, height);
            stars.forEach(s => {
                s.y -= s.z * 0.2; s.x += s.z * 0.1;
                if(s.y < 0) s.y = height; if(s.x > width) s.x = 0;
                const blink = Math.sin(time * s.speed + s.offset) * 0.5 + 0.5;
                ctx.fillStyle = 'rgba(255,255,255,' + (blink * 0.6) + ')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
            });
        }
        function proj(x, y, z, tiltX, tiltY) {
            const cz = Math.cos(tiltY), sz = Math.sin(tiltY);
            const cx2 = Math.cos(tiltX), sx = Math.sin(tiltX);
            const x2 = x * cz - z * sz;
            const z2 = x * sz + z * cz;
            const y2 = y * cx2 - z2 * sx;
            return { x: x2, y: y2 };
        }
        function drawGeometry() {
            const radius = Math.min(width, height) * 0.4;
            const tiltX = Math.sin(time * 0.01) * 0.2;
            const tiltY = Math.cos(time * 0.008) * 0.2;
            const breathe = Math.sin(time * 0.02) * 0.01 + 1;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(breathe, breathe);
            ctx.rotate(time * 0.0001);
            ctx.lineWidth = 0.4;
            function getColor(alpha) {
                return 'hsla(230, 70%, 70%, ' + alpha + ')';
            }
            if (geoType === 'Flower of Life') {
                for (let ring = 0; ring < 4; ring++) {
                    const n = ring === 0 ? 1 : ring * 6;
                    const d = ring * radius * 0.25;
                    for (let i = 0; i < n; i++) {
                        const a = (Math.PI * 2 / Math.max(n,1)) * i;
                        const p = proj(Math.cos(a)*d, Math.sin(a)*d, 0, tiltX, tiltY);
                        ctx.strokeStyle = getColor(0.4);
                        ctx.beginPath(); ctx.arc(p.x, p.y, radius * 0.25, 0, Math.PI * 2); ctx.stroke();
                    }
                }
            } else if (geoType === 'Metatrons Cube') {
                const nodes = [{x:0,y:0,z:0}];
                for (let i = 0; i < 6; i++) { const a=(Math.PI/3)*i; nodes.push({x:Math.cos(a)*radius*0.5,y:Math.sin(a)*radius*0.5,z:0}); }
                for (let i = 0; i < 6; i++) { const a=(Math.PI/3)*i+Math.PI/6; nodes.push({x:Math.cos(a)*radius*0.9,y:Math.sin(a)*radius*0.9,z:0}); }
                for (let i = 0; i < nodes.length; i++) {
                    for (let j = i+1; j < nodes.length; j++) {
                        const p1 = proj(nodes[i].x, nodes[i].y, nodes[i].z, tiltX, tiltY);
                        const p2 = proj(nodes[j].x, nodes[j].y, nodes[j].z, tiltX, tiltY);
                        ctx.strokeStyle = getColor(0.2);
                        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                    }
                }
            } else if (geoType === 'Seed of Life') {
                for (let i = 0; i < 7; i++) {
                    const a = (Math.PI * 2 / 6) * i;
                    const d = i === 0 ? 0 : radius * 0.3;
                    const p = proj(Math.cos(a)*d, Math.sin(a)*d, 0, tiltX, tiltY);
                    ctx.strokeStyle = getColor(0.5);
                    ctx.beginPath(); ctx.arc(p.x, p.y, radius * 0.35, 0, Math.PI * 2); ctx.stroke();
                }
            }
            ctx.restore();
        }
        function animate() { time++; drawStars(); drawGeometry(); requestAnimationFrame(animate); }
        window.addEventListener('resize', resize);
        resize(); animate();
    })();
  </script>
</body>
</html>`;
}

// ── Deploy ────────────────────────────────────────────────────────────
let count = 0;
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR, { recursive: true });

for (const site of allSites) {
  const siteDir = path.join(SITES_DIR, site.dir);
  const distDir = path.join(siteDir, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  const html = generateSite(site);
  fs.writeFileSync(path.join(distDir, 'index.html'), html);
  count++;
  console.log(`✅ ${site.id.padEnd(25)} → ${distDir}/index.html (${(html.length / 1024).toFixed(1)} KB)`);
}

console.log(`\n🎯 Generated ${count} SACRED GEOMETRY sites in ${SITES_DIR}`);
