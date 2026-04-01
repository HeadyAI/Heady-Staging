// HEADY_BRAND:BEGIN
// FILE: scripts/sentry-error-driver.js
// LAYER: scripts
// HEADY_BRAND:END
/**
 * Sentry Error Driver — Extracts unhandled Sentry telemetry via the REST API
 * and pipes it into the pipeline's self-healing module. Maps Sentry issues
 * to pipeline-actionable error objects.
 *
 * Requires: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT in environment
 *
 * Usage:
 *   node scripts/sentry-error-driver.js              # fetch latest unresolved
 *   node scripts/sentry-error-driver.js --limit 25   # fetch 25 issues
 */

'use strict';

const https = require('https');

const SENTRY_API_BASE = 'https://sentry.io/api/0';

function getConfig() {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG || 'heady-systems';
  const project = process.env.SENTRY_PROJECT || 'heady-main';
  if (!token) {
    throw new Error('SENTRY_AUTH_TOKEN not set in environment');
  }
  return { token, org, project };
}

function sentryGet(path) {
  const { token } = getConfig();
  return new Promise((resolve, reject) => {
    const url = new URL(`${SENTRY_API_BASE}${path}`);
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse Sentry response: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Queries ──────────────────────────────────────────────────────────────────

async function fetchUnresolvedIssues(limit = 10) {
  const { org, project } = getConfig();
  const path = `/projects/${org}/${project}/issues/?query=is:unresolved&limit=${limit}&sort=date`;
  return sentryGet(path);
}

async function fetchIssueEvents(issueId, limit = 5) {
  const path = `/issues/${issueId}/events/?limit=${limit}`;
  return sentryGet(path);
}

// ── Transform to Pipeline Error ──────────────────────────────────────────────

function toPipelineError(issue) {
  return {
    source: 'sentry',
    issueId: issue.id,
    shortId: issue.shortId,
    title: issue.title,
    culprit: issue.culprit || 'unknown',
    level: issue.level || 'error',
    count: issue.count,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    severity: mapSeverity(issue),
    pipelineAction: mapAction(issue),
    metadata: {
      type: issue.metadata?.type,
      value: issue.metadata?.value,
      filename: issue.metadata?.filename,
    },
  };
}

function mapSeverity(issue) {
  if (issue.level === 'fatal') return 'critical';
  if (issue.level === 'error' && issue.count > 100) return 'high';
  if (issue.level === 'error') return 'medium';
  return 'low';
}

function mapAction(issue) {
  const severity = mapSeverity(issue);
  if (severity === 'critical') return 'halt_and_escalate';
  if (severity === 'high') return 'self_heal';
  if (severity === 'medium') return 'queue_for_fix';
  return 'log_and_monitor';
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || 10 : 10;

  console.log(`[sentry-driver] Fetching top ${limit} unresolved Sentry issues...`);
  const issues = await fetchUnresolvedIssues(limit);

  if (!Array.isArray(issues) || issues.length === 0) {
    console.log('[sentry-driver] No unresolved issues found.');
    return;
  }

  const errors = issues.map(toPipelineError);
  console.log(`[sentry-driver] Found ${errors.length} unresolved issue(s):`);
  errors.forEach(e => {
    console.log(`  ${e.shortId}: ${e.title} [${e.severity}] → ${e.pipelineAction}`);
  });

  console.log(JSON.stringify(errors, null, 2));
}

main().catch(err => {
  console.error(`[sentry-driver] Fatal: ${err.message}`);
  process.exit(1);
});

module.exports = { fetchUnresolvedIssues, fetchIssueEvents, toPipelineError };
