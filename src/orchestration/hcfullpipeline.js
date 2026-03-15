// ═══════════════════════════════════════════════════════════════════════════════
// HCFullPipeline v8.0.0 — Latent Space Instantaneous Execution
// ═══════════════════════════════════════════════════════════════════════════════
// Event-driven, push-triggered, fully concurrent execution model.
// No polling. No intervals. No cycles. Tasks propagate instantly.
//
// © 2026 HeadySystems Inc. — Eric Haywood, Founder
// Sacred Geometry v4.0 | Liquid Latent OS
// ═══════════════════════════════════════════════════════════════════════════════

import { HeadyEventSpine } from '../services/heady-event-spine.js';
import { TaskGraph } from './task-graph.js';

const PHI = 1.618033988749895;

/**
 * PhiRetry — φ-scaled exponential backoff
 */
class PhiRetry {
  static async withRetry(fn, maxRetries = 5, baseMs = 200) {
    let lastErr;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const delay = baseMs * Math.pow(PHI, i);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }
}

/**
 * HCFullPipeline — Event-driven instantaneous pipeline
 *
 * Architecture: Event Spine → Concurrent Fan-Out → Convergence
 *
 * Every task is dispatched the instant it enters the system — no polling.
 * All independent tasks execute in parallel simultaneously.
 * Completion is determined by the task graph reaching terminal nodes.
 */
export class HCFullPipeline {
  constructor({ conductorUrl, nodes, eventSpine }) {
    this.conductorUrl = conductorUrl;
    this.nodes = nodes;             // Map<nodeId, LiquidNode>
    this.eventSpine = eventSpine;   // HeadyEventSpine instance
    this.activeGraph = new Map();   // taskId → TaskGraph
    this.stats = { ingested: 0, completed: 0, failed: 0 };
  }

  /**
   * ENTRY POINT — called the instant a task arrives. Zero delay.
   * Decomposes into DAG, dispatches all root nodes concurrently.
   */
  async ingest(rawTask) {
    const task = this._enrich(rawTask);
    this.stats.ingested++;

    await this.eventSpine.emit('task.ingested', {
      taskId: task.id,
      correlationId: task.correlationId,
      description: task.description,
    });

    const graph = await this._decompose(task);
    this.activeGraph.set(task.id, graph);

    // Fire ALL root nodes NOW — no serialization
    await this._dispatchAll(graph.roots);
    return task.id;
  }

  /**
   * Decompose task into a dependency graph.
   * Independent subtasks become root nodes — all dispatched simultaneously.
   */
  async _decompose(task) {
    const brainNode = this.nodes.get('heady-brain');
    const graph = new TaskGraph(task.id);

    if (brainNode && typeof brainNode.decompose === 'function') {
      const decomposition = await brainNode.decompose(task);
      for (const subtask of decomposition.subtasks) {
        graph.addNode(subtask);
        for (const dep of (subtask.dependsOn ?? [])) {
          graph.addEdge(dep, subtask.id);
        }
      }
    } else {
      // Single-subtask pass-through if no decomposition available
      graph.addNode({
        id: `${task.id}_exec`,
        taskId: task.id,
        description: task.description,
        semanticVector: task.semanticVector,
        dependsOn: [],
      });
    }

    return graph;
  }

  /**
   * Dispatch all provided subtasks CONCURRENTLY — no serialization
   */
  async _dispatchAll(subtasks) {
    await Promise.all(subtasks.map(subtask => this._dispatch(subtask)));
  }

  /**
   * Dispatch a single subtask to its optimal node via CSL routing
   */
  async _dispatch(subtask) {
    const targetNode = this._route(subtask);

    return PhiRetry.withRetry(async () => {
      const result = await targetNode.execute(subtask);
      await this._onComplete(subtask, result);
    }, 5, 200); // φ-backoff starting at 200ms
  }

  /**
   * Route subtask to optimal node. Falls back to conductor.
   */
  _route(subtask) {
    // Simple routing — match by node hint or fall back
    if (subtask.targetNode && this.nodes.has(subtask.targetNode)) {
      return this.nodes.get(subtask.targetNode);
    }
    // Default to conductor
    return this.nodes.get('heady-conductor') || [...this.nodes.values()][0];
  }

  /**
   * Called the instant any subtask completes.
   * Immediately unblocks and dispatches any now-ready downstream subtasks.
   */
  async _onComplete(subtask, result) {
    const graph = this.activeGraph.get(subtask.taskId);
    if (!graph) return;

    graph.markComplete(subtask.id, result);

    await this.eventSpine.emit('subtask.completed', {
      taskId: subtask.taskId,
      subtaskId: subtask.id,
      correlationId: subtask.correlationId,
    });

    // Find all subtasks that are NOW unblocked (all dependencies satisfied)
    const unblocked = graph.getUnblocked();
    if (unblocked.length > 0) {
      await this._dispatchAll(unblocked);
    }

    // If the full graph is complete, resolve the root task
    if (graph.isComplete()) {
      await this._resolve(subtask.taskId, graph.collectResults());
    }
  }

  /**
   * Resolve a completed task — emit events, feed results to AutoSuccess
   */
  async _resolve(taskId, results) {
    const graph = this.activeGraph.get(taskId);
    this.activeGraph.delete(taskId);
    this.stats.completed++;

    await this.eventSpine.emit('task.completed', {
      taskId,
      results,
      completedAt: new Date().toISOString(),
      durationMs: graph ? Date.now() - graph.startedAt : 0,
    });

    // Feed results to AutoSuccessEngine if available
    const ase = this.nodes.get('auto-success-engine');
    if (ase && typeof ase.evaluate === 'function') {
      await ase.evaluate(taskId, results);
    }
  }

  /**
   * Enrich raw task with IDs, timestamps, and semantic vector
   */
  _enrich(rawTask) {
    return {
      ...rawTask,
      id: rawTask.id ?? crypto.randomUUID(),
      startedAt: Date.now(),
      semanticVector: rawTask.semanticVector ?? null,
      correlationId: rawTask.correlationId ?? crypto.randomUUID(),
    };
  }

  /**
   * Get pipeline stats
   */
  getStats() {
    return {
      ...this.stats,
      activeGraphs: this.activeGraph.size,
      phi: PHI,
    };
  }
}

export default HCFullPipeline;
