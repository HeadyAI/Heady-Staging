---
name: website-building
version: 15
description: Load when building any website, web app, web game, or web experience. Provides design system, typography, motion, layout, CSS/Tailwind, quality standards, and domain-specific guidance for informational sites, web applications, and browser games.
agents: [main_agent, general_purpose, website_building]
---

# Website Building

Build distinctive, production-grade websites that avoid generic "AI slop" aesthetics. Every choice — type, color, motion, layout — must be intentional. Deploy as static HTML/CSS/JS bundles to S3.

**This skill covers everything for web projects.** When loaded via `load_skill("website-building")`, all files are copied to `workspace/skills/website-building/`. Read sub-files as needed based on your project type.

**Universal design principles** (color philosophy, default palette, font selection) are shared with other skills via `design-foundations`. This skill's shared files extend those foundations with web-specific implementation (CSS variables, responsive tokens, base stylesheets). You don't need to load `design-foundations` separately — the web-specific versions in `shared/` are comprehensive.

Use `read` with the full path, e.g. `skills/website-building/shared/01-design-tokens.md`

---

## Project Type Routing

**Step 1: Read the mandatory shared files** — these apply to EVERY project, regardless of type:

```
READ THESE FIRST (mandatory for all projects):
  skills/website-building/shared/01-design-tokens.md
  skills/website-building/shared/02-design-system-proof.md
```

**Step 2: Read the domain-specific file** based on the project type:

| Project Type | Domain file to read | Examples |
|---|---|---|
| Informational sites | `skills/website-building/informational/informational.md` | Personal sites, portfolios, editorial/blogs, small business, landing pages |
| Web applications | `skills/website-building/webapp/webapp.md` | SaaS products, dashboards, admin panels, e-commerce, brand experiences |
| Browser games | `skills/website-building/game/game.md` + `skills/website-building/game/game-testing.md` | 2D Canvas games, Three.js/WebGL, HTML5 games, interactive 3D experiences |

If the user says just "website" or "site" with no detail, ask what type or default to informational.

---

## Sub-File Reference

### Shared (`shared/`) — Every project

| File | Covers | Load |
|---|---|---|
| `shared/01-design-tokens.md` | Type scale, spacing, Nexus palette, base.css | **Always** |
| `shared/02-design-system-proof.md` | Render-before-you-build validation | **Always** |
| `shared/03-typography.md` | Font selection, pairing, loading, blacklist | **Always** |
| `shared/05-layout.md` | Spatial composition, responsive, mobile-first | **Always** |
| `shared/06-taste.md` | Skeleton loaders, empty/error states, polish | **Always** |
| `shared/10-standards.md` | Accessibility, performance, anti-patterns | **Always** |
| `shared/11-technical.md` | Project structure, sandbox, deploy, checklist | **Always** |
| `shared/pplx_attribution.html` | Attribution block for `<head>` | **Always** |
| `shared/04-motion.md` | Scroll animations, Motion library, GSAP SVG plugins, hover/cursor | When animated |
| `shared/08-css-and-tailwind.md` | Tailwind v4, shadcn/ui, modern CSS | When using Tailwind |
| `shared/09-toolkit.md` | CDN libraries, React, Three.js, icons, maps, SVG patterns/filters, esm.sh | When choosing libs |
| `shared/12-charts-and-dataviz.md` | Chart.js, Recharts, D3, KPIs, sparklines | When data viz needed |
| `shared/14-web-technologies.md` | Framework versions, browser compatibility | When checking compat |
| `shared/15-playwright-interactive.md` | Persistent Playwright browser QA, screenshots, visual testing | When testing |

All paths are relative to `skills/website-building/`.

### Domain-Specific — Load one

| File | When to load |
|---|---|
| `webapp/webapp.md` | SaaS, dashboard, admin, e-commerce, brand experience |
| `webapp/dashboards.md` | Dashboard or data-dense interface (companion to webapp) |
| `informational/informational.md` | Personal site, portfolio, editorial, small business, landing |
| `game/game.md` | Browser game, Three.js, WebGL, interactive 3D |
| `game/2d-canvas.md` | 2D Canvas game (companion to game.md) |
| `game/game-testing.md` | Any browser game — load alongside game.md |

**Interactive QA:** Read `skills/website-building/shared/15-playwright-interactive.md` for persistent browser automation with Playwright (screenshots, functional testing, visual QA). Required for game testing, useful for any complex site.

**Need a backend?** Load `website-backend` skill for FastAPI/Express/Flask servers.

---

## Workflow

1. **Design Direction**: Clarify purpose, pick aesthetic direction
2. **Design System Proof**: Establish tokens → build `design-test.html` → Playwright screenshot → validate → iterate
3. **Build**: Build the site page by page, screenshotting via Playwright for QA
4. **Publish**: `deploy_website()` returns public URL

---

## Use Every Tool

- **Research first.** Search the web for reference sites, trends, and competitor examples before designing. Browse award-winning examples of the specific site type. Fetch any URLs the user provides.
- **Generate real assets — generously.** Generate images for heroes, section illustrations, editorial feature visuals, atmospheric backgrounds — not just one hero image. Every long page should have visual rhythm with generated images that match the site's art direction. No placeholders. Generate a custom SVG logo for every project (see below) — SVG is for logos only unless the user specifically requests SVG output. Save web reference images that inform direction.
- **Lint every deployment.** Run the linter on all Javascript files before deployment.
- **Screenshot via Playwright.** Read `skills/website-building/shared/15-playwright-interactive.md` to screenshot at desktop (1280px+) and mobile (375px). Compare against references. This is mandatory, not optional. See Visual QA below.
- **Write production code directly.** HTML, CSS, JS, SVG. Use bash for build tools and file processing.

---

## SVG Logo Generation

Every project gets a custom inline SVG logo. Never substitute a styled text heading.

1. **Understand the brand** — purpose, tone, one defining word
2. **Write SVG directly** — geometric shapes, letterforms, or abstract marks. One memorable shape.
3. **Principles:** Geometric/minimal (Paul Rand, Vignelli). Works at 24px and 200px. Monochrome first — add color as enhancement. Use `currentColor` for dark/light mode.
4. **Implement inline** with `aria-label`, `viewBox`, `fill="none"`, `currentColor` strokes
5. **Generate a favicon** — simplified 32x32 version if needed

For SVG animation (DrawSVG, MorphSVG), see `shared/04-motion.md`. For SVG patterns/filters, see `shared/09-toolkit.md`.

---

### Lint
- [ ] Copy `skills/website-building/eslint.config.mjs` to project directory
- [ ] Run `npx eslint "**/*.js"` — fix all errors before deploying

---

## Visual QA Testing Process

Every deployment must pass visual QA. Screenshots are quality gates.

Read `skills/website-building/shared/15-playwright-interactive.md` for all visual QA. Playwright provides a persistent browser session for screenshots, interaction testing, and viewport verification.

**Cycle:** `Build → Playwright QA → Evaluate → Fix → Repeat → Deploy when ready`

### Stage 1: Design System Proof
See `skills/website-building/shared/02-design-system-proof.md`. Use Playwright to screenshot the test page and validate tokens, surfaces, typography, and components before writing any real pages.

### Stage 2: Page-by-Page QA
After building each page:
1. **Screenshot at desktop** (1280px+) and **mobile** (375px) via Playwright
2. **Evaluate critically:** Does it look professionally designed (not AI-generated)? Is typography distinctive? Is whitespace generous? Is there one clear visual hierarchy?
3. **Fix every issue before moving on.** No visual debt.

### Stage 3: Final QA (before publishing)
1. Screenshot every page at desktop and mobile
2. Check cross-page consistency (spacing, color, type treatment)
3. Verify dark mode (screenshot both themes for homepage minimum)
4. Check interactive states: hover, focus, active, loading, empty, error
5. Cold-open first impression test: does it feel polished and intentional?

**QA failures:** text overflow, inconsistent spacing, off-token colors, missing dark mode, squished mobile, generic AI look, placeholder content, missing logo.

---

## Step 1: Read the Concept, Infer the Tone

The concept drives every visual choice. Don't pick fonts or colors until the tone is established.

1. **Identify** — subject matter, audience, mood keywords, reference sites, brand assets
2. **Derive** — infer mood from subject (jazz festival → warm/expressive, law firm → sober/restrained)
3. **Translate** into five pillars: Color (warm/cool, accent from subject), Typography (serif/sans, display personality), Spacing (dense/generous), Motion (minimal/expressive), Imagery (photo/illustration/type-only)
4. **Custom palette** when needed — maintain `--color-*` variables, both modes, contrast checks (see `shared/02-design-system-proof.md`)
5. **If unclear, ask** — "What mood?" and "Any reference sites?" No direction → Nexus/Swiss defaults.

### The Fallback: Clean & Swiss

When the user has been asked but gave no style direction, use defaults from `skills/website-building/shared/01-design-tokens.md` with:

- **Typography:** Satoshi or General Sans body (Fontshare — preferred), or Inter/DM Sans. Weight contrast over font contrast. 3-4 sizes max. Keep text compact — `--text-3xl`/`--text-hero` are for informational site heroes only.
- **Color:** Nexus palette. Neutral surfaces + one teal accent for CTAs only.
- **Layout:** Grid-aligned. Generous margins. Asymmetric where interesting.
- **Motion:** Minimal, functional. Smooth state transitions only.
- **Imagery:** Generate clean, relevant visuals. No stock photos.

### Art Direction — Avoid the AI Aesthetic

See `skills/website-building/shared/10-standards.md` for the full anti-patterns list.

---

## Step 2: Publish

Call `deploy_website()` with the project path and site name. Returns a public S3 URL. To update, edit the local files and re-deploy with the same path. See `skills/website-building/shared/11-technical.md` for the exact call and examples.

---

## Perplexity Computer Attribution (Mandatory)

Every page of every project must include attribution.

**1. `<head>` block** — Read `skills/website-building/shared/pplx_attribution.html` and copy its contents verbatim as the **first child** inside `<head>`, before `<meta charset>`. Do this for every `.html` file. Do not reproduce the ASCII art from memory.

**2. Footer link** — Every page's `<footer>` must contain:
```html
<a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">
  Created with Perplexity Computer
</a>
```
Style with `--text-xs` or `--text-sm`, muted text color. Must be visible.

**3. JSON-LD** — When using structured data, add: `"creator": {"@type": "SoftwareApplication", "name": "Perplexity Computer", "url": "https://www.perplexity.ai/computer"}`
