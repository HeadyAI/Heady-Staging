'use strict';

const express = require('express');
const helmet = require('helmet');
const { getAllPlans, getPlan } = require('./plans');
const { createCheckoutSession, getSubscription, cancelSubscription, verifyWebhookSignature, handleWebhookEvent } = require('./stripe');
const { Metering } = require('./metering');

const PORT = parseInt(process.env.PORT, 10) || 3383;
const SERVICE_NAME = 'billing-service';
const startTime = Date.now();

// Structured JSON logger
const log = {
  _write(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: SERVICE_NAME,
      message,
      ...meta,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  info(msg, meta) { this._write('info', msg, meta); },
  warn(msg, meta) { this._write('warn', msg, meta); },
  error(msg, meta) { this._write('error', msg, meta); },
  debug(msg, meta) { this._write('debug', msg, meta); },
};

const metering = new Metering({ log });
const app = express();

app.set('trust proxy', true);
app.use(helmet());

// Stripe webhooks need raw body — must be before express.json()
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({
      code: 'HEADY-BILLING-002',
      message: 'Missing Stripe-Signature header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const event = verifyWebhookSignature(req.body, signature);
    const result = await handleWebhookEvent(event, log);
    res.json({ received: true, handled: result.handled, type: result.type });
  } catch (err) {
    log.error('Webhook verification failed', { error: err.message });
    res.status(400).json({
      code: 'HEADY-BILLING-003',
      message: 'Webhook signature verification failed',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(express.json({ limit: '256kb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency: Date.now() - start,
    });
  });
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    checks: [
      {
        name: 'stripe',
        status: process.env.STRIPE_SECRET_KEY ? 'healthy' : 'degraded',
        latency: 0,
        detail: process.env.STRIPE_SECRET_KEY ? 'configured' : 'STRIPE_SECRET_KEY not set',
      },
    ],
  });
});

// GET /plans — list all plans
app.get('/plans', (req, res) => {
  const plans = getAllPlans().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyPriceCents: p.monthlyPriceCents,
    apiCallsPerDay: p.apiCallsPerDay,
    features: p.features,
  }));
  res.json({ plans });
});

// GET /plans/:planId — get a specific plan
app.get('/plans/:planId', (req, res) => {
  const plan = getPlan(req.params.planId);
  if (!plan) {
    res.status(404).json({
      code: 'HEADY-BILLING-004',
      message: `Plan '${req.params.planId}' not found`,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPriceCents: plan.monthlyPriceCents,
    apiCallsPerDay: plan.apiCallsPerDay,
    features: plan.features,
  });
});

// POST /checkout — create a Stripe Checkout session
app.post('/checkout', async (req, res) => {
  const { planId, userId, email, successUrl, cancelUrl } = req.body;

  if (!planId || !userId || !email) {
    res.status(400).json({
      code: 'HEADY-BILLING-005',
      message: 'planId, userId, and email are required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const session = await createCheckoutSession({ planId, userId, email, successUrl, cancelUrl });
    log.info('Checkout session created', { planId, userId });
    res.json(session);
  } catch (err) {
    log.error('Checkout creation failed', { error: err.message, planId, userId });
    res.status(400).json({
      code: 'HEADY-BILLING-006',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /subscription/:customerId — get active subscription
app.get('/subscription/:customerId', async (req, res) => {
  try {
    const sub = await getSubscription(req.params.customerId);
    if (!sub) {
      res.status(404).json({
        code: 'HEADY-BILLING-007',
        message: 'No active subscription found',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.json(sub);
  } catch (err) {
    log.error('Get subscription failed', { error: err.message });
    res.status(500).json({
      code: 'HEADY-BILLING-008',
      message: 'Failed to retrieve subscription',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /subscription/:subscriptionId/cancel — cancel subscription
app.post('/subscription/:subscriptionId/cancel', async (req, res) => {
  try {
    const result = await cancelSubscription(req.params.subscriptionId);
    log.info('Subscription cancelled', { subscriptionId: req.params.subscriptionId });
    res.json(result);
  } catch (err) {
    log.error('Subscription cancel failed', { error: err.message });
    res.status(500).json({
      code: 'HEADY-BILLING-009',
      message: 'Failed to cancel subscription',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /usage/:userId — get usage stats
app.get('/usage/:userId', (req, res) => {
  const stats = metering.getUserStats(req.params.userId);
  res.json(stats);
});

// POST /usage/:userId/plan — set user plan (internal)
app.post('/usage/:userId/plan', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    res.status(403).json({
      code: 'HEADY-BILLING-010',
      message: 'Invalid API key',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const { planId } = req.body;
  if (!planId || !getPlan(planId)) {
    res.status(400).json({
      code: 'HEADY-BILLING-011',
      message: 'Valid planId is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  metering.setUserPlan(req.params.userId, planId);
  log.info('User plan set', { userId: req.params.userId, planId });
  res.json({ userId: req.params.userId, planId });
});

// Graceful shutdown
let server;

function shutdown(signal) {
  log.info('Shutdown initiated', { signal });
  metering.stop();
  if (server) {
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      log.warn('Forced shutdown');
      process.exit(1);
    }, 13000);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server = app.listen(PORT, () => {
  log.info('Server started', { port: PORT, service: SERVICE_NAME });
});

module.exports = app;
