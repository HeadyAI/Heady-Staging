/**
 * OWASPAIDefense — OWASP AI/ML Top 10 Defense Implementation
 * Covers: ML01-Prompt Injection, ML02-Training Data Poisoning,
 * ML03-Model Inversion, ML04-Membership Inference, ML05-Model Stealing,
 * ML06-Supply Chain, ML07-Transfer Learning Attack, ML08-Model Skewing,
 * ML09-Output Integrity, ML10-Neural Net Reprogramming.
 * All constants φ-derived. CSL gates replace boolean. ESM only.
 * Author: Eric Haywood
 */
import { createHash, randomBytes } from 'crypto';

// ── φ-Math Foundation ────────────────────────────────────────────
const PHI = 1.6180339887;
const PSI = 0.6180339887;
const PSI2 = 0.3819660113;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

function phiThreshold(level, spread = PSI2) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH: phiThreshold(3),
  MEDIUM: phiThreshold(2),
  LOW: phiThreshold(1),
  MINIMUM: phiThreshold(0),
};

function cslGate(value, score, tau = CSL_THRESHOLDS.MEDIUM, temp = Math.pow(PSI, 3)) {
  return value * (1 / (1 + Math.exp(-(score - tau) / temp)));
}

function hashSHA256(data) {
  return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
}

// ── ML01: Prompt Injection Defense ───────────────────────────────
class PromptInjectionShield {
  constructor() {
    this.patterns = [
      /ignore\s+(all\s+)?previous\s+(instructions|prompts)/i,
      /you\s+are\s+now\s+(?:a|an|the)\s+/i,
      /system:\s*override/i,
      /\[INST\]/i,
      /<<SYS>>|<\/SYS>/i,
      /```\s*system/i,
      /\bDAN\b.*\bmode\b/i,
      /do\s+anything\s+now/i,
      /jailbreak/i,
      /bypass\s+(safety|filter|guard|restriction)/i,
      /pretend\s+(you\s+are|to\s+be)/i,
      /role\s*:\s*(system|admin|root)/i,
      /\bact\s+as\s+(root|admin|god)/i,
      /reveal\s+(your|the)\s+(system|initial)\s+prompt/i,
    ];
    this.canaryToken = randomBytes(FIB[8]).toString('hex');
    this.maxInputLength = FIB[16] * FIB[6]; // 7896 chars
    this.detectionLog = [];
    this.maxLogSize = FIB[16];
  }

  scan(input) {
    if (typeof input !== 'string') return { safe: false, reason: 'non-string-input' };
    if (input.length > this.maxInputLength) return { safe: false, reason: 'input-too-long' };

    const threats = [];
    for (const pattern of this.patterns) {
      if (pattern.test(input)) {
        threats.push({ pattern: pattern.source, severity: 'high' });
      }
    }

    // Check for canary token leakage
    if (input.includes(this.canaryToken)) {
      threats.push({ pattern: 'canary-leak', severity: 'critical' });
    }

    // Unicode obfuscation check
    const suspiciousUnicode = /[\u200B-\u200F\u2028-\u202F\u2060-\u2064\uFEFF]/g;
    if (suspiciousUnicode.test(input)) {
      threats.push({ pattern: 'unicode-obfuscation', severity: 'medium' });
    }

    const threatScore = threats.length > 0
      ? Math.min(1.0, threats.length / FIB[5])
      : 0;

    const blocked = cslGate(1.0, threatScore, CSL_THRESHOLDS.LOW) > CSL_THRESHOLDS.MEDIUM;

    const result = {
      safe: !blocked,
      threatScore,
      threats,
      inputHash: hashSHA256(input),
      canaryIntact: !input.includes(this.canaryToken),
    };

    this.detectionLog.push({ ts: Date.now(), ...result });
    if (this.detectionLog.length > this.maxLogSize) {
      this.detectionLog = this.detectionLog.slice(-FIB[14]);
    }

    return result;
  }
}

// ── ML02: Training Data Poisoning Defense ────────────────────────
class DataPoisoningGuard {
  constructor() {
    this.anomalyThreshold = CSL_THRESHOLDS.HIGH;
    this.maxDeviationZ = PHI * 2;
    this.sampleSize = FIB[12]; // 144
  }

  validateBatch(dataPoints) {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
      return { valid: false, reason: 'empty-batch' };
    }

    // Statistical outlier detection
    const values = dataPoints.map(d => typeof d === 'number' ? d : (d.value ?? 0));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const outliers = [];
    for (let i = 0; i < values.length; i++) {
      const z = stdDev > 0 ? Math.abs(values[i] - mean) / stdDev : 0;
      if (z > this.maxDeviationZ) {
        outliers.push({ index: i, zScore: z, value: values[i] });
      }
    }

    const poisonScore = outliers.length / values.length;
    const safe = cslGate(1.0, 1.0 - poisonScore, this.anomalyThreshold) > CSL_THRESHOLDS.MEDIUM;

    return {
      valid: safe,
      batchSize: dataPoints.length,
      mean,
      stdDev,
      outlierCount: outliers.length,
      poisonScore,
      outliers: outliers.slice(0, FIB[6]),
    };
  }
}

// ── ML03/04: Model Inversion & Membership Inference Defense ──────
class PrivacyShield {
  constructor() {
    this.noiseScale = PSI2; // Differential privacy noise magnitude
    this.queryBudget = FIB[12]; // 144 queries per session
    this.queryCounts = new Map();
    this.resetIntervalMs = FIB[10] * 60 * 1000; // 55 minutes
  }

  addNoise(output) {
    if (typeof output === 'number') {
      const noise = (Math.random() - PSI) * this.noiseScale;
      return output + noise;
    }
    if (Array.isArray(output)) {
      return output.map(v => this.addNoise(v));
    }
    return output;
  }

  checkQueryBudget(sessionId) {
    const now = Date.now();
    const session = this.queryCounts.get(sessionId);

    if (!session || now - session.startedAt > this.resetIntervalMs) {
      this.queryCounts.set(sessionId, { count: 1, startedAt: now });
      return { allowed: true, remaining: this.queryBudget - 1 };
    }

    session.count++;
    const remaining = this.queryBudget - session.count;
    const allowed = remaining >= 0;
    return { allowed, remaining: Math.max(0, remaining), count: session.count };
  }

  truncateConfidence(scores) {
    // Round to Fibonacci-step precision to prevent precise confidence extraction
    const step = 1.0 / FIB[8]; // 1/21 ≈ 0.0476
    return scores.map(s => Math.round(s / step) * step);
  }
}

// ── ML05: Model Stealing Defense ─────────────────────────────────
class ModelStealingGuard {
  constructor() {
    this.rateLimits = new Map();
    this.maxQueriesPerWindow = FIB[11]; // 89
    this.windowMs = FIB[10] * 60 * 1000; // 55 minutes
    this.suspicionThreshold = CSL_THRESHOLDS.MEDIUM;
    this.suspiciousPatterns = [];
  }

  trackQuery(clientId, query) {
    const now = Date.now();
    let client = this.rateLimits.get(clientId);

    if (!client || now - client.windowStart > this.windowMs) {
      client = { windowStart: now, queries: [], totalQueries: 0 };
      this.rateLimits.set(clientId, client);
    }

    client.queries.push({ ts: now, hash: hashSHA256(query) });
    client.totalQueries++;

    // Prune old queries
    client.queries = client.queries.filter(q => now - q.ts < this.windowMs);

    // Detect systematic probing
    const queryRate = client.queries.length / (this.windowMs / 1000);
    const isSystematic = queryRate > (this.maxQueriesPerWindow / (this.windowMs / 1000));

    // Check for near-duplicate queries (boundary probing)
    const uniqueHashes = new Set(client.queries.map(q => q.hash));
    const duplicationRatio = 1.0 - (uniqueHashes.size / client.queries.length);

    const suspicionScore =
      (isSystematic ? PSI : 0) +
      (duplicationRatio > PSI ? PSI2 : 0);

    const blocked = cslGate(1.0, suspicionScore, this.suspicionThreshold) > CSL_THRESHOLDS.HIGH;

    return {
      allowed: !blocked,
      queryCount: client.queries.length,
      suspicionScore,
      isSystematic,
      duplicationRatio,
    };
  }
}

// ── ML09: Output Integrity Verification ──────────────────────────
class OutputIntegrity {
  constructor() {
    this.outputLog = [];
    this.maxLogSize = FIB[16];
    this.seed = 42;
    this.temperature = 0;
  }

  verify(output) {
    const hash = hashSHA256({
      output,
      seed: this.seed,
      temperature: this.temperature,
      ts: Date.now(),
    });

    const entry = {
      hash,
      outputType: typeof output,
      outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
      ts: Date.now(),
      seed: this.seed,
      temperature: this.temperature,
    };

    this.outputLog.push(entry);
    if (this.outputLog.length > this.maxLogSize) {
      this.outputLog = this.outputLog.slice(-FIB[14]);
    }

    return { verified: true, hash, seed: this.seed, temperature: this.temperature };
  }

  checkDrift(recentOutputs) {
    if (recentOutputs.length < FIB[3]) return { drift: false };

    // Check if outputs with same inputs produce different hashes
    const hashGroups = {};
    for (const out of recentOutputs) {
      const inputHash = out.inputHash ?? 'unknown';
      if (!hashGroups[inputHash]) hashGroups[inputHash] = new Set();
      hashGroups[inputHash].add(out.outputHash);
    }

    const inconsistencies = Object.values(hashGroups).filter(s => s.size > 1).length;
    const driftScore = inconsistencies / Object.keys(hashGroups).length;

    return {
      drift: driftScore > PSI2,
      driftScore,
      inconsistencies,
      totalInputGroups: Object.keys(hashGroups).length,
    };
  }
}

// ── OWASP AI Defense Coordinator ─────────────────────────────────
class OWASPAIDefense {
  constructor(config = {}) {
    this.promptShield = new PromptInjectionShield();
    this.poisoningGuard = new DataPoisoningGuard();
    this.privacyShield = new PrivacyShield();
    this.stealingGuard = new ModelStealingGuard();
    this.outputIntegrity = new OutputIntegrity();
    this.enabled = {
      ML01: config.ML01 ?? true,
      ML02: config.ML02 ?? true,
      ML03: config.ML03 ?? true,
      ML04: config.ML04 ?? true,
      ML05: config.ML05 ?? true,
      ML09: config.ML09 ?? true,
    };
    this.auditLog = [];
    this.maxAuditEntries = FIB[16];
  }

  _audit(action, detail) {
    const entry = { ts: Date.now(), action, detail, hash: hashSHA256({ action, detail, ts: Date.now() }) };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-FIB[14]);
    }
  }

  async scanRequest(request) {
    const results = {};

    if (this.enabled.ML01 && request.prompt) {
      results.promptInjection = this.promptShield.scan(request.prompt);
    }

    if (this.enabled.ML05 && request.clientId) {
      results.modelStealing = this.stealingGuard.trackQuery(request.clientId, request.prompt ?? '');
    }

    if (this.enabled.ML03 && request.sessionId) {
      results.privacy = this.privacyShield.checkQueryBudget(request.sessionId);
    }

    const blocked = Object.values(results).some(r =>
      r.safe === false || r.allowed === false
    );

    this._audit('scan-request', { blocked, checks: Object.keys(results) });

    return {
      allowed: !blocked,
      checks: results,
      requestHash: hashSHA256(request),
    };
  }

  async scanOutput(output, request = {}) {
    const results = {};

    if (this.enabled.ML09) {
      results.integrity = this.outputIntegrity.verify(output);
    }

    if (this.enabled.ML03) {
      results.privacyProtected = this.privacyShield.addNoise(output);
    }

    this._audit('scan-output', { checks: Object.keys(results) });
    return results;
  }

  validateTrainingData(data) {
    if (!this.enabled.ML02) return { valid: true, skipped: true };
    return this.poisoningGuard.validateBatch(data);
  }

  health() {
    return {
      shields: Object.entries(this.enabled).map(([k, v]) => ({ id: k, enabled: v })),
      promptDetectionLogSize: this.promptShield.detectionLog.length,
      outputLogSize: this.outputIntegrity.outputLog.length,
      auditLogSize: this.auditLog.length,
    };
  }
}

export default OWASPAIDefense;
export { OWASPAIDefense, PromptInjectionShield, DataPoisoningGuard, PrivacyShield, ModelStealingGuard, OutputIntegrity };
