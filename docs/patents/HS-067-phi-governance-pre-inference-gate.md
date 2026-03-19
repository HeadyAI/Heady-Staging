# PROVISIONAL PATENT APPLICATION

## U.S. Patent and Trademark Office

### Under 35 U.S.C. § 111(b)

---

**Application Number:** [PENDING]
**Filing Date:** [PENDING]
**Application Type:** Utility — Provisional Application under 35 USC 111(b)
**Applicant:** HeadySystems Inc.
**Inventor(s):** Eric Haywood
**Customer Number:** 221639
**Attorney Docket No.:** HS-067

---

# PHI-GOVERNED PRE-INFERENCE COMPLIANCE GATE WITH GOLDEN-RATIO ANOMALY DETECTION FOR AI SYSTEMS

---

**U.S. Government Interest:** None

---

## CROSS-REFERENCE TO RELATED APPLICATIONS

This application is related to HS-062 (Vector-Native Security), HS-058 (Continuous Semantic Logic), HS-059 (Self-Healing Attestation Mesh), and HS-060 (Dynamic Bee Factory), all assigned to the same applicant.

This application DIFFERS from HS-062 in that HS-062 operates within the embedding (vector) space on already-embedded data, while this invention operates on raw text content BEFORE it enters any AI pipeline, embedding, or external LLM call. The two inventions are complementary — this invention gates content pre-inference; HS-062 monitors the vector space post-embedding.

---

## FIELD OF THE INVENTION

The present invention relates to governance and compliance in AI inference systems, and more particularly to a multi-layer pre-inference scanning method that detects Protected Health Information (PHI), statistical anomalies, prompt injection attacks, and IP-based threats using golden-ratio-derived thresholds — all before content reaches an external Large Language Model (LLM) or embedding pipeline.

---

## BACKGROUND OF THE INVENTION

As enterprises deploy autonomous AI agents that call external LLMs (OpenAI, Anthropic, Google, etc.), a critical compliance gap emerges:

1. **PHI Leakage:** Autonomous agents may inadvertently transmit Protected Health Information to external LLM APIs, violating HIPAA/HITECH regulations. Current approaches detect PHI post-hoc (after transmission), when damage is already done.
2. **Prompt Injection at LLM Boundaries:** Adversaries embed injection payloads designed to hijack LLM behavior or extract system prompts. Current guards operate as standalone middleware, disconnected from governance auditing.
3. **Anomalous Request Patterns:** Statistical anomalies in request volume, content size, or timing can indicate automated attacks, data exfiltration, or system compromise. Current rate limiters use fixed thresholds that cannot adapt to natural traffic evolution.
4. **Audit Gap:** Enterprise clients require tamper-resistant governance receipts proving that every LLM call was scanned, every anomaly was classified, and every blocked request was documented. No current system provides unified receipts across all security layers.

No prior art combines all four layers into a single pre-inference gate with golden-ratio-derived statistical thresholds and cryptographic governance receipts.

---

## SUMMARY OF THE INVENTION

The present invention provides a Pre-Inference Compliance Gate that scans all content destined for external AI services through four sequential governance layers:

**Layer 1 — PHI/HIPAA Detection:** Content is scanned against a configurable registry of Protected Health Information patterns. Detected PHI is quarantined — the content NEVER reaches the external LLM. Quarantined items are cryptographically hashed for audit purposes; raw PHI is never stored in logs.

**Layer 2 — Golden-Ratio Anomaly Detection:** Request metrics (latency, content size, frequency) are analyzed using a dual statistical method: z-score calculation validated by Interquartile Range (IQR) cross-check. Anomaly severity is classified using three thresholds derived from the golden ratio (φ ≈ 1.618):
- WATCH: φ¹ ≈ 1.618 standard deviations — log only
- ALERT: φ² ≈ 2.618 standard deviations — notify
- CRITICAL: φ⁴ ≈ 6.854 standard deviations — quarantine and block

Rolling statistics use Fibonacci-sequence window sizes (21, 89, 233 samples) for multi-timescale detection.

**Layer 3 — Prompt Injection Detection:** Content is scanned for injection payloads [PATTERNS ARE TRADE SECRET — SEE §TRADE SECRET NOTICE]. Detected injections are blocked and quarantined with full governance receipts.

**Layer 4 — IP Anomaly Detection:** Request source IP addresses are tracked using Fibonacci-derived thresholds for burst detection and rate limiting. Threat levels (NOMINAL → MEDIUM → HIGH → CRITICAL) are assigned based on composite scoring.

Every scan produces a **Governance Receipt** — a tamper-resistant record of the scan ID, timestamp, duration, layer-by-layer results, verdict (ALLOWED/BLOCKED), and cryptographic hash of the request context. Receipts enable enterprise audit compliance.

A **Key-Value Execution Store** tracks each processing step at millisecond resolution, providing observability into multi-step autonomous workflows.

---

## DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS

### I. Pre-Inference Architecture

The system intercepts all requests destined for external LLM APIs at the gateway layer:

```
Client Request → Gateway → [PHI GOVERNANCE ENGINE] → External LLM
                                    ↓ (if blocked)
                              Quarantine Pipeline
                                    ↓
                            Governance Receipt Store
```

Content is scanned BEFORE transmission. Blocked content never leaves the system boundary.

### II. Golden-Ratio Anomaly Detection

The system maintains three rolling statistical buffers at different timescales:

| Buffer | Window Size | Fibonacci Index | Purpose |
|--------|-------------|-----------------|---------|
| Short | 21 samples | fib(8) | Fast-reaction to sudden spikes |
| Medium | 89 samples | fib(11) | Standard detection baseline |
| Long | 233 samples | fib(13) | Trend-drift detection |

For each observation, the system:
1. Computes the z-score: `z = |value - mean| / stddev`
2. Computes the IQR cross-check: `outlier = value < (Q1 - φ²·IQR) OR value > (Q3 + φ²·IQR)`
3. Computes a composite score: if IQR agrees, `composite = z × φ`; otherwise `composite = z`
4. Classifies severity using φ-derived thresholds:

| Level | Threshold (σ) | Derivation | Action |
|-------|--------------|------------|--------|
| NOMINAL | < φ¹ | Below golden ratio | Allow |
| WATCH | ≥ φ¹ ≈ 1.618 | Golden ratio | Log only |
| ALERT | ≥ φ² ≈ 2.618 | φ squared | Notify operator |
| CRITICAL | ≥ φ⁴ ≈ 6.854 | φ to the fourth | Quarantine + block |

### III. Quarantine Pipeline

When any layer triggers a block:
1. Content is cryptographically hashed (SHA-256, truncated to 16 chars)
2. A quarantine record is created with: scan ID, reason, timestamp, content hash, content length, and layer-specific details
3. Raw content is NEVER stored in the quarantine record (HIPAA compliance)
4. A governance receipt is generated
5. The quarantine event is emitted for downstream monitoring

### IV. Key-Value Execution Store

Every processing step is recorded in a bounded KV store:

| Field | Type | Description |
|-------|------|-------------|
| key | string | Step identifier (e.g., `scan:abc123`) |
| value | object | Step data (layers, results, timing) |
| timestamp | epoch ms | Millisecond-precision timestamp |
| stepId | string | Unique step identifier |

The store is bounded at fib(14) = 610 entries with fib(7) = 13 entries evicted per cleanup cycle.

### V. Governance Receipt Structure

Each scan produces a receipt:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique scan identifier |
| timestamp | ISO 8601 | When the scan occurred |
| durationMs | number | Scan duration in milliseconds |
| verdict | enum | ALLOWED or BLOCKED |
| layers.phiDetected | boolean | Whether PHI was found |
| layers.anomalyLevel | enum | NOMINAL/WATCH/ALERT/CRITICAL |
| layers.anomalyScore | number | Composite anomaly score |
| layers.injectionRisk | boolean | Whether injection was detected |
| layers.ipThreat | enum | IP threat classification |
| quarantined | boolean | Whether content was quarantined |
| userId | string (hashed) | Hashed user identifier |
| ip | string (hashed) | SHA-256 truncated IP hash |

### VI. Express Middleware Integration

The system provides a middleware factory function that integrates with standard HTTP frameworks:
1. Intercepts POST requests with body content
2. Extracts content from common LLM request formats (`prompt`, `messages[].content`)
3. Passes content through all four governance layers
4. Attaches the governance receipt to the request object
5. Returns HTTP 403 with structured error for blocked requests
6. Calls `next()` for allowed requests

---

## TRADE SECRET NOTICE

**The following components of this system are designated as TRADE SECRETS under the Defend Trade Secrets Act (18 U.S.C. § 1836) and are NOT part of this patent disclosure:**

1. The specific regular expression patterns used for PHI/HIPAA detection (Layer 1)
2. The specific regular expression patterns used for prompt injection detection (Layer 3)
3. The exact composite scoring formula and weighting coefficients
4. Internal tuning parameters and calibration data
5. The specific IP classification algorithms and scoring weights

**These trade secrets are maintained in a separate, access-controlled code module (`trade-secret-vault.js`) with restricted access, separate version control, and runtime-only loading. They are referenced in this patent application only by their functional role, not by their specific implementation.**

---

## CLAIMS

**Claim 1.** A computer-implemented method for pre-inference governance scanning of content destined for external AI services, comprising:
(a) intercepting content at a gateway layer before transmission to an external Large Language Model (LLM);
(b) scanning said content against a configurable registry of Protected Health Information (PHI) patterns and quarantining matched content to prevent transmission;
(c) analyzing request metrics using golden-ratio-derived statistical thresholds to classify anomaly severity;
(d) scanning said content for prompt injection payloads;
(e) generating a governance receipt for each scan documenting the verdict and layer-by-layer results.

**Claim 2.** The method of Claim 1, wherein said anomaly severity classification uses three thresholds derived from powers of the golden ratio φ ≈ 1.618: WATCH at φ¹ standard deviations, ALERT at φ² standard deviations, and CRITICAL at φ⁴ standard deviations.

**Claim 3.** The method of Claim 2, wherein said anomaly detection employs a dual statistical method comprising z-score calculation validated by Interquartile Range (IQR) cross-check, with a composite score computed as the z-score multiplied by φ when the IQR method independently confirms the anomaly.

**Claim 4.** The method of Claim 2, wherein said anomaly detection uses rolling statistical buffers at multiple timescales defined by Fibonacci-sequence window sizes, comprising at minimum a short window of fib(8) = 21 samples, a medium window of fib(11) = 89 samples, and a long window of fib(13) = 233 samples.

**Claim 5.** The method of Claim 1, wherein said quarantine pipeline cryptographically hashes blocked content using SHA-256 for audit purposes while preventing storage of raw Protected Health Information in any log, receipt, or quarantine record.

**Claim 6.** The method of Claim 1, further comprising a Key-Value Execution Store that records each processing step with millisecond-precision timestamps, providing real-time observability into multi-step autonomous AI workflows.

**Claim 7.** The method of Claim 1, further comprising IP anomaly detection using Fibonacci-derived thresholds, wherein burst detection triggers at fib(7) requests per second and rate limiting triggers at fib(11) requests per detection window.

**Claim 8.** A pre-inference compliance gate system for AI services, comprising:
(a) a PHI detection module configured to identify Protected Health Information in content and quarantine matched content before external transmission;
(b) a golden-ratio anomaly detector configured to classify request anomalies using φ-derived sigma thresholds;
(c) a prompt injection scanner configured to detect and block injection payloads;
(d) an IP anomaly detector configured to identify burst and rate-limit violations using Fibonacci-derived thresholds;
(e) a governance receipt generator configured to produce tamper-resistant audit records for each scan;
(f) a Key-Value execution store configured to provide millisecond-level step tracking;
(g) a quarantine pipeline configured to cryptographically hash and isolate blocked content.

**Claim 9.** The system of Claim 8, wherein said system is implemented as a lazy-materializing liquid node that remains in a LATENT state until first access, materializes on-demand, and returns to LATENT state after a golden-ratio-scaled idle timeout.

---

## ABSTRACT

A system and method for pre-inference governance scanning of content destined for external AI Large Language Model (LLM) services. The system operates as a multi-layer compliance gate intercepting content at the gateway layer before transmission. Four sequential scanning layers are applied: (1) Protected Health Information (PHI) detection and quarantine to prevent HIPAA violations, (2) golden-ratio-derived statistical anomaly detection using z-score and IQR cross-validation with phi-power sigma thresholds, (3) prompt injection detection and blocking, and (4) IP anomaly detection using Fibonacci-derived burst and rate thresholds. Every scan produces a tamper-resistant governance receipt documenting the verdict and layer-by-layer results. A Key-Value execution store provides millisecond-precision observability. Blocked content is cryptographically hashed and quarantined — raw PHI never reaches external services, log systems, or quarantine stores. The system integrates as HTTP middleware and operates as a lazy-materializing node that remains latent until accessed.

---

*© 2026 HeadySystems Inc. All rights reserved.*
*Attorney Docket No.: HS-067*

**Reduction to Practice:** `src/governance/phi-governance-engine.js` — verified March 19, 2026.
**Related Patent Lock Zones:** `src/governance/`, `src/core/liquid/`
