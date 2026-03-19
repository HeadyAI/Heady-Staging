/**
 * © 2026-2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { PolicyEngine } = require('./policy-engine');

const PHI = 1.6180339887;

// ─── Governance decision constants ───────────────────────────────────────────
const GovernanceDecision = Object.freeze({
  ALLOW:    'ALLOW',
  DENY:     'DENY',
  ESCALATE: 'ESCALATE',
  PENDING:  'PENDING',
});

// ─── Policy type registry ─────────────────────────────────────────────────────
const PolicyType = Object.freeze({
  ACCESS_CONTROL:   'ACCESS_CONTROL',
  BUDGET_LIMIT:     'BUDGET_LIMIT',
  CONTENT_SAFETY:   'CONTENT_SAFETY',
  MISSION_ALIGNMENT: 'MISSION_ALIGNMENT',
  RATE_LIMIT:       'RATE_LIMIT',
  DATA_PRIVACY:     'DATA_PRIVACY',
});

/**
 * GovernanceEngine — The Heady™ AI Platform policy enforcement and audit layer.
 *
 * Responsibilities:
 *   1. Validate every action against a multi-type policy set
 *   2. Maintain a tamper-evident audit trail
 *   3. Provide quality gate (HeadyCheck) and deployment certification (HeadyAssure)
 *   4. Emit lifecycle events for monitoring
 *
 * @extends EventEmitter
 */
class GovernanceEngine extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {object} [options.policyEngine]     - PolicyEngine instance
   * @param {number} [options.auditMaxEntries]  - Max audit trail entries in memory
   * @param {object} [options.budgetLimits]     - Default budget caps { tokens, usd }
   * @param {object} [options.contentSafety]    - Content safety config
   */
  constructor(options = {}) {
    super();

    this._policyEngine  = options.policyEngine  || new PolicyEngine();
    this._auditMaxEntries = options.auditMaxEntries || 10_000;
    this._auditTrail    = [];
    this._auditArchive  = [];          // Archived entries when trail exceeds max
    this._lastAuditHash = '0'.repeat(64); // Genesis hash for SHA-256 chain

    // ─── Circuit Breaker Registry ────────────────────────────────────────────
    this._circuitBreakers = new Map(); // serviceName → CircuitBreakerState

    this._budgetLimits = options.budgetLimits || {
      tokens: 100_000,  // Per session
      usd:    10.00,    // Per session
      requestsPerMinute: 60,
    };

    this._contentSafety = options.contentSafety || {
      blockedPatterns: [
        /\b(ssn|social.security)\b/i,
        /\b(credit.?card|cvv|pan)\b/i,
        /\b(password|passwd|secret.?key)\b/i,
      ],
      escalatePatterns: [
        /\b(illegal|controlled.?substance|drug.?deal)\b/i,
      ],
    };

    // Running budget counters per session
    this._budgetState = new Map(); // sessionId → { tokens, usd, requests, windowStart }

    // HeadyCheck + HeadyAssure state
    this._qualityGates = new Map();  // gateId → QualityGateResult
    this._certifications = new Map(); // certId → CertificationResult

    logger.info('[GovernanceEngine] Initialized', {
      budgetLimits: this._budgetLimits,
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Validate an action against all active policies.
   * The primary governance entrypoint.
   *
   * @param {object} action
   * @param {string} action.id           - Action identifier
   * @param {string} action.type         - Action type (e.g. 'llm_call', 'data_access', 'deploy')
   * @param {*}      action.payload      - Action payload
   * @param {object} context
   * @param {string} [context.sessionId]
   * @param {string} [context.userId]
   * @param {string} [context.role]      - 'admin' | 'user' | 'system'
   * @param {object} [context.meta]
   * @returns {Promise<GovernanceResult>}
   */
  async validateAction(action, context = {}) {
    const startAt = Date.now();
    const governanceId = `gov-${action.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    logger.debug('[GovernanceEngine] Validating action', {
      governanceId, actionType: action.type,
    });

    const checks = [];
    let decision = GovernanceDecision.ALLOW;
    let denyReason = null;

    // ── Check 1: Access Control ─────────────────────────────────────────────
    const accessCheck = await this._checkAccessControl(action, context);
    checks.push({ type: PolicyType.ACCESS_CONTROL, ...accessCheck });
    if (accessCheck.decision === GovernanceDecision.DENY) {
      decision = GovernanceDecision.DENY;
      denyReason = denyReason || accessCheck.reason;
    }

    // ── Check 2: Budget Limits ──────────────────────────────────────────────
    const budgetCheck = this._checkBudgetLimits(action, context);
    checks.push({ type: PolicyType.BUDGET_LIMIT, ...budgetCheck });
    if (budgetCheck.decision === GovernanceDecision.DENY) {
      decision = GovernanceDecision.DENY;
      denyReason = denyReason || budgetCheck.reason;
    }

    // ── Check 3: Content Safety ─────────────────────────────────────────────
    const contentCheck = this._checkContentSafety(action);
    checks.push({ type: PolicyType.CONTENT_SAFETY, ...contentCheck });
    if (contentCheck.decision === GovernanceDecision.DENY) {
      decision = GovernanceDecision.DENY;
      denyReason = denyReason || contentCheck.reason;
    } else if (contentCheck.decision === GovernanceDecision.ESCALATE && decision === GovernanceDecision.ALLOW) {
      decision = GovernanceDecision.ESCALATE;
    }

    // ── Check 4: Mission Alignment ──────────────────────────────────────────
    const missionCheck = this._checkMissionAlignment(action, context);
    checks.push({ type: PolicyType.MISSION_ALIGNMENT, ...missionCheck });
    if (missionCheck.decision === GovernanceDecision.DENY) {
      decision = GovernanceDecision.DENY;
      denyReason = denyReason || missionCheck.reason;
    }

    // ── Check 5: Policy Engine (custom policies) ────────────────────────────
    const policyResult = await this._policyEngine.evaluate(action, context);
    checks.push({ type: 'POLICY_ENGINE', ...policyResult });
    if (policyResult.decision === GovernanceDecision.DENY) {
      decision = GovernanceDecision.DENY;
      denyReason = denyReason || policyResult.reason;
    } else if (policyResult.decision === GovernanceDecision.ESCALATE && decision === GovernanceDecision.ALLOW) {
      decision = GovernanceDecision.ESCALATE;
    }

    // ── Finalize ────────────────────────────────────────────────────────────
    const result = {
      governanceId,
      actionId: action.id,
      actionType: action.type,
      decision,
      reason: denyReason,
      checks,
      sessionId: context.sessionId || null,
      userId: context.userId || null,
      duration: Date.now() - startAt,
      evaluatedAt: Date.now(),
    };

    // Append to audit trail
    this._audit(result);

    // Emit events
    if (decision === GovernanceDecision.DENY) {
      this.emit('governance:denied', result);
      logger.warn('[GovernanceEngine] Action DENIED', {
        governanceId, actionType: action.type, reason: denyReason,
      });
    } else if (decision === GovernanceDecision.ESCALATE) {
      this.emit('governance:escalated', result);
      logger.warn('[GovernanceEngine] Action ESCALATED', {
        governanceId, actionType: action.type,
      });
    } else {
      this.emit('governance:allowed', result);
    }

    return result;
  }

  /**
   * HeadyCheck — Quality gate check before execution.
   * Returns a pass/fail quality assessment.
   *
   * @param {object} component   - The component to quality-check
   * @param {string} component.id
   * @param {string} component.type  - 'code' | 'model' | 'config' | 'data'
   * @param {*}      component.content
   * @returns {object} Quality gate result
   */
  async headyCheck(component) {
    const gateId = `qg-${component.id}-${Date.now()}`;
    const checks = [];
    let passed = true;

    // Check: content is non-empty
    const hasContent = component.content !== null && component.content !== undefined;
    checks.push({ name: 'non_empty', passed: hasContent });
    if (!hasContent) passed = false;

    // Check: no governance violations
    const govResult = await this.validateAction(
      { id: gateId, type: 'quality_check', payload: component },
      { role: 'system', meta: { phase: 'headyCheck' } }
    );
    checks.push({ name: 'governance_pass', passed: govResult.decision === GovernanceDecision.ALLOW });
    if (govResult.decision === GovernanceDecision.DENY) passed = false;

    const result = {
      gateId,
      componentId: component.id,
      type: component.type,
      passed,
      checks,
      score: passed ? 1.0 : (checks.filter((c) => c.passed).length / checks.length),
      checkedAt: Date.now(),
    };

    this._qualityGates.set(gateId, result);
    this.emit('heady-check', result);
    logger.info('[GovernanceEngine] HeadyCheck', {
      gateId, componentId: component.id, passed, score: result.score,
    });

    return result;
  }

  /**
   * HeadyAssure — Deployment certification gate.
   * Issues a certificate for deploying a component.
   *
   * @param {object} deployment
   * @param {string} deployment.id
   * @param {string} deployment.version
   * @param {object} [deployment.qualityGateId] - Prior HeadyCheck gate ID
   * @returns {object} Certification result
   */
  async headyAssure(deployment) {
    const certId = `cert-${deployment.id}-${Date.now()}`;
    const criteria = [];
    let certified = true;

    // Criterion 1: Prior quality gate must have passed
    if (deployment.qualityGateId) {
      const gate = this._qualityGates.get(deployment.qualityGateId);
      const gatePass = gate && gate.passed;
      criteria.push({ name: 'quality_gate', passed: gatePass });
      if (!gatePass) {
        certified = false;
      }
    } else {
      criteria.push({ name: 'quality_gate', passed: true, note: 'No gate ID provided; skipped' });
    }

    // Criterion 2: No recent DENY decisions for this deployment
    const recentDenials = this._auditTrail
      .slice(-50)
      .filter((e) => e.actionType === 'deploy' && e.decision === GovernanceDecision.DENY);
    criteria.push({ name: 'no_recent_denials', passed: recentDenials.length === 0 });
    if (recentDenials.length > 0) certified = false;

    // Criterion 3: Policy engine approves the deployment
    const policyResult = await this._policyEngine.evaluate(
      { id: certId, type: 'deploy', payload: deployment },
      { role: 'system' }
    );
    criteria.push({ name: 'policy_engine', passed: policyResult.decision !== GovernanceDecision.DENY });
    if (policyResult.decision === GovernanceDecision.DENY) certified = false;

    const certification = {
      certId,
      deploymentId: deployment.id,
      version: deployment.version,
      certified,
      criteria,
      score: certified ? 1.0 : (criteria.filter((c) => c.passed).length / criteria.length),
      issuedAt: Date.now(),
      expiresAt: Date.now() + (certified ? 24 * 60 * 60_000 : 0), // 24h if certified
    };

    this._certifications.set(certId, certification);
    this.emit('heady-assure', certification);
    logger.info('[GovernanceEngine] HeadyAssure', {
      certId, deploymentId: deployment.id, certified, score: certification.score,
    });

    return certification;
  }

  /**
   * Get the full audit trail (or last N entries).
   * @param {number} [limit]
   * @returns {object[]}
   */
  getAuditTrail(limit = null) {
    return limit ? this._auditTrail.slice(-limit) : [...this._auditTrail];
  }

  /**
   * Get budget state for a session.
   * @param {string} sessionId
   * @returns {object}
   */
  getBudgetState(sessionId) {
    return this._budgetState.get(sessionId) || {
      tokens: 0, usd: 0, requests: 0,
    };
  }

  // ─── Policy Checks ────────────────────────────────────────────────────────────

  async _checkAccessControl(action, context) {
    const role = context.role || 'user';

    // Admins bypass most access checks
    if (role === 'admin') return { decision: GovernanceDecision.ALLOW, reason: 'admin_bypass' };

    // Block unauthenticated access to sensitive actions
    const sensitiveActions = new Set(['deploy', 'data_export', 'user_delete', 'system_config']);
    if (sensitiveActions.has(action.type) && !context.userId) {
      return {
        decision: GovernanceDecision.DENY,
        reason: `Unauthenticated access to sensitive action: ${action.type}`,
      };
    }

    return { decision: GovernanceDecision.ALLOW };
  }

  _checkBudgetLimits(action, context) {
    const sessionId = context.sessionId;
    if (!sessionId) return { decision: GovernanceDecision.ALLOW, reason: 'no session' };

    let state = this._budgetState.get(sessionId);
    if (!state) {
      state = { tokens: 0, usd: 0, requests: 0, windowStart: Date.now() };
      this._budgetState.set(sessionId, state);
    }

    // Estimate cost from action
    const estimatedTokens = action.payload?.estimatedTokens || 0;
    const estimatedUsd    = action.payload?.estimatedUsd    || 0;

    if (state.tokens + estimatedTokens > this._budgetLimits.tokens) {
      return {
        decision: GovernanceDecision.DENY,
        reason: `Token budget exceeded: ${state.tokens + estimatedTokens} > ${this._budgetLimits.tokens}`,
        budgetState: { ...state },
      };
    }

    if (state.usd + estimatedUsd > this._budgetLimits.usd) {
      return {
        decision: GovernanceDecision.DENY,
        reason: `USD budget exceeded: $${(state.usd + estimatedUsd).toFixed(4)} > $${this._budgetLimits.usd}`,
        budgetState: { ...state },
      };
    }

    // Consume budget
    state.tokens   += estimatedTokens;
    state.usd      += estimatedUsd;
    state.requests += 1;

    return { decision: GovernanceDecision.ALLOW, budgetState: { ...state } };
  }

  _checkContentSafety(action) {
    const text = typeof action.payload === 'string'
      ? action.payload
      : JSON.stringify(action.payload || '');

    for (const pattern of this._contentSafety.blockedPatterns) {
      if (pattern.test(text)) {
        return {
          decision: GovernanceDecision.DENY,
          reason: `Content safety violation: matched blocked pattern ${pattern}`,
        };
      }
    }

    for (const pattern of this._contentSafety.escalatePatterns) {
      if (pattern.test(text)) {
        return {
          decision: GovernanceDecision.ESCALATE,
          reason: `Content safety escalation: matched escalate pattern ${pattern}`,
        };
      }
    }

    return { decision: GovernanceDecision.ALLOW };
  }

  _checkMissionAlignment(action, context) {
    // System-level actions are always aligned
    if (context.role === 'system') return { decision: GovernanceDecision.ALLOW };

    const text = JSON.stringify(action.payload || '').toLowerCase();

    const antiMission = [
      'exclude communities',
      'deny access',
      'profit over people',
      'ignore equity',
    ];

    for (const phrase of antiMission) {
      if (text.includes(phrase)) {
        return {
          decision: GovernanceDecision.DENY,
          reason: `Mission alignment violation: "${phrase}" detected in action`,
        };
      }
    }

    return { decision: GovernanceDecision.ALLOW };
  }

  // ─── Audit Trail ─────────────────────────────────────────────────────────────

  _audit(result) {
    const entry = {
      governanceId: result.governanceId,
      actionId:     result.actionId,
      actionType:   result.actionType,
      decision:     result.decision,
      reason:       result.reason,
      sessionId:    result.sessionId,
      userId:       result.userId,
      evaluatedAt:  result.evaluatedAt,
      duration:     result.duration,
    };

    // SHA-256 hash chain: each entry includes hash of previous entry for tamper evidence
    const payload = JSON.stringify(entry) + this._lastAuditHash;
    entry.prevHash = this._lastAuditHash;
    entry.hash = crypto.createHash('sha256').update(payload).digest('hex');
    this._lastAuditHash = entry.hash;

    this._auditTrail.push(entry);

    // Archive overflow entries instead of discarding them
    if (this._auditTrail.length > this._auditMaxEntries) {
      const overflow = this._auditTrail.splice(0, this._auditTrail.length - this._auditMaxEntries);
      this._auditArchive.push(...overflow);
      // Keep archive bounded at 5x max entries
      const archiveMax = this._auditMaxEntries * 5;
      if (this._auditArchive.length > archiveMax) {
        this._auditArchive.splice(0, this._auditArchive.length - archiveMax);
      }
    }
  }

  /**
   * Export the full audit trail with integrity verification.
   * Walks the hash chain and flags any tampered entries.
   *
   * @returns {{ entries: object[], archived: number, integrity: { valid: boolean, checked: number, broken: number, firstBrokenIndex: number|null } }}
   */
  exportAuditTrail() {
    let checked = 0;
    let broken = 0;
    let firstBrokenIndex = null;

    for (let i = 0; i < this._auditTrail.length; i++) {
      const entry = this._auditTrail[i];
      checked++;

      // Reconstruct expected hash from entry data + prevHash
      const { hash, prevHash, ...data } = entry;
      const expectedPayload = JSON.stringify(data) + prevHash;
      const expectedHash = crypto.createHash('sha256').update(expectedPayload).digest('hex');

      if (expectedHash !== hash) {
        broken++;
        if (firstBrokenIndex === null) firstBrokenIndex = i;
      }

      // Verify chain linkage (entry i's prevHash should equal entry i-1's hash)
      if (i > 0 && entry.prevHash !== this._auditTrail[i - 1].hash) {
        broken++;
        if (firstBrokenIndex === null) firstBrokenIndex = i;
      }
    }

    return {
      entries: [...this._auditTrail],
      archived: this._auditArchive.length,
      integrity: {
        valid: broken === 0,
        checked,
        broken,
        firstBrokenIndex,
      },
    };
  }

  /**
   * Get archived audit entries (oldest entries that overflowed the active trail).
   * @param {number} [limit] - Max entries to return
   * @returns {object[]}
   */
  getAuditArchive(limit = null) {
    return limit ? this._auditArchive.slice(-limit) : [...this._auditArchive];
  }

  // ─── Circuit Breaker for External APIs ──────────────────────────────────────

  /**
   * Get or create a circuit breaker for a named service.
   * States: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (probing) → CLOSED
   *
   * @param {string} serviceName - e.g. 'anthropic', 'openai', 'vector-db'
   * @param {object} [opts]
   * @param {number} [opts.failThreshold=5]  - Failures before opening
   * @param {number} [opts.resetTimeoutMs=30000] - Time in OPEN before probing
   * @param {number} [opts.halfOpenMax=2]    - Max probes in HALF_OPEN
   * @returns {object} Circuit breaker state
   */
  _getCircuitBreaker(serviceName, opts = {}) {
    if (!this._circuitBreakers.has(serviceName)) {
      this._circuitBreakers.set(serviceName, {
        serviceName,
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailureAt: null,
        lastSuccessAt: null,
        openedAt: null,
        halfOpenProbes: 0,
        failThreshold: opts.failThreshold || 5,
        resetTimeoutMs: opts.resetTimeoutMs || 30_000,
        halfOpenMax: opts.halfOpenMax || 2,
        totalTrips: 0,
      });
    }
    return this._circuitBreakers.get(serviceName);
  }

  /**
   * Check if a service circuit breaker allows a request.
   * Automatically transitions OPEN → HALF_OPEN after resetTimeout.
   *
   * @param {string} serviceName
   * @returns {boolean} true if request is allowed
   */
  circuitBreakerCanRequest(serviceName) {
    const cb = this._getCircuitBreaker(serviceName);

    if (cb.state === 'CLOSED') return true;

    if (cb.state === 'OPEN') {
      const elapsed = Date.now() - cb.openedAt;
      // Use PHI-scaled backoff for reset timeout
      const effectiveTimeout = cb.resetTimeoutMs * Math.pow(PHI, Math.min(cb.totalTrips - 1, 5));
      if (elapsed > effectiveTimeout) {
        cb.state = 'HALF_OPEN';
        cb.halfOpenProbes = 0;
        logger.info('[GovernanceEngine] Circuit breaker HALF_OPEN', { serviceName });
        this.emit('circuit-breaker:half-open', { serviceName });
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited probes
    if (cb.halfOpenProbes < cb.halfOpenMax) {
      cb.halfOpenProbes++;
      return true;
    }
    return false;
  }

  /**
   * Record a successful request for a service.
   * Transitions HALF_OPEN → CLOSED on success.
   *
   * @param {string} serviceName
   */
  circuitBreakerSuccess(serviceName) {
    const cb = this._getCircuitBreaker(serviceName);
    cb.failures = 0;
    cb.successes++;
    cb.lastSuccessAt = Date.now();
    if (cb.state === 'HALF_OPEN') {
      cb.state = 'CLOSED';
      logger.info('[GovernanceEngine] Circuit breaker CLOSED (recovered)', { serviceName });
      this.emit('circuit-breaker:closed', { serviceName });
    }
  }

  /**
   * Record a failed request for a service.
   * Transitions CLOSED → OPEN after failThreshold consecutive failures.
   * Transitions HALF_OPEN → OPEN on any failure.
   *
   * @param {string} serviceName
   */
  circuitBreakerFailure(serviceName) {
    const cb = this._getCircuitBreaker(serviceName);
    cb.failures++;
    cb.lastFailureAt = Date.now();

    if (cb.state === 'HALF_OPEN') {
      // Any failure in half-open trips back to open
      cb.state = 'OPEN';
      cb.openedAt = Date.now();
      cb.totalTrips++;
      logger.warn('[GovernanceEngine] Circuit breaker OPEN (half-open probe failed)', { serviceName });
      this.emit('circuit-breaker:open', { serviceName, reason: 'half_open_probe_failed' });
      return;
    }

    if (cb.failures >= cb.failThreshold) {
      cb.state = 'OPEN';
      cb.openedAt = Date.now();
      cb.totalTrips++;
      logger.warn('[GovernanceEngine] Circuit breaker OPEN', {
        serviceName,
        failures: cb.failures,
        totalTrips: cb.totalTrips,
      });
      this.emit('circuit-breaker:open', { serviceName, reason: 'threshold_exceeded' });
    }
  }

  /**
   * Get status of all circuit breakers.
   * @returns {object} Map of serviceName → state summary
   */
  getCircuitBreakerStatus() {
    const status = {};
    for (const [name, cb] of this._circuitBreakers) {
      status[name] = {
        state: cb.state,
        failures: cb.failures,
        successes: cb.successes,
        totalTrips: cb.totalTrips,
        lastFailureAt: cb.lastFailureAt,
        lastSuccessAt: cb.lastSuccessAt,
      };
    }
    return status;
  }

  /**
   * Reset a circuit breaker to CLOSED state.
   * @param {string} serviceName
   */
  circuitBreakerReset(serviceName) {
    const cb = this._getCircuitBreaker(serviceName);
    cb.state = 'CLOSED';
    cb.failures = 0;
    cb.halfOpenProbes = 0;
    logger.info('[GovernanceEngine] Circuit breaker manually reset', { serviceName });
    this.emit('circuit-breaker:reset', { serviceName });
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = { GovernanceEngine, GovernanceDecision, PolicyType, PHI };
