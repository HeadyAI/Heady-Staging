const test = require('node:test');
const assert = require('node:assert/strict');
const { verifySession, createSession } = require('../services/auth-session-server/src/session-store');


test('websocket session validation preserves bound identity', () => {
  const { token } = createSession({
    sub: 'user:ws',
    provider: 'firebase',
    roles: ['member'],
    anonymous: false,
    ip: '127.0.0.1',
    userAgent: 'ws-test-agent',
    origin: 'https://headysystems.com'
  });
  const result = verifySession(token, '127.0.0.1', 'ws-test-agent');
  assert.equal(result.ok, true);
  assert.equal(result.payload.sub, 'user:ws');
});
