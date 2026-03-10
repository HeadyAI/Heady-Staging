import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'node:module';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);

// Lazy-load embedding provider (avoids circular deps and missing optional deps)
let _embedder = null;
function getEmbedder() {
  if (!_embedder) {
    try {
      const { getDefaultProvider } = require('../latent/embedding-provider.js');
      _embedder = getDefaultProvider();
      logger.info('[MemoryStore] Embedding provider initialized');
    } catch (err) {
      logger.warn(`[MemoryStore] Embedding provider unavailable: ${err.message}`);
      _embedder = null;
    }
  }
  return _embedder;
}

// Cosine similarity for vector search
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

const PSI = 0.618033988749895; // Minimum relevance threshold

class MemoryStore {
  constructor() {
    this.storePath = process.env.MEMORY_STORE_PATH || './data/memory';
    this.memories = [];
    this._ensureDirectory();
    this._loadFromDisk();
  }

  _ensureDirectory() {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  _loadFromDisk() {
    const indexPath = path.join(this.storePath, 'index.json');
    if (fs.existsSync(indexPath)) {
      try {
        this.memories = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        logger.info(`[MemoryStore] Loaded ${this.memories.length} memories from disk`);
      } catch (err) {
        logger.error(`[MemoryStore] Failed to load index: ${err.message}`);
        this.memories = [];
      }
    }
  }

  _saveToDisk() {
    const indexPath = path.join(this.storePath, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(this.memories, null, 2));
  }

  getStatus() {
    const embedder = getEmbedder();
    return {
      memories: this.memories.length,
      storePath: this.storePath,
      maxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES) || 100000,
      embeddingsAvailable: !!embedder,
      embeddedCount: this.memories.filter(m => m.embedding).length,
      ...(embedder ? { embeddingStats: embedder.stats() } : {}),
    };
  }

  async ingest(content, metadata = {}) {
    // Generate 384D embedding via multi-provider chain (Cloudflare → OpenAI → local fallback)
    let embedding = null;
    const embedder = getEmbedder();
    if (embedder) {
      try {
        const vec = await embedder.embedOne(content);
        embedding = Array.from(vec); // Float32Array → JSON-serializable array
      } catch (err) {
        logger.warn(`[MemoryStore] Embedding generation failed, storing without vector: ${err.message}`);
      }
    }

    const memory = {
      id: uuidv4(),
      content,
      metadata,
      embedding,
      createdAt: new Date().toISOString(),
    };
    this.memories.push(memory);
    this._saveToDisk();
    logger.info(`[MemoryStore] Ingested memory ${memory.id} (embedding: ${embedding ? '384D' : 'none'})`);
    return { success: true, id: memory.id, hasEmbedding: !!embedding };
  }

  async query(queryText, limit = 10) {
    const embedder = getEmbedder();

    // If embeddings are available and memories have vectors, use cosine similarity search
    if (embedder) {
      try {
        const queryVec = await embedder.embedOne(queryText);
        const queryArr = Array.from(queryVec);

        // Score all memories that have embeddings
        const scored = this.memories
          .filter(m => m.embedding)
          .map(m => ({
            ...m,
            score: cosineSimilarity(queryArr, m.embedding),
          }))
          .filter(m => m.score >= PSI) // CSL gate: only return relevant results
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

        if (scored.length > 0) {
          return scored;
        }
        // Fall through to text search if no vector matches
      } catch (err) {
        logger.warn(`[MemoryStore] Vector search failed, falling back to text: ${err.message}`);
      }
    }

    // Fallback: substring text search for memories without embeddings
    const results = this.memories
      .filter(m => m.content.toLowerCase().includes(queryText.toLowerCase()))
      .slice(0, limit)
      .map(m => ({ ...m, score: null }));
    return results;
  }
}

export { MemoryStore };
