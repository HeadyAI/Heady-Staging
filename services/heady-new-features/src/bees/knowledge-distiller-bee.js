/**
 * KnowledgeDistillerBee — Claude Files API + Vector persistence for cross-session memory
 * Fills critical gap: persistent knowledge across sessions
 * HeadySystems Inc. — src/bees/knowledge-distiller-bee.js
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'knowledge-distiller-bee' });
const PHI = 1.618033988749895;

const DistillInputSchema = z.object({
  content: z.string().min(1),
  filename: z.string().default('document.txt'),
  mimeType: z.string().default('text/plain'),
  userId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  category: z.enum(['code','conversation','document','patent','grant','architecture','research']).default('document'),
});

const RetrieveSchema = z.object({
  query: z.string().min(1),
  userId: z.string().uuid(),
  topK: z.number().int().min(1).max(20).default(5),
  category: z.string().optional(),
  minScore: z.number().min(0).max(1).default(0.72),
});

export default class KnowledgeDistillerBee {
  #env;
  #anthropicBaseUrl = 'https://api.anthropic.com/v1';
  #qdrantBase;

  constructor(env) {
    this.#env = env;
    this.#qdrantBase = env.QDRANT_URL ?? 'https://your-qdrant-instance.qdrant.io';
  }

  // ── Claude Files API ──────────────────────────────────────────────────────

  async #uploadToClaudeFiles(content, filename, mimeType) {
    const formData = new FormData();
    const blob = new Blob([content], { type: mimeType });
    formData.append('file', blob, filename);

    const resp = await fetch(`${this.#anthropicBaseUrl}/files`, {
      method: 'POST',
      headers: {
        'x-api-key': this.#env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
      },
      body: formData,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Claude Files upload failed: ${resp.status} — ${err}`);
    }

    const file = await resp.json();
    logger.info({ fileId: file.id, filename, size: file.size }, 'claude_file_uploaded');
    return file;
  }

  async #extractFacts(fileId, category) {
    const systemPrompt = `You are a knowledge distillation engine for HeadySystems Inc.
Extract structured facts from the provided document. Each fact must be:
- Atomic (one concept per fact)
- Category-tagged (${category})
- Confidence-scored (0.0–1.0)
- φ-weighted by importance (0.618 = normal, 1.0 = critical, 1.618 = foundational)

Return JSON array: [{ "fact": "...", "category": "...", "confidence": 0.9, "phi_weight": 1.618, "tags": [] }]
Extract maximum 89 facts (Fibonacci). Focus on architectural decisions, patterns, and domain knowledge.`;

    const resp = await fetch(`${this.#anthropicBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.#env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [{
            type: 'document',
            source: { type: 'file', file_id: fileId },
          }, {
            type: 'text',
            text: 'Extract all knowledge facts as JSON array.',
          }],
        }],
      }),
    });

    if (!resp.ok) throw new Error(`Claude extraction failed: ${resp.status}`);
    const data = await resp.json();
    const text = data.content?.[0]?.text ?? '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }

  // ── Qdrant vector storage ─────────────────────────────────────────────────

  async #embedText(text) {
    // Use Cloudflare Workers AI for free embeddings (bge-large-en-v1.5 = 1024d)
    const resp = await fetch(`${this.#env.CF_WORKERS_AI_BASE}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#env.CLOUDFLARE_API_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: '@cf/baai/bge-large-en-v1.5', input: text }),
    });
    const data = await resp.json();
    return data.result?.data?.[0]?.embedding ?? new Array(1024).fill(0);
  }

  async #upsertToQdrant(facts, userId, fileId) {
    const points = await Promise.all(facts.map(async (fact) => ({
      id: uuidv4().replace(/-/g, '').slice(0, 16), // Qdrant needs string UUID or uint64
      vector: await this.#embedText(fact.fact),
      payload: {
        ...fact,
        userId,
        claudeFileId: fileId,
        timestamp: new Date().toISOString(),
      },
    })));

    await fetch(`${this.#qdrantBase}/collections/heady_knowledge/points?wait=true`, {
      method: 'PUT',
      headers: {
        'api-key': this.#env.QDRANT_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ points }),
    });

    return points.length;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Distill knowledge from file content → Claude Files API → Qdrant
   */
  async distillFile(rawInput) {
    const input = DistillInputSchema.parse(rawInput);
    const distillId = uuidv4();
    logger.info({ distillId, userId: input.userId, category: input.category }, 'distill_start');

    const [claudeFile, _] = await Promise.all([
      this.#uploadToClaudeFiles(input.content, input.filename, input.mimeType),
      Promise.resolve(), // parallel slot for future pre-processing
    ]);

    const facts = await this.#extractFacts(claudeFile.id, input.category);
    const stored = await this.#upsertToQdrant(facts, input.userId, claudeFile.id);

    logger.info({ distillId, factsExtracted: facts.length, stored }, 'distill_complete');
    return {
      distillId,
      claudeFileId: claudeFile.id,
      factsExtracted: facts.length,
      stored,
      facts: facts.slice(0, 5), // return preview of top 5
    };
  }

  /**
   * Retrieve relevant knowledge for a query
   */
  async retrieve(rawInput) {
    const input = RetrieveSchema.parse(rawInput);

    const queryVector = await this.#embedText(input.query);

    const filter = input.category ? {
      must: [
        { key: 'userId', match: { value: input.userId } },
        { key: 'category', match: { value: input.category } },
      ],
    } : {
      must: [{ key: 'userId', match: { value: input.userId } }],
    };

    const resp = await fetch(`${this.#qdrantBase}/collections/heady_knowledge/points/search`, {
      method: 'POST',
      headers: {
        'api-key': this.#env.QDRANT_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        vector: queryVector,
        filter,
        limit: input.topK,
        score_threshold: input.minScore,
        with_payload: true,
      }),
    });

    const data = await resp.json();
    return (data.result ?? []).map(r => ({ ...r.payload, score: r.score }));
  }

  /**
   * Build context window string from relevant knowledge
   */
  async buildContextWindow(query, userId, maxFacts = 8) {
    const facts = await this.retrieve({ query, userId, topK: maxFacts });
    if (!facts.length) return '';

    const lines = facts
      .sort((a, b) => (b.phi_weight ?? 1) - (a.phi_weight ?? 1))
      .map(f => `• [${f.category}|φ${f.phi_weight?.toFixed(3)}] ${f.fact}`);

    return `\n\n<knowledge_context>\n${lines.join('\n')}\n</knowledge_context>\n`;
  }
}
