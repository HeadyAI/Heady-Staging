import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const authDuration = new Trend('auth_duration');
const sessionVerifyDuration = new Trend('session_verify_duration');
const loginErrors = new Counter('login_errors');
const sessionErrors = new Counter('session_errors');
const activeUsers = new Gauge('active_users');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3311';
const RAMP_UP_DURATION = '30s';
const STEADY_STATE_DURATION = '5m';
const RAMP_DOWN_DURATION = '30s';

export const options = {
  stages: [
    // Ramp up
    { duration: RAMP_UP_DURATION, target: 100 },
    // Steady state
    { duration: STEADY_STATE_DURATION, target: 100 },
    // Ramp down
    { duration: RAMP_DOWN_DURATION, target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<4000'],
    'http_req_failed': ['rate<0.05'],
    'auth_duration': ['p(95)<1618', 'p(99)<4236'], // φ-scaled
    'session_verify_duration': ['p(95)<1618'],
    'login_errors': ['rate<0.01'],
    'session_errors': ['rate<0.01'],
  },
};

// Test data
const users = [
  { email: 'user1@heady.app', password: 'SecurePassword123!' },
  { email: 'user2@heady.app', password: 'SecurePassword456!' },
  { email: 'user3@heady.app', password: 'SecurePassword789!' },
  { email: 'user4@heady.app', password: 'SecurePassword012!' },
  { email: 'user5@heady.app', password: 'SecurePassword345!' },
];

export function setup() {
  // Pre-test setup if needed
  return {};
}

export default function () {
  activeUsers.add(1);

  group('Authentication Flow', () => {
    authFlow();
  });

  activeUsers.add(-1);
  sleep(1);
}

function authFlow() {
  // Test 1: User Registration
  group('User Registration', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const timestamp = new Date().getTime();
    const registrationPayload = JSON.stringify({
      email: `user${timestamp}@heady.app`,
      password: user.password,
      firstName: 'Test',
      lastName: 'User',
      acceptTerms: true,
    });

    const registrationRes = http.post(`${BASE_URL}/auth/register`, registrationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `req-${timestamp}`,
      },
      tags: { name: 'Registration' },
    });

    check(registrationRes, {
      'registration status is 201': (r) => r.status === 201,
      'registration has token': (r) => r.json('access_token') !== undefined,
      'registration response time < 2s': (r) => r.timings.duration < 2000,
    }) || loginErrors.add(1);

    const registeredEmail = `user${timestamp}@heady.app`;
    return { email: registeredEmail, password: user.password, token: registrationRes.json('access_token') };
  });

  sleep(0.5);

  // Test 2: User Login
  group('User Login', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
      rememberMe: true,
    });

    const startTime = new Date().getTime();
    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': 'k6-load-test',
      },
      tags: { name: 'Login' },
    });
    const duration = new Date().getTime() - startTime;
    authDuration.add(duration);

    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has access_token': (r) => r.json('access_token') !== undefined,
      'login has refresh_token': (r) => r.json('refresh_token') !== undefined,
      'login response time < 1.618s': (r) => r.timings.duration < 1618,
      'login response time < 4.236s': (r) => r.timings.duration < 4236,
    }) || loginErrors.add(1);

    return {
      email: user.email,
      accessToken: loginRes.json('access_token'),
      refreshToken: loginRes.json('refresh_token'),
    };
  });

  sleep(0.5);

  // Test 3: Session Verification
  group('Session Verification', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const accessToken = loginRes.json('access_token');

    const startTime = new Date().getTime();
    const verifyRes = http.post(
      `${BASE_URL}/auth/verify-session`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'VerifySession' },
      }
    );
    const duration = new Date().getTime() - startTime;
    sessionVerifyDuration.add(duration);

    check(verifyRes, {
      'session verify status is 200': (r) => r.status === 200,
      'session is valid': (r) => r.json('valid') === true,
      'session verify response time < 1.618s': (r) => r.timings.duration < 1618,
    }) || sessionErrors.add(1);

    return { token: accessToken };
  });

  sleep(0.5);

  // Test 4: Token Refresh
  group('Token Refresh', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const refreshToken = loginRes.json('refresh_token');

    const refreshPayload = JSON.stringify({
      refreshToken: refreshToken,
    });

    const refreshRes = http.post(`${BASE_URL}/auth/refresh-token`, refreshPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `refresh-${Date.now()}`,
      },
      tags: { name: 'RefreshToken' },
    });

    check(refreshRes, {
      'refresh status is 200': (r) => r.status === 200,
      'refresh has new access_token': (r) => r.json('access_token') !== undefined,
      'refresh response time < 1.618s': (r) => r.timings.duration < 1618,
    }) || loginErrors.add(1);
  });

  sleep(0.5);

  // Test 5: Logout
  group('Logout', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const accessToken = loginRes.json('access_token');

    const logoutRes = http.post(
      `${BASE_URL}/auth/logout`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'Logout' },
      }
    );

    check(logoutRes, {
      'logout status is 200': (r) => r.status === 200,
      'logout response time < 1.618s': (r) => r.timings.duration < 1618,
    });
  });

  sleep(0.5);

  // Test 6: Multi-factor Authentication (if enabled)
  group('MFA Setup', () => {
    const user = users[Math.floor(Math.random() * users.length)];
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const accessToken = loginRes.json('access_token');

    const mfaRes = http.post(
      `${BASE_URL}/auth/mfa/setup`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'MFASetup' },
      }
    );

    check(mfaRes, {
      'MFA setup status is 200 or 409': (r) => r.status === 200 || r.status === 409,
      'MFA response time < 2s': (r) => r.timings.duration < 2000,
    });
  });
}

export function teardown(data) {
  // Post-test cleanup if needed
}
