/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Vector Ops — Barrel export for the complete vector space operational layer.
 * Founder: Eric Haywood
 *
 * @module core/vector-ops
 */

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
  DIM,
} from './csl-engine.js';

export {
  EmbeddingRouter,
  EmbeddingCache,
  PROVIDERS,
  generateDeterministicEmbedding,
  truncateMRL,
} from './embedding-router.js';

export {
  HybridSearch,
  BM25Index,
  RRF_K,
  SEARCH_DEFAULTS,
  tokenize,
} from './hybrid-search.js';

export {
  BinaryBSC,
  BipolarMAP,
  RealHRR,
  HDCCodebook,
  DEFAULT_DIM,
} from './hdc-operations.js';

export {
  TernaryLogic,
  KleeneK3,
  Lukasiewicz,
  Godel,
  ProductLogic,
  CSLContinuous,
  TRUTH,
  TRUTH_THRESHOLD,
} from './ternary-logic.js';
