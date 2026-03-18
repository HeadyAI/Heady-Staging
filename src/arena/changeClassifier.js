/**
 * changeClassifier.js — Arena Mode Human-in-the-Loop Gate
 * © 2026 HeadySystems Inc. All Rights Reserved.
 *
 * Implements φ-scaled three-tier risk classification for Arena Mode promotions.
 * No solution may be promoted to production without passing this gate.
 *
 * Risk tiers (CSL-aligned thresholds):
 *   TRIVIAL   — confidence ≤ ψ²  (0.382): auto-promote, zero human intervention
 *   SIGNIFICANT — ψ² < confidence ≤ ψ (0.618): async Slack approval, 4h timeout
 *   CRITICAL  — confidence = 1.0 OR matches critical patterns: synchronous block
 *
 * Critical patterns (regex, checked BEFORE any LLM call — zero latency):
 *   auth*, billing*, payment*, schema migration*, DROP TABLE*, private key*
 *
 * HeadySoul veto runs on ALL risk levels — governance covenant is inviolable.
 *
 * Drop-in integration:
 *   import { arenaGate } from './src/arena/changeClassifier.js';
 *   const { promoted, reason, risk } = await arenaGate(winner, { notifyFn, vetoFn });
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;         // φ⁻¹
const PSI_SQ = 0.381966011250105;      // φ⁻²

// Risk tier constants
export const RiskTier = Object.freeze({
  TRIVIAL:     'TRIVIAL',
  SIGNIFICANT: 'SIGNIFICANT',
  CRITICAL:    'CRITICAL',
});

// φ-scaled confidence thresholds
export const THRESHOLDS = Object.freeze({
  TRIVIAL_MAX:     PSI_SQ,   // 0.382  — below this: auto-promote
  SIGNIFICANT_MAX: PSI,      // 0.618  — above this: CRITICAL
  CRITICAL:        1.0,
});

// Default async approval timeout: 4 hours (φ-scaled from 1h base)
const DEFAULT_TIMEOUT_MS = Math.round(3600000 * PHI * PHI); // ~9435s ≈ 4h φ²

// Critical pattern regexes — checked on raw diff BEFORE any LLM call
const CRITICAL_PATTERNS = [
  /\bauth[A-Z_]/i,
  /\bpassword\b/i,
  /\bprivate[-_]?key\b/i,
  /\bsecret\b/i,
  /\bbilling\b/i,
  /\bpayment\b/i,
  /\bstripe\b/i,
  /\bschema[-_]?migrat/i,
  /\bDROP\s+TABLE\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
  /jwt[-_]?secret/i,
  /admin[-_]?role/i,
  /superuser/i,
  /root[-_]?access/i,
];

/**
 * Classify a diff/change by risk tier.
 * @param {string} diff  — raw diff text or code string
 * @param {number} [confidence=0] — CSL confidence score 0→1 from Arena evaluation
 * @returns {{ tier: RiskTier, reason: string, patternMatches: string[] }}
 */
export function classifyChange(diff, confidence = 0) {
  // 1. Critical pattern scan (deterministic, zero LLM cost)
  const patternMatches = CRITICAL_PATTERNS
    .filter(re => re.test(diff))
    .map(re => re.toString());

  if (patternMatches.length > 0) {
    return {
      tier:           RiskTier.CRITICAL,
      reason:         `Critical pattern matched: ${patternMatches.join(', ')}`,
      patternMatches,
      confidence,
    };
  }

  // 2. Confidence-based tier assignment
  if (confidence >= THRESHOLDS.CRITICAL) {
    return {
      tier:           RiskTier.CRITICAL,
      reason:         `Confidence score ${confidence.toFixed(4)} = 1.0 — maximum certainty triggers mandatory review`,
      patternMatches: [],
      confidence,
    };
  }

  if (confidence > THRESHOLDS.TRIVIAL_MAX) {
    return {
      tier:           RiskTier.SIGNIFICANT,
      reason:         `Confidence ${confidence.toFixed(4)} in (${THRESHOLDS.TRIVIAL_MAX}, ${THRESHOLDS.SIGNIFICANT_MAX}] — async approval required`,
      patternMatches: [],
      confidence,
    };
  }

  return {
    tier:           RiskTier.TRIVIAL,
    reason:         `Confidence ${confidence.toFixed(4)} ≤ ψ² (${THRESHOLDS.TRIVIAL_MAX}) — auto-promote approved`,
    patternMatches: [],
    confidence,
  };
}

/**
 * Main arena gate — the single entry point for all Arena Mode promotions.
 *
 * @param {Object} winner          — Arena winning solution { code, diff, meta }
 * @param {Object} opts
 * @param {Function} [opts.notifyFn]   — async (tier, winner, classification) => void — Slack/webhook notifier
 * @param {Function} [opts.vetoFn]     — async (tier, winner) => { vetoed: bool, reason: string }
 * @param {number}  [opts.timeoutMs]   — approval timeout for SIGNIFICANT tier (default 4h)
 * @param {Function} [opts.approvalFn] — async (winner, timeoutMs) => bool — polls for human approval
 * @param {number}  [opts.confidence]  — CSL confidence score (0→1); if omitted, inferred from winner.cslScore
 *
 * @returns {Promise<{ promoted: boolean, risk: RiskTier, reason: string, vetoReason?: string }>}
 */
export async function arenaGate(winner, opts = {}) {
  const {
    notifyFn   = null,
    vetoFn     = null,
    timeoutMs  = DEFAULT_TIMEOUT_MS,
    approvalFn = null,
    confidence = winner?.cslScore ?? 0,
  } = opts;

  const diff = winner?.diff || winner?.code || JSON.stringify(winner);
  const classification = classifyChange(diff, confidence);
  const { tier, reason } = classification;

  // ── HeadySoul veto — runs on ALL tiers ──────────────────────────────────
  if (typeof vetoFn === 'function') {
    let veto;
    try {
      veto = await vetoFn(tier, winner, classification);
    } catch (err) {
      // Veto function failure is itself a block — fail safe
      return {
        promoted:    false,
        risk:        tier,
        reason:      `HeadySoul veto function threw: ${err.message}`,
        vetoReason:  'veto_function_error',
        classification,
      };
    }
    if (veto?.vetoed) {
      return {
        promoted:   false,
        risk:       tier,
        reason:     `HeadySoul veto: ${veto.reason}`,
        vetoReason: veto.reason,
        classification,
      };
    }
  }

  // ── Tier routing ────────────────────────────────────────────────────────
  switch (tier) {

    case RiskTier.TRIVIAL: {
      // Auto-promote — notify asynchronously, don't wait
      if (typeof notifyFn === 'function') {
        notifyFn(tier, winner, classification).catch(() => {});
      }
      return { promoted: true, risk: tier, reason, classification };
    }

    case RiskTier.SIGNIFICANT: {
      // Notify and wait for async approval within timeout
      if (typeof notifyFn === 'function') {
        try {
          await notifyFn(tier, winner, classification);
        } catch (err) {
          // Notification failure for SIGNIFICANT blocks promotion (fail safe)
          return {
            promoted:  false,
            risk:      tier,
            reason:    `Notification failed — cannot request approval: ${err.message}`,
            classification,
          };
        }
      }

      if (typeof approvalFn === 'function') {
        let approved = false;
        try {
          approved = await Promise.race([
            approvalFn(winner, timeoutMs),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('approval_timeout')), timeoutMs)
            ),
          ]);
        } catch (err) {
          if (err.message === 'approval_timeout') {
            return {
              promoted:  false,
              risk:      tier,
              reason:    `Approval timeout after ${Math.round(timeoutMs / 60000)}min — promotion blocked`,
              classification,
            };
          }
          return { promoted: false, risk: tier, reason: err.message, classification };
        }
        return {
          promoted: approved,
          risk:     tier,
          reason:   approved ? 'Human approved SIGNIFICANT change' : 'Human rejected SIGNIFICANT change',
          classification,
        };
      }

      // No approvalFn provided — block by default (fail safe)
      return {
        promoted:  false,
        risk:      tier,
        reason:    'No approval function provided — SIGNIFICANT changes require explicit approvalFn',
        classification,
      };
    }

    case RiskTier.CRITICAL: {
      // Synchronous block — notify and return immediately without waiting
      if (typeof notifyFn === 'function') {
        notifyFn(tier, winner, classification).catch(() => {});
      }
      return {
        promoted:  false,
        risk:      tier,
        reason:    `CRITICAL: ${reason} — synchronous block, requires explicit human override`,
        classification,
      };
    }

    default:
      return { promoted: false, risk: RiskTier.CRITICAL, reason: 'Unknown tier — fail safe block', classification };
  }
}

/**
 * Batch classify multiple candidates — useful for pre-screening Arena submissions.
 * Returns sorted by risk (CRITICAL first, TRIVIAL last).
 */
export function batchClassify(candidates) {
  return candidates
    .map(c => ({ ...c, classification: classifyChange(c.diff || c.code || '', c.cslScore || 0) }))
    .sort((a, b) => {
      const order = { CRITICAL: 0, SIGNIFICANT: 1, TRIVIAL: 2 };
      return order[a.classification.tier] - order[b.classification.tier];
    });
}

/**
 * Build a structured audit log entry for every gate decision.
 * Per CLAUDE.md: every override becomes training data, not an exception.
 */
export function buildAuditEntry(winner, result, operator = 'system') {
  return {
    timestamp:    new Date().toISOString(),
    operator,
    winnerId:     winner?.id || 'unknown',
    risk:         result.risk,
    promoted:     result.promoted,
    reason:       result.reason,
    confidence:   result.classification?.confidence,
    patterns:     result.classification?.patternMatches || [],
    phi:          PHI,
    cslThresholds: THRESHOLDS,
  };
}
