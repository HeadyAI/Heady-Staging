/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  TRADE SECRET — HEADYSYSTEMS INC.                                   ║
 * ║  Protected under the Defend Trade Secrets Act (18 U.S.C. § 1836)    ║
 * ║  and the Uniform Trade Secrets Act (UTSA)                           ║
 * ║                                                                     ║
 * ║  This file contains trade secrets of HeadySystems Inc.              ║
 * ║  Unauthorized copying, viewing, modification, distribution, or      ║
 * ║  reverse engineering is strictly prohibited and may result in        ║
 * ║  civil liability and criminal penalties.                            ║
 * ║                                                                     ║
 * ║  Access is restricted to authorized HeadySystems personnel ONLY.    ║
 * ║  This file MUST NOT be included in patent disclosures, public       ║
 * ║  documentation, open-source releases, or external repositories.     ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * Trade Secret Vault — Centralized Registry of Protected IP
 * ═══════════════════════════════════════════════════════════════════
 *
 * This module centralizes ALL trade secret material that was previously
 * scattered across the codebase. Other modules MUST load from this vault
 * at runtime — never hardcoded inline.
 *
 * Categories:
 *   TS-001: Detection Patterns (PHI, injection, anomaly regex)
 *   TS-002: Scoring Algorithms (composite scores, fusion weights)
 *   TS-003: Model Routing Logic (provider selection, preference ranking)
 *   TS-004: Trading/Financial Algorithms (risk scoring, signal generation)
 *   TS-005: Calibration Constants (internal tuning, sensitivity thresholds)
 *   TS-006: Competitive Intelligence Formulas (market scoring, moat analysis)
 *
 * @module trade-secret-vault
 * @access RESTRICTED — HeadySystems Inc. personnel only
 */

'use strict';

const crypto = require('crypto');

// ─── Access Control ─────────────────────────────────────────────────────────
// Only authorized modules can access vault contents.

const AUTHORIZED_MODULES = new Set([
    'phi-governance-engine',
    'prompt-guard',
    'anomaly-detector-bee',
    'ip-anomaly-detector',
    'vector-native-scanner',
    'auth-hardening',
    'heady-governance',
    'inference-gateway',
    'vibe-match-router',
    'semantic-router',
    'llm-router',
    'competitive-intelligence-engine',
    'monte-carlo-service',
    'HeadyBattle-service',
    'HeadySims-service',
    'trading-bee',
    'csl-judge-scorer',
    'dynamic-weight-manager',
    'heady-risks',
    'session-binder',
    'self-healing-lifecycle',
    'heady-eval',
]);

const _accessLog = [];

function _logAccess(category, caller) {
    _accessLog.push({
        category,
        caller,
        timestamp: Date.now(),
        hash: crypto.createHash('sha256').update(`${category}:${caller}:${Date.now()}`).digest('hex').slice(0, 12),
    });
    // Keep bounded
    if (_accessLog.length > 500) _accessLog.splice(0, 100);
}

function _checkAuth(caller) {
    if (!caller) return false;
    const basename = caller.replace(/.*[/\\]/, '').replace(/\.js$/, '');
    return AUTHORIZED_MODULES.has(basename);
}

// ═══════════════════════════════════════════════════════════════════════════
// TS-001: DETECTION PATTERNS
// Protected PHI, injection, and anomaly detection regular expressions.
// These patterns are the result of proprietary research and tuning.
// ═══════════════════════════════════════════════════════════════════════════

const TS001_PHI_PATTERNS = Object.freeze([
    /\bMRN[:\s#]*\d{6,10}\b/i,
    /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
    /\b[A-Z]\d{2}(\.\d{1,4})?\b/,
    /\b(HICN|HCPCS|CPT)[:\s#]*[A-Z0-9]{5,14}\b/i,
    /\bNPI[:\s#]*\d{10}\b/i,
    /\b(DOB|Date\s*of\s*Birth)[:\s]*\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b/i,
    /\b(Patient|Pt)[:\s]*(Name|ID)[:\s]*[A-Z][a-z]+\s+[A-Z][a-z]+/i,
    /\b(Rx|DEA)[:\s#]*[A-Z0-9]{7,14}\b/i,
    /\bBlood\s*Type[:\s]*(A|B|AB|O)[+-]\b/i,
    /\b(HbA1c|CBC|BMP|CMP|TSH|PSA)[:\s]*[\d.]+\b/i,
    /\bDiagnos[ie]s[:\s]*(ICD|DSM)/i,
    /\b(Medicare|Medicaid)\s*(ID|#|Number)[:\s]*[A-Z0-9]+/i,
]);

const TS001_INJECTION_PATTERNS = Object.freeze([
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /system\s*prompt/i,
    /jailbreak/i,
    /reveal\s+(your|the)\s+(instructions|prompt|system)/i,
    /bypass\s+(safety|filter|guard|content)/i,
    /pretend\s+(you|to)\s+(are|be)\s+/i,
    /DAN\s+(mode|jailbreak)/i,
    /\[INST\]|\[\/INST\]|<<SYS>>|<\|system\|>/i,
    /<script[\s>]|javascript:|data:text\/html/i,
    /\{\{.*\}\}/,
    /\$\{.*\}/,
    /act\s+as\s+(if|though)\s+you\s+(have|had)\s+no\s+restrict/i,
    /do\s+not\s+follow\s+(any|your)\s+(rules|guidelines|instructions)/i,
    /override\s+(all|your)\s+(safety|content|ethical)/i,
]);

const TS001_IP_FINGERPRINT_SALT = 'heady-anomaly-salt-v4-2026';

// ═══════════════════════════════════════════════════════════════════════════
// TS-002: SCORING ALGORITHMS
// Proprietary composite scoring, fusion weights, and ranking formulas.
// ═══════════════════════════════════════════════════════════════════════════

const PHI = 1.6180339887498949;

const TS002_SCORING = Object.freeze({
    // Anomaly composite scoring
    ANOMALY_IQR_AMPLIFIER: PHI,            // z-score × φ when IQR agrees
    ANOMALY_MULTI_WINDOW_BLEND: [0.2, 0.5, 0.3], // short/medium/long window blend

    // Battle arena scoring
    BATTLE_WEIGHTS: {
        accuracy: 0.35,
        latency: 0.20,
        creativity: 0.15,
        coherence: 0.20,
        safety: 0.10,
    },

    // Model quality ranking formula
    MODEL_RANK_FORMULA: {
        qualityWeight: 0.4,
        costWeight: 0.25,
        latencyWeight: 0.2,
        reliabilityWeight: 0.15,
    },

    // CSL coherence scoring thresholds
    CSL_COHERENCE: {
        EXCELLENT: 0.95,
        GOOD: 0.85,
        ACCEPTABLE: 0.70,
        DEGRADED: 0.55,
        CRITICAL: 0.40,
    },

    // Vibe match scoring weights
    VIBE_MATCH: {
        semanticSimilarity: 0.45,
        contextRelevance: 0.30,
        userPreference: 0.15,
        historicalSuccess: 0.10,
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// TS-003: MODEL ROUTING LOGIC
// Provider selection preferences, fallback chains, and routing priorities.
// ═══════════════════════════════════════════════════════════════════════════

const TS003_ROUTING = Object.freeze({
    // Provider preference tiers (ordered)
    PROVIDER_PREFERENCE: ['anthropic', 'openai', 'google', 'groq', 'together'],

    // Task-to-model routing
    TASK_MODEL_MAP: {
        code: { primary: 'claude-sonnet-4-20250514', fallback: 'gpt-4o' },
        creative: { primary: 'claude-sonnet-4-20250514', fallback: 'gpt-4o' },
        analysis: { primary: 'claude-sonnet-4-20250514', fallback: 'gemini-2.0-flash' },
        fast: { primary: 'gemini-2.0-flash', fallback: 'gpt-4o-mini' },
        embedding: { primary: 'text-embedding-3-large', fallback: 'text-embedding-3-small' },
        battle: { primary: 'ALL', fallback: 'claude-sonnet-4-20250514' },
    },

    // Cost-per-1K-token thresholds (USD) for budget routing
    COST_GATES: {
        premium: 0.015,
        standard: 0.005,
        budget: 0.001,
        free: 0,
    },

    // Latency SLA targets (ms)
    LATENCY_TARGETS: {
        interactive: 800,
        standard: 3000,
        batch: 15000,
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// TS-004: TRADING/FINANCIAL ALGORITHMS
// Monte Carlo parameters, risk scoring, signal generation thresholds.
// ═══════════════════════════════════════════════════════════════════════════

const TS004_TRADING = Object.freeze({
    // Monte Carlo simulation parameters
    MC_DEFAULTS: {
        iterations: 10000,
        confidenceInterval: 0.95,
        riskFreeRate: 0.045,
        maxDrawdown: 0.15,
    },

    // Risk scoring thresholds
    RISK_LEVELS: {
        MINIMAL: { min: 0, max: 0.1 },
        LOW: { min: 0.1, max: 0.25 },
        MODERATE: { min: 0.25, max: 0.45 },
        HIGH: { min: 0.45, max: 0.7 },
        EXTREME: { min: 0.7, max: 1.0 },
    },

    // Signal generation thresholds
    SIGNAL_THRESHOLDS: {
        strongBuy: 0.85,
        buy: 0.65,
        hold: 0.45,
        sell: 0.30,
        strongSell: 0.15,
    },

    // Kelly criterion fractional sizing
    KELLY_FRACTION: 0.25, // Quarter-Kelly for safety
});

// ═══════════════════════════════════════════════════════════════════════════
// TS-005: CALIBRATION CONSTANTS
// Internal tuning parameters not derived from phi-math.
// ═══════════════════════════════════════════════════════════════════════════

const TS005_CALIBRATION = Object.freeze({
    // Hallucination detection sensitivity
    HALLUCINATION_SENSITIVITY: 0.72,
    HALLUCINATION_CITATION_THRESHOLD: 0.65,

    // Semantic backpressure tuning
    BACKPRESSURE_RAMP_RATE: 0.15,
    BACKPRESSURE_RELIEF_RATE: 0.08,
    BACKPRESSURE_CRITICAL_LOAD: 0.92,

    // Self-healing lifecycle
    HEALING_RECOVERY_THRESHOLD: 0.80,
    HEALING_QUARANTINE_DURATION_MS: 45000,
    HEALING_MAX_RETRY_DEPTH: 3,

    // Context window optimization
    CONTEXT_TRIM_RATIO: 0.85,
    CONTEXT_PRIORITY_DECAY: 0.93,
    CONTEXT_RECENCY_WEIGHT: 0.7,

    // Embedding similarity floor
    EMBEDDING_RELEVANCE_FLOOR: 0.72,
    EMBEDDING_BATCH_OPTIMAL: 96,
});

// ═══════════════════════════════════════════════════════════════════════════
// TS-006: COMPETITIVE INTELLIGENCE
// Market scoring, moat analysis, and valuation formulas.
// ═══════════════════════════════════════════════════════════════════════════

const TS006_COMPETITIVE = Object.freeze({
    // Moat strength scoring
    MOAT_WEIGHTS: {
        patentCount: 0.25,
        codebaseSize: 0.15,
        uniqueAlgorithms: 0.30,
        marketReadiness: 0.20,
        teamVelocity: 0.10,
    },

    // Valuation multiplier ranges (ARR-based)
    VALUATION_MULTIPLIERS: {
        preRevenue: { min: 25, max: 40 },
        earlyRevenue: { min: 30, max: 55 },
        growth: { min: 40, max: 80 },
        scale: { min: 25, max: 45 },
    },

    // Competitive threat scoring
    THREAT_WEIGHTS: {
        marketOverlap: 0.35,
        resourceAdvantage: 0.25,
        technicalParity: 0.25,
        brandStrength: 0.15,
    },
});

// ─── Vault Access API ───────────────────────────────────────────────────────

/**
 * Get trade secret material by category. Enforces access control and logging.
 *
 * @param {string} category - 'TS-001' through 'TS-006'
 * @param {string} caller - Module filename requesting access
 * @returns {Object|null} The trade secret data, or null if unauthorized
 */
function getSecret(category, caller) {
    if (!_checkAuth(caller)) {
        console.error(`[TRADE-SECRET-VAULT] ⛔ UNAUTHORIZED ACCESS ATTEMPT: ${caller} → ${category}`);
        _logAccess(`UNAUTHORIZED:${category}`, caller);
        return null;
    }

    _logAccess(category, caller);

    switch (category) {
        case 'TS-001': return {
            phiPatterns: TS001_PHI_PATTERNS,
            injectionPatterns: TS001_INJECTION_PATTERNS,
            ipSalt: TS001_IP_FINGERPRINT_SALT,
        };
        case 'TS-002': return TS002_SCORING;
        case 'TS-003': return TS003_ROUTING;
        case 'TS-004': return TS004_TRADING;
        case 'TS-005': return TS005_CALIBRATION;
        case 'TS-006': return TS006_COMPETITIVE;
        default:
            console.warn(`[TRADE-SECRET-VAULT] Unknown category: ${category}`);
            return null;
    }
}

/**
 * Get access audit log.
 * @returns {Object[]} Recent access entries
 */
function getAccessLog() {
    return [..._accessLog];
}

/**
 * Validate that a file does not contain inline trade secrets.
 * Used by CI/pre-commit hooks to prevent accidental exposure.
 *
 * @param {string} content - File content to scan
 * @returns {{ violations: string[], clean: boolean }}
 */
function auditForLeaks(content) {
    const violations = [];

    // Check for hardcoded detection patterns
    if (/INJECTION_PATTERNS\s*=\s*\[/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded injection patterns detected — must load from vault');
    }
    if (/PHI_DATA_PATTERNS\s*=\s*\[/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded PHI patterns detected — must load from vault');
    }

    // Check for hardcoded scoring weights
    if (/BATTLE_WEIGHTS\s*[:=]\s*\{/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded battle scoring weights — must load from vault');
    }
    if (/MODEL_RANK_FORMULA\s*[:=]\s*\{/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded model ranking formula — must load from vault');
    }

    // Check for hardcoded routing preferences
    if (/PROVIDER_PREFERENCE\s*[:=]\s*\[/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded provider preferences — must load from vault');
    }

    // Check for hardcoded trading thresholds
    if (/KELLY_FRACTION\s*[:=]/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded Kelly fraction — must load from vault');
    }
    if (/SIGNAL_THRESHOLDS\s*[:=]\s*\{/.test(content) && !/trade-secret-vault/.test(content)) {
        violations.push('Hardcoded signal thresholds — must load from vault');
    }

    return { violations, clean: violations.length === 0 };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
    getSecret,
    getAccessLog,
    auditForLeaks,
    AUTHORIZED_MODULES: [...AUTHORIZED_MODULES],
    CATEGORIES: Object.freeze({
        DETECTION_PATTERNS: 'TS-001',
        SCORING_ALGORITHMS: 'TS-002',
        MODEL_ROUTING: 'TS-003',
        TRADING_ALGORITHMS: 'TS-004',
        CALIBRATION: 'TS-005',
        COMPETITIVE_INTEL: 'TS-006',
    }),
};
