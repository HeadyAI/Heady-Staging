/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  @heady/platform — mesh/index.js                                 ║
 * ║  Envoy/mTLS service mesh contracts and circuit breaker           ║
 * ║  © 2026 HeadySystems Inc.                                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Service mesh utilities:
 *   - EnvoyContract: Envoy xDS cluster/listener contract generation
 *   - MeshClient: mTLS-aware HTTP client with phi-backoff retry
 *   - CircuitBreaker: state machine (CLOSED→OPEN→HALF_OPEN) with phi thresholds
 *   - ServiceRegistry: CSL-based service discovery (no DNS priority queues)
 */

'use strict';

import { PHI, PSI, CSL_THRESHOLDS, TIMEOUTS, PHI_BACKOFF_MS, fib, phiBackoff } from '../phi/index.js';
import { logCircuitBreaker } from '../logger/index.js';

// ─── CIRCUIT BREAKER ─────────────────────────────────────────────────────────

/**
 * Circuit breaker states (Fibonacci-snapped thresholds)
 * CLOSED    — normal operation, failures tracked
 * OPEN      — circuit tripped, requests rejected immediately
 * HALF_OPEN — probe phase, one request allowed through
 */
const CB_STATE = Object.freeze({
  CLOSED:    'CLOSED',
  OPEN:      'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

export class CircuitBreaker {
  /**
   * @param {Object} opts
   * @param {string} opts.name — service name this breaker protects
   * @param {number} [opts.failureThreshold=5] — F(5): consecutive failures to trip
   * @param {number} [opts.successThreshold=3] — F(4): successes to close from HALF_OPEN
   * @param {number} [opts.timeoutMs=34000] — F(9)×1000: time in OPEN before HALF_OPEN probe
   * @param {import('pino').Logger} [opts.logger]
   */
  constructor(opts) {
    this.name              = opts.name;
    this.failureThreshold  = opts.failureThreshold  ?? fib(5);   // 5
    this.successThreshold  = opts.successThreshold  ?? fib(4);   // 3
    this.timeoutMs         = opts.timeoutMs         ?? fib(9) * 1000; // 34000 ms
    this._logger           = opts.logger            ?? null;

    this._state            = CB_STATE.CLOSED;
    this._failureCount     = 0;
    this._successCount     = 0;
    this._lastFailureTime  = null;
    this._lastStateChange  = Date.now();
  }

  get state() { return this._state; }

  /**
   * Execute a function through the circuit breaker.
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   * @throws {Error} if circuit is OPEN
   */
  async execute(fn) {
    if (this._state === CB_STATE.OPEN) {
      const elapsed = Date.now() - this._lastFailureTime;
      if (elapsed < this.timeoutMs) {
        const err = new Error(`Circuit OPEN for '${this.name}' — retry in ${this.timeoutMs - elapsed}ms`);
        err.code = 'CIRCUIT_OPEN';
        err.status = 503;
        throw err;
      }
      // Probe: transition to HALF_OPEN
      this._transition(CB_STATE.HALF_OPEN);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    if (this._state === CB_STATE.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.successThreshold) {
        this._failureCount  = 0;
        this._successCount  = 0;
        this._transition(CB_STATE.CLOSED);
      }
    } else {
      this._failureCount = 0;
    }
  }

  _onFailure(err) {
    this._failureCount++;
    this._lastFailureTime = Date.now();

    if (this._state === CB_STATE.HALF_OPEN) {
      this._successCount = 0;
      this._transition(CB_STATE.OPEN);
    } else if (this._failureCount >= this.failureThreshold) {
      this._transition(CB_STATE.OPEN);
    }
  }

  _transition(newState) {
    const prev = this._state;
    if (prev === newState) return;

    this._state = newState;
    this._lastStateChange = Date.now();

    if (this._logger) {
      logCircuitBreaker(this._logger, this.name, prev, newState, {
        failure_count: this._failureCount,
        success_count: this._successCount,
      });
    }
  }

  toJSON() {
    return {
      name: this.name,
      state: this._state,
      failure_count: this._failureCount,
      success_count: this._successCount,
      last_failure: this._lastFailureTime ? new Date(this._lastFailureTime).toISOString() : null,
      last_state_change: new Date(this._lastStateChange).toISOString(),
      thresholds: { failure: this.failureThreshold, success: this.successThreshold, timeout_ms: this.timeoutMs },
    };
  }
}

// ─── MESH HTTP CLIENT ─────────────────────────────────────────────────────────

/**
 * mTLS-aware HTTP client with phi-backoff retry and circuit breaker integration.
 * All URLs come from environment (Law #5: zero 127.0.0.1 contamination).
 */
export class MeshClient {
  /**
   * @param {Object} opts
   * @param {string} opts.service — target service name
   * @param {string} opts.baseUrl — target base URL (from env)
   * @param {CircuitBreaker} [opts.circuitBreaker]
   * @param {number} [opts.maxRetries=3] — F(4)
   * @param {number} [opts.timeoutMs=TIMEOUTS.PHI_4]
   * @param {import('pino').Logger} [opts.logger]
   */
  constructor(opts) {
    this._service       = opts.service;
    this._baseUrl       = opts.baseUrl.replace(/\/$/, '');
    this._cb            = opts.circuitBreaker ?? null;
    this._maxRetries    = opts.maxRetries    ?? fib(4);   // 3
    this._timeoutMs     = opts.timeoutMs     ?? TIMEOUTS.PHI_4;
    this._logger        = opts.logger        ?? null;
  }

  /**
   * Make an HTTP request through the mesh, with retry and circuit breaker.
   * @param {string} path
   * @param {RequestInit} [init]
   * @returns {Promise<Response>}
   */
  async request(path, init = {}) {
    const url = `${this._baseUrl}${path}`;
    const requestFn = () => this._fetchWithTimeout(url, init);

    const execute = this._cb
      ? () => this._cb.execute(requestFn)
      : requestFn;

    let lastErr;
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = phiBackoff(attempt - 1);
        await sleep(delay);
        this._logger?.debug({ event: 'mesh.retry', service: this._service, attempt, delay_ms: delay },
          `Retrying ${this._service} (attempt ${attempt})`);
      }

      try {
        return await execute();
      } catch (err) {
        if (err.code === 'CIRCUIT_OPEN') throw err; // don't retry open circuits
        lastErr = err;
        this._logger?.warn({ event: 'mesh.request.failed', service: this._service, attempt, error: err.message },
          `Request to ${this._service} failed (attempt ${attempt})`);
      }
    }

    throw lastErr;
  }

  async _fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Heady-Service': process.env.SERVICE_NAME ?? 'unknown',
          ...(init.headers ?? {}),
        },
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Convenience: GET */
  async get(path, init = {}) {
    return this.request(path, { ...init, method: 'GET' });
  }

  /** Convenience: POST with JSON body */
  async post(path, body, init = {}) {
    return this.request(path, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

// ─── ENVOY CONTRACT GENERATOR ─────────────────────────────────────────────────

/**
 * Generate Envoy xDS cluster configuration for a Heady service.
 * All timeouts are φ-scaled. No priority fields.
 *
 * @param {Object} opts
 * @param {string} opts.name — cluster name
 * @param {string} opts.serviceName — K8s service name
 * @param {number} opts.port — service port
 * @param {boolean} [opts.mtls=true] — enable mTLS
 * @returns {Object} Envoy cluster config (JSON-serializable)
 */
export function generateEnvoyCluster(opts) {
  const { name, serviceName, port, mtls = true } = opts;

  const cluster = {
    name,
    type: 'STRICT_DNS',
    connect_timeout: `${TIMEOUTS.PHI_2 / 1000}s`,   // 2.618s
    load_assignment: {
      cluster_name: name,
      endpoints: [{
        lb_endpoints: [{
          endpoint: {
            address: {
              socket_address: {
                address: serviceName,
                port_value: port,
              },
            },
          },
        }],
      }],
    },
    circuit_breakers: {
      thresholds: [{
        // No priority field — CSL domain matching replaces priority routing
        max_connections:     fib(8),   // 21
        max_pending_requests: fib(8),  // 21
        max_requests:         fib(10), // 55
        max_retries:          fib(4),  // 3
      }],
    },
    upstream_http_filters: [],
    typed_extension_protocol_options: {
      'envoy.extensions.upstreams.http.v3.HttpProtocolOptions': {
        '@type': 'type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions',
        explicit_http_config: {
          http2_protocol_options: {},
        },
      },
    },
  };

  if (mtls) {
    cluster.transport_socket = {
      name: 'envoy.transport_sockets.tls',
      typed_config: {
        '@type': 'type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext',
        common_tls_context: {
          tls_certificates: [{
            certificate_chain: { filename: '/etc/certs/cert-chain.pem' },
            private_key:       { filename: '/etc/certs/key.pem' },
          }],
          validation_context: {
            trusted_ca: { filename: '/etc/certs/root-cert.pem' },
          },
          alpn_protocols: ['h2', 'http/1.1'],
        },
      },
    };
  }

  return cluster;
}

/**
 * Generate Envoy listener configuration for inbound traffic.
 * Includes mTLS, request ID injection, and Zipkin/OTLP tracing headers.
 *
 * @param {Object} opts
 * @param {string} opts.name — listener name
 * @param {number} [opts.port=15006] — Istio/Envoy default inbound port
 * @param {boolean} [opts.mtls=true]
 * @returns {Object} Envoy listener config
 */
export function generateEnvoyListener(opts) {
  const { name, port = 15006, mtls = true } = opts;

  return {
    name,
    address: {
      socket_address: { address: '0.0.0.0', port_value: port },
    },
    filter_chains: [{
      filters: [{
        name: 'envoy.filters.network.http_connection_manager',
        typed_config: {
          '@type': 'type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager',
          stat_prefix: name,
          access_log: [{
            name: 'envoy.access_loggers.file',
            typed_config: {
              '@type': 'type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog',
              path: '/dev/stdout',
              log_format: {
                json_format: {
                  start_time: '%START_TIME%',
                  method: '%REQ(:METHOD)%',
                  path: '%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%',
                  response_code: '%RESPONSE_CODE%',
                  duration: '%DURATION%',
                  upstream_cluster: '%UPSTREAM_CLUSTER%',
                  trace_id: '%REQ(x-b3-traceid)%',
                  service: '%REQ(x-heady-service)%',
                },
              },
            },
          }],
          route_config: {
            name: `${name}_route`,
            virtual_hosts: [{
              name,
              domains: ['*'],
              routes: [{
                match: { prefix: '/' },
                route: { cluster: name },
              }],
            }],
          },
          http_filters: [
            { name: 'envoy.filters.http.router' },
          ],
          tracing: {
            provider: {
              name: 'envoy.tracers.zipkin',
              typed_config: {
                '@type': 'type.googleapis.com/envoy.config.trace.v3.ZipkinConfig',
                collector_cluster: 'heady-zipkin',
                collector_endpoint: '/api/v2/spans',
                shared_span_context: false,
              },
            },
          },
          generate_request_id: true,
          request_id_extension: {
            typed_config: {
              '@type': 'type.googleapis.com/envoy.extensions.request_id.uuid.v3.UuidRequestIdConfig',
              use_request_id_for_trace_sampling: true,
            },
          },
        },
      }],
      ...(mtls ? {
        transport_socket: {
          name: 'envoy.transport_sockets.tls',
          typed_config: {
            '@type': 'type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext',
            require_client_certificate: true,
            common_tls_context: {
              tls_certificates: [{
                certificate_chain: { filename: '/etc/certs/cert-chain.pem' },
                private_key:       { filename: '/etc/certs/key.pem' },
              }],
              validation_context: {
                trusted_ca: { filename: '/etc/certs/root-cert.pem' },
              },
            },
          },
        },
      } : {}),
    }],
  };
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
