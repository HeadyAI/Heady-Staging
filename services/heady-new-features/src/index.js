/**
 * HeadySystems Inc. — Component barrel export
 * import { ThinkingBudgetBee, CSLRouter, ... } from '@headysystems/heady-components'
 */
export { default as ThinkingBudgetBee }  from './bees/thinking-budget-bee.js';
export { default as KnowledgeDistillerBee } from './bees/knowledge-distiller-bee.js';
export { default as SemanticCacheBee }   from './bees/semantic-cache-bee.js';
export { default as AuditTrailBee }      from './bees/audit-trail-bee.js';
export { default as ContextCompressorBee } from './bees/context-compressor-bee.js';
export { default as CSLRouter }          from './services/csl-router.js';
export { default as PhiFibonacciRateLimiter } from './middleware/rate-limiter.js';

export * from './skills/perplexity/heady-context.js';
export * from './skills/perplexity/phi-code-review.js';
export * from './skills/perplexity/grant-writer.js';
export * from './skills/perplexity/patent-strategy.js';
export * from './skills/perplexity/cost-optimizer.js';

export const PHI = 1.618033988749895;
export const FIBONACCI = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765];
export const VERSION = '2.0.0';
