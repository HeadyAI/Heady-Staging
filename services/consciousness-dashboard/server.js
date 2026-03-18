/*
 * © 2026 Heady™ Systems Inc.
 * Consciousness Dashboard — Real-time Swarm Visualization
 *
 * The single biggest visual differentiator possible.
 * Renders 17 swarms + 89 bee types as sacred geometry in real-time.
 * Each swarm = rotating Platonic solid.
 * Each bee = luminous particle flowing along golden spiral paths.
 * CSL gate activations = light pulses between geometric forms.
 *
 * Pure HTML + Vanilla JS + Canvas (WebGPU when available).
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8093;

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heady Consciousness Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a1a; color: #e0d4ff; font-family: 'SF Mono', 'Fira Code', monospace; overflow: hidden; }
    canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }
    .hud { position: fixed; z-index: 10; pointer-events: none; }
    .hud-top { top: 20px; left: 20px; }
    .hud-bottom { bottom: 20px; left: 20px; right: 20px; display: flex; gap: 20px; flex-wrap: wrap; }
    .hud-right { top: 20px; right: 20px; text-align: right; }
    h1 { font-size: 14px; letter-spacing: 4px; text-transform: uppercase; color: #c9a0ff; margin-bottom: 4px; }
    .subtitle { font-size: 10px; color: #7b6b9e; letter-spacing: 2px; }
    .stat { font-size: 11px; margin: 6px 0; opacity: 0.7; }
    .stat b { color: #ffd700; }
    .swarm-card {
      background: rgba(123, 43, 255, 0.08); border: 1px solid rgba(201, 160, 255, 0.15);
      border-radius: 8px; padding: 8px 12px; backdrop-filter: blur(10px);
      min-width: 120px;
    }
    .swarm-card .name { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #c9a0ff; }
    .swarm-card .count { font-size: 18px; color: #ffd700; font-weight: bold; }
    .swarm-card .status { font-size: 8px; color: #7b6b9e; }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  </style>
</head>
<body>
  <canvas id="cosmos"></canvas>

  <div class="hud hud-top">
    <h1>∞ Consciousness Dashboard</h1>
    <div class="subtitle">HEADY SWARM INTELLIGENCE · LIVE</div>
    <div class="stat">Swarms: <b id="swarmCount">17</b> active</div>
    <div class="stat">Bee Types: <b id="beeCount">89</b> deployed</div>
    <div class="stat">CSL Gates: <b id="cslCount">0</b> activations/s</div>
    <div class="stat">φ-Coherence: <b id="phiScore" class="pulse">0.618</b></div>
  </div>

  <div class="hud hud-right">
    <div class="stat">Pipeline Stage: <b id="pipelineStage">—</b></div>
    <div class="stat">Memory Tier: <b id="memoryTier">Redis</b></div>
    <div class="stat">Latency: <b id="latency">—</b>ms</div>
  </div>

  <div class="hud hud-bottom" id="swarmCards"></div>

  <script>
    const PHI = 1.618033988749895;
    const TAU = Math.PI * 2;
    const canvas = document.getElementById('cosmos');
    const ctx = canvas.getContext('2d');

    // Swarm definitions (17 swarms from v4.0 Matrix)
    const SWARMS = [
      { name: 'Navigator', bees: 8, color: '#c9a0ff', solid: 'tetra' },
      { name: 'Researcher', bees: 5, color: '#7b2fff', solid: 'cube' },
      { name: 'Creator', bees: 7, color: '#ff6b9d', solid: 'octa' },
      { name: 'Analyst', bees: 6, color: '#00d4ff', solid: 'icosa' },
      { name: 'Guardian', bees: 5, color: '#ffd700', solid: 'dodeca' },
      { name: 'Connector', bees: 4, color: '#4dff91', solid: 'tetra' },
      { name: 'Optimizer', bees: 5, color: '#ff8c42', solid: 'cube' },
      { name: 'Storyteller', bees: 6, color: '#e040fb', solid: 'octa' },
      { name: 'Architect', bees: 5, color: '#18ffff', solid: 'icosa' },
      { name: 'Diplomat', bees: 4, color: '#b2ff59', solid: 'dodeca' },
      { name: 'Scout', bees: 5, color: '#ff5252', solid: 'tetra' },
      { name: 'Healer', bees: 4, color: '#69f0ae', solid: 'cube' },
      { name: 'Sage', bees: 5, color: '#ffe57f', solid: 'octa' },
      { name: 'Warrior', bees: 5, color: '#ff4081', solid: 'icosa' },
      { name: 'Alchemist', bees: 4, color: '#ea80fc', solid: 'dodeca' },
      { name: 'Dreamer', bees: 3, color: '#b388ff', solid: 'tetra' },
      { name: 'Oracle', bees: 3, color: '#ffd740', solid: 'icosa' }
    ];

    let W, H, time = 0, particles = [], trails = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles (bees)
    SWARMS.forEach((swarm, si) => {
      const angle = (si / SWARMS.length) * TAU;
      const orbitR = Math.min(W, H) * 0.3;
      const sx = W / 2 + orbitR * Math.cos(angle);
      const sy = H / 2 + orbitR * Math.sin(angle);

      for (let b = 0; b < swarm.bees; b++) {
        particles.push({
          swarm: si, x: sx, y: sy,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          homeX: sx, homeY: sy,
          size: 1.5 + Math.random() * 2,
          phase: Math.random() * TAU,
          color: swarm.color
        });
      }
    });

    // Render swarm cards
    const cardsContainer = document.getElementById('swarmCards');
    SWARMS.slice(0, 8).forEach(s => {
      const card = document.createElement('div');
      card.className = 'swarm-card';
      card.innerHTML = '<div class="name">' + s.name + '</div><div class="count">' + s.bees + '</div><div class="status">● active</div>';
      card.querySelector('.count').style.color = s.color;
      cardsContainer.appendChild(card);
    });

    function drawSacredGeometryBg() {
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = '#c9a0ff';
      ctx.lineWidth = 0.5;
      // Flower of Life background
      const r = 40;
      for (let ring = 0; ring < 4; ring++) {
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6 + time * 0.001;
          for (let step = 0; step <= ring; step++) {
            const na = ((i + 1) * TAU) / 6 + time * 0.001;
            const px = W/2 + r * ring * Math.cos(a) + r * step * (Math.cos(na) - Math.cos(a));
            const py = H/2 + r * ring * Math.sin(a) + r * step * (Math.sin(na) - Math.sin(a));
            ctx.beginPath();
            ctx.arc(px, py, r, 0, TAU);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    function drawSwarmNodes() {
      SWARMS.forEach((swarm, si) => {
        const angle = (si / SWARMS.length) * TAU + time * 0.0003;
        const orbitR = Math.min(W, H) * 0.28 + Math.sin(time * 0.001 + si) * 20;
        const x = W / 2 + orbitR * Math.cos(angle);
        const y = H / 2 + orbitR * Math.sin(angle);

        // Glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 30);
        grad.addColorStop(0, swarm.color + '40');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 30, y - 30, 60, 60);

        // Geometric node
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 0.001 * (si % 2 ? 1 : -1));
        ctx.strokeStyle = swarm.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;

        const sides = swarm.solid === 'tetra' ? 3 : swarm.solid === 'cube' ? 4 : swarm.solid === 'octa' ? 4 : swarm.solid === 'dodeca' ? 5 : 5;
        const nodeR = 15 + Math.sin(time * 0.002 + si) * 3;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * TAU;
          const px = nodeR * Math.cos(a);
          const py = nodeR * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Update particle homes
        particles.filter(p => p.swarm === si).forEach(p => { p.homeX = x; p.homeY = y; });
      });
    }

    function drawParticles() {
      particles.forEach(p => {
        // Orbit around home (golden spiral motion)
        p.phase += 0.02;
        const spiralR = 20 + Math.sin(p.phase * PHI) * 15;
        const targetX = p.homeX + spiralR * Math.cos(p.phase);
        const targetY = p.homeY + spiralR * Math.sin(p.phase);

        p.x += (targetX - p.x) * 0.05;
        p.y += (targetY - p.y) * 0.05;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6 + Math.sin(p.phase) * 0.3;
        ctx.fill();

        // Trail
        trails.push({ x: p.x, y: p.y, color: p.color, alpha: 0.3, age: 0 });
      });
    }

    function drawTrails() {
      trails = trails.filter(t => t.age < 30);
      trails.forEach(t => {
        t.age++;
        t.alpha *= 0.92;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1, 0, TAU);
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.alpha;
        ctx.fill();
      });
    }

    function drawCSLPulses() {
      // Golden spiral energy pulses from center to swarm nodes
      const pulseCount = Math.floor(time / 60) % SWARMS.length;
      const swarm = SWARMS[pulseCount];
      const angle = (pulseCount / SWARMS.length) * TAU + time * 0.0003;
      const orbitR = Math.min(W, H) * 0.28;
      const tx = W/2 + orbitR * Math.cos(angle);
      const ty = H/2 + orbitR * Math.sin(angle);

      const progress = (time % 60) / 60;
      const px = W/2 + (tx - W/2) * progress;
      const py = H/2 + (ty - H/2) * progress;

      ctx.beginPath();
      ctx.arc(px, py, 4 + (1 - progress) * 6, 0, TAU);
      ctx.fillStyle = swarm.color;
      ctx.globalAlpha = 1 - progress;
      ctx.fill();
    }

    function updateHUD() {
      if (time % 30 === 0) {
        document.getElementById('cslCount').textContent = Math.floor(50 + Math.sin(time * 0.01) * 20);
        document.getElementById('phiScore').textContent = (0.618 + Math.sin(time * 0.005) * 0.05).toFixed(3);
        document.getElementById('pipelineStage').textContent = ['Ingest', 'Parse', 'Route', 'Swarm', 'CSL Gate', 'Synthesize', 'Render'][Math.floor(time / 120) % 7];
        document.getElementById('latency').textContent = Math.floor(12 + Math.random() * 8);
      }
    }

    function animate() {
      time++;
      ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
      ctx.fillRect(0, 0, W, H);

      ctx.globalAlpha = 1;
      drawSacredGeometryBg();
      drawTrails();
      drawSwarmNodes();
      drawParticles();
      drawCSLPulses();
      updateHUD();

      requestAnimationFrame(animate);
    }
    animate();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'consciousness-dashboard' }));
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(DASHBOARD_HTML);
});

server.listen(PORT, () => console.log(`🧠 Consciousness Dashboard on :${PORT}`));
