// ═══════════════════════════════════════════════════════════════════════════════
// TaskGraph — Dependency-Aware, Push-Triggered DAG
// ═══════════════════════════════════════════════════════════════════════════════
// Manages subtask dependencies. Nodes with zero unsatisfied deps dispatch
// immediately. Completion propagates unlocks to downstream nodes instantly.
//
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TaskGraph — models a task as a directed acyclic graph of subtasks.
 *
 * Root nodes (no dependencies) dispatch immediately.
 * When a subtask completes, downstream subtasks with all deps satisfied
 * are returned by getUnblocked() for immediate concurrent dispatch.
 */
export class TaskGraph {
  constructor(rootTaskId) {
    this.rootTaskId = rootTaskId;
    this.nodes = new Map();     // subtaskId → { subtask, status, result, deps, dependents }
    this.startedAt = Date.now();
  }

  /**
   * Add a subtask node to the graph
   */
  addNode(subtask) {
    this.nodes.set(subtask.id, {
      subtask,
      status: 'pending',
      result: null,
      deps: new Set(subtask.dependsOn ?? []),
      dependents: new Set(),
    });
  }

  /**
   * Add a dependency edge: fromId must complete before toId can dispatch
   */
  addEdge(fromId, toId) {
    const from = this.nodes.get(fromId);
    if (from) from.dependents.add(toId);
  }

  /**
   * Returns all nodes with status 'pending' and zero unsatisfied dependencies.
   * These are ready for immediate dispatch.
   */
  get roots() {
    return [...this.nodes.values()]
      .filter(n => n.status === 'pending' && n.deps.size === 0)
      .map(n => n.subtask);
  }

  /**
   * Mark a subtask as complete and remove it from all dependents' dependency sets.
   */
  markComplete(subtaskId, result) {
    const node = this.nodes.get(subtaskId);
    if (!node) return;

    node.status = 'complete';
    node.result = result;

    // Remove this subtask from all dependents' dependency sets
    for (const dependentId of node.dependents) {
      const dependent = this.nodes.get(dependentId);
      if (dependent) {
        dependent.deps.delete(subtaskId);
      }
    }
  }

  /**
   * Mark a subtask as failed
   */
  markFailed(subtaskId, error) {
    const node = this.nodes.get(subtaskId);
    if (!node) return;

    node.status = 'failed';
    node.result = { error: error.message ?? String(error) };
  }

  /**
   * Returns all nodes whose dependencies are now fully satisfied
   * and are ready for immediate dispatch.
   */
  getUnblocked() {
    return [...this.nodes.values()]
      .filter(n => n.status === 'pending' && n.deps.size === 0)
      .map(n => n.subtask);
  }

  /**
   * Check if the entire graph is complete (all nodes finished)
   */
  isComplete() {
    return [...this.nodes.values()].every(n =>
      n.status === 'complete' || n.status === 'failed'
    );
  }

  /**
   * Collect all results from completed nodes
   */
  collectResults() {
    return Object.fromEntries(
      [...this.nodes.entries()].map(([id, n]) => [id, n.result])
    );
  }

  /**
   * Get progress stats
   */
  getProgress() {
    const total = this.nodes.size;
    const completed = [...this.nodes.values()].filter(n => n.status === 'complete').length;
    const failed = [...this.nodes.values()].filter(n => n.status === 'failed').length;
    const pending = [...this.nodes.values()].filter(n => n.status === 'pending').length;
    const blocked = [...this.nodes.values()].filter(n =>
      n.status === 'pending' && n.deps.size > 0
    ).length;

    return { total, completed, failed, pending, blocked, ready: pending - blocked };
  }
}

export default TaskGraph;
