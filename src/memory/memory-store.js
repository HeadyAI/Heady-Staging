'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

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
    return {
      memories: this.memories.length,
      storePath: this.storePath,
      maxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES) || 100000,
      hasEmbeddings: this.memories.some(m => m.embedding !== null),
    };
  }

  async ingest(content, metadata = {}) {
    const memory = {
      id: uuidv4(),
      content,
      metadata,
      embedding: this._computeTermVector(content),
      createdAt: new Date().toISOString(),
    };
    this.memories.push(memory);
    this._saveToDisk();
    logger.info(`[MemoryStore] Ingested memory ${memory.id}`);
    return { success: true, id: memory.id };
  }

  async query(queryText, limit = 10) {
    if (this.memories.length === 0) return [];

    const queryVec = this._computeTermVector(queryText);

    // Score each memory by cosine similarity of term vectors
    const scored = this.memories.map(m => {
      const sim = m.embedding
        ? this._cosineSimilarity(queryVec, m.embedding)
        : this._fallbackScore(queryText, m.content);
      return { ...m, score: sim };
    });

    // Sort by score descending, return top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).filter(m => m.score > 0);
  }

  // Term-frequency vector: bag-of-words with basic normalization
  _computeTermVector(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const tf = {};
    for (const w of words) {
      tf[w] = (tf[w] || 0) + 1;
    }
    // Normalize by document length
    const len = words.length || 1;
    for (const w in tf) tf[w] /= len;
    return tf;
  }

  // Cosine similarity between two term-frequency vectors
  _cosineSimilarity(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
      const va = a[k] || 0;
      const vb = b[k] || 0;
      dot += va * vb;
      magA += va * va;
      magB += vb * vb;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  // Fallback for memories without embeddings (legacy data)
  _fallbackScore(query, content) {
    const q = query.toLowerCase();
    const c = content.toLowerCase();
    if (c.includes(q)) return 0.8;
    const words = q.split(/\s+/);
    const matched = words.filter(w => c.includes(w)).length;
    return matched / (words.length || 1) * 0.6;
  }
}

module.exports = { MemoryStore };
