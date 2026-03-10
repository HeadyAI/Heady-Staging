/**
 * Heady™ Analytics Service — Privacy-First Self-Hosted Analytics
 * Port: 3362 | NO Google Analytics — sovereign data
 * 
 * φ-scaled time buckets: 5min, 8min, 13min, 21min, 34min, 89min
 * Fibonacci batch sizes: fib(8)=21 events per batch
 * Retention: fib(11)=89 days detailed, fib(14)=377 days aggregated
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const express = require('express');
const { PHI, PSI, fib, phiMs, CSL_THRESHOLDS } = require('../../shared/phi-math');

const app = express();
const PORT = process.env.SERVICE_PORT || 3362;

// ─── φ-Constants ──────────────────────────────────────────────────────────────

const BATCH_SIZE           = fib(8);          // 21 events per batch
const RETENTION_DETAILED   = fib(11);         // 89 days
const RETENTION_AGGREGATED = fib(14);         // 377 days
const BUCKET_SIZES_MIN     = [5, 8, 13, 21, 34, 89]; // Fibonacci time buckets (minutes)
const MAX_EVENTS_BUFFER    = fib(13);         // 233 events in memory buffer
const FLUSH_INTERVAL_MS    = fib(8) * 1000;   // 21,000ms flush interval

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, service: 'analytics', msg, ...meta }) + '\n');
}

// ─── Event Store ──────────────────────────────────────────────────────────────

const eventBuffer = [];
const aggregates = new Map();  // bucketKey -> { count, sum, min, max }
const funnels = new Map();     // funnelId -> Map<step, count>

function processEvent(event) {
  eventBuffer.push({ ...event, ingestedAt: Date.now() });
  
  // Update real-time aggregates
  for (const minutes of BUCKET_SIZES_MIN) {
    const bucketKey = `${event.type}:${minutes}m:${Math.floor(Date.now() / (minutes * 60000))}`;
    if (!aggregates.has(bucketKey)) {
      aggregates.set(bucketKey, { count: 0, firstSeen: Date.now() });
    }
    aggregates.get(bucketKey).count++;
  }
  
  // Update funnel if applicable
  if (event.funnelId && event.funnelStep) {
    if (!funnels.has(event.funnelId)) funnels.set(event.funnelId, new Map());
    const funnel = funnels.get(event.funnelId);
    funnel.set(event.funnelStep, (funnel.get(event.funnelStep) || 0) + 1);
  }
}

function flushBuffer() {
  if (eventBuffer.length === 0) return;
  
  // In production: batch insert to pgvector/BigQuery
  const batch = eventBuffer.splice(0, BATCH_SIZE);
  log('info', 'Buffer flushed', { batchSize: batch.length, remaining: eventBuffer.length });
  
  // Trim old aggregates (keep last fib(11)=89 days worth)
  const cutoff = Date.now() - (RETENTION_DETAILED * 86400000);
  for (const [key, agg] of aggregates) {
    if (agg.firstSeen < cutoff) aggregates.delete(key);
  }
}

setInterval(flushBuffer, FLUSH_INTERVAL_MS);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'analytics',
    version: '5.1.0',
    bufferSize: eventBuffer.length,
    aggregateBuckets: aggregates.size,
    funnels: funnels.size,
    retention: { detailed: RETENTION_DETAILED, aggregated: RETENTION_AGGREGATED },
    ts: new Date().toISOString(),
  });
});

// Ingest events
app.post('/events', (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  
  if (eventBuffer.length + events.length > MAX_EVENTS_BUFFER) {
    flushBuffer(); // Force flush if buffer is full
  }
  
  for (const event of events) {
    if (!event.type) continue;
    processEvent({
      type: event.type,
      userId: event.userId || 'anonymous',
      sessionId: event.sessionId,
      properties: event.properties || {},
      funnelId: event.funnelId,
      funnelStep: event.funnelStep,
      ts: event.ts || new Date().toISOString(),
      domain: event.domain || 'unknown',
    });
  }
  
  res.json({ ok: true, ingested: events.length, bufferSize: eventBuffer.length });
});

// Query aggregates
app.get('/aggregates', (req, res) => {
  const { type, bucket = '13' } = req.query;
  const bucketMin = parseInt(bucket);
  const results = [];
  
  for (const [key, agg] of aggregates) {
    if (type && !key.startsWith(type + ':')) continue;
    if (!key.includes(`:${bucketMin}m:`)) continue;
    results.push({ key, ...agg });
  }
  
  res.json({ aggregates: results, total: results.length, bucket: `${bucketMin}m` });
});

// Query funnels
app.get('/funnels/:funnelId', (req, res) => {
  const funnel = funnels.get(req.params.funnelId);
  if (!funnel) return res.status(404).json({ error: 'HEADY-ANALYTICS-001', message: 'Funnel not found' });
  
  const steps = [];
  for (const [step, count] of funnel) {
    steps.push({ step, count });
  }
  steps.sort((a, b) => a.step - b.step);
  
  // Calculate conversion rates between steps
  for (let i = 1; i < steps.length; i++) {
    steps[i].conversionRate = steps[i - 1].count > 0
      ? (steps[i].count / steps[i - 1].count).toFixed(3)
      : '0.000';
  }
  
  res.json({ funnelId: req.params.funnelId, steps, totalSteps: steps.length });
});

// Dashboard API for Grafana
app.get('/dashboard/overview', (req, res) => {
  let totalEvents = 0;
  for (const [, agg] of aggregates) totalEvents += agg.count;
  
  res.json({
    totalEventsBuffered: eventBuffer.length,
    totalAggregated: totalEvents,
    activeFunnels: funnels.size,
    bucketSizes: BUCKET_SIZES_MIN,
    retention: { detailed: RETENTION_DETAILED, aggregated: RETENTION_AGGREGATED },
  });
});

app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send([
    `heady_analytics_buffer_size ${eventBuffer.length}`,
    `heady_analytics_aggregates ${aggregates.size}`,
    `heady_analytics_funnels ${funnels.size}`,
  ].join('\n'));
});

app.listen(PORT, () => {
  log('info', 'Analytics service started', { port: PORT, batchSize: BATCH_SIZE, retention: RETENTION_DETAILED });
});

process.on('SIGTERM', () => {
  flushBuffer();
  log('info', 'Analytics shutting down');
  process.exit(0);
});
