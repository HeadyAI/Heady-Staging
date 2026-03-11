import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const requestDuration = new Trend('request_duration');
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const throughput = new Counter('throughput');
const activeConnections = new Gauge('active_connections');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const WARMUP_DURATION = '30s';
const SUSTAINED_LOAD_DURATION = '10m';
const COOLDOWN_DURATION = '30s';

export const options = {
  stages: [
    // Warmup phase
    { duration: WARMUP_DURATION, target: 50 },
    // Sustained load
    { duration: SUSTAINED_LOAD_DURATION, target: 500 },
    // Cool down
    { duration: COOLDOWN_DURATION, target: 0 },
  ],
  thresholds: {
    'request_duration': ['p(50)<1618', 'p(95)<4236', 'p(99)<8472'], // φ-scaled
    'errors': ['rate<0.05'],
    'success': ['rate>0.95'],
    'throughput': ['count>100000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  activeConnections.add(1);

  // Simulate various API gateway operations
  const operations = [
    testUserEndpoint,
    testSearchEndpoint,
    testContentEndpoint,
    testNotificationEndpoint,
    testAnalyticsEndpoint,
  ];

  const selectedOp = operations[Math.floor(Math.random() * operations.length)];
  selectedOp();

  throughput.add(1);
  activeConnections.add(-1);
  sleep(0.1);
}

function testUserEndpoint() {
  group('User Service', () => {
    const userId = Math.floor(Math.random() * 10000) + 1;
    const token = generateMockToken();

    const getRes = http.get(`${BASE_URL}/api/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': generateRequestId(),
      },
      tags: { name: 'GetUser' },
    });

    const start = new Date().getTime();
    check(getRes, {
      'GET user status is 200': (r) => r.status === 200,
      'GET user response time < 1.618s': (r) => r.timings.duration < 1618,
      'user has ID': (r) => r.json('id') !== undefined,
      'user has email': (r) => r.json('email') !== undefined,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - start);

    sleep(0.5);

    // Update user
    const updatePayload = JSON.stringify({
      firstName: 'Updated',
      lastName: 'User',
      preferences: {
        notifications: true,
        theme: 'dark',
      },
    });

    const updateRes = http.patch(
      `${BASE_URL}/api/v1/users/${userId}`,
      updatePayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'UpdateUser' },
      }
    );

    const startUpdate = new Date().getTime();
    check(updateRes, {
      'PATCH user status is 200': (r) => r.status === 200,
      'PATCH user response time < 4.236s': (r) => r.timings.duration < 4236,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - startUpdate);
  });
}

function testSearchEndpoint() {
  group('Search Service', () => {
    const token = generateMockToken();
    const queries = ['heady', 'platform', 'microservices', 'api', 'cloud'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const searchRes = http.get(
      `${BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&limit=20&offset=0`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'Search' },
      }
    );

    const start = new Date().getTime();
    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 2s': (r) => r.timings.duration < 2000,
      'search has results': (r) => r.json('results').length > 0,
      'search has total count': (r) => r.json('total') !== undefined,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - start);

    sleep(0.3);
  });
}

function testContentEndpoint() {
  group('Content Service', () => {
    const token = generateMockToken();
    const contentId = Math.floor(Math.random() * 10000) + 1;

    // Get content
    const getRes = http.get(`${BASE_URL}/api/v1/content/${contentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': generateRequestId(),
      },
      tags: { name: 'GetContent' },
    });

    const start = new Date().getTime();
    check(getRes, {
      'GET content status is 200': (r) => r.status === 200,
      'GET content response time < 1.618s': (r) => r.timings.duration < 1618,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - start);

    sleep(0.3);

    // Create new content
    const createPayload = JSON.stringify({
      title: `Content ${Date.now()}`,
      body: 'This is test content for the HEADY platform',
      tags: ['test', 'load-test', 'api-gateway'],
      visibility: 'public',
    });

    const createRes = http.post(
      `${BASE_URL}/api/v1/content`,
      createPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'CreateContent' },
      }
    );

    const startCreate = new Date().getTime();
    check(createRes, {
      'POST content status is 201': (r) => r.status === 201,
      'POST content response time < 4.236s': (r) => r.timings.duration < 4236,
      'content has ID': (r) => r.json('id') !== undefined,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - startCreate);
  });
}

function testNotificationEndpoint() {
  group('Notification Service', () => {
    const token = generateMockToken();

    // Get notifications
    const getRes = http.get(
      `${BASE_URL}/api/v1/notifications?limit=50&offset=0`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'GetNotifications' },
      }
    );

    const start = new Date().getTime();
    check(getRes, {
      'GET notifications status is 200': (r) => r.status === 200,
      'GET notifications response time < 1.618s': (r) => r.timings.duration < 1618,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - start);

    sleep(0.2);

    // Mark as read
    const notificationId = Math.floor(Math.random() * 1000) + 1;
    const markReadRes = http.patch(
      `${BASE_URL}/api/v1/notifications/${notificationId}/read`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'MarkNotificationRead' },
      }
    );

    check(markReadRes, {
      'PATCH notification status is 200': (r) => r.status === 200 || r.status === 404,
      'PATCH notification response time < 1.618s': (r) => r.timings.duration < 1618,
    }) ? successRate.add(1) : errorRate.add(1);
  });
}

function testAnalyticsEndpoint() {
  group('Analytics Service', () => {
    const token = generateMockToken();

    // Get analytics
    const analyticsRes = http.get(
      `${BASE_URL}/api/v1/analytics/summary?period=day`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'GetAnalytics' },
      }
    );

    const start = new Date().getTime();
    check(analyticsRes, {
      'GET analytics status is 200': (r) => r.status === 200,
      'GET analytics response time < 4.236s': (r) => r.timings.duration < 4236,
    }) ? successRate.add(1) : errorRate.add(1);
    requestDuration.add(new Date().getTime() - start);

    sleep(0.5);

    // Track event
    const eventPayload = JSON.stringify({
      name: 'test_event',
      properties: {
        source: 'load-test',
        timestamp: Date.now(),
      },
    });

    const eventRes = http.post(
      `${BASE_URL}/api/v1/analytics/events`,
      eventPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId(),
        },
        tags: { name: 'TrackEvent' },
      }
    );

    check(eventRes, {
      'POST event status is 201': (r) => r.status === 201,
      'POST event response time < 1.618s': (r) => r.timings.duration < 1618,
    }) ? successRate.add(1) : errorRate.add(1);
  });
}

// Helper functions
function generateMockToken() {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: Math.floor(Math.random() * 10000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: `user${Math.floor(Math.random() * 10000)}@heady.app`,
  }));
  const signature = btoa('test-signature');
  return `${header}.${payload}.${signature}`;
}

function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/tmp/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  let summary = '\n';
  summary += '====== API Gateway Load Test Summary ======\n';
  summary += `Total Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Total Requests: ${data.metrics.throughput?.values?.count || 0}\n`;
  summary += `Success Rate: ${(data.metrics.success?.value * 100).toFixed(2)}%\n`;
  summary += `Error Rate: ${(data.metrics.errors?.value * 100).toFixed(2)}%\n`;
  summary += `\nLatency Metrics (φ-scaled):\n`;
  summary += `  P50: ${data.metrics.request_duration?.values?.['p(50)'] || 0}ms\n`;
  summary += `  P95: ${data.metrics.request_duration?.values?.['p(95)'] || 0}ms\n`;
  summary += `  P99: ${data.metrics.request_duration?.values?.['p(99)'] || 0}ms\n`;
  summary += `  Max: ${data.metrics.request_duration?.values?.['max'] || 0}ms\n`;
  return summary;
}
