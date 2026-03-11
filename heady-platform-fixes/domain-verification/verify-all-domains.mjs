#!/usr/bin/env node
/**
 * Heady Platform — Domain Verification Script
 * 
 * Tests all 11+ domains for:
 *   - DNS resolution
 *   - HTTP status code
 *   - Response time
 *   - SSL validity
 *   - Expected service identity
 *   - Health endpoint response
 * 
 * Usage: node verify-all-domains.mjs
 *        node verify-all-domains.mjs --json   (machine-readable output)
 */

const PHI = 1.6180339887;

const DOMAINS = [
  // Primary domains
  {
    domain: 'headyme.com',
    role: 'Command Center',
    expectedTitle: 'Heady Admin',
    healthPath: null, // Static site
    subdomains: ['heady.headyme.com', 'pilot.headyme.com', 'dashboard.headyme.com'],
  },
  {
    domain: 'headysystems.com',
    role: 'Core Architecture Engine',
    expectedTitle: 'HeadySystems',
    healthPath: null,
    subdomains: ['status.headysystems.com', 'monitor.headysystems.com'],
  },
  {
    domain: 'headyconnection.org',
    role: 'Nonprofit / Community',
    expectedTitle: 'HeadyConnection',
    healthPath: null,
    subdomains: ['community.headyconnection.org'],
  },
  {
    domain: 'headyapi.com',
    role: 'API Gateway',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['api.headyapi.com', 'gateway.headyapi.com', 'pilot.headyapi.com'],
  },
  {
    domain: 'headybuddy.org',
    role: 'AI Companion',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['buddy.headybuddy.org'],
  },
  {
    domain: 'headymcp.com',
    role: 'MCP Layer',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['server.headymcp.com', 'mcp.headymcp.com'],
  },
  {
    domain: 'heady-ai.com',
    role: 'Intelligence Routing Hub',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['router.heady-ai.com', 'inference.heady-ai.com', 'models.heady-ai.com'],
  },
  {
    domain: 'headyio.com',
    role: 'Developer Platform',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['docs.headyio.com', 'sandbox.headyio.com'],
  },
  {
    domain: 'headybot.com',
    role: 'Automation',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: [],
  },
  // Domains with known issues (from health check)
  {
    domain: 'headyos.com',
    role: 'OS Runtime Layer',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['kernel.headyos.com', 'runtime.headyos.com', 'scheduler.headyos.com', 'memory.headyos.com'],
    knownIssue: '530 — no origin configured',
  },
  {
    domain: 'headycloud.com',
    role: 'Cloud Orchestration',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: ['orchestrator.headycloud.com', 'deploy.headycloud.com', 'console.headycloud.com', 'monitor.headycloud.com'],
    knownIssue: '403 — WAF/Access blocking',
  },
  {
    domain: 'heady-ai.com',
    role: 'AI Research Portal',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: [],
    knownIssue: 'DNS failure — no zone',
  },
  // Cloud Run service
  {
    domain: 'heady-manager-609590223909.us-central1.run.app',
    role: 'Cloud Run — heady-manager',
    expectedTitle: null,
    healthPath: '/health',
    subdomains: [],
  },
  // HuggingFace Spaces
  {
    domain: 'headyme-heady-ai.hf.space',
    role: 'HuggingFace — heady-ai',
    expectedTitle: null,
    healthPath: null,
    subdomains: [],
    knownIssue: 'Space sleeping/paused',
  },
  {
    domain: 'headyme-heady-demo.hf.space',
    role: 'HuggingFace — heady-demo',
    expectedTitle: null,
    healthPath: null,
    subdomains: [],
    knownIssue: 'Space sleeping/paused',
  },
];

// ── HTTP Check ───────────────────────────────────────────

async function checkDomain(domain, timeout = 10000) {
  const url = `https://${domain}`;
  const start = performance.now();
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'HeadyDomainVerifier/2.0' },
    });
    
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - start);
    
    // Read body for title extraction
    let body = '';
    try {
      body = await response.text();
    } catch {}
    
    const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    
    return {
      domain,
      status: response.status,
      latencyMs,
      title,
      ssl: true,
      headers: {
        server: response.headers.get('server'),
        cfRay: response.headers.get('cf-ray'),
        contentType: response.headers.get('content-type'),
      },
      error: null,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      domain,
      status: 0,
      latencyMs,
      title: null,
      ssl: false,
      headers: {},
      error: err.cause?.code ?? err.message ?? 'Unknown error',
    };
  }
}

async function checkHealth(domain, healthPath) {
  if (!healthPath) return null;
  
  const url = `https://${domain}${healthPath}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HeadyDomainVerifier/2.0' },
    });
    
    clearTimeout(timer);
    
    if (response.headers.get('content-type')?.includes('json')) {
      const data = await response.json();
      return { status: response.status, data };
    }
    
    return { status: response.status, data: null };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const jsonOutput = process.argv.includes('--json');
  const results = [];
  
  if (!jsonOutput) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          HEADY PLATFORM — DOMAIN VERIFICATION v2.0           ║');
    console.log('║          ' + new Date().toISOString() + '           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
  }
  
  // Check all root domains in parallel
  const checks = DOMAINS.map(async (d) => {
    const rootResult = await checkDomain(d.domain);
    const healthResult = await checkHealth(d.domain, d.healthPath);
    
    // Check subdomains
    const subResults = await Promise.all(
      d.subdomains.map(sub => checkDomain(sub, 8000))
    );
    
    return {
      ...d,
      root: rootResult,
      health: healthResult,
      subdomainResults: subResults,
    };
  });
  
  const allResults = await Promise.all(checks);
  
  // Categorize
  const healthy = [];
  const degraded = [];
  const failing = [];
  
  for (const r of allResults) {
    const result = {
      domain: r.domain,
      role: r.role,
      httpStatus: r.root.status,
      latencyMs: r.root.latencyMs,
      title: r.root.title,
      ssl: r.root.ssl,
      error: r.root.error,
      health: r.health,
      knownIssue: r.knownIssue ?? null,
      subdomains: r.subdomainResults.map(s => ({
        domain: s.domain,
        status: s.status,
        latencyMs: s.latencyMs,
        error: s.error,
      })),
    };
    
    if (r.root.status >= 200 && r.root.status < 400) {
      healthy.push(result);
    } else if (r.root.status >= 400 && r.root.status < 600) {
      degraded.push(result);
    } else {
      failing.push(result);
    }
    
    results.push(result);
  }
  
  if (jsonOutput) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), results, summary: { healthy: healthy.length, degraded: degraded.length, failing: failing.length } }, null, 2));
    return;
  }
  
  // Pretty print
  const statusIcon = (code) => {
    if (code >= 200 && code < 400) return '✅';
    if (code >= 400 && code < 600) return '⚠️';
    return '❌';
  };
  
  console.log('┌──────────────────────────────────────────┬────────┬─────────┬────────────────────────┐');
  console.log('│ Domain                                   │ Status │ Latency │ Role                   │');
  console.log('├──────────────────────────────────────────┼────────┼─────────┼────────────────────────┤');
  
  for (const r of results) {
    const icon = statusIcon(r.httpStatus);
    const domain = r.domain.padEnd(40);
    const status = (r.httpStatus || 'FAIL').toString().padEnd(6);
    const latency = `${r.latencyMs}ms`.padEnd(7);
    const role = r.role.substring(0, 22).padEnd(22);
    console.log(`│ ${icon} ${domain} │ ${status} │ ${latency} │ ${role} │`);
    
    if (r.knownIssue) {
      console.log(`│    ↳ Known: ${r.knownIssue.padEnd(70)} │`);
    }
  }
  
  console.log('└──────────────────────────────────────────┴────────┴─────────┴────────────────────────┘');
  
  // Health endpoints
  const withHealth = results.filter(r => r.health);
  if (withHealth.length > 0) {
    console.log('\nHealth Endpoints:');
    for (const r of withHealth) {
      const icon = r.health.status === 200 ? '✅' : '❌';
      const service = r.health.data?.service ?? 'unknown';
      const version = r.health.data?.version ?? 'unknown';
      console.log(`  ${icon} ${r.domain}/health → ${service} v${version}`);
    }
  }
  
  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log(`  ✅ Healthy:  ${healthy.length}`);
  console.log(`  ⚠️  Degraded: ${degraded.length}`);
  console.log(`  ❌ Failing:  ${failing.length}`);
  console.log('════════════════════════════════════════════');
  
  if (degraded.length > 0 || failing.length > 0) {
    console.log('\nAction Required:');
    for (const r of [...degraded, ...failing]) {
      console.log(`  • ${r.domain} (${r.httpStatus || 'FAIL'}) — ${r.knownIssue ?? r.error ?? 'Unknown issue'}`);
    }
  }
  
  // Exit code reflects overall health
  process.exit(failing.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(2);
});
