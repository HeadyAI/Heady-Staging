const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveHost } = require('../services/domain-router/src/router-table');

test('domain router resolves headysystems.com', () => {
  const resolved = resolveHost('headysystems.com');
  assert.equal(resolved.site, 'HeadySystems');
  assert.equal(resolved.service, 'api-gateway');
});
