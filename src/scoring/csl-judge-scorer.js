/**
 * CSL Judge Scorer — Weighted Criteria Scoring
 * ==============================================
 * FIX FOR: Finding #8 — Judge scoring used Math.random() instead of weighted criteria.
 *
 * This module implements the MASTER_DIRECTIVES §7.2 Stage 10 scoring system:
 *   correctness (34%), safety (21%), performance (21%), quality (13%), elegance (11%)
 *
 * All weights are imported from shared/phi-math.js JUDGE_WEIGHTS — no local definitions.
 *
 * @module src/scoring/csl-judge-scorer
 * @version 1.0.0
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const {
  JUDGE_WEIGHTS,
  CSL_THRESHOLDS,
  PHI,
  PSI,
  cslGate,
  cosineSimilarity,
  phiFusionWeights,
} = require('../../shared/phi-math');

/**
 * Score a single candidate output against weighted criteria.
 *
 * @param {object} candidate - The candidate to score
 * @param {object} candidate.output - The actual output to evaluate
 * @param {object} candidate.metrics - Measured performance metrics
 * @param {object} evaluationContext - Context for scoring
 * @param {object} evaluationContext.expectedOutput - Ground truth (if available)
 * @param {object} evaluationContext.securityChecks - Security scan results
 * @param {object} evaluationContext.performanceBaseline - Baseline metrics for comparison
 * @returns {object} Scored result with breakdown
 */
function scoreCandidate(candidate, evaluationContext = {}) {
  const scores = {};

  // 1. Correctness (34%) — Does it produce the right output?
  scores.correctness = evaluateCorrectness(
    candidate.output,
    evaluationContext.expectedOutput,
    evaluationContext.testResults,
  );

  // 2. Safety (21%) — Does it introduce security risks?
  scores.safety = evaluateSafety(
    candidate.output,
    evaluationContext.securityChecks,
  );

  // 3. Performance (21%) — How fast and resource-efficient?
  scores.performance = evaluatePerformance(
    candidate.metrics,
    evaluationContext.performanceBaseline,
  );

  // 4. Quality (13%) — Code quality, readability, patterns
  scores.quality = evaluateQuality(
    candidate.output,
    evaluationContext.qualityChecks,
  );

  // 5. Elegance (11%) — Simplicity, minimal complexity
  scores.elegance = evaluateElegance(
    candidate.output,
    evaluationContext.complexityMetrics,
  );

  // Compute weighted composite score using JUDGE_WEIGHTS
  const composite = computeComposite(scores);

  return {
    candidateId: candidate.id || candidate.node,
    scores,
    composite,
    passed: composite >= CSL_THRESHOLDS.LOW,  // ≈ 0.691 minimum pass
    tier: classifyTier(composite),
    breakdown: formatBreakdown(scores),
  };
}

/**
 * Score and rank multiple candidates from Arena Mode.
 * Returns sorted results with the winner identified.
 *
 * @param {Array} candidates - Array of candidate outputs from Arena
 * @param {object} evaluationContext - Shared evaluation context
 * @returns {object} Ranked results with winner
 */
function judgeArenaResults(candidates, evaluationContext = {}) {
  if (!candidates || candidates.length === 0) {
    throw new Error('Judge requires at least 1 candidate');
  }

  // Score each candidate
  const results = candidates.map(candidate =>
    scoreCandidate(candidate, evaluationContext),
  );

  // Sort by composite score (highest first)
  results.sort((a, b) => b.composite - a.composite);

  // Determine winner — must beat runner-up by ≥ 5% (MASTER_DIRECTIVES §7.2)
  const winner = results[0];
  const runnerUp = results.length > 1 ? results[1] : null;
  const margin = runnerUp ? winner.composite - runnerUp.composite : 1.0;
  const clearWinner = margin >= 0.05;

  return {
    winner: clearWinner ? winner : null,
    rankings: results,
    margin,
    clearWinner,
    totalCandidates: candidates.length,
    passCount: results.filter(r => r.passed).length,
    averageComposite: results.reduce((s, r) => s + r.composite, 0) / results.length,
    deterministic: true,
    criteria: JUDGE_WEIGHTS,
  };
}

// ── Individual Criterion Evaluators ──────────────────────────────────────────

function evaluateCorrectness(output, expectedOutput, testResults) {
  let score = 0.5; // Default: unknown correctness

  // If test results are provided, use them directly
  if (testResults) {
    const { passed = 0, total = 1 } = testResults;
    score = total > 0 ? passed / total : 0.5;
  }
  // If expected output available, compare
  else if (expectedOutput && output) {
    // Use embedding similarity if both are strings
    if (typeof output === 'string' && typeof expectedOutput === 'string') {
      // Exact match
      if (output === expectedOutput) return 1.0;
      // Partial match via normalized edit distance
      score = 1 - (levenshteinDistance(output, expectedOutput) /
        Math.max(output.length, expectedOutput.length, 1));
    }
    // Structural comparison for objects
    else if (typeof output === 'object' && typeof expectedOutput === 'object') {
      score = structuralSimilarity(output, expectedOutput);
    }
  }

  return clamp(score, 0, 1);
}

function evaluateSafety(output, securityChecks) {
  // Perfect safety by default — deduct for violations
  let score = 1.0;

  if (securityChecks) {
    const { vulnerabilities = [], warnings = [], passed = true } = securityChecks;

    // Critical vulnerabilities: -0.3 each
    score -= vulnerabilities.filter(v => v.severity === 'critical').length * 0.3;
    // High vulnerabilities: -0.2 each
    score -= vulnerabilities.filter(v => v.severity === 'high').length * 0.2;
    // Medium vulnerabilities: -0.1 each
    score -= vulnerabilities.filter(v => v.severity === 'medium').length * 0.1;
    // Warnings: -0.05 each
    score -= warnings.length * 0.05;

    if (!passed) score = Math.min(score, 0.3);
  }

  return clamp(score, 0, 1);
}

function evaluatePerformance(metrics, baseline) {
  if (!metrics) return 0.5;

  let score = 0.7; // Default: acceptable performance

  if (baseline) {
    // Compare latency (lower is better)
    if (metrics.latencyMs != null && baseline.latencyMs != null) {
      const ratio = baseline.latencyMs / Math.max(metrics.latencyMs, 1);
      score = clamp(ratio * PSI + (1 - PSI), 0, 1); // phi-scaled comparison
    }
    // Compare memory usage (lower is better)
    if (metrics.memoryMB != null && baseline.memoryMB != null) {
      const memRatio = baseline.memoryMB / Math.max(metrics.memoryMB, 1);
      score = (score + clamp(memRatio * PSI + (1 - PSI), 0, 1)) / 2;
    }
  } else if (metrics.latencyMs != null) {
    // No baseline — score relative to phi-scaled thresholds
    if (metrics.latencyMs < 100) score = 1.0;
    else if (metrics.latencyMs < 500) score = 0.9;
    else if (metrics.latencyMs < 2000) score = 0.75;
    else if (metrics.latencyMs < 10000) score = 0.5;
    else score = 0.3;
  }

  return clamp(score, 0, 1);
}

function evaluateQuality(output, qualityChecks) {
  let score = 0.7;

  if (qualityChecks) {
    const { lintErrors = 0, typeErrors = 0, complexity = 'medium', coverage = 0 } = qualityChecks;

    // Deduct for lint/type errors
    score -= lintErrors * 0.05;
    score -= typeErrors * 0.1;

    // Bonus for coverage
    score += (coverage / 100) * 0.2;

    // Complexity penalty
    if (complexity === 'high') score -= 0.15;
    else if (complexity === 'very_high') score -= 0.3;
    else if (complexity === 'low') score += 0.1;
  }

  return clamp(score, 0, 1);
}

function evaluateElegance(output, complexityMetrics) {
  let score = 0.7;

  if (complexityMetrics) {
    const { cyclomaticComplexity = 5, linesOfCode = 100, functionCount = 5 } = complexityMetrics;

    // Lower complexity = more elegant
    if (cyclomaticComplexity <= 3) score += 0.2;
    else if (cyclomaticComplexity <= 8) score += 0.1;
    else if (cyclomaticComplexity > 20) score -= 0.2;

    // Conciseness bonus (fewer lines for same function count)
    const linesPerFunction = linesOfCode / Math.max(functionCount, 1);
    if (linesPerFunction < 10) score += 0.1;
    else if (linesPerFunction > 50) score -= 0.1;
  }

  return clamp(score, 0, 1);
}

// ── Composite Score Computation ─────────────────────────────────────────────

function computeComposite(scores) {
  let composite = 0;
  for (const [criterion, weight] of Object.entries(JUDGE_WEIGHTS)) {
    const score = scores[criterion] ?? 0.5;
    composite += score * weight;
  }
  return Math.round(composite * 1000) / 1000; // 3 decimal places
}

function classifyTier(composite) {
  if (composite >= CSL_THRESHOLDS.CRITICAL) return 'EXCEPTIONAL';
  if (composite >= CSL_THRESHOLDS.HIGH)     return 'EXCELLENT';
  if (composite >= CSL_THRESHOLDS.MEDIUM)   return 'GOOD';
  if (composite >= CSL_THRESHOLDS.LOW)      return 'ACCEPTABLE';
  if (composite >= CSL_THRESHOLDS.MINIMUM)  return 'MARGINAL';
  return 'INSUFFICIENT';
}

function formatBreakdown(scores) {
  return Object.entries(JUDGE_WEIGHTS).map(([criterion, weight]) => ({
    criterion,
    weight,
    score: scores[criterion] ?? 0,
    weighted: Math.round((scores[criterion] ?? 0) * weight * 1000) / 1000,
  }));
}

// ── Utility Functions ────────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function structuralSimilarity(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const allKeys = new Set([...keysA, ...keysB]);
  let matches = 0;
  for (const key of allKeys) {
    if (key in a && key in b) {
      if (JSON.stringify(a[key]) === JSON.stringify(b[key])) matches++;
      else matches += 0.5;
    }
  }
  return allKeys.size > 0 ? matches / allKeys.size : 0.5;
}

module.exports = {
  scoreCandidate,
  judgeArenaResults,
  JUDGE_WEIGHTS,
  computeComposite,
  classifyTier,
};
