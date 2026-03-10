'use strict';
const assert = require('assert');
const http = require('http');
const BASE = process.env.TEST_URL || 'http://localhost:3301';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: r.statusCode, body: d }); }
      });
    }).on('error', reject);
  });
}

describe('Health', () => {
  it('GET /health → 200 ok', async () => {
    const r = await get('/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'ok');
  });
  it('GET /health/deep → services', async () => {
    const r = await get('/health/deep');
    assert.strictEqual(r.status, 200);
    assert(r.body.services);
  });
});
