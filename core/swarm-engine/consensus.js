/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Swarm Consensus — Distributed decision-making across swarms.
 * Uses CSL-weighted voting with phi-fusion tally.
 *
 * Quorum: ceil(17 * PSI) = ceil(10.506) = 11 swarms
 * Acceptance: weighted score >= CSL_THRESHOLDS.HIGH (0.882)
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/consensus
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import phiMath from '@heady/phi-math-foundation';
const {  PHI, PSI, fib,
  CSL_THRESHOLDS,
  phiFusionWeights,
} = phiMath.default || phiMath;
import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;

const logger = createLogger('swarm-consensus');

/** Quorum: ceil(17 * PSI) = 11 swarms must vote */
const QUORUM = Math.ceil(17 * PSI); // 11

/** Decision acceptance threshold */
const ACCEPTANCE_THRESHOLD = CSL_THRESHOLDS.HIGH; // ≈ 0.882

/** Decision states */
const DECISION_STATE = Object.freeze({
  PROPOSED: 'proposed',
  VOTING: 'voting',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

/** Vote timeout: fib(10)*1000 = 55 seconds */
const VOTE_TIMEOUT_MS = fib(10) * 1000;

class SwarmConsensus extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, object>} */
    this._decisions = new Map();
    this._cleanupInterval = null;
  }

  /**
   * Propose a decision to a set of swarms.
   * @param {object} decision - { type, payload, description }
   * @param {string[]} swarmIds - Swarms that should vote
   * @returns {object} Decision record with ID
   */
  propose(decision, swarmIds) {
    const decisionId = `dec-${randomUUID().slice(0, 12)}`;

    const record = {
      id: decisionId,
      type: decision.type,
      payload: decision.payload,
      description: decision.description || '',
      state: DECISION_STATE.PROPOSED,
      proposedAt: Date.now(),
      expiresAt: Date.now() + VOTE_TIMEOUT_MS,
      voters: new Set(swarmIds),
      votes: new Map(),
      result: null,
    };

    this._decisions.set(decisionId, record);
    record.state = DECISION_STATE.VOTING;

    this.emit('decision:proposed', {
      decisionId,
      type: decision.type,
      voterCount: swarmIds.length,
    });

    logger.info('Decision proposed', {
      decisionId,
      type: decision.type,
      voters: swarmIds.length,
    });

    return {
      decisionId,
      type: decision.type,
      state: record.state,
      voterCount: swarmIds.length,
      quorum: QUORUM,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Cast a vote on a decision.
   * Confidence is a CSL cosine score indicating how relevant
   * the decision is to the voting swarm.
   *
   * @param {string} swarmId - Voting swarm
   * @param {string} decisionId - Decision to vote on
   * @param {number} confidence - CSL score 0-1 (cosine similarity to decision)
   * @returns {object}
   */
  vote(swarmId, decisionId, confidence) {
    const record = this._decisions.get(decisionId);
    if (!record) throw new Error(`Unknown decision: ${decisionId}`);

    if (record.state !== DECISION_STATE.VOTING) {
      return { accepted: false, reason: `Decision in state: ${record.state}` };
    }

    if (Date.now() > record.expiresAt) {
      record.state = DECISION_STATE.EXPIRED;
      this.emit('decision:expired', { decisionId });
      return { accepted: false, reason: 'Decision expired' };
    }

    if (!record.voters.has(swarmId)) {
      return { accepted: false, reason: 'Not an eligible voter' };
    }

    // Record the CSL-weighted vote
    record.votes.set(swarmId, {
      swarmId,
      confidence: Math.max(0, Math.min(1, confidence)),
      votedAt: Date.now(),
    });

    logger.info('Vote cast', { decisionId, swarmId, confidence });

    // Check if we can tally
    if (record.votes.size >= QUORUM) {
      return this.tally(decisionId);
    }

    return {
      accepted: true,
      votesReceived: record.votes.size,
      quorum: QUORUM,
      remaining: QUORUM - record.votes.size,
    };
  }

  /**
   * Tally votes using phi-fusion weighted scoring.
   * @param {string} decisionId
   * @returns {object} Tally result
   */
  tally(decisionId) {
    const record = this._decisions.get(decisionId);
    if (!record) throw new Error(`Unknown decision: ${decisionId}`);

    const votes = Array.from(record.votes.values());

    if (votes.length < QUORUM) {
      return {
        decisionId,
        state: record.state,
        reason: `Quorum not met: ${votes.length}/${QUORUM}`,
        votes: votes.length,
      };
    }

    // Sort by confidence descending for phi-fusion weighting
    votes.sort((a, b) => b.confidence - a.confidence);

    // Apply phi-fusion weights
    const weights = phiFusionWeights(votes.length);
    let weightedScore = 0;
    for (let i = 0; i < votes.length; i++) {
      weightedScore += votes[i].confidence * weights[i];
    }

    // Simple average as secondary metric
    const avgConfidence = votes.reduce((s, v) => s + v.confidence, 0) / votes.length;

    const accepted = weightedScore >= ACCEPTANCE_THRESHOLD;

    record.state = accepted ? DECISION_STATE.ACCEPTED : DECISION_STATE.REJECTED;
    record.result = {
      weightedScore: Math.round(weightedScore * 10000) / 10000,
      avgConfidence: Math.round(avgConfidence * 10000) / 10000,
      votesCount: votes.length,
      accepted,
      tallyTimestamp: Date.now(),
    };

    this.emit(`decision:${accepted ? 'accepted' : 'rejected'}`, {
      decisionId,
      ...record.result,
    });

    logger.info('Decision tallied', {
      decisionId,
      accepted,
      weightedScore: record.result.weightedScore,
      votes: votes.length,
    });

    return {
      decisionId,
      state: record.state,
      ...record.result,
    };
  }

  /**
   * Get a decision record.
   * @param {string} decisionId
   * @returns {object|null}
   */
  getDecision(decisionId) {
    const record = this._decisions.get(decisionId);
    if (!record) return null;

    return {
      id: record.id,
      type: record.type,
      state: record.state,
      proposedAt: record.proposedAt,
      voterCount: record.voters.size,
      votesReceived: record.votes.size,
      result: record.result,
    };
  }

  /**
   * Get all active decisions.
   * @returns {object[]}
   */
  getActiveDecisions() {
    const active = [];
    for (const record of this._decisions.values()) {
      if (record.state === DECISION_STATE.PROPOSED || record.state === DECISION_STATE.VOTING) {
        active.push(this.getDecision(record.id));
      }
    }
    return active;
  }

  /**
   * Start cleanup of expired decisions.
   */
  startCleanup() {
    if (this._cleanupInterval) return;
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, record] of this._decisions) {
        if (record.state === DECISION_STATE.VOTING && now > record.expiresAt) {
          record.state = DECISION_STATE.EXPIRED;
          this.emit('decision:expired', { decisionId: id });
          logger.info('Decision expired', { decisionId: id });
        }
        // Clean up old decided/expired records after fib(12) seconds
        const age = now - record.proposedAt;
        if (
          (record.state === DECISION_STATE.ACCEPTED ||
           record.state === DECISION_STATE.REJECTED ||
           record.state === DECISION_STATE.EXPIRED) &&
          age > fib(12) * 1000
        ) {
          this._decisions.delete(id);
        }
      }
    }, fib(9) * 1000); // Every 34s
  }

  /**
   * Stop cleanup.
   */
  stopCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

export {
  SwarmConsensus,
  QUORUM,
  ACCEPTANCE_THRESHOLD,
  DECISION_STATE,
  VOTE_TIMEOUT_MS,
};
