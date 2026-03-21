/**
 * Heady™ Latent OS v5.3.0
 * Integration Tests: Domain Router
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */
'use strict';

const assert = require('assert');
const { verifyRoute, initiateAuthHandoff, getNavigationManifest, logRoute } = require('../../services/domain-router/index');
const { CSL_THRESHOLDS } = require('../../src/shared/phi-math');
const { HEADY_DOMAINS } = require('../../src/shared/heady-domains');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    process.stdout.write(JSON.stringify({ level: 'info', test: name, status: 'PASS' }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ level: 'error', test: name, status: 'FAIL', error: err.message }) + '\n');
  }
}

// ─── Route Verification Tests ───────────────────────────────────────────────

test('verifyRoute accepts valid cross-domain route', () => {
  const result = verifyRoute('headyme.com', 'https://heady-ai.com/dashboard');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.destination, 'heady-ai.com');
  assert.strictEqual(result.destinationRole, 'intelligence_hub');
  assert.ok(result.routingConfidence >= CSL_THRESHOLDS.MINIMUM);
  assert.strictEqual(result.meetsThreshold, true);
});

test('verifyRoute rejects non-Heady destination', () => {
  const result = verifyRoute('headyme.com', 'https://evil.com/phish');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'destination_not_in_registry');
});

test('verifyRoute rejects invalid URL', () => {
  const result = verifyRoute('headyme.com', 'not-a-url');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'invalid_url');
});

test('verifyRoute computes min CSL gate correctly', () => {
  // headyme (MEDIUM=0.809) → headymcp (CRITICAL=0.927)
  const result = verifyRoute('headyme.com', 'https://headymcp.com/tools');
  assert.ok(Math.abs(result.routingConfidence - CSL_THRESHOLDS.MEDIUM) < 0.001,
    'should use min(0.809, 0.927) = 0.809');
});

test('verifyRoute works for all 9 domain combinations', () => {
  const domains = Object.values(HEADY_DOMAINS).map((d) => d.host);
  for (const src of domains) {
    for (const dest of domains) {
      if (src === dest) continue;
      const result = verifyRoute(src, `https://${dest}/`);
      assert.strictEqual(result.valid, true, `${src} → ${dest} should be valid`);
    }
  }
});

// ─── Auth Handoff Tests ─────────────────────────────────────────────────────

test('initiateAuthHandoff succeeds for valid route', () => {
  const result = initiateAuthHandoff('user_1', 'headyme.com', 'https://heady-ai.com/');
  assert.strictEqual(result.success, true);
  assert.ok(result.relay.code, 'should have relay code');
  assert.ok(result.relay.nonce, 'should have nonce');
  assert.ok(result.relay.handoffURL.includes('auth.headysystems.com/relay'), 'handoff URL should point to auth relay');
});

test('initiateAuthHandoff fails for invalid destination', () => {
  const result = initiateAuthHandoff('user_2', 'headyme.com', 'https://evil.com/');
  assert.strictEqual(result.success, false);
});

// ─── Navigation Manifest Tests ──────────────────────────────────────────────

test('getNavigationManifest returns full structure', () => {
  const manifest = getNavigationManifest('headyme.com');
  assert.strictEqual(manifest.currentDomain, 'headyme.com');
  assert.ok(manifest.navigation, 'should have navigation');
  assert.ok(Array.isArray(manifest.domains), 'should have domains array');
  assert.strictEqual(manifest.domains.length, 9);
  assert.ok(manifest.authBridge.includes('auth.headysystems.com'), 'should point to auth bridge');
});

test('getNavigationManifest marks current domain', () => {
  const manifest = getNavigationManifest('heady-ai.com');
  const current = manifest.domains.find((d) => d.isCurrent);
  assert.ok(current, 'should have current domain');
  assert.strictEqual(current.host, 'heady-ai.com');
});

// ─── Route Logging Tests ────────────────────────────────────────────────────

test('logRoute does not throw', () => {
  assert.doesNotThrow(() => {
    logRoute('headyme.com', 'https://heady-ai.com', 'user_1', true);
  });
});

// ─── Summary ────────────────────────────────────────────────────────────────

process.stdout.write(JSON.stringify({
  level: 'info',
  suite: 'domain-router-integration',
  passed,
  total,
  status: passed === total ? 'ALL_PASS' : 'SOME_FAIL',
}) + '\n');

process.exitCode = passed === total ? 0 : 1;
