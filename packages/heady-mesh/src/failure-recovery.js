'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const PHI = 1.6180339887498948;
const PSI = 0.6180339887498949;

class FailureRecovery extends EventEmitter {
  constructor({ eventBus } = {}) {
    super();
    this._bus = eventBus;
    this._failures = new Map();       // agentId → failure history
    this._recoveryPlans = new Map();  // agentId → recovery plan
    this._patterns = new Map();       // pattern → count
    this._windowSize = 89;            // fib(11)
  }

  recordFailure(agentId, error) {
    if (!this._failures.has(agentId)) this._failures.set(agentId, []);
    const history = this._failures.get(agentId);

    const entry = {
      id: `fail_${crypto.randomBytes(6).toString('hex')}`,
      agentId,
      error: typeof error === 'string' ? error : error.message,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: Date.now(),
    };

    history.push(entry);
    if (history.length > this._windowSize) history.shift();

    // Track patterns
    const pattern = entry.error.split(':')[0] || 'unknown';
    this._patterns.set(pattern, (this._patterns.get(pattern) || 0) + 1);

    this.emit('failure:recorded', entry);
    if (this._bus) this._bus.emit('mesh:failure:recorded', entry);

    return entry;
  }

  getRecoveryPlan(agentId) {
    const history = this._failures.get(agentId) || [];
    if (history.length === 0) return { agentId, actions: [], status: 'healthy' };

    const recentFailures = history.filter(f => Date.now() - f.timestamp < 3600000); // Last hour
    const failureRate = recentFailures.length / Math.max(1, history.length);

    const actions = [];

    if (failureRate > 0.5) {
      actions.push({ type: 'restart', priority: 'critical', reason: `${Math.round(failureRate * 100)}% failure rate in last hour` });
    }

    if (recentFailures.length >= 3) {
      const commonError = this._mostCommonError(recentFailures);
      actions.push({ type: 'investigate', priority: 'high', reason: `Recurring error: ${commonError}` });
    }

    if (recentFailures.length >= 5) {
      actions.push({ type: 'circuit_break', priority: 'critical', reason: 'Excessive failures — open circuit breaker' });
    }

    if (actions.length === 0) {
      actions.push({ type: 'monitor', priority: 'low', reason: 'Occasional failures within tolerance' });
    }

    const plan = { agentId, failureCount: history.length, recentCount: recentFailures.length, failureRate: Math.round(failureRate * 1000) / 1000, actions, generatedAt: new Date().toISOString() };
    this._recoveryPlans.set(agentId, plan);
    return plan;
  }

  async executeRecovery(agentId, plan) {
    const result = { agentId, actionsExecuted: [], status: 'completed', timestamp: new Date().toISOString() };

    for (const action of (plan || this.getRecoveryPlan(agentId)).actions) {
      switch (action.type) {
        case 'restart':
          result.actionsExecuted.push({ type: 'restart', status: 'requested' });
          this.emit('recovery:restart', { agentId });
          break;
        case 'circuit_break':
          result.actionsExecuted.push({ type: 'circuit_break', status: 'opened' });
          this.emit('recovery:circuit_break', { agentId });
          break;
        case 'investigate':
          result.actionsExecuted.push({ type: 'investigate', status: 'flagged', pattern: action.reason });
          break;
        default:
          result.actionsExecuted.push({ type: action.type, status: 'acknowledged' });
      }
    }

    if (this._bus) this._bus.emit('mesh:recovery:executed', result);
    return result;
  }

  getFailurePatterns() {
    const patterns = [...this._patterns.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => ({ pattern, count, percentage: Math.round(count / Math.max(1, [...this._patterns.values()].reduce((s, v) => s + v, 0)) * 100) }));

    return { patterns, totalFailures: [...this._patterns.values()].reduce((s, v) => s + v, 0), uniquePatterns: this._patterns.size, agentsAffected: this._failures.size };
  }

  _mostCommonError(failures) {
    const counts = {};
    for (const f of failures) {
      const key = f.error.split(':')[0] || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  }
}

module.exports = { FailureRecovery };
