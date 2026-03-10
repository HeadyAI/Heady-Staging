<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: docs/IMAGINATION_ENGINE.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Heady Imagination Engine

> **Autonomous concept generation and IP discovery system for Heady**
> 
> *Sacred Geometry Architecture | DABUS-Inspired | Mission-Aligned*

## What Is This?

The Imagination Engine is Heady's system for **autonomous concept generation**—a creativity engine that generates novel ideas by recombining "primitives" (building blocks), evaluates them for novelty/usefulness/safety, and can draft intellectual property materials.

It's inspired by DABUS (Device for the Autonomous Bootstrapping of Unified Sentience) and Imagination Engines research, but designed for practical use in software/AI development with human oversight.

## Core Philosophy

1. **Autonomous but Guided**: The system generates concepts autonomously but stays within value constraints (safety, ethics, Heady's mission)
2. **Human-in-the-Loop**: AI proposes; humans validate, refine, and claim IP
3. **Continuous Learning**: The system improves based on which ideas succeed
4. **IP-Aware**: All concepts are evaluated for patentability and appropriate IP posture

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     IMAGINATION ENGINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Primitives  │───▶│ Recombination│───▶│   Concepts   │      │
│  │   Library    │    │  Operators   │    │   Generated  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                     │              │
│         │                   │                     ▼              │
│         │                   │            ┌──────────────┐      │
│         │                   │            │  Evaluation  │      │
│         │                   │            │  (Novelty/   │      │
│         │                   │            │  Usefulness/ │      │
│         │                   │            │    Risk)     │      │
│         │                   │            └──────────────┘      │
│         │                   │                     │              │
│         ▼                   ▼                     ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    Meta-     │◀───│     Hot      │◀───│   Safety/    │      │
│  │   Learning   │    │   Concepts   │    │    Ethics    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                   │
│                              ▼                                   │
│                       ┌──────────────┐                           │
│                       │   IP Package │                           │
│                       │   Creation   │                           │
│                       └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

[View Architecture Diagram](https://www.figma.com/online-whiteboard/create-diagram/ebeed808-eb3d-4e0b-85c4-3f46421c049c)

## Quick Start

### 1. Initialize

```javascript
const { imagination } = require('./src/hc_imagination');
await imagination.init();
```

### 2. Add Primitives

Primitives are building blocks extracted from code, patents, or manual entry:

```javascript
// Extract from code
await imagination.extractPrimitives(sourceCode, 'code');

// Add manually
imagination.addPrimitive('mechanism', 'Distributed consensus without leader', 'blockchain', ['consensus', 'distributed']);
```

### 3. Generate Concepts

```javascript
// Run imagination cycle - generates and evaluates concepts
const concepts = await imagination.imagine(5);

// Review results
concepts.forEach(c => {
  console.log(`${c.title} - Novelty: ${c.scores.novelty.toFixed(2)}`);
});
```

### 4. Create IP Packages

```javascript
// For high-value concepts, create IP materials
const ipPackage = await imagination.createIPPackage(conceptId);
console.log(`IP Posture: ${ipPackage.ip_posture}`);
```

## Recombination Operators

The engine uses 5 core operators to generate concepts:

| Operator | Description | When to Use |
|----------|-------------|-------------|
| **BLEND** | Merge two primitives | Combining technologies from different domains |
| **SUBSTITUTE** | Replace primitive in concept | Iterating designs by swapping components |
| **EXTEND** | Add primitive to concept | Enhancing existing ideas with features |
| **INVERT** | Flip assumptions | Exploring contrarian approaches |
| **MORPH** | Interpolate between concepts | Finding middle-ground solutions |

## Evaluation System

### Novelty (0-1)
Calculated as inverse of maximum similarity to existing concepts using Jaccard similarity of primitive sets.

- **>0.8**: Highly novel, potentially patentable
- **0.6-0.8**: Moderately novel
- **<0.6**: Similar to existing work

### Usefulness (0-1)
Based on:
- Track record of source primitives
- Number of identified applications
- Domain relevance

### Risk (0-1)
Checks against:

**Hard Constraints** (auto-discard if violated):
- no_weapons
- no_surveillance_exploitation
- no_discriminatory_systems
- no_environmental_harm
- no_human_rights_abuse

**Amber Zones** (elevated risk, requires review):
- surveillance_technology
- automated_decision_making
- biometric_systems
- social_scoring

## Hot Concept Protocol

Concepts scoring **novelty > 0.8 AND usefulness > 0.7** are marked "hot" and:
1. Get priority for elaboration
2. Trigger IP package creation
3. Notify other Heady systems
4. Are flagged for human review

## IP Discovery

### Patent Posture Selection

The system automatically selects appropriate IP posture:

| Posture | When Selected | Example |
|---------|---------------|---------|
| **Patent** | Novelty > 0.8, clear commercial potential | Unique technical invention |
| **Open License** | High social impact, low exclusivity need | Accessibility tool |
| **Defensive Publication** | Prior art exists, want to block patents | Publishing to prevent trolling |
| **Trade Secret** | Not obviously novel, hard to reverse-engineer | Internal process optimization |
| **Commons** | Fundamental research, needs wide adoption | Basic algorithm |

### IP Package Contents

Each IP package includes:
- Draft patent claims (independent + dependent)
- Specification sections (background, summary, detailed description)
- Drawing prompts
- Prior art list with distinctions
- Human review status

## API Endpoints

### Primitives
- `POST /api/imagination/primitives` - Add primitives
- `GET /api/imagination/primitives` - List with filtering
- `POST /api/imagination/extract-primitives` - Extract from source

### Concepts
- `POST /api/imagination/imagine` - Generate concepts
- `GET /api/imagination/concepts` - List with filters
- `GET /api/imagination/concepts/:id` - Get details
- `POST /api/imagination/concepts/:id/evaluate` - Re-evaluate
- `POST /api/imagination/concepts/:id/feedback` - Provide feedback

### Operators
- `POST /api/imagination/operators/{blend,substitute,extend,invert,morph}`

### IP
- `POST /api/imagination/concepts/:id/prior-art`
- `POST /api/imagination/concepts/:id/ip-package`
- `GET /api/imagination/ip-packages`

### System
- `GET /api/imagination/stats` - System statistics
- `POST /api/imagination/auto-cycle` - Run full autonomous cycle
- `POST /api/imagination/tournament` - Compare concepts
- `POST /api/imagination/safety-check` - Check safety

## For Coding Agents

### After Each Task - Always Extract

```javascript
// Extract primitives from code you just wrote
await imagination.extractPrimitives(code, 'code');

// Generate new ideas based on learnings
await imagination.imagine(3);

// Check if anything hot emerged
const hot = imagination.getHotConcepts();
if (hot.length > 0) {
  // Present to human
}
```

### Before Starting Work - Get Inspiration

```javascript
// Query relevant concepts
const relevant = imagination.getTopConcepts(5, 'refined');

// Use as inspiration for new work
```

### Testing & Feedback

```javascript
// Test a concept
const experiment = await testConcept(conceptId, 'code');

// Provide feedback to train system
imagination.updatePrimitiveWeights(conceptId, success=true);
imagination.updateOperatorStats('BLEND', success=true);
```

See [Agent Guide](src/examples/imagination-agent-guide.js) for complete patterns.

## Configuration

Edit `configs/imagination-engine.yaml`:

```yaml
recombination:
  interval_minutes: 30
  concepts_per_batch: 5

thresholds:
  novelty: 0.6
  hot_novelty: 0.8
  hot_usefulness: 0.7

safety:
  hard_constraints:
    - no_weapons
    - no_surveillance_exploitation
    # ... etc

mission:
  preferred_tags: ["social_impact", "equity", "accessibility"]
  boost_tags:
    social_impact: 0.1
    equity: 0.15
```

## Files

| File | Purpose |
|------|---------|
| `src/hc_imagination.js` | Core engine (600+ lines) |
| `src/routes/imagination-routes.js` | REST API (400+ lines) |
| `src/hc_imagination_pattern_integration.js` | Pattern engine integration |
| `src/hc_imagination_llm.js` | LLM integration (future) |
| `src/examples/imagination-agent-guide.js` | Coding agent patterns |
| `configs/imagination-engine.yaml` | Configuration |
| `.windsurf/workflows/imagination-engine.md` | Workflow documentation |

## Integration with Heady Systems

The Imagination Engine integrates with:

- **Pattern Engine**: Cross-references hot concepts with detected patterns
- **Self-Critique Engine**: Feeds concept outcomes for system improvement
- **Monte Carlo Scheduler**: Uses imagination for plan optimization
- **Story Driver**: Logs major imaginative leaps as system events

## Mission Alignment

The Imagination Engine is designed to support Heady's mission:

1. **Maximize global happiness**: Prefers concepts that increase well-being
2. **Fair wealth redistribution**: Boosts equity-related concepts (+0.15 to scores)
3. **Safety and ethics**: Hard constraints prevent harmful outputs
4. **Transparency**: All reasoning logged and auditable

## Legal Note

Current patent law requires human inventors. The Imagination Engine:
- Generates concept candidates autonomously
- Drafts IP materials (claims, specs, prior art)
- **Requires human review and validation** before filing
- Human must be named inventor on any patent

This is "AI-assisted invention" not "AI-only invention"—fully compliant with USPTO/EPO guidance.

## Future Enhancements

1. **LLM Integration**: Use GPT-4/Claude for generation and evaluation
2. **Visual Imagination**: Generate UI mockups and diagrams
3. **Multi-Modal**: Combine text, code, and image primitives
4. **Collaborative**: Distributed imagination across multiple agents
5. **Patent API Integration**: Connect to USPTO/EPO for real prior art search

## Contributing

When adding features:
1. Maintain safety constraint system
2. Keep IP posture selection logic
3. Add tests for new operators
4. Update agent guide with new patterns

---

*Heady Imagination Engine v1.0.0*
*Part of the Sacred Geometry Architecture*
