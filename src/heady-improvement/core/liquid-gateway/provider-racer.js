/**
 * HeadyLiquidGateway — Provider Racer
 * 
 * Race multiple AI providers in parallel; fastest healthy response wins.
 * Uses CSL-gated scoring for provider selection and φ-scaled timeouts.
 * 
 * @module core/liquid-gateway/provider-racer
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;                 // ≈ 0.618
const PSI2 = PSI * PSI;              // ≈ 0.382
const PSI3 = PSI * PSI * PSI;        // ≈ 0.236
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** φ-threshold: 1 - ψ^level × spread */
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;

/** CSL cosine similarity */
const cosineSimilarity = (a, b) => {
  let dot = 0, magA = 0, magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

/** CSL sigmoid gate */
const cslGate = (value, cosScore, tau = phiThreshold(1), temp = PSI3) =>
  value / (1 + Math.exp(-(cosScore - tau) / temp));

/**
 * Provider capability embeddings — lightweight 8D vectors
 * representing each provider's strength profile:
 * [reasoning, coding, creative, speed, cost, multimodal, context, reliability]
 */
const PROVIDER_PROFILES = {
  'claude-opus':     [0.95, 0.92, 0.88, 0.60, 0.30, 0.85, 0.90, 0.92],
  'claude-sonnet':   [0.88, 0.90, 0.82, 0.78, 0.65, 0.82, 0.85, 0.90],
  'claude-haiku':    [0.70, 0.72, 0.65, 0.95, 0.92, 0.60, 0.70, 0.88],
  'gpt-4o':          [0.90, 0.88, 0.85, 0.75, 0.55, 0.90, 0.80, 0.88],
  'gpt-4o-mini':     [0.72, 0.70, 0.68, 0.92, 0.90, 0.75, 0.70, 0.85],
  'gemini-pro':      [0.85, 0.82, 0.80, 0.80, 0.60, 0.92, 0.95, 0.82],
  'gemini-flash':    [0.68, 0.65, 0.62, 0.95, 0.93, 0.70, 0.80, 0.80],
  'groq-llama':      [0.65, 0.60, 0.55, 0.98, 0.95, 0.40, 0.50, 0.75],
  'perplexity-sonar':[0.75, 0.50, 0.55, 0.85, 0.70, 0.30, 0.60, 0.80],
  'local-ollama':    [0.55, 0.50, 0.45, 0.70, 0.99, 0.30, 0.40, 0.60],
};

/**
 * Workload class embeddings — what capability profile each workload needs
 */
const WORKLOAD_PROFILES = {
  'fast-interactive':  [0.50, 0.50, 0.50, 0.95, 0.80, 0.40, 0.50, 0.90],
  'deep-reasoning':    [0.95, 0.70, 0.60, 0.40, 0.30, 0.50, 0.90, 0.85],
  'code-generation':   [0.80, 0.95, 0.40, 0.60, 0.50, 0.30, 0.85, 0.88],
  'creative-writing':  [0.70, 0.40, 0.95, 0.50, 0.40, 0.50, 0.70, 0.82],
  'tool-execution':    [0.60, 0.85, 0.30, 0.85, 0.70, 0.60, 0.60, 0.90],
  'multimodal':        [0.70, 0.60, 0.70, 0.60, 0.50, 0.95, 0.70, 0.85],
  'batch-processing':  [0.60, 0.60, 0.50, 0.30, 0.90, 0.40, 0.80, 0.80],
  'search-augmented':  [0.75, 0.50, 0.55, 0.80, 0.60, 0.30, 0.60, 0.85],
};

export class ProviderRacer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.providers = new Map();
    this.raceHistory = [];
    this.maxHistorySize = FIB[12]; // 144
    this.maxConcurrentRaces = FIB[6]; // 8
    this.activeRaces = 0;
    this.defaultTimeoutMs = Math.round(PHI * 1000 * FIB[5]); // ≈ 8090ms
    this.cancelTimeoutMs = Math.round(PHI * 100); // ≈ 162ms grace period for cancel
    this.maxRaceParticipants = FIB[5]; // 5 concurrent providers max
    this.providerProfiles = { ...PROVIDER_PROFILES, ...(config.customProfiles || {}) };
    this.workloadProfiles = { ...WORKLOAD_PROFILES, ...(config.customWorkloads || {}) };
  }

  /**
   * Register an AI provider with its adapter function
   */
  registerProvider(name, adapter, options = {}) {
    this.providers.set(name, {
      name,
      adapter,
      healthy: true,
      latencyEma: Math.round(PHI * 1000), // initial EMA: ~1618ms
      successRate: 1.0,
      totalRequests: 0,
      totalFailures: 0,
      lastFailureAt: null,
      consecutiveFailures: 0,
      circuitOpen: false,
      circuitOpenedAt: null,
      byokKey: options.byokKey || null,
      costMultiplier: options.costMultiplier || 1.0,
      maxRpm: options.maxRpm || FIB[12], // 144 RPM default
      currentRpm: 0,
      rpmWindowStart: Date.now(),
    });
    this.emit('provider:registered', { name });
  }

  /**
   * Deregister a provider
   */
  removeProvider(name) {
    this.providers.delete(name);
    this.emit('provider:removed', { name });
  }

  /**
   * Score a provider for a given workload using CSL cosine similarity
   * Returns φ-fusion of alignment, health, and latency scores
   */
  scoreProvider(providerName, workloadType) {
    const provider = this.providers.get(providerName);
    if (!provider || provider.circuitOpen || !provider.healthy) return 0;

    const providerProfile = this.providerProfiles[providerName];
    const workloadProfile = this.workloadProfiles[workloadType];

    if (!providerProfile || !workloadProfile) return PSI2; // fallback score

    // CSL alignment: cosine similarity between provider capabilities and workload needs
    const alignment = cosineSimilarity(providerProfile, workloadProfile);

    // Health score: success rate with CSL gate
    const healthScore = cslGate(provider.successRate, provider.successRate, PSI2);

    // Latency score: inverse normalized, lower is better
    const maxLatency = this.defaultTimeoutMs;
    const latencyScore = Math.max(0, 1 - (provider.latencyEma / maxLatency));

    // Rate limit headroom
    const rpmRatio = provider.maxRpm > 0 ? provider.currentRpm / provider.maxRpm : 1;
    const headroomScore = Math.max(0, 1 - rpmRatio);

    // φ-weighted fusion: alignment(0.486) + health(0.300) + latency(0.214)
    const score =
      alignment * 0.486 +
      healthScore * 0.300 +
      latencyScore * 0.214;

    // CSL-gate the final score with headroom
    return cslGate(score, headroomScore, PSI2);
  }

  /**
   * Select top-K providers for racing based on CSL scores
   */
  selectRaceParticipants(workloadType, maxParticipants = FIB[4]) {
    const scored = [];

    for (const [name] of this.providers) {
      const score = this.scoreProvider(name, workloadType);
      if (score > PSI2) { // minimum viability threshold
        scored.push({ name, score });
      }
    }

    // Sort by CSL score descending — concurrent-equals with score-based selection
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, Math.min(maxParticipants, this.maxRaceParticipants));
  }

  /**
   * Race providers: dispatch request to top-K, first successful response wins.
   * Losers are cancelled via AbortController.
   */
  async race(request, options = {}) {
    if (this.activeRaces >= this.maxConcurrentRaces) {
      throw new Error(`Race limit exceeded: ${this.activeRaces}/${this.maxConcurrentRaces}`);
    }

    this.activeRaces++;
    const raceId = `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    const workloadType = options.workloadType || this._classifyWorkload(request);
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const participants = this.selectRaceParticipants(
      workloadType,
      options.maxParticipants || FIB[4] // 3
    );

    if (participants.length === 0) {
      this.activeRaces--;
      throw new Error('No healthy providers available for workload: ' + workloadType);
    }

    this.emit('race:start', { raceId, workloadType, participants: participants.map(p => p.name) });

    const controllers = new Map();
    const racePromises = participants.map(({ name, score }) => {
      const controller = new AbortController();
      controllers.set(name, controller);

      return this._executeProvider(name, request, controller.signal, timeoutMs)
        .then(result => ({
          provider: name,
          result,
          score,
          latency: Date.now() - startTime,
          success: true,
        }))
        .catch(error => ({
          provider: name,
          error: error.message,
          score,
          latency: Date.now() - startTime,
          success: false,
        }));
    });

    try {
      // Race with overall timeout
      const winner = await Promise.race([
        this._findFirstSuccess(racePromises, controllers),
        this._raceTimeout(timeoutMs, raceId),
      ]);

      // Cancel remaining providers
      for (const [name, controller] of controllers) {
        if (name !== winner.provider) {
          controller.abort();
        }
      }

      const totalLatency = Date.now() - startTime;

      // Record race result
      this._recordRaceResult({
        raceId,
        workloadType,
        winner: winner.provider,
        latency: totalLatency,
        participants: participants.map(p => p.name),
      });

      this.emit('race:complete', {
        raceId,
        winner: winner.provider,
        latency: totalLatency,
        workloadType,
      });

      return {
        raceId,
        provider: winner.provider,
        result: winner.result,
        latency: totalLatency,
        workloadType,
        score: winner.score,
      };
    } finally {
      this.activeRaces--;
      // Ensure all aborted
      for (const [, controller] of controllers) {
        try { controller.abort(); } catch (_) { /* noop */ }
      }
    }
  }

  /**
   * Stream-race: race providers but stream from the first to start emitting
   */
  async streamRace(request, options = {}) {
    const workloadType = options.workloadType || this._classifyWorkload(request);
    const participants = this.selectRaceParticipants(
      workloadType,
      options.maxParticipants || FIB[4]
    );

    if (participants.length === 0) {
      throw new Error('No healthy providers available for streaming');
    }

    const raceId = `srace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const controllers = new Map();
    const startTime = Date.now();

    this.emit('stream-race:start', { raceId, participants: participants.map(p => p.name) });

    // Create a ReadableStream that resolves to the first provider to emit chunks
    let resolvedProvider = null;

    const streams = participants.map(({ name }) => {
      const controller = new AbortController();
      controllers.set(name, controller);
      return {
        name,
        promise: this._executeStreamProvider(name, request, controller.signal),
      };
    });

    // Wait for first stream to yield
    const firstStream = await Promise.race(
      streams.map(({ name, promise }) =>
        promise
          .then(stream => ({ name, stream, success: true }))
          .catch(error => ({ name, error: error.message, success: false }))
      )
    );

    if (!firstStream.success) {
      // First to resolve was an error — try to find any success
      const remaining = await Promise.allSettled(
        streams
          .filter(s => s.name !== firstStream.name)
          .map(({ name, promise }) =>
            promise.then(stream => ({ name, stream }))
          )
      );

      const success = remaining.find(r => r.status === 'fulfilled');
      if (!success) {
        throw new Error('All stream providers failed');
      }
      resolvedProvider = success.value.name;

      // Cancel losers
      for (const [name, ctrl] of controllers) {
        if (name !== resolvedProvider) ctrl.abort();
      }

      return { raceId, provider: resolvedProvider, stream: success.value.stream };
    }

    resolvedProvider = firstStream.name;

    // Cancel losers
    for (const [name, ctrl] of controllers) {
      if (name !== resolvedProvider) ctrl.abort();
    }

    const latency = Date.now() - startTime;
    this.emit('stream-race:complete', { raceId, winner: resolvedProvider, latency });

    return {
      raceId,
      provider: resolvedProvider,
      stream: firstStream.stream,
      latency,
      workloadType,
    };
  }

  /**
   * Get current provider health summary
   */
  getProviderHealth() {
    const health = {};
    for (const [name, provider] of this.providers) {
      health[name] = {
        healthy: provider.healthy && !provider.circuitOpen,
        circuitOpen: provider.circuitOpen,
        latencyEma: Math.round(provider.latencyEma),
        successRate: Math.round(provider.successRate * 1000) / 1000,
        totalRequests: provider.totalRequests,
        consecutiveFailures: provider.consecutiveFailures,
        rpmUsage: provider.maxRpm > 0 ? provider.currentRpm / provider.maxRpm : 0,
      };
    }
    return health;
  }

  /**
   * Get race statistics
   */
  getRaceStats() {
    if (this.raceHistory.length === 0) return { totalRaces: 0 };

    const winCounts = {};
    let totalLatency = 0;

    for (const race of this.raceHistory) {
      winCounts[race.winner] = (winCounts[race.winner] || 0) + 1;
      totalLatency += race.latency;
    }

    return {
      totalRaces: this.raceHistory.length,
      activeRaces: this.activeRaces,
      avgLatency: Math.round(totalLatency / this.raceHistory.length),
      winDistribution: winCounts,
    };
  }

  // === INTERNAL METHODS ===

  /**
   * Execute a single provider with timeout and health tracking
   */
  async _executeProvider(name, request, signal, timeoutMs) {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider not found: ${name}`);

    this._refreshRpmWindow(provider);
    provider.currentRpm++;
    provider.totalRequests++;

    const start = Date.now();

    try {
      const result = await Promise.race([
        provider.adapter(request, { signal, byokKey: provider.byokKey }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Provider timeout')), timeoutMs)
        ),
      ]);

      const latency = Date.now() - start;
      this._recordSuccess(provider, latency);
      return result;
    } catch (error) {
      this._recordFailure(provider);
      throw error;
    }
  }

  /**
   * Execute a streaming provider
   */
  async _executeStreamProvider(name, request, signal) {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Provider not found: ${name}`);

    this._refreshRpmWindow(provider);
    provider.currentRpm++;
    provider.totalRequests++;

    try {
      const stream = await provider.adapter(request, { signal, stream: true, byokKey: provider.byokKey });
      this._recordSuccess(provider, 0); // latency tracked per-chunk
      return stream;
    } catch (error) {
      this._recordFailure(provider);
      throw error;
    }
  }

  /**
   * Find first successful result from race promises
   */
  async _findFirstSuccess(promises, controllers) {
    const results = [];
    let resolvedCount = 0;

    return new Promise((resolve, reject) => {
      for (const promise of promises) {
        promise.then(result => {
          resolvedCount++;
          if (result.success) {
            resolve(result);
          } else {
            results.push(result);
            if (resolvedCount === promises.length) {
              reject(new Error('All providers failed: ' +
                results.map(r => `${r.provider}:${r.error}`).join(', ')));
            }
          }
        });
      }
    });
  }

  /**
   * Race timeout promise
   */
  _raceTimeout(timeoutMs, raceId) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Race timeout: ${raceId} after ${timeoutMs}ms`)), timeoutMs)
    );
  }

  /**
   * Classify workload type from request using simple heuristics
   */
  _classifyWorkload(request) {
    const text = (request.prompt || request.messages?.[0]?.content || '').toLowerCase();

    if (text.includes('code') || text.includes('function') || text.includes('implement')) {
      return 'code-generation';
    }
    if (text.includes('search') || text.includes('find') || text.includes('look up')) {
      return 'search-augmented';
    }
    if (text.includes('analyze') || text.includes('reason') || text.includes('explain why')) {
      return 'deep-reasoning';
    }
    if (text.includes('write') || text.includes('story') || text.includes('creative')) {
      return 'creative-writing';
    }
    if (text.includes('image') || text.includes('vision') || text.includes('picture')) {
      return 'multimodal';
    }
    if (request.tools || request.functions) {
      return 'tool-execution';
    }
    return 'fast-interactive';
  }

  /**
   * Record successful provider execution — update EMA and success rate
   */
  _recordSuccess(provider, latency) {
    // Exponential moving average with α = ψ ≈ 0.618
    if (latency > 0) {
      provider.latencyEma = PSI * latency + (1 - PSI) * provider.latencyEma;
    }
    provider.consecutiveFailures = 0;
    provider.successRate = Math.min(1.0,
      PSI * 1.0 + (1 - PSI) * provider.successRate
    );

    // Close circuit if it was in half-open
    if (provider.circuitOpen) {
      provider.circuitOpen = false;
      provider.circuitOpenedAt = null;
      this.emit('circuit:closed', { provider: provider.name });
    }
  }

  /**
   * Record provider failure — track for circuit breaking
   */
  _recordFailure(provider) {
    provider.totalFailures++;
    provider.consecutiveFailures++;
    provider.lastFailureAt = Date.now();
    provider.successRate = PSI * 0.0 + (1 - PSI) * provider.successRate;

    // Open circuit after fib(5)=5 consecutive failures
    if (provider.consecutiveFailures >= FIB[5]) {
      provider.circuitOpen = true;
      provider.circuitOpenedAt = Date.now();
      this.emit('circuit:opened', { provider: provider.name, failures: provider.consecutiveFailures });

      // Schedule half-open probe after φ-backoff
      const cooldownMs = Math.round(PHI * 1000 * Math.pow(PHI, Math.min(provider.consecutiveFailures, FIB[6])));
      setTimeout(() => {
        if (provider.circuitOpen) {
          provider.circuitOpen = false; // allow one probe
          this.emit('circuit:half-open', { provider: provider.name });
        }
      }, cooldownMs);
    }
  }

  /**
   * Refresh RPM window — reset count every 60s
   */
  _refreshRpmWindow(provider) {
    const now = Date.now();
    if (now - provider.rpmWindowStart > 60000) {
      provider.currentRpm = 0;
      provider.rpmWindowStart = now;
    }
  }

  /**
   * Record race outcome for statistics
   */
  _recordRaceResult(result) {
    this.raceHistory.push(result);
    if (this.raceHistory.length > this.maxHistorySize) {
      this.raceHistory.shift();
    }
  }
}
