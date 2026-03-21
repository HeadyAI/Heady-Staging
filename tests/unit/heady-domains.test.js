import { describe, it, expect } from 'vitest';
/**
 * Heady™ Latent OS v5.3.0
 * Tests: Heady Domains Registry
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */
'use strict';

const assert = require('assert');
const {
  HEADY_DOMAINS,
  ADMIN_SUBDOMAINS,
  ALLOWED_ORIGINS,
  NAVIGATION_MAP,
  getDomainByHost,
  isAllowedOrigin,
} = require('../../src/shared/heady-domains');
const { CSL_THRESHOLDS, PSI } = require('../../src/shared/phi-math');

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

// ─── Domain Registry Tests ──────────────────────────────────────────────────

runTest('HEADY_DOMAINS has exactly 9 entries', () => {
  assert.strictEqual(Object.keys(HEADY_DOMAINS).length, 9);
});

runTest('HEADY_DOMAINS includes all 9 canonical domains', () => {
  const hosts = Object.values(HEADY_DOMAINS).map((d) => d.host);
  const expected = [
    'headyme.com', 'headysystems.com', 'headyconnection.org',
    'headybuddy.org', 'headymcp.com', 'headyio.com',
    'headybot.com', 'headyapi.com', 'heady-ai.com',
  ];
  for (const h of expected) {
    assert.ok(hosts.includes(h), `should include ${h}`);
  }
});

runTest('every domain has role, pool, and csl fields', () => {
  for (const [key, domain] of Object.entries(HEADY_DOMAINS)) {
    assert.ok(domain.host, `${key} should have host`);
    assert.ok(domain.role, `${key} should have role`);
    assert.ok(domain.pool, `${key} should have pool`);
    assert.ok(typeof domain.csl === 'number', `${key} should have numeric csl`);
  }
});

runTest('CSL gates use only canonical thresholds', () => {
  const validGates = [PSI, CSL_THRESHOLDS.LOW, CSL_THRESHOLDS.MEDIUM, CSL_THRESHOLDS.HIGH, CSL_THRESHOLDS.CRITICAL];
  for (const [key, domain] of Object.entries(HEADY_DOMAINS)) {
    assert.ok(
      validGates.some((g) => Math.abs(g - domain.csl) < 0.001),
      `${key} CSL gate ${domain.csl} should be a canonical threshold`
    );
  }
});

runTest('pools are valid Hot/Warm/Cold', () => {
  const validPools = ['hot', 'warm', 'cold'];
  for (const [key, domain] of Object.entries(HEADY_DOMAINS)) {
    assert.ok(validPools.includes(domain.pool), `${key} pool should be hot/warm/cold`);
  }
});

// ─── ALLOWED_ORIGINS Tests ──────────────────────────────────────────────────

runTest('ALLOWED_ORIGINS includes https:// for each domain', () => {
  for (const domain of Object.values(HEADY_DOMAINS)) {
    assert.ok(
      ALLOWED_ORIGINS.includes(`https://${domain.host}`),
      `should include https://${domain.host}`
    );
  }
});

runTest('ALLOWED_ORIGINS includes www variants', () => {
  for (const domain of Object.values(HEADY_DOMAINS)) {
    assert.ok(
      ALLOWED_ORIGINS.includes(`https://www.${domain.host}`),
      `should include https://www.${domain.host}`
    );
  }
});

runTest('ALLOWED_ORIGINS includes admin subdomains', () => {
  for (const sub of ADMIN_SUBDOMAINS) {
    assert.ok(ALLOWED_ORIGINS.includes(`https://${sub}`), `should include https://${sub}`);
  }
});

runTest('ALLOWED_ORIGINS has no http:// entries (HTTPS only)', () => {
  for (const origin of ALLOWED_ORIGINS) {
    assert.ok(origin.startsWith('https://'), `${origin} should be HTTPS`);
  }
});

runTest('ALLOWED_ORIGINS is frozen', () => {
  assert.ok(Object.isFrozen(ALLOWED_ORIGINS), 'should be frozen');
});

// ─── getDomainByHost Tests ──────────────────────────────────────────────────

runTest('getDomainByHost returns correct domain config', () => {
  const result = getDomainByHost('headyme.com');
  assert.ok(result);
  assert.strictEqual(result.host, 'headyme.com');
  assert.strictEqual(result.role, 'command_center');
});

runTest('getDomainByHost strips www prefix', () => {
  const result = getDomainByHost('www.heady-ai.com');
  assert.ok(result);
  assert.strictEqual(result.host, 'heady-ai.com');
});

runTest('getDomainByHost returns null for unknown host', () => {
  const result = getDomainByHost('unknown.com');
  assert.strictEqual(result, null);
});

// ─── isAllowedOrigin Tests ──────────────────────────────────────────────────

runTest('isAllowedOrigin returns true for canonical origins', () => {
  assert.strictEqual(isAllowedOrigin('https://headyme.com'), true);
  assert.strictEqual(isAllowedOrigin('https://heady-ai.com'), true);
});

runTest('isAllowedOrigin returns false for non-Heady origins', () => {
  assert.strictEqual(isAllowedOrigin('https://evil.com'), false);
  assert.strictEqual(isAllowedOrigin('http://headyme.com'), false); // HTTP not HTTPS
});

// ─── Navigation Map Tests ───────────────────────────────────────────────────

runTest('NAVIGATION_MAP has primary, secondary, and admin sections', () => {
  assert.ok(Array.isArray(NAVIGATION_MAP.primary));
  assert.ok(Array.isArray(NAVIGATION_MAP.secondary));
  assert.ok(Array.isArray(NAVIGATION_MAP.admin));
});

runTest('all navigation links use HTTPS', () => {
  const allLinks = [...NAVIGATION_MAP.primary, ...NAVIGATION_MAP.secondary, ...NAVIGATION_MAP.admin];
  for (const link of allLinks) {
    assert.ok(link.href.startsWith('https://'), `${link.label} href should be HTTPS`);
  }
});

// ─── Summary ────────────────────────────────────────────────────────────────

process.stdout.write(JSON.stringify({
  level: 'info',
  suite: 'heady-domains',
  passed,
  total,
  status: passed === total ? 'ALL_PASS' : 'SOME_FAIL',
}) + '\n');

process.exitCode = passed === total ? 0 : 1;


describe('heady-domains', () => {
  it('runs all tests', () => {
    expect(passed).toBe(total);
  });
});
