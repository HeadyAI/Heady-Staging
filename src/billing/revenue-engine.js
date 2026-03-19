// ═══════════════════════════════════════════════════════════════════════════════
// HEADY™ Revenue Engine — Unified 5-Model Monetization Stack
// φ-scaled pricing, multi-tenant metering, Stripe integration
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';

const { Router } = require('express');
const crypto = require('crypto');

// ─── φ CONSTANTS ────────────────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;

// ─── PRICING TABLE (φ-scaled) ───────────────────────────────────────────────────
const PRICING = {
  // Usage-Based (Stripe Metered)
  usage: {
    vector_storage:    { unit: 'per_1M_vectors',   priceUsd: 5.00,  description: 'Vector storage (pgvector + HNSW)' },
    pipeline_runs:     { unit: 'per_run',          priceUsd: 0.50,  description: 'HCFullPipeline execution' },
    llm_routing:       { unit: 'per_1M_tokens',    priceUsd: 2.00,  description: 'LLM routing via CSL router' },
    agent_executions:  { unit: 'per_invocation',   priceUsd: 0.10,  description: 'Marketplace agent invocation' },
    embedding_ops:     { unit: 'per_1M_embeddings', priceUsd: 1.00, description: 'Embedding generation' },
    api_calls:         { unit: 'per_10K_calls',    priceUsd: 1.00,  description: 'API gateway calls' },
  },

  // Subscription (Monthly/Annual)
  subscription: {
    heady_intel:  { monthly: 500,  annual: 5000,  description: 'HeadyIntel — competitive intelligence reports', perSeat: true },
    heady_guard:  { monthly: 1000, annual: 10000, description: 'HeadyGuard — governance + compliance + kill-switch', perSeat: false },
    heady_mesh:   { monthly: 200,  annual: 2000,  description: 'HeadyMesh — observability + auto-healing dashboard', perAgent: true },
    heady_pilot:  { monthly: 300,  annual: 3000,  description: 'HeadyAutoPilot — autonomous task execution', perSeat: false },
  },

  // Licensing (Annual per team)
  licensing: {
    sacred_geometry_sdk: { annual: 2400,  description: 'Sacred Geometry Design System SDK' },
    agent_sdk:           { annual: 4800,  description: '@heady/agent-sdk — build & sell agents' },
    enterprise_self:     { annual: 24000, description: 'Enterprise self-hosted deployment' },
  },

  // Platform Fees
  platform: {
    marketplace_fee: { rate: 0.20, description: 'Agent Marketplace — 20% revenue share' },
  },

  // Consulting
  consulting: {
    agent_dev:    { hourly: 250,  description: 'Custom agent development' },
    arch_review:  { fixed: 5000,  description: 'Architecture review engagement' },
    integration:  { hourly: 200,  description: 'Integration consulting' },
  },
};

// ─── TIER CONFIG (φ-scaled multipliers) ─────────────────────────────────────────
const TIERS = {
  free:       { multiplier: 0,           limits: { api_calls: 1000, vectors: 10000, pipeline_runs: 5 } },
  developer:  { multiplier: 1,           limits: { api_calls: 50000, vectors: 1000000, pipeline_runs: 100 } },
  starter:    { multiplier: PHI,         limits: { api_calls: 200000, vectors: 5000000, pipeline_runs: 500 } },
  pro:        { multiplier: PHI * PHI,   limits: { api_calls: 1000000, vectors: 25000000, pipeline_runs: 2500 } },
  enterprise: { multiplier: PHI ** 3,    limits: { api_calls: Infinity, vectors: Infinity, pipeline_runs: Infinity } },
};

// ─── IN-MEMORY STORES ───────────────────────────────────────────────────────────
const usageRecords = new Map();       // tenantId → [{product, quantity, timestamp, metadata}]
const subscriptions = new Map();      // tenantId → [{plan, billingCycle, startDate, status}]
const invoiceHistory = new Map();     // tenantId → [{period, lineItems, total, generatedAt}]
const revenueEvents = [];             // global event log (capped at 10000)
const MAX_EVENTS = 10000;

// ─── HELPERS ────────────────────────────────────────────────────────────────────
function emit(event, data) {
  if (global.eventBus && typeof global.eventBus.emit === 'function') {
    global.eventBus.emit(event, data);
  }
  revenueEvents.push({ event, data, timestamp: new Date().toISOString() });
  if (revenueEvents.length > MAX_EVENTS) revenueEvents.shift();
}

function generateId() {
  return `rev_${crypto.randomBytes(12).toString('hex')}`;
}

function validateRequired(obj, fields) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null);
  if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

// ─── CORE FUNCTIONS ─────────────────────────────────────────────────────────────

/**
 * Record a metered usage event for a tenant
 */
function recordUsage(tenantId, product, quantity, metadata = {}) {
  validateRequired({ tenantId, product, quantity }, ['tenantId', 'product', 'quantity']);
  if (!PRICING.usage[product]) throw new Error(`Unknown usage product: ${product}`);
  if (typeof quantity !== 'number' || quantity <= 0) throw new Error('Quantity must be positive number');

  const record = {
    id: generateId(),
    tenantId,
    product,
    quantity,
    unitPrice: PRICING.usage[product].priceUsd,
    totalUsd: quantity * PRICING.usage[product].priceUsd,
    metadata,
    timestamp: new Date().toISOString(),
  };

  if (!usageRecords.has(tenantId)) usageRecords.set(tenantId, []);
  usageRecords.get(tenantId).push(record);

  emit('billing:usage_recorded', { tenantId, product, quantity, totalUsd: record.totalUsd });
  return record;
}

/**
 * Get usage summary for a tenant in a given period
 */
function getUsageSummary(tenantId, period = 'current_month') {
  const records = usageRecords.get(tenantId) || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = period === 'current_month'
    ? records.filter(r => new Date(r.timestamp) >= startOfMonth)
    : records;

  const byProduct = {};
  let totalUsd = 0;

  for (const r of filtered) {
    if (!byProduct[r.product]) {
      byProduct[r.product] = { quantity: 0, totalUsd: 0, unitPrice: r.unitPrice, unit: PRICING.usage[r.product].unit };
    }
    byProduct[r.product].quantity += r.quantity;
    byProduct[r.product].totalUsd += r.totalUsd;
    totalUsd += r.totalUsd;
  }

  return { tenantId, period, products: byProduct, totalUsd, recordCount: filtered.length };
}

/**
 * Create a new subscription for a tenant
 */
function createSubscription(tenantId, plan, billingCycle = 'monthly') {
  validateRequired({ tenantId, plan }, ['tenantId', 'plan']);
  if (!PRICING.subscription[plan]) throw new Error(`Unknown plan: ${plan}`);
  if (!['monthly', 'annual'].includes(billingCycle)) throw new Error('billingCycle must be monthly or annual');

  const pricing = PRICING.subscription[plan];
  const sub = {
    id: generateId(),
    tenantId,
    plan,
    billingCycle,
    priceUsd: billingCycle === 'monthly' ? pricing.monthly : pricing.annual,
    startDate: new Date().toISOString(),
    status: 'active',
    description: pricing.description,
  };

  if (!subscriptions.has(tenantId)) subscriptions.set(tenantId, []);
  subscriptions.get(tenantId).push(sub);

  emit('billing:subscription_created', { tenantId, plan, billingCycle, priceUsd: sub.priceUsd });
  return sub;
}

/**
 * Calculate total invoice for a tenant across all billing models
 */
function calculateInvoice(tenantId, period = 'current_month') {
  const lineItems = [];
  let total = 0;

  // Usage charges
  const usage = getUsageSummary(tenantId, period);
  for (const [product, data] of Object.entries(usage.products)) {
    lineItems.push({
      type: 'usage',
      product,
      description: PRICING.usage[product].description,
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      amount: data.totalUsd,
    });
    total += data.totalUsd;
  }

  // Subscription charges
  const subs = (subscriptions.get(tenantId) || []).filter(s => s.status === 'active');
  for (const sub of subs) {
    lineItems.push({
      type: 'subscription',
      product: sub.plan,
      description: sub.description,
      billingCycle: sub.billingCycle,
      amount: sub.priceUsd,
    });
    total += sub.priceUsd;
  }

  const invoice = {
    id: generateId(),
    tenantId,
    period,
    lineItems,
    subtotal: total,
    discount: 0,
    total,
    currency: 'USD',
    generatedAt: new Date().toISOString(),
  };

  if (!invoiceHistory.has(tenantId)) invoiceHistory.set(tenantId, []);
  invoiceHistory.get(tenantId).push(invoice);

  emit('billing:invoice_generated', { tenantId, total, lineItemCount: lineItems.length });
  return invoice;
}

/**
 * Get revenue metrics across all tenants
 */
function getRevenueMetrics() {
  let totalMRR = 0;
  let totalUsageRevenue = 0;
  let activeSubs = 0;
  let totalTenants = new Set();

  // Subscription MRR
  for (const [tenantId, subs] of subscriptions) {
    totalTenants.add(tenantId);
    for (const sub of subs) {
      if (sub.status !== 'active') continue;
      activeSubs++;
      totalMRR += sub.billingCycle === 'monthly' ? sub.priceUsd : sub.priceUsd / 12;
    }
  }

  // Usage revenue (current month)
  for (const [tenantId, records] of usageRecords) {
    totalTenants.add(tenantId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const r of records) {
      if (new Date(r.timestamp) >= startOfMonth) {
        totalUsageRevenue += r.totalUsd;
      }
    }
  }

  const tenantCount = totalTenants.size || 1;
  const mrr = totalMRR + totalUsageRevenue;

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    activeSubscriptions: activeSubs,
    totalTenants: totalTenants.size,
    arpu: Math.round((mrr / tenantCount) * 100) / 100,
    usageRevenueThisMonth: Math.round(totalUsageRevenue * 100) / 100,
    subscriptionRevenueMonthly: Math.round(totalMRR * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get full pricing table
 */
function getPricingTable() {
  return {
    usage: PRICING.usage,
    subscription: PRICING.subscription,
    licensing: PRICING.licensing,
    platform: PRICING.platform,
    consulting: PRICING.consulting,
    tiers: Object.fromEntries(
      Object.entries(TIERS).map(([name, cfg]) => [name, {
        multiplier: cfg.multiplier,
        limits: cfg.limits,
        phiScale: `φ^${Math.round(Math.log(cfg.multiplier || 1) / Math.log(PHI))}`,
      }])
    ),
  };
}

/**
 * Apply a discount to a tenant
 */
function applyDiscount(tenantId, discountCode) {
  // Max discount is PSI (38.2% — golden ratio complement)
  const discounts = {
    'HEADY_LAUNCH':   { rate: 0.20, description: 'Launch discount — 20% off' },
    'HEADY_ANNUAL':   { rate: PSI * 0.5, description: `Annual commitment — ${(PSI * 50).toFixed(1)}% off` },
    'HEADY_PARTNER':  { rate: PSI * PSI, description: `Partner discount — ${(PSI * PSI * 100).toFixed(1)}% off` },
    'HEADY_PHI':      { rate: PSI, description: `Maximum φ-discount — ${(PSI * 100).toFixed(1)}% off` },
  };

  const discount = discounts[discountCode];
  if (!discount) throw new Error(`Invalid discount code: ${discountCode}`);

  emit('billing:discount_applied', { tenantId, discountCode, rate: discount.rate });
  return { tenantId, ...discount, appliedAt: new Date().toISOString() };
}

/**
 * Calculate marketplace revenue (platform fees)
 */
function getMarketplaceRevenue(period = 'current_month') {
  const records = [];
  for (const [tenantId, recs] of usageRecords) {
    for (const r of recs) {
      if (r.product === 'agent_executions') {
        records.push(r);
      }
    }
  }

  const totalAgentRevenue = records.reduce((sum, r) => sum + r.totalUsd, 0);
  const platformFee = totalAgentRevenue * PRICING.platform.marketplace_fee.rate;

  return {
    period,
    totalAgentRevenue: Math.round(totalAgentRevenue * 100) / 100,
    platformFeeRate: PRICING.platform.marketplace_fee.rate,
    platformFeeUsd: Math.round(platformFee * 100) / 100,
    transactionCount: records.length,
  };
}

// ─── EXPRESS ROUTES ─────────────────────────────────────────────────────────────
function createRouter() {
  const router = Router();

  // Record usage event
  router.post('/api/v1/billing/usage', (req, res) => {
    try {
      const { tenantId, product, quantity, metadata } = req.body;
      const record = recordUsage(tenantId, product, quantity, metadata);
      res.status(201).json({ status: 'recorded', record });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get usage summary
  router.get('/api/v1/billing/usage/:tenantId', (req, res) => {
    try {
      const summary = getUsageSummary(req.params.tenantId, req.query.period);
      res.json(summary);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Create subscription
  router.post('/api/v1/billing/subscribe', (req, res) => {
    try {
      const { tenantId, plan, billingCycle } = req.body;
      const sub = createSubscription(tenantId, plan, billingCycle);
      res.status(201).json({ status: 'subscribed', subscription: sub });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Generate invoice
  router.get('/api/v1/billing/invoice/:tenantId', (req, res) => {
    try {
      const invoice = calculateInvoice(req.params.tenantId, req.query.period);
      res.json(invoice);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Revenue metrics (admin)
  router.get('/api/v1/billing/metrics', (_req, res) => {
    res.json(getRevenueMetrics());
  });

  // Public pricing table
  router.get('/api/v1/billing/pricing', (_req, res) => {
    res.json(getPricingTable());
  });

  // Apply discount
  router.post('/api/v1/billing/discount', (req, res) => {
    try {
      const { tenantId, discountCode } = req.body;
      const result = applyDiscount(tenantId, discountCode);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Marketplace revenue
  router.get('/api/v1/billing/marketplace', (req, res) => {
    res.json(getMarketplaceRevenue(req.query.period));
  });

  return router;
}

// ─── EXPORTS ────────────────────────────────────────────────────────────────────
module.exports = {
  createRouter,
  recordUsage,
  getUsageSummary,
  createSubscription,
  calculateInvoice,
  getRevenueMetrics,
  getPricingTable,
  applyDiscount,
  getMarketplaceRevenue,
  PRICING,
  TIERS,
};
