/**
 * @heady/edge-runtime — Edge-Origin Router
 * 
 * Routes requests between Cloudflare edge (fast, cheap) and
 * Cloud Run origin (powerful, expensive) using φ-scored complexity.
 * 
 * Routing bands:
 *   Edge-only:     score < ψ² ≈ 0.382 (simple lookups, embeddings, classification)
 *   Edge-preferred: ψ² – ψ ≈ 0.382–0.618 (moderate queries with edge fallback)
 *   Origin-required: score > ψ ≈ 0.618 (complex reasoning, multi-step, code gen)
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { PHI, PSI, PSI2, FIB, phiThreshold, phiBackoff, cslGate } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger({ service: 'edge-origin-router' });

/** Routing targets */
const RoutingTarget = Object.freeze({
  EDGE: 'edge',
  EDGE_PREFERRED: 'edge_preferred',
  ORIGIN: 'origin',
});

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  edgeThreshold: PSI2,                      // ≈0.382 — below = edge-only
  originThreshold: PSI,                     // ≈0.618 — above = origin-required
  edgeModelId: 'llama-3.1-8b-instant',     // Workers AI model
  edgeEmbeddingModel: 'bge-base-en-v1.5',  // Workers AI embedding
  originEndpoint: process.env.ORIGIN_URL,    // Cloud Run endpoint
  fallbackTimeoutMs: FIB[9] * 1000,         // 34s edge fallback timeout
  originTimeoutMs: FIB[11] * 1000,          // 89s origin timeout
  resourceAllocation: {
    edge: FIB[10] / (FIB[10] + FIB[9] + FIB[6] + FIB[4]),    // ≈ 0.55
    origin: FIB[9] / (FIB[10] + FIB[9] + FIB[6] + FIB[4]),   // ≈ 0.34
    hybrid: FIB[6] / (FIB[10] + FIB[9] + FIB[6] + FIB[4]),   // ≈ 0.08
    reserved: FIB[4] / (FIB[10] + FIB[9] + FIB[6] + FIB[4]), // ≈ 0.03
  },
});

/**
 * Complexity signals for routing decisions
 */
const COMPLEXITY_SIGNALS = Object.freeze({
  // Low complexity (edge-friendly)
  EMBEDDING: 0.1,
  CLASSIFICATION: 0.15,
  LOOKUP: 0.2,
  SIMPLE_QA: 0.3,

  // Medium complexity (edge-preferred with fallback)
  SUMMARIZATION: 0.4,
  EXTRACTION: 0.45,
  TRANSLATION: 0.5,

  // High complexity (origin-required)
  CODE_GENERATION: 0.7,
  MULTI_STEP_REASONING: 0.8,
  CREATIVE_WRITING: 0.75,
  ARCHITECTURE_DESIGN: 0.85,
  SECURITY_ANALYSIS: 0.9,
});

/**
 * Compute complexity score for a request using Fibonacci-weighted signals
 */
function computeComplexity(request) {
  let score = 0;
  let weightSum = 0;

  const signals = [];

  // Token count signal (more tokens = more complex)
  const tokenEstimate = (request.content || '').split(/\s+/).length;
  const tokenComplexity = Math.min(1, tokenEstimate / FIB[12]); // Normalize to 144 tokens
  signals.push({ factor: tokenComplexity, weight: FIB[5] }); // weight = 5

  // Task type signal
  if (request.taskType && COMPLEXITY_SIGNALS[request.taskType.toUpperCase()]) {
    signals.push({
      factor: COMPLEXITY_SIGNALS[request.taskType.toUpperCase()],
      weight: FIB[7], // weight = 13 (dominant signal)
    });
  }

  // Multi-step indicator
  if (request.steps && request.steps > 1) {
    const stepComplexity = Math.min(1, request.steps / FIB[6]);
    signals.push({ factor: stepComplexity, weight: FIB[6] }); // weight = 8
  }

  // Context window usage
  if (request.contextTokens) {
    const contextComplexity = Math.min(1, request.contextTokens / CONFIG.originTimeoutMs);
    signals.push({ factor: contextComplexity, weight: FIB[4] }); // weight = 3
  }

  // Compute Fibonacci-weighted average
  for (const { factor, weight } of signals) {
    score += factor * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? score / weightSum : PSI2; // Default to edge-preferred
}

/**
 * Route a request to edge or origin based on complexity
 */
function routeRequest(request) {
  const complexity = computeComplexity(request);

  let target;
  let reason;

  if (complexity < CONFIG.edgeThreshold) {
    target = RoutingTarget.EDGE;
    reason = `Complexity ${complexity.toFixed(3)} below edge threshold ${CONFIG.edgeThreshold.toFixed(3)}`;
  } else if (complexity > CONFIG.originThreshold) {
    target = RoutingTarget.ORIGIN;
    reason = `Complexity ${complexity.toFixed(3)} above origin threshold ${CONFIG.originThreshold.toFixed(3)}`;
  } else {
    target = RoutingTarget.EDGE_PREFERRED;
    reason = `Complexity ${complexity.toFixed(3)} in hybrid band (${CONFIG.edgeThreshold.toFixed(3)}–${CONFIG.originThreshold.toFixed(3)})`;
  }

  const route = {
    target,
    complexity,
    reason,
    timeout: target === RoutingTarget.ORIGIN
      ? CONFIG.originTimeoutMs
      : CONFIG.fallbackTimeoutMs,
    model: target === RoutingTarget.EDGE || target === RoutingTarget.EDGE_PREFERRED
      ? CONFIG.edgeModelId
      : null, // Origin chooses its own model
    fallback: target === RoutingTarget.EDGE_PREFERRED
      ? RoutingTarget.ORIGIN
      : null,
  };

  logger.info('Request routed', {
    target: route.target,
    complexity: route.complexity,
    timeout: route.timeout,
  });

  return route;
}

/**
 * Execute request with routing and fallback
 */
async function executeWithRouting(request, edgeExecutor, originExecutor) {
  const route = routeRequest(request);

  if (route.target === RoutingTarget.EDGE) {
    return edgeExecutor(request, route);
  }

  if (route.target === RoutingTarget.ORIGIN) {
    return originExecutor(request, route);
  }

  // Edge-preferred: try edge first, fall back to origin
  try {
    const result = await Promise.race([
      edgeExecutor(request, route),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Edge timeout')), route.timeout)
      ),
    ]);
    return result;
  } catch (err) {
    logger.warn('Edge execution failed, falling back to origin', {
      error: err.message,
      complexity: route.complexity,
    });
    return originExecutor(request, {
      ...route,
      target: RoutingTarget.ORIGIN,
      timeout: CONFIG.originTimeoutMs,
    });
  }
}

export {
  routeRequest,
  computeComplexity,
  executeWithRouting,
  RoutingTarget,
  COMPLEXITY_SIGNALS,
  CONFIG as EDGE_ROUTER_CONFIG,
};
