/**
 * © 2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * HeadyGuard — Enterprise governance-as-a-service (Layer 4 PRODUCT).
 *
 * Exports:
 *   - GovernanceEngine  — Multi-policy validation and audit layer
 *   - HallucinationWatchdog — LLM output factual verification
 *   - KillSwitch        — Emergency shutdown protocol (arm → check → execute)
 *   - AuditTrail        — Immutable SHA-256 hash-chained audit log
 *   - ComplianceReport  — SOC 2 compliance report generator
 */

'use strict';

// ─── Core governance engine (from monorepo source) ───────────────────────────
const { GovernanceEngine } = (() => {
  try {
    return require('../../src/governance/governance-engine');
  } catch {
    // Fallback: resolve relative to monorepo root
    try {
      return require('../../../src/governance/governance-engine');
    } catch {
      return { GovernanceEngine: null };
    }
  }
})();

// ─── Hallucination watchdog (from monorepo source) ───────────────────────────
const { HeadyHallucinationWatchdog } = (() => {
  try {
    return require('../../src/observability/heady-hallucination-watchdog');
  } catch {
    // Fallback: resolve relative to monorepo root
    try {
      return require('../../../src/observability/heady-hallucination-watchdog');
    } catch {
      return { HeadyHallucinationWatchdog: null };
    }
  }
})();

// ─── Package-local modules ───────────────────────────────────────────────────
const { KillSwitch, KillSwitchState, DEFAULT_THRESHOLDS } = require('./kill-switch');
const { AuditTrail, AuditEntryType, GENESIS_HASH } = require('./audit-trail');
const { ComplianceReport, TrustCriteria, RiskLevel, CRITERIA_MAP } = require('./compliance-report');

// ─── Convenience: HallucinationWatchdog alias ────────────────────────────────
const HallucinationWatchdog = HeadyHallucinationWatchdog;

module.exports = {
  // Classes
  GovernanceEngine,
  HallucinationWatchdog,
  HeadyHallucinationWatchdog,
  KillSwitch,
  AuditTrail,
  ComplianceReport,

  // Constants & Enums
  KillSwitchState,
  DEFAULT_THRESHOLDS,
  AuditEntryType,
  GENESIS_HASH,
  TrustCriteria,
  RiskLevel,
  CRITERIA_MAP,
};
