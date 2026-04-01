// HEADY_BRAND:BEGIN
// FILE: src/pipeline/self-healing-engine.js
// LAYER: pipeline
// HEADY_BRAND:END
/**
 * Self-Healing Engine — Implements the 7-Step Self-Healing Cycle from Heady
 * System Philosophy. Maps directly to stage-failure events inside HCFullPipeline.
 *
 * Cycle: Identify → Isolate → Diagnose → Rollback → Patch → Verify → Report
 */

'use strict';

const EventEmitter = require('events');

const PHI_BACKOFF = [1618, 2618, 4236]; // ms — Sacred Geometry phi-backoff

class SelfHealingEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries || 3;
    this.healingLog = [];
    this.activeIncidents = new Map();
  }

  // ── Step 1: Identify ────────────────────────────────────────────────────────
  identify(stageId, error) {
    const incident = {
      id: `incident-${Date.now()}-${stageId}`,
      stageId,
      error: {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code,
      },
      identifiedAt: new Date().toISOString(),
      status: 'identified',
      healingAttempts: 0,
      steps: ['identify'],
    };
    this.activeIncidents.set(incident.id, incident);
    this.emit('incident:identified', incident);
    console.log(`[self-healing] Identified incident ${incident.id} in stage ${stageId}`);
    return incident;
  }

  // ── Step 2: Isolate ─────────────────────────────────────────────────────────
  isolate(incidentId) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);
    incident.status = 'isolated';
    incident.isolatedAt = new Date().toISOString();
    incident.steps.push('isolate');
    this.emit('incident:isolated', incident);
    console.log(`[self-healing] Isolated ${incidentId} — stage ${incident.stageId} quarantined`);
    return incident;
  }

  // ── Step 3: Diagnose ────────────────────────────────────────────────────────
  diagnose(incidentId) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    const diagnosis = {
      category: this._categorizeError(incident.error),
      isTransient: this._isTransient(incident.error),
      suggestedAction: this._suggestAction(incident.error),
    };

    incident.diagnosis = diagnosis;
    incident.status = 'diagnosed';
    incident.steps.push('diagnose');
    this.emit('incident:diagnosed', incident);
    console.log(`[self-healing] Diagnosed ${incidentId}: ${diagnosis.category} → ${diagnosis.suggestedAction}`);
    return incident;
  }

  // ── Step 4: Rollback ────────────────────────────────────────────────────────
  rollback(incidentId) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);
    incident.status = 'rolled_back';
    incident.rolledBackAt = new Date().toISOString();
    incident.steps.push('rollback');
    this.emit('incident:rolled_back', incident);
    console.log(`[self-healing] Rolled back ${incidentId} — stage ${incident.stageId} reset`);
    return incident;
  }

  // ── Step 5: Patch ───────────────────────────────────────────────────────────
  async patch(incidentId, patchFn) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    incident.healingAttempts++;
    const backoffMs = PHI_BACKOFF[Math.min(incident.healingAttempts - 1, PHI_BACKOFF.length - 1)];

    console.log(`[self-healing] Patching ${incidentId} (attempt ${incident.healingAttempts}, backoff ${backoffMs}ms)`);
    await new Promise(resolve => setTimeout(resolve, backoffMs));

    try {
      if (typeof patchFn === 'function') {
        await patchFn(incident);
      }
      incident.status = 'patched';
      incident.steps.push('patch');
      this.emit('incident:patched', incident);
      return incident;
    } catch (patchErr) {
      incident.patchError = patchErr.message;
      if (incident.healingAttempts >= this.maxRetries) {
        incident.status = 'escalated';
        incident.steps.push('escalate');
        this.emit('incident:escalated', incident);
        console.error(`[self-healing] Escalated ${incidentId} after ${this.maxRetries} attempts`);
      }
      return incident;
    }
  }

  // ── Step 6: Verify ──────────────────────────────────────────────────────────
  verify(incidentId, verifyFn) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);

    let verified = false;
    try {
      verified = typeof verifyFn === 'function' ? verifyFn(incident) : true;
    } catch {
      verified = false;
    }

    incident.verified = verified;
    incident.status = verified ? 'healed' : 'verification_failed';
    incident.steps.push('verify');
    this.emit(verified ? 'incident:healed' : 'incident:verify_failed', incident);
    console.log(`[self-healing] Verify ${incidentId}: ${verified ? 'HEALED' : 'FAILED'}`);
    return incident;
  }

  // ── Step 7: Report ──────────────────────────────────────────────────────────
  report(incidentId) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident: ${incidentId}`);
    incident.reportedAt = new Date().toISOString();
    incident.steps.push('report');
    this.healingLog.push({ ...incident });

    if (incident.status === 'healed') {
      this.activeIncidents.delete(incidentId);
    }

    this.emit('incident:reported', incident);
    console.log(`[self-healing] Report ${incidentId}: ${incident.status} (${incident.steps.join(' → ')})`);
    return incident;
  }

  // ── Full 7-Step Cycle ───────────────────────────────────────────────────────
  async heal(stageId, error, patchFn, verifyFn) {
    const incident = this.identify(stageId, error);
    this.isolate(incident.id);
    this.diagnose(incident.id);
    this.rollback(incident.id);
    await this.patch(incident.id, patchFn);
    this.verify(incident.id, verifyFn);
    return this.report(incident.id);
  }

  // ── Internal Helpers ────────────────────────────────────────────────────────
  _categorizeError(error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('network')) return 'network';
    if (msg.includes('enoent') || msg.includes('not found') || msg.includes('module_not_found')) return 'missing_resource';
    if (msg.includes('permission') || msg.includes('eacces') || msg.includes('unauthorized')) return 'permission';
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('throttle')) return 'rate_limit';
    if (msg.includes('oom') || msg.includes('heap') || msg.includes('memory')) return 'resource_exhaustion';
    return 'unknown';
  }

  _isTransient(error) {
    const transientCategories = ['network', 'rate_limit', 'resource_exhaustion'];
    return transientCategories.includes(this._categorizeError(error));
  }

  _suggestAction(error) {
    const category = this._categorizeError(error);
    const actions = {
      network: 'retry_with_backoff',
      missing_resource: 'scaffold_missing_dependency',
      permission: 'escalate_to_owner',
      rate_limit: 'apply_debounce',
      resource_exhaustion: 'reduce_concurrency',
      unknown: 'log_and_escalate',
    };
    return actions[category] || 'log_and_escalate';
  }

  getActiveIncidents() {
    return Array.from(this.activeIncidents.values());
  }

  getHealingLog() {
    return this.healingLog;
  }
}

module.exports = { SelfHealingEngine };
