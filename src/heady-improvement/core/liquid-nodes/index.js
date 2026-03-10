/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Liquid Nodes — Barrel export for the complete liquid compute mesh.
 * Founder: Eric Haywood
 *
 * @module core/liquid-nodes
 */

export {
  LiquidNodeRegistry,
  NODE_STATUS,
  PLATFORM,
  NODE_TYPE,
  buildDefaultNodes,
} from './node-registry.js';

export {
  VectorRouter,
  computeDistance,
  cosineSimilarity3D,
  normalize3D,
  TASK_VECTORS,
  AXIS_WEIGHTS,
} from './vector-router.js';

export {
  HealthMonitor,
  CircuitBreaker,
  CB_STATE,
  HEARTBEAT_INTERVALS,
  CIRCUIT_BREAKER_DEFAULTS,
} from './health-monitor.js';

export {
  Topology,
  LAYERS,
  CONNECTION_WEIGHTS,
  classifyNodeLayer,
  layerConnectionWeight,
} from './topology.js';

export {
  ColabRuntimeManager,
  ColabRuntime,
  RUNTIME_STATE,
  LATENT_OPS,
  RUNTIME_LIMITS,
  DEFAULT_RUNTIMES,
} from './colab-runtime.js';
