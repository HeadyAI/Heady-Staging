import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// φ-math constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const VECTOR_DIM = 384;

const ANALYTICS_URL = __ENV.ANALYTICS_URL || 'http://localhost:3382';
const VECTOR_ENDPOINT = __ENV.VECTOR_ENDPOINT || `${ANALYTICS_URL}/vectors/search`;

// Custom metrics
const vectorQueryDuration = new Trend('vector_query_duration', true);
const vectorQueryFailures = new Rate('vector_query_failures');
const vectorQueriesCompleted = new Counter('vector_queries_completed');

// Target: 34 concurrent VUs (FIB[9]), query must complete under 210ms
// Ramp: 5 → 21 → 34 (FIB[5] → FIB[8] → FIB[9])
export const options = {
  stages: [
    { duration: '2m',  target: 5 },    // FIB[5]: warm-up
    { duration: '2m',  target: 21 },    // FIB[8]: moderate
    { duration: '3m',  target: 34 },    // FIB[9]: target concurrency
    { duration: '3m',  target: 34 },    // Sustain at target
    { duration: '2m',  target: 55 },    // FIB[10]: stress test
    { duration: '1m',  target: 0 },     // Ramp-down
  ],
  thresholds: {
    // Primary target: p95 under 210ms
    'vector_query_duration': ['p(95)<210', 'p(99)<618'],
    // Less than PSI² ≈ 3.82% failure rate
    'vector_query_failures': ['rate<0.0382'],
    // HTTP-level checks
    'http_req_failed': ['rate<0.05'],
  },
};

/**
 * Generate a random 384-dimension vector with values normalized between -1 and 1.
 * Uses φ-based distribution for realistic embedding patterns.
 */
function generateVector() {
  const vector = new Array(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) {
    // Pseudo-random with φ modular arithmetic for deterministic-ish spread
    const raw = Math.sin(i * PHI + __VU * PSI + __ITER * 0.1) * 2 - 1;
    vector[i] = Math.round(raw * 10000) / 10000; // 4 decimal precision
  }
  return vector;
}

/**
 * Generate query parameters with φ-scaled topK values.
 */
function generateQuery() {
  const topKOptions = [5, 8, 13, 21]; // FIB values
  const topK = topKOptions[Math.floor(Math.random() * topKOptions.length)];
  const namespaces = ['memory', 'inference', 'knowledge', 'embeddings'];
  const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];

  return {
    vector: generateVector(),
    namespace,
    topK,
    threshold: PSI * PSI, // ≈0.382 minimum similarity
    includeMetadata: true,
  };
}

export default function () {
  const query = generateQuery();
  const payload = JSON.stringify(query);

  const res = http.post(VECTOR_ENDPOINT, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      namespace: query.namespace,
      topK: String(query.topK),
    },
    timeout: '8s', // FIB[6] seconds
  });

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) || Array.isArray(body.matches);
      } catch {
        return false;
      }
    },
    'responds under 210ms': (r) => r.timings.duration < 210,
    'responds under 618ms (max)': (r) => r.timings.duration < 618,
  });

  vectorQueryFailures.add(!passed);
  vectorQueryDuration.add(res.timings.duration);
  vectorQueriesCompleted.add(1);

  // φ-scaled pause: PSI ≈ 0.618 seconds between queries
  sleep(PSI);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'vector-query',
    vectorDimensions: VECTOR_DIM,
    targets: {
      p95LatencyMs: 210,
      concurrentVUs: 34,
      maxFailureRate: 0.0382,
    },
    metrics: {
      totalQueries: data.metrics.vector_queries_completed
        ? data.metrics.vector_queries_completed.values.count
        : 0,
      failureRate: data.metrics.vector_query_failures
        ? data.metrics.vector_query_failures.values.rate
        : 0,
      latency: {
        p50: data.metrics.vector_query_duration
          ? data.metrics.vector_query_duration.values['p(50)']
          : 0,
        p95: data.metrics.vector_query_duration
          ? data.metrics.vector_query_duration.values['p(95)']
          : 0,
        p99: data.metrics.vector_query_duration
          ? data.metrics.vector_query_duration.values['p(99)']
          : 0,
        max: data.metrics.vector_query_duration
          ? data.metrics.vector_query_duration.values.max
          : 0,
      },
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'results/vector-query.json': JSON.stringify(summary, null, 2),
  };
}
