// HEADY_BRAND:BEGIN
// FILE: scripts/linear-queue-driver.js
// LAYER: scripts
// HEADY_BRAND:END
/**
 * Linear Queue Driver — Binds to the Linear API and pulls the highest-priority
 * Unstarted architectural tasks from the backlog. Transforms Linear tickets
 * into plan-and-execute algorithm inputs for HCFullPipeline.
 *
 * Requires: LINEAR_API_KEY in environment
 *
 * Usage:
 *   node scripts/linear-queue-driver.js              # pull next unstarted task
 *   node scripts/linear-queue-driver.js --status      # show queue status
 *   node scripts/linear-queue-driver.js --batch 10    # pull batch of 10
 */

'use strict';

const https = require('https');

const LINEAR_API_URL = 'https://api.linear.app/graphql';

function getApiKey() {
  const key = process.env.LINEAR_API_KEY;
  if (!key) {
    throw new Error('LINEAR_API_KEY not set in environment');
  }
  return key;
}

function graphql(query, variables = {}) {
  const apiKey = getApiKey();
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(`Linear API errors: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed.data);
          }
        } catch (err) {
          reject(new Error(`Failed to parse Linear response: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Queries ──────────────────────────────────────────────────────────────────

async function fetchUnstartedTasks(limit = 1) {
  const query = `
    query UnstartedTasks($first: Int!) {
      issues(
        filter: {
          state: { type: { eq: "unstarted" } }
        }
        first: $first
        orderBy: priority
      ) {
        nodes {
          id
          identifier
          title
          description
          priority
          estimate
          labels { nodes { name } }
          state { name type }
          assignee { name }
          createdAt
          updatedAt
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const data = await graphql(query, { first: limit });
  return data.issues;
}

async function getQueueStatus() {
  const query = `
    query QueueStatus {
      unstarted: issueCount(filter: { state: { type: { eq: "unstarted" } } })
      inProgress: issueCount(filter: { state: { type: { eq: "started" } } })
      completed: issueCount(filter: { state: { type: { eq: "completed" } } })
    }
  `;
  return graphql(query);
}

async function markInProgress(issueId) {
  // Find the "In Progress" state for the issue's team
  const query = `
    mutation StartIssue($id: String!) {
      issueUpdate(id: $id, input: { stateId: null }) {
        success
        issue { id identifier state { name } }
      }
    }
  `;
  // We fetch the started state first, then update
  const statesQuery = `
    query {
      workflowStates(filter: { type: { eq: "started" } }, first: 1) {
        nodes { id name }
      }
    }
  `;
  const states = await graphql(statesQuery);
  const startedState = states.workflowStates?.nodes?.[0];
  if (!startedState) {
    console.log('[linear] No "started" workflow state found — skipping state transition');
    return null;
  }

  const updateQuery = `
    mutation StartIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue { id identifier state { name } }
      }
    }
  `;
  return graphql(updateQuery, { id: issueId, stateId: startedState.id });
}

// ── Transform to Pipeline Task ──────────────────────────────────────────────

function toPipelineTask(issue) {
  return {
    source: 'linear',
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description || '',
    priority: issue.priority,
    estimate: issue.estimate,
    labels: (issue.labels?.nodes || []).map(l => l.name),
    pipelineStage: mapToStage(issue),
    createdAt: issue.createdAt,
  };
}

function mapToStage(issue) {
  const labels = (issue.labels?.nodes || []).map(l => l.name.toLowerCase());
  if (labels.includes('bug') || labels.includes('fix')) return 'execute';
  if (labels.includes('security') || labels.includes('audit')) return 'recon';
  if (labels.includes('architecture') || labels.includes('refactor')) return 'decompose';
  if (labels.includes('deploy') || labels.includes('infra')) return 'orchestrate';
  if (labels.includes('research')) return 'continuous-search';
  return 'intake'; // default: enter the pipeline at intake
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const status = await getQueueStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const batchIdx = args.indexOf('--batch');
  const limit = batchIdx !== -1 ? parseInt(args[batchIdx + 1], 10) || 10 : 1;

  console.log(`[linear-queue] Fetching top ${limit} unstarted task(s)...`);
  const result = await fetchUnstartedTasks(limit);

  if (!result.nodes || result.nodes.length === 0) {
    console.log('[linear-queue] No unstarted tasks in backlog.');
    return;
  }

  const tasks = result.nodes.map(toPipelineTask);
  console.log(`[linear-queue] Found ${tasks.length} task(s):`);
  tasks.forEach(t => {
    console.log(`  ${t.identifier}: ${t.title} → stage:${t.pipelineStage} (priority:${t.priority})`);
  });

  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(err => {
  console.error(`[linear-queue] Fatal: ${err.message}`);
  process.exit(1);
});

module.exports = { fetchUnstartedTasks, getQueueStatus, markInProgress, toPipelineTask };
