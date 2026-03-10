// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Incident Responder — Automated Detection, Classification & Response
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI2, PSI3, FIB, CSL_THRESHOLDS,
  cslGate, sha256, phiBackoff
} from '../shared/phi-math-v2.js';
import { textToEmbedding, cosineSimilarity } from '../shared/csl-engine-v2.js';

const SEVERITY_LEVELS = Object.freeze({
  critical: { threshold: CSL_THRESHOLDS.CRITICAL, autoRemediate: true, escalateAfterMs: FIB[5] * 60000 },
  high:     { threshold: CSL_THRESHOLDS.HIGH,     autoRemediate: true, escalateAfterMs: FIB[7] * 60000 },
  medium:   { threshold: CSL_THRESHOLDS.MEDIUM,   autoRemediate: false, escalateAfterMs: FIB[8] * 60000 },
  low:      { threshold: CSL_THRESHOLDS.LOW,       autoRemediate: false, escalateAfterMs: FIB[10] * 60000 },
});

const KNOWN_PATTERNS = Object.freeze([
  { id: 'circuit-open', description: 'Circuit breaker opened', remediation: 'Wait for half-open probe' },
  { id: 'drift-critical', description: 'Critical semantic drift detected', remediation: 'Trigger self-healing cycle' },
  { id: 'budget-exceeded', description: 'LLM budget exceeded', remediation: 'Auto-downgrade provider' },
  { id: 'memory-pressure', description: 'Vector memory pressure high', remediation: 'Trigger LRU eviction' },
  { id: 'auth-failure', description: 'Authentication failure spike', remediation: 'Rate limit and alert' },
]);

class IncidentResponder {
  #incidents;
  #maxIncidents;
  #patternEmbeddings;
  #remediationLog;

  constructor() {
    this.#incidents = new Map();
    this.#maxIncidents = FIB[16];
    this.#patternEmbeddings = new Map();
    this.#remediationLog = [];

    for (const pattern of KNOWN_PATTERNS) {
      this.#patternEmbeddings.set(pattern.id, textToEmbedding(pattern.description));
    }
  }

  async detect(signal, source = 'system') {
    const signalEmb = typeof signal === 'string' ? textToEmbedding(signal) : signal;
    let bestMatch = null;
    let bestScore = -1;

    for (const [patternId, patternEmb] of this.#patternEmbeddings) {
      const score = cosineSimilarity(signalEmb, patternEmb);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = patternId;
      }
    }

    const isIncident = bestScore >= CSL_THRESHOLDS.LOW;
    if (!isIncident) return { detected: false, bestMatch, score: bestScore };

    const incidentId = await sha256('incident:' + source + ':' + Date.now());
    const incident = {
      id: incidentId, source, signal: typeof signal === 'string' ? signal : 'embedding',
      patternMatch: bestMatch, matchScore: bestScore,
      severity: this.classify(bestScore),
      status: 'open', detectedAt: Date.now(),
    };

    this.#incidents.set(incidentId, incident);
    return { detected: true, incident };
  }

  classify(score) {
    if (score >= SEVERITY_LEVELS.critical.threshold) return 'critical';
    if (score >= SEVERITY_LEVELS.high.threshold) return 'high';
    if (score >= SEVERITY_LEVELS.medium.threshold) return 'medium';
    return 'low';
  }

  async respond(incidentId) {
    const incident = this.#incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    const pattern = KNOWN_PATTERNS.find(p => p.id === incident.patternMatch);
    const severityConfig = SEVERITY_LEVELS[incident.severity];

    if (severityConfig.autoRemediate && pattern) {
      const remediation = {
        incidentId, action: pattern.remediation,
        automated: true, executedAt: Date.now(),
      };
      this.#remediationLog.push(remediation);
      incident.status = 'remediated';
      return { responded: true, remediation };
    }

    return { responded: false, reason: 'Manual intervention required', severity: incident.severity };
  }

  escalate(incidentId, to = 'HeadySoul') {
    const incident = this.#incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');
    incident.status = 'escalated';
    incident.escalatedTo = to;
    incident.escalatedAt = Date.now();
    return { escalated: true, to, incidentId };
  }

  getPostMortem(incidentId) {
    const incident = this.#incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');
    return {
      incident,
      remediations: this.#remediationLog.filter(r => r.incidentId === incidentId),
      duration: incident.status === 'open' ? Date.now() - incident.detectedAt : 0,
    };
  }

  getOpenIncidents() {
    return Array.from(this.#incidents.values()).filter(i => i.status === 'open');
  }
}

export { IncidentResponder, SEVERITY_LEVELS, KNOWN_PATTERNS };
export default IncidentResponder;
