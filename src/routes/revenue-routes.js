'use strict';

/**
 * Heady™ Revenue Architecture — Unified Billing API
 *
 * Unified monetization stack covering:
 * - Usage-based: vector storage, pipeline runs, LLM tokens, agent executions
 * - Subscription: HeadyIntel, HeadyGuard, HeadyMesh
 * - Licensing: Sacred Geometry SDK, Agent SDK
 * - Platform fees: Agent Marketplace (20% revenue share)
 *
 * © 2026 HeadySystems Inc. All Rights Reserved.
 */

const { Router } = require('express');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs } = require('../../shared/phi-math');

const router = Router();

// ─── Pricing Constants (Fibonacci-derived) ─────────────────────────────────

const PLANS = Object.freeze({
  developer:  { monthly: 29,   annual: 276,   trialDays: fib(7) },  // 13-day trial
  team:       { monthly: 99,   annual: 936,   trialDays: fib(7) },
  enterprise: { monthly: 499,  annual: 4788,  trialDays: fib(8) },  // 21-day trial
});

const SUBSCRIPTIONS = Object.freeze({
  heady_intel:  { monthly: 500,  annual: 4740,  description: 'HeadyIntel — competitive intelligence' },
  heady_guard:  { monthly: 299,  annual: 2838,  description: 'HeadyGuard — governance & compliance' },
  heady_mesh:   { monthly: 199,  annual: 1890,  description: 'HeadyMesh — observability & auto-healing' },
});

const LICENSES = Object.freeze({
  sacred_geometry_sdk: { annual: 999,   description: 'Sacred Geometry Design System SDK' },
  agent_sdk:           { annual: 1499,  description: 'HeadyAgents SDK — build & deploy agents' },
  enterprise_self:     { annual: 9999,  description: 'Enterprise self-hosted license' },
});

const USAGE_RATES = Object.freeze({
  vector_storage:   { unit: '1M vectors',   rate: 10.00 },
  pipeline_runs:    { unit: 'per run',       rate: 0.05 },
  llm_tokens:       { unit: '1M tokens',    rate: 2.50 },
  agent_executions: { unit: 'per hour',      rate: 0.10 },
  api_calls:        { unit: '1K calls',      rate: 0.01 },
});

const PLATFORM_FEE = PSI * PSI; // 0.382 → we use 20% (0.20) for marketplace
const MARKETPLACE_FEE = 0.20;

// ─── In-memory stores (production: Neon + Stripe) ──────────────────────────

const subscriptions = new Map();
const usageRecords = [];
const invoices = new Map();

// ─── Middleware: Tenant Authentication ──────────────────────────────────────

function requireTenant(req, res, next) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey || !apiKey.startsWith('hc_')) {
    return res.status(401).json({ error: 'Missing or invalid API key', code: 'AUTH_REQUIRED' });
  }
  req.tenantId = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
  next();
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/billing/plans — List all available plans and pricing
 */
router.get('/plans', (_req, res) => {
  res.json({
    plans: PLANS,
    subscriptions: SUBSCRIPTIONS,
    licenses: LICENSES,
    usageRates: USAGE_RATES,
    marketplaceFee: MARKETPLACE_FEE,
    phi: PHI,
    annualDiscount: `${Math.round((1 - PSI) * 100)}%`, // 38.2% (φ-derived)
  });
});

/**
 * POST /api/v1/billing/subscribe — Create a subscription
 */
router.post('/subscribe', requireTenant, (req, res) => {
  const { plan, billing = 'monthly', product } = req.body;

  const lookup = product ? SUBSCRIPTIONS[product] : PLANS[plan];
  if (!lookup) {
    return res.status(400).json({ error: 'Invalid plan or product', available: { plans: Object.keys(PLANS), subscriptions: Object.keys(SUBSCRIPTIONS) } });
  }

  const amount = billing === 'annual' ? lookup.annual : lookup.monthly;
  const subscriptionId = `sub_${crypto.randomBytes(12).toString('hex')}`;
  const subscription = {
    id: subscriptionId,
    tenantId: req.tenantId,
    plan: product || plan,
    billing,
    amount,
    currency: 'usd',
    status: 'active',
    trialEndsAt: lookup.trialDays ? new Date(Date.now() + lookup.trialDays * 86400000).toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  subscriptions.set(subscriptionId, subscription);

  if (global.eventBus) {
    global.eventBus.emit('billing:subscription:created', { subscriptionId, tenantId: req.tenantId, plan: product || plan, amount });
  }

  res.status(201).json(subscription);
});

/**
 * POST /api/v1/billing/usage — Report metered usage
 */
router.post('/usage', requireTenant, (req, res) => {
  const { metric, quantity, metadata = {} } = req.body;

  if (!USAGE_RATES[metric]) {
    return res.status(400).json({ error: 'Invalid metric', available: Object.keys(USAGE_RATES) });
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }

  const record = {
    id: `usage_${crypto.randomBytes(8).toString('hex')}`,
    tenantId: req.tenantId,
    metric,
    quantity,
    rate: USAGE_RATES[metric].rate,
    cost: Math.round(quantity * USAGE_RATES[metric].rate * 100) / 100,
    metadata,
    recordedAt: new Date().toISOString(),
  };

  usageRecords.push(record);

  if (global.eventBus) {
    global.eventBus.emit('billing:usage:reported', { tenantId: req.tenantId, metric, quantity, cost: record.cost });
  }

  res.status(201).json(record);
});

/**
 * GET /api/v1/billing/usage/:tenantId — Get usage summary for billing period
 */
router.get('/usage/:tenantId', requireTenant, (req, res) => {
  const { tenantId } = req.params;
  if (tenantId !== req.tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();
  const tenantUsage = usageRecords.filter(r => r.tenantId === tenantId && r.recordedAt >= periodStart);

  const summary = {};
  for (const r of tenantUsage) {
    if (!summary[r.metric]) summary[r.metric] = { quantity: 0, cost: 0, count: 0 };
    summary[r.metric].quantity += r.quantity;
    summary[r.metric].cost += r.cost;
    summary[r.metric].count++;
  }

  const totalCost = Object.values(summary).reduce((sum, m) => sum + m.cost, 0);

  res.json({
    tenantId,
    periodStart,
    periodEnd: new Date().toISOString(),
    metrics: summary,
    totalCost: Math.round(totalCost * 100) / 100,
    recordCount: tenantUsage.length,
  });
});

/**
 * POST /api/v1/billing/webhook — Stripe webhook handler
 */
router.post('/webhook', (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify HMAC-SHA256 signature
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', webhookSecret).update(payload, 'utf8').digest('hex');

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const sigHash = signature.split(',').find(s => s.startsWith('v1='))?.replace('v1=', '') || '';
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sigHash, 'hex'), Buffer.from(expected, 'hex'))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  const event = req.body;

  switch (event.type) {
    case 'invoice.paid':
      if (global.eventBus) global.eventBus.emit('billing:invoice:paid', { invoiceId: event.data?.object?.id });
      break;
    case 'customer.subscription.deleted':
      if (global.eventBus) global.eventBus.emit('billing:subscription:cancelled', { subscriptionId: event.data?.object?.id });
      break;
    case 'invoice.payment_failed':
      if (global.eventBus) global.eventBus.emit('billing:payment:failed', { invoiceId: event.data?.object?.id });
      break;
  }

  res.json({ received: true });
});

/**
 * GET /api/v1/billing/invoices/:tenantId — Invoice history
 */
router.get('/invoices/:tenantId', requireTenant, (req, res) => {
  const { tenantId } = req.params;
  if (tenantId !== req.tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const tenantInvoices = [...invoices.values()].filter(i => i.tenantId === tenantId);
  res.json({ tenantId, invoices: tenantInvoices, count: tenantInvoices.length });
});

module.exports = router;
