// packages/heady-core/src/phi.js
// §1 — φ-Constants & Fibonacci Foundation
// Law 4: φ-scaling for all timeouts, TTLs, thresholds

export const PHI = 1.618033988749895;
export const PHI_INV = 0.618033988749895;   // CSL include gate
export const PHI_SQ = 2.618033988749895;    // retry backoff seconds
export const PHI_7 = 29034;                  // heartbeat ms (φ⁷)
export const PHI_5 = 11090;                  // pipeline target ms (φ⁵)

export const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
export const TOP_K = 21;           // FIBONACCI[7]
export const MAX_BEES = 34;        // FIBONACCI[8]
export const VECTOR_DIM = 384;

export const CSL = {
  CORE:    0.718,   // inject into active context
  INCLUDE: 0.618,   // PHI_INV — add to response context
  RECALL:  0.382,   // include in search results
  VOID:    0.0      // exclude
};

export const CANARY_STEPS = [0.05, 0.25, 0.50, 1.00]; // φ-stepped deploy

export const HEADY_DOMAINS = [
  'headysystems.com', 'headyme.com', 'headyconnection.org',
  'headybuddy.org', 'headymcp.com', 'headyio.com',
  'headybot.com', 'headyapi.com', 'headylens.com',
  'heady-ai.com', 'headyfinance.com'
];
