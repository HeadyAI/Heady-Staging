/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Backpressure Controller — Manages pressure across the swarm mesh.
 * Uses phi-scaled PRESSURE_LEVELS for classification and response.
 *
 * Pressure responses:
 *   NOMINAL  (0–0.382): Full throughput
 *   ELEVATED (0.382–0.618): Throttle to PSI (61.8%) of max rate
 *   HIGH     (0.618–0.854): Throttle to PSI² (38.2%), trigger work-stealing
 *   CRITICAL (0.910+): Reject new tasks, emergency rebalance, alert
 *
 * Founder: Eric Haywood
 * @module core/swarm-engine/backpressure
 */

import { EventEmitter } from 'events';
import {
  PHI, PSI, fib,
  PRESSURE_LEVELS,
  classifyPressure,
  phiFusionWeights,
} from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger('backpressure');

const PSI2 = PSI * PSI;

/** Throttle multipliers per pressure level */
const THROTTLE_RATES = Object.freeze({
  NOMINAL: 1.0,
  ELEVATED: PSI,     // 0.618
  HIGH: PSI2,        // 0.382
  CRITICAL: 0.0,     // Reject all
});

class BackpressureController extends EventEmitter {
  /**
   * @param {object} swarmManager - SwarmManager instance
   * @param {object} [workStealer] - WorkStealer instance for emergency rebalance
   */
  constructor(swarmManager, workStealer = null) {
    super();
    this._swarmManager = swarmManager;
    this._workStealer = workStealer;
    this._swarmPressure = new Map();
    this._meshPressure = 'NOMINAL';
    this._monitorInterval = null;
  }

  /**
   * Measure current pressure for a swarm.
   * @param {string} swarmId
   * @returns {object} { level, ratio, throttleRate }
   */
  measure(swarmId) {
    const swarm = this._swarmManager.getSwarm(swarmId);
    if (!swarm) return { level: 'NOMINAL', ratio: 0, throttleRate: 1.0 };

    const utilization = swarm.getUtilization();
    const queueRatio = swarm.taskBuffer.length / fib(14);

    // Phi-fusion weighted pressure
    const [wUtil, wQueue] = phiFusionWeights(2);
    const ratio = utilization * wUtil + queueRatio * wQueue;
    const level = classifyPressure(ratio);
    const throttleRate = THROTTLE_RATES[level];

    this._swarmPressure.set(swarmId, { level, ratio, throttleRate });
    swarm.pressure = level;

    return { level, ratio, throttleRate, utilization, queueRatio };
  }

  /**
   * Classify a ratio into a pressure level.
   * @param {number} ratio - 0 to 1
   * @returns {string} Pressure level name
   */
  classify(ratio) {
    return classifyPressure(ratio);
  }

  /**
   * Apply backpressure to a swarm based on its current level.
   * @param {string} swarmId
   * @param {string} level - Pressure level
   * @returns {object}
   */
  applyBackpressure(swarmId, level) {
    const throttleRate = THROTTLE_RATES[level] || 1.0;

    const actions = [];

    if (level === 'ELEVATED') {
      actions.push('throttle_to_psi');
    }

    if (level === 'HIGH') {
      actions.push('throttle_to_psi2');
      // Trigger work-stealing
      if (this._workStealer) {
        const stealResult = this._workStealer.donateWork(swarmId);
        actions.push(`donated_${stealResult.donated}_tasks`);
      }
    }

    if (level === 'CRITICAL') {
      actions.push('reject_new_tasks');
      actions.push('emergency_rebalance');

      // Emergency rebalance
      if (this._workStealer) {
        this._workStealer.rebalance();
      }

      this.emit('pressure:critical', { swarmId, level });
      logger.warn('Critical backpressure', { swarmId, level });
    }

    this.emit('pressure:applied', { swarmId, level, throttleRate, actions });
    return { swarmId, level, throttleRate, actions };
  }

  /**
   * Propagate backpressure upstream — signal services to slow down.
   * @param {string} swarmId
   * @returns {object}
   */
  propagateUpstream(swarmId) {
    const pressure = this._swarmPressure.get(swarmId);
    if (!pressure) return { propagated: false };

    if (pressure.level === 'HIGH' || pressure.level === 'CRITICAL') {
      const signal = {
        type: 'backpressure',
        swarmId,
        level: pressure.level,
        throttleRate: pressure.throttleRate,
        timestamp: Date.now(),
      };

      this.emit('upstream:signal', signal);
      logger.info('Upstream backpressure signal', { swarmId, level: pressure.level });
      return { propagated: true, signal };
    }

    return { propagated: false, reason: 'pressure not high enough' };
  }

  /**
   * Relieve pressure on a swarm — resume normal flow.
   * @param {string} swarmId
   */
  relievePressure(swarmId) {
    this._swarmPressure.set(swarmId, {
      level: 'NOMINAL',
      ratio: 0,
      throttleRate: 1.0,
    });

    const swarm = this._swarmManager.getSwarm(swarmId);
    if (swarm) swarm.pressure = 'NOMINAL';

    this.emit('pressure:relieved', { swarmId });
    logger.info('Pressure relieved', { swarmId });
  }

  /**
   * Get mesh-wide pressure status.
   * @returns {object}
   */
  getMeshPressure() {
    const swarms = this._swarmManager.getAllSwarms();
    const levels = { NOMINAL: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 };
    let totalRatio = 0;

    for (const swarm of swarms) {
      const { level, ratio } = this.measure(swarm.id);
      levels[level]++;
      totalRatio += ratio;
    }

    const avgRatio = swarms.length > 0 ? totalRatio / swarms.length : 0;
    this._meshPressure = classifyPressure(avgRatio);

    return {
      meshLevel: this._meshPressure,
      avgRatio,
      levels,
      swarmCount: swarms.length,
    };
  }

  /**
   * Check if a new task should be accepted based on mesh pressure.
   * @returns {boolean}
   */
  shouldAcceptTask() {
    if (this._meshPressure === 'CRITICAL') return false;
    if (this._meshPressure === 'HIGH') {
      // Probabilistic acceptance at PSI² rate
      return Math.random() < PSI2;
    }
    if (this._meshPressure === 'ELEVATED') {
      // Probabilistic acceptance at PSI rate
      return Math.random() < PSI;
    }
    return true;
  }

  /**
   * Start periodic pressure monitoring.
   * @param {number} [intervalMs=fib(8)*1000] — 21 seconds
   */
  startMonitoring(intervalMs = fib(8) * 1000) {
    if (this._monitorInterval) return;
    this._monitorInterval = setInterval(() => {
      const mesh = this.getMeshPressure();
      if (mesh.meshLevel !== 'NOMINAL') {
        logger.info('Mesh pressure elevated', mesh);
      }
      // Auto-apply pressure for any swarm above ELEVATED
      for (const swarm of this._swarmManager.getAllSwarms()) {
        const pressure = this._swarmPressure.get(swarm.id);
        if (pressure && pressure.level !== 'NOMINAL') {
          this.applyBackpressure(swarm.id, pressure.level);
        }
      }
    }, intervalMs);
    logger.info('Backpressure monitoring started', { intervalMs });
  }

  /**
   * Stop periodic monitoring.
   */
  stopMonitoring() {
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
  }
}

export { BackpressureController, THROTTLE_RATES };
