// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ RBAC Engine — CSL-Gated Role-Based Access Control
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import {
  PHI, PSI, PSI2, PSI3, FIB, CSL_THRESHOLDS,
  cosineSimilarity, sha256, cslGate, phiThreshold
} from '../shared/phi-math-v2.js';
import { textToEmbedding, DIM } from '../shared/csl-engine-v2.js';

const ROLES = Object.freeze({
  admin:     { level: 4, cslThreshold: CSL_THRESHOLDS.CRITICAL, description: 'Full system access' },
  operator:  { level: 3, cslThreshold: CSL_THRESHOLDS.HIGH,     description: 'Operational management' },
  developer: { level: 2, cslThreshold: CSL_THRESHOLDS.MEDIUM,   description: 'Development access' },
  viewer:    { level: 1, cslThreshold: CSL_THRESHOLDS.LOW,      description: 'Read access' },
  service:   { level: 3, cslThreshold: CSL_THRESHOLDS.HIGH,     description: 'Service-to-service' },
  guest:     { level: 0, cslThreshold: CSL_THRESHOLDS.MINIMUM,  description: 'Minimal access' },
});

const PERMISSIONS = Object.freeze([
  'read', 'write', 'execute', 'delete', 'admin',
  'deploy', 'configure', 'monitor', 'audit', 'escalate',
]);

class RBACEngine {
  #users;
  #roleAssignments;
  #resourceGates;
  #auditTrail;
  #maxAudit;

  constructor() {
    this.#users = new Map();
    this.#roleAssignments = new Map();
    this.#resourceGates = new Map();
    this.#auditTrail = [];
    this.#maxAudit = FIB[20];
  }

  async authorize(userId, resource, permission) {
    const role = this.#roleAssignments.get(userId);
    if (!role) {
      await this.#audit(userId, resource, permission, false, 'No role assigned');
      return { authorized: false, reason: 'No role assigned' };
    }

    const roleConfig = ROLES[role];
    if (!roleConfig) {
      await this.#audit(userId, resource, permission, false, 'Invalid role');
      return { authorized: false, reason: 'Invalid role: ' + role };
    }

    const userEmb = textToEmbedding('user:' + userId + ':' + role);
    const resourceGate = this.#resourceGates.get(resource) || textToEmbedding('resource:' + resource);
    const permGate = textToEmbedding('permission:' + permission);

    const resourceScore = cosineSimilarity(userEmb, resourceGate);
    const permScore = cosineSimilarity(userEmb, permGate);
    const combinedScore = (resourceScore + permScore) / 2;

    const gated = cslGate(combinedScore, combinedScore, roleConfig.cslThreshold * PSI, PSI3);
    const authorized = gated >= roleConfig.cslThreshold * PSI2;

    await this.#audit(userId, resource, permission, authorized, authorized ? 'Granted' : 'Insufficient CSL score');

    return {
      authorized,
      role,
      score: gated,
      threshold: roleConfig.cslThreshold,
      resource,
      permission,
    };
  }

  assignRole(userId, role) {
    if (!ROLES[role]) throw new Error('Invalid role: ' + role);
    this.#roleAssignments.set(userId, role);
    return { userId, role, assignedAt: Date.now() };
  }

  checkPermission(role, permission) {
    const roleConfig = ROLES[role];
    if (!roleConfig) return { allowed: false, reason: 'Invalid role' };

    const permMap = {
      admin:     PERMISSIONS,
      operator:  ['read', 'write', 'execute', 'deploy', 'configure', 'monitor', 'audit'],
      developer: ['read', 'write', 'execute', 'monitor'],
      viewer:    ['read', 'monitor'],
      service:   ['read', 'write', 'execute', 'monitor'],
      guest:     ['read'],
    };

    const allowed = (permMap[role] || []).includes(permission);
    return { allowed, role, permission };
  }

  getAuditTrail(userId = null, limit = FIB[8]) {
    let trail = this.#auditTrail;
    if (userId) trail = trail.filter(a => a.userId === userId);
    return trail.slice(-limit);
  }

  registerResource(resource, gateEmbedding = null) {
    const gate = gateEmbedding || textToEmbedding('resource:' + resource);
    this.#resourceGates.set(resource, gate);
    return { resource, registered: true };
  }

  getRoles() { return ROLES; }
  getPermissions() { return PERMISSIONS; }
  getUserRole(userId) { return this.#roleAssignments.get(userId) || null; }

  async #audit(userId, resource, permission, authorized, reason) {
    const entry = {
      id: await sha256(userId + ':' + resource + ':' + permission + ':' + Date.now()),
      userId, resource, permission, authorized, reason,
      timestamp: Date.now(),
    };
    this.#auditTrail.push(entry);
    if (this.#auditTrail.length > this.#maxAudit) {
      this.#auditTrail = this.#auditTrail.slice(-this.#maxAudit);
    }
  }
}

export { RBACEngine, ROLES, PERMISSIONS };
export default RBACEngine;
