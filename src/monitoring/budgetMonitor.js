/**
 * budgetMonitor.js — Real-Time AI Spend Monitor
 * © 2026 HeadySystems Inc. All Rights Reserved.
 *
 * Tracks per-call AI token spend via Upstash Redis INCRBYFLOAT.
 * φ-scaled alert thresholds: WARNING 38.2% · CAUTION 61.8% · CRITICAL 100%
 * At CRITICAL: returns shouldThrottleArena:true to disable Arena Mode (highest cost op).
 *
 * Designed as Cloudflare Worker middleware — wraps every AI provider call.
 *
 * Usage:
 *   import { recordSpend, getSpendSummary, calculateCost } from './src/monitoring/budgetMonitor.js';
 *   const cost = calculateCost('claude-sonnet-4-6', 1200, 450);
 *   await recordSpend(redis, { model: 'claude-sonnet-4-6', inputTokens: 1200, outputTokens: 450, cost });
 *   const summary = await getSpendSummary(redis);
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const PSI_SQ = 0.381966011250105;

// Monthly budget ceiling (USD)
const DEFAULT_MONTHLY_BUDGET_USD = 700;

// φ-scaled alert thresholds
export const AlertLevel = Object.freeze({
  OK:       'OK',
  WARNING:  'WARNING',   // PSI_SQ = 38.2% consumed
  CAUTION:  'CAUTION',   // PSI    = 61.8% consumed
  CRITICAL: 'CRITICAL',  // 100%   consumed
});

export const ALERT_THRESHOLDS = Object.freeze({
  WARNING:  PSI_SQ,   // 0.382
  CAUTION:  PSI,      // 0.618
  CRITICAL: 1.0,
});

// Token pricing (USD per 1M tokens) — March 2026
const PRICING = {
  // Anthropic
  'claude-opus-4-6':            { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':          { input:  3.00, output: 15.00 },
  'claude-haiku-4-5-20251001':  { input:  0.80, output:  4.00 },
  // OpenAI
  'gpt-4o':                     { input:  5.00, output: 15.00 },
  'gpt-4o-mini':                { input:  0.15, output:  0.60 },
  'o1':                         { input: 15.00, output: 60.00 },
  'o3':                         { input: 10.00, output: 40.00 },
  // Google
  'gemini-2.0-flash':           { input:  0.075, output: 0.30 },
  'gemini-2.0-pro':             { input:  1.25,  output: 5.00 },
  // Groq
  'llama-3.3-70b-versatile':    { input:  0.59, output:  0.79 },
  'mixtral-8x7b-32768':         { input:  0.27, output:  0.27 },
  // Embedding
  'nomic-embed-text':           { input:  0.10, output:  0.00 },
  'text-embedding-3-small':     { input:  0.02, output:  0.00 },
};

/** Calculate exact USD cost for a model call. */
export function calculateCost(model, inputTokens, outputTokens = 0) {
  const price = PRICING[model] || { input: 5.00, output: 15.00 }; // conservative default
  return parseFloat(
    ((inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output).toFixed(8)
  );
}

/** Get current calendar month key: "2026-03" */
function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function spendKey(month)    { return `heady:spend:${month}:total`; }
function providerKey(month, provider) { return `heady:spend:${month}:provider:${provider}`; }
function callCountKey(month) { return `heady:spend:${month}:calls`; }
function arenaCountKey(month) { return `heady:spend:${month}:arena_calls`; }

/**
 * Record a single AI call spend.
 * @param {Object} redis   — Upstash Redis client (supports incrbyfloat / incrby)
 * @param {Object} event   — { model, inputTokens, outputTokens, cost, isArena?, provider? }
 */
export async function recordSpend(redis, event) {
  const {
    model, inputTokens = 0, outputTokens = 0,
    cost = calculateCost(model, inputTokens, outputTokens),
    isArena = false,
    provider = inferProvider(model),
  } = event;

  const month = monthKey();

  // Atomic Redis increments — use pipeline if available
  const ops = [
    redis.incrbyfloat(spendKey(month), cost),
    redis.incrby(callCountKey(month), 1),
    redis.incrbyfloat(providerKey(month, provider), cost),
  ];
  if (isArena) ops.push(redis.incrby(arenaCountKey(month), 1));

  try {
    await Promise.all(ops);
  } catch (err) {
    // Non-blocking — spend tracking must never interrupt the inference call
    console.error('[budgetMonitor] Redis write failed:', err.message);
  }

  return { cost, provider, month };
}

/**
 * Get complete spend summary for the current month.
 * @param {Object} redis
 * @param {number} [budgetUsd=700]
 */
export async function getSpendSummary(redis, budgetUsd = DEFAULT_MONTHLY_BUDGET_USD) {
  const month = monthKey();

  // Fetch all keys in parallel
  const [totalRaw, callsRaw, arenaRaw, ...providerRaws] = await Promise.all([
    redis.get(spendKey(month)),
    redis.get(callCountKey(month)),
    redis.get(arenaCountKey(month)),
    ...Object.keys(inferredProviders).map(p => redis.get(providerKey(month, p))),
  ]);

  const totalSpend  = parseFloat(totalRaw  || '0');
  const totalCalls  = parseInt(callsRaw    || '0', 10);
  const arenaCalls  = parseInt(arenaRaw    || '0', 10);
  const pctConsumed = totalSpend / budgetUsd;
  const remaining   = Math.max(0, budgetUsd - totalSpend);

  // Provider breakdown
  const providers = {};
  Object.keys(inferredProviders).forEach((p, i) => {
    providers[p] = parseFloat(providerRaws[i] || '0');
  });

  // Alert level
  let alertLevel = AlertLevel.OK;
  if (pctConsumed >= ALERT_THRESHOLDS.CRITICAL) alertLevel = AlertLevel.CRITICAL;
  else if (pctConsumed >= ALERT_THRESHOLDS.CAUTION)  alertLevel = AlertLevel.CAUTION;
  else if (pctConsumed >= ALERT_THRESHOLDS.WARNING)  alertLevel = AlertLevel.WARNING;

  // Arena throttle: disable at CRITICAL, warn at CAUTION
  const shouldThrottleArena = alertLevel === AlertLevel.CRITICAL;
  const arenaWarning         = alertLevel === AlertLevel.CAUTION;

  // Projected month-end spend (linear extrapolation)
  const dayOfMonth   = new Date().getDate();
  const daysInMonth  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectedSpend = dayOfMonth > 0 ? (totalSpend / dayOfMonth) * daysInMonth : 0;
  const projectedPct   = projectedSpend / budgetUsd;

  return {
    month,
    totalSpend:     parseFloat(totalSpend.toFixed(4)),
    budgetUsd,
    remaining:      parseFloat(remaining.toFixed(4)),
    pctConsumed:    parseFloat((pctConsumed * 100).toFixed(2)),
    alertLevel,
    shouldThrottleArena,
    arenaWarning,
    totalCalls,
    arenaCalls,
    providers,
    projectedMonthEnd: parseFloat(projectedSpend.toFixed(4)),
    projectedPct:       parseFloat((projectedPct * 100).toFixed(2)),
    thresholds: {
      warning:  parseFloat((ALERT_THRESHOLDS.WARNING  * budgetUsd).toFixed(2)),
      caution:  parseFloat((ALERT_THRESHOLDS.CAUTION  * budgetUsd).toFixed(2)),
      critical: parseFloat((ALERT_THRESHOLDS.CRITICAL * budgetUsd).toFixed(2)),
    },
    phi: PHI,
  };
}

/**
 * Middleware wrapper for Cloudflare Workers.
 * Wraps any AI provider call and records spend automatically.
 *
 * Usage:
 *   const result = await withBudgetTracking(redis, { model, inputTokens, outputTokens }, callFn);
 */
export async function withBudgetTracking(redis, meta, callFn, opts = {}) {
  const { budgetUsd = DEFAULT_MONTHLY_BUDGET_USD, onBudgetAlert = null } = opts;

  // Pre-call: check if we should throttle
  const summary = await getSpendSummary(redis, budgetUsd);
  if (summary.shouldThrottleArena && meta.isArena) {
    throw new Error(`BUDGET_CRITICAL: Arena Mode throttled. Spend: $${summary.totalSpend}/${budgetUsd} (${summary.pctConsumed}%)`);
  }

  let result;
  const startMs = Date.now();
  try {
    result = await callFn();
  } finally {
    const latencyMs = Date.now() - startMs;
    const cost = calculateCost(meta.model, meta.inputTokens || 0, meta.outputTokens || 0);
    await recordSpend(redis, { ...meta, cost });

    // Trigger alert callback if threshold crossed
    if (typeof onBudgetAlert === 'function') {
      const postSummary = await getSpendSummary(redis, budgetUsd);
      if (postSummary.alertLevel !== AlertLevel.OK) {
        onBudgetAlert(postSummary).catch(() => {});
      }
    }
  }
  return result;
}

// Provider inference from model name
const inferredProviders = { anthropic: 0, openai: 0, google: 0, groq: 0, other: 0 };
function inferProvider(model = '') {
  if (model.startsWith('claude'))   return 'anthropic';
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('gemini'))   return 'google';
  if (model.includes('llama') || model.includes('mixtral')) return 'groq';
  return 'other';
}

export { PRICING, DEFAULT_MONTHLY_BUDGET_USD };
