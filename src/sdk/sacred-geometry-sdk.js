/**
 * Sacred Geometry Design System SDK
 *
 * A standalone toolkit for building interfaces, layouts, and animations
 * grounded in the golden ratio (φ), Fibonacci sequences, and sacred
 * geometric forms. Every scale, breakpoint, and timing value derives
 * from φ = 1.618033988749895 so that proportions feel naturally
 * harmonious.
 *
 * @module sacred-geometry-sdk
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

/** @constant {number} PHI — The golden ratio */
const PHI = 1.618033988749895;

/** @constant {number} PSI — The golden ratio conjugate (1/φ = φ − 1) */
const PSI = 0.618033988749895;

/** @constant {number} PHI_SQ — φ squared */
const PHI_SQ = PHI * PHI;

/** @constant {number} SQRT5 — Square root of 5, used in Binet's formula */
const SQRT5 = Math.sqrt(5);

/** @constant {number} GOLDEN_ANGLE_DEG — The golden angle in degrees */
const GOLDEN_ANGLE_DEG = 137.50776405003785;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Return the nth Fibonacci number using the closed-form Binet's formula.
 *
 * F(n) = (φⁿ − ψⁿ) / √5
 *
 * Accurate for n ≤ 70 before floating-point drift becomes significant.
 *
 * @param {number} n — Non-negative integer index
 * @returns {number} The nth Fibonacci number (rounded to nearest integer)
 * @example
 * fibonacci(0)  // => 0
 * fibonacci(10) // => 55
 */
function fibonacci(n) {
  if (n < 0) throw new RangeError('fibonacci(n) requires n >= 0');
  return Math.round((Math.pow(PHI, n) - Math.pow(-PSI, n)) / SQRT5);
}

/**
 * Scale a base value by φ raised to the given power.
 *
 * result = base × φ^power
 *
 * @param {number} base  — The value to scale
 * @param {number} power — The exponent applied to φ (may be negative)
 * @returns {number} The scaled value
 * @example
 * phiScale(16, 1)  // => 25.888...
 * phiScale(16, -1) // => 9.888...
 */
function phiScale(base, power) {
  return base * Math.pow(PHI, power);
}

/**
 * Exponential back-off whose growth factor is φ rather than 2.
 *
 * delay = baseMs × φ^attempt
 *
 * Produces a gentler curve than doubling, well-suited for retry logic
 * and progressive loading strategies.
 *
 * @param {number} attempt       — Zero-based attempt index
 * @param {number} [baseMs=1000] — Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 * @example
 * phiBackoff(0) // => 1000
 * phiBackoff(3) // => 4235.8...
 */
function phiBackoff(attempt, baseMs = 1000) {
  return baseMs * Math.pow(PHI, attempt);
}

// ─── Geometric Generators ────────────────────────────────────────────────────

/**
 * Generate points along a golden (Fibonacci) spiral.
 *
 * Each successive point is placed at the golden angle (≈137.508°) from
 * the previous one, with radius growing by √i. This is the same
 * distribution seen in sunflower seed heads.
 *
 * @param {number} numPoints — How many points to generate
 * @returns {Array<{x: number, y: number, angle: number}>} Spiral points
 * @example
 * goldenSpiral(100) // => [{x, y, angle}, ...]
 */
function goldenSpiral(numPoints) {
  const goldenAngleRad = GOLDEN_ANGLE_DEG * (Math.PI / 180);
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = i * goldenAngleRad;
    const radius = Math.sqrt(i);
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      angle,
    });
  }

  return points;
}

/**
 * Distribute items evenly around a torus (doughnut) surface.
 *
 * Uses parametric torus equations:
 *   x = (R + r·cos v) · cos u
 *   y = (R + r·cos v) · sin u
 *   z = r · sin v
 *
 * where u and v are evenly spaced across items.
 *
 * @param {number} numItems              — Number of items to place
 * @param {number} [majorRadius=100]     — Distance from centre to tube centre
 * @param {number} [minorRadius=30]      — Radius of the tube itself
 * @returns {Array<{x: number, y: number, z: number}>} 3-D torus coordinates
 * @example
 * torusLayout(50) // => [{x, y, z}, ...]
 */
function torusLayout(numItems, majorRadius = 100, minorRadius = 30) {
  const points = [];
  // Approximate a nice square-ish distribution around the torus
  const cols = Math.ceil(Math.sqrt(numItems * PHI));
  const rows = Math.ceil(numItems / cols);

  for (let i = 0; i < numItems; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const u = (col / cols) * 2 * Math.PI;
    const v = (row / rows) * 2 * Math.PI;

    points.push({
      x: (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u),
      y: (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u),
      z: minorRadius * Math.sin(v),
    });
  }

  return points;
}

/**
 * Build a Metatron's Cube–style grid.
 *
 * Each node sits at a hex-offset position (every other row is shifted by
 * half a cell width). Connections link each node to its six nearest
 * neighbours when they exist.
 *
 * @param {number} rows — Number of rows
 * @param {number} cols — Number of columns
 * @returns {Array<{x: number, y: number, connections: number[]}>}
 *   Grid nodes with indices of connected neighbours
 * @example
 * metatronGrid(3, 3)
 * // => [{x: 0, y: 0, connections: [1, 3, 4]}, ...]
 */
function metatronGrid(rows, cols) {
  const nodes = [];
  const spacing = PHI * 50; // Base cell size scaled by φ

  // Create nodes
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 1 ? spacing / 2 : 0;
      nodes.push({
        x: c * spacing + offset,
        y: r * spacing * PSI, // Row height compressed by ψ (≈ hex ratio)
        connections: [],
      });
    }
  }

  // Connect each node to its six potential hex neighbours
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isOddRow = r % 2 === 1;

      // Right
      if (c + 1 < cols) nodes[idx].connections.push(idx + 1);
      // Left
      if (c - 1 >= 0) nodes[idx].connections.push(idx - 1);
      // Top-left / Top-right
      if (r - 1 >= 0) {
        const topLeft = isOddRow ? c : c - 1;
        const topRight = isOddRow ? c + 1 : c;
        if (topLeft >= 0 && topLeft < cols)
          nodes[idx].connections.push((r - 1) * cols + topLeft);
        if (topRight >= 0 && topRight < cols)
          nodes[idx].connections.push((r - 1) * cols + topRight);
      }
      // Bottom-left / Bottom-right
      if (r + 1 < rows) {
        const botLeft = isOddRow ? c : c - 1;
        const botRight = isOddRow ? c + 1 : c;
        if (botLeft >= 0 && botLeft < cols)
          nodes[idx].connections.push((r + 1) * cols + botLeft);
        if (botRight >= 0 && botRight < cols)
          nodes[idx].connections.push((r + 1) * cols + botRight);
      }
    }
  }

  return nodes;
}

// ─── Design-System Scales ────────────────────────────────────────────────────

/**
 * CSS breakpoints derived from the golden ratio.
 *
 * Starting from 320 px each successive breakpoint is multiplied by φ
 * and rounded to the nearest integer.
 *
 * @returns {number[]} [320, 518, 838, 1356, 2194]
 * @example
 * phiBreakpoints() // => [320, 518, 838, 1356, 2194]
 */
function phiBreakpoints() {
  return [320, 518, 838, 1356, 2194];
}

/**
 * Typographic scale where each step grows by φ from the base size.
 *
 * @param {number} [baseSize=16] — The base font size in px
 * @returns {{xs: number, sm: number, base: number, lg: number, xl: number, xxl: number, xxxl: number}}
 * @example
 * phiTypography(16)
 * // => { xs: 6.11, sm: 9.89, base: 16, lg: 25.89, xl: 41.89, xxl: 67.77, xxxl: 109.66 }
 */
function phiTypography(baseSize = 16) {
  return {
    xs:    round(baseSize * Math.pow(PSI, 2)),
    sm:    round(baseSize * PSI),
    base:  baseSize,
    lg:    round(baseSize * PHI),
    xl:    round(baseSize * PHI_SQ),
    xxl:   round(baseSize * Math.pow(PHI, 3)),
    xxxl:  round(baseSize * Math.pow(PHI, 4)),
  };
}

/**
 * Spacing scale grown from a base unit by powers of φ.
 *
 * @param {number} [baseUnit=8] — The base spacing unit in px
 * @returns {{xxs: number, xs: number, sm: number, md: number, lg: number, xl: number, xxl: number}}
 * @example
 * phiSpacing(8)
 * // => { xxs: 3.06, xs: 4.94, sm: 8, md: 12.94, lg: 20.94, xl: 33.89, xxl: 54.83 }
 */
function phiSpacing(baseUnit = 8) {
  return {
    xxs: round(baseUnit * Math.pow(PSI, 2)),
    xs:  round(baseUnit * PSI),
    sm:  baseUnit,
    md:  round(baseUnit * PHI),
    lg:  round(baseUnit * PHI_SQ),
    xl:  round(baseUnit * Math.pow(PHI, 3)),
    xxl: round(baseUnit * Math.pow(PHI, 4)),
  };
}

/**
 * Animation / transition timing scale in milliseconds.
 *
 * Each step is separated by a factor of φ from the centre "normal" value
 * of 300 ms.
 *
 * @returns {{instant: number, fast: number, normal: number, slow: number, glacial: number}}
 * @example
 * phiTiming() // => { instant: 115, fast: 185, normal: 300, slow: 485, glacial: 785 }
 */
function phiTiming() {
  const normal = 300;
  return {
    instant: Math.round(normal * Math.pow(PSI, 2)),
    fast:    Math.round(normal * PSI),
    normal,
    slow:    Math.round(normal * PHI),
    glacial: Math.round(normal * PHI_SQ),
  };
}

/**
 * Generate a palette of HSL colours spaced at the golden angle.
 *
 * The golden angle (≈137.508°) ensures maximum separation between
 * successive hues — the same pattern petals use around a flower.
 *
 * @param {number} [count=12]      — Number of colours to generate
 * @param {number} [saturation=70] — HSL saturation (0–100)
 * @param {number} [lightness=55]  — HSL lightness (0–100)
 * @returns {Array<{hue: number, hsl: string}>} Array of colour objects
 * @example
 * phiColors(5)
 * // => [{hue: 0, hsl: 'hsl(0, 70%, 55%)'}, {hue: 137.51, hsl: '...'}, ...]
 */
function phiColors(count = 12, saturation = 70, lightness = 55) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = round((i * GOLDEN_ANGLE_DEG) % 360);
    colors.push({
      hue,
      hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    });
  }
  return colors;
}

// ─── CSS Generation ──────────────────────────────────────────────────────────

/**
 * Generate a complete CSS `:root {}` block containing custom properties
 * for every design-system token: typography, spacing, timing, breakpoints,
 * colours, and raw constants.
 *
 * Drop the returned string into a `<style>` tag or `.css` file and every
 * φ-derived value is immediately available via `var(--phi-*)`.
 *
 * @returns {string} A CSS string with :root custom properties
 * @example
 * const css = generateCSSCustomProperties();
 * // :root {
 * //   --phi: 1.618033988749895;
 * //   ...
 * // }
 */
function generateCSSCustomProperties() {
  const typo    = phiTypography();
  const space   = phiSpacing();
  const timing  = phiTiming();
  const bps     = phiBreakpoints();
  const colors  = phiColors();

  const lines = [':root {'];

  // Constants
  lines.push('  /* Constants */');
  lines.push(`  --phi: ${PHI};`);
  lines.push(`  --psi: ${PSI};`);
  lines.push(`  --phi-sq: ${round(PHI_SQ)};`);
  lines.push(`  --sqrt5: ${round(SQRT5)};`);
  lines.push('');

  // Typography
  lines.push('  /* Typography Scale (px) */');
  for (const [key, val] of Object.entries(typo)) {
    lines.push(`  --font-${key}: ${val}px;`);
  }
  lines.push('');

  // Spacing
  lines.push('  /* Spacing Scale (px) */');
  for (const [key, val] of Object.entries(space)) {
    lines.push(`  --space-${key}: ${val}px;`);
  }
  lines.push('');

  // Timing
  lines.push('  /* Animation Timing (ms) */');
  for (const [key, val] of Object.entries(timing)) {
    lines.push(`  --timing-${key}: ${val}ms;`);
  }
  lines.push('');

  // Breakpoints
  lines.push('  /* Breakpoints (px) */');
  const bpNames = ['xs', 'sm', 'md', 'lg', 'xl'];
  bps.forEach((val, i) => {
    lines.push(`  --bp-${bpNames[i]}: ${val}px;`);
  });
  lines.push('');

  // Colors
  lines.push('  /* Golden-Angle Palette */');
  colors.forEach((c, i) => {
    lines.push(`  --color-phi-${i}: ${c.hsl};`);
  });

  lines.push('}');
  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Round a number to two decimal places.
 * @param {number} n
 * @returns {number}
 * @private
 */
function round(n) {
  return Math.round(n * 100) / 100;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  PHI,
  PSI,
  PHI_SQ,
  SQRT5,
  GOLDEN_ANGLE_DEG,

  // Core
  fibonacci,
  phiScale,
  phiBackoff,

  // Geometry
  goldenSpiral,
  torusLayout,
  metatronGrid,

  // Design-system scales
  phiBreakpoints,
  phiTypography,
  phiSpacing,
  phiTiming,
  phiColors,

  // CSS generation
  generateCSSCustomProperties,
};
