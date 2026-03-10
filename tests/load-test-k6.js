/**
 * load-test-k6.js — k6 Load Testing Framework for Heady Platform
 *
 * φ-scaled ramp stages, Fibonacci-sized virtual user counts,
 * CSL-gated threshold assertions, and multi-service targeting.
 *
 * Run: k6 run tests/load-test-k6.js
 * 
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

// k6 imports (k6 runtime provides these)
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── φ-Derived Constants ──────────────────────────────────
const PHI = 1.6180339887;
const PSI = 1 / PHI;                    // ≈ 0.618
const PSI2 = PSI * PSI;                 // ≈ 0.382
const PSI3 = PSI * PSI * PSI;           // ≈ 0.236

// φ-threshold levels
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const THRESHOLDS = {
  CRITICAL: phiThreshold(4),             // ≈ 0.927
  HIGH:     phiThreshold(3),             // ≈ 0.882
  MEDIUM:   phiThreshold(2),             // ≈ 0.809
  LOW:      phiThreshold(1),             // ≈ 0.691
};

// Fibonacci VU stages: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
const FIB_VUS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// ── Custom Metrics ───────────────────────────────────────
const errorRate = new Rate('heady_errors');
const latencyP95 = new Trend('heady_latency_p95');
const healthyResponses = new Counter('heady_healthy');

// ── k6 Options ───────────────────────────────────────────
export const options = {
  // φ-scaled ramp stages using Fibonacci VU counts
  stages: [
    { duration: '34s',  target: FIB_VUS[3] },   // Warm-up: 5 VUs
    { duration: '55s',  target: FIB_VUS[5] },   // Ramp: 13 VUs
    { duration: '89s',  target: FIB_VUS[7] },   // Sustain: 34 VUs
    { duration: '55s',  target: FIB_VUS[8] },   // Peak: 55 VUs
    { duration: '34s',  target: FIB_VUS[5] },   // Cool-down: 13 VUs
    { duration: '21s',  target: 0 },             // Drain
  ],
  
  thresholds: {
    // φ-derived pass/fail thresholds
    http_req_duration: [
      `p(95)<${Math.round(1000 * PSI)}`,          // p95 < 618ms
      `p(99)<${Math.round(1000 * PHI)}`,          // p99 < 1618ms
    ],
    http_req_failed: [`rate<${(1 - THRESHOLDS.HIGH).toFixed(3)}`],  // < 11.8% error rate
    heady_errors: [`rate<${(1 - THRESHOLDS.CRITICAL).toFixed(3)}`], // < 7.3% anomaly rate
    http_reqs: ['count>100'],
  },
};

// ── Heady Service Endpoints ──────────────────────────────
const BASE_URL = __ENV.HEADY_BASE_URL || 'http://localhost:3310';
const ENDPOINTS = {
  health:   `${BASE_URL}/health`,
  memory:   `${BASE_URL}/api/memory/search`,
  agents:   `${BASE_URL}/api/agents/status`,
  csl:      `${BASE_URL}/api/csl/gate`,
  auth:     `${BASE_URL}/api/auth/validate`,
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'HeadyK6LoadTest/1.0',
};

// ── Test Scenarios ───────────────────────────────────────
export default function () {
  group('Health Check', () => {
    const res = http.get(ENDPOINTS.health, { headers: HEADERS, timeout: `${Math.round(1000 * PHI)}ms` });
    
    const passed = check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: has status field': (r) => {
        try { return JSON.parse(r.body).status !== undefined; }
        catch { return false; }
      },
      [`health: latency < ${Math.round(1000 * PSI2)}ms`]: (r) => r.timings.duration < 1000 * PSI2,
    });
    
    errorRate.add(!passed);
    latencyP95.add(res.timings.duration);
    if (passed) healthyResponses.add(1);
  });

  group('Memory Search', () => {
    const payload = JSON.stringify({
      query: 'system health status',
      limit: 8,        // fib(6)
      threshold: PSI,  // ≈ 0.618
    });
    
    const res = http.post(ENDPOINTS.memory, payload, { headers: HEADERS, timeout: `${Math.round(1000 * PHI * PHI)}ms` });
    
    const passed = check(res, {
      'memory: status 200 or 401': (r) => r.status === 200 || r.status === 401,
      [`memory: latency < ${Math.round(1000 * PHI)}ms`]: (r) => r.timings.duration < 1000 * PHI,
    });
    
    errorRate.add(!passed);
    latencyP95.add(res.timings.duration);
  });

  group('CSL Gate', () => {
    const payload = JSON.stringify({
      input: [0.5, 0.3, 0.8, 0.1],
      gate: [0.9, 0.1, 0.7, 0.3],
      threshold: THRESHOLDS.MEDIUM,
    });
    
    const res = http.post(ENDPOINTS.csl, payload, { headers: HEADERS, timeout: `${Math.round(1000 * PSI)}ms` });
    
    const passed = check(res, {
      'csl: status 200 or 401': (r) => r.status === 200 || r.status === 401,
      [`csl: latency < ${Math.round(1000 * PSI2)}ms`]: (r) => r.timings.duration < 1000 * PSI2,
    });
    
    errorRate.add(!passed);
  });

  group('Agent Status', () => {
    const res = http.get(ENDPOINTS.agents, { headers: HEADERS, timeout: `${Math.round(1000 * PHI)}ms` });
    
    check(res, {
      'agents: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    
    latencyP95.add(res.timings.duration);
  });

  // φ-scaled think time between iterations
  sleep(PSI + Math.random() * PSI2);  // 0.618 – 1.0s
}

// ── Summary Handler ──────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    phi: PHI,
    stages: options.stages,
    thresholds: options.thresholds,
    metrics: {
      http_reqs: data.metrics?.http_reqs?.values?.count || 0,
      http_req_duration_p95: data.metrics?.http_req_duration?.values?.['p(95)'] || 0,
      http_req_failed: data.metrics?.http_req_failed?.values?.rate || 0,
      heady_errors: data.metrics?.heady_errors?.values?.rate || 0,
      heady_healthy: data.metrics?.heady_healthy?.values?.count || 0,
    },
    passed: Object.entries(data.root_group?.checks || {}).every(([, v]) => v.passes > 0),
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'tests/load-test-results.json': JSON.stringify(summary, null, 2),
  };
}
