import { Router, type Router as RouterType } from 'express';

export const healthRouter: RouterType = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    service: 'heady-brain',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
