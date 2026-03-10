'use strict';

const fs = require('fs');
const { logger } = require('../utils/logger');

const CATEGORIES = [
  'health_monitoring', 'agent_lifecycle', 'memory_maintenance',
  'security_scanning', 'performance_optimization', 'learning_feedback',
  'checkpoint_management', 'connectivity_checks', 'self_healing',
];

// Real task handlers per category
const CATEGORY_HANDLERS = {
  health_monitoring: async () => {
    const mem = process.memoryUsage();
    if (mem.heapUsed / mem.heapTotal > 0.9) throw new Error('Heap usage > 90%');
    return { heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024) };
  },
  agent_lifecycle: async () => {
    const config = require('../../config/agents.json');
    return { agentsRegistered: config.agents.length };
  },
  memory_maintenance: async () => {
    const storePath = process.env.MEMORY_STORE_PATH || './data/memory';
    const indexPath = require('path').join(storePath, 'index.json');
    if (!fs.existsSync(storePath)) fs.mkdirSync(storePath, { recursive: true });
    let count = 0;
    if (fs.existsSync(indexPath)) {
      try { count = JSON.parse(fs.readFileSync(indexPath, 'utf8')).length; } catch { /* ok */ }
    }
    return { memoryCount: count };
  },
  security_scanning: async () => {
    // Check for insecure env patterns
    const issues = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) issues.push('JWT_SECRET too short');
    if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) issues.push('CORS_ORIGINS not set in production');
    if (issues.length > 0) throw new Error(`Security issues: ${issues.join(', ')}`);
    return { issues: 0 };
  },
  performance_optimization: async () => {
    const loadAvg = require('os').loadavg();
    return { load1m: loadAvg[0], load5m: loadAvg[1] };
  },
  learning_feedback: async () => {
    const logsDir = 'data/logs';
    if (!fs.existsSync(logsDir)) return { logFiles: 0 };
    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
    return { logFiles: logFiles.length };
  },
  checkpoint_management: async () => {
    const cpDir = 'data/checkpoints';
    if (!fs.existsSync(cpDir)) fs.mkdirSync(cpDir, { recursive: true });
    return { checkpointDir: cpDir, exists: true };
  },
  connectivity_checks: async () => {
    // Verify critical config files are accessible
    const critical = ['config/agents.json', 'config/providers.json'];
    for (const f of critical) {
      if (!fs.existsSync(f)) throw new Error(`Missing: ${f}`);
    }
    return { configsAccessible: critical.length };
  },
  self_healing: async () => {
    // Ensure data directories exist
    const dirs = ['data/memory', 'data/logs', 'data/checkpoints'];
    let repaired = 0;
    for (const d of dirs) {
      if (!fs.existsSync(d)) { fs.mkdirSync(d, { recursive: true }); repaired++; }
    }
    return { dirsChecked: dirs.length, repaired };
  },
};

class AutoSuccessEngine {
  constructor() {
    this.interval = parseInt(process.env.AUTO_SUCCESS_INTERVAL) || 30000;
    this.maxRetries = parseInt(process.env.AUTO_SUCCESS_MAX_RETRIES) || 3;
    this.running = false;
    this.timer = null;
    this.tasks = this._buildTaskList();
    this.stats = { cycles: 0, successes: 0, failures: 0 };
  }

  get taskCount() { return this.tasks.length; }

  _buildTaskList() {
    return CATEGORIES.map(category => ({
      id: category,
      category,
      name: category,
      lastRun: null,
      lastStatus: null,
      lastResult: null,
      failures: 0,
    }));
  }

  async start() {
    this.running = true;
    logger.info(`[AutoSuccess] Starting engine: ${this.tasks.length} tasks, ${this.interval}ms cycle`);
    this._runCycle();
    this.timer = setInterval(() => this._runCycle(), this.interval);
  }

  async stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    logger.info(`[AutoSuccess] Stopped. Stats: ${JSON.stringify(this.stats)}`);
  }

  getStats() {
    return {
      ...this.stats,
      tasks: this.tasks.map(t => ({
        id: t.id, status: t.lastStatus, lastRun: t.lastRun, failures: t.failures,
      })),
    };
  }

  async _runCycle() {
    this.stats.cycles++;
    // Run all category checks concurrently
    const results = await Promise.allSettled(
      this.tasks.map(task => this._executeTask(task))
    );
    for (let i = 0; i < results.length; i++) {
      const task = this.tasks[i];
      const result = results[i];
      if (result.status === 'fulfilled') {
        task.lastStatus = 'success';
        task.lastResult = result.value;
        task.failures = 0;
        this.stats.successes++;
      } else {
        task.lastStatus = 'error';
        task.lastResult = result.reason?.message;
        task.failures++;
        this.stats.failures++;
        if (task.failures >= this.maxRetries) {
          logger.warn(`[AutoSuccess] ${task.name} failed ${task.failures}x: ${result.reason?.message}`);
        }
      }
      task.lastRun = new Date().toISOString();
    }
  }

  async _executeTask(task) {
    const handler = CATEGORY_HANDLERS[task.category];
    if (!handler) return { skipped: true };
    return handler();
  }
}

module.exports = { AutoSuccessEngine };
