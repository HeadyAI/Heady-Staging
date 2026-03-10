/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 *
 * Swarm Engine — Barrel export for HeadyBee/HeadySwarm orchestration.
 * Founder: Eric Haywood
 *
 * @module core/swarm-engine
 */

export {
  HeadyBee,
  BEE_STATE,
  MAX_QUEUE_DEPTH,
  MAX_RETRIES,
  cosine,
  domainToVector,
} from './bee-lifecycle.js';

export {
  SwarmManager,
  HeadySwarm,
  CANONICAL_SWARMS,
  SWARM_LIMITS,
} from './swarm-manager.js';

export { TaskRouter } from './task-router.js';

export {
  WorkStealer,
  STEAL_BATCH_SIZE,
  STEAL_MIN_SIMILARITY,
} from './work-stealer.js';

export {
  BackpressureController,
  THROTTLE_RATES,
} from './backpressure.js';

export {
  SwarmConsensus,
  QUORUM,
  ACCEPTANCE_THRESHOLD,
  DECISION_STATE,
  VOTE_TIMEOUT_MS,
} from './consensus.js';
