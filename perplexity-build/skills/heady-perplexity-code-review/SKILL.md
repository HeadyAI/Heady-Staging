---
name: heady-perplexity-code-review
title: Heady Perplexity Code Review
description: Skill for Perplexity to review generated code against all 8 Unbreakable Laws
triggers: code review, law check, compliance, quality, audit
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Perplexity Code Review

Skill for Perplexity to review generated code against all 8 Unbreakable Laws

## Purpose
Review generated code against Heady's 8 Unbreakable Laws and enforce φ-compliance.

## Law Compliance Checklist
1. **Thoroughness** — No skipped error handling, no generic catches, full JSDoc
2. **Solutions Only** — No workarounds, no `// TODO`, no `// HACK`, no `setTimeout` fixes
3. **Context Maximization** — HeadyAutoContext wired into every endpoint
4. **Implementation Completeness** — Deployable, no stubs, no placeholders
5. **Cross-Environment Purity** — Zero `localhost` references in production code
6. **10,000-Bee Scale** — Designed for concurrent execution at scale
7. **Auto-Success Integrity** — φ-scaled heartbeat, dynamic categories
8. **Arena Mode** — Competitive excellence, multiple approaches evaluated

## Banned Patterns
- ❌ Priority enums/constants/types (CRITICAL, HIGH, MEDIUM, LOW)
- ❌ `any` type in TypeScript
- ❌ Empty catch blocks
- ❌ Hardcoded timeout values (must be φ-scaled)
- ❌ Magic numbers (must derive from PHI/PSI/Fibonacci)
- ❌ `console.log` debugging statements
- ❌ Unused imports or dead code
- ❌ `localhost` in any URL or config

## φ-Compliance Scoring
- PHI = 1.618033988749895 (golden ratio)
- PSI = 1/PHI ≈ 0.618 (inverse ratio)
- Timeouts: PHIⁿ × 1000ms only
- Pool sizes: Fibonacci numbers only
- CSL gates: PSI² (0.382), PSI (0.618), PSI+0.1 (0.718) only


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
