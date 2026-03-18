---
name: heady-semantic-firewall
description: >
  Heady Semantic Firewall — content and prompt security layer using CSL vector gates to detect
  and block prompt injection, data exfiltration, adversarial inputs, policy violations, and
  semantic anomalies in real-time. Operates in 384D embedding space with φ-scaled threat
  thresholds, Fibonacci-windowed behavioral baselines, orthogonal projection attack detection,
  and quarantine routing for suspicious payloads. Use when securing agent inputs/outputs,
  protecting against prompt injection, enforcing content policies, detecting adversarial patterns,
  or building trust boundaries between services. Keywords: firewall, security, prompt injection,
  adversarial, content policy, threat detection, semantic anomaly, quarantine, trust boundary,
  input validation, output filtering, DLP, data loss prevention, guardrails.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Semantic Firewall

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Securing agent inputs against prompt injection attacks
- Filtering model outputs for policy compliance
- Detecting data exfiltration attempts through agent responses
- Building trust boundaries between services in the mesh
- Enforcing content policies across HeadyBuddy conversations
- Monitoring for semantic anomalies in pipeline execution
- Creating quarantine zones for suspicious payloads

## Architecture

```
Incoming Payload (prompt, response, tool call, inter-service message)
  │
  ▼
Layer 1: Structural Analysis
  ├─→ Pattern Matching (known attack signatures)
  ├─→ Token Frequency Analysis (statistical anomalies)
  └─→ Encoding Detection (base64, hex, unicode obfuscation)
      │
      ▼
Layer 2: Semantic Analysis (384D embedding space)
  ├─→ Intent Embedding → Cosine distance from baseline
  ├─→ CSL NOT Gate → Orthogonal projection from policy vectors
  ├─→ Topic Drift Detection → Cosine drift from conversation context
  └─→ Behavioral Baseline → Fibonacci-windowed normal distribution
      │
      ▼
Layer 3: Policy Enforcement
  ├─→ Content Policy Gates (harm, PII, credentials, IP)
  ├─→ Role-Based Access (what this entity is allowed to do)
  └─→ Rate Limiting (semantic dedup + frequency caps)
      │
      ▼
Decision: ALLOW (>= 0.882) | INSPECT (>= 0.691) | QUARANTINE (>= 0.500) | BLOCK (< 0.500)
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Firewall Constants
const THREAT_LEVELS = {
  SAFE: 0.882,           // CSL HIGH — clearly safe, pass through
  REVIEW: 0.809,         // CSL MEDIUM — inspect but likely safe
  SUSPICIOUS: 0.691,     // CSL LOW — elevated monitoring
  DANGEROUS: 0.500,      // CSL MINIMUM — quarantine
  BLOCKED: 0.0,          // Below minimum — hard block
};

const BASELINE_WINDOW = FIB[8];              // 21 messages for behavioral baseline
const DRIFT_ALERT_THRESHOLD = PSI * PSI;     // 0.382 cosine distance triggers alert
const MAX_QUARANTINE_SIZE = FIB[10];         // 55 quarantined items max
const QUARANTINE_TTL_HOURS = FIB[8];         // 21 hours before quarantine review
const INJECTION_PATTERNS_LIMIT = FIB[12];    // 144 known patterns in signature DB
const SEMANTIC_DEDUP_THRESHOLD = 0.972;      // CSL DEDUP — rapid-fire same request
const RATE_LIMIT_WINDOW_SEC = FIB[7];        // 13-second sliding window
const MAX_REQUESTS_PER_WINDOW = FIB[6];      // 8 requests per window

// Policy vector dimensions
const POLICY_VECTORS = {
  HARM: null,           // 384D embedding of harmful content concept
  PII: null,            // 384D embedding of personal data concept
  CREDENTIALS: null,    // 384D embedding of secrets/keys concept
  INJECTION: null,      // 384D embedding of prompt injection concept
  EXFILTRATION: null,   // 384D embedding of data exfiltration concept
};
```

## Instructions

### 1. Structural Analysis Layer

Fast, regex-based checks before expensive embedding operations:

```javascript
class StructuralAnalyzer {
  analyze(payload) {
    const threats = [];

    // Known injection patterns
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+(instructions|prompts)/i,
      /you\s+are\s+now\s+(a|an)\s+/i,
      /system\s*:\s*/i,
      /\[INST\]/i,
      /<<SYS>>/i,
      /```\s*system/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(payload.text)) {
        threats.push({ type: 'injection-pattern', pattern: pattern.source, severity: 0.3 });
      }
    }

    // Encoding obfuscation detection
    const base64Ratio = (payload.text.match(/[A-Za-z0-9+/=]{20,}/g) || []).length;
    if (base64Ratio > FIB[4]) {
      threats.push({ type: 'encoding-obfuscation', severity: 0.5 });
    }

    // Token frequency anomaly
    const tokens = payload.text.split(/\s+/);
    const uniqueRatio = new Set(tokens).size / tokens.length;
    if (uniqueRatio < PSI * PSI) { // Below 0.382 unique ratio = suspicious
      threats.push({ type: 'token-anomaly', severity: 0.4 });
    }

    return { threats, structuralScore: threats.length === 0 ? 1.0 : Math.max(0, 1 - threats.length * PSI) };
  }
}
```

### 2. Semantic Analysis Layer

Deep analysis in 384D embedding space:

```javascript
class SemanticAnalyzer {
  constructor(embeddingProvider, policyVectors) {
    this.embeddingProvider = embeddingProvider;
    this.policyVectors = policyVectors;
    this.baselines = new Map(); // entityId → recent embeddings
  }

  async analyze(payload) {
    const embedding = await this.embeddingProvider.embed(payload.text, { dimensions: 384 });
    const results = {};

    // Check against policy vectors (CSL NOT — orthogonal projection)
    for (const [policy, vector] of Object.entries(this.policyVectors)) {
      if (!vector) continue;
      const similarity = cosineSimilarity(embedding, vector);
      results[policy] = {
        similarity,
        violates: similarity > THREAT_LEVELS.SUSPICIOUS,
      };
    }

    // Behavioral baseline drift
    const baseline = this.baselines.get(payload.entityId);
    if (baseline && baseline.length >= FIB[5]) {
      const baselineMean = this.meanEmbedding(baseline);
      const drift = 1 - cosineSimilarity(embedding, baselineMean);
      results.drift = { distance: drift, anomalous: drift > DRIFT_ALERT_THRESHOLD };
    }

    // Update baseline
    if (!this.baselines.has(payload.entityId)) {
      this.baselines.set(payload.entityId, []);
    }
    const buf = this.baselines.get(payload.entityId);
    buf.push(embedding);
    if (buf.length > BASELINE_WINDOW) buf.shift();

    // Composite semantic score
    const policyScores = Object.values(results)
      .filter(r => r.similarity !== undefined)
      .map(r => 1 - r.similarity);
    const semanticScore = policyScores.length > 0
      ? policyScores.reduce((a, b) => a + b, 0) / policyScores.length
      : 1.0;

    return { embedding, results, semanticScore };
  }

  meanEmbedding(embeddings) {
    const mean = new Float32Array(384);
    for (const emb of embeddings) {
      for (let d = 0; d < 384; d++) mean[d] += emb[d];
    }
    for (let d = 0; d < 384; d++) mean[d] /= embeddings.length;
    return mean;
  }
}
```

### 3. Policy Enforcement

Combine structural and semantic scores for final decision:

```javascript
class PolicyEnforcer {
  decide(structuralResult, semanticResult, entityTrustLevel) {
    // φ-weighted composite score
    const compositeScore = (
      structuralResult.structuralScore * PHI +
      semanticResult.semanticScore * 1.0 +
      entityTrustLevel * PSI
    ) / (PHI + 1.0 + PSI);

    if (compositeScore >= THREAT_LEVELS.SAFE) {
      return { decision: 'ALLOW', score: compositeScore, action: 'pass-through' };
    }
    if (compositeScore >= THREAT_LEVELS.REVIEW) {
      return { decision: 'INSPECT', score: compositeScore, action: 'log-and-pass' };
    }
    if (compositeScore >= THREAT_LEVELS.DANGEROUS) {
      return { decision: 'QUARANTINE', score: compositeScore, action: 'hold-for-review' };
    }
    return { decision: 'BLOCK', score: compositeScore, action: 'reject' };
  }
}
```

### 4. Quarantine System

Isolated storage for suspicious payloads:

```javascript
class QuarantineZone {
  constructor() {
    this.items = [];
  }

  quarantine(payload, analysis) {
    if (this.items.length >= MAX_QUARANTINE_SIZE) {
      // Evict oldest
      this.items.shift();
    }
    this.items.push({
      payload,
      analysis,
      quarantinedAt: Date.now(),
      expiresAt: Date.now() + QUARANTINE_TTL_HOURS * 3600 * 1000,
      reviewed: false,
    });
  }

  getUnreviewed() {
    return this.items.filter(i => !i.reviewed && i.expiresAt > Date.now());
  }

  release(itemId) {
    const item = this.items.find(i => i.payload.id === itemId);
    if (item) { item.reviewed = true; return item.payload; }
    return null;
  }
}
```

### 5. Output Filtering

Scan model outputs before they reach the user:

```javascript
class OutputFilter {
  async filter(response, context) {
    // Check for credential leakage
    const credentialPatterns = [
      /(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S{8,}/i,
      /(?:sk|pk)[-_][a-zA-Z0-9]{20,}/,
      /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/,  // JWT
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(response.text)) {
        return { filtered: true, reason: 'credential-leak', redacted: this.redact(response.text, pattern) };
      }
    }

    // Semantic output check
    const embedding = await this.embeddingProvider.embed(response.text, { dimensions: 384 });
    const contextDrift = 1 - cosineSimilarity(embedding, context.intentEmbedding);

    if (contextDrift > DRIFT_ALERT_THRESHOLD) {
      return { filtered: true, reason: 'output-drift', drift: contextDrift };
    }

    return { filtered: false };
  }
}
```

## Integration Points

| Heady Component | Firewall Position | Protection |
|---|---|---|
| Gateway | Ingress — first layer | All incoming requests |
| HeadyBuddy | Conversation I/O | User prompt + model response |
| MCP Server | Tool calls | Tool input validation |
| Inter-service | Service mesh | Internal message integrity |
| Pipeline | Per-stage | Stage input/output gates |
| HeadyBee | Worker I/O | Agent command validation |

## API

```javascript
const { SemanticFirewall } = require('@heady/semantic-firewall');

const firewall = new SemanticFirewall({
  embeddingProvider,
  policyVectors: loadedPolicies,
  trustRegistry,
});

const result = await firewall.inspect({
  text: userInput,
  entityId: 'user-123',
  direction: 'inbound',
  context: conversationContext,
});

// result: { decision: 'ALLOW', score: 0.912, threats: [], latencyMs: 12 }

firewall.health();
await firewall.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.927,
  "inspectedPayloads": 8934,
  "blockedCount": 23,
  "quarantinedCount": 7,
  "falsePositiveRate": 0.012,
  "avgLatencyMs": 8.3,
  "policyVectorsLoaded": 5,
  "version": "1.0.0"
}
```
