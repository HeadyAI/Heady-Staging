# PROMPT 6: CSL Engine, Sacred Geometry SDK & φ-Math Perfection

## For: Perplexity Computer

## Objective: Perfect the mathematical foundation — CSL gates, Sacred Geometry, and φ-scaling across the entire codebase

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are perfecting the mathematical heart of Heady™ — the Continuous Semantic Logic engine, the Sacred Geometry SDK, and the φ-math foundation. Every numeric constant, every threshold, every timeout, every batch size must derive from φ or Fibonacci.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`.

### THE MATHEMATICAL FOUNDATION

```
φ (phi) = 1.618033988749895 (Golden Ratio)
φ² = 2.618033988749895
1/φ = 0.618033988749895

Fibonacci Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597

Phi Powers (base × φⁿ):
  φ⁰ = 1.000     (1000ms → 1s)
  φ¹ = 1.618     (1618ms → ~2s)
  φ² = 2.618     (2618ms → ~3s)
  φ³ = 4.236     (4236ms → ~4s)
  φ⁴ = 6.854     (6854ms → ~7s)
  φ⁵ = 11.090    (11090ms → 11s)
  φ⁶ = 17.944    (17944ms → 18s)
  φ⁷ = 29.034    (29034ms → 29s)
  φ⁸ = 46.979    (46979ms → 47s)
```

### TASK 1: Perfect CSL Engine

Build/complete `src/core/csl-engine/csl-engine.js` with ALL CSL operations:

```javascript
class CSLEngine {
  // Core gates — replace boolean logic with continuous [0,1] values
  AND(a, b)       { return a * b; }                           // Cosine similarity product
  OR(a, b)        { return a + b - (a * b); }                 // Superposition
  NOT(x)          { return 1 - x; }                           // Orthogonal projection
  IMPLY(a, b)     { return this.OR(this.NOT(a), b); }         // Material conditional
  XOR(a, b)       { return Math.abs(a - b); }                 // Symmetric difference
  CONSENSUS(vs)   { return vs.reduce((a,b) => a+b, 0) / vs.length; } // Mean confidence
  GATE(x, threshold = 0.618) { return x >= threshold ? x : 0; } // φ-threshold gate
  
  // Advanced operations
  cosineSimilarity(a, b) { /* dot product / magnitudes */ }
  bindVectors(a, b) { /* circular convolution — HDC binding */ }
  bundleVectors(vs) { /* element-wise sum + normalize — HDC bundling */ }
  permuteVector(v, n) { /* circular shift by n positions */ }
  
  // Decision making
  decide(options) { /* CSL-weighted selection from options */ }
  route(task, agents) { /* cosine similarity routing */ }
  score(input) { /* φ-weighted confidence scoring */ }
}
```

### TASK 2: Perfect Sacred Geometry SDK

Build/complete `packages/heady-sacred-geometry-sdk/`:

```javascript
// Sacred geometry coordinate generators
class SacredGeometry {
  // Flower of Life — 7 overlapping circles
  flowerOfLife(centerX, centerY, radius) { /* generate all 7 circle centers */ }
  
  // Metatron's Cube — 13 circles + connecting lines
  metatronsCube(centerX, centerY, radius) { /* generate vertices and edges */ }
  
  // Sri Yantra — 9 interlocking triangles
  sriYantra(centerX, centerY, radius) { /* generate triangle vertices */ }
  
  // Seed of Life — 7 circles from single origin
  seedOfLife(centerX, centerY, radius) { /* generate circle positions */ }
  
  // Torus — parametric surface
  torus(centerX, centerY, centerZ, majorR, minorR, segments) { /* 3D torus points */ }
  
  // Golden Spiral
  goldenSpiral(centerX, centerY, turns, pointsPerTurn) { /* spiral coordinates */ }
  
  // Fibonacci Lattice — optimal sphere sampling
  fibonacciLattice(n) { /* n points on unit sphere with golden angle spacing */ }
  
  // Canvas Animation Renderers
  renderSacredNodes(canvas, config) { /* animated sacred nodes */ }
  renderEnterpriseGrid(canvas, config) { /* enterprise grid animation */ }
  renderTorusField(canvas, config) { /* rotating torus field */ }
  renderSeedOfLife(canvas, config) { /* pulsing seed of life */ }
  renderConnectionWeb(canvas, config) { /* dynamic connection web */ }
}
```

### TASK 3: φ-Math Codebase Scan

Scan the ENTIRE monorepo for magic numbers and replace them with φ-derived values:

```javascript
// BAD — magic numbers
const TIMEOUT = 5000;
const MAX_RETRIES = 3;
const BATCH_SIZE = 10;
const CACHE_TTL = 300;

// GOOD — φ-derived
const PHI = 1.618033988749895;
const TIMEOUT = Math.round(1000 * Math.pow(PHI, 4));  // 6854ms
const MAX_RETRIES = 3;                                  // fib(4)
const BATCH_SIZE = 8;                                   // fib(6)
const CACHE_TTL = 89;                                   // fib(11) seconds
```

For EVERY numeric constant found:

1. Identify its purpose
2. Find the nearest Fibonacci number or φ-power
3. Replace with the φ-derived equivalent
4. Add a comment explaining the derivation

### TASK 4: CSS Sacred Geometry

Ensure all CSS across sites uses φ-scaled spacing and typography:

```css
:root {
  --phi: 1.618033988749895;
  --spacing-1: 1px;     /* fib(1) */
  --spacing-2: 2px;     /* fib(3) */
  --spacing-3: 3px;     /* fib(4) */
  --spacing-5: 5px;     /* fib(5) */
  --spacing-8: 8px;     /* fib(6) */
  --spacing-13: 13px;   /* fib(7) */
  --spacing-21: 21px;   /* fib(8) */
  --spacing-34: 34px;   /* fib(9) */
  --spacing-55: 55px;   /* fib(10) */
  --spacing-89: 89px;   /* fib(11) */
  
  --font-xs: 8px;       /* fib(6) */
  --font-sm: 13px;      /* fib(7) */
  --font-md: 21px;      /* fib(8) */
  --font-lg: 34px;      /* fib(9) */
  --font-xl: 55px;      /* fib(10) */
  
  --radius-sm: 3px;     /* fib(4) */
  --radius-md: 5px;     /* fib(5) */
  --radius-lg: 8px;     /* fib(6) */
  --radius-xl: 13px;    /* fib(7) */
  
  --transition-fast: 0.233s;   /* fib(13)/1000 */
  --transition-medium: 0.377s; /* fib(14)/1000 */
  --transition-slow: 0.610s;   /* fib(15)/1000 */
}
```

### DELIVERABLES

Create a ZIP file named `06-math-foundation.zip` containing:

- `csl-engine.js` — Complete CSL engine with all operations
- `sacred-geometry-sdk/` — Complete SDK with all generators and renderers
- `phi-math-foundation/` — Complete φ-math library
- `phi-scan-report.md` — Every magic number found and its φ replacement
- `css-design-tokens.css` — Complete φ-scaled CSS design system
- `math-test-results.md` — Test results proving all operations are correct
