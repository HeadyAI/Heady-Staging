const test = require('node:test');
const assert = require('node:assert/strict');
const { signRequest, verifySignedRequest } = require('../shared/interservice-auth');

test('interservice request signatures validate correctly', () => {
  const body = JSON.stringify({ query: 'vector memory', limit: 3 });
  const timestamp = String(Date.now());
  const signature = signRequest(body, 'api-gateway', timestamp);
  const result = verifySignedRequest(body, signature, 'api-gateway', timestamp);
  assert.equal(result.ok, true);
});
