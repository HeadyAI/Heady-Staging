/**
 * Copyright (c) 2026 HeadySystems Inc. (C-Corp)
 * PROPRIETARY & CONFIDENTIAL.
 * Patent Pending: Infrastructure & Orchestration Cluster
 * Implements: Distributed State Mutex, Golden Ratio UI
 */

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
// ║  FILE: services/orchestrator/model_router.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * ModelRouter — Per-Workspace Decision Matrix for Model Selection
 *
 * Reads cloud-layers.yaml and selects the optimal model provider for each
 * request based on (layer, task_type, privacy, cost_sensitivity, brain_profile).
 *
 * Features:
 *   - Decision matrix matching from cloud-layers.yaml
 *   - Per-brain model policy enforcement (allowed providers, cost limits)
 *   - Fallback chain with circuit breaker tracking
 *   - Usage tracking for cost awareness
 *   - Hot-reload of config via reload()
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { EventEmitter } = require('events');

class ModelRouter extends EventEmitter {
  constructor(configDir) {
    super();
    this.configDir = configDir || path.join(__dirname, '..', '..', 'configs');
    this.cloudLayers = null;
    this.brainProfiles = null;
    this.usage = new Map(); // track daily usage per brain profile
    this.circuitBreakers = new Map(); // provider -> { failures, lastFailure, open }
    this.headyOnly = true; // ENFORCE 100% Heady Services
    this.reload();
  }

  reload() {
    this.cloudLayers = this._loadYaml('cloud-layers.yaml');
    this.brainProfiles = this._loadYaml('brain-profiles.yaml');
    this.emit('config:reloaded');
  }

  /**
   * Select the optimal model provider for a given request context.
   *
   * @param {Object} params
   * @param {string} params.layer - Cloud layer ID (local/internal/production)
   * @param {string} params.taskType - Task type (CODE, RESEARCH, VOICE, GENERAL)
   * @param {string} params.privacy - Privacy level (strict/normal/team/public/per-tenant)
   * @param {string} params.costSensitivity - Cost preference (high/medium/low/ppp-aware)
   * @param {string} [params.brainProfileId] - Brain profile ID for policy enforcement
   * @returns {Object} { provider, fallback, source, blocked, reason }
   */
  select(params) {
    const { layer, taskType, privacy, costSensitivity, brainProfileId } = params;

    // ENFORCE 100% Heady Services
    if (this.headyOnly) {
      return {
        provider: 'HeadyBrain',
        fallback: null,
        source: 'heady-only-enforcement',
        blocked: false,
        reason: '100% Heady service requirement',
        cost: 0.00
      };
    }

    // Step 1: Get brain policy constraints
    const brainPolicy = this._getBrainPolicy(brainProfileId);
    const allowedProviders = brainPolicy?.allowed || null;
    const costLimit = brainPolicy?.cost_limit_daily || Infinity;

    // Step 2: Check daily cost limit
    const dailyUsage = this._getDailyUsage(brainProfileId || 'default');
    if (dailyUsage >= costLimit) {
      return {
        provider: this._cheapestAllowed(allowedProviders) || 'ollama',
        fallback: null,
        source: 'cost_limit_exceeded',
        blocked: false,
        reason: `Daily cost limit $${costLimit} reached ($${dailyUsage.toFixed(2)} used)`,
      };
    }

    // Step 3: Match against decision matrix
    const matrixResult = this._matchMatrix(layer, taskType, privacy, costSensitivity);

    // Step 4: Filter by brain policy allowed list
    let provider = matrixResult.provider;
    let fallback = matrixResult.fallback;

    if (allowedProviders) {
      if (!allowedProviders.includes(provider)) {
        // Primary not allowed — try fallback
        if (fallback && allowedProviders.includes(fallback)) {
          provider = fallback;
          fallback = this._nextFallback(allowedProviders, provider);
        } else {
          // Use brain policy preference
          provider = allowedProviders[0] || 'ollama';
          fallback = allowedProviders[1] || null;
        }
      }
    }

    // Step 5: Check circuit breaker
    if (this._isCircuitOpen(provider)) {
      if (fallback && !this._isCircuitOpen(fallback)) {
        const swapped = provider;
        provider = fallback;
        fallback = swapped;
      } else {
        provider = 'ollama'; // ultimate fallback
        fallback = null;
      }
    }

    return {
      provider,
      fallback,
      source: matrixResult.source,
      blocked: false,
      reason: null,
      brain_policy: brainPolicy ? {
        preference: brainPolicy.preference,
        privacy: brainPolicy.privacy,
        cost_remaining: Math.max(0, costLimit - dailyUsage),
      } : null,
    };
  }

  /**
   * Record usage cost for a completed request.
   */
  recordUsage(brainProfileId, cost) {
    const key = brainProfileId || 'default';
    const today = new Date().toISOString().slice(0, 10);
    const usageKey = `${key}:${today}`;
    const current = this.usage.get(usageKey) || 0;
    this.usage.set(usageKey, current + cost);
  }

  /**
   * Record a provider failure for circuit breaker tracking.
   */
  recordFailure(provider) {
    const cb = this.circuitBreakers.get(provider) || { failures: 0, lastFailure: null, open: false };
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= 3) {
      cb.open = true;
      this.emit('circuit:opened', { provider, failures: cb.failures });
    }
    this.circuitBreakers.set(provider, cb);
  }

  /**
   * Record a provider success — resets circuit breaker.
   */
  recordSuccess(provider) {
    if (this.circuitBreakers.has(provider)) {
      this.circuitBreakers.set(provider, { failures: 0, lastFailure: null, open: false });
    }
  }

  /**
   * Get current status of all providers.
   */
  getStatus() {
    const matrix = this.cloudLayers?.model_routing?.matrix || [];
    const providers = new Set();
    matrix.forEach(r => { if (r.use) providers.add(r.use); if (r.fallback) providers.add(r.fallback); });

    return {
      providers: [...providers].map(p => ({
        id: p,
        circuit: this.circuitBreakers.get(p) || { failures: 0, open: false },
      })),
      usage: Object.fromEntries(this.usage),
      matrix_rules: matrix.length,
      ts: new Date().toISOString(),
    };
  }

  // ─── Internal Methods ──────────────────────────────────────────────

  _loadYaml(filename) {
    const filePath = path.join(this.configDir, filename);
    if (!fs.existsSync(filePath)) return null;
    try { return yaml.load(fs.readFileSync(filePath, 'utf8')); }
    catch (e) { console.error(`[ModelRouter] Failed to load ${filename}: ${e.message}`); return null; }
  }

  _matchMatrix(layer, taskType, privacy, costSensitivity) {
    if (!this.cloudLayers?.model_routing?.matrix) {
      return { provider: 'gpt-4o', fallback: 'ollama', source: 'default' };
    }

    const matrix = this.cloudLayers.model_routing.matrix;

    // Score-based matching: more specific rules win
    let bestMatch = null;
    let bestScore = -1;

    for (const rule of matrix) {
      const when = rule.when || {};
      let score = 0;
      let matches = true;

      if (when.layer) {
        if (when.layer !== layer) { matches = false; } else { score += 4; }
      }
      if (when.task_type) {
        if (when.task_type !== taskType) { matches = false; } else { score += 3; }
      }
      if (when.privacy) {
        if (when.privacy !== privacy) { matches = false; } else { score += 2; }
      }
      if (when.cost_sensitivity) {
        if (when.cost_sensitivity !== costSensitivity) { matches = false; } else { score += 1; }
      }

      if (matches && score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }

    if (bestMatch) {
      return { provider: bestMatch.use, fallback: bestMatch.fallback || null, source: 'matrix' };
    }

    return { provider: 'gpt-4o', fallback: 'ollama', source: 'default' };
  }

  _getBrainPolicy(brainProfileId) {
    if (!brainProfileId || !this.brainProfiles?.profiles) return null;
    const profile = this.brainProfiles.profiles[brainProfileId];
    return profile?.model_policy || null;
  }

  _getDailyUsage(key) {
    const today = new Date().toISOString().slice(0, 10);
    return this.usage.get(`${key}:${today}`) || 0;
  }

  _isCircuitOpen(provider) {
    const cb = this.circuitBreakers.get(provider);
    if (!cb || !cb.open) return false;
    // Auto-close after 5 minutes (half-open)
    if (Date.now() - cb.lastFailure > 300000) {
      cb.open = false;
      cb.failures = 0;
      return false;
    }
    return true;
  }

  _cheapestAllowed(allowed) {
    if (!allowed) return 'ollama';
    const costOrder = ['ollama', 'gpt-4o-mini', 'gemini-pro', 'gpt-4o', 'claude-3.5-sonnet'];
    for (const p of costOrder) {
      if (allowed.includes(p)) return p;
    }
    return allowed[0];
  }

  _nextFallback(allowed, current) {
    const idx = allowed.indexOf(current);
    if (idx >= 0 && idx < allowed.length - 1) return allowed[idx + 1];
    return null;
  }
}

// Singleton instance
const modelRouter = new ModelRouter();

module.exports = { ModelRouter, modelRouter };
