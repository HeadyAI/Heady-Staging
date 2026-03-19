'use strict';

/**
 * Heady™ Train Service — Intelligent Skill Gap Analysis & Training
 *
 * Identifies the most beneficial training topics, generates curricula,
 * and tracks progress with Fibonacci-spaced repetition.
 * Target: close the #1 skill gap every 48 hours.
 *
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');

// ─── Priority Training Topics ───────────────────────────────────────────────

const PRIORITY_TOPICS = Object.freeze([
  { id: 'pgvector-optimization',    name: 'pgvector Query Optimization',           impact: 'IaaS revenue',         priority: 1 },
  { id: 'cloudflare-workers',       name: 'Cloudflare Workers Edge Compute',       impact: 'latency reduction',    priority: 2 },
  { id: 'multi-agent-consensus',    name: 'Multi-Agent Consensus Algorithms',      impact: 'swarm quality',        priority: 3 },
  { id: 'websocket-streaming',      name: 'WebSocket Real-Time Streaming',         impact: 'dashboard UX',         priority: 4 },
  { id: 'stripe-metered-billing',   name: 'Stripe Metered Billing Integration',    impact: 'monetization',         priority: 5 },
  { id: 'soc2-compliance',          name: 'SOC 2 Compliance Patterns',             impact: 'enterprise sales',     priority: 6 },
  { id: 'sacred-geometry-proofs',   name: 'Sacred Geometry Mathematical Proofs',   impact: 'IP moat',              priority: 7 },
  { id: 'trading-backtesting',      name: 'Trading Algorithm Backtesting',         impact: 'Apex PA performance',  priority: 8 },
]);

// Fibonacci-spaced repetition intervals (days)
const REPETITION_INTERVALS = [1, 2, 3, 5, 8, 13, 21, 34];

// ─── Main Class ─────────────────────────────────────────────────────────────

class HeadyTrainService extends EventEmitter {
  constructor({ vectorMemory, eventBus, cslEngine } = {}) {
    super();
    this._vectorMemory = vectorMemory;
    this._bus = eventBus;
    this._cslEngine = cslEngine;
    this._sessions = new Map();
    this._reviews = new Map();        // topicId → review history
    this._gapScores = new Map();      // topicId → gap score (0 = mastered, 1 = critical gap)
    this._curricula = new Map();      // topicId → curriculum
    this._completedSessions = [];

    // Initialize gap scores (all start at PSI = 0.618, unknown)
    for (const topic of PRIORITY_TOPICS) {
      this._gapScores.set(topic.id, PSI);
      this._reviews.set(topic.id, []);
    }
  }

  // ─── Skill Gap Analysis ─────────────────────────────────────────────────

  analyzeGaps() {
    const gaps = [];

    for (const topic of PRIORITY_TOPICS) {
      const gapScore = this._gapScores.get(topic.id) || PSI;
      const reviews = this._reviews.get(topic.id) || [];
      const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
      const daysSinceReview = lastReview ? Math.floor((Date.now() - new Date(lastReview.at).getTime()) / 86400000) : Infinity;

      // Decay score if not reviewed recently (phi-decay)
      const decayFactor = daysSinceReview > fib(7) ? Math.pow(PSI, daysSinceReview / fib(7)) : 1;
      const effectiveScore = 1 - ((1 - gapScore) * decayFactor);

      gaps.push({
        ...topic,
        gapScore: Math.round(effectiveScore * 1000) / 1000,
        reviewCount: reviews.length,
        lastReviewed: lastReview?.at || null,
        daysSinceReview,
        impactScore: Math.round(effectiveScore * (1 / topic.priority) * 1000) / 1000,
        status: effectiveScore > CSL_THRESHOLDS.COHERENCE ? 'critical' :
                effectiveScore > CSL_THRESHOLDS.MINIMUM ? 'needs_work' : 'proficient',
      });
    }

    // Sort by impact score (highest first)
    gaps.sort((a, b) => b.impactScore - a.impactScore);
    return gaps;
  }

  // ─── Curriculum Generation ──────────────────────────────────────────────

  generateCurriculum(topicId) {
    const topic = PRIORITY_TOPICS.find(t => t.id === topicId);
    if (!topic) throw new Error(`Unknown topic: ${topicId}`);

    const gapScore = this._gapScores.get(topicId) || PSI;

    // Generate curriculum modules based on gap severity
    const moduleCount = gapScore > 0.8 ? fib(6) : gapScore > 0.5 ? fib(5) : fib(4); // 8, 5, or 3 modules

    const curriculum = {
      id: `cur_${crypto.randomBytes(6).toString('hex')}`,
      topicId,
      topicName: topic.name,
      gapScore,
      impactArea: topic.impact,
      modules: this._generateModules(topicId, moduleCount),
      estimatedHours: Math.round(moduleCount * PHI * 10) / 10,
      fixPercentage: `Learning ${topic.name} would fix approximately ${Math.round(gapScore * 100)}% of related failures`,
      createdAt: new Date().toISOString(),
    };

    this._curricula.set(topicId, curriculum);
    return curriculum;
  }

  _generateModules(topicId, count) {
    const moduleTemplates = {
      'pgvector-optimization': [
        'HNSW index parameter tuning (m, ef_construction, ef_search)',
        'Cosine vs L2 distance selection criteria',
        'Multi-tenant RLS with vector queries',
        'Batch vector upsert optimization',
        'Query plan analysis with EXPLAIN ANALYZE',
        'Embedding dimension reduction (PCA/UMAP)',
        'Index rebuild strategies for production',
        'Hybrid search: full-text + vector similarity',
      ],
      'cloudflare-workers': [
        'Workers runtime model and limitations',
        'KV storage patterns and TTL management',
        'Durable Objects for stateful edge compute',
        'TransformStream for response streaming',
        'Wrangler CLI and deployment workflow',
        'Edge caching strategies',
        'R2 object storage integration',
        'AI Gateway worker implementation',
      ],
      'stripe-metered-billing': [
        'Subscription lifecycle management',
        'Metered billing with usage records',
        'Webhook signature verification',
        'Customer portal integration',
        'Invoice generation and PDF rendering',
        'Proration and plan changes',
        'Revenue recognition best practices',
        'Testing with Stripe CLI',
      ],
      'soc2-compliance': [
        'SOC 2 trust service criteria overview',
        'Access control and authentication patterns',
        'Audit trail design and immutability',
        'Encryption at rest and in transit',
        'Incident response procedures',
        'Change management documentation',
        'Vendor risk management',
        'Continuous compliance monitoring',
      ],
    };

    const templates = moduleTemplates[topicId] || [];
    const modules = [];
    for (let i = 0; i < Math.min(count, templates.length || count); i++) {
      modules.push({
        order: i + 1,
        title: templates[i] || `Module ${i + 1}: ${topicId} deep dive`,
        status: 'pending',
        estimatedMinutes: Math.round(phiMs(3) / 1000), // ~4.2 minutes
        exercises: fib(3), // 2 exercises per module
      });
    }
    return modules;
  }

  // ─── Active Learning ────────────────────────────────────────────────────

  async runTrainingSession(topicId) {
    const topic = PRIORITY_TOPICS.find(t => t.id === topicId);
    if (!topic) throw new Error(`Unknown topic: ${topicId}`);

    const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;
    const session = {
      id: sessionId,
      topicId,
      topicName: topic.name,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      modules: [],
      codeExamples: [],
      benchmarks: [],
    };

    this._sessions.set(sessionId, session);
    this.emit('session:start', { sessionId, topicId });
    if (this._bus) this._bus.emit('training:session:start', { sessionId, topicId, topic: topic.name });

    // Generate curriculum if not exists
    if (!this._curricula.has(topicId)) {
      this.generateCurriculum(topicId);
    }

    // Mark session complete (actual training happens via LLM interaction)
    session.status = 'ready';
    session.curriculum = this._curricula.get(topicId);

    return session;
  }

  completeSession(sessionId, results = {}) {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.results = results;
    session.durationMs = new Date(session.completedAt) - new Date(session.startedAt);

    // Update gap score (lower = more proficient)
    const score = results.score || 0.5;
    const currentGap = this._gapScores.get(session.topicId) || PSI;
    const newGap = currentGap * PSI + (1 - score) * (1 - PSI); // phi-weighted EMA
    this._gapScores.set(session.topicId, Math.round(newGap * 1000) / 1000);

    this._completedSessions.push({ sessionId, topicId: session.topicId, score, at: session.completedAt });

    this.emit('session:complete', { sessionId, topicId: session.topicId, score });
    if (this._bus) this._bus.emit('training:session:complete', { sessionId, topicId: session.topicId, score });

    // Check if gap is closed (score < CSL MINIMUM threshold)
    if (newGap < CSL_THRESHOLDS.MINIMUM) {
      if (this._bus) this._bus.emit('training:gap:closed', { topicId: session.topicId, newGap });
    }

    return session;
  }

  // ─── Spaced Repetition ──────────────────────────────────────────────────

  getReviewSchedule() {
    const schedule = [];
    const now = Date.now();

    for (const topic of PRIORITY_TOPICS) {
      const reviews = this._reviews.get(topic.id) || [];
      const reviewCount = reviews.length;
      const lastReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;

      // Next review interval based on Fibonacci sequence
      const intervalIndex = Math.min(reviewCount, REPETITION_INTERVALS.length - 1);
      const intervalDays = REPETITION_INTERVALS[intervalIndex];
      const nextReviewAt = lastReview
        ? new Date(new Date(lastReview.at).getTime() + intervalDays * 86400000)
        : new Date(); // Due immediately if never reviewed

      const isDue = nextReviewAt.getTime() <= now;

      schedule.push({
        topicId: topic.id,
        topicName: topic.name,
        reviewCount,
        intervalDays,
        nextReviewAt: nextReviewAt.toISOString(),
        isDue,
        overdueDays: isDue ? Math.floor((now - nextReviewAt.getTime()) / 86400000) : 0,
        gapScore: this._gapScores.get(topic.id) || PSI,
      });
    }

    // Sort: due first, then by overdue days
    schedule.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return b.overdueDays - a.overdueDays;
    });

    return schedule;
  }

  markReviewed(topicId, score) {
    if (!this._reviews.has(topicId)) throw new Error(`Unknown topic: ${topicId}`);

    const review = {
      at: new Date().toISOString(),
      score,
      intervalIndex: (this._reviews.get(topicId) || []).length,
    };

    this._reviews.get(topicId).push(review);

    // Update gap score based on review performance
    const currentGap = this._gapScores.get(topicId) || PSI;
    const newGap = currentGap * PSI + (1 - score) * (1 - PSI);
    this._gapScores.set(topicId, Math.round(newGap * 1000) / 1000);

    return { topicId, reviewCount: this._reviews.get(topicId).length, newGapScore: newGap, nextInterval: REPETITION_INTERVALS[Math.min(review.intervalIndex + 1, REPETITION_INTERVALS.length - 1)] };
  }

  // ─── Knowledge Export ───────────────────────────────────────────────────

  exportSession(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    return {
      summary: {
        topic: session.topicName,
        duration: session.durationMs ? `${Math.round(session.durationMs / 1000)}s` : 'in progress',
        score: session.results?.score || null,
        gapReduction: session.results ? `${Math.round((1 - (this._gapScores.get(session.topicId) || 1)) * 100)}%` : null,
      },
      curriculum: session.curriculum,
      codeExamples: session.codeExamples,
      autoSuccessTask: {
        id: `train-review-${session.topicId}`,
        category: 'intelligence-training',
        weight: 4,
        pool: 'warm',
        description: `Review: ${session.topicName}`,
      },
    };
  }

  // ─── Priority Topics ───────────────────────────────────────────────────

  getPriorityTopics() {
    return this.analyzeGaps().map(gap => ({
      ...gap,
      curriculum: this._curricula.get(gap.id) || null,
      reviewSchedule: this.getReviewSchedule().find(r => r.topicId === gap.id) || null,
    }));
  }
}

module.exports = { HeadyTrainService, PRIORITY_TOPICS, REPETITION_INTERVALS };
