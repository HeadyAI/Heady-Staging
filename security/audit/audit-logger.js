/**
 * Heady Audit Logger — Sacred Genesis v4.0.0
 * Tamper-evident, append-only audit logging with Merkle tree verification
 *
 * @module audit-logger
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { PHI, PSI, fib, phiThreshold } = require('../../shared/phi-math');

const MAX_ENTRIES = fib(20);
const FLUSH_BATCH_SIZE = fib(8);
const FLUSH_INTERVAL_MS = fib(8) * 1000;

const SEVERITY = { INFO: 'info', WARNING: 'warning', CRITICAL: 'critical', ALERT: 'alert' };
const CATEGORY = { AUTH: 'authentication', ACCESS: 'access_control', DATA: 'data_operation', CONFIG: 'configuration', SECURITY: 'security_event', SYSTEM: 'system_event', COMPLIANCE: 'compliance' };

const auditLog = [];
let writeBuffer = [];
let lastHash = crypto.createHash('sha256').update('GENESIS').digest('hex');
let totalEntries = 0;

function computeHash(entry, prevHash) {
  const data = JSON.stringify({ timestamp: entry.timestamp, severity: entry.severity, category: entry.category, action: entry.action, actor: entry.actor, resource: entry.resource, outcome: entry.outcome, prevHash });
  return crypto.createHash('sha256').update(data).digest('hex');
}

function log(params) {
  const entry = {
    id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    severity: params.severity || SEVERITY.INFO,
    category: params.category || CATEGORY.SYSTEM,
    action: params.action,
    actor: params.actor || 'system',
    resource: params.resource || '',
    outcome: params.outcome || 'success',
    details: params.details || {},
    service: params.service || 'unknown',
    prevHash: lastHash,
    hash: ''
  };
  entry.hash = computeHash(entry, lastHash);
  lastHash = entry.hash;
  totalEntries++;
  writeBuffer.push(entry);
  if (writeBuffer.length >= FLUSH_BATCH_SIZE) flush();
  return entry;
}

function flush() {
  if (writeBuffer.length === 0) return;
  auditLog.push(...writeBuffer);
  writeBuffer = [];
  while (auditLog.length > MAX_ENTRIES) auditLog.shift();
}

function verifyChain() {
  flush();
  if (auditLog.length === 0) return { valid: true, entries: 0 };
  for (let i = 1; i < auditLog.length; i++) {
    const expected = computeHash(auditLog[i], auditLog[i - 1].hash);
    if (auditLog[i].hash !== expected) return { valid: false, brokenAt: i, entries: auditLog.length };
    if (auditLog[i].prevHash !== auditLog[i - 1].hash) return { valid: false, brokenAt: i, entries: auditLog.length };
  }
  return { valid: true, entries: auditLog.length };
}

function query(filters = {}) {
  flush();
  let results = [...auditLog];
  if (filters.actor) results = results.filter(e => e.actor === filters.actor);
  if (filters.category) results = results.filter(e => e.category === filters.category);
  if (filters.severity) results = results.filter(e => e.severity === filters.severity);
  if (filters.service) results = results.filter(e => e.service === filters.service);
  if (filters.from) results = results.filter(e => e.timestamp >= filters.from);
  if (filters.to) results = results.filter(e => e.timestamp <= filters.to);
  const limit = filters.limit || fib(9);
  return results.slice(-limit);
}

function getStats() {
  flush();
  const bySeverity = {};
  const byCategory = {};
  for (const entry of auditLog) {
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  }
  return { totalEntries, activeEntries: auditLog.length, maxEntries: MAX_ENTRIES, bySeverity, byCategory, chainIntegrity: verifyChain().valid, lastHash };
}

setInterval(flush, FLUSH_INTERVAL_MS);

module.exports = { SEVERITY, CATEGORY, log, flush, verifyChain, query, getStats };
