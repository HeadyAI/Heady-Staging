'use strict';

/**
 * Heady™ Code Dojo — Continuous Coding Practice Engine
 *
 * Generates and evaluates coding challenges 24/7 across 12 skill domains.
 * Target: minimum 20 challenges completed per day with measurable improvement.
 *
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, PHI_TIMING } = require('../../shared/phi-math');

// ─── Skill Domains ──────────────────────────────────────────────────────────

const DOMAINS = Object.freeze([
  'node_js', 'react', 'sql_pgvector', 'cloud_run', 'cloudflare_workers',
  'sacred_geometry_css', 'mcp_protocol', 'agent_orchestration',
  'security_hardening', 'trading_systems', 'devops_ci', 'llm_prompt_engineering',
]);

const DIFFICULTY = Object.freeze({
  BEGINNER:     1,
  INTERMEDIATE: 2,
  ADVANCED:     3,
  EXPERT:       4,
  MASTER:       5,
});

// Fibonacci-weighted scoring per difficulty
const DIFFICULTY_WEIGHT = Object.freeze({
  1: fib(3),  // 2
  2: fib(4),  // 3
  3: fib(5),  // 5
  4: fib(6),  // 8
  5: fib(7),  // 13
});

// ─── Challenge Templates ────────────────────────────────────────────────────

const CHALLENGE_TEMPLATES = {
  node_js: [
    { title: 'Implement a phi-backoff retry decorator', difficulty: 2, hints: ['Use Math.pow(PHI, attempt)', 'Return a wrapped async function'] },
    { title: 'Build a circular buffer with O(1) operations', difficulty: 3, hints: ['Fixed-size array + head pointer', 'Modular arithmetic'] },
    { title: 'Create an event-driven pipeline with backpressure', difficulty: 4, hints: ['Use streams.Transform', 'Track highWaterMark'] },
    { title: 'Implement a distributed lock manager using Redis', difficulty: 5, hints: ['SET NX EX pattern', 'Fencing tokens'] },
  ],
  sql_pgvector: [
    { title: 'Write a cosine similarity search with RLS', difficulty: 2, hints: ['1 - (embedding <=> query_vec)', 'SET app.current_tenant_id'] },
    { title: 'Optimize HNSW index for recall@10', difficulty: 3, hints: ['Tune m, ef_construction, ef_search', 'Benchmark with real queries'] },
    { title: 'Implement multi-tenant vector upsert with dedup', difficulty: 4, hints: ['ON CONFLICT DO UPDATE', 'Check cosine similarity > 0.972'] },
  ],
  security_hardening: [
    { title: 'Implement HMAC-SHA256 webhook verification', difficulty: 2, hints: ['crypto.createHmac', 'timingSafeEqual for constant-time compare'] },
    { title: 'Build a SHA-256 hash chain audit log', difficulty: 3, hints: ['Each entry includes hash of previous', 'Verify chain integrity on read'] },
    { title: 'Implement API key rotation with zero downtime', difficulty: 4, hints: ['Dual-key window', 'Graceful deprecation period'] },
  ],
  mcp_protocol: [
    { title: 'Build an MCP tool handler with JSON-RPC 2.0', difficulty: 2, hints: ['Method routing', 'Error codes -32600 to -32603'] },
    { title: 'Implement MCP resource streaming with SSE', difficulty: 3, hints: ['text/event-stream content type', 'Heartbeat every phi^5 ms'] },
  ],
  sacred_geometry_css: [
    { title: 'Create Fibonacci breakpoint CSS custom properties', difficulty: 1, hints: ['--bp-xs: 233px', 'fib sequence for breakpoints'] },
    { title: 'Build a golden ratio grid system', difficulty: 3, hints: ['61.8% / 38.2% split', 'CSS Grid fr units'] },
  ],
  agent_orchestration: [
    { title: 'Implement a fan-out/fan-in supervisor pattern', difficulty: 3, hints: ['Promise.allSettled', 'Aggregate results'] },
    { title: 'Build an agent health monitor with auto-healing', difficulty: 4, hints: ['Health endpoint polling', 'Restart on consecutive failures'] },
  ],
  llm_prompt_engineering: [
    { title: 'Create a chain-of-thought prompt template', difficulty: 1, hints: ['Step-by-step reasoning', 'Self-verification'] },
    { title: 'Build a multi-model consensus evaluator', difficulty: 4, hints: ['Route same query to N models', 'CSL-weighted fusion of responses'] },
  ],
  react: [
    { title: 'Build a phi-animated breathing UI component', difficulty: 2, hints: ['CSS animation with phi timing', 'transform: scale()'] },
    { title: 'Implement a torus-flow data visualization', difficulty: 4, hints: ['Canvas/WebGL', 'Parametric torus coordinates'] },
  ],
  cloud_run: [
    { title: 'Configure cold-start optimization for Cloud Run', difficulty: 2, hints: ['min-instances: 1', 'Lazy-load heavy modules'] },
    { title: 'Implement request-based autoscaling with concurrency limits', difficulty: 3, hints: ['concurrency: 80', 'CPU allocation: always'] },
  ],
  cloudflare_workers: [
    { title: 'Build an edge cache with KV storage', difficulty: 2, hints: ['KV.put with expirationTtl', 'Cache-Control headers'] },
    { title: 'Implement an AI gateway worker with streaming', difficulty: 4, hints: ['TransformStream', 'ReadableStream from AI response'] },
  ],
  trading_systems: [
    { title: 'Implement a simple moving average crossover detector', difficulty: 2, hints: ['SMA(fast) crosses SMA(slow)', 'Ring buffer for price history'] },
    { title: 'Build a Monte Carlo portfolio simulator', difficulty: 4, hints: ['Geometric Brownian motion', 'N=1000 scenarios'] },
  ],
  devops_ci: [
    { title: 'Create a GitHub Actions workflow with matrix strategy', difficulty: 2, hints: ['strategy.matrix', 'Node versions 18, 20, 22'] },
    { title: 'Implement a canary deployment pipeline', difficulty: 4, hints: ['1% → 5% → 20% → 100%', 'Rollback on error rate > threshold'] },
  ],
};

// ─── Main Class ─────────────────────────────────────────────────────────────

class HeadyCodeDojo extends EventEmitter {
  constructor({ vectorMemory, eventBus, llmRouter } = {}) {
    super();
    this._vectorMemory = vectorMemory;
    this._bus = eventBus;
    this._llmRouter = llmRouter;
    this._challenges = new Map();
    this._completions = [];
    this._skillRadar = {};
    this._streak = 0;
    this._dailyCount = 0;
    this._lastDayReset = this._dayKey();
    this._patterns = new Map();

    // Initialize skill radar
    for (const domain of DOMAINS) {
      this._skillRadar[domain] = { score: 0.5, completions: 0, avgDifficulty: 0, lastPracticed: null };
    }
  }

  // ─── Challenge Generation ───────────────────────────────────────────────

  generateChallenge(domain, difficulty = null) {
    if (!DOMAINS.includes(domain)) {
      throw new Error(`Unknown domain: ${domain}. Available: ${DOMAINS.join(', ')}`);
    }

    const templates = CHALLENGE_TEMPLATES[domain] || [];
    if (templates.length === 0) {
      return this._generateDynamic(domain, difficulty || DIFFICULTY.INTERMEDIATE);
    }

    // Select appropriate difficulty (fibonacci progression)
    const targetDiff = difficulty || this._suggestDifficulty(domain);
    const candidates = templates.filter(t => t.difficulty <= targetDiff + 1);
    const template = candidates[Math.floor(Math.random() * candidates.length)] || templates[0];

    const challenge = {
      id: `ch_${crypto.randomBytes(8).toString('hex')}`,
      domain,
      title: template.title,
      difficulty: template.difficulty,
      hints: template.hints,
      weight: DIFFICULTY_WEIGHT[template.difficulty],
      timeLimit: phiMs(template.difficulty + 2), // phi-scaled timeout
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    this._challenges.set(challenge.id, challenge);
    this.emit('challenge:generated', { challengeId: challenge.id, domain, difficulty: challenge.difficulty });
    if (this._bus) this._bus.emit('code-dojo:challenge:generated', challenge);

    return challenge;
  }

  _generateDynamic(domain, difficulty) {
    const challenge = {
      id: `ch_${crypto.randomBytes(8).toString('hex')}`,
      domain,
      title: `[Dynamic] ${domain} challenge at difficulty ${difficulty}`,
      difficulty,
      hints: ['Think step by step', 'Consider edge cases'],
      weight: DIFFICULTY_WEIGHT[difficulty] || fib(5),
      timeLimit: phiMs(difficulty + 2),
      createdAt: new Date().toISOString(),
      status: 'pending',
      dynamic: true,
    };
    this._challenges.set(challenge.id, challenge);
    return challenge;
  }

  _suggestDifficulty(domain) {
    const skill = this._skillRadar[domain];
    if (!skill) return DIFFICULTY.INTERMEDIATE;
    // Fibonacci-stepped difficulty progression based on score
    if (skill.score >= 0.882) return DIFFICULTY.MASTER;
    if (skill.score >= 0.809) return DIFFICULTY.EXPERT;
    if (skill.score >= 0.618) return DIFFICULTY.ADVANCED;
    if (skill.score >= 0.382) return DIFFICULTY.INTERMEDIATE;
    return DIFFICULTY.BEGINNER;
  }

  // ─── Evaluation ─────────────────────────────────────────────────────────

  evaluateSubmission(challengeId, code) {
    const challenge = this._challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge not found: ${challengeId}`);

    const evaluation = {
      challengeId,
      domain: challenge.domain,
      difficulty: challenge.difficulty,
      codeLength: code.length,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Basic quality checks
    evaluation.checks.hasCode = code.trim().length > 0;
    evaluation.checks.notTooShort = code.length > 50;
    evaluation.checks.noConsoleLog = !code.includes('console.log');
    evaluation.checks.hasErrorHandling = /try\s*\{|\.catch\(|if\s*\(!/.test(code);
    evaluation.checks.hasComments = /\/\/|\/\*/.test(code);
    evaluation.checks.usesConst = /\bconst\b/.test(code);
    evaluation.checks.noVar = !/\bvar\b/.test(code);
    evaluation.checks.noEval = !/\beval\b/.test(code);

    const passedChecks = Object.values(evaluation.checks).filter(Boolean).length;
    const totalChecks = Object.keys(evaluation.checks).length;
    evaluation.score = Math.round((passedChecks / totalChecks) * 100) / 100;

    // CSL-weighted quality score
    const qualityWeight = evaluation.score * PSI + (challenge.difficulty / 5) * (1 - PSI);
    evaluation.qualityScore = Math.round(qualityWeight * 1000) / 1000;

    // Update skill radar
    this._updateSkillRadar(challenge.domain, evaluation.qualityScore, challenge.difficulty);

    // Track completion
    challenge.status = 'completed';
    challenge.evaluation = evaluation;
    this._completions.push({ challengeId, domain: challenge.domain, score: evaluation.qualityScore, at: evaluation.timestamp });
    this._updateDailyCount();
    this._streak++;

    this.emit('challenge:completed', evaluation);
    if (this._bus) this._bus.emit('code-dojo:challenge:completed', evaluation);

    return evaluation;
  }

  _updateSkillRadar(domain, score, difficulty) {
    const skill = this._skillRadar[domain];
    if (!skill) return;

    skill.completions++;
    skill.lastPracticed = new Date().toISOString();
    // Exponential moving average with phi-decay
    skill.score = skill.score * PSI + score * (1 - PSI);
    skill.avgDifficulty = skill.avgDifficulty * PSI + difficulty * (1 - PSI);

    if (this._bus) this._bus.emit('code-dojo:skill:improved', { domain, score: skill.score, completions: skill.completions });
  }

  // ─── Pattern Extraction ─────────────────────────────────────────────────

  extractPatterns(solution) {
    const patterns = [];

    if (/class\s+\w+\s+extends\s+EventEmitter/.test(solution)) patterns.push('event-emitter-pattern');
    if (/new\s+Map\(\)/.test(solution)) patterns.push('map-based-registry');
    if (/Promise\.all(Settled)?\(/.test(solution)) patterns.push('concurrent-execution');
    if (/async\s+\*/.test(solution)) patterns.push('async-generator');
    if (/createHmac|createHash/.test(solution)) patterns.push('cryptographic-verification');
    if (/setTimeout.*retry|backoff/i.test(solution)) patterns.push('retry-with-backoff');
    if (/\bcircuit\s*breaker\b/i.test(solution)) patterns.push('circuit-breaker');
    if (/\.pipe\(/.test(solution)) patterns.push('stream-pipeline');
    if (/proxy|Proxy/.test(solution)) patterns.push('proxy-pattern');
    if (/(?:head|tail|pointer|circular)/i.test(solution)) patterns.push('circular-buffer');

    for (const p of patterns) {
      this._patterns.set(p, (this._patterns.get(p) || 0) + 1);
    }

    return patterns;
  }

  // ─── Progress Tracking ──────────────────────────────────────────────────

  getSkillRadar() {
    return { ...this._skillRadar };
  }

  getStats() {
    this._updateDailyCount();
    return {
      totalCompletions: this._completions.length,
      dailyCompletions: this._dailyCount,
      dailyTarget: 20,
      onTrack: this._dailyCount >= 20,
      streak: this._streak,
      avgScore: this._completions.length > 0
        ? Math.round(this._completions.reduce((s, c) => s + c.score, 0) / this._completions.length * 1000) / 1000
        : 0,
      weakestDomain: this._getWeakestDomain(),
      strongestDomain: this._getStrongestDomain(),
      patternLibrary: Object.fromEntries(this._patterns),
      phi: PHI,
    };
  }

  getDailyTarget() {
    this._updateDailyCount();
    return {
      target: 20,
      completed: this._dailyCount,
      remaining: Math.max(0, 20 - this._dailyCount),
      suggestedDomain: this._getWeakestDomain(),
      suggestedDifficulty: this._suggestDifficulty(this._getWeakestDomain()),
    };
  }

  _getWeakestDomain() {
    let weakest = DOMAINS[0];
    let minScore = Infinity;
    for (const d of DOMAINS) {
      if (this._skillRadar[d].score < minScore) {
        minScore = this._skillRadar[d].score;
        weakest = d;
      }
    }
    return weakest;
  }

  _getStrongestDomain() {
    let strongest = DOMAINS[0];
    let maxScore = -Infinity;
    for (const d of DOMAINS) {
      if (this._skillRadar[d].score > maxScore) {
        maxScore = this._skillRadar[d].score;
        strongest = d;
      }
    }
    return strongest;
  }

  _dayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  _updateDailyCount() {
    const today = this._dayKey();
    if (today !== this._lastDayReset) {
      this._dailyCount = 0;
      this._lastDayReset = today;
    }
    this._dailyCount = this._completions.filter(c => c.at && c.at.startsWith(today)).length;
  }
}

module.exports = { HeadyCodeDojo, DOMAINS, DIFFICULTY, CHALLENGE_TEMPLATES };
