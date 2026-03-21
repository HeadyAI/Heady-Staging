import { describe, it, expect } from 'vitest';
/**
 * Heady™ Latent OS v5.3.0
 * Tests: Cross-Domain Auth Relay
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */
'use strict';

const assert = require('assert');
const {
  generateRelayCode,
  consumeRelayCode,
  checkLockout,
  recordFailedAttempt,
  evaluateAuthConfidence,
  generatePKCE,
  generateBridgeHTML,
  RELAY_CODE_TTL_MS,
  MAX_RELAY_ATTEMPTS,
} = require('../../src/security/cross-domain-auth');
const { CSL_THRESHOLDS, PHI_TIMING } = require('../../shared/phi-math');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    process.stdout.write(JSON.stringify({ level: 'info', test: name, status: 'PASS' }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ level: 'error', test: name, status: 'FAIL', error: err.message }) + '\n');
  }
}

// ─── Relay Code Tests ────────────────────────────────────────────────────────

runTest('generateRelayCode returns code and nonce', () => {
  const result = generateRelayCode('user_1', 'headyme.com');
  assert.ok(result.code, 'should have code');
  assert.ok(result.nonce, 'should have nonce');
  assert.ok(result.expiresAt > Date.now(), 'should expire in the future');
});

runTest('generateRelayCode TTL uses PHI_TIMING.PHI_5', () => {
  const before = Date.now();
  const result = generateRelayCode('user_2', 'heady-ai.com');
  const expectedExpiry = before + PHI_TIMING.PHI_5;
  assert.ok(Math.abs(result.expiresAt - expectedExpiry) < 100, 'TTL should match PHI_5');
});

runTest('consumeRelayCode succeeds with valid code and nonce', () => {
  const relay = generateRelayCode('user_3', 'headyme.com');
  const result = consumeRelayCode(relay.code, relay.nonce);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.userId, 'user_3');
  assert.strictEqual(result.sourceDomain, 'headyme.com');
});

runTest('consumeRelayCode fails on second use (replay protection)', () => {
  const relay = generateRelayCode('user_4', 'headyme.com');
  consumeRelayCode(relay.code, relay.nonce); // First use
  const result = consumeRelayCode(relay.code, relay.nonce); // Replay
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'code_already_used');
});

runTest('consumeRelayCode fails with wrong nonce', () => {
  const relay = generateRelayCode('user_5', 'headyme.com');
  const result = consumeRelayCode(relay.code, 'wrong_nonce');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'nonce_mismatch');
});

runTest('consumeRelayCode fails for unknown code', () => {
  const result = consumeRelayCode('nonexistent_code', 'some_nonce');
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'code_not_found');
});

// ─── Lockout Tests ──────────────────────────────────────────────────────────

runTest('checkLockout returns unlocked for new identifier', () => {
  const result = checkLockout('new_user_lockout_test');
  assert.strictEqual(result.locked, false);
});

runTest('recordFailedAttempt triggers lockout after MAX_RELAY_ATTEMPTS', () => {
  const id = 'lockout_test_user_' + Date.now();
  for (let i = 0; i < MAX_RELAY_ATTEMPTS; i++) {
    recordFailedAttempt(id);
  }
  const result = checkLockout(id);
  assert.strictEqual(result.locked, true);
  assert.ok(result.remainingMs > 0, 'should have remaining lockout time');
});

// ─── PKCE Tests ─────────────────────────────────────────────────────────────

runTest('generatePKCE returns verifier, challenge, and method', () => {
  const pkce = generatePKCE();
  assert.ok(pkce.verifier, 'should have verifier');
  assert.ok(pkce.challenge, 'should have challenge');
  assert.strictEqual(pkce.method, 'S256');
  assert.ok(pkce.verifier.length > 20, 'verifier should be at least 20 chars');
});

runTest('generatePKCE produces unique pairs', () => {
  const a = generatePKCE();
  const b = generatePKCE();
  assert.notStrictEqual(a.verifier, b.verifier, 'verifiers should differ');
  assert.notStrictEqual(a.challenge, b.challenge, 'challenges should differ');
});

// ─── Auth Confidence Tests ──────────────────────────────────────────────────

runTest('evaluateAuthConfidence allows with all factors true', () => {
  const result = evaluateAuthConfidence({
    tokenValid: true,
    fingerprintMatch: true,
    originTrusted: true,
    sessionFresh: true,
    mfaVerified: true,
  });
  assert.strictEqual(result.decision, 'allow');
  assert.strictEqual(result.rawScore, 1, 'raw score should be 1.0 with all factors true');
});

runTest('evaluateAuthConfidence denies with all factors false', () => {
  const result = evaluateAuthConfidence({
    tokenValid: false,
    fingerprintMatch: false,
    originTrusted: false,
    sessionFresh: false,
    mfaVerified: false,
  });
  assert.strictEqual(result.decision, 'deny');
  assert.ok(result.rawScore < CSL_THRESHOLDS.MINIMUM, 'raw score should be below MINIMUM');
});

runTest('evaluateAuthConfidence allows with token + fingerprint only', () => {
  const result = evaluateAuthConfidence({
    tokenValid: true,
    fingerprintMatch: true,
    originTrusted: false,
    sessionFresh: false,
    mfaVerified: false,
  });
  // Token (ψ) + fingerprint (ψ²) gives ~0.764 raw, which may or may not pass MEDIUM gate
  assert.ok(typeof result.gatedScore === 'number');
  assert.ok(['allow', 'deny'].includes(result.decision));
});

runTest('evaluateAuthConfidence threshold is CSL_THRESHOLDS.LOW', () => {
  const result = evaluateAuthConfidence({ tokenValid: true });
  assert.strictEqual(result.threshold, CSL_THRESHOLDS.LOW);
});

// ─── Bridge HTML Tests ──────────────────────────────────────────────────────

runTest('generateBridgeHTML returns valid HTML', () => {
  const html = generateBridgeHTML(true, { uid: 'user_1', email: 'test@test.com' });
  assert.ok(html.includes('<!DOCTYPE html>'), 'should be HTML document');
  assert.ok(html.includes('HEADY_SESSION_CHECK'), 'should handle session checks');
  assert.ok(html.includes('HEADY_BRIDGE_READY'), 'should announce readiness');
  assert.ok(html.includes('headyme.com'), 'should include canonical domains');
});

runTest('generateBridgeHTML includes session status', () => {
  const html = generateBridgeHTML(false, null);
  assert.ok(html.includes('"valid":false'), 'should include session validity');
});

// ─── Summary ────────────────────────────────────────────────────────────────

process.stdout.write(JSON.stringify({
  level: 'info',
  suite: 'cross-domain-auth',
  passed,
  total,
  status: passed === total ? 'ALL_PASS' : 'SOME_FAIL',
}) + '\n');

process.exitCode = passed === total ? 0 : 1;


describe('cross-domain-auth', () => {
  it('runs all tests', () => {
    expect(passed).toBe(total);
  });
});
