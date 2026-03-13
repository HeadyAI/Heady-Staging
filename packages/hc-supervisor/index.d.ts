// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: packages/hc-supervisor/index.d.ts                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * HCSupervisor TypeScript Definitions
 * FILE: packages/hc-supervisor/index.d.ts
 */

/// <reference types="node" />

import { EventEmitter } from 'events';

/**
 * Task execution status constants
 */
export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Routing strategy for task assignment
 */
export enum RoutingStrategy {
  DIRECT = 'direct',
  LOAD_BALANCED = 'load-balanced',
  PARALLEL_FANOUT = 'parallel-fanout',
  CAPABILITY_MATCH = 'capability-match',
}

/**
 * Agent health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNAVAILABLE = 'unavailable',
}

/**
 * Agent configuration in catalog
 */
export interface AgentConfig {
  name: string;
  role: string;
  skills: string[];
  criticality: 'critical' | 'high' | 'medium' | 'low';
  timeout: number;
}

/**
 * Agent status information
 */
export interface AgentStatus {
  name: string;
  role: string;
  health: HealthStatus;
  requests: number;
  successes: number;
  failures: number;
  successRate: number;
}

/**
 * Task definition for submission
 */
export interface Task {
  id: string;
  type: string;
  payload: Record<string, any>;
  agents?: string[];
  strategy?: RoutingStrategy;
  timeout?: number;
}

/**
 * Task record with metadata
 */
export interface TaskRecord extends Task {
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  assignedAgent?: string;
  result?: any;
  error?: string;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  result?: any;
  error?: string | null;
}

/**
 * Parallel task results
 */
export interface ParallelTaskResults {
  results: TaskResult[];
  errors: TaskResult[];
  succeeded: number;
  failed: number;
}

/**
 * Metrics data
 */
export interface Metrics {
  tasksProcessed: number;
  tasksSucceeded: number;
  tasksFailed: number;
  totalLatency: number;
  avgLatency: number;
  successRate: number;
  activeTasks: number;
  queuedTasks: number;
  agentMetrics: Record<string, AgentMetrics>;
}

/**
 * Per-agent metrics
 */
export interface AgentMetrics {
  requests: number;
  successes: number;
  failures: number;
  avgLatency: number;
  lastRequest?: number;
}

/**
 * HCSupervisor configuration options
 */
export interface HCSupervisorOptions {
  maxConcurrentTasks?: number;
  defaultTimeout?: number;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  retryStrategy?: 'exponential-backoff' | 'linear';
  maxRetries?: number;
  [key: string]: any;
}

/**
 * Task lifecycle event
 */
export interface TaskEvent {
  taskId: string;
  task?: TaskRecord;
  agent?: string;
  result?: any;
  error?: string;
}

/**
 * Multi-Agent Supervisor for Heady System
 */
export class HCSupervisor extends EventEmitter {
  constructor(options?: HCSupervisorOptions);

  /**
   * Submit a single task for execution
   */
  submitTask(task: Task): Promise<any>;

  /**
   * Submit multiple tasks in parallel with concurrency limits
   */
  submitParallelTasks(tasks: Task[]): Promise<ParallelTaskResults>;

  /**
   * Get current performance metrics
   */
  getMetrics(): Metrics;

  /**
   * Get health and performance status of all agents
   */
  getAgentStatus(): Record<string, AgentStatus>;

  /**
   * Get current status of a specific task
   */
  getTaskStatus(taskId: string): TaskRecord | null;

  /**
   * Get all available agent configurations
   */
  getAgentCatalog(): Record<string, AgentConfig>;

  /**
   * Clean up resources and stop health checks
   */
  shutdown(): void;

  /**
   * Event: Task assigned to an agent
   */
  on(event: 'task:assigned', listener: (event: TaskEvent) => void): this;

  /**
   * Event: Task execution started
   */
  on(event: 'task:executing', listener: (event: TaskEvent) => void): this;

  /**
   * Event: Task completed successfully
   */
  on(event: 'task:completed', listener: (event: TaskEvent) => void): this;

  /**
   * Event: Task failed
   */
  on(event: 'task:failed', listener: (event: TaskEvent) => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeListener(event: string, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
}

/**
 * Agent catalog constant
 */
export const AGENT_CATALOG: Record<string, AgentConfig>;

/**
 * Task status constants
 */
export const TASK_STATUS: typeof TaskStatus;

/**
 * Routing strategy constants
 */
export const ROUTING_STRATEGY: typeof RoutingStrategy;

/**
 * Health status constants
 */
export const HEALTH_STATUS: typeof HealthStatus;

export default HCSupervisor;
