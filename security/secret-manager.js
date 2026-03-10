// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Secret Manager — Secure Storage with φ-Scaled Auto-Rotation
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

import { PHI, PSI, FIB, sha256 } from '../shared/phi-math-v2.js';

const ROTATION_INTERVALS = Object.freeze({
  critical: FIB[7] * 24 * 60 * 60 * 1000,  // 13 days
  high:     FIB[8] * 24 * 60 * 60 * 1000,  // 21 days
  medium:   FIB[10] * 24 * 60 * 60 * 1000, // 55 days
  low:      FIB[11] * 24 * 60 * 60 * 1000, // 89 days
});

class SecretManager {
  #secrets;
  #rotationHistory;
  #maxHistory;

  constructor() {
    this.#secrets = new Map();
    this.#rotationHistory = [];
    this.#maxHistory = FIB[16];
  }

  async set(name, value, classification = 'medium') {
    const hash = await sha256(value);
    const entry = {
      name,
      hash,
      classification,
      rotationInterval: ROTATION_INTERVALS[classification] || ROTATION_INTERVALS.medium,
      createdAt: Date.now(),
      lastRotated: Date.now(),
      version: 1,
      _value: value,
    };
    this.#secrets.set(name, entry);
    return { name, hash, classification, version: 1 };
  }

  get(name) {
    const entry = this.#secrets.get(name);
    if (!entry) return null;
    const value = entry._value;
    return { name, value, classification: entry.classification, version: entry.version };
  }

  async rotate(name, newValue) {
    const entry = this.#secrets.get(name);
    if (!entry) throw new Error('Secret not found: ' + name);

    const oldHash = entry.hash;
    entry.hash = await sha256(newValue);
    entry._value = newValue;
    entry.lastRotated = Date.now();
    entry.version++;

    this.#rotationHistory.push({
      name, oldHash, newHash: entry.hash,
      version: entry.version, rotatedAt: Date.now(),
    });

    if (this.#rotationHistory.length > this.#maxHistory) {
      this.#rotationHistory = this.#rotationHistory.slice(-this.#maxHistory);
    }

    return { name, version: entry.version, newHash: entry.hash };
  }

  listSecrets() {
    return Array.from(this.#secrets.entries()).map(([name, entry]) => ({
      name, classification: entry.classification, version: entry.version,
      lastRotated: entry.lastRotated, needsRotation: this.validateAge(name).needsRotation,
    }));
  }

  validateAge(name) {
    const entry = this.#secrets.get(name);
    if (!entry) return { valid: false, reason: 'Not found' };

    const age = Date.now() - entry.lastRotated;
    const needsRotation = age > entry.rotationInterval;
    const ageRatio = age / entry.rotationInterval;

    return {
      name, age, ageRatio, needsRotation,
      classification: entry.classification,
      rotationInterval: entry.rotationInterval,
      daysUntilRotation: Math.max(0, (entry.rotationInterval - age) / (24 * 60 * 60 * 1000)),
    };
  }

  getRotationHistory(limit = FIB[8]) { return this.#rotationHistory.slice(-limit); }
}

export { SecretManager, ROTATION_INTERVALS };
export default SecretManager;
