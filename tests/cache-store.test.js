const test = require('node:test');
const assert = require('node:assert/strict');
const { createCacheStore } = require('../services/heady-cache/src/cache-store');

test('cache store writes and reads entries', () => {
  const store = createCacheStore(3);
  store.set('alpha', { ok: true }, 55);
  const hit = store.get('alpha');
  assert.equal(hit.ok, true);
  assert.deepEqual(hit.value, { ok: true });
});
