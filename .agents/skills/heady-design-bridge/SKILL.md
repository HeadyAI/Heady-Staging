---
name: heady-design-bridge
description: Use when implementing visual-to-code or code-to-visual bidirectional editing, Figma imports, UI component generation from designs, or design token extraction. Absorbed from v0's design-to-code pipeline. Keywords include Figma, design-to-code, visual editing, UI generation, component extraction, design tokens, v0.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidDesign
  absorption_source: "v0 → visual-to-code bidirectional editing with Figma import"
  super_prompt_section: "§5.3"
---

# Heady™ Design Bridge (LiquidDesign)

## When to Use This Skill

Use this skill when:
- Converting Figma designs to production React/HTML/CSS code
- Generating UI components from visual mockups or screenshots
- Extracting design tokens (colors, spacing, typography) from existing designs
- Implementing bidirectional sync between design tools and code

## Architecture

### Pipeline

```
Figma/Screenshot Import → Component Detection → Layout Analysis
  → Design Token Extraction → Code Generation → Live Preview (WebContainer)
  → Bidirectional Sync (design changes ↔ code changes)
```

### Supported Inputs

| Source | Method |
|---|---|
| Figma | API import via Figma REST API |
| Screenshot | Vision model analysis |
| Wireframe | SVG/PNG structural parsing |
| Text Description | Natural language → code generation |

### Code Output Targets

| Framework | Output |
|---|---|
| React/Next.js | JSX + CSS Modules |
| Vue | SFC (.vue files) |
| HTML/CSS | Semantic HTML + vanilla CSS |
| React Native | Native components |

## Instructions

### Converting a Figma Design

1. Receive Figma file URL or frame selection
2. Fetch design data via Figma API
3. Detect components, auto-layout, and constraints
4. Extract design tokens (colors as CSS custom properties, spacing as rem)
5. Generate component code with proper responsive breakpoints
6. Preview via LiquidWebContainer
7. Enable bidirectional sync for iterative refinement

## Output Format

- Component Code (per framework target)
- Design Token File (CSS custom properties / JSON)
- Component Tree Visualization
- Accessibility Audit
