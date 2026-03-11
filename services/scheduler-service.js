/**
 * Heady Scheduler Service — Port 3315
 * Job scheduling with DAG deps, concurrent queue, φ-backoff retry, DLQ
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash, randomBytes } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, phiBackoff, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate, cslBlend, cosineSimilarity } from '../shared/csl-engine-v2.js';

// ── φ-Derived Constants ──────────────────────────────────────────
const MAX_CONCURRENT_JOBS    = fibonacci(8);                 // 21
const MAX_RETRIES            = fibonacci(5);                 // 5
const DLQ_MAX_SIZE           = fibonacci(14);                // 377
const JOB_TIMEOUT_MS         = fibonacci(14) * 1000;         // 377s
const POLL_INTERVAL_MS       = fibonacci(7) * 1000;          // 13s
const CONCURRENCY_POOLS      = {
  critical: fibonacci(5),   // 5
  high: fibonacci(6),       // 8
  medium: fibonacci(7),     // 13
  low: fibonacci(8),        // 21
};

const JOB_STATES = ['PENDING', 'SCHEDULED', 'RUNNING', 'SUCCESS', 'FAILED', 'DEAD_LETTERED', 'CANCELED'];

// ── In-Memory Stores ─────────────────────────────────────────────
const jobs = new Map();
const deadLetterQueue = [];
const runningJobs = new Set();
const cronSchedules = new Map();
const metrics = { created: 0, completed: 0, failed: 0, dlq: 0, retried: 0 };

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

// ── Cron Parser (simplified) ─────────────────────────────────────
function parseCronExpression(expr) {
  const parts = expr.split(' ');
  if (parts.length < 5) return null;
  return { second: parts[0], minute: parts[1], hour: parts[2], dayOfMonth: parts[3], month: parts[4], dayOfWeek: parts[5] || '*' };
}

function matchesCron(parsed, date) {
  const checks = [
    { field: parsed.minute, value: date.getMinutes() },
    { field: parsed.hour, value: date.getHours() },
    { field: parsed.dayOfMonth, value: date.getDate() },
    { field: parsed.month, value: date.getMonth() + 1 },
    { field: parsed.dayOfWeek, value: date.getDay() },
  ];
  return checks.every(({ field, value }) => {
    if (field === '*') return true;
    const allowed = field.split(',').map(Number);
    return allowed.includes(value);
  });
}

// ── Job Creation ─────────────────────────────────────────────────
function createJob(spec) {
  const id = sha256(randomBytes(16).toString('hex') + Date.now());

  const job = {
    id,
    name: spec.name || 'unnamed',
    type: spec.type || 'one_shot',
    handler: spec.handler || null,
    payload: spec.payload || {},
    state: 'PENDING',
    attempts: 0,
    maxRetries: spec.maxRetries || MAX_RETRIES,
    timeout: spec.timeout || JOB_TIMEOUT_MS,
    dependencies: spec.dependencies || [],
    dependents: [],
    created: Date.now(),
    scheduledAt: spec.scheduledAt || null,
    startedAt: null,
    completedAt: null,
    error: null,
    result: null,
    hash: sha256(JSON.stringify(spec)),
  };

  jobs.set(id, job);

  // Register in dependents
  for (const depId of job.dependencies) {
    const dep = jobs.get(depId);
    if (dep) dep.dependents.push(id);
  }

  metrics.created++;
  return { id, state: job.state };
}

// ── DAG Dependency Resolution ────────────────────────────────────
function canExecute(job) {
  if (job.state !== 'PENDING' && job.state !== 'SCHEDULED') return false;
  if (job.scheduledAt && Date.now() < job.scheduledAt) return false;
  for (const depId of job.dependencies) {
    const dep = jobs.get(depId);
    if (!dep || dep.state !== 'SUCCESS') return false;
  }
  return true;
}

function topologicalSort() {
  const visited = new Set();
  const order = [];
  const visiting = new Set();

  function dfs(jobId) {
    if (visited.has(jobId)) return true;
    if (visiting.has(jobId)) return false; // cycle detected
    visiting.add(jobId);
    const job = jobs.get(jobId);
    if (!job) return true;
    for (const depId of job.dependencies) {
      if (!dfs(depId)) return false;
    }
    visiting.delete(jobId);
    visited.add(jobId);
    order.push(jobId);
    return true;
  }

  for (const [id] of jobs) { dfs(id); }
  return order;
}

// ── Job Execution ────────────────────────────────────────────────
async function executeJob(job) {
  if (runningJobs.size >= MAX_CONCURRENT_JOBS) return { queued: true };

  job.state = 'RUNNING';
  job.startedAt = Date.now();
  job.attempts++;
  runningJobs.add(job.id);

  try {
    // Simulate execution with timeout
    const result = await Promise.race([
      new Promise((resolve) => {
        const output = {
          jobId: job.id,
          name: job.name,
          payload: job.payload,
          executedAt: Date.now(),
          hash: sha256(job.id + Date.now()),
        };
        resolve(output);
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('job_timeout')), job.timeout)
      ),
    ]);

    job.state = 'SUCCESS';
    job.result = result;
    job.completedAt = Date.now();
    metrics.completed++;
    runningJobs.delete(job.id);

    // Trigger dependents
    for (const depId of job.dependents) {
      const dependent = jobs.get(depId);
      if (dependent && canExecute(dependent)) {
        dependent.state = 'SCHEDULED';
      }
    }

    return { state: 'SUCCESS', result };
  } catch (err) {
    runningJobs.delete(job.id);

    if (job.attempts >= job.maxRetries) {
      job.state = 'DEAD_LETTERED';
      job.error = err.message;
      metrics.dlq++;
      if (deadLetterQueue.length >= DLQ_MAX_SIZE) deadLetterQueue.shift();
      deadLetterQueue.push({ ...job });
      return { state: 'DEAD_LETTERED', error: err.message };
    }

    job.state = 'PENDING';
    job.error = err.message;
    const delay = phiBackoff(job.attempts, 1000, fibonacci(14) * 1000);
    job.scheduledAt = Date.now() + delay;
    metrics.retried++;
    return { state: 'RETRY_PENDING', nextAttemptAt: job.scheduledAt, attempt: job.attempts };
  }
}

// ── Cron Scheduling ──────────────────────────────────────────────
function registerCron(name, cronExpr, jobSpec) {
  const parsed = parseCronExpression(cronExpr);
  if (!parsed) return { error: 'invalid_cron_expression' };
  const id = sha256(name + cronExpr);
  cronSchedules.set(id, { id, name, expression: cronExpr, parsed, jobSpec, enabled: true, lastRun: null });
  return { id, name, registered: true };
}

function evaluateCrons() {
  const now = new Date();
  const triggered = [];
  for (const [id, cron] of cronSchedules) {
    if (!cron.enabled) continue;
    if (matchesCron(cron.parsed, now)) {
      if (cron.lastRun && (Date.now() - cron.lastRun) < 60000) continue;
      const job = createJob({ ...cron.jobSpec, name: cron.name + '_' + Date.now() });
      cron.lastRun = Date.now();
      triggered.push({ cronId: id, jobId: job.id });
    }
  }
  return triggered;
}

// ── Process Queue ────────────────────────────────────────────────
async function processQueue() {
  const order = topologicalSort();
  const results = [];

  for (const jobId of order) {
    const job = jobs.get(jobId);
    if (!job || !canExecute(job)) continue;
    if (runningJobs.size >= MAX_CONCURRENT_JOBS) break;

    const result = await executeJob(job);
    results.push({ jobId, ...result });
  }

  const cronTriggered = evaluateCrons();
  return { processed: results.length, results, cronTriggered };
}

// ── HTTP Server ──────────────────────────────────────────────────
function createServer(port = 3315) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      const readBody = () => new Promise((resolve) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (parseErr) { resolve({ _parseError: parseErr.message }); } });
      });

      if (url.pathname === '/scheduler/job' && req.method === 'POST') {
        const body = await readBody();
        respond(201, createJob(body));
      } else if (url.pathname === '/scheduler/process' && req.method === 'POST') {
        respond(200, await processQueue());
      } else if (url.pathname === '/scheduler/cron' && req.method === 'POST') {
        const body = await readBody();
        respond(201, registerCron(body.name, body.expression, body.jobSpec));
      } else if (url.pathname === '/scheduler/status' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        const job = jobs.get(id);
        respond(job ? 200 : 404, job || { error: 'not_found' });
      } else if (url.pathname === '/scheduler/cancel' && req.method === 'POST') {
        const body = await readBody();
        const job = jobs.get(body.id);
        if (job && job.state === 'PENDING') { job.state = 'CANCELED'; respond(200, { canceled: true }); }
        else respond(400, { error: 'cannot_cancel' });
      } else if (url.pathname === '/scheduler/dlq' && req.method === 'GET') {
        respond(200, { count: deadLetterQueue.length, items: deadLetterQueue.slice(-fibonacci(8)) });
      } else if (url.pathname === '/health') {
        respond(200, health());
      } else {
        respond(404, { error: 'not_found' });
      }
    });
    server.listen(port);
    return server;
  });
}

const startTime = Date.now();
function health() {
  return {
    service: 'scheduler-service',
    status: 'healthy',
    port: 3315,
    uptime: Date.now() - startTime,
    totalJobs: jobs.size,
    runningJobs: runningJobs.size,
    dlqDepth: deadLetterQueue.length,
    cronSchedules: cronSchedules.size,
    metrics: { ...metrics },
    phiConstants: { MAX_CONCURRENT_JOBS, MAX_RETRIES, JOB_TIMEOUT_MS },
  };
}

export default { createServer, health, createJob, processQueue, registerCron, topologicalSort };
export { createServer, health, createJob, processQueue, registerCron, topologicalSort };
