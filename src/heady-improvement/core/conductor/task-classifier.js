/**
 * @heady/conductor — Task Classifier
 * 
 * Classifies incoming tasks into domains and routes to appropriate
 * resource pools using CSL cosine-similarity routing.
 * No priority ranking — uses capability-based semantic matching.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { PHI, PSI, PSI2, FIB, phiThreshold, cslGate } from '@heady/phi-math-foundation';

/** Domain definitions — maps to node capabilities */
const DOMAINS = Object.freeze({
  CODE_GENERATION:  { id: 'code_generation',  nodes: ['JULES', 'BUILDER', 'HeadyCoder'],  pool: 'hot' },
  CODE_REVIEW:      { id: 'code_review',      nodes: ['OBSERVER', 'HeadyAnalyze'],        pool: 'hot' },
  SECURITY:         { id: 'security',          nodes: ['MURPHY', 'CIPHER', 'HeadyRisks'],  pool: 'hot' },
  ARCHITECTURE:     { id: 'architecture',      nodes: ['ATLAS', 'PYTHIA', 'HeadyVinci'],   pool: 'hot' },
  RESEARCH:         { id: 'research',          nodes: ['HeadyResearch', 'SOPHIA'],          pool: 'warm' },
  DOCUMENTATION:    { id: 'documentation',     nodes: ['ATLAS', 'HeadyCodex'],              pool: 'warm' },
  CREATIVE:         { id: 'creative',          nodes: ['MUSE', 'NOVA'],                     pool: 'warm' },
  TRANSLATION:      { id: 'translation',       nodes: ['BRIDGE'],                           pool: 'warm' },
  MONITORING:       { id: 'monitoring',        nodes: ['OBSERVER', 'LENS', 'SENTINEL'],     pool: 'warm' },
  CLEANUP:          { id: 'cleanup',           nodes: ['JANITOR', 'HeadyMaid'],             pool: 'cold' },
  ANALYTICS:        { id: 'analytics',         nodes: ['HeadyPatterns', 'HeadyMC'],         pool: 'cold' },
  MAINTENANCE:      { id: 'maintenance',       nodes: ['HeadyMaintenance'],                  pool: 'cold' },
});

/** Resource pool allocations — phi-derived percentages */
const POOLS = Object.freeze({
  hot:        { allocation: 0.34, timeoutMs: FIB[9] * 1000,   description: 'User-facing, latency-critical' },
  warm:       { allocation: 0.21, timeoutMs: FIB[12] * 1000,  description: 'Important background work' },
  cold:       { allocation: 0.13, timeoutMs: FIB[14] * 1000,  description: 'Batch processing, analytics' },
  reserve:    { allocation: 0.08, timeoutMs: FIB[11] * 1000,  description: 'Burst capacity' },
  governance: { allocation: 0.05, timeoutMs: FIB[13] * 1000,  description: 'Always-on checks' },
});
// Allocations sum to ~0.81 (leaves headroom for overhead)

/**
 * Domain keyword embeddings — lightweight semantic matching
 * Each domain has a signature vector of keyword relevance scores
 */
const DOMAIN_SIGNATURES = Object.freeze({
  code_generation:  ['code', 'build', 'implement', 'create', 'generate', 'write', 'function', 'class', 'module'],
  code_review:      ['review', 'analyze', 'lint', 'quality', 'refactor', 'inspect', 'audit', 'improve'],
  security:         ['security', 'vulnerability', 'auth', 'encrypt', 'token', 'certificate', 'attack', 'pentest'],
  architecture:     ['architecture', 'design', 'system', 'topology', 'scale', 'pattern', 'blueprint', 'plan'],
  research:         ['research', 'investigate', 'explore', 'survey', 'study', 'compare', 'evaluate'],
  documentation:    ['document', 'readme', 'guide', 'tutorial', 'reference', 'api-doc', 'specification'],
  creative:         ['creative', 'design', 'visual', 'ux', 'ui', 'prototype', 'mockup', 'animation'],
  translation:      ['translate', 'localize', 'i18n', 'language', 'convert', 'port'],
  monitoring:       ['monitor', 'observe', 'alert', 'metric', 'dashboard', 'health', 'status'],
  cleanup:          ['cleanup', 'remove', 'delete', 'prune', 'garbage', 'deprecate', 'archive'],
  analytics:        ['analytics', 'report', 'insight', 'pattern', 'trend', 'forecast', 'statistics'],
  maintenance:      ['maintenance', 'update', 'patch', 'upgrade', 'migrate', 'fix', 'repair'],
});

/**
 * Compute keyword overlap score between task description and domain signature.
 * Returns a score in [0, 1] — used as CSL gate input.
 */
function computeDomainRelevance(taskText, domainKeywords) {
  const words = taskText.toLowerCase().split(/\W+/).filter(Boolean);
  const uniqueWords = new Set(words);
  let matches = 0;
  for (const keyword of domainKeywords) {
    if (uniqueWords.has(keyword)) matches++;
    // Partial match for compound words
    for (const word of uniqueWords) {
      if (word.includes(keyword) || keyword.includes(word)) {
        matches += PSI2; // Partial match weighted at ψ²
      }
    }
  }
  return Math.min(1, matches / domainKeywords.length);
}

/**
 * Classify a task into a domain with confidence score
 */
function classifyTask(taskDescription) {
  const scores = [];

  for (const [domainId, keywords] of Object.entries(DOMAIN_SIGNATURES)) {
    const rawScore = computeDomainRelevance(taskDescription, keywords);
    const gatedScore = cslGate(rawScore, rawScore, phiThreshold(0)); // Minimum gate
    scores.push({ domainId, rawScore, gatedScore });
  }

  // Sort by gated score (highest first)
  scores.sort((a, b) => b.gatedScore - a.gatedScore);

  const bestMatch = scores[0];
  const domain = DOMAINS[bestMatch.domainId.toUpperCase()] ||
    Object.values(DOMAINS).find(d => d.id === bestMatch.domainId);

  return {
    domain: domain || DOMAINS.CODE_GENERATION, // Default to code gen
    confidence: bestMatch.gatedScore,
    allScores: scores.slice(0, FIB[5]), // Top 5 matches
    pool: POOLS[(domain || DOMAINS.CODE_GENERATION).pool],
  };
}

/**
 * Select optimal node(s) within a domain
 * Uses round-robin with health weighting
 */
function selectNodes(domain, nodeHealthMap = {}, count = 1) {
  const candidates = domain.nodes.filter(node => {
    const health = nodeHealthMap[node];
    if (!health) return true; // Unknown = assume healthy
    return health.score > phiThreshold(1); // Above LOW threshold
  });

  if (candidates.length === 0) {
    // All nodes unhealthy — fall back to full list
    return domain.nodes.slice(0, count);
  }

  // Sort by health score descending, take top N
  return candidates
    .sort((a, b) => {
      const ha = nodeHealthMap[a]?.score || PSI;
      const hb = nodeHealthMap[b]?.score || PSI;
      return hb - ha;
    })
    .slice(0, count);
}

export {
  classifyTask,
  selectNodes,
  computeDomainRelevance,
  DOMAINS,
  POOLS,
  DOMAIN_SIGNATURES,
};
