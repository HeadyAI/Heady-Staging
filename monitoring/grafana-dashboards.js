/**
 * grafana-dashboards.js — Programmatic Grafana Dashboard Generator
 *
 * Generates Grafana JSON dashboard definitions for all 50 Heady services.
 * φ-scaled refresh intervals, Fibonacci-sized time windows,
 * CSL-gated alert thresholds.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold, fibSequence } from '../shared/phi-math.js';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const REFRESH_INTERVAL   = '34s';        // fib(9)
const DEFAULT_TIME_RANGE = '89m';        // fib(11) minutes
const PANEL_HEIGHT       = 8;            // fib(6) grid units
const PANELS_PER_ROW     = 3;            // fib(4)

// ── Service Domains ─────────────────────────────────────
const SERVICE_DOMAINS = {
  inference:     ['heady-brain', 'heady-brains', 'heady-infer', 'ai-router', 'model-gateway'],
  memory:        ['heady-embed', 'heady-memory', 'heady-vector', 'heady-projection'],
  agents:        ['heady-bee-factory', 'heady-hive', 'heady-federation'],
  orchestration: ['heady-soul', 'heady-conductor', 'heady-orchestration', 'auto-success-engine', 'hcfullpipeline-executor', 'heady-chain', 'prompt-manager'],
  security:      ['heady-guard', 'heady-security', 'heady-governance', 'secret-gateway'],
  monitoring:    ['heady-health', 'heady-eval', 'heady-maintenance', 'heady-testing'],
  web:           ['heady-web', 'heady-buddy', 'heady-ui', 'heady-onboarding', 'heady-pilot-onboarding', 'heady-task-browser'],
  data:          ['heady-cache'],
  integration:   ['api-gateway', 'domain-router', 'mcp-server', 'google-mcp', 'memory-mcp', 'perplexity-mcp', 'jules-mcp', 'huggingface-gateway', 'colab-gateway', 'silicon-bridge', 'discord-bot'],
  specialized:   ['heady-vinci', 'heady-autobiographer', 'heady-midi', 'budget-tracker', 'cli-service'],
};

// ── Panel Generators ────────────────────────────────────
function requestRatePanel(service, gridPos) {
  return {
    title: `${service} — Request Rate`,
    type: 'timeseries',
    gridPos: { h: PANEL_HEIGHT, w: 24 / PANELS_PER_ROW, x: gridPos.x, y: gridPos.y },
    targets: [{
      expr: `rate(http_requests_total{service="${service}"}[5m])`,
      legendFormat: '{{method}} {{status}}',
    }],
    fieldConfig: { defaults: { unit: 'reqps' } },
  };
}

function latencyPanel(service, gridPos) {
  return {
    title: `${service} — Latency (p95)`,
    type: 'timeseries',
    gridPos: { h: PANEL_HEIGHT, w: 24 / PANELS_PER_ROW, x: gridPos.x, y: gridPos.y },
    targets: [{
      expr: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
      legendFormat: 'p95',
    }, {
      expr: `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service="${service}"}[5m]))`,
      legendFormat: 'p50',
    }],
    fieldConfig: { defaults: { unit: 's' } },
    thresholds: {
      steps: [
        { color: 'green', value: null },
        { color: 'yellow', value: PSI },        // 618ms
        { color: 'red', value: PHI },            // 1618ms
      ],
    },
  };
}

function errorRatePanel(service, gridPos) {
  return {
    title: `${service} — Error Rate`,
    type: 'stat',
    gridPos: { h: PANEL_HEIGHT, w: 24 / PANELS_PER_ROW, x: gridPos.x, y: gridPos.y },
    targets: [{
      expr: `sum(rate(http_requests_total{service="${service}",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="${service}"}[5m]))`,
      legendFormat: 'error rate',
    }],
    fieldConfig: { defaults: { unit: 'percentunit', thresholds: {
      steps: [
        { color: 'green', value: null },
        { color: 'yellow', value: 1 - CSL_THRESHOLDS.CRITICAL },  // ~7.3%
        { color: 'red', value: 1 - CSL_THRESHOLDS.HIGH },         // ~11.8%
      ],
    }}},
  };
}

function healthPanel(services, gridPos) {
  return {
    title: 'Service Health Grid',
    type: 'state-timeline',
    gridPos: { h: PANEL_HEIGHT * 2, w: 24, x: gridPos.x, y: gridPos.y },
    targets: services.map(s => ({
      expr: `up{service="${s}"}`,
      legendFormat: s,
    })),
    options: { showValue: 'never', mergeValues: true },
  };
}

function memoryPanel(gridPos) {
  return {
    title: 'Vector Memory — Embedding Operations',
    type: 'timeseries',
    gridPos: { h: PANEL_HEIGHT, w: 12, x: gridPos.x, y: gridPos.y },
    targets: [{
      expr: 'rate(heady_embedding_operations_total[5m])',
      legendFormat: '{{operation}}',
    }],
    fieldConfig: { defaults: { unit: 'ops' } },
  };
}

function cslGatePanel(gridPos) {
  return {
    title: 'CSL Gate — Confidence Distribution',
    type: 'histogram',
    gridPos: { h: PANEL_HEIGHT, w: 12, x: gridPos.x, y: gridPos.y },
    targets: [{
      expr: 'heady_csl_gate_score',
      legendFormat: '{{gate_type}}',
    }],
    fieldConfig: { defaults: { unit: 'none' } },
  };
}

// ── Dashboard Generator ─────────────────────────────────
/**
 * Generate a Grafana dashboard JSON for a service domain.
 */
export function generateDomainDashboard(domain, services) {
  let yPos = 0;
  const panels = [];

  // Health overview
  panels.push(healthPanel(services, { x: 0, y: yPos }));
  yPos += PANEL_HEIGHT * 2;

  // Per-service panels
  for (const service of services) {
    const colWidth = 24 / PANELS_PER_ROW;
    panels.push(requestRatePanel(service, { x: 0, y: yPos }));
    panels.push(latencyPanel(service, { x: colWidth, y: yPos }));
    panels.push(errorRatePanel(service, { x: colWidth * 2, y: yPos }));
    yPos += PANEL_HEIGHT;
  }

  return {
    dashboard: {
      id: null,
      uid: `heady-${domain}`,
      title: `Heady — ${domain.charAt(0).toUpperCase() + domain.slice(1)} Services`,
      tags: ['heady', domain, 'auto-generated'],
      timezone: 'browser',
      refresh: REFRESH_INTERVAL,
      time: { from: `now-${DEFAULT_TIME_RANGE}`, to: 'now' },
      panels,
      annotations: {
        list: [{
          builtIn: 1,
          datasource: '-- Grafana --',
          enable: true,
          hide: true,
          type: 'dashboard',
        }],
      },
      templating: {
        list: [{
          name: 'datasource',
          type: 'datasource',
          query: 'prometheus',
        }],
      },
    },
    overwrite: true,
  };
}

/**
 * Generate the master overview dashboard.
 */
export function generateOverviewDashboard() {
  let yPos = 0;
  const allServices = Object.values(SERVICE_DOMAINS).flat();
  const panels = [];

  panels.push(healthPanel(allServices, { x: 0, y: yPos }));
  yPos += PANEL_HEIGHT * 2;

  panels.push(memoryPanel({ x: 0, y: yPos }));
  panels.push(cslGatePanel({ x: 12, y: yPos }));
  yPos += PANEL_HEIGHT;

  // Domain summary stats
  for (const [domain, services] of Object.entries(SERVICE_DOMAINS)) {
    panels.push({
      title: `${domain} — Total Request Rate`,
      type: 'stat',
      gridPos: { h: 5, w: 4, x: (Object.keys(SERVICE_DOMAINS).indexOf(domain) % 6) * 4, y: yPos + Math.floor(Object.keys(SERVICE_DOMAINS).indexOf(domain) / 6) * 5 },
      targets: [{
        expr: `sum(rate(http_requests_total{service=~"${services.join('|')}"}[5m]))`,
        legendFormat: domain,
      }],
      fieldConfig: { defaults: { unit: 'reqps' } },
    });
  }

  return {
    dashboard: {
      id: null,
      uid: 'heady-overview',
      title: 'Heady — Platform Overview',
      tags: ['heady', 'overview', 'auto-generated'],
      timezone: 'browser',
      refresh: REFRESH_INTERVAL,
      time: { from: `now-${DEFAULT_TIME_RANGE}`, to: 'now' },
      panels,
    },
    overwrite: true,
  };
}

/**
 * Generate all dashboards.
 */
export function generateAllDashboards() {
  const dashboards = [generateOverviewDashboard()];
  for (const [domain, services] of Object.entries(SERVICE_DOMAINS)) {
    dashboards.push(generateDomainDashboard(domain, services));
  }
  return dashboards;
}

export { SERVICE_DOMAINS, CSL_THRESHOLDS };
export default { generateAllDashboards, generateOverviewDashboard, generateDomainDashboard, SERVICE_DOMAINS };
