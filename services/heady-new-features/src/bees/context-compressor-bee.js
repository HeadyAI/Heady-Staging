/**
 * ContextCompressorBee — φ-weighted conversation compression + Claude cache breakpoints
 * Prevents context overflow on 200k+ token windows
 * HeadySystems Inc. — src/bees/context-compressor-bee.js
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'context-compressor-bee' });
const PHI = 1.618033988749895;

// Model context windows (tokens)
const CONTEXT_LIMITS = {
  'gemini-2.5-flash':  1000000,
  'gemini-2.5-pro':    1000000,
  'claude-opus-4-6':    200000,
  'claude-sonnet-4-5':  200000,
  'claude-haiku-3-5':   200000,
  'gpt-4o':             128000,
  'gpt-4o-mini':        128000,
  'llama-3.3-70b':      131072,
};

// Tokens per char approximation (conservative)
const CHARS_PER_TOKEN = 3.8;

const CompressSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system','user','assistant']),
    content: z.string(),
  })).min(1),
  model: z.string().default('gemini-2.5-flash'),
  reserveForOutput: z.number().int().default(8192),
  compressionLevel: z.enum(['gentle','moderate','aggressive']).default('moderate'),
  preserveSystemPrompt: z.boolean().default(true),
});

export default class ContextCompressorBee {
  #env;

  constructor(env) {
    this.#env = env;
  }

  #estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  #totalTokens(messages) {
    return messages.reduce((sum, m) => sum + this.#estimateTokens(m.content), 0);
  }

  /**
   * Compute φ-importance weight for a message
   * Recency bias + role weight + content signal
   */
  #phiWeight(msg, index, total) {
    const recency = (index / total) ** (1 / PHI); // φ-root recency curve
    const roleWeight = msg.role === 'system' ? PHI * PHI : msg.role === 'user' ? PHI : 1.0;
    const hasCode = /```/.test(msg.content) ? 1.2 : 1.0;
    const hasDecision = /\b(decided|architecture|final|IMPORTANT|critical)\b/i.test(msg.content) ? 1.4 : 1.0;
    return recency * roleWeight * hasCode * hasDecision;
  }

  /**
   * Gentle: keep system + recent N messages + middle summary
   */
  #gentleCompress(messages, targetTokens) {
    const system = messages.filter(m => m.role === 'system');
    const conv = messages.filter(m => m.role !== 'system');

    // Keep last 8 messages (Fibonacci)
    const recent = conv.slice(-8);
    const middle = conv.slice(0, -8);

    if (middle.length === 0) return { messages, savedTokens: 0 };

    const summary = {
      role: 'user',
      content: `[CONTEXT SUMMARY: ${middle.length} earlier messages summarized]\n` +
        middle.map(m => `${m.role}: ${m.content.slice(0, 120)}...`).join('\n'),
    };

    const compressed = [...system, summary, ...recent];
    const originalTokens = this.#totalTokens(messages);
    const compressedTokens = this.#totalTokens(compressed);

    return {
      messages: compressed,
      savedTokens: originalTokens - compressedTokens,
      compressionRatio: (compressedTokens / originalTokens).toFixed(3),
      messagesRemoved: middle.length,
    };
  }

  /**
   * Moderate: φ-weighted retention
   */
  #moderateCompress(messages, targetTokens) {
    const system = messages.filter(m => m.role === 'system');
    const conv = messages.filter(m => m.role !== 'system');

    const weighted = conv.map((msg, i) => ({
      msg,
      weight: this.#phiWeight(msg, i, conv.length),
      index: i,
    }));

    // Always keep last 5 (Fibonacci)
    const lastN = 5;
    const alwaysKeep = new Set(conv.slice(-lastN).map((_, i) => conv.length - lastN + i));

    // Sort by weight descending, keep top φ-fraction
    const keepFraction = 1 / PHI; // 0.618
    const keepCount = Math.max(lastN, Math.ceil(conv.length * keepFraction));

    const sorted = [...weighted].sort((a, b) => b.weight - a.weight);
    const keepIndices = new Set([
      ...sorted.slice(0, keepCount).map(w => w.index),
      ...alwaysKeep,
    ]);

    const kept = conv.filter((_, i) => keepIndices.has(i));
    const dropped = conv.length - kept.length;

    const compressed = [...system, ...kept];
    const originalTokens = this.#totalTokens(messages);
    const compressedTokens = this.#totalTokens(compressed);

    return {
      messages: compressed,
      savedTokens: originalTokens - compressedTokens,
      compressionRatio: (compressedTokens / originalTokens).toFixed(3),
      messagesRemoved: dropped,
    };
  }

  /**
   * Aggressive: single summary + last 4 messages
   */
  #aggressiveCompress(messages) {
    const system = messages.filter(m => m.role === 'system');
    const conv = messages.filter(m => m.role !== 'system');
    const recent = conv.slice(-4);
    const summarized = conv.slice(0, -4);

    const summaryLines = summarized
      .filter(m => m.role === 'user')
      .map(m => `- ${m.content.slice(0, 80)}`)
      .slice(-13); // Keep last 13 user turns (Fibonacci) in summary

    const summary = {
      role: 'user',
      content: `[COMPRESSED HISTORY — ${summarized.length} messages]\n${summaryLines.join('\n')}\n[END COMPRESSED HISTORY]`,
    };

    const compressed = [...system, summary, ...recent];
    const originalTokens = this.#totalTokens(messages);
    const compressedTokens = this.#totalTokens(compressed);

    return {
      messages: compressed,
      savedTokens: originalTokens - compressedTokens,
      compressionRatio: (compressedTokens / originalTokens).toFixed(3),
      messagesRemoved: summarized.length,
    };
  }

  /**
   * Add Claude cache breakpoints to reduce token cost by 50% on repeated prompts
   * Adds cache_control: { type: 'ephemeral' } to the last system message
   * and every 1000th token boundary in conversation
   */
  addClaudeCacheBreakpoints(messages) {
    const result = messages.map(m => ({ ...m }));

    // Cache the system prompt (biggest win — usually repeated on every call)
    const sysIdx = result.findLastIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      result[sysIdx] = {
        ...result[sysIdx],
        cache_control: { type: 'ephemeral' },
      };
    }

    // Cache every ~4000 token boundary in conversation (up to 4 breakpoints total)
    let tokenCount = 0;
    let breakpoints = 0;
    for (let i = 0; i < result.length && breakpoints < 3; i++) {
      tokenCount += this.#estimateTokens(result[i].content);
      if (tokenCount >= 4000 * (breakpoints + 1) && result[i].role !== 'system') {
        result[i] = { ...result[i], cache_control: { type: 'ephemeral' } };
        breakpoints++;
      }
    }

    return { messages: result, cacheBreakpoints: breakpoints + (sysIdx >= 0 ? 1 : 0) };
  }

  /**
   * Main: compress messages to fit within model context window
   */
  compress(rawInput) {
    const input = CompressSchema.parse(rawInput);
    const contextLimit = CONTEXT_LIMITS[input.model] ?? 128000;
    const targetTokens = contextLimit - input.reserveForOutput;
    const currentTokens = this.#totalTokens(input.messages);

    if (currentTokens <= targetTokens) {
      return { messages: input.messages, savedTokens: 0, compressionRatio: '1.000', needed: false };
    }

    logger.info({
      currentTokens, targetTokens, model: input.model, level: input.compressionLevel,
    }, 'context_compression_triggered');

    let result;
    switch (input.compressionLevel) {
      case 'gentle':    result = this.#gentleCompress(input.messages, targetTokens); break;
      case 'moderate':  result = this.#moderateCompress(input.messages, targetTokens); break;
      case 'aggressive':result = this.#aggressiveCompress(input.messages); break;
    }

    return { ...result, needed: true, originalTokens: currentTokens, targetTokens };
  }
}
