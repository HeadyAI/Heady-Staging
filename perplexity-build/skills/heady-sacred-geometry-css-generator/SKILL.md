---
name: heady-sacred-geometry-css-generator
title: Heady Sacred Geometry CSS Generator
description: Skill for generating φ-scaled CSS design systems
triggers: CSS, design system, phi, sacred geometry, styling
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Sacred Geometry CSS Generator

Skill for generating φ-scaled CSS design systems

## Purpose
Generate φ-scaled CSS design systems using Sacred Geometry principles — Fibonacci spacing, golden ratio typography, and φ-cubic-bezier timing.

## CSS Custom Properties
```css
:root {
  --space-xs: 5px; --space-sm: 8px; --space-md: 13px;
  --space-lg: 21px; --space-xl: 34px; --space-2xl: 55px;
  --space-3xl: 89px; --space-4xl: 144px;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.618rem; --text-2xl: 2.618rem;
  --text-3xl: 4.236rem; --text-4xl: 6.854rem;
  --ease-phi: cubic-bezier(0.618, 0, 0.382, 1);
}
```

## Design Tokens
- Spacing: Fibonacci sequence (1,1,2,3,5,8,13,21,34,55,89,144px)
- Typography: φ-powered scale (1 × φⁿ rem)
- Timing: φ-cubic-bezier for all transitions
- Border radius: Fibonacci values (5, 8, 13, 21px)
- Shadows: φ-scaled blur/spread values
- Grid: Fibonacci column counts (2, 3, 5, 8)
- Breakpoints: φ-derived (480, 768, 1024, 1200, 1440px)

## Dark Theme Palette
- Background: #0a0a0f (primary), #12121a (secondary)
- Glass: rgba(255,255,255,0.05) with blur(20px)
- Text: #e8e8f0 (primary), #9898a8 (secondary)
- Border: rgba(255,255,255,0.08)
- Accent: per-site (see site-registry.json)


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
