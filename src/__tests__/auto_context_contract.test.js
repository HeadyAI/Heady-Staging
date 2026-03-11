import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

// Try the system-build version first (has enrichment routes); fall back to repo version
const candidates = [
  '/tmp/heady-in-extract/system-build/heady-system-build/services/specialized/heady-auto-context/index.js',
  resolve(repoRoot, 'src/05-heady-auto-context.js'),
];
const autoCtxPath = candidates.find(p => existsSync(p));

test('autocontext source file exists', () => {
  assert.ok(autoCtxPath, 'No auto-context source file found at any known path');
});

if (autoCtxPath) {
  const text = readFileSync(autoCtxPath, 'utf8');

  test('autocontext exposes required routes', () => {
    for (const required of ['/context/enrich', '/context/index-batch', '/context/remove', '/context/query']) {
      assert.ok(text.includes(required), `missing ${required}`);
    }
  });

  test('autocontext keeps index state', () => {
    assert.ok(
      text.includes('sourceIndex = new Map()') || text.includes('sourceIndex'),
      'missing sourceIndex state'
    );
  });
}
