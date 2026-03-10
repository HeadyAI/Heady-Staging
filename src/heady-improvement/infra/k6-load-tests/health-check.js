import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// φ-math constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI; // ≈0.618

// Custom metrics
const healthCheckFailRate = new Rate('health_check_failures');
const healthCheckDuration = new Trend('health_check_duration', true);

// Services under test
const SERVICES = [
  { name: 'auth-session-server',  url: __ENV.AUTH_URL     || 'http://localhost:3380' },
  { name: 'notification-service', url: __ENV.NOTIF_URL    || 'http://localhost:3381' },
  { name: 'analytics-service',    url: __ENV.ANALYTICS_URL || 'http://localhost:3382' },
  { name: 'billing-service',      url: __ENV.BILLING_URL  || 'http://localhost:3383' },
  { name: 'scheduler-service',    url: __ENV.SCHEDULER_URL || 'http://localhost:3384' },
];

// φ-scaled VU ramp: 5 → 21 → 55 over 13 minutes (FIB[7])
// Stage durations: 3m ramp-up, 5m sustain at 21, 2m ramp to 55, 2m sustain, 1m ramp-down
export const options = {
  stages: [
    { duration: '3m',  target: 5 },   // FIB[5]: warm-up
    { duration: '3m',  target: 21 },   // FIB[8]: ramp to moderate
    { duration: '2m',  target: 21 },   // Sustain FIB[8]
    { duration: '2m',  target: 55 },   // FIB[10]: ramp to high
    { duration: '2m',  target: 55 },   // Sustain FIB[10]
    { duration: '1m',  target: 0 },    // Ramp-down
  ],
  thresholds: {
    // All health checks must respond under 210ms (FIB[8]×10) at p95
    'health_check_duration': ['p(95)<210'],
    // Less than 0.618% (PSI%) failure rate
    'health_check_failures': [`rate<${PSI / 100}`],
    // Overall HTTP failure rate under 1%
    'http_req_failed': ['rate<0.01'],
    // Overall p99 under 618ms (PSI×1000)
    'http_req_duration': ['p(99)<618'],
  },
};

export default function () {
  for (const service of SERVICES) {
    const res = http.get(`${service.url}/health`, {
      tags: { service: service.name },
      timeout: '8s', // FIB[6] seconds
    });

    const passed = check(res, {
      [`${service.name} status is 200`]: (r) => r.status === 200,
      [`${service.name} has status field`]: (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy' || body.status === 'ok';
        } catch {
          return false;
        }
      },
      [`${service.name} responds under 210ms`]: (r) => r.timings.duration < 210,
    });

    healthCheckFailRate.add(!passed);
    healthCheckDuration.add(res.timings.duration);
  }

  // φ-scaled pause between iterations: PSI ≈ 0.618 seconds
  sleep(PSI);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'health-check',
    phiConstants: { PHI, PSI },
    metrics: {
      totalRequests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
      failureRate: data.metrics.health_check_failures
        ? data.metrics.health_check_failures.values.rate
        : 0,
      p50Duration: data.metrics.health_check_duration
        ? data.metrics.health_check_duration.values['p(50)']
        : 0,
      p95Duration: data.metrics.health_check_duration
        ? data.metrics.health_check_duration.values['p(95)']
        : 0,
      p99Duration: data.metrics.health_check_duration
        ? data.metrics.health_check_duration.values['p(99)']
        : 0,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'results/health-check.json': JSON.stringify(summary, null, 2),
  };
}
