/**
 * ∞ Heady™ Config Loader — Unified Configuration Loading & Hot Reload
 * Part of Heady™Systems™ Sovereign AI Platform v4.0.0
 * © 2026 Heady™Systems Inc. — Proprietary
 */

'use strict';

const { PHI_TIMING } = require('../shared/phi-math');
const fs           = require('fs');
const path         = require('path');
const EventEmitter = require('events');

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────

/**
 * Platform-wide configuration defaults.
 * Values here are the last resort — overridden by env, registry, YAML, in that order.
 */
const DEFAULTS = {
  platform: {
    name:        'HeadySystems',
    version:     '4.0.0',
    codename:    'Sovereign',
    environment: 'development',
    debug:       false,
    logLevel:    'info',
  },
  intelligence: {
    defaultTaskType:    'quick',
    dedupeTtlMs:        60_000,
    dedupeMaxEntries:   1_000,
    patternSimilarity:  0.65,
    maxPatternsPerType: 500,
    monteCarlo: {
      maxTrials:           10_000,
      convergenceThreshold: 0.01,
    },
  },
  resilience: {
    circuitBreaker: {
      failureThreshold:  5,
      recoveryTimeoutMs: PHI_TIMING.CYCLE,  // φ⁷ × 1000
    },
    retry: {
      maxRetries:    3,
      baseDelayMs:   1_000,
      backoffFactor: 2,
    },
    pool: {
      primaryRatio:  0.618,   // Golden ratio
      secondaryRatio: 0.382,
    },
  },
  pipeline: {
    defaultTimeoutMs: 300_000,
    stages: [
      'PRE_VALIDATE', 'VALIDATE', 'PLAN', 'MONTE_CARLO',
      'EXECUTE', 'VERIFY', 'POST_PROCESS', 'COMMIT',
    ],
  },
  budget: {
    monthlyCap: 500,
    dailyCaps: {
      anthropic:  50,
      openai:     40,
      google:     20,
      groq:       10,
      perplexity: 15,
      local:       0,
    },
  },
  bees: {
    maxConcurrent:    100,
    defaultLifetimeMs: 3_600_000,
    ephemeralLifetimeMs: 300_000,
  },
  monitoring: {
    healthIntervalMs:  PHI_TIMING.CYCLE,  // φ⁷ × 1000
    metricsWindowMs:   3_600_000,
    alertCooldownMs:   300_000,
  },
  edge: {
    rateLimitWindowMs: 60_000,
    rateLimitMax:      100,
    proxyTimeoutMs:    PHI_TIMING.CYCLE,  // φ⁷ × 1000
  },
};

// ─────────────────────────────────────────────
// Schema Validation
// ─────────────────────────────────────────────

/**
 * Minimal schema validators for each config section.
 * Each returns null if valid, or an error message string.
 *
 * @type {Record<string, (value: any) => string|null>}
 */
const VALIDATORS = {
  platform: (v) => {
    if (typeof v.version !== 'string') return '"platform.version" must be a string';
    if (!['development', 'staging', 'production'].includes(v.environment))
      return `"platform.environment" must be development|staging|production, got "${v.environment}"`;
    return null;
  },
  budget: (v) => {
    if (typeof v.monthlyCap !== 'number' || v.monthlyCap < 0)
      return '"budget.monthlyCap" must be a non-negative number';
    return null;
  },
  resilience: (v) => {
    const cb = v.circuitBreaker;
    if (cb?.failureThreshold !== undefined && (typeof cb.failureThreshold !== 'number' || cb.failureThreshold < 1))
      return '"resilience.circuitBreaker.failureThreshold" must be >= 1';
    return null;
  },
  bees: (v) => {
    if (v.maxConcurrent !== undefined && (typeof v.maxConcurrent !== 'number' || v.maxConcurrent < 1))
      return '"bees.maxConcurrent" must be a positive number';
    return null;
  },
};

// ─────────────────────────────────────────────
// YAML Parser (minimal, no external deps)
// ─────────────────────────────────────────────

/**
 * Parse a subset of YAML sufficient for Heady™ config files.
 * Handles: scalars, sequences, mappings, comments, multiline strings.
 * For complex YAML, use the `js-yaml` npm package instead.
 *
 * @param {string} yamlText
 * @returns {object}
 */
function parseYAML(yamlText) {
  // Try to use js-yaml if available, fall back to minimal parser
  try {
    const jsYaml = require('js-yaml');
    return jsYaml.load(yamlText) ?? {};
  } catch {
    // Minimal fallback: parse only flat key: value pairs and nested indented objects
    return _minimalYAMLParse(yamlText);
  }
}

function _minimalYAMLParse(text) {
  const lines  = text.split('\n');
  const root   = {};
  const stack  = [{ obj: root, indent: -1 }];

  for (const rawLine of lines) {
    const stripped = rawLine.replace(/#.*$/, '').trimEnd();
    if (!stripped.trim()) continue;

    const indent = stripped.length - stripped.trimStart().length;
    const line   = stripped.trim();

    // Pop stack to matching indent level
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();

    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;

    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    const parent = stack[stack.length - 1].obj;

    if (!value || value === '|' || value === '>') {
      // Nested object
      parent[key] = {};
      stack.push({ obj: parent[key], indent });
    } else {
      // Scalar
      parent[key] = _parseScalar(value);
    }
  }
  return root;
}

function _parseScalar(value) {
  if (value === 'true')  return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  return value.replace(/^["']|["']$/g, '');
}

// ─────────────────────────────────────────────
// Deep Merge
// ─────────────────────────────────────────────

/**
 * Deep merge source into target.  Source values take precedence.
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const result = { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val) &&
        target[key] !== null && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ─────────────────────────────────────────────
// Config Loader
// ─────────────────────────────────────────────

/**
 * @typedef {object} ConfigLoaderOptions
 * @property {string}   [registryPath]     Path to heady-registry.json
 * @property {string}   [systemYamlPath]   Path to configs/system.yaml
 * @property {string}   [domainsYamlPath]  Path to configs/domains.yaml
 * @property {boolean}  [hotReload]        Watch config files for changes
 * @property {number}   [watchDebounceMs]  Debounce delay for hot reload
 */

/**
 * Unified configuration loader for the Heady™Systems™ platform.
 *
 * Priority (highest to lowest):
 *   1. Environment variables (HEADY_*)
 *   2. heady-registry.json
 *   3. configs/system.yaml
 *   4. Built-in defaults
 *
 * Supports hot reload via fs.watch().
 *
 * @extends EventEmitter
 *
 * @example
 * const loader = new ConfigLoader({ registryPath: './heady-registry.json' });
 * await loader.load();
 * const platform = loader.get('platform');
 * console.log(platform.version); // '4.0.0'
 */
class ConfigLoader extends EventEmitter {
  /**
   * @param {ConfigLoaderOptions} [opts]
   */
  constructor(opts = {}) {
    super();
    this.opts           = opts;
    this.registryPath   = opts.registryPath   ?? path.resolve(process.cwd(), 'heady-registry.json');
    this.systemYamlPath = opts.systemYamlPath  ?? path.resolve(process.cwd(), 'configs/system.yaml');
    this.domainsPath    = opts.domainsYamlPath ?? path.resolve(process.cwd(), 'configs/domains.yaml');
    this.hotReload      = opts.hotReload       ?? false;
    this.watchDebounce  = opts.watchDebounceMs ?? 500;

    /** Resolved config object */
    this._config = null;
    /** FSWatcher instances */
    this._watchers = [];
    /** Debounce timer */
    this._debounceTimer = null;
  }

  // ── Loading ──

  /**
   * Load configuration from all sources in priority order.
   * @returns {Promise<object>} Fully resolved config
   */
  async load() {
    this._config = DEFAULTS;

    // Layer 3: YAML files
    const yamlConfig = await this._loadYAML();
    if (yamlConfig) this._config = deepMerge(this._config, yamlConfig);

    // Layer 2: Registry JSON
    const registryConfig = await this._loadRegistry();
    if (registryConfig) this._config = deepMerge(this._config, registryConfig);

    // Layer 1: Environment variables (highest priority)
    const envConfig = this._loadEnv();
    this._config = deepMerge(this._config, envConfig);

    // Validate
    const errors = this._validate(this._config);
    if (errors.length > 0) {
      this.emit('validation_error', { errors });
      // Log but don't throw — continue with best-effort config
    }

    if (this.hotReload) this._startWatchers();

    this.emit('loaded', { sections: Object.keys(this._config) });
    return this._config;
  }

  // ── Getters ──

  /**
   * Get a config section by key.
   * @param {string} key     Top-level config section name
   * @param {*}      [fallback]
   * @returns {*}
   */
  get(key, fallback = undefined) {
    if (!this._config) throw new Error('ConfigLoader: call load() first');
    return this._config[key] ?? fallback;
  }

  /**
   * Get a deeply nested value by dot-notation path.
   * @param {string} dotPath  e.g. 'resilience.circuitBreaker.failureThreshold'
   * @param {*}      [fallback]
   * @returns {*}
   */
  getPath(dotPath, fallback = undefined) {
    if (!this._config) throw new Error('ConfigLoader: call load() first');
    const parts = dotPath.split('.');
    let   cur   = this._config;
    for (const part of parts) {
      if (cur === null || cur === undefined) return fallback;
      cur = cur[part];
    }
    return cur ?? fallback;
  }

  /**
   * Typed getter with validation.
   * @param {string} dotPath
   * @param {'string'|'number'|'boolean'|'object'} type
   * @param {*} [fallback]
   * @returns {*}
   */
  getTyped(dotPath, type, fallback) {
    const val = this.getPath(dotPath, fallback);
    if (val !== undefined && val !== null && typeof val !== type) {
      throw new TypeError(`Config "${dotPath}" expected ${type}, got ${typeof val}`);
    }
    return val;
  }

  /**
   * Get the full resolved config object.
   * @returns {object}
   */
  all() {
    if (!this._config) throw new Error('ConfigLoader: call load() first');
    return this._config;
  }

  // ── Hot Reload ──

  /**
   * Force a config reload.
   * @returns {Promise<object>}
   */
  async reload() {
    const prev   = JSON.stringify(this._config);
    await this.load();
    const curr   = JSON.stringify(this._config);
    if (prev !== curr) {
      const changed = this._diffKeys(JSON.parse(prev), this._config);
      this.emit('config_changed', { changedKeys: changed });
    }
    return this._config;
  }

  /**
   * Stop hot reload watchers.
   */
  stopWatchers() {
    for (const w of this._watchers) { try { w.close(); } catch { /* ignore */ } }
    this._watchers = [];
  }

  // ── Private: Source Loaders ──

  async _loadRegistry() {
    try {
      const raw  = fs.readFileSync(this.registryPath, 'utf8');
      const json = JSON.parse(raw);
      // Extract relevant config sections from registry
      const out = {};
      if (json.platform)      out.platform      = json.platform;
      if (json.intelligence)  out.intelligence  = json.intelligence;
      if (json.resilience)    out.resilience    = json.resilience;
      if (json.pipeline)      out.pipeline      = json.pipeline;
      if (json.budget)        out.budget        = json.budget;
      if (json.bees)          out.bees          = json.bees;
      if (json.monitoring)    out.monitoring    = json.monitoring;
      return out;
    } catch (err) {
      if (err.code !== 'ENOENT') this.emit('load_error', { source: 'registry', err });
      return null;
    }
  }

  async _loadYAML() {
    let merged = null;
    for (const filePath of [this.systemYamlPath, this.domainsPath]) {
      try {
        const raw  = fs.readFileSync(filePath, 'utf8');
        const parsed = parseYAML(raw);
        merged = merged ? deepMerge(merged, parsed) : parsed;
      } catch (err) {
        if (err.code !== 'ENOENT') this.emit('load_error', { source: filePath, err });
      }
    }
    return merged;
  }

  _loadEnv() {
    const out = {};
    const prefix = 'HEADY_';

    for (const [key, val] of Object.entries(process.env)) {
      if (!key.startsWith(prefix)) continue;
      // HEADY_PLATFORM_VERSION → platform.version
      const parts   = key.slice(prefix.length).toLowerCase().split('_');
      const section = parts[0];
      const field   = parts.slice(1).join('_').replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (!out[section]) out[section] = {};
      out[section][field] = _parseScalar(val);
    }

    // Well-known env overrides
    if (process.env.NODE_ENV)        out.platform  = { ...(out.platform ?? {}), environment: process.env.NODE_ENV };
    if (process.env.HEADY_DEBUG)     out.platform  = { ...(out.platform ?? {}), debug: process.env.HEADY_DEBUG === 'true' };
    if (process.env.HEADY_LOG_LEVEL) out.platform  = { ...(out.platform ?? {}), logLevel: process.env.HEADY_LOG_LEVEL };

    return out;
  }

  // ── Validation ──

  _validate(config) {
    const errors = [];
    for (const [section, validator] of Object.entries(VALIDATORS)) {
      if (!config[section]) continue;
      const err = validator(config[section]);
      if (err) errors.push(err);
    }
    return errors;
  }

  // ── Watchers ──

  _startWatchers() {
    for (const filePath of [this.registryPath, this.systemYamlPath, this.domainsPath]) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const w = fs.watch(filePath, () => this._onFileChange(filePath));
        this._watchers.push(w);
      } catch { /* watch not available in this env */ }
    }
  }

  _onFileChange(filePath) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(async () => {
      try {
        await this.reload();
        this.emit('hot_reloaded', { file: filePath });
      } catch (err) {
        this.emit('reload_error', { file: filePath, err });
      }
    }, this.watchDebounce);
  }

  // ── Diff ──

  _diffKeys(prev, curr, prefix = '') {
    const changed = [];
    const allKeys = new Set([...Object.keys(prev ?? {}), ...Object.keys(curr ?? {})]);
    for (const key of allKeys) {
      const full = prefix ? `${prefix}.${key}` : key;
      const a = prev?.[key], b = curr?.[key];
      if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        changed.push(...this._diffKeys(a, b, full));
      } else if (JSON.stringify(a) !== JSON.stringify(b)) {
        changed.push(full);
      }
    }
    return changed;
  }
}

// ─────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────

let _instance = null;

/**
 * Get or create the global ConfigLoader singleton.
 * @param {ConfigLoaderOptions} [opts]
 * @returns {ConfigLoader}
 */
function getLoader(opts) {
  if (!_instance || opts) _instance = new ConfigLoader(opts);
  return _instance;
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export {

  ConfigLoader,
  getLoader,
  DEFAULTS,
  VALIDATORS,
  deepMerge,
  parseYAML,
};
