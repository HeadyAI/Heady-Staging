---
name: heady-consensus-tribunal
description: >
  Heady Consensus Tribunal — multi-model judicial system for high-stakes decisions. When a
  decision exceeds CSL HIGH (0.882) consequence threshold, it escalates to a tribunal of 3-5
  AI models acting as independent judges. Each judge evaluates the decision from a different
  cognitive archetype (OWL/wisdom, EAGLE/analysis, DOLPHIN/creativity, ELEPHANT/memory,
  BEAVER/structure), renders a verdict with reasoning chain, then a φ-weighted fusion produces
  the final ruling with dissent tracking. Implements cryptographic audit trails for every
  tribunal proceeding. Use when making irreversible decisions, resolving conflicting agent
  recommendations, validating patent claims, approving production deployments, or any high-stakes
  scenario requiring multi-perspective consensus. Keywords: consensus, tribunal, multi-model,
  judicial, high-stakes, decision, verdict, dissent, audit trail, judge, archetype, multi-
  perspective, deliberation, ruling, irreversible.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Consensus Tribunal

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- A production deployment could affect all 9 Heady domains
- Conflicting agents recommend different approaches
- Patent claims need multi-perspective validation
- Security decisions with ecosystem-wide impact
- Financial decisions exceeding token budget thresholds
- Any irreversible action that crosses CSL HIGH (0.882) consequence score

## Architecture

```
Decision Request (with consequence score >= 0.882)
  │
  ▼
Tribunal Assembly (select 3 or 5 judges based on consequence)
  ├─→ Judge 1: OWL Archetype (wisdom, long-term implications)
  ├─→ Judge 2: EAGLE Archetype (comprehensive analysis, risk)
  ├─→ Judge 3: DOLPHIN Archetype (creative alternatives)
  ├─→ Judge 4: ELEPHANT Archetype (historical precedent, memory)
  └─→ Judge 5: BEAVER Archetype (structural integrity, feasibility)
      │
      ▼ (all judges deliberate independently, in parallel)
  Verdict Collection
  ├─→ Each judge produces: { verdict, confidence, reasoning, dissent }
      │
      ▼
  φ-Weighted Fusion
  ├─→ Weight by archetype relevance to decision type
  ├─→ Weight by judge confidence
  ├─→ Detect consensus or split decision
      │
      ▼
  Ruling: { decision, confidence, unanimity, reasoning, dissents }
      │
      ▼
  Cryptographic Receipt (SHA-256 hash chain of proceeding)
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Tribunal Constants
const ESCALATION_THRESHOLD = 0.882;        // CSL HIGH — triggers tribunal
const CRITICAL_THRESHOLD = 0.927;          // CSL CRITICAL — requires 5 judges
const PANEL_SIZES = { standard: FIB[4], full: FIB[5] }; // 3 or 5 judges
const CONSENSUS_THRESHOLD = PSI;           // 61.8% agreement = consensus
const SUPERMAJORITY = PHI / (PHI + 1);     // ~61.8% — matches PSI
const DELIBERATION_TIMEOUT_MS = FIB[9] * 1000; // 34 seconds max per judge

// Archetype Weights by Decision Type
const ARCHETYPE_WEIGHTS = {
  deployment: { OWL: PHI, EAGLE: PHI, DOLPHIN: PSI, ELEPHANT: 1.0, BEAVER: PHI },
  security: { OWL: 1.0, EAGLE: PHI * PHI, DOLPHIN: PSI * PSI, ELEPHANT: PHI, BEAVER: 1.0 },
  creative: { OWL: PSI, EAGLE: 1.0, DOLPHIN: PHI * PHI, ELEPHANT: PSI, BEAVER: 1.0 },
  patent: { OWL: PHI, EAGLE: PHI, DOLPHIN: 1.0, ELEPHANT: PHI * PHI, BEAVER: PSI },
  financial: { OWL: 1.0, EAGLE: PHI, DOLPHIN: PSI * PSI, ELEPHANT: 1.0, BEAVER: PHI * PHI },
};

// Verdict Confidence Floor
const MIN_JUDGE_CONFIDENCE = 0.691;        // CSL LOW — judge must be at least somewhat sure
```

## Instructions

### 1. Tribunal Assembly

Select judges based on consequence severity:

```javascript
class TribunalAssembler {
  assemble(decision) {
    const consequenceScore = decision.consequenceScore;
    const panelSize = consequenceScore >= CRITICAL_THRESHOLD
      ? PANEL_SIZES.full   // 5 judges for critical decisions
      : PANEL_SIZES.standard; // 3 judges for high decisions

    const archetypes = ['OWL', 'EAGLE', 'DOLPHIN', 'ELEPHANT', 'BEAVER'];
    const weights = ARCHETYPE_WEIGHTS[decision.type] || ARCHETYPE_WEIGHTS.deployment;

    // Select top archetypes by relevance weight
    const ranked = archetypes
      .map(a => ({ archetype: a, weight: weights[a] }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, panelSize);

    return ranked.map(r => new Judge(r.archetype, r.weight));
  }
}
```

### 2. Independent Deliberation

Each judge evaluates independently with archetype-specific lens:

```javascript
class Judge {
  constructor(archetype, weight) {
    this.archetype = archetype;
    this.weight = weight;
    this.lens = this.getArchetypeLens();
  }

  getArchetypeLens() {
    const lenses = {
      OWL: {
        focus: 'long-term wisdom',
        prompt: 'Consider the long-term implications. What will this decision look like in 89 days? What wisdom from past patterns applies here?',
      },
      EAGLE: {
        focus: 'comprehensive risk analysis',
        prompt: 'Analyze all risks systematically. What failure modes exist? What is the blast radius? What evidence supports or contradicts this decision?',
      },
      DOLPHIN: {
        focus: 'creative alternatives',
        prompt: 'Are there better alternatives nobody considered? What creative approach might achieve the same goal with less risk? What constraints could be inverted?',
      },
      ELEPHANT: {
        focus: 'historical precedent',
        prompt: 'What similar decisions have been made before? What were the outcomes? What patterns from history inform this choice?',
      },
      BEAVER: {
        focus: 'structural feasibility',
        prompt: 'Is this structurally sound? Can it actually be built and maintained? What are the engineering realities and resource requirements?',
      },
    };
    return lenses[this.archetype];
  }

  async deliberate(decision, context) {
    const verdict = {
      archetype: this.archetype,
      approve: null,        // true/false
      confidence: 0,        // 0-1
      reasoning: '',        // Chain of thought
      dissent: null,        // If disapproving, what's the objection
      alternatives: [],     // Suggested alternatives
      timestamp: Date.now(),
    };

    // Each judge evaluates through their archetype lens
    // (In production: route to different models or same model with archetype prompt)
    // Verdict must include structured reasoning and confidence

    return verdict;
  }
}
```

### 3. φ-Weighted Fusion

Combine verdicts using archetype weights and confidence:

```javascript
class VerdictFusion {
  fuse(verdicts, decisionType) {
    const weights = ARCHETYPE_WEIGHTS[decisionType] || ARCHETYPE_WEIGHTS.deployment;

    let approveScore = 0;
    let rejectScore = 0;
    let totalWeight = 0;

    for (const verdict of verdicts) {
      const archetypeWeight = weights[verdict.archetype] || 1.0;
      const confidenceWeight = verdict.confidence;
      const compositeWeight = archetypeWeight * confidenceWeight;

      if (verdict.approve) {
        approveScore += compositeWeight;
      } else {
        rejectScore += compositeWeight;
      }
      totalWeight += compositeWeight;
    }

    const approveRatio = totalWeight > 0 ? approveScore / totalWeight : 0;
    const unanimous = verdicts.every(v => v.approve === verdicts[0].approve);

    return {
      decision: approveRatio >= CONSENSUS_THRESHOLD ? 'APPROVED' : 'REJECTED',
      approveRatio,
      unanimous,
      consensus: approveRatio >= SUPERMAJORITY || approveRatio <= (1 - SUPERMAJORITY),
      splitDecision: !unanimous && Math.abs(approveRatio - 0.5) < PSI * PSI,
      dissents: verdicts.filter(v => v.approve !== (approveRatio >= CONSENSUS_THRESHOLD)),
      coherenceScore: unanimous ? 1.0 : approveRatio >= SUPERMAJORITY ? 0.882 : 0.691,
    };
  }
}
```

### 4. Cryptographic Audit Trail

Every tribunal proceeding gets an immutable receipt:

```javascript
class TribunalReceipt {
  async generate(decision, verdicts, ruling) {
    const proceeding = {
      tribunalId: generateId(),
      timestamp: Date.now(),
      decision: {
        description: decision.description,
        type: decision.type,
        consequenceScore: decision.consequenceScore,
      },
      verdicts: verdicts.map(v => ({
        archetype: v.archetype,
        approve: v.approve,
        confidence: v.confidence,
        reasoning: v.reasoning,
      })),
      ruling: {
        decision: ruling.decision,
        approveRatio: ruling.approveRatio,
        unanimous: ruling.unanimous,
        coherenceScore: ruling.coherenceScore,
      },
    };

    // SHA-256 hash chain
    const serialized = JSON.stringify(proceeding, null, 0);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      ...proceeding,
      receiptHash: hashHex,
      previousHash: this.lastHash || '0'.repeat(64),
    };
  }
}
```

## Integration Points

| Decision Type | Trigger | Panel Size | Key Archetypes |
|---|---|---|---|
| Production deploy | Code merge to main | 3 | EAGLE, BEAVER, OWL |
| Security policy change | Firewall rule update | 5 | EAGLE, OWL, ELEPHANT |
| Patent claim validation | New provisional filing | 5 | OWL, ELEPHANT, DOLPHIN |
| Budget reallocation | > PSI² of total budget | 3 | OWL, BEAVER, EAGLE |
| Service retirement | Remove from topology | 3 | ELEPHANT, EAGLE, BEAVER |
| Architecture change | Sacred Geometry modification | 5 | All five |

## API

```javascript
const { ConsensusTribunal } = require('@heady/consensus-tribunal');

const tribunal = new ConsensusTribunal({ models, vectorMemory, auditLog });

const ruling = await tribunal.convene({
  description: 'Deploy new synaptic mesh routing to production',
  type: 'deployment',
  consequenceScore: 0.891,
  context: { affectedServices: 34, rollbackPlan: true },
});

// ruling: { decision: 'APPROVED', approveRatio: 0.847, unanimous: false, dissents: [...] }

tribunal.health();
await tribunal.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.912,
  "tribunalsConvened": 55,
  "approvalRate": 0.764,
  "unanimousRate": 0.436,
  "averageDeliberationMs": 18200,
  "receiptChainLength": 55,
  "receiptChainValid": true,
  "version": "1.0.0"
}
```
