import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// φ-math constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3380';

// Custom metrics
const sessionCreateDuration = new Trend('session_create_duration', true);
const sessionValidateDuration = new Trend('session_validate_duration', true);
const sessionRefreshDuration = new Trend('session_refresh_duration', true);
const sessionRevokeDuration = new Trend('session_revoke_duration', true);
const authFailures = new Rate('auth_flow_failures');
const completedFlows = new Counter('completed_auth_flows');

// φ-scaled VU ramp: 3 → 13 → 34 (FIB[4] → FIB[7] → FIB[9])
export const options = {
  stages: [
    { duration: '2m',  target: 3 },    // FIB[4]: warm-up
    { duration: '3m',  target: 13 },    // FIB[7]: moderate load
    { duration: '3m',  target: 13 },    // Sustain
    { duration: '2m',  target: 34 },    // FIB[9]: peak load
    { duration: '2m',  target: 34 },    // Sustain peak
    { duration: '1m',  target: 0 },     // Ramp-down
  ],
  thresholds: {
    // Session creation under 618ms (PSI×1000) at p95
    'session_create_duration': ['p(95)<618'],
    // Session validation under 210ms (FIB[8]×10) at p95
    'session_validate_duration': ['p(95)<210'],
    // Less than 1.618% (PHI%) failure rate
    'auth_flow_failures': [`rate<${PHI / 100}`],
    // Overall HTTP error rate
    'http_req_failed': ['rate<0.05'],
  },
};

// Simulated Firebase ID token (in real load test, use a token generator)
function generateMockToken(vuId) {
  return `mock-firebase-token-vu${vuId}-${Date.now()}`;
}

export default function () {
  const vuId = __VU;
  let sessionCookie = null;

  // --- Step 1: Create session ---
  group('create_session', () => {
    const payload = JSON.stringify({
      idToken: generateMockToken(vuId),
    });

    const res = http.post(`${AUTH_URL}/session`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { step: 'create' },
      timeout: '8s',
    });

    const passed = check(res, {
      'session created (200 or 201)': (r) => r.status === 200 || r.status === 201,
      'response has session data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.userId || body.sessionId || body.token;
        } catch {
          return false;
        }
      },
    });

    authFailures.add(!passed);
    sessionCreateDuration.add(res.timings.duration);

    // Extract session cookie if present
    const cookies = res.cookies;
    if (cookies && cookies['__Host-heady_session']) {
      sessionCookie = cookies['__Host-heady_session'][0].value;
    }
  });

  sleep(PSI); // ≈0.618s between steps

  // --- Step 2: Validate session (GET /session/me) ---
  group('validate_session', () => {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionCookie) {
      headers['Cookie'] = `__Host-heady_session=${sessionCookie}`;
    }

    const res = http.get(`${AUTH_URL}/session/me`, {
      headers,
      tags: { step: 'validate' },
      timeout: '8s',
    });

    const passed = check(res, {
      'session valid (200)': (r) => r.status === 200,
      'response has user info': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.userId || body.email || body.user;
        } catch {
          return false;
        }
      },
    });

    authFailures.add(!passed);
    sessionValidateDuration.add(res.timings.duration);
  });

  sleep(PSI);

  // --- Step 3: Refresh session ---
  group('refresh_session', () => {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionCookie) {
      headers['Cookie'] = `__Host-heady_session=${sessionCookie}`;
    }

    const res = http.post(`${AUTH_URL}/session/refresh`, null, {
      headers,
      tags: { step: 'refresh' },
      timeout: '8s',
    });

    const passed = check(res, {
      'session refreshed (200)': (r) => r.status === 200,
    });

    authFailures.add(!passed);
    sessionRefreshDuration.add(res.timings.duration);

    // Update cookie if refreshed
    const cookies = res.cookies;
    if (cookies && cookies['__Host-heady_session']) {
      sessionCookie = cookies['__Host-heady_session'][0].value;
    }
  });

  sleep(PSI);

  // --- Step 4: Revoke session ---
  group('revoke_session', () => {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionCookie) {
      headers['Cookie'] = `__Host-heady_session=${sessionCookie}`;
    }

    const res = http.post(`${AUTH_URL}/session/revoke`, null, {
      headers,
      tags: { step: 'revoke' },
      timeout: '8s',
    });

    const passed = check(res, {
      'session revoked (200 or 204)': (r) => r.status === 200 || r.status === 204,
    });

    authFailures.add(!passed);
    sessionRevokeDuration.add(res.timings.duration);
  });

  completedFlows.add(1);

  // φ-scaled pause between full flow iterations
  sleep(PHI);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'auth-flow',
    metrics: {
      completedFlows: data.metrics.completed_auth_flows
        ? data.metrics.completed_auth_flows.values.count
        : 0,
      failureRate: data.metrics.auth_flow_failures
        ? data.metrics.auth_flow_failures.values.rate
        : 0,
      sessionCreate: {
        p50: data.metrics.session_create_duration
          ? data.metrics.session_create_duration.values['p(50)']
          : 0,
        p95: data.metrics.session_create_duration
          ? data.metrics.session_create_duration.values['p(95)']
          : 0,
      },
      sessionValidate: {
        p50: data.metrics.session_validate_duration
          ? data.metrics.session_validate_duration.values['p(50)']
          : 0,
        p95: data.metrics.session_validate_duration
          ? data.metrics.session_validate_duration.values['p(95)']
          : 0,
      },
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'results/auth-flow.json': JSON.stringify(summary, null, 2),
  };
}
