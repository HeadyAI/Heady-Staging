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

describe('Agents', () => {
  it('GET /api/agents → 19 agents', async () => {
    const r = await get('/api/agents');
    assert.strictEqual(r.status, 200);
    assert(Array.isArray(r.body));
    assert.strictEqual(r.body.length, 19);
  });
  it('GET /api/agents/status → all have status', async () => {
    const r = await get('/api/agents/status');
    assert.strictEqual(r.status, 200);
    assert(r.body.every(a => a.status !== undefined));
  });
});
