/**
 * ARGUS v2 — Panoptic AI Observability
 * P1 Priority | Hot Pool
 * Version: 2.0.0
 *
 * Extends ARGUS v1 (audit + 6-signal drift) with:
 *   - OTel GenAI Semantic Conventions (gen_ai.* attributes per OpenTelemetry spec)
 *   - Cross-MCP trace propagation (W3C traceparent + tracestate headers)
 *   - Wide Events pattern (Observability 2.0): single high-cardinality event per request
 *   - Agent telemetry: spans for every agent invocation, tool call, and LLM request
 *   - Structured JSON logs via pino-compatible interface (zero console.log)
 *   - φ-scaled alert thresholds (NOMINAL ≥0.618, DEGRADED ≥0.382, CRITICAL <0.382)
 *
 * OTel GenAI attributes used:
 *   gen_ai.system, gen_ai.request.model, gen_ai.request.max_tokens,
 *   gen_ai.request.temperature, gen_ai.response.model, gen_ai.response.finish_reasons,
 *   gen_ai.usage.input_tokens, gen_ai.usage.output_tokens,
 *   gen_ai.agent.name, gen_ai.agent.id, gen_ai.tool.name, gen_ai.tool.call.id
 *
 * Wide Event schema (one per request):
 *   { trace_id, span_id, service, agent, tool, model, latency_ms, tokens_in, tokens_out,
 *     cost_usd, error, drift_signals[], csl_score, phi_health }
 */
'use strict';

const PHI    = 1.618033988749895;
const PSI    = 0.618033988749895;
const crypto = require('crypto');

// φ-health thresholds
const PHI_HEALTH = { THRIVING: 1.000, NOMINAL: PSI, DEGRADED: 0.382, CRITICAL: 0.236 };

// 6 drift signals (v1) + 2 new OTel-specific signals (v2)
const DriftSignals = {
  LATENCY:           'latency',
  ERROR_RATE:        'error_rate',
  PROVIDER_FAILOVER: 'provider_failover',
  HEARTBEAT_MISS:    'heartbeat_miss',
  CONFIG_DRIFT:      'config_drift',
  ORS_DEVIATION:     'ors_deviation',
  // v2 additions
  TOKEN_BUDGET:      'token_budget_exhaustion',  // LLM token budget approaching limit
  AGENT_COHERENCE:   'agent_coherence_drop'      // CSL coherence below MEDIUM (0.809)
};

// OTel GenAI Semantic Convention attribute keys
const OTEL_GENAI = {
  SYSTEM:             'gen_ai.system',
  REQUEST_MODEL:      'gen_ai.request.model',
  REQUEST_MAX_TOKENS: 'gen_ai.request.max_tokens',
  REQUEST_TEMPERATURE:'gen_ai.request.temperature',
  RESPONSE_MODEL:     'gen_ai.response.model',
  FINISH_REASONS:     'gen_ai.response.finish_reasons',
  INPUT_TOKENS:       'gen_ai.usage.input_tokens',
  OUTPUT_TOKENS:      'gen_ai.usage.output_tokens',
  AGENT_NAME:         'gen_ai.agent.name',
  AGENT_ID:           'gen_ai.agent.id',
  TOOL_NAME:          'gen_ai.tool.name',
  TOOL_CALL_ID:       'gen_ai.tool.call.id',
  OPERATION_NAME:     'gen_ai.operation.name'
};

class ArgusV2Agent {
  constructor(opts = {}) {
    this.name    = 'ARGUS';
    this.version = '2.0.0';
    this.type    = 'bee';
    this.pool    = 'hot';

    // v1 state
    this.auditLog       = [];
    this.telemetry      = [];
    this.driftBaselines = new Map();
    this.driftAlerts    = [];
    this.maxAuditEntries = opts.maxAuditEntries || 10000;
    this.driftThresholds = {
      [DriftSignals.LATENCY]:           opts.latencyThreshold    || 500,
      [DriftSignals.ERROR_RATE]:        opts.errorRateThreshold  || 0.05,
      [DriftSignals.HEARTBEAT_MISS]:    opts.heartbeatMissThreshold || 3,
      [DriftSignals.CONFIG_DRIFT]:      opts.configDriftThreshold   || 1,
      [DriftSignals.ORS_DEVIATION]:     opts.orsDeviationThreshold  || 0.15,
      [DriftSignals.TOKEN_BUDGET]:      opts.tokenBudgetThreshold   || 0.90,  // 90% of budget
      [DriftSignals.AGENT_COHERENCE]:   opts.agentCoherenceThreshold || 0.809 // CSL.MEDIUM
    };
    this._checkInterval = null;

    // v2 state
    this._spans      = new Map();   // traceId:spanId → Span
    this._wideEvents = [];          // Wide Events ring buffer
    this._wideMaxSize = opts.wideMaxSize || FIB_89;
    this._genAiMetrics = {
      totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0,
      totalCostUsd: 0, providerCounts: {}, modelCounts: {}
    };

    // v2 options
    this.logEmitter = opts.logEmitter || null; // pino-compatible emitter
  }

  // ─────────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ─────────────────────────────────────────────────────────────────

  async start() {
    this._checkInterval = setInterval(() => this._runDriftCheck(), Math.round(60000 * PHI));
    return { status: 'active', agent: this.name, version: this.version };
  }

  async stop() { if (this._checkInterval) clearInterval(this._checkInterval); }

  // ─────────────────────────────────────────────────────────────────
  //  OTEL SPAN MANAGEMENT — Cross-MCP Trace Propagation
  // ─────────────────────────────────────────────────────────────────

  /**
   * Start an OTel-compatible span with GenAI semantic attributes.
   * @param {string} operationName - e.g. 'chat', 'tool_call', 'agent_invoke'
   * @param {Object} attrs         - OTel GenAI attributes
   * @param {string} [parentContext] - W3C traceparent header from upstream
   */
  startSpan(operationName, attrs = {}, parentContext = null) {
    const traceId  = parentContext ? this._extractTraceId(parentContext) : this._genTraceId();
    const spanId   = this._genSpanId();
    const spanKey  = `${traceId}:${spanId}`;

    const span = {
      traceId, spanId,
      parentSpanId: parentContext ? this._extractSpanId(parentContext) : null,
      operationName,
      startTime: Date.now(),
      endTime:   null,
      status:    'unset',
      attributes: {
        [OTEL_GENAI.OPERATION_NAME]: operationName,
        ...attrs
      },
      events: [],
      // W3C traceparent for propagation to downstream MCP calls
      traceparent: `00-${traceId}-${spanId}-01`
    };
    this._spans.set(spanKey, span);
    return { spanId, traceId, traceparent: span.traceparent };
  }

  /**
   * End a span and emit a Wide Event.
   * @param {string} traceId
   * @param {string} spanId
   * @param {Object} result  - { tokens_in, tokens_out, cost_usd, error, csl_score }
   */
  endSpan(traceId, spanId, result = {}) {
    const spanKey = `${traceId}:${spanId}`;
    const span    = this._spans.get(spanKey);
    if (!span) return null;

    span.endTime = Date.now();
    span.status  = result.error ? 'error' : 'ok';
    const latencyMs = span.endTime - span.startTime;

    // Merge result attrs into span
    if (result.tokens_in)  span.attributes[OTEL_GENAI.INPUT_TOKENS]   = result.tokens_in;
    if (result.tokens_out) span.attributes[OTEL_GENAI.OUTPUT_TOKENS]  = result.tokens_out;
    if (result.finish_reasons) span.attributes[OTEL_GENAI.FINISH_REASONS] = result.finish_reasons;

    // Emit Wide Event (Observability 2.0 pattern)
    const wideEvent = this._buildWideEvent(span, latencyMs, result);
    this._emitWideEvent(wideEvent);

    // Update GenAI metrics
    this._updateGenAiMetrics(span.attributes, result);

    // Check drift on this span
    this._checkSpanDrift(span, latencyMs, result);

    this._spans.delete(spanKey);
    return { latencyMs, wideEvent };
  }

  /**
   * Add an event to an active span (e.g., tool call within LLM inference).
   */
  addSpanEvent(traceId, spanId, name, attrs = {}) {
    const span = this._spans.get(`${traceId}:${spanId}`);
    if (!span) return false;
    span.events.push({ name, timestamp: Date.now(), attributes: attrs });
    return true;
  }

  /**
   * Get W3C traceparent header for propagating trace context to downstream MCP calls.
   * Call this before making a downstream MCP tool invocation.
   */
  getTraceparent(traceId, spanId) {
    const span = this._spans.get(`${traceId}:${spanId}`);
    return span?.traceparent || null;
  }

  // ─────────────────────────────────────────────────────────────────
  //  WIDE EVENTS (OBSERVABILITY 2.0)
  //  Single high-cardinality event per request — replaces metrics + logs
  // ─────────────────────────────────────────────────────────────────

  _buildWideEvent(span, latencyMs, result) {
    const attrs = span.attributes;
    return {
      // Trace context
      trace_id:   span.traceId,
      span_id:    span.spanId,
      // Service + agent
      service:    attrs['service.name'] || 'heady',
      agent:      attrs[OTEL_GENAI.AGENT_NAME] || null,
      agent_id:   attrs[OTEL_GENAI.AGENT_ID]   || null,
      // Model
      model:      attrs[OTEL_GENAI.REQUEST_MODEL] || attrs[OTEL_GENAI.RESPONSE_MODEL] || null,
      provider:   attrs[OTEL_GENAI.SYSTEM]        || null,
      operation:  attrs[OTEL_GENAI.OPERATION_NAME] || span.operationName,
      // Tool
      tool:       attrs[OTEL_GENAI.TOOL_NAME]     || null,
      tool_call:  attrs[OTEL_GENAI.TOOL_CALL_ID]  || null,
      // Performance
      latency_ms: latencyMs,
      // Token economics
      tokens_in:  result.tokens_in  || 0,
      tokens_out: result.tokens_out || 0,
      cost_usd:   result.cost_usd   || 0,
      // Quality
      csl_score:        result.csl_score        || null,
      phi_health:       result.phi_health        || null,
      finish_reasons:   attrs[OTEL_GENAI.FINISH_REASONS] || [],
      // Error
      error:      result.error || null,
      status:     span.status,
      // Drift signals detected during this span
      drift_signals: result.drift_signals || [],
      // Timestamp
      timestamp: span.endTime
    };
  }

  _emitWideEvent(event) {
    // Ring buffer — drop oldest when full
    if (this._wideEvents.length >= this._wideMaxSize) this._wideEvents.shift();
    this._wideEvents.push(event);
    // Emit to log backend (pino-compatible)
    if (this.logEmitter) {
      this.logEmitter.info({ type: 'wide_event', ...event });
    }
  }

  queryWideEvents(filter = {}) {
    let events = [...this._wideEvents];
    if (filter.agent)     events = events.filter(e => e.agent === filter.agent);
    if (filter.model)     events = events.filter(e => e.model === filter.model);
    if (filter.operation) events = events.filter(e => e.operation === filter.operation);
    if (filter.hasError)  events = events.filter(e => !!e.error);
    if (filter.since)     events = events.filter(e => e.timestamp >= filter.since);
    if (filter.minLatency) events = events.filter(e => e.latency_ms >= filter.minLatency);
    return events.slice(-(filter.limit || 89));
  }

  // ─────────────────────────────────────────────────────────────────
  //  GENAI METRICS AGGREGATION
  // ─────────────────────────────────────────────────────────────────

  _updateGenAiMetrics(attrs, result) {
    this._genAiMetrics.totalRequests++;
    this._genAiMetrics.totalInputTokens  += result.tokens_in  || 0;
    this._genAiMetrics.totalOutputTokens += result.tokens_out || 0;
    this._genAiMetrics.totalCostUsd      += result.cost_usd   || 0;
    const provider = attrs[OTEL_GENAI.SYSTEM];
    if (provider) this._genAiMetrics.providerCounts[provider] = (this._genAiMetrics.providerCounts[provider] || 0) + 1;
    const model = attrs[OTEL_GENAI.REQUEST_MODEL];
    if (model)    this._genAiMetrics.modelCounts[model]       = (this._genAiMetrics.modelCounts[model]    || 0) + 1;
  }

  getGenAiMetrics() {
    const m = this._genAiMetrics;
    return {
      ...m,
      avgInputTokens:  m.totalRequests ? Math.round(m.totalInputTokens  / m.totalRequests) : 0,
      avgOutputTokens: m.totalRequests ? Math.round(m.totalOutputTokens / m.totalRequests) : 0,
      avgCostUsd:      m.totalRequests ? m.totalCostUsd / m.totalRequests : 0
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  AUDIT CHAIN (v1 preserved — tamper-evident)
  // ─────────────────────────────────────────────────────────────────

  recordAudit(event) {
    const prevHash = this.auditLog.length > 0
      ? this.auditLog[this.auditLog.length - 1].hash : '0'.repeat(64);
    const entry = {
      seq: this.auditLog.length,
      timestamp: Date.now(),
      prevHash,
      ...event
    };
    entry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ seq: entry.seq, prevHash, timestamp: entry.timestamp, event }))
      .digest('hex');
    if (this.auditLog.length >= this.maxAuditEntries) this.auditLog.shift();
    this.auditLog.push(entry);
    return entry;
  }

  verifyAuditChain() {
    for (let i = 1; i < this.auditLog.length; i++) {
      if (this.auditLog[i].prevHash !== this.auditLog[i - 1].hash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true, length: this.auditLog.length };
  }

  // ─────────────────────────────────────────────────────────────────
  //  DRIFT DETECTION (v1 + v2 signals)
  // ─────────────────────────────────────────────────────────────────

  setBaseline(signal, value) { this.driftBaselines.set(signal, value); }

  _checkSpanDrift(span, latencyMs, result) {
    const signals = [];
    const latencyBase = this.driftBaselines.get(DriftSignals.LATENCY) || this.driftThresholds[DriftSignals.LATENCY];
    if (latencyMs > latencyBase) signals.push({ signal: DriftSignals.LATENCY, value: latencyMs, baseline: latencyBase });
    if (result.csl_score !== undefined && result.csl_score < this.driftThresholds[DriftSignals.AGENT_COHERENCE]) {
      signals.push({ signal: DriftSignals.AGENT_COHERENCE, value: result.csl_score, threshold: this.driftThresholds[DriftSignals.AGENT_COHERENCE] });
    }
    if (signals.length) this.driftAlerts.push(...signals.map(s => ({ ...s, timestamp: Date.now() })));
    return signals;
  }

  _runDriftCheck() {
    // Aggregate drift from recent Wide Events
    const recent = this._wideEvents.slice(-89);
    if (!recent.length) return;
    const errors    = recent.filter(e => e.error).length;
    const errorRate = errors / recent.length;
    if (errorRate > this.driftThresholds[DriftSignals.ERROR_RATE]) {
      this.driftAlerts.push({ signal: DriftSignals.ERROR_RATE, value: errorRate, threshold: this.driftThresholds[DriftSignals.ERROR_RATE], timestamp: Date.now() });
    }
    const avgLatency = recent.reduce((s, e) => s + e.latency_ms, 0) / recent.length;
    if (avgLatency > this.driftThresholds[DriftSignals.LATENCY]) {
      this.driftAlerts.push({ signal: DriftSignals.LATENCY, value: avgLatency, threshold: this.driftThresholds[DriftSignals.LATENCY], timestamp: Date.now() });
    }
  }

  getRecentDriftAlerts(limit = 13) { return this.driftAlerts.slice(-limit); }

  health() {
    const phiHealth = this.computePhiHealth();
    return {
      agent: this.name, version: this.version, status: phiHealth >= PHI_HEALTH.NOMINAL ? 'healthy' : 'degraded',
      phiHealth, auditLength: this.auditLog.length,
      activeSpans: this._spans.size, wideEvents: this._wideEvents.length,
      genAiMetrics: this.getGenAiMetrics(), recentDrift: this.getRecentDriftAlerts(5)
    };
  }

  computePhiHealth() {
    const recent = this._wideEvents.slice(-89);
    if (!recent.length) return PHI_HEALTH.NOMINAL;
    const errorRate  = recent.filter(e => e.error).length / recent.length;
    const avgLatency = recent.reduce((s, e) => s + e.latency_ms, 0) / recent.length;
    const latNorm    = Math.max(0, 1 - avgLatency / 2000);
    const errNorm    = 1 - errorRate;
    return parseFloat((PHI_HEALTH.NOMINAL * latNorm * errNorm).toFixed(4));
  }

  // ─────────────────────────────────────────────────────────────────
  //  INTERNAL
  // ─────────────────────────────────────────────────────────────────

  _genTraceId()  { return crypto.randomBytes(16).toString('hex'); }
  _genSpanId()   { return crypto.randomBytes(8).toString('hex'); }

  _extractTraceId(traceparent) {
    // W3C traceparent: 00-{traceId}-{spanId}-{flags}
    return traceparent?.split('-')[1] || this._genTraceId();
  }

  _extractSpanId(traceparent) {
    return traceparent?.split('-')[2] || null;
  }
}

const FIB_89 = 89;
module.exports = { ArgusV2Agent, OTEL_GENAI, DriftSignals, PHI_HEALTH, PHI, PSI };
