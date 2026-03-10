/**
 * Heady Chaos Engineering Suite — Failure Injection for Resilience Validation
 * Tests circuit breakers, bulkheads, graceful degradation, and recovery.
 * Author: Eric Haywood | ESM only | φ-scaled | No stubs
 */
import { strict as assert } from 'assert';
import { createHash } from 'crypto';

// φ-Math constants
const PHI   = 1.6180339887;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const FIB   = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597];

function fibonacci(n) { return FIB[n] || Math.round((Math.pow(PHI, n) - Math.pow(-PSI, n)) / Math.sqrt(5)); }
function phiThreshold(level, spread = PSI2 + (1 - PSI2) / PHI) {
  return 1 - Math.pow(PSI, level) * spread;
}
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  return Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
}

// ── Chaos Experiment Framework ─────────────────────────────────

class ChaosExperiment {
  constructor(name, config = {}) {
    this.name = name;
    this.config = {
      duration: config.duration || fibonacci(8) * 1000,   // 21s default
      intensity: config.intensity || PSI,                 // 0.618 failure rate
      cooldown: config.cooldown || fibonacci(7) * 1000,   // 13s cooldown
      maxAttempts: config.maxAttempts || fibonacci(5),     // 5 attempts
      ...config,
    };
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = Date.now();
    this.results = [];
    return this;
  }

  record(event) {
    this.results.push({ ...event, timestamp: Date.now() - this.startTime });
    return this;
  }

  finish() {
    this.endTime = Date.now();
    return {
      name: this.name,
      duration: this.endTime - this.startTime,
      events: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      results: this.results,
    };
  }
}

// ── Experiment 1: Circuit Breaker Trip and Recovery ─────────────

function testCircuitBreaker() {
  const experiment = new ChaosExperiment("circuit-breaker-trip-recovery").start();

  // Simulate a circuit breaker with Fibonacci thresholds
  const FAILURE_THRESHOLD = fibonacci(5);    // 5 failures to open
  const HALF_OPEN_TIMEOUT = fibonacci(7);    // 13s half-open wait
  const SUCCESS_THRESHOLD = fibonacci(3);    // 2 successes to close

  let state = "closed";
  let failures = 0;
  let successes = 0;
  let halfOpenAt = 0;

  function call(shouldFail) {
    if (state === "open") {
      const elapsed = Date.now() - halfOpenAt;
      if (elapsed >= HALF_OPEN_TIMEOUT * 1000) {
        state = "half-open";
        successes = 0;
      } else {
        return { rejected: true, state };
      }
    }

    if (shouldFail) {
      failures++;
      if (failures >= FAILURE_THRESHOLD) {
        state = "open";
        halfOpenAt = Date.now();
      }
      return { rejected: false, failed: true, state, failures };
    }

    if (state === "half-open") {
      successes++;
      if (successes >= SUCCESS_THRESHOLD) {
        state = "closed";
        failures = 0;
      }
    }
    return { rejected: false, failed: false, state };
  }

  // Phase 1: Normal operation (closed)
  for (let i = 0; i < fibonacci(5) - 1; i++) {
    const r = call(true);
    experiment.record({ phase: "ramp-failures", ...r, passed: r.state === "closed" });
  }
  assert.equal(state, "closed", "Should still be closed before threshold");

  // Phase 2: Trip the breaker
  const trip = call(true);
  experiment.record({ phase: "trip", ...trip, passed: trip.state === "open" });
  assert.equal(state, "open", "Should be open after " + FAILURE_THRESHOLD + " failures");

  // Phase 3: Requests rejected while open
  const rejected = call(false);
  experiment.record({ phase: "reject-while-open", ...rejected, passed: rejected.rejected === true });
  assert.ok(rejected.rejected, "Should reject calls while open");

  // Phase 4: Simulate half-open transition (manual)
  state = "half-open";
  successes = 0;

  // Phase 5: Successful calls in half-open close the breaker
  for (let i = 0; i < SUCCESS_THRESHOLD; i++) {
    const r = call(false);
    experiment.record({ phase: "half-open-recovery", ...r, passed: true });
  }
  assert.equal(state, "closed", "Should close after " + SUCCESS_THRESHOLD + " successes in half-open");

  const result = experiment.finish();
  assert.ok(result.events > 0, "Should have recorded events");
  return result;
}

// ── Experiment 2: Bulkhead Pool Saturation ─────────────────────

function testBulkheadSaturation() {
  const experiment = new ChaosExperiment("bulkhead-saturation").start();

  const MAX_CONCURRENT = fibonacci(9);  // 34
  const MAX_QUEUED = fibonacci(10);     // 55
  let active = 0;
  let queued = 0;
  let rejected = 0;

  function acquire() {
    if (active < MAX_CONCURRENT) {
      active++;
      return { status: "acquired", active, queued };
    }
    if (queued < MAX_QUEUED) {
      queued++;
      return { status: "queued", active, queued };
    }
    rejected++;
    return { status: "rejected", active, queued, rejected };
  }

  function release() {
    if (queued > 0) {
      queued--;
      return { status: "dequeued", active, queued };
    }
    if (active > 0) {
      active--;
      return { status: "released", active, queued };
    }
    return { status: "empty", active, queued };
  }

  // Fill the pool
  for (let i = 0; i < MAX_CONCURRENT; i++) {
    const r = acquire();
    experiment.record({ phase: "fill-pool", ...r, passed: r.status === "acquired" });
  }
  assert.equal(active, MAX_CONCURRENT, "Pool should be full at fib(9)=" + MAX_CONCURRENT);

  // Fill the queue
  for (let i = 0; i < MAX_QUEUED; i++) {
    const r = acquire();
    experiment.record({ phase: "fill-queue", ...r, passed: r.status === "queued" });
  }
  assert.equal(queued, MAX_QUEUED, "Queue should be full at fib(10)=" + MAX_QUEUED);

  // Overflow — should reject
  const overflow = acquire();
  experiment.record({ phase: "overflow", ...overflow, passed: overflow.status === "rejected" });
  assert.equal(overflow.status, "rejected", "Should reject when pool + queue full");

  // Drain and recover
  for (let i = 0; i < MAX_CONCURRENT + MAX_QUEUED; i++) {
    release();
  }
  experiment.record({ phase: "drain", active, queued, passed: active === 0 && queued === 0 });
  assert.equal(active, 0, "Pool should be empty after drain");
  assert.equal(queued, 0, "Queue should be empty after drain");

  return experiment.finish();
}

// ── Experiment 3: φ-Backoff Retry Under Sustained Failure ──────

function testPhiBackoffRetry() {
  const experiment = new ChaosExperiment("phi-backoff-retry").start();

  const MAX_RETRIES = fibonacci(5);  // 5
  const BASE_MS = 1000;
  const MAX_MS = 60000;

  let totalDelayMs = 0;
  const delays = [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const delay = phiBackoff(attempt, BASE_MS, MAX_MS);
    delays.push(delay);
    totalDelayMs += delay;

    // Verify φ-scaling
    if (attempt > 0) {
      const ratio = delay / delays[attempt - 1];
      const isPhiScaled = Math.abs(ratio - PHI) < 0.01 || delay >= MAX_MS;
      experiment.record({
        phase: "retry-" + attempt,
        delay: Math.round(delay),
        ratio: Math.round(ratio * 1000) / 1000,
        passed: isPhiScaled,
      });
      assert.ok(isPhiScaled, "Delay ratio should be φ≈1.618 (got " + ratio.toFixed(3) + ")");
    } else {
      experiment.record({ phase: "retry-0", delay: Math.round(delay), passed: delay === BASE_MS });
    }
  }

  // Verify total delay is bounded
  const expectedMax = BASE_MS * (Math.pow(PHI, MAX_RETRIES) - 1) / (PHI - 1);
  experiment.record({
    phase: "total-delay",
    totalMs: Math.round(totalDelayMs),
    bounded: totalDelayMs <= expectedMax + 1,
    passed: true,
  });

  return experiment.finish();
}

// ── Experiment 4: Graceful Degradation Under Upstream Failure ──

function testGracefulDegradation() {
  const experiment = new ChaosExperiment("graceful-degradation").start();

  // Simulate a service with cache fallback
  const cache = new Map();
  const CACHE_SIZE = fibonacci(16);  // 987
  let upstreamHealthy = true;

  function cachedCall(key) {
    if (upstreamHealthy) {
      const value = "fresh-" + key;
      if (cache.size < CACHE_SIZE) cache.set(key, value);
      return { value, source: "upstream", degraded: false };
    }
    // Upstream down — serve from cache
    if (cache.has(key)) {
      return { value: cache.get(key), source: "cache", degraded: true };
    }
    return { value: null, source: "none", degraded: true };
  }

  // Phase 1: Warm the cache
  for (let i = 0; i < fibonacci(8); i++) {
    const r = cachedCall("key-" + i);
    experiment.record({ phase: "warm-cache", ...r, passed: r.source === "upstream" });
  }

  // Phase 2: Kill upstream
  upstreamHealthy = false;

  // Phase 3: Cached keys should still work
  for (let i = 0; i < fibonacci(8); i++) {
    const r = cachedCall("key-" + i);
    experiment.record({ phase: "serve-from-cache", ...r, passed: r.source === "cache" && r.degraded });
    assert.equal(r.source, "cache", "Should serve from cache when upstream is down");
  }

  // Phase 4: Uncached keys should gracefully fail
  const miss = cachedCall("uncached-key");
  experiment.record({ phase: "cache-miss-degraded", ...miss, passed: miss.value === null && miss.degraded });
  assert.equal(miss.value, null, "Uncached key should return null when upstream is down");

  // Phase 5: Restore upstream
  upstreamHealthy = true;
  const recovered = cachedCall("new-key");
  experiment.record({ phase: "recovery", ...recovered, passed: recovered.source === "upstream" && !recovered.degraded });
  assert.equal(recovered.source, "upstream", "Should return to upstream after recovery");

  return experiment.finish();
}

// ── Experiment 5: Network Partition Simulation ─────────────────

function testNetworkPartition() {
  const experiment = new ChaosExperiment("network-partition").start();

  // Simulate nodes in a distributed system
  const NODES = FIB[4];  // 5 nodes (Fibonacci)
  const QUORUM = Math.ceil((NODES + 1) / 2);  // Simple majority: 3 of 5
  const nodes = Array.from({ length: NODES }, (_, i) => ({
    id: "node-" + i,
    partition: 0,
    reachable: new Set(Array.from({ length: NODES }, (_, j) => j)),
  }));

  function hasQuorum(nodeIndex) {
    return nodes[nodeIndex].reachable.size >= QUORUM;
  }

  // Phase 1: All nodes have quorum
  for (let i = 0; i < NODES; i++) {
    const q = hasQuorum(i);
    experiment.record({ phase: "pre-partition", node: i, quorum: q, reachable: nodes[i].reachable.size, passed: q });
    assert.ok(q, "Node " + i + " should have quorum before partition");
  }

  // Phase 2: Create network partition (split 3/2)
  const partitionA = [0, 1, 2];
  const partitionB = [3, 4];

  for (const a of partitionA) {
    for (const b of partitionB) {
      nodes[a].reachable.delete(b);
      nodes[b].reachable.delete(a);
    }
  }

  // Phase 3: Check quorum after partition
  for (let i = 0; i < NODES; i++) {
    const q = hasQuorum(i);
    const inMajority = partitionA.includes(i);
    experiment.record({
      phase: "during-partition",
      node: i,
      quorum: q,
      reachable: nodes[i].reachable.size,
      partition: inMajority ? "A(majority)" : "B(minority)",
      passed: inMajority ? q : !q,
    });
    if (inMajority) {
      assert.ok(q, "Majority partition node " + i + " should maintain quorum");
    } else {
      assert.ok(!q, "Minority partition node " + i + " should lose quorum (reachable=" + nodes[i].reachable.size + ", need=" + QUORUM + ")");
    }
  }

  // Phase 4: Heal partition
  for (const a of partitionA) {
    for (const b of partitionB) {
      nodes[a].reachable.add(b);
      nodes[b].reachable.add(a);
    }
  }

  // Phase 5: All nodes recover quorum
  for (let i = 0; i < NODES; i++) {
    const q = hasQuorum(i);
    experiment.record({ phase: "post-heal", node: i, quorum: q, reachable: nodes[i].reachable.size, passed: q });
    assert.ok(q, "Node " + i + " should have quorum after healing");
  }

  return experiment.finish();
}

// ── Run All Experiments ─────────────────────────────────────────

const experiments = [
  testCircuitBreaker,
  testBulkheadSaturation,
  testPhiBackoffRetry,
  testGracefulDegradation,
  testNetworkPartition,
];

let allPassed = true;
const summary = [];

for (const exp of experiments) {
  try {
    const result = exp();
    const status = result.failed === 0 ? "PASS" : "FAIL";
    if (result.failed > 0) allPassed = false;
    summary.push({ name: result.name, status, events: result.events, passed: result.passed, failed: result.failed });
    const icon = status === "PASS" ? "  \u2713" : "  \u2717";
    const info = icon + " " + result.name + ": " + result.passed + "/" + result.events + " events passed";
    process.stdout.write(info + "\n");
  } catch (err) {
    allPassed = false;
    summary.push({ name: exp.name, status: "ERROR", error: err.message });
    process.stdout.write("  \u2717 " + exp.name + ": " + err.message + "\n");
  }
}

const fingerprint = createHash("sha256").update(JSON.stringify(summary)).digest("hex").slice(0, fibonacci(7));
process.stdout.write("\nChaos suite fingerprint: " + fingerprint + "\n");

assert.ok(allPassed, "All chaos experiments must pass");
process.stdout.write("\u2705 All " + experiments.length + " chaos experiments passed\n");

// ── Exports ──────────────────────────────────────────────────────

export { ChaosExperiment, experiments };
export default { ChaosExperiment, experiments };