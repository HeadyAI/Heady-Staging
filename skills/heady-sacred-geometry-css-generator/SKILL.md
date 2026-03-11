---
name: heady-sacred-geometry-css-generator
description: Skill for generating phi-scaled CSS design systems and sacred geometry canvas animations for all 9 Heady sites. Use when building or updating the dark premium glassmorphism design system, generating Fibonacci spacing tokens, creating per-site sacred geometry canvas animations (Flower of Life, Metatron's Cube, Sri Yantra, Torus, Seed of Life, Fibonacci Spiral, Vesica Piscis), or implementing WCAG 2.1 accessibility compliance. Triggers on "CSS", "design system", "sacred geometry", "glassmorphism", "canvas animation", "phi-scaled", or any visual/styling task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: design
---

# Heady Sacred Geometry CSS Generator

## When to Use This Skill

Use this skill when:

- Generating the global Heady design system CSS tokens
- Creating per-site sacred geometry canvas animations
- Implementing glassmorphism card components
- Applying Fibonacci spacing scales
- Ensuring WCAG 2.1 AA compliance (contrast ratios, focus indicators)
- Generating phi-scaled typography scales
- Building the cross-site navigation component

## Design System Constants

```css
:root {
  /* ── Sacred Geometry Spacing (Fibonacci sequence) ───────────── */
  --space-xs:  5px;   /* fib(4) */
  --space-sm:  8px;   /* fib(6) */
  --space-md:  13px;  /* fib(7) */
  --space-lg:  21px;  /* fib(8) */
  --space-xl:  34px;  /* fib(9) */
  --space-2xl: 55px;  /* fib(10) */
  --space-3xl: 89px;  /* fib(11) */
  --space-4xl: 144px; /* fib(12) */

  /* ── φ Typography Scale ──────────────────────────────────────── */
  --text-xs:   0.75rem;    /* base / φ² */
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.618rem;   /* base × φ */
  --text-2xl:  2.618rem;   /* base × φ² */
  --text-3xl:  4.236rem;   /* base × φ³ */
  --text-4xl:  6.854rem;   /* base × φ⁴ */

  /* ── Dark Theme Palette ──────────────────────────────────────── */
  --bg-primary:    #0a0a0f;
  --bg-secondary:  #12121a;
  --bg-tertiary:   #1a1a26;
  --bg-card:       rgba(255,255,255,0.03);
  --bg-glass:      rgba(255,255,255,0.05);
  --bg-glass-deep: rgba(255,255,255,0.08);

  --text-primary:   #e8e8f0;
  --text-secondary: #9898a8;
  --text-muted:     #5a5a6a;

  --border-subtle:  rgba(255,255,255,0.08);
  --border-glow:    rgba(255,255,255,0.15);

  /* ── Phi-scaled transitions ──────────────────────────────────── */
  --ease-phi: cubic-bezier(0.618, 0, 0.382, 1);
  --duration-fast:   192ms;  /* 118ms × φ */
  --duration-normal: 309ms;  /* 192ms × φ */
  --duration-slow:   500ms;  /* 309ms × φ */
}

/* ── Glassmorphism base class ────────────────────────────────── */
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--border-subtle);
  border-radius: var(--space-md); /* 13px */
}

.glass-deep {
  background: var(--bg-glass-deep);
  backdrop-filter: blur(40px) saturate(200%);
  border: 1px solid var(--border-glow);
  border-radius: var(--space-lg); /* 21px */
}

/* ── Universal transition ────────────────────────────────────── */
* {
  transition: all var(--duration-normal) var(--ease-phi);
}
```

## Instructions

### Per-Site Accent Colors

| Site | CSS Variable | Hex |
|------|-------------|-----|
| headyme.com | `--accent` | `#00d4aa` |
| headysystems.com | `--accent` | `#00d4aa` |
| heady-ai.com | `--accent` | `#8b5cf6` |
| headyos.com | `--accent` | `#14b8a6` |
| headyconnection.org | `--accent` | `#f59e0b` |
| headyconnection.com | `--accent` | `#06b6d4` |
| headyex.com | `--accent` | `#10b981` |
| headyfinance.com | `--accent` | `#a855f7` |
| admin.headysystems.com | `--accent` | `#06b6d4` |

### Sacred Geometry Canvas Animations

Each site gets a unique canvas animation. Generate using the following pattern:

```javascript
// Shared canvas animation base
function initSacredGeometryCanvas(canvasId, type, accentColor) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const PHI = 1.618033988749895;
  let frame = 0;
  
  const drawFunctions = {
    'flower-of-life': drawFlowerOfLife,  // headyme.com
    'metatrons-cube': drawMetatronsCube, // headysystems.com, admin
    'sri-yantra':     drawSriYantra,     // heady-ai.com
    'torus':          drawTorus,         // headyos.com
    'seed-of-life':   drawSeedOfLife,    // headyconnection.*
    'fibonacci-spiral': drawFibSpiral,  // headyex.com
    'vesica-piscis':  drawVesicaPiscis, // headyfinance.com
  };
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFunctions[type]?.(ctx, canvas, accentColor, frame, PHI);
    frame++;
    requestAnimationFrame(animate);
  }
  
  animate();
}
```

### WCAG 2.1 Compliance Checklist

Per [WCAG 2.1 spec](https://www.w3.org/TR/WCAG21/):

- [ ] **1.4.3 Contrast**: Text #e8e8f0 on #0a0a0f = 16.4:1 (✅ AAA)
- [ ] **1.4.11 Non-text Contrast**: Accent colors must achieve 3:1 against background
- [ ] **2.4.7 Focus Visible**: All interactive elements have visible focus ring
- [ ] **3.3.2 Labels**: All form inputs have visible labels
- [ ] **4.1.2 Name, Role, Value**: All custom elements have ARIA attributes

Focus ring CSS:
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 5px;
}
```

## Examples

**Input**: "Generate the design tokens for headyfinance.com"
**Output**: Complete CSS with `--accent: #a855f7`, Vesica Piscis geometry canvas code, and WCAG contrast ratios verified

**Input**: "Build the glassmorphism card component"
**Output**: `.glass` CSS class + HTML example + ARIA attributes + focus states
