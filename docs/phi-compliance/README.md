# Heady™ Phi Compliance Guide

> Rules, patterns, and scoring for φ-math compliance

## The Zero Magic Numbers Rule

**Every constant must derive from φ (1.618...) or Fibonacci sequences.**

No arbitrary numbers like 0.5, 0.7, 0.85, 100, 500, 1000, 30000.

### Common Replacements

| Magic Number | φ-Derived Replacement | Source |
|-------------|----------------------|--------|
| 0.5 | 0.500 | phiThreshold(0) |
| 0.7 | 0.691 | phiThreshold(1) |
| 0.8 | 0.809 | phiThreshold(2) |
| 0.85 | 0.882 | phiThreshold(3) |
| 0.9 | 0.927 | phiThreshold(4) |
| 5 | 5 | fib(5) |
| 8 | 8 | fib(6) |
| 10 | 13 | fib(7) |
| 15 | 13 | fib(7) |
| 20 | 21 | fib(8) |
| 30 | 34 | fib(9) |
| 50 | 55 | fib(10) |
| 100 | 89 | fib(11) |
| 150 | 144 | fib(12) |
| 250 | 233 | fib(13) |
| 500 | 377 | fib(14) |
| 1000 | 987 | fib(16) |
| 30000 | 29034 | φ⁷ × 1000 |

### Timing Constants (PHI_TIMING)

| Name | Formula | Value | Replaces |
|------|---------|-------|----------|
| PHI_3 | φ³ × 1000 | 4 236ms | 5 000ms |
| PHI_5 | φ⁵ × 1000 | 11 090ms | 10 000ms |
| PHI_6 | φ⁶ × 1000 | 17 944ms | 15 000ms |
| PHI_7 | φ⁷ × 1000 | 29 034ms | 30 000ms |
| PHI_8 | φ⁸ × 1000 | 46 979ms | 45 000ms |

### CSL Thresholds

| Level | Formula | Value | Use |
|-------|---------|-------|-----|
| MINIMUM | phiThreshold(0) | 0.500 | Noise floor |
| LOW | phiThreshold(1) | 0.691 | Weak alignment |
| MEDIUM | phiThreshold(2) | 0.809 | Standard gate |
| HIGH | phiThreshold(3) | 0.882 | Strong alignment |
| CRITICAL | phiThreshold(4) | 0.927 | Near-certain |

## How to Import

```javascript
const {
  PHI, PSI, fib, phiMs,
  CSL_THRESHOLDS, PHI_TIMING,
  cslGate, sigmoid, phiBackoff,
} = require('../../shared/phi-math');
```

**Never define φ-constants inline.** Always import from `shared/phi-math.js`.

## Compliance Scoring

Run the compliance checker:
```bash
node scripts/phi-compliance-check.js
```

Scoring criteria:
- ✅ All imports from shared/phi-math.js
- ✅ No raw numbers that should be φ-derived
- ✅ No console.log (use structured logger)
- ✅ No localStorage for tokens
- ✅ No wildcard CORS
- ✅ Named catch parameters
- ✅ No TODO/FIXME/HACK
- ✅ CSL gates where applicable

Target: **100/100**
