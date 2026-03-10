/**
 * Heady Core — Unified Barrel Export
 * 
 * Wires all core engines into a single import surface.
 * Every module uses ES module exports, φ-scaled constants,
 * CSL gates (no boolean logic), and concurrent-equals (no priorities).
 * 
 * @module core
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

// === Wave 2 Core Engines ===

export {
  LiquidNodeRegistry,
  VectorRouter,
  HealthMonitor as LiquidHealthMonitor,
  TopologyManager,
  ColabRuntimeManager,
} from './liquid-nodes/index.js';

export {
  SwarmManager,
  BeeLifecycle,
  TaskRouter as SwarmTaskRouter,
  WorkStealer,
  BackpressureManager,
  ConsensusEngine,
} from './swarm-engine/index.js';

export {
  TaskDecomposer,
  ParallelExecutor,
} from './async-engine/index.js';

export {
  normalize,
  dot,
  magnitude,
  cslAND,
  cslOR,
  cslNOT,
  cslIMPLY,
  cslXOR,
  cslCONSENSUS,
  cslGATE,
  cslBLEND,
  topK,
  slerp,
  rotate,
  reduceDimensions,
  EmbeddingRouter,
  EmbeddingCache,
  HybridSearch,
  BM25Index,
  BinaryBSC,
  BipolarMAP,
  RealHRR,
  HDCCodebook,
  TernaryLogic,
  KleeneK3,
  Lukasiewicz,
  CSLContinuous,
  TRUTH,
} from './vector-ops/index.js';

// === Wave 3 Core Engines ===

export {
  HeadyConductor,
  TaskClassifier,
} from './conductor/index.js';

export {
  DurableAgentState,
  EdgeOriginRouter,
  VectorizeSync,
} from './edge-runtime/index.js';

export {
  ProviderRacer,
  HealthMonitor as GatewayHealthMonitor,
  BYOKManager,
  SSETransport,
  WebSocketTransport,
  JSONRPC,
} from './liquid-gateway/index.js';

export {
  BeeRegistry,
  BEE_TEMPLATES,
  RESOURCE_CLASSES,
  SWARM_TYPES,
  POOL_DISTRIBUTION,
} from './bee-registry/index.js';

export {
  HCFullPipeline,
  STAGE_DEFINITIONS,
  QUALITY_GATES,
} from './pipeline/index.js';
