// model-router.js — Multi-Provider AI Model Router Service  
// Heady™ Latent-Space OS — HeadySystems Inc.
// Updated for current models: Gemini 2.5 Pro/Flash, Claude Opus 4.6, Groq Llama 3.3
// Fallback chain: Gemini 2.5 Flash → Gemini 2.5 Pro → Claude Sonnet 4.5 → Claude Opus 4.6 → Groq → GPT-4o → Workers AI

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import pino from "pino";

const log = pino({ name: "model-router", level: process.env.LOG_LEVEL || "info" });
const PHI = 1.618033988749895;

export const MODEL_REGISTRY = {
  // Gemini (Google AI Studio)
  "gemini-2.5-flash": { provider: "google", inputCost: 0.15, outputCost: 0.60, contextWindow: 1_048_576, tier: "fast", available: true },
  "gemini-2.5-pro":   { provider: "google", inputCost: 1.25, outputCost: 10.0, contextWindow: 1_048_576, tier: "pro",  available: true },
  // Claude (Anthropic)
  "claude-sonnet-4-5": { provider: "anthropic", inputCost: 3.0,  outputCost: 15.0, contextWindow: 200_000, tier: "standard", available: true },
  "claude-opus-4-6":   { provider: "anthropic", inputCost: 15.0, outputCost: 75.0, contextWindow: 200_000, tier: "premium",  available: true },
  // Groq
  "llama-3.3-70b-versatile": { provider: "groq", inputCost: 0.59, outputCost: 0.79, contextWindow: 128_000, tier: "fast", available: true },
  "llama-3.3-8b-preview":    { provider: "groq", inputCost: 0.05, outputCost: 0.08, contextWindow: 128_000, tier: "micro", available: true },
  // OpenAI
  "gpt-4o":      { provider: "openai", inputCost: 2.50, outputCost: 10.0, contextWindow: 128_000, tier: "standard", available: true },
  "gpt-4o-mini": { provider: "openai", inputCost: 0.15, outputCost: 0.60, contextWindow: 128_000, tier: "fast",     available: true },
  // Workers AI (Cloudflare - free tier)
  "@cf/meta/llama-3.3-8b-instruct": { provider: "cloudflare", inputCost: 0, outputCost: 0, contextWindow: 8_192, tier: "free", available: true },
};

// Fallback chains by use case
export const FALLBACK_CHAINS = {
  default:    ["gemini-2.5-flash", "gemini-2.5-pro", "claude-sonnet-4-5", "gpt-4o-mini", "llama-3.3-70b-versatile", "@cf/meta/llama-3.3-8b-instruct"],
  reasoning:  ["claude-opus-4-6", "gemini-2.5-pro", "claude-sonnet-4-5", "gpt-4o"],
  fast:       ["gemini-2.5-flash", "gpt-4o-mini", "llama-3.3-8b-preview", "@cf/meta/llama-3.3-8b-instruct"],
  longContext:["gemini-2.5-pro", "gemini-2.5-flash", "claude-opus-4-6"],
  coding:     ["claude-opus-4-6", "gemini-2.5-pro", "claude-sonnet-4-5", "gpt-4o"],
  free:       ["@cf/meta/llama-3.3-8b-instruct", "llama-3.3-8b-preview"],
};

const ModelRequestSchema = z.object({
  requestId: z.string().uuid().default(() => uuidv4()),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  model: z.string().optional(),
  useCase: z.enum(Object.keys(FALLBACK_CHAINS)).default("default"),
  maxBudgetUsd: z.number().default(0.10),
  maxTokens: z.number().optional(),
  temperature: z.number().default(0.7),
  thinkingBudget: z.number().optional(),
  stream: z.boolean().default(false),
  systemPrompt: z.string().optional(),
});

export class ModelRouter {
  #callHistory = [];
  #modelHealth = new Map();

  constructor(env = {}) {
    this._googleApiKey = env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    this._anthropicApiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    this._groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    this._openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    this._cfAccountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    this._cfApiToken = env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    log.info("ModelRouter initialized");
  }

  get name() { return "model-router"; }
  get version() { return "2.0.0"; }

  /**
   * Route and execute a model call with automatic fallback
   */
  async call(input) {
    const req = ModelRequestSchema.parse(input);
    const chain = req.model ? [req.model, ...FALLBACK_CHAINS[req.useCase]] : FALLBACK_CHAINS[req.useCase];
    const uniqueChain = [...new Set(chain)]; // deduplicate

    log.info({ requestId: req.requestId, useCase: req.useCase, chainLength: uniqueChain.length }, "Model routing started");

    for (const modelId of uniqueChain) {
      const model = MODEL_REGISTRY[modelId];
      if (!model) { log.warn({ modelId }, "Model not in registry, skipping"); continue; }
      if (!model.available) { log.info({ modelId }, "Model marked unavailable, skipping"); continue; }

      // Estimate cost and check budget
      const estimatedCost = this.#estimateCost(modelId, (req.messages.reduce((s, m) => s + m.content.length, 0)) / 4, 500);
      if (estimatedCost > req.maxBudgetUsd) {
        log.info({ modelId, estimatedCost, maxBudgetUsd: req.maxBudgetUsd }, "Model over budget, trying next");
        continue;
      }

      // Check model health
      const healthData = this.#modelHealth.get(modelId);
      if (healthData && healthData.consecutiveFailures >= 3) {
        log.warn({ modelId, consecutiveFailures: healthData.consecutiveFailures }, "Model unhealthy, skipping");
        continue;
      }

      const startMs = Date.now();
      try {
        const result = await this.#callModel(modelId, model.provider, req);
        const durationMs = Date.now() - startMs;

        this.#recordSuccess(modelId, durationMs);
        this.#callHistory.push({ requestId: req.requestId, modelId, provider: model.provider, useCase: req.useCase, durationMs, estimatedCostUsd: estimatedCost, timestamp: new Date().toISOString() });

        log.info({ requestId: req.requestId, modelId, durationMs, estimatedCostUsd: estimatedCost }, "Model call successful");
        return { ...result, modelId, provider: model.provider, durationMs, estimatedCostUsd: estimatedCost };

      } catch (err) {
        const durationMs = Date.now() - startMs;
        this.#recordFailure(modelId);
        log.error({ requestId: req.requestId, modelId, err: err.message, durationMs }, "Model call failed, trying fallback");
      }
    }

    throw new Error(`All models in chain failed for useCase:${req.useCase}`);
  }

  async #callModel(modelId, provider, req) {
    switch (provider) {
      case "google":     return this.#callGemini(modelId, req);
      case "anthropic":  return this.#callClaude(modelId, req);
      case "groq":       return this.#callGroq(modelId, req);
      case "openai":     return this.#callOpenAI(modelId, req);
      case "cloudflare": return this.#callWorkersAI(modelId, req);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async #callGemini(modelId, req) {
    const apiKey = this._googleApiKey;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const body = {
      contents: req.messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: req.maxTokens || 4096, temperature: req.temperature },
    };
    if (req.systemPrompt) body.system_instruction = { parts: [{ text: req.systemPrompt }] };
    if (req.thinkingBudget && req.thinkingBudget > 0) body.generationConfig.thinkingConfig = { thinkingBudget: req.thinkingBudget };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return { content: data.candidates[0]?.content?.parts[0]?.text || "", usage: data.usageMetadata };
  }

  async #callClaude(modelId, req) {
    const apiKey = this._anthropicApiKey;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    const body = {
      model: modelId,
      max_tokens: req.maxTokens || 4096,
      messages: req.messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
      temperature: req.temperature,
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    if (req.thinkingBudget && req.thinkingBudget > 0) { body.thinking = { type: "enabled", budget_tokens: req.thinkingBudget }; body.betas = ["interleaved-thinking-2025-05-14"]; }
    const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return { content: data.content.find(b => b.type === "text")?.text || "", usage: data.usage };
  }

  async #callGroq(modelId, req) {
    const apiKey = this._groqApiKey;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");
    const messages = [...(req.systemPrompt ? [{ role: "system", content: req.systemPrompt }] : []), ...req.messages];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: modelId, messages, max_tokens: req.maxTokens || 4096, temperature: req.temperature }) });
    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return { content: data.choices[0]?.message?.content || "", usage: data.usage };
  }

  async #callOpenAI(modelId, req) {
    const apiKey = this._openaiApiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    const messages = [...(req.systemPrompt ? [{ role: "system", content: req.systemPrompt }] : []), ...req.messages];
    const res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: modelId, messages, max_tokens: req.maxTokens || 4096, temperature: req.temperature }) });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return { content: data.choices[0]?.message?.content || "", usage: data.usage };
  }

  async #callWorkersAI(modelId, req) {
    const accountId = this._cfAccountId;
    const apiToken = this._cfApiToken;
    if (!accountId || !apiToken) throw new Error("Cloudflare Workers AI not configured");
    const messages = [...(req.systemPrompt ? [{ role: "system", content: req.systemPrompt }] : []), ...req.messages];
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` }, body: JSON.stringify({ messages }) });
    if (!res.ok) throw new Error(`Workers AI error: ${res.status}`);
    const data = await res.json();
    return { content: data.result?.response || "", usage: {} };
  }

  #estimateCost(modelId, inputTokens, outputTokens) {
    const model = MODEL_REGISTRY[modelId];
    if (!model) return 0;
    return (inputTokens / 1_000_000 * model.inputCost) + (outputTokens / 1_000_000 * model.outputCost);
  }

  #recordSuccess(modelId, durationMs) {
    const h = this.#modelHealth.get(modelId) || { consecutiveFailures: 0, totalCalls: 0, totalLatencyMs: 0 };
    h.consecutiveFailures = 0;
    h.totalCalls++;
    h.totalLatencyMs += durationMs;
    h.avgLatencyMs = Math.round(h.totalLatencyMs / h.totalCalls);
    this.#modelHealth.set(modelId, h);
  }

  #recordFailure(modelId) {
    const h = this.#modelHealth.get(modelId) || { consecutiveFailures: 0, totalCalls: 0 };
    h.consecutiveFailures++;
    h.totalCalls++;
    this.#modelHealth.set(modelId, h);
  }

  health() {
    const models = Object.fromEntries([...this.#modelHealth.entries()].map(([k, v]) => [k, { ...v, healthy: v.consecutiveFailures < 3 }]));
    return { service: this.name, version: this.version, registeredModels: Object.keys(MODEL_REGISTRY).length, callHistory: this.#callHistory.length, modelHealth: models, fallbackChains: Object.keys(FALLBACK_CHAINS), status: "healthy", timestamp: new Date().toISOString() };
  }
}

export default ModelRouter;
