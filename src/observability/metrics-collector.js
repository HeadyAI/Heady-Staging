/**
 * Heady™ Metrics Collector — Prometheus-compatible metrics
 * Custom counters, histograms, gauges for all services
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const { PHI, PSI, fib } = require('../shared/phi-math');

// φ-scaled histogram buckets (latency in ms)
// Base = fib(8) × fib(5)² = 21 × 25 ≈ φ-derived ~500ms start, then each bucket × φ
const BUCKET_BASE = fib(8) * fib(5) * fib(5);  // 525ms — pure Fibonacci
const LATENCY_BUCKETS = Array.from({ length: fib(6) }, (_, i) =>
  Math.round(BUCKET_BASE * Math.pow(PHI, i))
);  // [525, 849, 1374, 2222, 3596, 5817, 9413, 15230]

class MetricsCollector {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }
  
  incCounter(name, labels = {}, value = 1) {
    const key = this._key(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }
  
  setGauge(name, labels = {}, value) {
    const key = this._key(name, labels);
    this.gauges.set(key, value);
  }
  
  observeHistogram(name, labels = {}, value) {
    const key = this._key(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, { count: 0, sum: 0, buckets: new Array(LATENCY_BUCKETS.length).fill(0) });
    }
    const h = this.histograms.get(key);
    h.count++;
    h.sum += value;
    for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
      if (value <= LATENCY_BUCKETS[i]) h.buckets[i]++;
    }
  }
  
  toPrometheus() {
    const lines = [];
    
    for (const [key, value] of this.counters) {
      lines.push(`${key} ${value}`);
    }
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`);
    }
    for (const [key, h] of this.histograms) {
      lines.push(`${key}_count ${h.count}`);
      lines.push(`${key}_sum ${h.sum}`);
      for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
        lines.push(`${key}_bucket{le="${LATENCY_BUCKETS[i]}"} ${h.buckets[i]}`);
      }
      lines.push(`${key}_bucket{le="+Inf"} ${h.count}`);
    }
    
    return lines.join('\n');
  }
  
  _key(name, labels) {
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
    return labelStr ? `heady_${name}{service="${this.serviceName}",${labelStr}}` : `heady_${name}{service="${this.serviceName}"}`;
  }
  
  /**
   * Express middleware for auto-collecting request metrics
   */
  requestMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.incCounter('http_requests_total', { method: req.method, status: res.statusCode, path: req.route?.path || req.path });
        this.observeHistogram('http_request_duration_ms', { method: req.method }, duration);
        if (res.statusCode >= 500) {
          this.incCounter('http_errors_total', { method: req.method, status: res.statusCode });
        }
      });
      next();
    };
  }
}

module.exports = { MetricsCollector, LATENCY_BUCKETS };
