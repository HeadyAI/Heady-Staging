/**
 * ThinkingBudgetBee — Dynamically allocates reasoning tokens per task
 * φ-Fibonacci scaled tiers: 0, 618, 1618, 4096, 16180, 24576
 * HeadySystems Inc. — src/bees/thinking-budget-bee.js
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'thinking-budget-bee' });

const InputSchema = z.object({
  task: z.string().min(1),
  model: z.string().default('gemini-2.5-flash'),
  urgency: z.enum(['instant', 'fast', 'balanced', 'deep', 'ultra', 'max']).optional(),
  complexity: z.number().min(0).max(1).optional(),
  forceMax: z.boolean().default(false),
});

/**
 * φ-Fibonacci thinking token tiers
 * Derived from golden ratio φ = 1.618033...
 */
const PHI = 1.618033988749895;
const TIERS = {
  INSTANT:  { tokens: 0,     label: 'instant',  keywords: ['route','classify','sort','lookup','ping'] },
  FAST:     { tokens: 618,   label: 'fast',      keywords: ['summarize','quick','brief','translate','format'] },
  BALANCED: { tokens: 1618,  label: 'balanced',  keywords: ['explain','write','code','generate','analyze'] },
  DEEP:     { tokens: 4096,  label: 'deep',      keywords: ['design','architect','debug','optimize','review'] },
  ULTRA:    { tokens: 16180, label: 'ultra',     keywords: ['research','patent','strategy','proof','theorem'] },
  MAX:      { tokens: 24576, label: 'max',       keywords: ['grant','sbir','dissertation','comprehensive','full'] },
};

export default class ThinkingBudgetBee {
  #env;
  #beeId;

  constructor(env) {
    this.#env = env;
    this.#beeId = uuidv4();
  }

  /**
   * Detect optimal thinking tier from task description
   */
  #detectTier(task) {
    const lower = task.toLowerCase();

    // Check from MAX down so we pick the highest needed tier
    for (const [name, tier] of Object.entries(TIERS).reverse()) {
      if (tier.keywords.some(kw => lower.includes(kw))) {
        return { tier: name, ...tier };
      }
    }
    return { tier: 'BALANCED', ...TIERS.BALANCED };
  }

  /**
   * Detect tier from measured complexity score (0-1)
   * Score thresholds are φ-normalized intervals
   */
  #tierFromComplexity(score) {
    if (score < 0.10) return 'INSTANT';
    if (score < 0.20) return 'FAST';
    if (score < 0.40) return 'BALANCED';
    if (score < 0.65) return 'DEEP';
    if (score < 0.90) return 'ULTRA';
    return 'MAX';
  }

  /**
   * Build model-specific config with correct thinking budget structure
   */
  #buildConfig(model, tokens) {
    const isGemini  = model.startsWith('gemini');
    const isClaude  = model.startsWith('claude');
    const isGroq    = model.startsWith('llama') || model.startsWith('mixtral');

    if (isGroq || tokens === 0) {
      return { model, maxTokens: 4096, temperature: 0.7 };
    }

    if (isGemini) {
      return {
        model,
        generationConfig: {
          thinkingConfig: { thinkingBudget: tokens, includeThoughts: false },
          maxOutputTokens: Math.min(8192, tokens * PHI | 0),
          temperature: tokens === 0 ? 0.7 : 0.3,
        },
      };
    }

    if (isClaude) {
      return {
        model,
        max_tokens: Math.min(16000, tokens * PHI | 0),
        thinking: tokens > 0
          ? { type: 'enabled', budget_tokens: tokens }
          : { type: 'disabled' },
        temperature: tokens > 0 ? 1.0 : 0.7, // Claude extended thinking requires temp=1
      };
    }

    // Generic OpenAI-compat
    return {
      model,
      max_completion_tokens: Math.min(8192, tokens * PHI | 0),
      temperature: 0.5,
    };
  }

  /**
   * Main entry: allocate thinking budget
   * @param {Object} input - InputSchema compatible
   * @returns {{ tier, tokens, geminiConfig, claudeConfig, modelConfig, budgetId }}
   */
  allocate(rawInput) {
    const input = InputSchema.parse(rawInput);
    const id = uuidv4();

    let tierName;
    if (input.forceMax) {
      tierName = 'MAX';
    } else if (input.urgency) {
      tierName = input.urgency.toUpperCase();
    } else if (input.complexity !== undefined) {
      tierName = this.#tierFromComplexity(input.complexity);
    } else {
      tierName = this.#detectTier(input.task).tier;
    }

    const tier = TIERS[tierName];
    const modelConfig = this.#buildConfig(input.model, tier.tokens);

    logger.info({ budgetId: id, tierName, tokens: tier.tokens, model: input.model }, 'budget_allocated');

    return {
      budgetId: id,
      tier: tierName,
      tokens: tier.tokens,
      label: tier.label,
      modelConfig,
      // Convenience direct accessors
      geminiConfig:  modelConfig.generationConfig ?? null,
      claudeConfig:  modelConfig.thinking ?? null,
      costMultiplier: tier.tokens === 0 ? 1.0 : (1.0 + (tier.tokens / 24576) * PHI).toFixed(3),
    };
  }

  /**
   * Batch allocate for swarm tasks
   */
  allocateBatch(tasks) {
    return tasks.map(t => this.allocate(t));
  }

  /**
   * Estimate token cost savings vs always-MAX
   */
  estimateSavings(allocations) {
    const maxTokens = 24576;
    const actualTokens = allocations.reduce((sum, a) => sum + a.tokens, 0);
    const worstCaseTokens = allocations.length * maxTokens;
    const savedTokens = worstCaseTokens - actualTokens;
    const savingsPercent = ((savedTokens / worstCaseTokens) * 100).toFixed(1);
    return { savedTokens, savingsPercent, actualTokens, worstCaseTokens };
  }
}
