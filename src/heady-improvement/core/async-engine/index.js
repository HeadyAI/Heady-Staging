/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Async Engine — Barrel export for DAG-based async parallel execution.
 * Founder: Eric Haywood
 *
 * @module core/async-engine
 */

export {
  TaskDecomposer,
  SUBTASK_STATE,
  MAX_DEPTH,
  MAX_SUBTASKS,
} from './task-decomposer.js';

export {
  ParallelExecutor,
  CONCURRENCY,
  EXECUTOR_STATE,
} from './parallel-executor.js';
