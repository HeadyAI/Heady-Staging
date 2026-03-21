/**
 * © 2026-2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * InstructionPatternLearner — HeadyVinci's Memory of Repeated Commands
 *
 * Detects repeated user instructions, builds automation rules, and enables
 * HeadyVinci to auto-handle known patterns without requiring the user to
 * repeat themselves. Learns from success/failure feedback to improve over time.
 *
 * Architecture:
 *   1. Fingerprint: Normalize → hash instructions for semantic dedup
 *   2. Track: Count occurrences, timestamps, contexts
 *   3. Promote: When threshold met → create AutomationRule
 *   4. Execute: Match incoming instructions → auto-apply rules
 *   5. Learn: φ-weighted confidence adjustments from outcomes
 *
 * @module intelligence/instruction-pattern-learner
 */

'use strict';
const logger = require(require('path').resolve(__dirname, '..', 'utils', 'logger')) || console;

const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { EventEmitter } = require('events');

const PHI = 1.6180339887;

// ─── Constants ────────────────────────────────────────────────────────────────

const REPEAT_THRESHOLD        = 2;   // Flag as repeated after N occurrences
const AUTOMATION_THRESHOLD    = 3;   // Auto-create rule after N occurrences
const CONFIDENCE_FLOOR        = 0.3; // Minimum confidence before rule is retired
const CONFIDENCE_CEILING      = 0.99;
const PHI_BOOST               = 1 / PHI;   // ~0.618 — golden ratio decay/boost
const STATE_FILE              = path.resolve(__dirname, '../../packages/shared/state/instruction_patterns.json');
const MAX_PATTERNS            = 500; // Prevent unbounded growth

// ─── Stopwords for fingerprinting ─────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'its', 'his', 'her', 'that', 'this', 'these', 'those',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'just', 'also', 'then', 'than', 'very', 'too', 'quite', 'rather',
  'all', 'each', 'every', 'any', 'few', 'more', 'most', 'some', 'such',
  'no', 'only', 'own', 'same', 'other', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'if', 'because', 'as', 'until', 'while',
  'make', 'sure', 'please', 'fix', 'don\'t', 'dont', 'fuckin', 'fucking',
  'shit', 'damn', 'know', 'many', 'times', 'again', 'already', 'told',
]);

// ─── Pre-seeded patterns from real user repeats ───────────────────────────────

const SEED_PATTERNS = [
  {
    id: 'domain_headybuddy_correction',
    canonical: 'headybuddy.com must be headybuddy.org',
    keywords: ['headybuddy', 'headybuddy.com', 'headybuddy.org', 'domain', 'wrong'],
    category: 'domain_correction',
    resolution: {
      type: 'find_replace',
      find: 'headybuddy.com',
      replace: 'headybuddy.org',
      scope: 'codebase',
      command: "grep -rl 'headybuddy\\.com' src/ workers/ --include='*.js' --include='*.ts' --include='*.json' --include='*.yaml' | xargs sed -i 's/headybuddy\\.com/headybuddy.org/g'",
    },
    confidence: 0.95,
    occurrences: 5, // User has said this at least 5 times
  },
  {
    id: 'domain_headysense_correction',
    canonical: 'headysense.com must be headylens.com',
    keywords: ['headysense', 'headysense.com', 'headylens', 'domain', 'wrong'],
    category: 'domain_correction',
    resolution: {
      type: 'find_replace',
      find: 'headysense.com',
      replace: 'headylens.com',
      scope: 'codebase',
      command: "grep -rl 'headysense\\.com' src/ workers/ --include='*.js' --include='*.ts' --include='*.json' --include='*.yaml' | xargs sed -i 's/headysense\\.com/headylens.com/g'",
    },
    confidence: 0.95,
    occurrences: 4,
  },
  {
    id: 'domain_heady_ai_alias',
    canonical: 'heady-ai.com should serve heady-ai.com content',
    keywords: ['headyai', 'heady-ai.com', 'heady-ai', 'alias', '403'],
    category: 'domain_alias',
    resolution: {
      type: 'code_edit',
      file: 'src/core/dynamic-site-server.js',
      action: 'ensure heady-ai.com is aliased to heady-ai.com in DOMAIN_ALIASES',
    },
    confidence: 0.9,
    occurrences: 3,
  },
  {
    id: 'domain_ownership_assertion',
    canonical: 'user owns headybuddy.org and heady-ai.com, NOT headybuddy.com or headysense.com',
    keywords: ['own', 'headybuddy', 'heady-ai', 'not', 'headybuddy.com'],
    category: 'domain_ownership',
    resolution: {
      type: 'knowledge',
      facts: {
        owned: ['headybuddy.org', 'heady-ai.com', 'headyme.com', 'headysystems.com', 'headyio.com', 'headybot.com', 'headyapi.com', 'headymcp.com', 'headylens.com', 'headyfinance.com', 'headyconnection.org'],
        not_owned: ['headybuddy.com', 'headysense.com', 'heady-ai.com'],
      },
    },
    confidence: 1.0,
    occurrences: 6,
  },
  {
    id: 'gcloud_auth_expired',
    canonical: 'gcloud auth token expired, need to re-authenticate',
    keywords: ['gcloud', 'auth', 'expired', 'token', 'login', 'reauthentication'],
    category: 'infrastructure',
    resolution: {
      type: 'command',
      command: 'gcloud auth login',
      followUp: 'Re-run the failed deploy command after authentication',
    },
    confidence: 0.85,
    occurrences: 3,
  },
  {
    id: 'lfs_push_before_git_push',
    canonical: 'push LFS objects before regular git push to avoid pre-receive hook rejection',
    keywords: ['lfs', 'push', 'pre-receive', 'rejected', 'git'],
    category: 'git_workflow',
    resolution: {
      type: 'command_sequence',
      commands: [
        'git lfs push --all {remote}',
        'git push {remote} main',
      ],
    },
    confidence: 0.9,
    occurrences: 4,
  },
  {
    id: 'push_all_remotes',
    canonical: 'push to all remotes: azure-main, hc-main, headyai',
    keywords: ['push', 'all', 'remotes', 'azure', 'hc-main', 'headyai'],
    category: 'git_workflow',
    resolution: {
      type: 'command_sequence',
      commands: [
        'git push azure-main main',
        'git lfs push --all hc-main && git push hc-main main',
        'git lfs push --all headyai && git push headyai main',
      ],
    },
    confidence: 0.85,
    occurrences: 3,
  },
  {
    id: 'deploy_headyweb',
    canonical: 'deploy headyweb Cloud Run service from source',
    keywords: ['deploy', 'headyweb', 'cloud run', 'source'],
    category: 'deployment',
    resolution: {
      type: 'command',
      command: 'gcloud run deploy headyweb --project=gen-lang-client-0920560496 --region=us-central1 --source=. --allow-unauthenticated --port=8080 --quiet',
    },
    confidence: 0.85,
    occurrences: 3,
  },
];

// ─── InstructionPatternLearner ────────────────────────────────────────────────

class InstructionPatternLearner extends EventEmitter {
  constructor(options = {}) {
    super();

    /** @type {Map<string, PatternRecord>} fingerprint → PatternRecord */
    this._patterns = new Map();

    /** @type {Map<string, AutomationRule>} ruleId → AutomationRule */
    this._automationRules = new Map();

    /** @type {{ totalRecorded: number, rulesCreated: number, autoExecutions: number, successRate: number }} */
    this._stats = { totalRecorded: 0, rulesCreated: 0, autoExecutions: 0, successRate: 1.0 };

    this._repeatThreshold     = options.repeatThreshold     || REPEAT_THRESHOLD;
    this._automationThreshold = options.automationThreshold || AUTOMATION_THRESHOLD;
    this._stateFile           = options.stateFile           || STATE_FILE;

    // Load persisted state
    this._loadState();

    // Seed known patterns
    this._seedPatterns();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Record a user instruction with context and outcome.
   * This is the primary learning input.
   *
   * @param {string} instruction   - Raw user instruction text
   * @param {object} [context={}]  - Context (files, domain, timestamp)
   * @param {string} [outcome]     - 'success' | 'failure' | 'partial' | null
   * @returns {{ fingerprint: string, isRepeated: boolean, automationSuggested: boolean }}
   */
  record(instruction, context = {}, outcome = null) {
    const fingerprint = this._fingerprint(instruction);
    const keywords    = this._extractKeywords(instruction);

    let record = this._patterns.get(fingerprint);

    if (record) {
      // Existing pattern — increment
      record.occurrences += 1;
      record.lastSeen = Date.now();
      record.history.push({ timestamp: Date.now(), context, outcome });
      if (record.history.length > 50) record.history = record.history.slice(-50); // Bounded
    } else {
      // New pattern
      record = {
        fingerprint,
        canonical: instruction.trim(),
        keywords,
        occurrences: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        history: [{ timestamp: Date.now(), context, outcome }],
        confidence: 0.5,
        automationRuleId: null,
      };
      this._patterns.set(fingerprint, record);
    }

    this._stats.totalRecorded += 1;

    const isRepeated = record.occurrences >= this._repeatThreshold;
    let automationSuggested = false;

    // Check if we should promote to automation rule
    if (record.occurrences >= this._automationThreshold && !record.automationRuleId) {
      automationSuggested = true;
      this._promoteToAutomation(record);
    }

    // Emit events
    if (isRepeated && record.occurrences === this._repeatThreshold) {
      this.emit('pattern:repeated', {
        fingerprint,
        canonical: record.canonical,
        occurrences: record.occurrences,
      });
    }

    // Auto-save periodically
    if (this._stats.totalRecorded % 10 === 0) this.save();

    return { fingerprint, isRepeated, automationSuggested };
  }

  /**
   * Match an incoming instruction against known patterns and automation rules.
   * Returns the best matching rule or null.
   *
   * @param {string} instruction
   * @returns {AutomationRule|null}
   */
  match(instruction) {
    const fingerprint = this._fingerprint(instruction);
    const keywords    = this._extractKeywords(instruction);

    // Direct fingerprint match
    const record = this._patterns.get(fingerprint);
    if (record && record.automationRuleId) {
      const rule = this._automationRules.get(record.automationRuleId);
      if (rule && rule.confidence >= CONFIDENCE_FLOOR) {
        return rule;
      }
    }

    // Keyword similarity match across all rules
    let bestRule   = null;
    let bestScore  = 0;

    for (const rule of this._automationRules.values()) {
      if (rule.confidence < CONFIDENCE_FLOOR) continue;

      const score = this._keywordSimilarity(keywords, rule.keywords);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestRule  = rule;
      }
    }

    return bestRule;
  }

  /**
   * Provide feedback on an automation rule execution.
   * Adjusts confidence using φ-weighted learning.
   *
   * @param {string} ruleId
   * @param {boolean} success
   */
  feedback(ruleId, success) {
    const rule = this._automationRules.get(ruleId);
    if (!rule) return;

    if (success) {
      // Boost: move toward ceiling by φ ratio
      rule.confidence = Math.min(
        CONFIDENCE_CEILING,
        rule.confidence + (CONFIDENCE_CEILING - rule.confidence) * PHI_BOOST * 0.3,
      );
      rule.successCount += 1;
      this._stats.successRate = this._computeSuccessRate();
    } else {
      // Decay: move toward floor by φ ratio
      rule.confidence = Math.max(
        CONFIDENCE_FLOOR,
        rule.confidence - (rule.confidence - CONFIDENCE_FLOOR) * PHI_BOOST * 0.5,
      );
      rule.failureCount += 1;
      this._stats.successRate = this._computeSuccessRate();
    }

    rule.lastUsed = Date.now();
    this.emit('pattern:feedback', { ruleId, success, confidence: rule.confidence });
  }

  /**
   * Get all automation rules, sorted by confidence.
   * @returns {AutomationRule[]}
   */
  getAutomationRules() {
    return Array.from(this._automationRules.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get a specific automation rule by ID.
   * @param {string} ruleId
   * @returns {AutomationRule|undefined}
   */
  getRule(ruleId) {
    return this._automationRules.get(ruleId);
  }

  /**
   * Get all tracked patterns, sorted by occurrence count.
   * @param {number} [limit=20]
   * @returns {PatternRecord[]}
   */
  getPatterns(limit = 20) {
    return Array.from(this._patterns.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  /**
   * Get learning statistics.
   * @returns {object}
   */
  getStats() {
    return {
      ...this._stats,
      patternCount: this._patterns.size,
      ruleCount: this._automationRules.size,
      topRepeated: this.getPatterns(5).map(p => ({
        canonical: p.canonical.slice(0, 80),
        occurrences: p.occurrences,
      })),
    };
  }

  /**
   * Suggest automation for a repeated instruction.
   * @param {string} instruction
   * @returns {{ suggested: boolean, reason: string, rule: AutomationRule|null }}
   */
  suggestAutomation(instruction) {
    const fingerprint = this._fingerprint(instruction);
    const record = this._patterns.get(fingerprint);

    if (!record) return { suggested: false, reason: 'No matching pattern found', rule: null };
    if (record.automationRuleId) {
      return {
        suggested: true,
        reason: `Already automated (${record.occurrences} occurrences)`,
        rule: this._automationRules.get(record.automationRuleId),
      };
    }
    if (record.occurrences >= this._repeatThreshold) {
      return {
        suggested: true,
        reason: `Repeated ${record.occurrences} times — automation recommended`,
        rule: null,
      };
    }

    return { suggested: false, reason: `Only ${record.occurrences} occurrence(s) — tracking`, rule: null };
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  /**
   * Save learned patterns and rules to disk.
   */
  save() {
    try {
      const state = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        patterns: Object.fromEntries(this._patterns),
        automationRules: Object.fromEntries(this._automationRules),
        stats: this._stats,
      };

      const dir = path.dirname(this._stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(this._stateFile, JSON.stringify(state, null, 2));
      this.emit('state:saved', { file: this._stateFile, patternCount: this._patterns.size });
    } catch (err) { // Non-fatal — log and continue
      this.emit('state:save_error', { error: err.message });
    }
  }

  // ─── Private Methods ────────────────────────────────────────────────────────

  /**
   * Load persisted state from disk.
   */
  _loadState() {
    try {
      if (fs.existsSync(this._stateFile)) {
        const raw = JSON.parse(fs.readFileSync(this._stateFile, 'utf8'));
        if (raw.patterns) {
          for (const [k, v] of Object.entries(raw.patterns)) {
            this._patterns.set(k, v);
          }
        }
        if (raw.automationRules) {
          for (const [k, v] of Object.entries(raw.automationRules)) {
            this._automationRules.set(k, v);
          }
        }
        if (raw.stats) this._stats = { ...this._stats, ...raw.stats };
      }
    } catch {
      // Fresh state if file is corrupt
    }
  }

  /**
   * Seed known patterns from real user history.
   */
  _seedPatterns() {
    for (const seed of SEED_PATTERNS) {
      if (this._automationRules.has(seed.id)) continue; // Don't double-seed

      this._automationRules.set(seed.id, {
        id: seed.id,
        canonical: seed.canonical,
        keywords: seed.keywords,
        category: seed.category,
        resolution: seed.resolution,
        confidence: seed.confidence,
        occurrences: seed.occurrences,
        successCount: seed.occurrences, // Assume all past were successful
        failureCount: 0,
        createdAt: Date.now(),
        lastUsed: null,
        source: 'seed',
      });
    }
  }

  /**
   * Normalize instruction → stable fingerprint hash.
   * Strips casing, punctuation, stopwords, collapses whitespace.
   */
  _fingerprint(instruction) {
    const normalized = instruction
      .toLowerCase()
      .replace(/[^a-z0-9\s.-]/g, ' ')  // Keep dots and hyphens for domains
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w))
      .sort()
      .join(' ');

    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Extract meaningful keywords from instruction.
   */
  _extractKeywords(instruction) {
    return instruction
      .toLowerCase()
      .replace(/[^a-z0-9\s.@-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  /**
   * Compute keyword similarity (Jaccard index).
   */
  _keywordSimilarity(keywordsA, keywordsB) {
    const setA = new Set(keywordsA);
    const setB = new Set(keywordsB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Promote a repeated pattern to an automation rule.
   */
  _promoteToAutomation(record) {
    const ruleId = `rule-${record.fingerprint.slice(0, 8)}-${Date.now()}`;

    const rule = {
      id: ruleId,
      canonical: record.canonical,
      keywords: record.keywords,
      category: 'learned',
      resolution: {
        type: 'repeat_instruction',
        instruction: record.canonical,
      },
      confidence: Math.min(CONFIDENCE_CEILING, 0.5 + record.occurrences * 0.1),
      occurrences: record.occurrences,
      successCount: 0,
      failureCount: 0,
      createdAt: Date.now(),
      lastUsed: null,
      source: 'learned',
    };

    this._automationRules.set(ruleId, rule);
    record.automationRuleId = ruleId;
    this._stats.rulesCreated += 1;

    this.emit('pattern:automated', {
      ruleId,
      canonical: record.canonical,
      occurrences: record.occurrences,
      confidence: rule.confidence,
    });

    // Enforce max patterns
    if (this._patterns.size > MAX_PATTERNS) {
      this._pruneOldPatterns();
    }

    return rule;
  }

  /**
   * Remove oldest, lowest-confidence patterns to stay under MAX_PATTERNS.
   */
  _pruneOldPatterns() {
    const sorted = Array.from(this._patterns.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);

    const toRemove = sorted.slice(0, sorted.length - MAX_PATTERNS);
    for (const [key] of toRemove) {
      this._patterns.delete(key);
    }
  }

  /**
   * Compute overall success rate across all rules.
   */
  _computeSuccessRate() {
    let totalSuccess = 0;
    let totalAttempts = 0;
    for (const rule of this._automationRules.values()) {
      totalSuccess  += rule.successCount;
      totalAttempts += rule.successCount + rule.failureCount;
    }
    return totalAttempts > 0 ? totalSuccess / totalAttempts : 1.0;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { InstructionPatternLearner, SEED_PATTERNS, PHI };
