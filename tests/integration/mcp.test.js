'use strict';
const assert = require('assert');
const http = require('http');
const BASE = process.env.TEST_URL || 'http://localhost:3301';
const TOKEN = process.env.MCP_BEARER_TOKEN || 'test-token-32-chars-long-enough-for-validation';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname,
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }};
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({status:res.statusCode,body:JSON.parse(d)}); } catch { resolve({status:res.statusCode,body:d}); }});
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('MCP Gateway', () => {
  it('Lists tools', async () => {
    const r = await req('GET', '/mcp/v1/tools/list');
    assert.strictEqual(r.status, 200);
    assert(Array.isArray(r.body.tools));
  });
  it('404 for unknown tool', async () => {
    const r = await req('POST', '/mcp/v1/tools/nonexistent', { arguments: {} });
    assert.strictEqual(r.status, 404);
  });
  it('Rejects no auth', async () => {
    const r = await new Promise((resolve, reject) => {
      http.get(`${BASE}/mcp/v1/tools/list`, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ status: res.statusCode }));
      }).on('error', reject);
    });
    assert.strictEqual(r.status, 401);
  });
});
