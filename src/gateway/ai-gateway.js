'use strict';

const { logger } = require('../utils/logger');
const { rateLimiter } = require('./rate-limiter');
const { authenticateJWT } = require('./auth');

function setupGateway(app) {
  // AI Gateway — routes requests to the best provider
  app.post('/api/ai/route', authenticateJWT, rateLimiter, async (req, res, next) => {
    try {
      const { task, prompt, options = {} } = req.body;
      if (!task || !prompt) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'task and prompt are required' } });
      }
      const providers = require('../../config/providers.json');
      const mapping = providers.routing.taskMapping[task] || providers.routing.fallbackChain;
      const selectedProvider = mapping[0]; // In production: smart routing with fallback

      logger.info(`[AIGateway] Routing "${task}" to ${selectedProvider}`);
      // TODO: Replace with real provider call
      res.json({
        provider: selectedProvider,
        task,
        result: `[STUB] Response from ${selectedProvider} for task "${task}"`,
        metadata: { latency: 0, model: 'stub', tokens: 0 },
      });
    } catch (err) {
      next(err);
    }
  });

  // Provider status
  app.get('/api/ai/providers', (req, res) => {
    const providers = require('../../config/providers.json');
    res.json(providers);
  });
}

module.exports = { setupGateway };
