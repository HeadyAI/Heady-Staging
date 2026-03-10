const test = require('node:test');
const assert = require('node:assert/strict');
const { loadServiceMap } = require('../shared/service-map');

test('local service map exposes twelve overlay services', () => {
  const map = loadServiceMap();
  assert.equal(Object.keys(map.services).length, 12);
  assert.equal(map.services['api-gateway'].port, 4320);
  assert.equal(map.services['heady-health'].port, 4323);
});
