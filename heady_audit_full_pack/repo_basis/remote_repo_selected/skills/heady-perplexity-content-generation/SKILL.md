---
name: heady-perplexity-content-generation
description: Skill for mass content generation for all 9 Heady sites using Perplexity's knowledge base. Use when asked to write 2000+ word deep-dive content, hero copy, FAQ sections, use cases, technology stack descriptions, or any substantial web content for headyme.com, headysystems.com, heady-ai.com, headyos.com, headyconnection.org, headyconnection.com, headyex.com, headyfinance.com, or admin.headysystems.com. Triggers on "write content", "generate copy", "create the deep-dive", "build the page content", or any site content creation task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: content
---

# Heady Perplexity Content Generation

## When to Use This Skill

Use this skill when generating:

- Per-site hero sections (tagline + dual CTA)
- Feature grid cards (4-6 per site)
- Stats banners (animated counters)
- Deep-dive content sections (2000+ words)
- How It Works step-by-step sections
- Technology stack descriptions
- Ecosystem maps (how each site connects to all others)
- Use case scenarios
- FAQ sections (8-12 questions)
- Footer cross-navigation copy

## Site Roster (9 Sites)

| Domain | Name | Accent | Sacred Geometry |
|--------|------|--------|----------------|
| headyme.com | HeadyMe | #00d4aa | Flower of Life |
| headysystems.com | HeadySystems | #00d4aa | Metatron's Cube |
| heady-ai.com | HeadyAI | #8b5cf6 | Sri Yantra |
| headyos.com | HeadyOS | #14b8a6 | Torus |
| headyconnection.org | HeadyConnection | #f59e0b | Seed of Life |
| headyconnection.com | HeadyConnection Community | #06b6d4 | Seed of Life |
| headyex.com | HeadyEX | #10b981 | Fibonacci Spiral |
| headyfinance.com | HeadyFinance | #a855f7 | Vesica Piscis |
| admin.headysystems.com | Admin Portal | #06b6d4 | Metatron's Cube |

## Instructions

### Step 1 — Load Site Context

Before writing for any site, load:
- Site-specific purpose and audience from `01-site-registry.json`
- Brand voice: dark premium, intelligent, forward-thinking, φ-harmonious
- Sacred geometry theme (informs content metaphors)
- Accent color (informs emotional tone)

### Step 2 — Content Standards

Every piece of content must:

- Use the Heady brand voice: **confident, precise, visionary, never hyperbolic**
- Contain technical depth that respects intelligent audiences
- Be **unique per site** — no copy-paste between sites
- Reference the sacred geometry theme in at least one metaphor
- Include cross-links to all other 8 Heady sites naturally in body copy
- Be **2000+ words** for deep-dive sections (enforced)

### Step 3 — Deep-Dive Structure

```markdown
## [Site Name]: [Compelling Section Title]

### The Foundation
[400+ words explaining what problem this site/service solves at a fundamental level]

### How It Works
[400+ words step-by-step technical explanation with real architectural details]

### The Architecture
[300+ words on the actual system design, CSL gates, phi-scaling, swarm topology]

### Real-World Impact
[300+ words on use cases with specific scenarios and outcomes]

### Integration Across the Heady Ecosystem
[200+ words on how this site connects to all others — include actual domain names]

### Technical Specifications
[200+ words on API contracts, data flows, vector dimensions, CSL thresholds]

### The Future
[200+ words on roadmap, patents, evolution path]
```

### Step 4 — FAQ Requirements

8-12 FAQs per site, each answer 100+ words. Topics must include:
- Getting started question
- Technical capability question
- Integration question
- Security/privacy question
- Pricing/access question
- Use case scenario question

### Step 5 — SEO Meta Requirements (from Google SEO Starter Guide)

Every page must include:
- `<title>`: 50-60 characters, primary keyword first
- `<meta name="description">`: 150-160 characters with call to action
- `<meta property="og:*">` Open Graph tags
- Structured data (JSON-LD Schema.org) for Organization and WebPage
- Canonical URL tag

## Examples

**Input**: "Write the deep-dive content for headyos.com"
**Output**: 2000+ word section on HeadyOS as an AI Operating System, covering the Torus geometry metaphor, 17-swarm topology, CSL routing, phi-scaled resource management, and integration with all other Heady sites

**Input**: "Generate FAQ for headyfinance.com"
**Output**: 10 FAQ pairs covering investment thesis, financial data security, CSL relevance filtering for market signals, integration with HeadyCoin, and WCAG 2.1 accessibility compliance
