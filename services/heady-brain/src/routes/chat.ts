import { Router, type Router as RouterType } from 'express';
import { HeadyLogger, validateRequest } from '@heady-ai/core';
import { z } from 'zod';

export const chatRouter: RouterType = Router();
const logger = new HeadyLogger('heady-brain:chat');

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  model: z.enum(['gpt-4', 'claude-3', 'gemini-pro']).optional(),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional()
});

chatRouter.post('/', async (req, res, next) => {
  try {
    const data = validateRequest(ChatRequestSchema, req.body);

    logger.info('Chat request received', {
      messageLength: data.message.length,
      model: data.model
    });

    // TODO: Implement actual chat logic with LLM
    res.json({
      response: `Echo: ${data.message}`,
      model: data.model || 'gpt-4',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});
