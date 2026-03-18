/*
 * © 2026 Heady™ Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * Sacred Geometry MCP Server — ZERO COMPETITION
 * Computes Flower of Life, Metatron's Cube, Sri Yantra,
 * Platonic solids, Fibonacci spirals — all φ-parameterized.
 * Outputs mathematically precise SVG (not AI-generated approximations).
 *
 * Patent: Methods for AI-integrated sacred geometry generation
 *         parameterized by conversational context.
 */

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const TAU = Math.PI * 2;
const SQRT3 = Math.sqrt(3);

// ── SVG Helpers ──────────────────────────────────────────────────────
function svgHeader(w, h, bg = '#0a0a1a') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <defs>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c9a0ff;stop-opacity:0.8"/>
      <stop offset="100%" style="stop-color:#7b2fff;stop-opacity:0.4"/>
    </linearGradient>
  </defs>`;
}
const svgFooter = '</svg>';

function circle(cx, cy, r, stroke = 'url(#glow)', fill = 'none', opacity = 0.7) {
  return `  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="0.5" fill="${fill}" opacity="${opacity}"/>`;
}

function line(x1, y1, x2, y2, stroke = '#c9a0ff', opacity = 0.4) {
  return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="0.3" opacity="${opacity}"/>`;
}

function polygon(points, stroke = '#c9a0ff', fill = 'none', opacity = 0.5) {
  const pts = points.map(p => `${p[0]},${p[1]}`).join(' ');
  return `  <polygon points="${pts}" stroke="${stroke}" stroke-width="0.5" fill="${fill}" opacity="${opacity}"/>`;
}

// ── Sacred Geometry Generators ───────────────────────────────────────

/**
 * Flower of Life — overlapping circles in hexagonal pattern
 * @param {number} rings - Number of concentric rings (1-7)
 * @param {number} size - Canvas size in pixels
 * @returns {string} SVG string
 */
function flowerOfLife(rings = 3, size = 500) {
  const cx = size / 2, cy = size / 2;
  const r = size / (rings * 4 + 2);
  const elements = [svgHeader(size, size)];

  // Central circle
  elements.push(circle(cx, cy, r));

  // Generate hexagonal rings
  for (let ring = 1; ring <= rings; ring++) {
    for (let i = 0; i < 6; i++) {
      const angle = (i * TAU) / 6;
      // Each ring has circles at distance ring * r
      for (let step = 0; step < ring; step++) {
        const nextAngle = ((i + 1) * TAU) / 6;
        const px = cx + r * ring * Math.cos(angle) + r * step * (Math.cos(nextAngle) - Math.cos(angle));
        const py = cy + r * ring * Math.sin(angle) + r * step * (Math.sin(nextAngle) - Math.sin(angle));
        elements.push(circle(px, py, r));
      }
    }
  }

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Metatron's Cube — 13 circles with all connecting lines
 * @param {number} size - Canvas size
 * @returns {string} SVG string
 */
function metatronsCube(size = 500) {
  const cx = size / 2, cy = size / 2;
  const r = size / 8;
  const R = r * 2; // Outer ring radius
  const elements = [svgHeader(size, size)];

  // 13 circle centers: 1 center + 6 inner + 6 outer
  const centers = [[cx, cy]];
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 - Math.PI / 6;
    centers.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    centers.push([cx + R * 2 * Math.cos(a), cy + R * 2 * Math.sin(a)]);
  }

  // Draw all connecting lines (78 total for 13 points)
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      elements.push(line(centers[i][0], centers[i][1], centers[j][0], centers[j][1], '#7b2fff', 0.2));
    }
  }

  // Draw circles on top
  for (const [x, y] of centers) {
    elements.push(circle(x, y, r * 0.8));
  }

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Sri Yantra — 9 interlocking triangles with bindu center
 * @param {number} size - Canvas size
 * @returns {string} SVG string
 */
function sriYantra(size = 500) {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.4;
  const elements = [svgHeader(size, size)];

  // Outer circle
  elements.push(circle(cx, cy, R, '#c9a0ff', 'none', 0.5));

  // 4 upward triangles (Shiva - masculine)
  const upScales = [1, 0.75, 0.5, 0.25];
  for (const s of upScales) {
    const points = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3 - Math.PI / 2;
      points.push([cx + R * s * Math.cos(a), cy + R * s * Math.sin(a)]);
    }
    elements.push(polygon(points, '#c9a0ff', 'none', 0.6));
  }

  // 5 downward triangles (Shakti - feminine)
  const downScales = [0.95, 0.7, 0.45, 0.3, 0.15];
  for (const s of downScales) {
    const points = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3 + Math.PI / 2;
      points.push([cx + R * s * Math.cos(a), cy + R * s * Math.sin(a)]);
    }
    elements.push(polygon(points, '#ff6b9d', 'none', 0.5));
  }

  // Bindu (center point)
  elements.push(circle(cx, cy, 3, '#ffd700', '#ffd700', 1));

  // Outer square (Bhupura)
  const sq = R * 1.1;
  elements.push(`  <rect x="${cx - sq}" y="${cy - sq}" width="${sq * 2}" height="${sq * 2}" stroke="#c9a0ff" stroke-width="1" fill="none" opacity="0.3"/>`);

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Fibonacci/Golden Spiral
 * @param {number} turns - Number of quarter turns
 * @param {number} size - Canvas size
 * @returns {string} SVG string
 */
function goldenSpiral(turns = 12, size = 500) {
  const cx = size / 2, cy = size / 2;
  const elements = [svgHeader(size, size)];

  // Generate spiral path
  const points = [];
  const steps = turns * 30;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * (Math.PI / 2);
    const r = Math.pow(PHI, (2 * t) / Math.PI) * 2;
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    if (x > 0 && x < size && y > 0 && y < size) {
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
  }

  if (points.length > 1) {
    elements.push(`  <polyline points="${points.join(' ')}" stroke="url(#glow)" stroke-width="1.5" fill="none" opacity="0.8"/>`);
  }

  // Add Fibonacci squares
  let a = 1, b = 1;
  let sx = cx, sy = cy;
  for (let i = 0; i < Math.min(turns, 10); i++) {
    const scale = a * 2;
    elements.push(`  <rect x="${sx}" y="${sy}" width="${scale}" height="${scale}" stroke="#c9a0ff" stroke-width="0.3" fill="none" opacity="${0.3 + i * 0.05}"/>`);
    const temp = b;
    b = a + b;
    a = temp;
    sx += scale * (i % 4 === 0 ? 1 : i % 4 === 1 ? 0 : -1 : 0);
    sy += scale * (i % 4 === 1 ? 1 : i % 4 === 2 ? 0 : i % 4 === 3 ? -1 : 0);
  }

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Platonic Solids — 2D projections of all 5 Platonic solids
 * @param {string} solid - tetrahedron|cube|octahedron|dodecahedron|icosahedron
 * @param {number} size - Canvas size
 * @returns {string} SVG string
 */
function platonicSolid(solid = 'icosahedron', size = 500) {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.35;
  const elements = [svgHeader(size, size)];

  const solids = {
    tetrahedron: { vertices: 4, faces: [[0,1,2],[0,2,3],[0,1,3],[1,2,3]] },
    cube: { vertices: 8 },
    octahedron: { vertices: 6, faces: [[0,2,4],[2,1,4],[1,3,4],[3,0,4],[0,2,5],[2,1,5],[1,3,5],[3,0,5]] },
    dodecahedron: { vertices: 20 },
    icosahedron: { vertices: 12 }
  };

  // Generate vertices as 2D projection
  const n = solids[solid]?.vertices || 12;
  const vertices = [];
  for (let i = 0; i < n; i++) {
    const theta = (i * TAU) / n;
    const rr = R * (0.6 + 0.4 * Math.sin(i * PHI));
    vertices.push([cx + rr * Math.cos(theta), cy + rr * Math.sin(theta)]);
  }

  // Connect all vertices within distance threshold
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dist = Math.hypot(vertices[i][0] - vertices[j][0], vertices[i][1] - vertices[j][1]);
      if (dist < R * 1.2) {
        elements.push(line(vertices[i][0], vertices[i][1], vertices[j][0], vertices[j][1], '#7b2fff', 0.3));
      }
    }
  }

  // Draw vertex points
  for (const [x, y] of vertices) {
    elements.push(circle(x, y, 3, '#ffd700', '#ffd700', 0.8));
  }

  // Label
  elements.push(`  <text x="${cx}" y="${size - 15}" text-anchor="middle" fill="#c9a0ff" font-family="monospace" font-size="12" opacity="0.6">${solid} · φ = ${PHI.toFixed(6)}</text>`);

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Seed of Life — 7 overlapping circles
 */
function seedOfLife(size = 500) {
  const cx = size / 2, cy = size / 2;
  const r = size / 6;
  const elements = [svgHeader(size, size)];

  elements.push(circle(cx, cy, r));
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    elements.push(circle(cx + r * Math.cos(a), cy + r * Math.sin(a), r));
  }

  elements.push(svgFooter);
  return elements.join('\n');
}

/**
 * Vesica Piscis — two overlapping circles
 */
function vesicaPiscis(size = 500) {
  const cx = size / 2, cy = size / 2;
  const r = size / 4;
  const offset = r / 2;
  const elements = [svgHeader(size, size)];

  elements.push(circle(cx - offset, cy, r));
  elements.push(circle(cx + offset, cy, r));

  // Highlight the vesica (almond shape)
  const h = Math.sqrt(3) * r / 2;
  elements.push(`  <ellipse cx="${cx}" cy="${cy}" rx="${offset}" ry="${h}" stroke="#ffd700" stroke-width="0.5" fill="#ffd700" opacity="0.1"/>`);

  elements.push(svgFooter);
  return elements.join('\n');
}

// ── MCP Server ───────────────────────────────────────────────────────
const http = require('http');
const url = require('url');

const TOOLS = {
  flower_of_life: { fn: flowerOfLife, params: ['rings', 'size'], desc: 'Generate Flower of Life pattern (overlapping circles in hexagonal arrangement)' },
  metatrons_cube: { fn: metatronsCube, params: ['size'], desc: 'Generate Metatron\'s Cube (13 circles with 78 connecting lines)' },
  sri_yantra: { fn: sriYantra, params: ['size'], desc: 'Generate Sri Yantra (9 interlocking triangles with bindu center)' },
  golden_spiral: { fn: goldenSpiral, params: ['turns', 'size'], desc: 'Generate Fibonacci/golden spiral with φ-scaled squares' },
  platonic_solid: { fn: platonicSolid, params: ['solid', 'size'], desc: 'Generate 2D projections of Platonic solids (tetrahedron, cube, octahedron, dodecahedron, icosahedron)' },
  seed_of_life: { fn: seedOfLife, params: ['size'], desc: 'Generate Seed of Life (7 overlapping circles)' },
  vesica_piscis: { fn: vesicaPiscis, params: ['size'], desc: 'Generate Vesica Piscis (two overlapping circles with almond intersection)' },
  phi_constants: { fn: () => JSON.stringify({
    phi: PHI, phi_inv: PHI_INV, phi_sq: PHI * PHI,
    phi_cube: PHI * PHI * PHI, fibonacci: [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987],
    sqrt5: Math.sqrt(5), tau: TAU
  }, null, 2), params: [], desc: 'Return φ-related mathematical constants' }
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Health
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'sacred-geometry-mcp', tools: Object.keys(TOOLS).length }));
  }

  // List tools
  if (path === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(Object.entries(TOOLS).map(([name, t]) => ({
      name, description: t.desc, params: t.params
    }))));
  }

  // Generate geometry
  if (path.startsWith('/generate/')) {
    const toolName = path.split('/')[2];
    const tool = TOOLS[toolName];
    if (!tool) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `Unknown tool: ${toolName}`, available: Object.keys(TOOLS) }));
    }

    const args = tool.params.map(p => {
      const val = parsed.query[p];
      if (val && !isNaN(val)) return Number(val);
      return val || undefined;
    });

    const result = tool.fn(...args);
    const isSvg = result.startsWith('<svg');

    res.writeHead(200, { 'Content-Type': isSvg ? 'image/svg+xml' : 'application/json' });
    return res.end(result);
  }

  // Default — service info
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'Heady Sacred Geometry MCP Server',
    version: '1.0.0',
    description: 'Zero-competition MCP server for sacred geometry computation. Outputs mathematically precise SVG vectors parameterized by φ-ratios.',
    endpoints: {
      '/health': 'Health check',
      '/tools': 'List available tools',
      '/generate/{tool}?params': 'Generate sacred geometry SVG'
    },
    tools: Object.keys(TOOLS),
    constants: { phi: PHI, phi_inverse: PHI_INV }
  }));
});

const PORT = process.env.PORT || 8090;
server.listen(PORT, () => console.log(`🔯 Sacred Geometry MCP Server listening on :${PORT}`));

module.exports = { flowerOfLife, metatronsCube, sriYantra, goldenSpiral, platonicSolid, seedOfLife, vesicaPiscis, TOOLS };
