/* © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL. */
/**
 * Heady™ Training Service — Skill Gap Analysis & Spaced Repetition
 * Events: train:gap_identified, train:session_completed, train:knowledge_exported
 * @module heady-train-service
 */

'use strict';

const { Router } = require('express');
const { EventEmitter } = require('events');
const crypto = require('crypto');

const router = Router();
const bus = new EventEmitter();
bus.setMaxListeners(50);

const FIB_INTERVALS = [1, 2, 3, 5, 8, 13]; // Fibonacci review schedule (days)

const PRIORITY_TOPICS = [
  { id: 'pgvector-opt',       name: 'pgvector optimization',       impact: 0.95, category: 'data',           currentScore: 0.42 },
  { id: 'cf-workers',         name: 'Cloudflare Workers',          impact: 0.91, category: 'infrastructure', currentScore: 0.55 },
  { id: 'multi-agent',        name: 'multi-agent consensus',       impact: 0.89, category: 'ai',             currentScore: 0.38 },
  { id: 'ws-streaming',       name: 'WebSocket streaming',         impact: 0.87, category: 'realtime',       currentScore: 0.61 },
  { id: 'stripe-billing',     name: 'Stripe billing',              impact: 0.84, category: 'payments',       currentScore: 0.47 },
  { id: 'soc2-compliance',    name: 'SOC 2 compliance',            impact: 0.82, category: 'security',       currentScore: 0.33 },
  { id: 'sacred-geometry',    name: 'sacred geometry proofs',      impact: 0.78, category: 'math',           currentScore: 0.59 },
  { id: 'trading-backtest',   name: 'trading backtesting',         impact: 0.76, category: 'fintech',        currentScore: 0.44 },
];

// ─── Skill Metrics ─────────────────────────────────────────
const SKILL_METRICS = [
  { area: 'pgvector optimization',       score: 0.42, weight: 1.0,  lastAssessed: '2026-03-01' },
  { area: 'multi-agent consensus',       score: 0.38, weight: 0.95, lastAssessed: '2026-03-05' },
  { area: 'SOC 2 compliance',            score: 0.33, weight: 0.90, lastAssessed: '2026-02-20' },
  { area: 'trading backtesting',         score: 0.44, weight: 0.85, lastAssessed: '2026-03-10' },
  { area: 'Stripe billing',             score: 0.47, weight: 0.88, lastAssessed: '2026-03-08' },
  { area: 'Cloudflare Workers',          score: 0.55, weight: 0.92, lastAssessed: '2026-03-12' },
  { area: 'sacred geometry proofs',      score: 0.59, weight: 0.80, lastAssessed: '2026-03-03' },
  { area: 'WebSocket streaming',         score: 0.61, weight: 0.86, lastAssessed: '2026-03-07' },
  { area: 'vector embedding pipelines',  score: 0.50, weight: 0.82, lastAssessed: '2026-02-28' },
  { area: 'edge function routing',       score: 0.48, weight: 0.78, lastAssessed: '2026-03-02' },
  { area: 'distributed tracing',         score: 0.52, weight: 0.75, lastAssessed: '2026-02-25' },
  { area: 'container orchestration',     score: 0.63, weight: 0.70, lastAssessed: '2026-03-11' },
  { area: 'rate limiter design',         score: 0.57, weight: 0.72, lastAssessed: '2026-03-06' },
  { area: 'circuit breaker patterns',    score: 0.65, weight: 0.68, lastAssessed: '2026-03-09' },
  { area: 'event sourcing',              score: 0.41, weight: 0.77, lastAssessed: '2026-02-22' },
];

// ─── Curriculum Templates ──────────────────────────────────
const CURRICULUM_TEMPLATES = {
  data:           { steps: ['Schema design review', 'Index strategy lab', 'Query optimization drill', 'Benchmark suite run'], resources: ['pgvector docs', 'PostgreSQL EXPLAIN guide', 'ANN benchmark repo'] },
  infrastructure: { steps: ['Worker anatomy walkthrough', 'KV + D1 integration lab', 'Edge routing exercise', 'Performance profiling'], resources: ['CF Workers docs', 'Wrangler CLI guide', 'Edge computing patterns'] },
  ai:             { steps: ['Consensus algorithm study', 'Voting mechanism implementation', 'Byzantine fault tolerance lab', 'Multi-agent simulation'], resources: ['Raft paper', 'PBFT overview', 'Multi-agent systems textbook'] },
  realtime:       { steps: ['Protocol fundamentals', 'Backpressure handling lab', 'Binary frame optimization', 'Load test with k6'], resources: ['RFC 6455', 'ws library docs', 'WebSocket scaling patterns'] },
  payments:       { steps: ['API integration walkthrough', 'Webhook verification lab', 'Subscription lifecycle exercise', 'Idempotency key drill'], resources: ['Stripe API docs', 'Stripe testing guide', 'PCI DSS overview'] },
  security:       { steps: ['Control framework study', 'Evidence collection exercise', 'Audit log implementation', 'Compliance gap assessment'], resources: ['SOC 2 Type II guide', 'AICPA trust criteria', 'Vanta/Drata docs'] },
  math:           { steps: ['Golden ratio derivation', 'Fibonacci proof exercise', 'Phi-based algorithm design', 'Geometric gate implementation'], resources: ['Sacred geometry primer', 'CSL gate mathematics', 'Heady phi-math module'] },
  fintech:        { steps: ['Strategy definition framework', 'Historical data pipeline setup', 'Backtest engine walkthrough', 'Risk metric calculation'], resources: ['Quantitative trading intro', 'Backtrader docs', 'Sharpe ratio guide'] },
};

// ─── State: spaced repetition tracker & session store ──────
const repetitionTracker = new Map();
const sessionStore = new Map();

// Initialize repetition tracker with priority topics
for (const topic of PRIORITY_TOPICS) {
  repetitionTracker.set(topic.id, {
    lastTested: null,
    nextTest: new Date().toISOString(),
    interval: FIB_INTERVALS[0],
    score: topic.currentScore,
    reviewCount: 0,
  });
}

// ─── Core Functions ────────────────────────────────────────

/**
 * Analyze skill gaps — returns top 10 weakest areas ranked by
 * weighted gap score: (1 - score) * weight.
 */
function analyzeSkillGaps() {
  const gaps = SKILL_METRICS.map(m => ({
    area: m.area,
    score: m.score,
    weight: m.weight,
    gapScore: parseFloat(((1 - m.score) * m.weight).toFixed(4)),
    lastAssessed: m.lastAssessed,
    severity: m.score < 0.4 ? 'critical' : m.score < 0.55 ? 'high' : 'moderate',
  }));

  gaps.sort((a, b) => b.gapScore - a.gapScore);
  const top10 = gaps.slice(0, 10);

  for (const gap of top10) {
    bus.emit('train:gap_identified', {
      area: gap.area,
      gapScore: gap.gapScore,
      severity: gap.severity,
      timestamp: new Date().toISOString(),
    });
  }

  return { gaps: top10, analyzedAt: new Date().toISOString(), totalAreas: SKILL_METRICS.length };
}

/**
 * Generate a training curriculum for a given gap area.
 */
function generateCurriculum(gap) {
  const topic = PRIORITY_TOPICS.find(t => t.name === gap || t.id === gap);
  const category = topic ? topic.category : 'ai';
  const template = CURRICULUM_TEMPLATES[category] || CURRICULUM_TEMPLATES.ai;

  const curriculum = {
    id: `cur_${crypto.randomBytes(6).toString('hex')}`,
    topic: topic ? topic.name : gap,
    category,
    difficulty: topic && topic.currentScore < 0.4 ? 'foundational' : 'intermediate',
    estimatedMinutes: template.steps.length * 25,
    steps: template.steps.map((step, i) => ({
      order: i + 1,
      title: step,
      durationMinutes: 25,
      completed: false,
    })),
    resources: template.resources,
    exercises: [
      { type: 'comprehension', prompt: `Explain the core concept behind ${topic ? topic.name : gap}` },
      { type: 'implementation', prompt: `Build a minimal working example of ${topic ? topic.name : gap}` },
      { type: 'optimization', prompt: `Identify and fix 3 performance issues in a ${topic ? topic.name : gap} implementation` },
    ],
    createdAt: new Date().toISOString(),
  };

  return curriculum;
}

/**
 * Execute a training session — simulates completion, records results.
 */
function executeTraining(curriculum) {
  const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;
  const stepsCompleted = curriculum.steps.length;
  const baseScore = 0.6 + Math.random() * 0.35;
  const score = parseFloat(baseScore.toFixed(3));

  const session = {
    sessionId,
    curriculumId: curriculum.id,
    topic: curriculum.topic,
    category: curriculum.category,
    stepsCompleted,
    totalSteps: curriculum.steps.length,
    score,
    passed: score >= 0.7,
    completedAt: new Date().toISOString(),
    durationMinutes: curriculum.estimatedMinutes,
    insights: [
      `Covered ${stepsCompleted} steps in ${curriculum.topic}`,
      score >= 0.8 ? 'Strong understanding demonstrated' : 'Needs reinforcement on advanced concepts',
      `Next review scheduled via spaced repetition`,
    ],
  };

  sessionStore.set(sessionId, session);

  // Update repetition tracker
  const topicEntry = PRIORITY_TOPICS.find(t => t.name === curriculum.topic);
  if (topicEntry) {
    const tracker = repetitionTracker.get(topicEntry.id);
    if (tracker) {
      const intervalIdx = Math.min(tracker.reviewCount, FIB_INTERVALS.length - 1);
      const nextInterval = FIB_INTERVALS[intervalIdx];
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + nextInterval);

      tracker.lastTested = new Date().toISOString();
      tracker.nextTest = nextDate.toISOString();
      tracker.interval = nextInterval;
      tracker.score = parseFloat(((tracker.score + score) / 2).toFixed(3));
      tracker.reviewCount += 1;
    }
  }

  bus.emit('train:session_completed', {
    sessionId,
    topic: curriculum.topic,
    score,
    passed: session.passed,
    timestamp: session.completedAt,
  });

  return session;
}

/**
 * Manage Fibonacci-interval spaced repetition schedule for a topic.
 */
function spacedRepetition(topic) {
  const topicEntry = PRIORITY_TOPICS.find(t => t.name === topic || t.id === topic);
  if (!topicEntry) {
    return { error: `Topic not found: ${topic}`, availableTopics: PRIORITY_TOPICS.map(t => t.id) };
  }

  const tracker = repetitionTracker.get(topicEntry.id);
  if (!tracker) {
    return { error: `No tracker entry for: ${topicEntry.id}` };
  }

  const now = new Date();
  const nextTest = new Date(tracker.nextTest);
  const isDue = now >= nextTest;

  return {
    topicId: topicEntry.id,
    topicName: topicEntry.name,
    lastTested: tracker.lastTested,
    nextTest: tracker.nextTest,
    currentInterval: tracker.interval,
    fibonacciSequence: FIB_INTERVALS,
    nextIntervalDays: FIB_INTERVALS[Math.min(tracker.reviewCount, FIB_INTERVALS.length - 1)],
    score: tracker.score,
    reviewCount: tracker.reviewCount,
    isDue,
    status: isDue ? 'REVIEW_DUE' : 'SCHEDULED',
  };
}

/**
 * Export knowledge from a completed session.
 */
function exportKnowledge(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return { error: `Session not found: ${sessionId}` };
  }

  const exported = {
    sessionId: session.sessionId,
    summary: {
      topic: session.topic,
      category: session.category,
      score: session.score,
      passed: session.passed,
      completedAt: session.completedAt,
      stepsCompleted: session.stepsCompleted,
    },
    codeExample: `// Auto-generated example for: ${session.topic}\n` +
      `// Score: ${session.score} | ${session.passed ? 'PASSED' : 'NEEDS_REVIEW'}\n` +
      `const ${session.category}Module = require('./${session.category}');\n` +
      `async function apply${session.topic.replace(/\s+/g, '')}() {\n` +
      `  // Implementation based on training session ${session.sessionId}\n` +
      `  return { status: 'applied', confidence: ${session.score} };\n` +
      `}\nmodule.exports = { apply${session.topic.replace(/\s+/g, '')} };`,
    autoSuccessTask: {
      id: `task_${crypto.randomBytes(4).toString('hex')}`,
      type: 'knowledge_verification',
      topic: session.topic,
      dueInDays: FIB_INTERVALS[0],
      criteria: `Demonstrate ${session.topic} proficiency with score >= 0.8`,
    },
    exportedAt: new Date().toISOString(),
  };

  bus.emit('train:knowledge_exported', {
    sessionId,
    topic: session.topic,
    score: session.score,
    timestamp: exported.exportedAt,
  });

  return exported;
}

/**
 * Get training priorities — 8 topics ranked by impact * gap.
 */
function getTrainingPriorities() {
  const priorities = PRIORITY_TOPICS.map(t => ({
    id: t.id,
    name: t.name,
    impact: t.impact,
    currentScore: t.currentScore,
    gap: parseFloat((1 - t.currentScore).toFixed(3)),
    priorityScore: parseFloat((t.impact * (1 - t.currentScore)).toFixed(4)),
    category: t.category,
    repetition: repetitionTracker.get(t.id) || null,
  }));

  priorities.sort((a, b) => b.priorityScore - a.priorityScore);
  return { priorities, generatedAt: new Date().toISOString() };
}

// ─── Express Routes ────────────────────────────────────────

router.get('/api/v1/train/gaps', (_req, res) => {
  try {
    const result = analyzeSkillGaps();
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/api/v1/train/start', (req, res) => {
  try {
    const { topic } = req.body || {};
    if (!topic) {
      return res.status(400).json({ ok: false, error: 'Missing required field: topic' });
    }
    const curriculum = generateCurriculum(topic);
    const session = executeTraining(curriculum);
    const knowledge = exportKnowledge(session.sessionId);
    const repetition = spacedRepetition(topic);

    res.json({
      ok: true,
      data: { session, curriculum, knowledge, repetition },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/v1/train/priorities', (_req, res) => {
  try {
    const result = getTrainingPriorities();
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/api/v1/train/schedule', (_req, res) => {
  try {
    const schedule = [];
    for (const [topicId, tracker] of repetitionTracker.entries()) {
      const topic = PRIORITY_TOPICS.find(t => t.id === topicId);
      schedule.push({
        topicId,
        topicName: topic ? topic.name : topicId,
        ...tracker,
        isDue: new Date() >= new Date(tracker.nextTest),
      });
    }
    schedule.sort((a, b) => new Date(a.nextTest) - new Date(b.nextTest));
    res.json({ ok: true, data: { schedule, generatedAt: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  router,
  bus,
  analyzeSkillGaps,
  generateCurriculum,
  executeTraining,
  spacedRepetition,
  exportKnowledge,
  getTrainingPriorities,
};
