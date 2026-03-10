const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validate } = require('../shared/schema-validator');

function readSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shared', 'schemas', name), 'utf8'));
}

test('session contract exposes required fields', () => {
  const schema = readSchema('session.json');
  const payload = {
    sub: 'user:test',
    provider: 'firebase',
    roles: ['builder'],
    anonymous: false,
    origin: 'https://headysystems.com',
    iat: 1,
    exp: 2,
    binding: 'abc'
  };
  const result = validate(schema.required, payload);
  assert.equal(result.ok, true);
});

test('feature flag contract preserves rollout and kill switch', () => {
  const schema = readSchema('feature-flag.json');
  const payload = {
    name: 'edge-search',
    rollout: 61.8,
    cslGate: 0.618,
    killSwitch: false
  };
  const result = validate(schema.required, payload);
  assert.equal(result.ok, true);
});
