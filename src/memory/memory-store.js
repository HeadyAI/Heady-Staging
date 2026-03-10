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
    };
  }

  async ingest(content, metadata = {}) {
    const memory = {
      id: uuidv4(),
      content,
      metadata,
      embedding: null, // TODO: Generate via EMBEDDINGS_PROVIDER
      createdAt: new Date().toISOString(),
    };
    this.memories.push(memory);
    this._saveToDisk();
    logger.info(`[MemoryStore] Ingested memory ${memory.id}`);
    return { success: true, id: memory.id };
  }

  async query(queryText, limit = 10) {
    // TODO: Replace with actual vector similarity search
    const results = this.memories
      .filter(m => m.content.toLowerCase().includes(queryText.toLowerCase()))
      .slice(0, limit);
    return results;
  }
}

module.exports = { MemoryStore };
