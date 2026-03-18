'use strict';
const express = require('express');
const crypto = require('crypto');
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const POOLS = { HOT: 0.34, WARM: 0.21, COLD: 0.13, RESERVE: 0.08, GOVERNANCE: 0.05 };
const SERVICE_NAME = 'heady-guardian', PORT = 3417, startTime = Date.now();
/** Structured JSON logger with correlation ID support. */
function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), service: SERVICE_NAME, level, correlationId: meta.correlationId || 'system', msg, ...meta }) + '\n');
}
/** Circuit breaker with phi-scaled exponential backoff. */
class CircuitBreaker {
  constructor(name, opts = {}) {
    this.name = name; this.state = 'CLOSED'; this.failures = 0;
    this.threshold = opts.threshold || FIB[8]; this.resetTimeout = opts.resetTimeout || FIB[10] * 1000; this.lastFailure = 0;
  }
  async execute(fn) {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailure;
      const backoff = this.resetTimeout * Math.pow(PHI, Math.min(this.failures, FIB[7]));
      if (elapsed < backoff) throw new Error(`Circuit ${this.name} OPEN`);
      this.state = 'HALF_OPEN';
    }
    try { const result = await fn(); this.failures = 0; this.state = 'CLOSED'; return result; } catch (err) {
      this.failures++; this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN'; throw err;
    }
  }
}
const shutdownHandlers = [];
function onShutdown(fn) { shutdownHandlers.push(fn); }
async function shutdown(signal) {
  log('info', `${signal} received, graceful shutdown`);
  while (shutdownHandlers.length) await shutdownHandlers.pop()(); process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
/** BaseHeadyBee lifecycle: spawn() -> execute() -> report() -> retire(). */
class BaseHeadyBee {
  constructor(name) { this.name = name; this.status = 'IDLE'; this.spawnedAt = null; }
  async spawn() { this.status = 'SPAWNED'; this.spawnedAt = Date.now(); log('info', `${this.name} spawned`); }
  async execute() { this.status = 'EXECUTING'; }
  async report() { this.status = 'REPORTING'; return { name: this.name, status: this.status, uptime: Date.now() - this.spawnedAt }; }
  async retire() { this.status = 'RETIRED'; log('info', `${this.name} retired`); }
}
const INJECTION_PATTERNS = [
  { name: 'ignore_previous', regex: /ignore\s+(all\s+)?previous\s+(instructions|prompts|context)/i, weight: 0.92 },
  { name: 'system_prompt_leak', regex: /(?:reveal|show|print|output|display)\s+(?:your\s+)?(?:system\s+prompt|instructions|rules)/i, weight: 0.88 },
  { name: 'role_override', regex: /you\s+are\s+now\s+(?:a|an|the)\s+/i, weight: 0.85 },
  { name: 'jailbreak_attempt', regex: /(?:DAN|do\s+anything\s+now|developer\s+mode|unrestricted\s+mode)/i, weight: 0.95 },
  { name: 'delimiter_injection', regex: /(?:<\/?system>|<<\s*SYS\s*>>|\[INST\]|\[\/INST\])/i, weight: 0.90 },
  { name: 'encoding_evasion', regex: /(?:base64|rot13|hex)\s*(?:decode|encode|of)\s*/i, weight: 0.72 },
  { name: 'prompt_extraction', regex: /(?:repeat|echo)\s+(?:everything|all)\s+(?:above|before|prior)/i, weight: 0.87 },
  { name: 'context_manipulation', regex: /(?:forget|disregard|override)\s+(?:your|all|the)\s+(?:context|training|safety)/i, weight: 0.91 }
];
const EXFIL_PATTERNS = [
  { name: 'base64_pii', regex: /(?:[A-Za-z0-9+/]{40,}={0,2})/, weight: 0.65, check: (text) => { try { const d = Buffer.from(text.match(/[A-Za-z0-9+/]{40,}={0,2}/)?.[0] || '', 'base64').toString(); return /\b\d{3}-\d{2}-\d{4}\b/.test(d) || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i.test(d); } catch { return false; } } },
  { name: 'large_data_block', regex: /(?:\{[\s\S]{2000,}\}|\[[\s\S]{2000,}\])/, weight: 0.70 },
  { name: 'credential_pattern', regex: /(?:password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*\S+/i, weight: 0.88 },
  { name: 'ssn_pattern', regex: /\b\d{3}-\d{2}-\d{4}\b/, weight: 0.90 },
  { name: 'credit_card', regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/, weight: 0.92 },
  { name: 'bulk_email_harvest', regex: /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b\s*[,;\n]?\s*){5,}/i, weight: 0.78 }
];
/**
 * GuardianBee — Runtime security monitoring agent.
 * Detects prompt injection attacks and data exfiltration attempts,
 * scoring threats against CSL thresholds for graduated response actions:
 * ALLOW (below MINIMUM), LOG (LOW), WARN (MEDIUM), BLOCK (HIGH), QUARANTINE (CRITICAL).
 * @extends BaseHeadyBee
 */
class GuardianBee extends BaseHeadyBee {
  constructor() {
    super('GuardianBee'); this.threats = []; this.policies = []; this.scanCount = 0;
    this.breaker = new CircuitBreaker('guardian-scan');
  }
  /** Map a threat score to a CSL-gated action. */
  _scoreToAction(score) {
    if (score >= CSL.CRITICAL) return 'QUARANTINE'; if (score >= CSL.HIGH) return 'BLOCK';
    if (score >= CSL.MEDIUM) return 'WARN'; if (score >= CSL.LOW) return 'LOG'; return 'ALLOW';
  }
  /** Scan text for prompt injection patterns, returning threat score and matches. */
  scanPrompt(text) {
    this.scanCount++;
    const detected = []; let maxWeight = 0;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(text)) { detected.push({ pattern: pattern.name, weight: pattern.weight }); if (pattern.weight > maxWeight) maxWeight = pattern.weight; }
    }
    for (const policy of this.policies) {
      try { const re = new RegExp(policy.pattern, 'i'); if (re.test(text)) { detected.push({ pattern: `policy:${policy.name}`, weight: policy.cslGate }); if (policy.cslGate > maxWeight) maxWeight = policy.cslGate; } } catch { /* skip invalid regex */ }
    }
    const threatScore = Math.round((detected.length > 0 ? Math.min(1, maxWeight + (detected.length - 1) * PSI * 0.05) : 0) * 1000) / 1000;
    const action = this._scoreToAction(threatScore);
    const result = { threatScore, action, patternsDetected: detected, scannedLength: text.length, timestamp: Date.now() };
    if (threatScore >= CSL.LOW) { this.threats.push({ id: crypto.randomUUID(), type: 'PROMPT_INJECTION', ...result }); this._trimThreats(); }
    return result;
  }
  /** Scan payload for data exfiltration indicators. */
  scanData(payload) {
    this.scanCount++;
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const detected = []; let maxWeight = 0;
    for (const pattern of EXFIL_PATTERNS) {
      if (pattern.regex.test(text)) {
        const enhanced = pattern.check ? pattern.check(text) : false;
        const effectiveWeight = enhanced ? Math.min(1, pattern.weight * PHI) : pattern.weight;
        detected.push({ pattern: pattern.name, weight: Math.round(effectiveWeight * 1000) / 1000, enhanced });
        if (effectiveWeight > maxWeight) maxWeight = effectiveWeight;
      }
    }
    const payloadSize = Buffer.byteLength(text, 'utf8');
    if (payloadSize > FIB[16] * 1000) {
      const sizeWeight = Math.min(1, CSL.MEDIUM + (payloadSize / (FIB[16] * 10000)) * PSI);
      detected.push({ pattern: 'oversized_payload', weight: Math.round(sizeWeight * 1000) / 1000, enhanced: false });
      if (sizeWeight > maxWeight) maxWeight = sizeWeight;
    }
    const threatScore = Math.round(Math.min(1, detected.length > 0 ? maxWeight + (detected.length - 1) * PSI * 0.03 : 0) * 1000) / 1000;
    const action = this._scoreToAction(threatScore);
    const result = { threatScore, action, patternsDetected: detected, payloadSize, timestamp: Date.now() };
    if (threatScore >= CSL.LOW) { this.threats.push({ id: crypto.randomUUID(), type: 'DATA_EXFILTRATION', ...result }); this._trimThreats(); }
    return result;
  }
  /** Keep threat list bounded to last FIB[13] entries. */
  _trimThreats() { if (this.threats.length > FIB[13]) this.threats.splice(0, this.threats.length - FIB[13]); }
  /** Return active threats above CSL.LOW. */
  getActiveThreats() { return this.threats.filter(t => t.threatScore >= CSL.LOW).sort((a, b) => b.threatScore - a.threatScore); }
  /** Add a security policy with pattern, action, and CSL gate. */
  addPolicy(policy) {
    const entry = { id: crypto.randomUUID(), name: policy.name, pattern: policy.pattern, action: policy.action, cslGate: policy.cslGate || CSL.MEDIUM, createdAt: Date.now() };
    this.policies.push(entry); return entry;
  }
  async execute() { await super.execute(); log('info', 'GuardianBee executing security sweep'); return { activeThreats: this.getActiveThreats().length, totalScans: this.scanCount, policies: this.policies.length }; }
  async report() { const base = await super.report(); return { ...base, activeThreats: this.getActiveThreats().length, totalScans: this.scanCount }; }
}
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use((req, _res, next) => { req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID(); next(); });
const guardian = new GuardianBee();
app.get('/health', (_req, res) => {
  const activeThreats = guardian.getActiveThreats().length;
  const coherence = activeThreats === 0 ? 1.0 : Math.max(CSL.MINIMUM, 1 - activeThreats * PSI * 0.05);
  res.json({ status: 'ok', service: SERVICE_NAME, uptime: Date.now() - startTime, coherence: Math.round(coherence * 1000) / 1000, timestamp: new Date().toISOString() });
});
app.post('/scan/prompt', (req, res) => {
  const { text } = req.body; if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text string required' });
  const result = guardian.scanPrompt(text);
  log('info', 'Prompt scan completed', { correlationId: req.correlationId, threatScore: result.threatScore, action: result.action }); res.json(result);
});
app.post('/scan/data', (req, res) => {
  const { payload } = req.body; if (payload === undefined) return res.status(400).json({ error: 'payload required' });
  const result = guardian.scanData(payload);
  log('info', 'Data scan completed', { correlationId: req.correlationId, threatScore: result.threatScore, action: result.action }); res.json(result);
});
app.get('/threats', (req, res) => {
  const threats = guardian.getActiveThreats();
  log('info', 'Threats listed', { correlationId: req.correlationId, count: threats.length });
  res.json({ threats, count: threats.length, timestamp: new Date().toISOString() });
});
app.post('/policy', (req, res) => {
  const { name, pattern, action, cslGate } = req.body;
  if (!name || !pattern) return res.status(400).json({ error: 'name and pattern required' });
  const policy = guardian.addPolicy({ name, pattern, action: action || 'WARN', cslGate: cslGate || CSL.MEDIUM });
  log('info', 'Security policy created', { correlationId: req.correlationId, policy: name }); res.status(201).json(policy);
});
const server = app.listen(PORT, async () => { await guardian.spawn(); log('info', `${SERVICE_NAME} listening on port ${PORT}`); });
onShutdown(() => new Promise(resolve => server.close(resolve)));
onShutdown(() => guardian.retire());
module.exports = { app, GuardianBee, CircuitBreaker };
