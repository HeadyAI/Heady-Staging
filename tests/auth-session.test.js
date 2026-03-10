const test = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../services/auth-session-server/src/server');

let instance;

test.before(async () => {
  instance = server.listen(0);
  await new Promise(resolve => instance.once('listening', resolve));
});

test.after(async () => {
  await new Promise(resolve => instance.close(resolve));
});

test('auth-session-server creates and verifies a bound cookie', async () => {
  const { port } = instance.address();
  const createResponse = await fetch(`http://127.0.0.1:${port}/session/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://headysystems.com',
      'user-agent': 'heady-test-agent'
    },
    body: JSON.stringify({ subject: 'user:test', provider: 'firebase', roles: ['builder'], origin: 'https://headysystems.com' })
  });
  assert.equal(createResponse.status, 200);
  const cookie = createResponse.headers.get('set-cookie');
  assert.match(cookie, /__Host-heady_session=/);

  const verifyResponse = await fetch(`http://127.0.0.1:${port}/session/verify`, {
    method: 'POST',
    headers: {
      cookie,
      'user-agent': 'heady-test-agent'
    }
  });
  const verified = await verifyResponse.json();
  assert.equal(verified.ok, true);
  assert.equal(verified.session.sub, 'user:test');
});
