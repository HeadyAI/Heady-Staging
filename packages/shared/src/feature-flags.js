/**
 * HeadySystems - Feature Flags Service
 * Φ-Scaled Feature Flag Rollout & CSL-Gated Activation
 *
 * Copyright (c) 2025 HeadySystems Inc.
 * Licensed under the Proprietary HeadySystems License
 *
 * Golden ratio-scaled rollout percentages with CSL confidence gating
 * and deterministic user assignment via hash-based rollout thresholds.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const PHI_ROLLOUT_STAGES = [0.0618, 0.382, 0.618, 1.0];

class FeatureFlagsService {
  constructor(opts = {}) {
    this.flags = new Map();
    this.persistPath = opts.persistPath || null;
    this.logger = opts.logger || console;
    this.loadedFromDisk = false;

    if (this.persistPath) {
      this.loadFromDisk();
    }
  }

  createFlag(name, opts = {}) {
    if (this.flags.has(name)) {
      throw new Error(`Flag "${name}" already exists`);
    }

    const rolloutPercent = opts.rolloutPercent !== undefined ? opts.rolloutPercent : 0;
    const cslGate = opts.cslGate !== undefined ? opts.cslGate : 0;
    const killSwitch = opts.killSwitch !== undefined ? opts.killSwitch : false;
    const createdAt = new Date().toISOString();
    const metadata = opts.metadata || {};

    const flag = {
      name,
      rolloutPercent,
      cslGate,
      killSwitch,
      createdAt,
      metadata,
      enablementCount: 0,
      lastModified: createdAt
    };

    this.flags.set(name, flag);
    this.logger.info(`[FeatureFlags] Created flag: ${name}`, {
      rolloutPercent,
      cslGate,
      killSwitch,
      metadata
    });

    if (this.persistPath) {
      this.saveToDisk();
    }

    return flag;
  }

  isEnabled(flagName, userId, cslConfidence = 1.0) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      return false;
    }

    if (flag.killSwitch) {
      return false;
    }

    if (cslConfidence < flag.cslGate) {
      return false;
    }

    const threshold = Math.floor(flag.rolloutPercent * 100);
    const hash = this._hashUserId(flagName, userId);
    const rolloutValue = hash % 10000;

    const isEnabled = rolloutValue < threshold;

    if (isEnabled) {
      flag.enablementCount++;
    }

    return isEnabled;
  }

  setRollout(flagName, percent) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag "${flagName}" not found`);
    }

    if (percent < 0 || percent > 1.0) {
      throw new Error('Rollout percent must be between 0 and 1.0');
    }

    flag.rolloutPercent = percent;
    flag.lastModified = new Date().toISOString();

    this.logger.info(`[FeatureFlags] Updated rollout: ${flagName} = ${percent}`, {
      timestamp: flag.lastModified
    });

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  setCSLGate(flagName, minConfidence) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag "${flagName}" not found`);
    }

    if (minConfidence < 0 || minConfidence > 1.0) {
      throw new Error('CSL gate must be between 0 and 1.0');
    }

    flag.cslGate = minConfidence;
    flag.lastModified = new Date().toISOString();

    this.logger.info(`[FeatureFlags] Updated CSL gate: ${flagName} = ${minConfidence}`, {
      timestamp: flag.lastModified
    });

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  killFlag(flagName) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag "${flagName}" not found`);
    }

    flag.killSwitch = true;
    flag.lastModified = new Date().toISOString();

    this.logger.warn(`[FeatureFlags] Killed flag: ${flagName}`, {
      timestamp: flag.lastModified
    });

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  reviveFlag(flagName) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag "${flagName}" not found`);
    }

    flag.killSwitch = false;
    flag.lastModified = new Date().toISOString();

    this.logger.info(`[FeatureFlags] Revived flag: ${flagName}`, {
      timestamp: flag.lastModified
    });

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  getAllFlags() {
    const flagArray = Array.from(this.flags.values()).map(f => ({
      ...f,
      rolloutPercentDisplay: `${(f.rolloutPercent * 100).toFixed(2)}%`,
      cslGateDisplay: `${(f.cslGate * 100).toFixed(2)}%`,
      isActive: !f.killSwitch,
      estimatedEnabledPercent: f.rolloutPercent * 100
    }));

    return {
      timestamp: new Date().toISOString(),
      totalFlags: this.flags.size,
      flags: flagArray,
      phiStages: PHI_ROLLOUT_STAGES,
      constants: {
        PHI,
        PSI,
        FIB
      }
    };
  }

  getFlag(flagName) {
    return this.flags.get(flagName) || null;
  }

  deleteFlag(flagName) {
    const deleted = this.flags.delete(flagName);
    if (!deleted) {
      throw new Error(`Flag "${flagName}" not found`);
    }

    this.logger.info(`[FeatureFlags] Deleted flag: ${flagName}`);

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  getPhiStage(rolloutPercent) {
    for (let i = 0; i < PHI_ROLLOUT_STAGES.length; i++) {
      if (rolloutPercent <= PHI_ROLLOUT_STAGES[i]) {
        return i;
      }
    }
    return PHI_ROLLOUT_STAGES.length - 1;
  }

  getMetrics() {
    let totalEnabledCount = 0;
    let maxEnablement = 0;
    let minEnablement = Infinity;

    for (const flag of this.flags.values()) {
      totalEnabledCount += flag.enablementCount;
      maxEnablement = Math.max(maxEnablement, flag.enablementCount);
      minEnablement = Math.min(minEnablement, flag.enablementCount);
    }

    if (minEnablement === Infinity) {
      minEnablement = 0;
    }

    return {
      timestamp: new Date().toISOString(),
      totalFlags: this.flags.size,
      totalCheckCount: totalEnabledCount,
      averageCheckCount: this.flags.size > 0 ? totalEnabledCount / this.flags.size : 0,
      maxEnablement,
      minEnablement,
      flagMetrics: Array.from(this.flags.values()).map(f => ({
        name: f.name,
        enablementCount: f.enablementCount,
        rolloutPercent: f.rolloutPercent,
        isActive: !f.killSwitch,
        phiStage: this.getPhiStage(f.rolloutPercent)
      }))
    };
  }

  resetMetrics() {
    for (const flag of this.flags.values()) {
      flag.enablementCount = 0;
    }
    this.logger.info('[FeatureFlags] Metrics reset');
  }

  _hashUserId(flagName, userId) {
    const input = `${flagName}#${userId}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return Math.abs(numericHash);
  }

  saveToDisk() {
    if (!this.persistPath) {
      return;
    }

    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        flags: Array.from(this.flags.entries()).map(([name, flag]) => ({
          name,
          ...flag
        }))
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf8');
      this.logger.info(`[FeatureFlags] Persisted to disk: ${this.persistPath}`);
    } catch (error) {
      this.logger.error(`[FeatureFlags] Failed to save to disk: ${error.message}`);
    }
  }

  loadFromDisk() {
    if (!this.persistPath) {
      return;
    }

    try {
      if (!fs.existsSync(this.persistPath)) {
        this.logger.info(`[FeatureFlags] No persistent flags file found: ${this.persistPath}`);
        return;
      }

      const content = fs.readFileSync(this.persistPath, 'utf8');
      const data = JSON.parse(content);

      if (!data.flags || !Array.isArray(data.flags)) {
        throw new Error('Invalid flags file format');
      }

      for (const flagData of data.flags) {
        const { name, ...rest } = flagData;
        this.flags.set(name, rest);
      }

      this.loadedFromDisk = true;
      this.logger.info(`[FeatureFlags] Loaded ${data.flags.length} flags from disk`);
    } catch (error) {
      this.logger.error(`[FeatureFlags] Failed to load from disk: ${error.message}`);
    }
  }

  toJSON() {
    return this.getAllFlags();
  }
}

module.exports = {
  FeatureFlagsService,
  PHI,
  PSI,
  FIB,
  PHI_ROLLOUT_STAGES
};
