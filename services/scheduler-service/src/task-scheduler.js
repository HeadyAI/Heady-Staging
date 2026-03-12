'use strict';

/**
 * HeadySystems Task Scheduler
 * Fibonacci-scaled interval scheduling with φ-based exponential backoff
 * Copyright (c) 2024 HeadySystems
 */

const axios = require('axios');
const EventEmitter = require('events');

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const DEFAULTS = {
  MAX_CONCURRENT: FIB[9],
  MAX_QUEUE_SIZE: FIB[11],
  JITTER_RANGE: 0.15,
  TASK_TIMEOUT: 30000,
  WEBHOOK_TIMEOUT: 5000,
};

class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.tasks = new Map();
    this.taskQueue = [];
    this.activeCount = 0;
    this.options = { ...DEFAULTS, ...options };
    this.running = false;
    this.processInterval = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.emit('started');

    this.processInterval = setInterval(() => {
      this._processQueue();
    }, 1000);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.emit('stopped');
  }

  createTask(config) {
    const id = config.id || this._generateId();
    const task = {
      id,
      name: config.name,
      handlerUrl: config.handlerUrl,
      interval: config.interval || FIB[8],
      type: config.type || 'recurring',
      maxRetries: config.maxRetries || FIB[5],
      status: 'pending',
      createdAt: Date.now(),
      lastRun: null,
      nextRun: Date.now() + config.interval,
      runCount: 0,
      failureCount: 0,
      lastError: null,
      metadata: config.metadata || {},
    };

    this.tasks.set(id, task);
    this._scheduleTask(task);
    this.emit('task:created', task);
    return task;
  }

  getTask(id) {
    return this.tasks.get(id);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  deleteTask(id) {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.tasks.delete(id);
    task.status = 'deleted';
    this.emit('task:deleted', task);
    return true;
  }

  async triggerTask(id) {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);

    if (task.status === 'deleted') {
      throw new Error(`Task is deleted: ${id}`);
    }

    return this._executeTask(task);
  }

  _scheduleTask(task) {
    if (task.type === 'one-shot') {
      const delay = task.interval - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          if (this.running && task.status !== 'deleted') {
            this._executeTask(task);
          }
        }, delay);
      }
      return;
    }

    if (this.taskQueue.length >= this.options.MAX_QUEUE_SIZE) {
      this.emit('queue:full', task);
      return;
    }

    this.taskQueue.push({
      task,
      scheduledTime: Date.now(),
    });
  }

  _processQueue() {
    if (!this.running || this.activeCount >= this.options.MAX_CONCURRENT) {
      return;
    }

    const now = Date.now();
    let processed = 0;

    for (let i = this.taskQueue.length - 1; i >= 0 && processed < 5; i--) {
      const entry = this.taskQueue[i];
      const { task } = entry;

      if (task.status === 'deleted') {
        this.taskQueue.splice(i, 1);
        continue;
      }

      if (now >= task.nextRun && this.activeCount < this.options.MAX_CONCURRENT) {
        this.taskQueue.splice(i, 1);
        this._executeTask(task).catch((err) => {
          this.emit('task:error', { task, error: err });
        });
        processed++;
      }
    }
  }

  async _executeTask(task) {
    if (task.status === 'deleted') {
      return;
    }

    this.activeCount++;
    task.status = 'running';
    const startTime = Date.now();

    try {
      const response = await this._invokeWebhook(task.handlerUrl, {
        taskId: task.id,
        taskName: task.name,
        runCount: task.runCount + 1,
        timestamp: startTime,
        metadata: task.metadata,
      });

      task.lastRun = startTime;
      task.runCount++;
      task.failureCount = 0;
      task.lastError = null;
      task.status = 'scheduled';

      if (task.type === 'recurring') {
        const jitter = this._calculateJitter(task.interval);
        task.nextRun = Date.now() + task.interval + jitter;
        this._scheduleTask(task);
      } else if (task.type === 'one-shot') {
        task.status = 'completed';
      }

      this.emit('task:success', {
        task,
        duration: Date.now() - startTime,
        response,
      });
    } catch (error) {
      task.failureCount++;
      task.lastError = error.message;

      if (task.failureCount <= task.maxRetries) {
        const backoffDelay = this._calculateBackoff(task.failureCount);
        task.nextRun = Date.now() + backoffDelay;
        task.status = 'scheduled';
        this._scheduleTask(task);

        this.emit('task:retry', {
          task,
          attempt: task.failureCount,
          nextRun: task.nextRun,
        });
      } else {
        task.status = 'failed';
        this.emit('task:failed', {
          task,
          totalAttempts: task.failureCount,
          error,
        });
      }
    } finally {
      this.activeCount--;
    }
  }

  async _invokeWebhook(url, payload) {
    return axios.post(url, payload, {
      timeout: this.options.WEBHOOK_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-Task-Scheduler': 'HeadySystems/1.0',
      },
    });
  }

  _calculateBackoff(attempt) {
    const fibValue = FIB[Math.min(attempt, FIB.length - 1)] || FIB[FIB.length - 1];
    const baseDelay = fibValue * 1000;
    const exponentialFactor = Math.pow(PHI, attempt);
    return baseDelay * exponentialFactor;
  }

  _calculateJitter(interval) {
    const jitterAmount = interval * this.options.JITTER_RANGE;
    return (Math.random() - 0.5) * 2 * jitterAmount;
  }

  _generateId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      totalTasks: this.tasks.size,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeCount,
      running: this.running,
      tasksOverview: Array.from(this.tasks.values()).reduce(
        (acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        },
        {}
      ),
    };
  }
}

module.exports = TaskScheduler;
