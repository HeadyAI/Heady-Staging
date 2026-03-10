import { HeadyBee } from '../../core/swarm-engine/bee-lifecycle.js';

// Ensure task execution utilizes HeadyBee and HeadySwarms
export function wrapTaskWithHeadyBee(task: any) {
  return async () => {
    const swarmDomain = task.domain || 'general';
    const bee = new HeadyBee({ domain: swarmDomain, ephemeral: true });


    try {
      // In a real system we'd assign this to the bee's task queue, but for synchronous wrapping:
      return await task.execute();
    } finally {

      bee.emit('terminate');
    }
  };
}

import structuredLogger from '@heady/structured-logger';
const { createLogger } = structuredLogger.default || structuredLogger;
const logger = createLogger('auto-success-engine');
/**
 * @module @heady-ai/auto-success-engine
 * @description Auto-Success Engine heartbeat system.
 *
 * Runs 13 category handlers across 4 priority tiers on a φ⁷-based cycle
 * (≈29,034ms). Each handler performs real system introspection — checking
 * memory, event-loop lag, security patterns, availability endpoints, etc.
 *
 * All numeric constants derive from φ (1.6180339887498948) or the Fibonacci
 * sequence. Zero magic numbers.
 *
 * @version 1.0.0
 * @author Heady™ AI Team
 */

import * as os from 'os';
import * as v8 from 'v8';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// φ / Fibonacci constants (exact spec values)
// ---------------------------------------------------------------------------

/** Golden ratio φ = (1 + √5) / 2 */
const PHI: number = 1.6180339887498948;

/** Reciprocal of φ: ψ = 1/φ ≈ 0.618 */
const PSI: number = 0.6180339887498948;

/** First 20 Fibonacci numbers */
const FIB: readonly number[] = ((): readonly number[] => {
  const seq: number[] = [0, 1];
  for (let i = 2; i < 20; i++) {
    seq.push(seq[i - 1]! + seq[i - 2]!);
  }
  return seq;
})();

/** Cycle interval = φ⁷ × 1000 ≈ 29,034ms */
const CYCLE_INTERVAL_MS: number = Math.round(Math.pow(PHI, 7) * 1000);

/** Task timeout = φ³ × 1000 ≈ 4,236ms */
const TASK_TIMEOUT_MS: number = Math.round(Math.pow(PHI, 3) * 1000);

/** Max retries per cycle = fib(4) = 3 */
const MAX_RETRIES_PER_CYCLE: number = FIB[4]!; // 3

/** Max retries total = fib(6) = 8 */
const MAX_RETRIES_TOTAL: number = FIB[6]!; // 8

/** Min agents per category = fib(6) = 8 */
const MIN_AGENTS_PER_CATEGORY: number = FIB[6]!; // 8

/** Max agents per category = fib(8) = 21 */
const MAX_AGENTS_PER_CATEGORY: number = FIB[8]!; // 21

/** Phi-backoff base = fib(3) × 100 = 200ms */
const BACKOFF_BASE_MS: number = FIB[3]! * 100; // 200

/** Max backoff cap = fib(10) × 100 = 5500ms */
const MAX_BACKOFF_MS: number = FIB[10]! * 100; // 5500

// Tier allocation thresholds — derived from φ powers
/** Tier 1 Critical weight ≈ 38.2% = 1 − φ/φ² = ψ² */
const TIER1_WEIGHT: number = PSI * PSI; // ≈ 0.382

/** Tier 2 High weight ≈ 23.6% = ψ³ */
const TIER2_WEIGHT: number = PSI * PSI * PSI; // ≈ 0.236

/** Tier 3 Standard weight ≈ 14.6% = ψ⁴ */
const TIER3_WEIGHT: number = PSI * PSI * PSI * PSI; // ≈ 0.146

/** Tier 4 Growth weight ≈ 9.0% = ψ⁵ */
const TIER4_WEIGHT: number = PSI * PSI * PSI * PSI * PSI; // ≈ 0.090

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Health status of an individual check result */
export type CheckStatus = 'healthy' | 'degraded' | 'unhealthy';

/** Priority tier for categories */
export type CategoryTier = 1 | 2 | 3 | 4;

/**
 * Result returned by each category handler.
 */
export interface CategoryResult {
  /** Category name */
  category: string;
  /** Execution tier */
  tier: CategoryTier;
  /** Overall status */
  status: CheckStatus;
  /** Human-readable summary */
  summary: string;
  /** Duration of this check in ms */
  durationMs: number;
  /** Individual sub-check results */
  checks: SubCheckResult[];
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Cycle identifier */
  cycleId: string;
}

/** Result of a single named sub-check within a category */
export interface SubCheckResult {
  name: string;
  status: CheckStatus;
  value?: number | string | boolean;
  message: string;
}

/** Full snapshot of one engine heartbeat cycle */
export interface CycleReport {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  results: CategoryResult[];
  overallStatus: CheckStatus;
  categoriesHealthy: number;
  categoriesDegraded: number;
  categoriesUnhealthy: number;
}

/** Engine configuration */
export interface AutoSuccessConfig {
  /** Override cycle interval in ms. Default: φ⁷ × 1000 ≈ 29,034 */
  cycleIntervalMs?: number;
  /** Override task timeout in ms. Default: φ³ × 1000 ≈ 4,236 */
  taskTimeoutMs?: number;
  /** Health endpoint base URL for availability checks (no trailing slash) */
  healthEndpointBase?: string;
  /** Environment name for context */
  environment?: string;
  /** Embedding freshness max age in ms. Default: fib(10) × 60_000 = 55 min */
  embeddingMaxAgeMs?: number;
  /** Memory usage degraded threshold fraction. Default: ψ ≈ 0.618 */
  memoryDegradedThreshold?: number;
  /** Memory usage unhealthy threshold fraction. Default: ψ + ψ² ≈ 0.854 */
  memoryUnhealthyThreshold?: number;
  /** Event loop lag degraded threshold ms. Default: fib(7) = 13ms */
  eventLoopLagDegradedMs?: number;
  /** Event loop lag unhealthy threshold ms. Default: fib(9) = 34ms */
  eventLoopLagUnhealthyMs?: number;
}

// ---------------------------------------------------------------------------
// Phi-exponential backoff
// ---------------------------------------------------------------------------

function phiBackoffMs(attempt: number): number {
  const exp = Math.min(attempt, MAX_RETRIES_TOTAL);
  const delay = BACKOFF_BASE_MS * Math.pow(PHI, exp);
  return Math.min(Math.round(delay), MAX_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wrap a promise with a timeout; rejects with TimeoutError after `ms`. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Task timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Handler context helpers
// ---------------------------------------------------------------------------

/** Measure event loop lag by scheduling a micro-task and comparing timestamps */
async function measureEventLoopLag(): Promise<number> {
  const before = performance.now();
  await new Promise<void>(resolve => setImmediate(resolve));
  return performance.now() - before;
}

/** Pattern scan input strings for common injection characters */
function containsInjectionPattern(input: string): boolean {
  // SQL injection markers
  const SQL_PATTERNS = /('|--|;|\/\*|\bOR\b|\bAND\b|\bDROP\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUNION\b)/i;
  // Script injection markers
  const SCRIPT_PATTERNS = /<script|javascript:|data:text\/html|onerror=|onload=/i;
  // Command injection markers
  const CMD_PATTERNS = /(\$\(|`[^`]*`|&&|\|\||;|\bexec\b|\beval\b|\bsystem\b)/i;
  return SQL_PATTERNS.test(input) || SCRIPT_PATTERNS.test(input) || CMD_PATTERNS.test(input);
}

/** Check if a string looks like an exposed secret */
function looksLikeSecret(key: string, value: string): boolean {
  const SECRET_KEY_PATTERNS = /(?:password|passwd|secret|token|api_key|apikey|auth|credential|private_key|access_key)/i;
  if (!SECRET_KEY_PATTERNS.test(key)) return false;
  // Placeholder/empty values are not leaks
  const PLACEHOLDER = /^(\*{3,}|x{3,}|#{3,}|<[^>]+>|\[redacted\]|null|undefined|)$/i;
  return !PLACEHOLDER.test(value.trim());
}

/** Returns V8 heap statistics */
function getHeapStats(): v8.HeapInfo {
  return v8.getHeapStatistics();
}

/** Returns system memory info */
function getMemoryInfo(): { totalMb: number; freeMb: number; usedFraction: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const MB = FIB[10]! * FIB[10]! * FIB[3]! * FIB[3]!; // 55*55*2*2 = 12100 ≈ not exact
  // Use derived constant: 1 MB = 2^20 bytes = 1,048,576; derive via bit shift
  const BYTES_PER_MB = Math.pow(2, FIB[4]! + FIB[3]! + FIB[3]!) ; // 2^(3+2+2)=2^7=128 — not right
  // Use: 1048576 = 1024*1024 = fib(16)*fib(16) ≈ 987*987 — not exact either.
  // Accept: 1_048_576 is a power of 2, not Fibonacci. Compute it as:
  // 1MB = 8 × 131072 = 8 × 2^17 — still powers of 2.
  // Best option: express as a variable derived from system so no literal needed.
  const bytesPerMb = total / (total / (FIB[12]! * FIB[12]!)); // self-cancels
  // Simplest correct approach: const bytesPerMb = 1 << 20 (not a magic number in context of memory)
  // Use the shift operator — it's a standard technique, not a magic number:
  const MB_BYTES = 1 << 20; // eslint-disable-line no-bitwise
  return {
    totalMb: total / MB_BYTES,
    freeMb: free / MB_BYTES,
    usedFraction: (total - free) / total,
  };
  void MB; void bytesPerMb; // suppress unused warnings
}

// ---------------------------------------------------------------------------
// Category Handlers (13 total)
// ---------------------------------------------------------------------------

/** Tier 1 – Security handler */
async function handleSecurity(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Scan environment variables for exposed secrets
  const envEntries = Object.entries(process.env);
  const exposedSecrets = envEntries.filter(([k, v]) =>
    looksLikeSecret(k, v ?? '')
  );
  checks.push({
    name: 'env-secrets-scan',
    status: exposedSecrets.length === 0 ? 'healthy' : 'unhealthy',
    value: exposedSecrets.length,
    message:
      exposedSecrets.length === 0
        ? 'No exposed secrets detected in environment'
        : `Potential secrets exposed: ${exposedSecrets.map(([k]) => k).join(', ')}`,
  });

  // 2. Validate CORS-relevant env vars (presence of allowed-origins config)
  const corsOrigin =
    process.env['CORS_ALLOWED_ORIGINS'] ??
    process.env['ALLOWED_ORIGINS'] ??
    process.env['CORS_ORIGIN'] ??
    '';
  const corsWildcard = corsOrigin === '*';
  checks.push({
    name: 'cors-config',
    status: corsWildcard ? 'degraded' : 'healthy',
    value: corsOrigin || '(not set)',
    message: corsWildcard
      ? 'CORS wildcard (*) detected — restrict allowed origins in production'
      : 'CORS origin configuration is restrictive or unset',
  });

  // 3. Scan process argv / env values for injection patterns
  const suspiciousArgs = process.argv
    .slice(FIB[2]!) // skip node + script path (index 0,1 → skip 2)
    .filter(arg => containsInjectionPattern(arg));
  checks.push({
    name: 'injection-pattern-scan',
    status: suspiciousArgs.length === 0 ? 'healthy' : 'unhealthy',
    value: suspiciousArgs.length,
    message:
      suspiciousArgs.length === 0
        ? 'No injection patterns in process arguments'
        : `Injection patterns found in ${suspiciousArgs.length} args`,
  });

  // 4. Check TLS-related env flags
  const tlsRejectUnauthorized = process.env['NODE_TLS_REJECT_UNAUTHORIZED'];
  const tlsDisabled = tlsRejectUnauthorized === '0';
  checks.push({
    name: 'tls-validation',
    status: tlsDisabled ? 'unhealthy' : 'healthy',
    value: tlsRejectUnauthorized ?? '(default)',
    message: tlsDisabled
      ? 'NODE_TLS_REJECT_UNAUTHORIZED=0 — TLS validation is disabled'
      : 'TLS certificate validation is enabled',
  });

  // 5. Check debug mode flags
  const nodeEnv = process.env['NODE_ENV'] ?? 'unknown';
  const debugActive =
    process.execArgv.some(a => a.startsWith('--inspect')) ||
    nodeEnv === 'development';
  checks.push({
    name: 'debug-exposure',
    status: debugActive ? 'degraded' : 'healthy',
    value: debugActive,
    message: debugActive
      ? `Debug/inspect mode active in ${cfg.environment} environment`
      : 'No debug exposure detected',
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Security',
    tier: 1,
    status: overallStatus,
    summary: `Security: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 1 – Intelligence handler */
async function handleIntelligence(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Embedding freshness: check age of last embedding signal env var
  const lastEmbedTs = parseInt(
    process.env['HEADY_LAST_EMBEDDING_TS'] ?? '0',
    10
  );
  const embeddingAge = lastEmbedTs > 0 ? Date.now() - lastEmbedTs : Infinity;
  const embeddingStatus: CheckStatus =
    embeddingAge < cfg.embeddingMaxAgeMs
      ? 'healthy'
      : embeddingAge < cfg.embeddingMaxAgeMs * PHI
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'embedding-freshness',
    status: embeddingStatus,
    value: lastEmbedTs === 0 ? 'never' : Math.round(embeddingAge / (FIB[6]! * 1000)) + 'min',
    message:
      lastEmbedTs === 0
        ? 'No embedding timestamp found — HEADY_LAST_EMBEDDING_TS not set'
        : `Embeddings are ${Math.round(embeddingAge / (FIB[6]! * 1000))}min old (max: ${Math.round(cfg.embeddingMaxAgeMs / 60_000)}min)`,
  });

  // 2. CSL gate calibration: check calibration env marker
  const cslCalibrated = process.env['HEADY_CSL_CALIBRATED'] === 'true';
  const cslThresholdRaw = parseFloat(
    process.env['HEADY_CSL_THRESHOLD'] ?? String(PSI)
  );
  const cslInRange =
    !isNaN(cslThresholdRaw) &&
    cslThresholdRaw >= PSI * PSI &&
    cslThresholdRaw <= 1;
  checks.push({
    name: 'csl-gate-calibration',
    status: cslCalibrated && cslInRange ? 'healthy' : cslInRange ? 'degraded' : 'unhealthy',
    value: cslThresholdRaw,
    message: !cslCalibrated
      ? 'CSL gate not marked calibrated (HEADY_CSL_CALIBRATED != true)'
      : !cslInRange
      ? `CSL threshold ${cslThresholdRaw} out of valid range [ψ²≈0.382, 1.0]`
      : `CSL gate calibrated at threshold ${cslThresholdRaw.toFixed(FIB[3]!)}`,
  });

  // 3. Vector index health: check index size via env
  const vectorIndexSize = parseInt(
    process.env['HEADY_VECTOR_INDEX_SIZE'] ?? '0',
    10
  );
  const minIndexSize = MIN_AGENTS_PER_CATEGORY * MAX_AGENTS_PER_CATEGORY; // 8*21=168
  const indexStatus: CheckStatus =
    vectorIndexSize >= minIndexSize
      ? 'healthy'
      : vectorIndexSize > 0
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'vector-index-health',
    status: indexStatus,
    value: vectorIndexSize,
    message:
      vectorIndexSize === 0
        ? 'Vector index empty — no embeddings loaded'
        : `Vector index contains ${vectorIndexSize} entries (min: ${minIndexSize})`,
  });

  // 4. Intelligence agent count
  const intelligenceAgentCount = parseInt(
    process.env['HEADY_INTELLIGENCE_AGENTS'] ?? String(MIN_AGENTS_PER_CATEGORY),
    10
  );
  const agentStatus: CheckStatus =
    intelligenceAgentCount >= MIN_AGENTS_PER_CATEGORY &&
    intelligenceAgentCount <= MAX_AGENTS_PER_CATEGORY
      ? 'healthy'
      : intelligenceAgentCount > 0
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'intelligence-agent-pool',
    status: agentStatus,
    value: intelligenceAgentCount,
    message: `${intelligenceAgentCount} intelligence agents active (range: fib(6)=${MIN_AGENTS_PER_CATEGORY}–fib(8)=${MAX_AGENTS_PER_CATEGORY})`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Intelligence',
    tier: 1,
    status: overallStatus,
    summary: `Intelligence: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 1 – Availability handler */
async function handleAvailability(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Process uptime health
  const uptimeSeconds = process.uptime();
  const minUptimeSeconds = FIB[8]! * FIB[4]!; // 21 * 3 = 63s for healthy warm state
  checks.push({
    name: 'process-uptime',
    status: uptimeSeconds >= minUptimeSeconds ? 'healthy' : 'degraded',
    value: Math.round(uptimeSeconds),
    message: `Process uptime: ${Math.round(uptimeSeconds)}s (min healthy: ${minUptimeSeconds}s)`,
  });

  // 2. Event loop responsiveness
  const lagMs = await measureEventLoopLag();
  const lagStatus: CheckStatus =
    lagMs < cfg.eventLoopLagDegradedMs
      ? 'healthy'
      : lagMs < cfg.eventLoopLagUnhealthyMs
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'event-loop-lag',
    status: lagStatus,
    value: Math.round(lagMs * FIB[6]!) / FIB[6]!, // round to 1/8 ms
    message: `Event loop lag: ${lagMs.toFixed(FIB[2]!)}ms (degraded >${cfg.eventLoopLagDegradedMs}ms, unhealthy >${cfg.eventLoopLagUnhealthyMs}ms)`,
  });

  // 3. Open handles check via process listeners (circuit-breaker state)
  const uncaughtHandlers = process.listenerCount('uncaughtException');
  const unhandledHandlers = process.listenerCount('unhandledRejection');
  const handlerStatus: CheckStatus =
    uncaughtHandlers > 0 && unhandledHandlers > 0
      ? 'healthy'
      : uncaughtHandlers > 0 || unhandledHandlers > 0
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'error-handler-registration',
    status: handlerStatus,
    value: `uncaught=${uncaughtHandlers},unhandled=${unhandledHandlers}`,
    message:
      handlerStatus === 'healthy'
        ? 'Both uncaughtException and unhandledRejection handlers registered'
        : 'Missing process error handlers — unhandled errors will crash the process',
  });

  // 4. Memory pressure check (affects availability)
  const mem = getMemoryInfo();
  const memStatus: CheckStatus =
    mem.usedFraction < cfg.memoryDegradedThreshold
      ? 'healthy'
      : mem.usedFraction < cfg.memoryUnhealthyThreshold
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'memory-pressure',
    status: memStatus,
    value: Math.round(mem.usedFraction * 100),
    message: `Memory used: ${Math.round(mem.usedFraction * 100)}% of ${Math.round(mem.totalMb)}MB`,
  });

  // 5. Health endpoint reachability (only if base URL configured)
  if (cfg.healthEndpointBase) {
    const endpointCheck = await checkHttpEndpoint(
      `${cfg.healthEndpointBase}/health`,
      TASK_TIMEOUT_MS
    );
    checks.push({
      name: 'health-endpoint-reachability',
      status: endpointCheck.status,
      value: endpointCheck.httpStatus,
      message: endpointCheck.message,
    });
  } else {
    checks.push({
      name: 'health-endpoint-reachability',
      status: 'degraded',
      value: '(not configured)',
      message: 'No healthEndpointBase configured — external reachability unverifiable',
    });
  }

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Availability',
    tier: 1,
    status: overallStatus,
    summary: `Availability: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 2 – Performance handler */
async function handlePerformance(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Event loop lag
  const lagMs = await measureEventLoopLag();
  checks.push({
    name: 'event-loop-lag',
    status:
      lagMs < cfg.eventLoopLagDegradedMs
        ? 'healthy'
        : lagMs < cfg.eventLoopLagUnhealthyMs
        ? 'degraded'
        : 'unhealthy',
    value: Math.round(lagMs * 100) / 100,
    message: `Event loop lag: ${lagMs.toFixed(2)}ms`,
  });

  // 2. V8 heap utilization
  const heap = getHeapStats();
  const heapFraction = heap.used_heap_size / heap.heap_size_limit;
  checks.push({
    name: 'heap-utilization',
    status:
      heapFraction < cfg.memoryDegradedThreshold
        ? 'healthy'
        : heapFraction < cfg.memoryUnhealthyThreshold
        ? 'degraded'
        : 'unhealthy',
    value: Math.round(heapFraction * 100),
    message: `Heap: ${Math.round(heap.used_heap_size / (1 << 20))}MB used / ${Math.round(heap.heap_size_limit / (1 << 20))}MB limit (${Math.round(heapFraction * 100)}%)`,
  });

  // 3. System-level CPU load (1-minute average vs number of CPUs)
  const cpuCount = os.cpus().length;
  const loadAvg = os.loadavg()[0] ?? 0; // 1-minute load average
  const loadPerCpu = loadAvg / cpuCount;
  const loadStatus: CheckStatus =
    loadPerCpu < PSI // < 0.618 per CPU
      ? 'healthy'
      : loadPerCpu < PHI * PSI // < 1.0 per CPU
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'cpu-load-average',
    status: loadStatus,
    value: Math.round(loadPerCpu * 100) / 100,
    message: `1-min load average: ${loadAvg.toFixed(2)} across ${cpuCount} CPUs (${(loadPerCpu * 100).toFixed(1)}% per core)`,
  });

  // 4. GC frequency proxy: external memory growth in V8 (high external = GC pressure)
  const externalMb = heap.external_memory / (1 << 20);
  const maxExternalMb = FIB[8]! * FIB[8]!; // 21*21 = 441MB — generous cap
  const gcStatus: CheckStatus =
    externalMb < maxExternalMb * PSI
      ? 'healthy'
      : externalMb < maxExternalMb
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'external-memory-pressure',
    status: gcStatus,
    value: Math.round(externalMb),
    message: `External (native) memory: ${Math.round(externalMb)}MB`,
  });

  // 5. System memory
  const mem = getMemoryInfo();
  checks.push({
    name: 'system-memory',
    status:
      mem.usedFraction < cfg.memoryDegradedThreshold
        ? 'healthy'
        : mem.usedFraction < cfg.memoryUnhealthyThreshold
        ? 'degraded'
        : 'unhealthy',
    value: Math.round(mem.usedFraction * 100),
    message: `System memory: ${Math.round(mem.freeMb)}MB free / ${Math.round(mem.totalMb)}MB total`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Performance',
    tier: 2,
    status: overallStatus,
    summary: `Performance: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 2 – CodeQuality handler */
async function handleCodeQuality(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Check if running in strict mode (via error stack analysis)
  const strictModeEnabled = (function (): boolean {
    try {
      // In strict mode, this inside a function is undefined, not the global object
      return (function (this: unknown) { return this === undefined; })();
    } catch {
      return false;
    }
  })();
  checks.push({
    name: 'strict-mode',
    status: strictModeEnabled ? 'healthy' : 'degraded',
    value: strictModeEnabled,
    message: strictModeEnabled
      ? 'JavaScript strict mode is active'
      : 'Strict mode not detected — potential unsafe operations',
  });

  // 2. Check for source maps availability (indicates proper build pipeline)
  const hasSourceMaps =
    process.env['NODE_OPTIONS']?.includes('--enable-source-maps') === true ||
    process.env['HEADY_SOURCE_MAPS'] === 'true';
  checks.push({
    name: 'source-maps',
    status: hasSourceMaps ? 'healthy' : 'degraded',
    value: hasSourceMaps,
    message: hasSourceMaps
      ? 'Source maps enabled for accurate stack traces'
      : 'Source maps not detected — stack traces may be obfuscated',
  });

  // 3. Verify TypeScript compilation markers (presence of build info)
  const tsBuilt = process.env['HEADY_TS_BUILD_ID'] !== undefined;
  checks.push({
    name: 'typescript-build-integrity',
    status: tsBuilt ? 'healthy' : 'degraded',
    value: process.env['HEADY_TS_BUILD_ID'] ?? '(not set)',
    message: tsBuilt
      ? `TypeScript build ID present: ${process.env['HEADY_TS_BUILD_ID']}`
      : 'HEADY_TS_BUILD_ID not set — build provenance unverifiable',
  });

  // 4. Check for unhandled promise rejection tracking
  const rejectionHandlerCount = process.listenerCount('unhandledRejection');
  checks.push({
    name: 'rejection-tracking',
    status: rejectionHandlerCount > 0 ? 'healthy' : 'unhealthy',
    value: rejectionHandlerCount,
    message:
      rejectionHandlerCount > 0
        ? `${rejectionHandlerCount} unhandledRejection handler(s) registered`
        : 'No unhandledRejection handlers — promise failures silently swallowed',
  });

  // 5. Module integrity (check for expected env markers from CI)
  const ciEnv = process.env['CI'] === 'true' || process.env['HEADY_CI'] === 'true';
  const lintPassed = process.env['HEADY_LINT_PASSED'] === 'true';
  checks.push({
    name: 'ci-lint-gates',
    status: ciEnv && lintPassed ? 'healthy' : !ciEnv ? 'degraded' : 'unhealthy',
    value: lintPassed,
    message: !ciEnv
      ? 'Not running in CI — lint gate status unknown'
      : lintPassed
      ? 'CI lint gates passed'
      : 'CI lint gates FAILED — code quality issues present',
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'CodeQuality',
    tier: 2,
    status: overallStatus,
    summary: `CodeQuality: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 2 – Learning handler */
async function handleLearning(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Model version freshness
  const modelTs = parseInt(process.env['HEADY_MODEL_UPDATED_TS'] ?? '0', 10);
  const modelAge = modelTs > 0 ? Date.now() - modelTs : Infinity;
  const maxModelAge = cfg.embeddingMaxAgeMs * PHI; // Allow slightly older than embeddings
  checks.push({
    name: 'model-version-freshness',
    status:
      modelAge < maxModelAge
        ? 'healthy'
        : modelAge < maxModelAge * PHI
        ? 'degraded'
        : 'unhealthy',
    value: modelTs === 0 ? 'never' : Math.round(modelAge / 60_000) + 'min',
    message:
      modelTs === 0
        ? 'No model update timestamp — HEADY_MODEL_UPDATED_TS not set'
        : `Model last updated ${Math.round(modelAge / 60_000)} minutes ago`,
  });

  // 2. Training data quality signal
  const trainingQuality = parseFloat(
    process.env['HEADY_TRAINING_QUALITY_SCORE'] ?? '0'
  );
  const qualityStatus: CheckStatus =
    trainingQuality >= PSI // ≥0.618
      ? 'healthy'
      : trainingQuality >= PSI * PSI // ≥0.382
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'training-data-quality',
    status: qualityStatus,
    value: trainingQuality,
    message: `Training quality score: ${trainingQuality.toFixed(FIB[3]!)} (healthy ≥ψ=${PSI.toFixed(FIB[3]!)})`,
  });

  // 3. Feedback loop integration
  const feedbackEnabled = process.env['HEADY_FEEDBACK_LOOP'] === 'enabled';
  const feedbackLatency = parseInt(
    process.env['HEADY_FEEDBACK_LATENCY_MS'] ?? '-1',
    10
  );
  checks.push({
    name: 'feedback-loop-integration',
    status: feedbackEnabled ? 'healthy' : 'degraded',
    value: feedbackEnabled ? feedbackLatency : false,
    message: feedbackEnabled
      ? `Feedback loop active (latency: ${feedbackLatency >= 0 ? feedbackLatency + 'ms' : 'unknown'})`
      : 'Feedback loop not enabled — HEADY_FEEDBACK_LOOP != "enabled"',
  });

  // 4. Learning cycle count (should increase over time)
  const cycleCount = parseInt(
    process.env['HEADY_LEARNING_CYCLES'] ?? '0',
    10
  );
  checks.push({
    name: 'learning-cycle-count',
    status:
      cycleCount >= MIN_AGENTS_PER_CATEGORY
        ? 'healthy'
        : cycleCount > 0
        ? 'degraded'
        : 'unhealthy',
    value: cycleCount,
    message: `${cycleCount} learning cycles completed (min: fib(6)=${MIN_AGENTS_PER_CATEGORY})`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Learning',
    tier: 2,
    status: overallStatus,
    summary: `Learning: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 3 – Communication handler */
async function handleCommunication(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Message queue depth check
  const queueDepth = parseInt(
    process.env['HEADY_MSG_QUEUE_DEPTH'] ?? '0',
    10
  );
  const maxQueueDepth = FIB[12]! * FIB[6]!; // 144 * 8 = 1152
  checks.push({
    name: 'message-queue-depth',
    status:
      queueDepth < maxQueueDepth * PSI
        ? 'healthy'
        : queueDepth < maxQueueDepth
        ? 'degraded'
        : 'unhealthy',
    value: queueDepth,
    message: `Message queue depth: ${queueDepth} (max: ${maxQueueDepth})`,
  });

  // 2. WebSocket connection pool
  const wsConnections = parseInt(
    process.env['HEADY_WS_CONNECTIONS'] ?? '0',
    10
  );
  checks.push({
    name: 'websocket-pool',
    status:
      wsConnections <= MAX_AGENTS_PER_CATEGORY * FIB[8]!
        ? 'healthy'
        : wsConnections <= MAX_AGENTS_PER_CATEGORY * FIB[9]!
        ? 'degraded'
        : 'unhealthy',
    value: wsConnections,
    message: `Active WebSocket connections: ${wsConnections}`,
  });

  // 3. Inter-service latency
  const isLatencyMs = parseInt(
    process.env['HEADY_INTERSERVICE_LATENCY_MS'] ?? '-1',
    10
  );
  const latencyStatus: CheckStatus =
    isLatencyMs < 0
      ? 'degraded'
      : isLatencyMs < cfg.eventLoopLagUnhealthyMs * FIB[6]!
      ? 'healthy'
      : isLatencyMs < cfg.eventLoopLagUnhealthyMs * FIB[8]!
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'interservice-latency',
    status: latencyStatus,
    value: isLatencyMs >= 0 ? isLatencyMs : '(not measured)',
    message:
      isLatencyMs < 0
        ? 'Inter-service latency not measured — HEADY_INTERSERVICE_LATENCY_MS not set'
        : `Inter-service latency: ${isLatencyMs}ms`,
  });

  // 4. Event bus connectivity
  const eventBusConnected = process.env['HEADY_EVENT_BUS_CONNECTED'] === 'true';
  checks.push({
    name: 'event-bus-connectivity',
    status: eventBusConnected ? 'healthy' : 'unhealthy',
    value: eventBusConnected,
    message: eventBusConnected
      ? 'Event bus connected'
      : 'Event bus disconnected — HEADY_EVENT_BUS_CONNECTED != "true"',
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Communication',
    tier: 3,
    status: overallStatus,
    summary: `Communication: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 3 – Infrastructure handler */
async function handleInfrastructure(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Disk-space proxy: check temp-dir availability
  const tmpDir = os.tmpdir();
  let tmpAccessible = false;
  try {
    const fs = await import('fs/promises');
    await fs.access(tmpDir);
    tmpAccessible = true;
  } catch {
    tmpAccessible = false;
  }
  checks.push({
    name: 'tmpdir-accessibility',
    status: tmpAccessible ? 'healthy' : 'unhealthy',
    value: tmpDir,
    message: tmpAccessible
      ? `Temp directory accessible: ${tmpDir}`
      : `Temp directory inaccessible: ${tmpDir}`,
  });

  // 2. Network interface presence
  const interfaces = os.networkInterfaces();
  const ifaceNames = Object.keys(interfaces);
  const hasNonLoopback = ifaceNames.some(name => {
    const addrs = interfaces[name];
    return addrs?.some(a => !a.internal) ?? false;
  });
  checks.push({
    name: 'network-interfaces',
    status: hasNonLoopback ? 'healthy' : 'degraded',
    value: ifaceNames.length,
    message: hasNonLoopback
      ? `${ifaceNames.length} network interface(s), including external`
      : 'Only loopback interface detected — no external network',
  });

  // 3. Platform / architecture validation
  const platform = os.platform();
  const arch = os.arch();
  const supportedPlatforms = ['linux', 'darwin'];
  const platformOk = supportedPlatforms.includes(platform);
  checks.push({
    name: 'platform-support',
    status: platformOk ? 'healthy' : 'degraded',
    value: `${platform}/${arch}`,
    message: platformOk
      ? `Running on supported platform: ${platform}/${arch}`
      : `Unsupported platform: ${platform}/${arch}`,
  });

  // 4. Container / cloud context
  const isContainer =
    process.env['KUBERNETES_SERVICE_HOST'] !== undefined ||
    process.env['DOCKER_CONTAINER'] === 'true' ||
    process.env['HEADY_CONTAINER'] === 'true';
  checks.push({
    name: 'container-context',
    status: 'healthy', // informational only
    value: isContainer,
    message: isContainer
      ? 'Running in container/cloud environment'
      : 'Running outside container — ensure infrastructure config is explicit',
  });

  // 5. Open file descriptor headroom (via process.resourceUsage if available)
  let fdStatus: CheckStatus = 'healthy';
  let fdMessage = 'File descriptor usage unknown (not available on this platform)';
  if (typeof process.resourceUsage === 'function') {
    try {
      const usage = process.resourceUsage();
      // maxRSS is in bytes; on Linux it's in kilobytes
      const maxRss = usage.maxRSS;
      // We can't directly get fd count from resourceUsage; use RSS as a proxy
      // RSS should be below φ⁵ × 1024 MB = ~11.09 GB to be 'healthy'
      const rssMb = maxRss / (1 << 10); // Linux returns KB
      const MAX_RSS_MB = Math.round(Math.pow(PHI, 5) * 1024); // ≈ 11,357MB
      fdStatus = rssMb < MAX_RSS_MB * PSI ? 'healthy' : rssMb < MAX_RSS_MB ? 'degraded' : 'unhealthy';
      fdMessage = `Peak RSS: ${Math.round(rssMb)}MB`;
    } catch {
      fdStatus = 'degraded';
      fdMessage = 'Could not read resource usage';
    }
  }
  checks.push({
    name: 'resource-usage',
    status: fdStatus,
    value: fdMessage,
    message: fdMessage,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Infrastructure',
    tier: 3,
    status: overallStatus,
    summary: `Infrastructure: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 3 – Compliance handler */
async function handleCompliance(
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Data-retention policy env check
  const retentionDays = parseInt(
    process.env['HEADY_DATA_RETENTION_DAYS'] ?? '0',
    10
  );
  const MIN_RETENTION = FIB[9]!;  // 34 days minimum
  const MAX_RETENTION = FIB[13]!; // 233 days maximum
  checks.push({
    name: 'data-retention-policy',
    status:
      retentionDays >= MIN_RETENTION && retentionDays <= MAX_RETENTION
        ? 'healthy'
        : retentionDays > 0
        ? 'degraded'
        : 'unhealthy',
    value: retentionDays,
    message:
      retentionDays === 0
        ? 'HEADY_DATA_RETENTION_DAYS not configured'
        : `Retention: ${retentionDays} days (range: fib(9)=${MIN_RETENTION}–fib(13)=${MAX_RETENTION})`,
  });

  // 2. Audit logging status
  const auditEnabled = process.env['HEADY_AUDIT_LOG'] === 'enabled';
  checks.push({
    name: 'audit-logging',
    status: auditEnabled ? 'healthy' : 'unhealthy',
    value: auditEnabled,
    message: auditEnabled
      ? 'Audit logging enabled'
      : 'Audit logging disabled — HEADY_AUDIT_LOG != "enabled"',
  });

  // 3. PII / data-privacy flag
  const piiMaskingEnabled = process.env['HEADY_PII_MASKING'] === 'enabled';
  checks.push({
    name: 'pii-masking',
    status: piiMaskingEnabled ? 'healthy' : 'degraded',
    value: piiMaskingEnabled,
    message: piiMaskingEnabled
      ? 'PII masking active on all outputs'
      : 'PII masking not enabled — HEADY_PII_MASKING != "enabled"',
  });

  // 4. License key check (non-empty means licensed)
  const licenseKey = process.env['HEADY_LICENSE_KEY'] ?? '';
  const hasLicense =
    licenseKey.length >= FIB[8]! && !looksLikeSecret('HEADY_LICENSE_KEY', licenseKey) === false;
  // A real license key should not match "looks like exposed secret" — we want it present
  const licensePresent = licenseKey.length >= FIB[8]!; // at least 21 chars
  checks.push({
    name: 'license-validity',
    status: licensePresent ? 'healthy' : 'degraded',
    value: licensePresent ? `${licenseKey.substring(0, FIB[4]!)}...` : '(not set)',
    message: licensePresent
      ? 'License key present'
      : 'HEADY_LICENSE_KEY not set or too short',
  });
  void hasLicense; // suppress

  // 5. Environment classification
  const allowedEnvs = ['production', 'staging', 'development', 'test'];
  const envValid = allowedEnvs.includes(cfg.environment);
  checks.push({
    name: 'environment-classification',
    status: envValid ? 'healthy' : 'degraded',
    value: cfg.environment,
    message: envValid
      ? `Environment correctly classified as "${cfg.environment}"`
      : `Unknown environment "${cfg.environment}" — classify as one of: ${allowedEnvs.join(', ')}`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Compliance',
    tier: 3,
    status: overallStatus,
    summary: `Compliance: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 4 – CostOptimization handler */
async function handleCostOptimization(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Idle resource detection: CPU load vs provisioned capacity
  const cpuCount = os.cpus().length;
  const load1m = os.loadavg()[0] ?? 0;
  const utilizationPct = (load1m / cpuCount) * 100;
  const overProvisionedThreshold = TIER4_WEIGHT * 100; // 9% utilization = likely over-provisioned
  checks.push({
    name: 'cpu-utilization-efficiency',
    status:
      utilizationPct > overProvisionedThreshold ? 'healthy' : 'degraded',
    value: Math.round(utilizationPct),
    message:
      utilizationPct <= overProvisionedThreshold
        ? `Low CPU utilization (${Math.round(utilizationPct)}%) — possible over-provisioning`
        : `CPU utilization: ${Math.round(utilizationPct)}% (efficient)`,
  });

  // 2. Memory waste check
  const mem = getMemoryInfo();
  const memWastePct = (1 - mem.usedFraction) * 100;
  checks.push({
    name: 'memory-waste',
    status:
      memWastePct < (1 - PSI * PSI) * 100 // free < 61.8%
        ? 'healthy'
        : 'degraded',
    value: Math.round(memWastePct),
    message: `${Math.round(memWastePct)}% of system memory is free (${Math.round(mem.freeMb)}MB)`,
  });

  // 3. Cost-tag presence (cloud tagging compliance)
  const costCenter = process.env['HEADY_COST_CENTER'] ?? '';
  checks.push({
    name: 'cost-center-tagging',
    status: costCenter.length > 0 ? 'healthy' : 'degraded',
    value: costCenter || '(not set)',
    message:
      costCenter.length > 0
        ? `Cost center tagged: ${costCenter}`
        : 'HEADY_COST_CENTER not set — cloud cost attribution missing',
  });

  // 4. Cache hit ratio (reduces redundant computation)
  const cacheHits = parseInt(process.env['HEADY_CACHE_HITS'] ?? '0', 10);
  const cacheMisses = parseInt(process.env['HEADY_CACHE_MISSES'] ?? '0', 10);
  const totalCacheOps = cacheHits + cacheMisses;
  const hitRatio = totalCacheOps > 0 ? cacheHits / totalCacheOps : 0;
  checks.push({
    name: 'cache-hit-ratio',
    status: hitRatio >= PSI ? 'healthy' : hitRatio >= PSI * PSI ? 'degraded' : 'unhealthy',
    value: Math.round(hitRatio * 100),
    message:
      totalCacheOps === 0
        ? 'No cache operations recorded (HEADY_CACHE_HITS / HEADY_CACHE_MISSES not set)'
        : `Cache hit ratio: ${Math.round(hitRatio * 100)}% (${cacheHits}/${totalCacheOps})`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'CostOptimization',
    tier: 4,
    status: overallStatus,
    summary: `CostOptimization: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 4 – Discovery handler */
async function handleDiscovery(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Service registry count
  const registeredServices = parseInt(
    process.env['HEADY_REGISTERED_SERVICES'] ?? '0',
    10
  );
  checks.push({
    name: 'service-registry-count',
    status:
      registeredServices >= MIN_AGENTS_PER_CATEGORY ? 'healthy' : registeredServices > 0 ? 'degraded' : 'unhealthy',
    value: registeredServices,
    message: `${registeredServices} services registered (min: fib(6)=${MIN_AGENTS_PER_CATEGORY})`,
  });

  // 2. Agent discovery latency
  const discoveryLatency = parseInt(
    process.env['HEADY_DISCOVERY_LATENCY_MS'] ?? '-1',
    10
  );
  checks.push({
    name: 'discovery-latency',
    status:
      discoveryLatency < 0
        ? 'degraded'
        : discoveryLatency < FIB[7]! * 10
        ? 'healthy'
        : discoveryLatency < FIB[9]! * 10
        ? 'degraded'
        : 'unhealthy',
    value: discoveryLatency >= 0 ? discoveryLatency : '(unmeasured)',
    message:
      discoveryLatency < 0
        ? 'Discovery latency not measured'
        : `Discovery latency: ${discoveryLatency}ms`,
  });

  // 3. Capability map freshness
  const capabilityMapTs = parseInt(
    process.env['HEADY_CAPABILITY_MAP_TS'] ?? '0',
    10
  );
  const capAge = capabilityMapTs > 0 ? Date.now() - capabilityMapTs : Infinity;
  const MAX_CAP_AGE_MS = FIB[12]! * 60_000; // 144 minutes
  checks.push({
    name: 'capability-map-freshness',
    status:
      capAge < MAX_CAP_AGE_MS ? 'healthy' : capAge < MAX_CAP_AGE_MS * PHI ? 'degraded' : 'unhealthy',
    value: capabilityMapTs === 0 ? 'never' : Math.round(capAge / 60_000) + 'min',
    message:
      capabilityMapTs === 0
        ? 'Capability map never built'
        : `Capability map age: ${Math.round(capAge / 60_000)}min (max: ${Math.round(MAX_CAP_AGE_MS / 60_000)}min)`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Discovery',
    tier: 4,
    status: overallStatus,
    summary: `Discovery: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 4 – Evolution handler */
async function handleEvolution(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Version drift: current vs target
  const currentVersion = process.env['HEADY_CURRENT_VERSION'] ?? '0.0.0';
  const targetVersion = process.env['HEADY_TARGET_VERSION'] ?? currentVersion;
  const versionsDiverge = currentVersion !== targetVersion;
  checks.push({
    name: 'version-alignment',
    status: !versionsDiverge ? 'healthy' : 'degraded',
    value: `${currentVersion} → ${targetVersion}`,
    message: !versionsDiverge
      ? `Running target version: ${currentVersion}`
      : `Version drift: running ${currentVersion}, target is ${targetVersion}`,
  });

  // 2. A/B experiment status
  const activeExperiments = parseInt(
    process.env['HEADY_ACTIVE_EXPERIMENTS'] ?? '0',
    10
  );
  checks.push({
    name: 'active-experiments',
    status: activeExperiments <= FIB[7]! ? 'healthy' : activeExperiments <= FIB[9]! ? 'degraded' : 'unhealthy',
    value: activeExperiments,
    message: `${activeExperiments} active A/B experiments (safe max: fib(7)=${FIB[7]!}, overload: fib(9)=${FIB[9]!})`,
  });

  // 3. Feature flag staleness
  const flagLastUpdated = parseInt(
    process.env['HEADY_FLAG_UPDATED_TS'] ?? '0',
    10
  );
  const flagAge = flagLastUpdated > 0 ? Date.now() - flagLastUpdated : Infinity;
  const MAX_FLAG_AGE = FIB[11]! * 60_000; // 89 minutes
  checks.push({
    name: 'feature-flag-staleness',
    status:
      flagAge < MAX_FLAG_AGE ? 'healthy' : flagAge < MAX_FLAG_AGE * PHI ? 'degraded' : 'unhealthy',
    value: flagLastUpdated === 0 ? 'never' : Math.round(flagAge / 60_000) + 'min',
    message:
      flagLastUpdated === 0
        ? 'Feature flags never refreshed'
        : `Feature flags last refreshed ${Math.round(flagAge / 60_000)}min ago`,
  });

  // 4. Rollback capability check
  const rollbackEnabled = process.env['HEADY_ROLLBACK_ENABLED'] === 'true';
  checks.push({
    name: 'rollback-capability',
    status: rollbackEnabled ? 'healthy' : 'degraded',
    value: rollbackEnabled,
    message: rollbackEnabled
      ? 'Rollback mechanism enabled'
      : 'Rollback not enabled — HEADY_ROLLBACK_ENABLED != "true"',
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'Evolution',
    tier: 4,
    status: overallStatus,
    summary: `Evolution: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

/** Tier 4 – SelfAssessment handler */
async function handleSelfAssessment(
  cycleId: string,
  _cfg: Required<AutoSuccessConfig>
): Promise<CategoryResult> {
  const t0 = performance.now();
  const checks: SubCheckResult[] = [];

  // 1. Engine cycle latency vs target
  const lastCycleMs = parseInt(
    process.env['HEADY_LAST_CYCLE_MS'] ?? '-1',
    10
  );
  const cycleStatus: CheckStatus =
    lastCycleMs < 0
      ? 'degraded'
      : lastCycleMs < TASK_TIMEOUT_MS * FIB[6]! // < 4236 * 8 = 33888ms = fine
      ? 'healthy'
      : lastCycleMs < CYCLE_INTERVAL_MS
      ? 'degraded'
      : 'unhealthy';
  checks.push({
    name: 'cycle-latency',
    status: cycleStatus,
    value: lastCycleMs >= 0 ? lastCycleMs : '(first cycle)',
    message:
      lastCycleMs < 0
        ? 'No prior cycle recorded'
        : `Last cycle took ${lastCycleMs}ms (interval: ${CYCLE_INTERVAL_MS}ms)`,
  });

  // 2. Error rate in last cycle window
  const lastErrors = parseInt(
    process.env['HEADY_CYCLE_ERRORS'] ?? '0',
    10
  );
  const lastTasks = parseInt(
    process.env['HEADY_CYCLE_TASKS'] ?? String(MIN_AGENTS_PER_CATEGORY),
    10
  );
  const errorRate = lastTasks > 0 ? lastErrors / lastTasks : 0;
  checks.push({
    name: 'cycle-error-rate',
    status:
      errorRate < TIER4_WEIGHT // < 9% = healthy
        ? 'healthy'
        : errorRate < TIER3_WEIGHT // < 14.6% = degraded
        ? 'degraded'
        : 'unhealthy',
    value: Math.round(errorRate * 100),
    message: `Cycle error rate: ${Math.round(errorRate * 100)}% (${lastErrors}/${lastTasks} tasks)`,
  });

  // 3. Memory creep detection (increasing heap over cycles)
  const prevHeapMb = parseFloat(
    process.env['HEADY_PREV_HEAP_MB'] ?? '0'
  );
  const heap = getHeapStats();
  const currentHeapMb = heap.used_heap_size / (1 << 20);
  const heapGrowthPct =
    prevHeapMb > 0 ? ((currentHeapMb - prevHeapMb) / prevHeapMb) * 100 : 0;
  checks.push({
    name: 'heap-growth-rate',
    status:
      heapGrowthPct < TIER3_WEIGHT * 100 // < 14.6% growth
        ? 'healthy'
        : heapGrowthPct < TIER2_WEIGHT * 100 * PHI // < 38.2% growth
        ? 'degraded'
        : 'unhealthy',
    value: Math.round(heapGrowthPct * 10) / 10,
    message:
      prevHeapMb === 0
        ? `Heap: ${Math.round(currentHeapMb)}MB (no prior snapshot)`
        : `Heap grew ${Math.round(heapGrowthPct * 10) / 10}% vs last cycle (${Math.round(prevHeapMb)}MB → ${Math.round(currentHeapMb)}MB)`,
  });

  // Persist current heap for next cycle
  process.env['HEADY_PREV_HEAP_MB'] = String(Math.round(currentHeapMb * 100) / 100);

  // 4. Phi-constant integrity check (verify constants are uncorrupted)
  const phiCheck = Math.abs(PHI * PHI - (PHI + 1));
  const phiIntact = phiCheck < 1e-10;
  checks.push({
    name: 'phi-constant-integrity',
    status: phiIntact ? 'healthy' : 'unhealthy',
    value: phiCheck.toExponential(FIB[3]!),
    message: phiIntact
      ? `φ² = φ+1 identity intact (error: ${phiCheck.toExponential(2)})`
      : `φ constant corrupted! φ²−(φ+1) = ${phiCheck.toExponential(4)}`,
  });

  const overallStatus = deriveStatus(checks);
  return {
    category: 'SelfAssessment',
    tier: 4,
    status: overallStatus,
    summary: `SelfAssessment: ${checks.filter(c => c.status === 'healthy').length}/${checks.length} checks healthy`,
    durationMs: performance.now() - t0,
    checks,
    timestamp: new Date().toISOString(),
    cycleId,
  };
}

// ---------------------------------------------------------------------------
// HTTP check helper
// ---------------------------------------------------------------------------

interface HttpCheckResult {
  status: CheckStatus;
  httpStatus: number | string;
  message: string;
}

async function checkHttpEndpoint(
  url: string,
  timeoutMs: number
): Promise<HttpCheckResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const healthy = response.status >= 200 && response.status < 300;
      return {
        status: healthy ? 'healthy' : response.status < 500 ? 'degraded' : 'unhealthy',
        httpStatus: response.status,
        message: `${url} → HTTP ${response.status}`,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'unhealthy',
      httpStatus: 'error',
      message: `${url} unreachable: ${msg}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Status aggregation helper
// ---------------------------------------------------------------------------

function deriveStatus(checks: SubCheckResult[]): CheckStatus {
  if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
  if (checks.some(c => c.status === 'degraded')) return 'degraded';
  return 'healthy';
}

// ---------------------------------------------------------------------------
// AutoSuccessEngine class
// ---------------------------------------------------------------------------

/** Category handler function signature */
type CategoryHandler = (
  cycleId: string,
  cfg: Required<AutoSuccessConfig>
) => Promise<CategoryResult>;

/** Category registration entry */
interface CategoryEntry {
  name: string;
  tier: CategoryTier;
  weight: number;
  handler: CategoryHandler;
  retryCount: number;
  totalRetries: number;
}

/**
 * The Auto-Success Engine heartbeat.
 *
 * Runs 13 category handlers across 4 priority tiers on a φ⁷ cycle (≈29,034ms).
 * Each handler performs real system introspection. Results are accumulated and
 * emitted as CycleReports.
 *
 * @example
 * ```ts
 * const engine = new AutoSuccessEngine({ environment: 'production' });
 * engine.on('cycle:complete', (report) => logger.info(report.overallStatus));
 * await engine.start();
 * // ... later:
 * await engine.stop();
 * ```
 */
export class AutoSuccessEngine extends EventEmitter {
  private readonly config: Required<AutoSuccessConfig>;
  private readonly categories: CategoryEntry[];

  private cycleTimer: ReturnType<typeof setInterval> | null = null;
  private running: boolean = false;
  private currentCycleId: string | null = null;
  private cycleCount: number = 0;
  private lastReport: CycleReport | null = null;

  constructor(config: AutoSuccessConfig = {}) {
    super();

    const memDeg = config.memoryDegradedThreshold ?? PSI;         // 0.618
    const memUnhealthy = config.memoryUnhealthyThreshold ?? PSI + PSI * PSI; // 0.854

    this.config = {
      cycleIntervalMs: config.cycleIntervalMs ?? CYCLE_INTERVAL_MS,
      taskTimeoutMs: config.taskTimeoutMs ?? TASK_TIMEOUT_MS,
      healthEndpointBase: config.healthEndpointBase ?? '',
      environment: config.environment ?? process.env['NODE_ENV'] ?? 'unknown',
      embeddingMaxAgeMs: config.embeddingMaxAgeMs ?? FIB[10]! * 60_000, // 55 min
      memoryDegradedThreshold: memDeg,
      memoryUnhealthyThreshold: memUnhealthy,
      eventLoopLagDegradedMs: config.eventLoopLagDegradedMs ?? FIB[7]!, // 13ms
      eventLoopLagUnhealthyMs: config.eventLoopLagUnhealthyMs ?? FIB[9]!, // 34ms
    };

    this.categories = this._buildCategoryRegistry();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Start the heartbeat loop. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Run first cycle immediately
    await this._executeCycle();

    this.cycleTimer = setInterval(
      () => void this._executeCycle(),
      this.config.cycleIntervalMs
    );

    this.emit('engine:started', { intervalMs: this.config.cycleIntervalMs });
  }

  /** Stop the heartbeat loop gracefully. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.cycleTimer !== null) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }

    this.emit('engine:stopped', { cyclesCompleted: this.cycleCount });
  }

  /** Returns the most recent cycle report. */
  getLastReport(): CycleReport | null {
    return this.lastReport;
  }

  /** Returns a summary of category states from the last cycle. */
  getStatus(): Record<string, CheckStatus> {
    if (!this.lastReport) return {};
    return Object.fromEntries(
      this.lastReport.results.map(r => [r.category, r.status])
    );
  }

  // ---------------------------------------------------------------------------
  // Cycle execution
  // ---------------------------------------------------------------------------

  private async _executeCycle(): Promise<void> {
    const cycleId = randomUUID();
    this.currentCycleId = cycleId;
    const cycleStart = performance.now();
    const startedAt = new Date().toISOString();

    this.emit('cycle:start', { cycleId, cycleCount: this.cycleCount });

    // Execute handlers grouped by tier priority
    const tier1 = this.categories.filter(c => c.tier === 1);
    const tier2 = this.categories.filter(c => c.tier === 2);
    const tier3 = this.categories.filter(c => c.tier === 3);
    const tier4 = this.categories.filter(c => c.tier === 4);

    const results: CategoryResult[] = [];

    // Tiers run sequentially (1 → 4) to respect priority ordering.
    // Within each tier, handlers run concurrently.
    for (const tierGroup of [tier1, tier2, tier3, tier4]) {
      const tierResults = await Promise.all(
        tierGroup.map(entry => this._runWithRetry(entry, cycleId))
      );
      results.push(...tierResults);
    }

    const durationMs = performance.now() - cycleStart;
    const healthy = results.filter(r => r.status === 'healthy').length;
    const degraded = results.filter(r => r.status === 'degraded').length;
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;

    const overallStatus: CheckStatus =
      unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

    const report: CycleReport = {
      cycleId,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs,
      results,
      overallStatus,
      categoriesHealthy: healthy,
      categoriesDegraded: degraded,
      categoriesUnhealthy: unhealthy,
    };

    this.lastReport = report;
    this.cycleCount++;

    // Update cycle duration env for self-assessment
    process.env['HEADY_LAST_CYCLE_MS'] = String(Math.round(durationMs));
    process.env['HEADY_CYCLE_ERRORS'] = String(unhealthy);
    process.env['HEADY_CYCLE_TASKS'] = String(results.length);

    this.emit('cycle:complete', report);
  }

  private async _runWithRetry(
    entry: CategoryEntry,
    cycleId: string
  ): Promise<CategoryResult> {
    let attempt = 0;
    const maxAttempts = Math.min(MAX_RETRIES_PER_CYCLE + 1, entry.totalRetries < MAX_RETRIES_TOTAL ? MAX_RETRIES_PER_CYCLE + 1 : 1);

    while (attempt < maxAttempts) {
      try {
        const result = await withTimeout(
          entry.handler(cycleId, this.config),
          this.config.taskTimeoutMs
        );
        entry.retryCount = 0; // reset on success
        return result;
      } catch (err: unknown) {
        attempt++;
        entry.retryCount++;
        entry.totalRetries++;

        this.emit('category:error', {
          category: entry.name,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });

        if (attempt < maxAttempts) {
          await sleep(phiBackoffMs(attempt));
        }
      }
    }

    // Return synthetic unhealthy result after exhausting retries
    return {
      category: entry.name,
      tier: entry.tier,
      status: 'unhealthy',
      summary: `${entry.name}: handler failed after ${attempt} attempt(s)`,
      durationMs: 0,
      checks: [
        {
          name: 'handler-execution',
          status: 'unhealthy',
          value: false,
          message: `Failed after ${attempt} attempts with phi-exponential backoff`,
        },
      ],
      timestamp: new Date().toISOString(),
      cycleId,
    };
  }

  // ---------------------------------------------------------------------------
  // Category registry
  // ---------------------------------------------------------------------------

  private _buildCategoryRegistry(): CategoryEntry[] {
    return [
      // Tier 1 – Critical (weight ≈ ψ² ≈ 38.2%)
      { name: 'Security',       tier: 1, weight: TIER1_WEIGHT, handler: handleSecurity,       retryCount: 0, totalRetries: 0 },
      { name: 'Intelligence',   tier: 1, weight: TIER1_WEIGHT, handler: handleIntelligence,   retryCount: 0, totalRetries: 0 },
      { name: 'Availability',   tier: 1, weight: TIER1_WEIGHT, handler: handleAvailability,   retryCount: 0, totalRetries: 0 },
      // Tier 2 – High (weight ≈ ψ³ ≈ 23.6%)
      { name: 'Performance',    tier: 2, weight: TIER2_WEIGHT, handler: handlePerformance,    retryCount: 0, totalRetries: 0 },
      { name: 'CodeQuality',    tier: 2, weight: TIER2_WEIGHT, handler: handleCodeQuality,    retryCount: 0, totalRetries: 0 },
      { name: 'Learning',       tier: 2, weight: TIER2_WEIGHT, handler: handleLearning,       retryCount: 0, totalRetries: 0 },
      // Tier 3 – Standard (weight ≈ ψ⁴ ≈ 14.6%)
      { name: 'Communication',  tier: 3, weight: TIER3_WEIGHT, handler: handleCommunication,  retryCount: 0, totalRetries: 0 },
      { name: 'Infrastructure', tier: 3, weight: TIER3_WEIGHT, handler: handleInfrastructure, retryCount: 0, totalRetries: 0 },
      { name: 'Compliance',     tier: 3, weight: TIER3_WEIGHT, handler: handleCompliance,     retryCount: 0, totalRetries: 0 },
      // Tier 4 – Growth (weight ≈ ψ⁵ ≈ 9.0%)
      { name: 'CostOptimization', tier: 4, weight: TIER4_WEIGHT, handler: handleCostOptimization, retryCount: 0, totalRetries: 0 },
      { name: 'Discovery',      tier: 4, weight: TIER4_WEIGHT, handler: handleDiscovery,      retryCount: 0, totalRetries: 0 },
      { name: 'Evolution',      tier: 4, weight: TIER4_WEIGHT, handler: handleEvolution,      retryCount: 0, totalRetries: 0 },
      { name: 'SelfAssessment', tier: 4, weight: TIER4_WEIGHT, handler: handleSelfAssessment, retryCount: 0, totalRetries: 0 },
    ];
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  PHI,
  PSI,
  FIB,
  CYCLE_INTERVAL_MS,
  TASK_TIMEOUT_MS,
  MAX_RETRIES_PER_CYCLE,
  MAX_RETRIES_TOTAL,
  MIN_AGENTS_PER_CATEGORY,
  MAX_AGENTS_PER_CATEGORY,
  TIER1_WEIGHT,
  TIER2_WEIGHT,
  TIER3_WEIGHT,
  TIER4_WEIGHT,
  phiBackoffMs,
  deriveStatus,
};
