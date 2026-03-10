'use strict';

/**
 * Feature flags with φ-scaled rollout percentages and CSL confidence gates.
 *
 * Rollout stages: 0% → 6.18% → 38.2% → 61.8% → 100%
 * Each stage corresponds to φ-math values:
 *   6.18%  = PSI × 10%
 *   38.2%  = PSI²  × 100%
 *   61.8%  = PSI   × 100%
 *   100%   = full rollout
 */

// φ-math constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;  // ≈0.618033988749895
const PSI2 = PSI * PSI; // ≈0.381966011250105

// Rollout stages as percentages
const ROLLOUT_STAGES = {
  OFF:     0,
  CANARY:  PSI * 10,    // 6.18%
  BETA:    PSI2 * 100,  // 38.2%
  GENERAL: PSI * 100,   // 61.8%
  FULL:    100,
};

// CSL confidence gates — feature requires minimum confidence to activate
// Formula: 1 - 0.5 * PSI^level (matches phi-math-foundation thresholds)
const CSL_CONFIDENCE_GATES = {
  CRITICAL: 1 - 0.5 * Math.pow(PSI, 4),  // ≈0.927
  HIGH:     1 - 0.5 * Math.pow(PSI, 3),   // ≈0.882
  MEDIUM:   1 - 0.5 * Math.pow(PSI, 2),   // ≈0.809
  LOW:      1 - 0.5 * Math.pow(PSI, 1),   // ≈0.691
  NONE:     0,
};

/**
 * Feature flag definitions.
 * Each flag has:
 *   - rollout: current rollout percentage (0–100)
 *   - cslGate: minimum CSL confidence required (0–1), or 0 for no gate
 *   - description: human-readable description
 *   - enabledEnvironments: which envs this flag applies in
 */
const FLAGS = {
  // --- AI & Agent features ---
  'agent-autonomous-mode': {
    rollout: ROLLOUT_STAGES.CANARY,  // 6.18%
    cslGate: CSL_CONFIDENCE_GATES.CRITICAL,
    description: 'Allow agents to operate autonomously with guardrails',
    enabledEnvironments: ['production', 'staging'],
  },
  'agent-memory-persistence': {
    rollout: ROLLOUT_STAGES.BETA,    // 38.2%
    cslGate: CSL_CONFIDENCE_GATES.HIGH,
    description: 'Persist agent memory across sessions',
    enabledEnvironments: ['production', 'staging', 'development'],
  },
  'vector-search-v2': {
    rollout: ROLLOUT_STAGES.GENERAL, // 61.8%
    cslGate: CSL_CONFIDENCE_GATES.LOW,
    description: 'Use v2 vector search with improved ranking',
    enabledEnvironments: ['production', 'staging', 'development'],
  },

  // --- Platform features ---
  'realtime-notifications-sse': {
    rollout: ROLLOUT_STAGES.FULL,    // 100%
    cslGate: CSL_CONFIDENCE_GATES.NONE,
    description: 'SSE-based real-time notifications (fallback from WebSocket)',
    enabledEnvironments: ['production', 'staging', 'development'],
  },
  'enhanced-analytics': {
    rollout: ROLLOUT_STAGES.BETA,    // 38.2%
    cslGate: CSL_CONFIDENCE_GATES.NONE,
    description: 'Enhanced privacy-first analytics with cohort analysis',
    enabledEnvironments: ['production', 'staging'],
  },
  'phi-scaled-rate-limits': {
    rollout: ROLLOUT_STAGES.FULL,    // 100%
    cslGate: CSL_CONFIDENCE_GATES.NONE,
    description: 'Use φ-scaled rate limits (34/89/233 per tier)',
    enabledEnvironments: ['production', 'staging', 'development'],
  },

  // --- Billing features ---
  'enterprise-custom-billing': {
    rollout: ROLLOUT_STAGES.CANARY,  // 6.18%
    cslGate: CSL_CONFIDENCE_GATES.HIGH,
    description: 'Custom billing plans for enterprise customers',
    enabledEnvironments: ['production', 'staging'],
  },
  'usage-based-metering': {
    rollout: ROLLOUT_STAGES.GENERAL, // 61.8%
    cslGate: CSL_CONFIDENCE_GATES.MEDIUM,
    description: 'Usage-based metering for API calls',
    enabledEnvironments: ['production', 'staging', 'development'],
  },

  // --- Infrastructure features ---
  'canary-deployments': {
    rollout: ROLLOUT_STAGES.FULL,    // 100%
    cslGate: CSL_CONFIDENCE_GATES.NONE,
    description: 'φ-scaled canary deployment (6.18% → 38.2% → 61.8% → 100%)',
    enabledEnvironments: ['production', 'staging'],
  },
  'circuit-breaker-v2': {
    rollout: ROLLOUT_STAGES.BETA,    // 38.2%
    cslGate: CSL_CONFIDENCE_GATES.LOW,
    description: 'V2 circuit breaker with phi-backoff recovery',
    enabledEnvironments: ['production', 'staging', 'development'],
  },
};

/**
 * Deterministic hash of a string to a value 0–99.
 * Used for consistent rollout bucketing.
 *
 * @param {string} identifier — user ID, session ID, etc.
 * @returns {number} 0–99
 */
function hashToBucket(identifier) {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a feature flag is enabled for a given context.
 *
 * @param {string} flagName — feature flag name
 * @param {object} [context]
 * @param {string} [context.userId] — for rollout bucketing
 * @param {number} [context.confidence] — CSL confidence score 0–1
 * @param {string} [context.environment] — override environment detection
 * @returns {{ enabled: boolean, reason?: string }}
 */
function isEnabled(flagName, context = {}) {
  const flag = FLAGS[flagName];
  if (!flag) {
    return { enabled: false, reason: `Unknown flag: ${flagName}` };
  }

  // Check environment
  const env = context.environment || process.env.NODE_ENV || 'development';
  if (!flag.enabledEnvironments.includes(env)) {
    return { enabled: false, reason: `Flag not enabled in ${env}` };
  }

  // Check rollout percentage
  if (flag.rollout <= 0) {
    return { enabled: false, reason: 'Rollout at 0%' };
  }

  if (flag.rollout < 100) {
    const identifier = context.userId || 'anonymous';
    const bucket = hashToBucket(`${flagName}:${identifier}`);
    if (bucket >= flag.rollout) {
      return { enabled: false, reason: `Outside rollout bucket (${bucket} >= ${flag.rollout.toFixed(2)}%)` };
    }
  }

  // Check CSL confidence gate
  if (flag.cslGate > 0) {
    const confidence = context.confidence;
    if (typeof confidence !== 'number' || confidence < flag.cslGate) {
      return {
        enabled: false,
        reason: `CSL confidence ${confidence || 'unset'} below gate ${flag.cslGate.toFixed(4)}`,
      };
    }
  }

  return { enabled: true };
}

/**
 * Get all flags and their current rollout status.
 */
function getAllFlags() {
  return Object.entries(FLAGS).map(([name, config]) => ({
    name,
    rollout: config.rollout,
    rolloutStage: Object.entries(ROLLOUT_STAGES).find(
      ([, val]) => Math.abs(val - config.rollout) < 0.01
    )?.[0] || 'CUSTOM',
    cslGate: config.cslGate,
    description: config.description,
    enabledEnvironments: config.enabledEnvironments,
  }));
}

/**
 * Get the next rollout stage for a flag.
 *
 * @param {string} flagName
 * @returns {{ currentStage: string, nextStage: string, nextRollout: number } | null}
 */
function getNextRolloutStage(flagName) {
  const flag = FLAGS[flagName];
  if (!flag) return null;

  const stageOrder = ['OFF', 'CANARY', 'BETA', 'GENERAL', 'FULL'];
  const currentIdx = stageOrder.findIndex(
    (s) => Math.abs(ROLLOUT_STAGES[s] - flag.rollout) < 0.01
  );

  if (currentIdx === -1 || currentIdx >= stageOrder.length - 1) {
    return null;
  }

  const nextStage = stageOrder[currentIdx + 1];
  return {
    currentStage: stageOrder[currentIdx],
    nextStage,
    nextRollout: ROLLOUT_STAGES[nextStage],
  };
}

module.exports = {
  ROLLOUT_STAGES,
  CSL_CONFIDENCE_GATES,
  FLAGS,
  hashToBucket,
  isEnabled,
  getAllFlags,
  getNextRolloutStage,
};
