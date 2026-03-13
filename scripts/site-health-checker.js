#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HEADY™ SITE HEALTH CHECKER & AUTO-FIXER — Part 4 of 5         ║
 * ║  Validates all 44 site repos for fully-functional UIs           ║
 * ║  © 2026 HeadySystems Inc. — Eric Haywood, Founder              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;

// ═══════════════════════════════════════════════════════════════
// SITE REGISTRY — All 44 site repos with expected structure
// ═══════════════════════════════════════════════════════════════
const SITES = [
  // Primary product sites
  { repo: 'headyme',         domain: 'headyme.com',           type: 'product',     brand: 'HeadyMe' },
  { repo: 'headyme-com',     domain: 'headyme.com',           type: 'product-alt', brand: 'HeadyMe' },
  { repo: 'headysystems',    domain: 'headysystems.com',      type: 'product',     brand: 'HeadySystems' },
  { repo: 'headysystems-com',domain: 'headysystems.com',      type: 'product-alt', brand: 'HeadySystems' },
  { repo: 'headymcp',        domain: 'headymcp.com',          type: 'product',     brand: 'HeadyMCP' },
  { repo: 'headymcp-com',    domain: 'headymcp.com',          type: 'product-alt', brand: 'HeadyMCP' },
  { repo: 'headyio',         domain: 'headyio.com',           type: 'product',     brand: 'HeadyIO' },
  { repo: 'headyio-com',     domain: 'headyio.com',           type: 'product-alt', brand: 'HeadyIO' },
  { repo: 'headyos',         domain: 'headyos.com',           type: 'product',     brand: 'HeadyOS' },
  { repo: 'headybuddy-org',  domain: 'headybuddy.org',        type: 'product',     brand: 'HeadyBuddy' },
  { repo: 'headyconnection', domain: 'headyconnection.org',   type: 'product',     brand: 'HeadyConnection' },
  { repo: 'headyconnection-org', domain: 'headyconnection.org', type: 'product-alt', brand: 'HeadyConnection' },
  { repo: 'headydocs',       domain: 'docs.headysystems.com', type: 'docs',        brand: 'HeadyDocs' },
  { repo: 'headyapi',        domain: 'api.headysystems.com',  type: 'api',         brand: 'HeadyAPI' },
  { repo: '1ime1',           domain: '1ime1.com',             type: 'product',     brand: '1IME1' },
  { repo: 'instant',         domain: 'instant.headysystems.com', type: 'product',  brand: 'Instant' },

  // Tool/feature sites
  { repo: 'heady-atlas',     domain: 'atlas.headysystems.com',    type: 'tool', brand: 'Atlas' },
  { repo: 'heady-builder',   domain: 'builder.headysystems.com',  type: 'tool', brand: 'Builder' },
  { repo: 'heady-buddy-portal', domain: 'buddy.headysystems.com', type: 'tool', brand: 'Buddy Portal' },
  { repo: 'heady-chrome',    domain: 'chrome.headysystems.com',   type: 'extension', brand: 'Chrome Extension' },
  { repo: 'heady-critique',  domain: 'critique.headysystems.com', type: 'tool', brand: 'Critique' },
  { repo: 'heady-desktop',   domain: 'desktop.headysystems.com',  type: 'app',  brand: 'Desktop' },
  { repo: 'heady-discord',   domain: 'discord.headysystems.com',  type: 'integration', brand: 'Discord' },
  { repo: 'heady-discord-connection', domain: 'discord-connect.headysystems.com', type: 'integration', brand: 'Discord Connection' },
  { repo: 'heady-discord-connector',  domain: 'discord-connector.headysystems.com', type: 'integration', brand: 'Discord Connector' },
  { repo: 'heady-github-integration', domain: 'github.headysystems.com', type: 'integration', brand: 'GitHub' },
  { repo: 'heady-imagine',   domain: 'imagine.headysystems.com',  type: 'tool', brand: 'Imagine' },
  { repo: 'heady-jetbrains', domain: 'jetbrains.headysystems.com', type: 'extension', brand: 'JetBrains' },
  { repo: 'heady-jules',     domain: 'jules.headysystems.com',    type: 'tool', brand: 'Jules' },
  { repo: 'heady-kinetics',  domain: 'kinetics.headysystems.com', type: 'tool', brand: 'Kinetics' },
  { repo: 'heady-logs',      domain: 'logs.headysystems.com',     type: 'tool', brand: 'Logs' },
  { repo: 'heady-maestro',   domain: 'maestro.headysystems.com',  type: 'tool', brand: 'Maestro' },
  { repo: 'heady-metrics',   domain: 'metrics.headysystems.com',  type: 'tool', brand: 'Metrics' },
  { repo: 'heady-mobile',    domain: 'mobile.headysystems.com',   type: 'app',  brand: 'Mobile' },
  { repo: 'heady-montecarlo',domain: 'montecarlo.headysystems.com', type: 'tool', brand: 'Monte Carlo' },
  { repo: 'heady-observer',  domain: 'observer.headysystems.com', type: 'tool', brand: 'Observer' },
  { repo: 'heady-patterns',  domain: 'patterns.headysystems.com', type: 'tool', brand: 'Patterns' },
  { repo: 'heady-pythia',    domain: 'pythia.headysystems.com',   type: 'tool', brand: 'Pythia' },
  { repo: 'heady-sentinel',  domain: 'sentinel.headysystems.com', type: 'tool', brand: 'Sentinel' },
  { repo: 'heady-slack',     domain: 'slack.headysystems.com',    type: 'integration', brand: 'Slack' },
  { repo: 'heady-stories',   domain: 'stories.headysystems.com',  type: 'tool', brand: 'Stories' },
  { repo: 'heady-traces',    domain: 'traces.headysystems.com',   type: 'tool', brand: 'Traces' },
  { repo: 'heady-vinci',     domain: 'vinci.headysystems.com',    type: 'tool', brand: 'Vinci' },
  { repo: 'heady-vscode',    domain: 'vscode.headysystems.com',   type: 'extension', brand: 'VS Code' },
];

// ═══════════════════════════════════════════════════════════════
// VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════

function checkFile(basePath, file) {
  const full = path.join(basePath, file);
  return fs.existsSync(full) ? { ok: true, size: fs.statSync(full).size } : { ok: false, size: 0 };
}

function validateSite(site, basePath) {
  const issues = [];
  const checks = {};

  // Required files
  const requiredFiles = ['server.js', 'package.json', 'Dockerfile', 'dist/index.html'];
  for (const file of requiredFiles) {
    const result = checkFile(basePath, file);
    checks[file] = result.ok;
    if (!result.ok) issues.push(`Missing: ${file}`);
    if (result.ok && result.size < 50) issues.push(`Suspiciously small: ${file} (${result.size} bytes)`);
  }

  // Check index.html content quality
  const indexPath = path.join(basePath, 'dist/index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Must have proper HTML structure
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
      issues.push('index.html missing DOCTYPE');
    }
    if (!html.includes('<title>')) issues.push('index.html missing <title>');

    // Brand check
    if (!html.toLowerCase().includes('heady') && !html.toLowerCase().includes(site.brand.toLowerCase())) {
      issues.push(`index.html may not be branded (no reference to "${site.brand}")`);
    }

    // Check for Sacred Geometry CSS
    if (!html.includes('sacred') && !html.includes('phi') && !html.includes('golden')) {
      issues.push('No Sacred Geometry styling detected');
    }

    // Check for buddy widget
    if (!html.includes('buddy-widget') && !html.includes('HeadyBuddy')) {
      issues.push('HeadyBuddy widget not embedded');
    }

    checks['html_valid'] = issues.filter(i => i.includes('index.html')).length === 0;
  }

  // Check server.js for /health endpoint
  const serverPath = path.join(basePath, 'server.js');
  if (fs.existsSync(serverPath)) {
    const server = fs.readFileSync(serverPath, 'utf8');
    if (!server.includes('/health')) issues.push('server.js missing /health endpoint');
    if (!server.includes('/api/')) issues.push('server.js missing API proxy');

    // Check for correct SERVICE_NAME
    const nameMatch = server.match(/SERVICE_NAME\s*=\s*['"]([^'"]+)['"]/);
    if (nameMatch && nameMatch[1] !== site.repo) {
      issues.push(`SERVICE_NAME mismatch: "${nameMatch[1]}" should be "${site.repo}"`);
    }
    checks['server_valid'] = issues.filter(i => i.includes('server.js')).length === 0;
  }

  // Check for dist assets
  const distPath = path.join(basePath, 'dist');
  if (fs.existsSync(distPath)) {
    const hasCss = fs.existsSync(path.join(distPath, 'css'));
    const hasJs = fs.existsSync(path.join(distPath, 'js'));
    const hasLogo = fs.existsSync(path.join(distPath, 'logo.png')) ||
                    fs.existsSync(path.join(distPath, 'favicon.ico'));
    if (!hasCss) issues.push('Missing dist/css/ directory');
    if (!hasJs) issues.push('Missing dist/js/ directory');
    if (!hasLogo) issues.push('Missing logo/favicon');
    checks['assets'] = hasCss && hasJs && hasLogo;
  }

  // Score (φ-weighted)
  const weights = { 'server.js': PSI, 'dist/index.html': 1, 'html_valid': PSI*PSI, 'server_valid': PSI, 'assets': PSI*PSI*PSI };
  let score = 0, maxScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    maxScore += weight;
    if (checks[key]) score += weight;
  }

  return {
    repo: site.repo,
    domain: site.domain,
    brand: site.brand,
    score: maxScore > 0 ? score / maxScore : 0,
    issues,
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
function main() {
  const sitesRoot = process.argv[2] || './tier5-sites';
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  HEADY™ SITE HEALTH CHECKER                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Scanning: ${sitesRoot}`);
  console.log(`Sites: ${SITES.length}`);
  console.log('');

  let pass = 0, warn = 0, fail = 0;
  const results = [];

  for (const site of SITES) {
    const sitePath = path.join(sitesRoot, site.repo);
    if (!fs.existsSync(sitePath)) {
      console.log(`  ✗ ${site.repo} — not cloned`);
      fail++;
      results.push({ ...site, score: 0, issues: ['Repo not cloned'], checks: {} });
      continue;
    }

    const result = validateSite(site, sitePath);
    results.push(result);

    const pct = (result.score * 100).toFixed(0);
    const icon = result.score >= 0.85 ? '✓' : result.score >= 0.5 ? '⚠' : '✗';
    const color = result.score >= 0.85 ? '\x1b[32m' : result.score >= 0.5 ? '\x1b[33m' : '\x1b[31m';

    console.log(`  ${color}${icon}\x1b[0m ${site.repo.padEnd(30)} ${pct}% ${result.issues.length ? '(' + result.issues.length + ' issues)' : ''}`);

    if (result.score >= 0.85) pass++;
    else if (result.score >= 0.5) warn++;
    else fail++;
  }

  console.log('');
  console.log(`Results: ${pass} pass, ${warn} warn, ${fail} fail / ${SITES.length} total`);

  // Write JSON report
  const reportPath = path.join(sitesRoot, '..', 'site-health-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), sites: results }, null, 2));
  console.log(`Report: ${reportPath}`);
}

main();
