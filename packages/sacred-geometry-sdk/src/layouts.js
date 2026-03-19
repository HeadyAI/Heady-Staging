/**
 * @heady/sacred-geometry-sdk — Layout Utilities
 * Golden ratio grid generator, phi-spiral placement, torus field positions.
 *
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */

'use strict';

const {
  PHI, PSI, PHI_SQ, PHI_CUBED, PSI_SQ,
  GOLDEN_ANGLE_RAD, GOLDEN_ANGLE_DEG,
} = require('./constants');

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN RATIO GRID GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a golden ratio grid with N columns.
 * The first column gets φ/(φ+1) of the width, the second gets 1/(φ+1),
 * and so on recursively for more columns.
 *
 * @param {number} totalWidth — total available width (px or any unit)
 * @param {number} [columns=2] — number of columns (2–8)
 * @returns {{ widths: number[], ratios: number[] }}
 */
function goldenGrid(totalWidth, columns = 2) {
  if (columns < 1) throw new RangeError('columns must be >= 1');
  if (columns === 1) return { widths: [totalWidth], ratios: [1] };

  const ratios = [];
  let remaining = 1.0;

  for (let i = 0; i < columns - 1; i++) {
    const ratio = remaining * PSI;
    ratios.push(ratio);
    remaining -= ratio;
  }
  ratios.push(remaining);

  const widths = ratios.map(r => Math.round(totalWidth * r * 100) / 100);

  return { widths, ratios };
}

/**
 * Generate a golden-section two-panel layout.
 * Returns the primary (61.8%) and secondary (38.2%) widths.
 *
 * @param {number} totalWidth
 * @returns {{ primary: number, secondary: number }}
 */
function goldenSplit(totalWidth) {
  return {
    primary:   Math.round(totalWidth * PSI * 100) / 100,
    secondary: Math.round(totalWidth * PSI_SQ * 100) / 100,
  };
}

/**
 * Generate nested golden rectangles.
 * Starting from a rectangle of given width/height, each subdivision
 * produces a square and a smaller golden rectangle.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} [depth=5] — how many subdivisions
 * @returns {Array<{x: number, y: number, w: number, h: number, type: 'square'|'rect'}>}
 */
function goldenRectangles(width, height, depth = 5) {
  const rects = [];
  let x = 0, y = 0, w = width, h = height;
  let horizontal = true;

  for (let i = 0; i < depth; i++) {
    if (horizontal) {
      const squareSize = h;
      rects.push({ x, y, w: squareSize, h: squareSize, type: 'square' });
      x += squareSize;
      w -= squareSize;
    } else {
      const squareSize = w;
      rects.push({ x, y, w: squareSize, h: squareSize, type: 'square' });
      y += squareSize;
      h -= squareSize;
    }
    rects.push({ x, y, w, h, type: 'rect' });
    horizontal = !horizontal;
  }

  return rects;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHI-SPIRAL PLACEMENT CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Place N items along a golden (Fermat) spiral.
 * Uses the golden angle (~137.508 deg) to ensure optimal packing,
 * same pattern as sunflower seeds.
 *
 * @param {number} count — number of items to place
 * @param {number} [maxRadius=1] — maximum radius of the spiral
 * @param {{ centerX?: number, centerY?: number }} [options]
 * @returns {Array<{x: number, y: number, angle: number, radius: number, index: number}>}
 */
function phiSpiral(count, maxRadius = 1, options = {}) {
  const { centerX = 0, centerY = 0 } = options;
  const points = [];

  for (let i = 0; i < count; i++) {
    // Golden angle spacing ensures no two points are close together
    const angle = i * GOLDEN_ANGLE_RAD;
    // Radius grows as sqrt(i) for uniform density (Vogel's model)
    const radius = maxRadius * Math.sqrt(i / count);

    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle: angle % (2 * Math.PI),
      radius,
      index: i,
    });
  }

  return points;
}

/**
 * Place items along a logarithmic golden spiral (Nautilus-type).
 * r = a * phi^(theta / 90 deg)
 *
 * @param {number} count — number of items
 * @param {number} [turns=3] — number of full rotations
 * @param {number} [scale=1] — base scale factor
 * @returns {Array<{x: number, y: number, angle: number, radius: number, index: number}>}
 */
function logSpiral(count, turns = 3, scale = 1) {
  const points = [];
  const totalAngle = turns * 2 * Math.PI;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);
    const angle = t * totalAngle;
    // Logarithmic spiral: r = a * phi^(2*theta/pi)
    const radius = scale * Math.pow(PHI, (2 * angle) / Math.PI);

    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      angle,
      radius,
      index: i,
    });
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TORUS FIELD POSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate positions on a torus surface.
 * The Heady architecture maps agent rings to torus geometry — nodes orbit
 * on concentric phi-scaled rings around the central HeadySoul.
 *
 * @param {number} ringRadius — major radius (distance from torus center to ring center)
 * @param {number} tubeRadius — minor radius (radius of the tube cross-section)
 * @param {number} count — number of points to place on this ring
 * @param {{ phase?: number }} [options]
 * @returns {Array<{x: number, y: number, z: number, theta: number, phi: number, index: number}>}
 */
function torusPositions(ringRadius, tubeRadius, count, options = {}) {
  const { phase = 0 } = options;
  const points = [];

  for (let i = 0; i < count; i++) {
    // theta: angle around the ring (major circle)
    const theta = (2 * Math.PI * i) / count + phase;
    // phi: position on tube surface — use golden angle for natural distribution
    const tubePhi = i * GOLDEN_ANGLE_RAD;

    const x = (ringRadius + tubeRadius * Math.cos(tubePhi)) * Math.cos(theta);
    const y = (ringRadius + tubeRadius * Math.cos(tubePhi)) * Math.sin(theta);
    const z = tubeRadius * Math.sin(tubePhi);

    points.push({ x, y, z, theta, phi: tubePhi, index: i });
  }

  return points;
}

/**
 * Generate the full Heady sacred geometry ring layout.
 * Five concentric rings at phi-power radii:
 *   Center (1.0), Inner (phi), Middle (phi^2), Outer (phi^3), Governance (phi^4)
 *
 * @param {number} [baseRadius=100] — radius of the center ring in px
 * @returns {Object} Ring map with positions for each ring
 */
function sacredRings(baseRadius = 100) {
  const rings = {
    center: {
      radius: baseRadius * 1.0,
      nodes: ['HeadySoul'],
    },
    inner: {
      radius: baseRadius * PHI,
      nodes: ['HeadyBrains', 'HeadyConductor', 'HeadyVinci', 'HeadyMemory'],
    },
    middle: {
      radius: baseRadius * PHI_SQ,
      nodes: ['JULES', 'BUILDER', 'OBSERVER', 'MURPHY', 'ATLAS', 'PYTHIA'],
    },
    outer: {
      radius: baseRadius * PHI_CUBED,
      nodes: ['BRIDGE', 'MUSE', 'SENTINEL', 'NOVA', 'JANITOR', 'SOPHIA', 'CIPHER', 'LENS'],
    },
    governance: {
      radius: baseRadius * PHI * PHI_CUBED,
      nodes: ['HeadyCheck', 'HeadyAssure', 'HeadyAware', 'HeadyPatterns', 'HeadyMC', 'HeadyRisk'],
    },
  };

  // Compute node positions using golden angle spacing within each ring
  const result = {};
  for (const [ringName, ring] of Object.entries(rings)) {
    const positions = ring.nodes.map((name, i) => {
      const angle = (2 * Math.PI * i) / ring.nodes.length;
      return {
        name,
        x: Math.round(ring.radius * Math.cos(angle) * 100) / 100,
        y: Math.round(ring.radius * Math.sin(angle) * 100) / 100,
        angle,
        ringRadius: ring.radius,
      };
    });
    result[ringName] = { radius: ring.radius, positions };
  }

  return result;
}

/**
 * Compute the geometric distance between two rings.
 * @param {number} ringRadiusA
 * @param {number} ringRadiusB
 * @returns {number}
 */
function ringDistance(ringRadiusA, ringRadiusB) {
  return Math.abs(ringRadiusA - ringRadiusB);
}

module.exports = {
  // Golden ratio grids
  goldenGrid, goldenSplit, goldenRectangles,
  // Phi-spiral placement
  phiSpiral, logSpiral,
  // Torus field
  torusPositions, sacredRings, ringDistance,
};
