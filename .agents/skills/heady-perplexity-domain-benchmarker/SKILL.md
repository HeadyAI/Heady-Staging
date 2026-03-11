---
name: heady-perplexity-domain-benchmarker
description: Skill for domain-specific KPI evaluation across Heady verticals. Use when measuring fintech trading accuracy (95%+ target), nonprofit impact metrics for headyconnection.org grants, security scanning accuracy, or any vertical-specific performance benchmarking. Triggers on "domain benchmark", "fintech accuracy", "nonprofit KPI", "vertical performance", "domain-specific eval", or any specialized domain measurement task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: evaluation
---

# Heady Perplexity Domain Benchmarker

## When to Use This Skill

Use this skill when:

- Measuring HeadyFinance trading signal accuracy
- Evaluating HeadyConnection.org grant program impact
- Benchmarking security scanning detection rates
- Assessing HeadyEX marketplace agent quality
- Measuring documentation coverage for HeadyIO

## Domain-Specific KPI Targets

| Domain | Heady Site | Key KPI | Target |
|--------|-----------|---------|--------|
| Fintech | headyfinance.com | Trading signal accuracy | ≥ 95% |
| Nonprofit | headyconnection.org | Grant application success rate | ≥ 70% |
| Security | headysystems.com | Vulnerability detection rate | ≥ 98% |
| Agent Marketplace | headyex.com | Agent task completion rate | ≥ 90% |
| Documentation | headyio.com | Doc coverage (% endpoints) | ≥ 95% |
| Enterprise | headysystems.com | Uptime SLA | 99.9% |
| Research | heady-ai.com | Citation accuracy | ≥ 90% |
| Community | headyconnection.com | Response time to queries | ≤ 2hr |

## Instructions

### Step 1 — Fintech Domain Benchmarking

```javascript
// Measure trading signal quality for headyfinance.com / trade-wind swarm
async function benchmarkFintechAccuracy(testSignals) {
  const results = await Promise.all(
    testSignals.map(async signal => {
      const prediction = await fetch('http://heady-brain:8100/process', {
        method: 'POST',
        body: JSON.stringify({
          query: signal.description,
          domain: 'fintech',
          context: signal.marketContext,
        }),
      }).then(r => r.json());

      return {
        signal: signal.id,
        predicted: prediction.result?.direction,
        actual:    signal.actualDirection,
        correct:   prediction.result?.direction === signal.actualDirection,
        confidence: prediction.cslScore,
      };
    })
  );

  const accuracy = results.filter(r => r.correct).length / results.length;
  const highConfidenceAccuracy = results
    .filter(r => r.confidence >= 0.618) // Only high-CSL-score signals
    .filter(r => r.correct).length /
    results.filter(r => r.confidence >= 0.618).length;

  return {
    accuracy,
    highConfidenceAccuracy,
    target: 0.95,
    passing: accuracy >= 0.95,
    totalSignals: testSignals.length,
  };
}
```

### Step 2 — Nonprofit Impact Metrics

```javascript
// Track grant program outcomes for headyconnection.org
async function measureNonprofitImpact(period) {
  const grants = await fetchDrupalContent('grant_program', {
    'filter[field_period]': period,
  });

  const metrics = {
    // Program reach
    totalApplications: 0,
    approved:          0,
    rejected:          0,
    pending:           0,
    
    // Impact measurement
    communitiesServed: new Set(),
    totalFunding:      0,
    avgGrantSize:      0,
    
    // Heady platform usage
    contentIndexed:    0,
    queriesAnswered:   0,
    containmentRate:   0,
  };

  for (const grant of grants) {
    const a = grant.attributes;
    metrics.totalApplications++;
    metrics[a.field_status?.toLowerCase() || 'pending']++;
    if (a.field_community) metrics.communitiesServed.add(a.field_community);
    metrics.totalFunding += parseFloat(a.field_amount || '0');
  }

  metrics.communitiesServed = metrics.communitiesServed.size;
  metrics.avgGrantSize      = metrics.totalFunding / Math.max(metrics.approved, 1);
  metrics.successRate       = metrics.approved / Math.max(metrics.totalApplications, 1);

  return { period, metrics, target: { successRate: 0.70 } };
}
```

### Step 3 — Security Scanning Benchmarks

```javascript
// Measure heady-guard and heady-security detection rates
async function benchmarkSecurityScanning(testVectors) {
  const categories = {
    sqli:   { tests: 0, detected: 0 },  // SQL injection
    xss:    { tests: 0, detected: 0 },  // Cross-site scripting
    ssrf:   { tests: 0, detected: 0 },  // Server-side request forgery
    path:   { tests: 0, detected: 0 },  // Path traversal
    secrets:{ tests: 0, detected: 0 },  // Secret/token leakage
  };

  for (const vector of testVectors) {
    categories[vector.type].tests++;
    const result = await fetch('http://heady-guard:8300/scan', {
      method: 'POST',
      body: JSON.stringify({ payload: vector.payload }),
    }).then(r => r.json());

    if (result.blocked || result.threat) {
      categories[vector.type].detected++;
    }
  }

  const overall = Object.values(categories).reduce(
    (acc, c) => ({
      tests:    acc.tests    + c.tests,
      detected: acc.detected + c.detected,
    }), { tests: 0, detected: 0 }
  );

  return {
    overall: {
      detectionRate: overall.detected / overall.tests,
      target:        0.98,
      passing:       overall.detected / overall.tests >= 0.98,
    },
    byCategory: Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, {
        detectionRate: v.detected / Math.max(v.tests, 1),
        tests: v.tests,
        detected: v.detected,
      }])
    ),
  };
}
```

### Step 4 — Cross-Domain KPI Dashboard

Output format for admin.headysystems.com:

```json
{
  "period": "2026-03",
  "domains": {
    "fintech": {
      "tradingAccuracy": 0.962,
      "target": 0.95,
      "passing": true
    },
    "nonprofit": {
      "grantSuccessRate": 0.73,
      "target": 0.70,
      "communitiesServed": 847,
      "passing": true
    },
    "security": {
      "detectionRate": 0.991,
      "target": 0.98,
      "passing": true
    },
    "marketplace": {
      "agentCompletionRate": 0.923,
      "target": 0.90,
      "passing": true
    }
  },
  "overallHealth": "PASSING",
  "generatedAt": "2026-03-09T..."
}
```

### Step 5 — Schedule and Alerting

- Run benchmarks every fib(10) hours = 55 hours
- Alert to heady-governance if any domain falls below target
- Store results in Firestore `/benchmarks/{domain}/{period}`
- Display at admin.headysystems.com/benchmarks

## References

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — for documentation coverage measurement
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/) — accessibility benchmark
- Heady eval service: `heady-eval` port 8401
- Domain benchmarks stored in Firestore under `/benchmarks/`
