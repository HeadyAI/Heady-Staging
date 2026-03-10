'use strict';

const { MemoryStore } = require('./memory-store');

const memoryStore = new MemoryStore();

function setupMemoryRoutes(app) {
  app.get('/api/memory/status', (req, res) => {
    res.json(memoryStore.getStatus());
  });

  app.post('/api/memory/ingest', async (req, res, next) => {
    try {
      const { content, metadata } = req.body;
      if (!content) return res.status(400).json({ error: 'content is required' });
      const result = await memoryStore.ingest(content, metadata);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/memory/query', async (req, res, next) => {
    try {
      const { query, limit } = req.body;
      if (!query) return res.status(400).json({ error: 'query is required' });
      const results = await memoryStore.query(query, limit);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { setupMemoryRoutes };
