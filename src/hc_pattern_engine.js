// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/hc_pattern_engine.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HC PATTERN ENGINE - Continuous Pattern Recognition              ║
 * ║  Sacred Geometry Architecture v3.0.0                             ║
 * ║                                                                   ║
 * ║  Detects, names, records, and evolves patterns across:            ║
 * ║    • Performance (bottlenecks, latency, parallelism)              ║
 * ║    • Reliability (error bursts, flaky spans, precursors)          ║
 * ║    • Usage (user flows, repeated prompts, preferences)            ║
 * ║    • Success (fast configs, winning strategies, locked plans)     ║
 * ║                                                                   ║
 * ║  Standing rule: stagnant patterns are bugs. Patterns must         ║
 * ║  continuously improve until proven optimal, then periodically     ║
 * ║  re-checked as capabilities change.                               ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

const { EventEmitter } = require("events");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const ColorfulLogger = require("./hc_colorful_logger");
const log = new ColorfulLogger({ level: "info" });

const PATTERN_STORE_PATH = path.join(__dirname, "..", ".heady_cache", "pattern_store.json");
const MAX_PATTERNS = 500;
const MAX_OBSERVATIONS_PER_PATTERN = 200;
const CONVERGENCE_CV_MAX = 0.05;
const CONVERGENCE_MIN_SAMPLES = 20;
const STAGNATION_CHECK_WINDOW = 20;
const IMPROVEMENT_THRESHOLD = 0.02; // 2% improvement to count as "improving"

// ─── ADAPTIVE INTERVALS ──────────────────────────────────────────────
const ANALYSIS_INTERVAL_MS = 120000; // 2 minutes (was 30s)
const SAVE_DEBOUNCE_MS = 5000; // 5s (was 2s)

// ─── PATTERN CATEGORIES ──────────────────────────────────────────────

const CATEGORY = {
  PERFORMANCE: "performance",
  RELIABILITY: "reliability",
  USAGE: "usage",
  SUCCESS: "success",
};

// ─── PATTERN STATES ──────────────────────────────────────────────────

const STATE = {
  DETECTED: "detected",         // Just noticed
  ACTIVE: "active",             // Being tracked and experimented on
  IMPROVING: "improving",       // Metrics trending better
  STAGNANT: "stagnant",         // Not improving — treated as a bug
  CONVERGED: "converged",       // Proven near-optimal, review periodically
  DEGRADING: "degrading",       // Getting worse — action required
  LOCKED: "locked",             // Manually locked by user (rare)
};

// ─── PERSISTENCE (ASYNC) ─────────────────────────────────────────────

function loadPatternStore() {
  try {
    if (fs.existsSync(PATTERN_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(PATTERN_STORE_PATH, "utf8"));
    }
  } catch (err) { log.warning("Failed to load pattern store", { path: PATTERN_STORE_PATH, error: err.message }); }
  return { patterns: {}, metadata: { created: new Date().toISOString(), version: "1.0.0" } };
}

async function savePatternStoreAsync(store) {
  try {
    const dir = path.dirname(PATTERN_STORE_PATH);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(PATTERN_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (_) {}
}

// Legacy sync version for shutdown hooks
function savePatternStore(store) {
  try {
    const dir = path.dirname(PATTERN_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PATTERN_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) { log.warning("Failed to save pattern store sync", { path: PATTERN_STORE_PATH, error: err.message }); }
}

// ─── STATISTICS HELPERS ──────────────────────────────────────────────

function quickStats(values) {
  if (!values || values.length === 0) return { mean: 0, median: 0, stddev: 0, min: 0, max: 0, n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  return {
    mean,
    median: sorted[Math.floor(n / 2)],
    stddev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[n - 1],
    n,
  };
}

function trend(values, windowSize = 10) {
  if (values.length < windowSize * 2) return "insufficient_data";
  const older = values.slice(-windowSize * 2, -windowSize);
  const newer = values.slice(-windowSize);
  const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
  const newerMean = newer.reduce((a, b) => a + b, 0) / newer.length;
  if (olderMean === 0) return "stable";
  const change = (newerMean - olderMean) / olderMean;
  if (change < -IMPROVEMENT_THRESHOLD) return "improving";
  if (change > IMPROVEMENT_THRESHOLD) return "degrading";
  return "stable";
}

// ─── PATTERN ENGINE CLASS ────────────────────────────────────────────

class HCPatternEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.store = loadPatternStore();
    this.analysisInterval = null;
    this.analysisIntervalMs = options.analysisIntervalMs || ANALYSIS_INTERVAL_MS; // 2 min default
    this._observationBuffer = [];
    this._improvementTasks = [];
    this._isRunning = false;
  }

  // ─── Start continuous analysis ─────────────────────────────────────

  start() {
    if (this.analysisInterval) return;
    this.analysisInterval = setInterval(() => {
      this._runAnalysisCycle().catch(() => {});
    }, this.analysisIntervalMs);
    // Immediate first cycle (async)
    this._runAnalysisCycle().catch(() => {});
    this.emit("engine:started");
  }

  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.emit("engine:stopped");
  }

  // ─── Observe: ingest a data point ──────────────────────────────────

  observe(category, name, value, metadata = {}) {
    if (typeof category !== "string" || typeof name !== "string") {
      throw new Error(`observe() requires string category and name, got: ${typeof category}, ${typeof name}`);
    }
    const patternId = this._patternId(category, name);

    if (!this.store.patterns[patternId]) {
      this.store.patterns[patternId] = {
        id: patternId,
        category,
        name,
        state: STATE.DETECTED,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        observations: [],
        stats: null,
        trend: "insufficient_data",
        improvementAttempts: 0,
        lastImproved: null,
        convergedAt: null,
        reviewAfter: null,
        metadata: {},
        tags: [],
      };
      this.emit("pattern:detected", { id: patternId, category, name });
    }

    const pattern = this.store.patterns[patternId];
    pattern.observations.push({
      value,
      ts: new Date().toISOString(),
      ...metadata,
    });

    // Ring buffer
    if (pattern.observations.length > MAX_OBSERVATIONS_PER_PATTERN) {
      pattern.observations = pattern.observations.slice(-MAX_OBSERVATIONS_PER_PATTERN);
    }

    pattern.lastUpdated = new Date().toISOString();

    // Merge metadata tags
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        if (!pattern.tags.includes(tag)) pattern.tags.push(tag);
      }
    }

    // Evict oldest patterns if over limit
    const patternIds = Object.keys(this.store.patterns);
    if (patternIds.length > MAX_PATTERNS) {
      const sorted = patternIds
        .map(id => ({ id, updated: this.store.patterns[id].lastUpdated }))
        .sort((a, b) => new Date(a.updated) - new Date(b.updated));
      for (let i = 0; i < patternIds.length - MAX_PATTERNS; i++) {
        delete this.store.patterns[sorted[i].id];
      }
    }

    this._bufferSave();
    return pattern;
  }

  // ─── Observe a latency sample (convenience) ────────────────────────

  observeLatency(source, latencyMs, metadata = {}) {
    return this.observe(CATEGORY.PERFORMANCE, `latency:${source}`, latencyMs, metadata);
  }

  // ─── Observe an error event ────────────────────────────────────────

  observeError(source, errorMsg, metadata = {}) {
    return this.observe(CATEGORY.RELIABILITY, `error:${source}`, 1, { ...metadata, errorMsg });
  }

  // ─── Observe a success event ───────────────────────────────────────

  observeSuccess(source, latencyMs, metadata = {}) {
    this.observe(CATEGORY.SUCCESS, `success:${source}`, latencyMs, metadata);
    return this.observe(CATEGORY.PERFORMANCE, `latency:${source}`, latencyMs, metadata);
  }

  // ─── Observe a user action ─────────────────────────────────────────

  observeUserAction(action, metadata = {}) {
    return this.observe(CATEGORY.USAGE, `user:${action}`, 1, metadata);
  }

  // ─── Promote a pattern (user says "notice this") ───────────────────

  promotePattern(category, name, reason = "") {
    const patternId = this._patternId(category, name);
    const pattern = this.store.patterns[patternId];
    if (!pattern) return null;

    pattern.state = STATE.ACTIVE;
    pattern.metadata.promoted = true;
    pattern.metadata.promoteReason = reason;
    pattern.lastUpdated = new Date().toISOString();
    this._bufferSave();
    this.emit("pattern:promoted", { id: patternId, reason });
    return pattern;
  }

  // ─── Lock a pattern (proven optimal, periodic review only) ─────────

  lockPattern(patternId, reviewIntervalObservations = 100) {
    const pattern = this.store.patterns[patternId];
    if (!pattern) return null;

    pattern.state = STATE.LOCKED;
    pattern.convergedAt = new Date().toISOString();
    pattern.reviewAfter = reviewIntervalObservations;
    pattern.lastUpdated = new Date().toISOString();
    this._bufferSave();
    this.emit("pattern:locked", { id: patternId });
    return pattern;
  }

  // ─── Get all patterns ──────────────────────────────────────────────

  getPatterns(filters = {}) {
    let patterns = Object.values(this.store.patterns);

    if (filters.category) {
      patterns = patterns.filter(p => p.category === filters.category);
    }
    if (filters.state) {
      patterns = patterns.filter(p => p.state === filters.state);
    }
    if (filters.tag) {
      patterns = patterns.filter(p => p.tags.includes(filters.tag));
    }

    // Sort by last updated
    patterns.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return patterns.map(p => ({
      id: p.id,
      category: p.category,
      name: p.name,
      state: p.state,
      trend: p.trend,
      observationCount: p.observations.length,
      stats: p.stats,
      lastUpdated: p.lastUpdated,
      convergedAt: p.convergedAt,
      improvementAttempts: p.improvementAttempts,
      tags: p.tags,
    }));
  }

  getPatternsByState(state) {
    return Object.values(this.store.patterns)
      .filter(p => p.state === state)
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        severity: p.metadata?.severity || 'medium',
        details: p
      }));
  }

  // ─── Get a single pattern with full detail ─────────────────────────

  getPattern(patternId) {
    return this.store.patterns[patternId] || null;
  }

  // ─── Get summary statistics ────────────────────────────────────────

  getSummary() {
    const patterns = Object.values(this.store.patterns);
    const byCat = {};
    const byState = {};

    for (const p of patterns) {
      byCat[p.category] = (byCat[p.category] || 0) + 1;
      byState[p.state] = (byState[p.state] || 0) + 1;
    }

    const improving = patterns.filter(p => p.state === STATE.IMPROVING).length;
    const total = patterns.length;
    const improvementRate = total > 0 ? improving / total : 0;

    return {
      totalPatterns: total,
      byCategory: byCat,
      byState: byState,
      improvementRate,
      convergedCount: byState[STATE.CONVERGED] || 0,
      stagnantCount: byState[STATE.STAGNANT] || 0,
      degradingCount: byState[STATE.DEGRADING] || 0,
      improvementTasks: this._improvementTasks.slice(-20),
      ts: new Date().toISOString(),
    };
  }

  // ─── Surface recent patterns (user asks "what patterns do you see") ─

  surfaceRecentPatterns(limit = 10) {
    const patterns = Object.values(this.store.patterns)
      .filter(p => p.observations.length >= 3) // at least 3 observations
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, limit);

    return patterns.map(p => ({
      name: p.name,
      category: p.category,
      state: p.state,
      trend: p.trend,
      summary: this._patternSummary(p),
      observationCount: p.observations.length,
      stats: p.stats,
    }));
  }

  // ─── Get bottleneck patterns ───────────────────────────────────────

  getBottlenecks() {
    return Object.values(this.store.patterns)
      .filter(p =>
        p.category === CATEGORY.PERFORMANCE &&
        (p.state === STATE.STAGNANT || p.state === STATE.DEGRADING) &&
        p.metadata.isBottleneck
      )
      .map(p => ({
        id: p.id,
        name: p.name,
        state: p.state,
        trend: p.trend,
        stats: p.stats,
        suggestion: p.metadata.suggestion || "Optimize or parallelize this path",
      }));
  }

  // ─── Run analysis cycle (called periodically) ──────────────────────

  async _runAnalysisCycle() {
    if (this._isRunning) return; // Prevent overlapping cycles
    this._isRunning = true;
    
    const patterns = Object.values(this.store.patterns);

    for (const pattern of patterns) {
      if (pattern.observations.length < 3) continue;

      // Compute stats on numeric observations
      const values = pattern.observations
        .map(o => typeof o.value === "number" ? o.value : null)
        .filter(v => v !== null);

      if (values.length > 0) {
        pattern.stats = quickStats(values);
        pattern.trend = this._enhancedTrend(values);
      }

      // State machine transitions
      this._transitionState(pattern, values);
    }

    // Detect cross-pattern anomalies
    this._detectAnomalies(patterns);

    // Save (async, non-blocking)
    await savePatternStoreAsync(this.store);

    this._isRunning = false;
    this.emit("analysis:cycle_complete", {
      patternsAnalyzed: patterns.length,
      ts: new Date().toISOString(),
    });
  }

  // ─── Enhanced trend analysis ────────────────────────────────────────
  _enhancedTrend(values, windowSize = 10) {
    if (values.length < windowSize * 2) return "insufficient_data";
    
    // Split into older and newer windows
    const older = values.slice(-windowSize * 2, -windowSize);
    const newer = values.slice(-windowSize);
    
    // Calculate means
    const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
    const newerMean = newer.reduce((a, b) => a + b, 0) / newer.length;
    
    if (olderMean === 0) return "stable";
    
    // Calculate percentage change
    const change = (newerMean - olderMean) / olderMean;
    
    // More sensitive detection for small changes
    if (Math.abs(change) < 0.005) return "flat";
    if (change < -IMPROVEMENT_THRESHOLD) return "improving";
    if (change > IMPROVEMENT_THRESHOLD) return "degrading";
    
    // Detect micro-trends that might indicate stagnation
    const microTrend = this._microTrendAnalysis(values, windowSize);
    if (microTrend === "oscillating" || microTrend === "random") {
      return "unstable";
    }
    
    return "stable";
  }
  
  // ─── Micro-trend analysis ──────────────────────────────────────────
  _microTrendAnalysis(values, windowSize) {
    const segments = [];
    const segmentSize = Math.floor(windowSize / 3);
    
    // Split into 3 segments
    for (let i = 0; i < 3; i++) {
      const start = -windowSize + (i * segmentSize);
      const end = start + segmentSize;
      segments.push(values.slice(start, end));
    }
    
    // Calculate segment means
    const means = segments.map(s => s.reduce((a, b) => a + b, 0) / s.length);
    
    // Detect oscillation (up-down-up or down-up-down)
    if ((means[0] < means[1] && means[1] > means[2]) || 
        (means[0] > means[1] && means[1] < means[2])) {
      return "oscillating";
    }
    
    // Detect randomness (no clear pattern)
    const variance = Math.max(...means) - Math.min(...means);
    if (variance < (means[0] * 0.1)) {
      return "random";
    }
    
    return "unknown";
  }
  
  // ─── Enhanced state transitions with stagnation focus ───────────────
  _transitionState(pattern, values) {
    const prev = pattern.state;
    
    // Skip locked patterns unless review interval reached
    if (pattern.state === STATE.LOCKED) {
      if (pattern.reviewAfter && pattern.observations.length % pattern.reviewAfter === 0) {
        pattern.state = STATE.ACTIVE; // re-check
        this.emit("pattern:review_triggered", { id: pattern.id });
      }
      return;
    }
    
    // Use enhanced trend analysis
    const currentTrend = this._enhancedTrend(values);
    
    switch (currentTrend) {
      case "improving":
        pattern.state = STATE.IMPROVING;
        pattern.lastImproved = new Date().toISOString();
        break;
        
      case "degrading":
        pattern.state = STATE.DEGRADING;
        this._createImprovementTask(pattern, "Pattern is degrading — auto-fix needed");
        break;
        
      case "flat":
        // Explicit flat trend indicates potential stagnation
        if (values.length >= STAGNATION_CHECK_WINDOW) {
          pattern.state = STATE.STAGNANT;
          this._createImprovementTask(pattern, "Pattern is completely flat — strong stagnation signal");
        }
        break;
        
      case "unstable":
        // Unstable patterns need investigation
        pattern.state = STATE.ACTIVE;
        pattern.metadata.needsInvestigation = true;
        break;
        
      case "stable":
        // Check if converged (low variance, sufficient samples)
        if (this._checkConvergence(values)) {
          pattern.state = STATE.CONVERGED;
          pattern.convergedAt = new Date().toISOString();
          pattern.reviewAfter = 100;
          this.emit("pattern:converged", { id: pattern.id, name: pattern.name });
        } else if (pattern.state === STATE.IMPROVING) {
          pattern.state = STATE.ACTIVE;
        } else if ((pattern.state === STATE.ACTIVE || pattern.state === STATE.DETECTED) && 
                   values.length >= STAGNATION_CHECK_WINDOW) {
          pattern.state = STATE.STAGNANT;
          this._createImprovementTask(pattern, "Pattern is stagnant — not optimal, not improving");
        }
        break;
        
      default:
        if (pattern.state === STATE.DETECTED && values.length >= 5) {
          pattern.state = STATE.ACTIVE;
        }
        break;
    }
    
    if (prev !== pattern.state) {
      this.emit("pattern:state_changed", {
        id: pattern.id, name: pattern.name,
        from: prev, to: pattern.state,
      });
    }
    
    // Mark performance bottlenecks
    if (pattern.category === CATEGORY.PERFORMANCE && pattern.stats) {
      pattern.metadata.isBottleneck = (
        pattern.state === STATE.STAGNANT ||
        pattern.state === STATE.DEGRADING
      ) && pattern.stats.median > 0;
      
      if (pattern.metadata.isBottleneck) {
        pattern.metadata.suggestion = pattern.trend === "degrading"
          ? `${pattern.name} is getting slower. Re-optimize: try parallelization or caching.`
          : `${pattern.name} is stagnant at ${Math.round(pattern.stats.median)}ms. Run Monte Carlo plan search for faster alternatives.`;
      }
    }
  }

  // ─── Convergence check ─────────────────────────────────────────────

  _checkConvergence(values) {
    if (values.length < CONVERGENCE_MIN_SAMPLES) return false;
    const recent = values.slice(-CONVERGENCE_MIN_SAMPLES);
    const stats = quickStats(recent);
    if (stats.mean === 0) return false;
    const cv = stats.stddev / stats.mean;
    return cv < CONVERGENCE_CV_MAX;
  }

  // ─── Anomaly detection (cross-pattern) ─────────────────────────────

  _detectAnomalies(patterns) {
    // Error burst detection: if error patterns spike together
    const errorPatterns = patterns.filter(p =>
      p.category === CATEGORY.RELIABILITY && p.observations.length >= 5
    );

    const now = Date.now();
    const recentWindow = 5 * 60 * 1000; // 5 minutes

    for (const ep of errorPatterns) {
      const recentErrors = ep.observations.filter(o =>
        (now - new Date(o.ts).getTime()) < recentWindow
      );
      if (recentErrors.length >= 5) {
        ep.metadata.errorBurst = true;
        ep.metadata.burstCount = recentErrors.length;
        ep.metadata.burstWindow = "5m";
        this.emit("anomaly:error_burst", {
          patternId: ep.id, name: ep.name,
          count: recentErrors.length, window: "5m",
        });
      }
    }

    // Correlated slowdowns: multiple performance patterns degrading simultaneously
    const degradingPerf = patterns.filter(p =>
      p.category === CATEGORY.PERFORMANCE && p.state === STATE.DEGRADING
    );
    if (degradingPerf.length >= 2) {
      this.emit("anomaly:correlated_slowdown", {
        patterns: degradingPerf.map(p => p.name),
        count: degradingPerf.length,
      });
    }
  }

  // ─── Create improvement task ───────────────────────────────────────

  _createImprovementTask(pattern, reason) {
    const task = {
      id: `imp_${crypto.randomBytes(4).toString("hex")}`,
      patternId: pattern.id,
      patternName: pattern.name,
      category: pattern.category,
      reason,
      state: pattern.state,
      stats: pattern.stats ? { median: pattern.stats.median, mean: pattern.stats.mean } : null,
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    this._improvementTasks.push(task);
    if (this._improvementTasks.length > 100) {
      this._improvementTasks = this._improvementTasks.slice(-100);
    }

    pattern.improvementAttempts++;
    this.emit("improvement:task_created", task);
    return task;
  }

  // ─── Pattern summary (human-readable) ──────────────────────────────

  _patternSummary(pattern) {
    const s = pattern.stats;
    if (!s) return `${pattern.name}: ${pattern.observations.length} observations, no stats yet.`;

    const stateEmoji = {
      [STATE.DETECTED]: "new",
      [STATE.ACTIVE]: "tracking",
      [STATE.IMPROVING]: "getting better",
      [STATE.STAGNANT]: "STAGNANT (bug)",
      [STATE.CONVERGED]: "optimal",
      [STATE.DEGRADING]: "DEGRADING (action needed)",
      [STATE.LOCKED]: "locked",
    };

    const label = stateEmoji[pattern.state] || pattern.state;

    if (pattern.category === CATEGORY.PERFORMANCE) {
      return `${pattern.name}: median ${Math.round(s.median)}ms, trend=${pattern.trend} [${label}]`;
    }
    if (pattern.category === CATEGORY.RELIABILITY) {
      return `${pattern.name}: ${s.n} events, trend=${pattern.trend} [${label}]`;
    }
    return `${pattern.name}: mean=${s.mean.toFixed(2)}, n=${s.n} [${label}]`;
  }

  // ─── Internal helpers ──────────────────────────────────────────────

  _patternId(category, name) {
    return `${category}::${name}`;
  }

  _bufferSave() {
    // Debounced save — don't write on every observation
    if (this._saveTimeout) return;
    this._saveTimeout = setTimeout(async () => {
      this._saveTimeout = null;
      await savePatternStoreAsync(this.store);
    }, SAVE_DEBOUNCE_MS);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPRESS ROUTES — Pattern Engine API
// ═══════════════════════════════════════════════════════════════════════

function registerPatternRoutes(app, engine) {
  // Get all patterns (with optional filters)
  app.get("/api/patterns", (req, res) => {
    const { category, state, tag } = req.query;
    const patterns = engine.getPatterns({ category, state, tag });
    res.json({ ok: true, total: patterns.length, patterns, ts: new Date().toISOString() });
  });

  // Get pattern summary
  app.get("/api/patterns/summary", (_req, res) => {
    res.json({ ok: true, ...engine.getSummary() });
  });

  // Surface recent patterns ("what patterns do you see?")
  app.get("/api/patterns/recent", (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const patterns = engine.surfaceRecentPatterns(limit);
    res.json({ ok: true, patterns, ts: new Date().toISOString() });
  });

  // Get bottleneck patterns
  app.get("/api/patterns/bottlenecks", (_req, res) => {
    res.json({ ok: true, bottlenecks: engine.getBottlenecks(), ts: new Date().toISOString() });
  });

  // Get a specific pattern by ID
  app.get("/api/patterns/:patternId", (req, res) => {
    const pattern = engine.getPattern(req.params.patternId);
    if (!pattern) return res.status(404).json({ error: "Pattern not found" });
    res.json({ ok: true, pattern });
  });

  // Observe a new data point
  app.post("/api/patterns/observe", (req, res) => {
    const { category, name, value, metadata } = req.body;
    if (!category || !name || value == null) {
      return res.status(400).json({ error: "category, name, value required" });
    }
    const pattern = engine.observe(category, name, value, metadata || {});
    res.json({ ok: true, patternId: pattern.id, state: pattern.state, observationCount: pattern.observations.length });
  });

  // Promote a pattern ("notice this pattern")
  app.post("/api/patterns/promote", (req, res) => {
    const { category, name, reason } = req.body;
    if (!category || !name) return res.status(400).json({ error: "category and name required" });
    const pattern = engine.promotePattern(category, name, reason || "");
    if (!pattern) return res.status(404).json({ error: "Pattern not found" });
    res.json({ ok: true, patternId: pattern.id, state: pattern.state });
  });

  // Lock a pattern (proven optimal)
  app.post("/api/patterns/lock", (req, res) => {
    const { patternId, reviewInterval } = req.body;
    if (!patternId) return res.status(400).json({ error: "patternId required" });
    const pattern = engine.lockPattern(patternId, reviewInterval || 100);
    if (!pattern) return res.status(404).json({ error: "Pattern not found" });
    res.json({ ok: true, patternId: pattern.id, state: pattern.state, convergedAt: pattern.convergedAt });
  });

  // Get improvement tasks
  app.get("/api/patterns/improvements", (_req, res) => {
    res.json({ ok: true, tasks: engine._improvementTasks.slice(-50), ts: new Date().toISOString() });
  });

  // Delete a pattern by ID
  app.delete("/api/patterns/:patternId", (req, res) => {
    const id = req.params.patternId;
    if (!engine.store.patterns[id]) return res.status(404).json({ error: "Pattern not found" });
    delete engine.store.patterns[id];
    res.json({ ok: true, deleted: id, ts: new Date().toISOString() });
  });
}

// ─── Singleton ───────────────────────────────────────────────────────
const patternEngine = new HCPatternEngine();

// ─── Exports ─────────────────────────────────────────────────────────
module.exports = {
  HCPatternEngine,
  patternEngine,
  registerPatternRoutes,
  CATEGORY,
  STATE,
};
