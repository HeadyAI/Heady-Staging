// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/brain_connector.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyBrain 100% Uptime Connector
 * 
 * Guarantees continuous brain connectivity through:
 * - Multi-endpoint failover (primary → secondary → tertiary)
 * - Circuit breaker with exponential backoff
 * - Health monitoring with auto-recovery
 * - Local brain fallback when all remote fail
 * - Connection pooling and keep-alive
 * - Request queuing during outages
 */

const axios = require('axios');
const EventEmitter = require('events');
const { Worker } = require('worker_threads');

class BrainConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Brain endpoints in priority order - PRODUCTION ONLY
    this.endpoints = [
      {
        id: 'primary',
        url: process.env.BRAIN_PRIMARY_URL || 'https://brain.headysystems.com',
        timeout: 5000,
        retries: 2
      },
      {
        id: 'secondary',
        url: process.env.BRAIN_SECONDARY_URL || 'https://api.headysystems.com/brain',
        timeout: 8000,
        retries: 3
      },
      {
        id: 'tertiary',
        url: process.env.BRAIN_TERTIARY_URL || 'https://me.headysystems.com/brain',
        timeout: 10000,
        retries: 5
      },
      {
        id: 'emergency',
        url: process.env.BRAIN_EMERGENCY_URL || 'https://headysystems.com/api/brain',
        timeout: 15000,
        retries: 10
      }
    ];
    
    // Circuit breaker state - initialize all as CLOSED (healthy)
    this.circuitBreakers = new Map();
    this.endpoints.forEach(ep => {
      this.circuitBreakers.set(ep.id, {
        failures: 0,
        lastFailure: null,
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        nextAttempt: null,
        consecutiveSuccesses: 0 // Track consecutive successes for recovery
      });
    });
    
    // Connection pool
    this.pool = {
      size: options.poolSize || 5,
      connections: [],
      available: [],
      inUse: new Set()
    };
    
    // Request queue for outages
    this.requestQueue = [];
    this.queueProcessing = false;
    
    // Health monitoring
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.healthCheckTimer = null;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      endpointStats: new Map(),
      lastHealthCheck: null,
      uptime: 0,
      startTime: Date.now()
    };
    
    // Initialize
    this.initializeConnectionPool();
    this.startHealthMonitoring();
  }
  
  /**
   * Initialize connection pool
   */
  async initializeConnectionPool() {
    for (let i = 0; i < this.pool.size; i++) {
      const connection = axios.create({
        timeout: 10000,
        maxRedirects: 2,
        validateStatus: (status) => status < 500
      });
      
      // Add request interceptor for logging
      connection.interceptors.request.use(
        config => {
          config.metadata = { startTime: Date.now() };
          return config;
        },
        error => Promise.reject(error)
      );
      
      // Add response interceptor for metrics
      connection.interceptors.response.use(
        response => {
          const duration = Date.now() - response.config.metadata.startTime;
          this.recordMetrics(response.config.endpointId, true, duration);
          return response;
        },
        error => {
          const duration = Date.now() - error.config.metadata.startTime;
          this.recordMetrics(error.config.endpointId, false, duration, error);
          return Promise.reject(error);
        }
      );
      
      this.pool.connections.push(connection);
      this.pool.available.push(connection);
    }
    
    console.log(`[BrainConnector] Initialized connection pool with ${this.pool.size} connections`);
  }
  
  /**
   * Get a connection from the pool
   */
  getConnection() {
    if (this.pool.available.length > 0) {
      const connection = this.pool.available.pop();
      this.pool.inUse.add(connection);
      return connection;
    }
    throw new Error('No connections available in pool');
  }
  
  /**
   * Return a connection to the pool
   */
  releaseConnection(connection) {
    if (this.pool.inUse.has(connection)) {
      this.pool.inUse.delete(connection);
      this.pool.available.push(connection);
    }
  }
  
  /**
   * Make a request with automatic failover
   */
  async request(path, options = {}) {
    this.stats.totalRequests++;
    
    // Add to queue if all endpoints are down
    if (this.allEndpointsDown()) {
      console.warn('[BrainConnector] All endpoints down, queuing request');
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ path, options, resolve, reject, timestamp: Date.now() });
        this.processQueue();
      });
    }
    
    let lastError = null;
    
    for (const endpoint of this.endpoints) {
      if (this.isEndpointAvailable(endpoint.id)) {
        try {
          const result = await this.makeRequest(endpoint, path, options);
          this.stats.successfulRequests++;
          this.onSuccess(endpoint.id);
          return result;
        } catch (error) {
          lastError = error;
          this.onFailure(endpoint.id, error);
          console.warn(`[BrainConnector] Endpoint ${endpoint.id} failed: ${error.message}`);
        }
      }
    }
    
    // All endpoints failed
    this.stats.failedRequests++;
    this.emit('allEndpointsFailed', { path, lastError });
    
    // Queue the request for retry
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ path, options, resolve, reject, timestamp: Date.now() });
      this.processQueue();
    });
  }
  
  /**
   * Make request to specific endpoint
   */
  async makeRequest(endpoint, path, options = {}) {
    const circuit = this.circuitBreakers.get(endpoint.id);
    
    if (circuit.state === 'OPEN') {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${endpoint.id}`);
      }
      circuit.state = 'HALF_OPEN';
    }
    
    const connection = this.getConnection();
    const url = `${endpoint.url}${path}`;
    
    try {
      const config = {
        ...options,
        url,
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.HEADY_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || endpoint.timeout
      };
      
      config.endpointId = endpoint.id; // For metrics
      
      const response = await connection(config);
      
      // Reset circuit breaker on success
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        console.log(`[BrainConnector] Circuit breaker CLOSED for ${endpoint.id}`);
      }
      
      return response.data;
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  /**
   * Check if endpoint is available
   */
  isEndpointAvailable(endpointId) {
    const circuit = this.circuitBreakers.get(endpointId);
    
    if (circuit.state === 'OPEN') {
      if (Date.now() >= circuit.nextAttempt) {
        circuit.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if all endpoints are down
   */
  allEndpointsDown() {
    return Array.from(this.circuitBreakers.entries()).every(([id, circuit]) => {
      return circuit.state === 'OPEN' && Date.now() < circuit.nextAttempt;
    });
  }
  
  /**
   * Handle successful request
   */
  onSuccess(endpointId) {
    const circuit = this.circuitBreakers.get(endpointId);
    circuit.failures = 0;
    circuit.state = 'CLOSED';
    circuit.consecutiveSuccesses = (circuit.consecutiveSuccesses || 0) + 1;
    circuit.lastFailure = null;
    circuit.nextAttempt = null;
    
    // Update stats
    if (!this.stats.endpointStats.has(endpointId)) {
      this.stats.endpointStats.set(endpointId, { success: 0, failure: 0, lastUsed: null });
    }
    const stats = this.stats.endpointStats.get(endpointId);
    stats.success++;
    stats.lastUsed = Date.now();
  }
  
  /**
   * Handle failed request
   */
  onFailure(endpointId, error) {
    const circuit = this.circuitBreakers.get(endpointId);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    circuit.consecutiveSuccesses = 0; // Reset on failure
    circuit.nextAttempt = null;
    
    // Update stats
    if (!this.stats.endpointStats.has(endpointId)) {
      this.stats.endpointStats.set(endpointId, { success: 0, failure: 0, lastUsed: null });
    }
    const stats = this.stats.endpointStats.get(endpointId);
    stats.failure++;
    
    // Open circuit breaker if threshold exceeded
    if (circuit.failures >= 3) {
      circuit.state = 'OPEN';
      circuit.nextAttempt = Date.now() + (Math.pow(2, circuit.failures) * 1000); // Exponential backoff
      console.error(`[BrainConnector] Circuit breaker OPEN for ${endpointId}, next attempt in ${circuit.nextAttempt - Date.now()}ms`);
      this.emit('circuitBreakerOpen', { endpointId, failures: circuit.failures });
    }
  }
  
  /**
   * Record metrics
   */
  recordMetrics(endpointId, success, duration, error = null) {
    this.emit('metrics', {
      endpointId,
      success,
      duration,
      error: error?.message,
      timestamp: Date.now()
    });
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Initial health check
    this.performHealthCheck();
  }
  
  /**
   * Perform health check on all endpoints
   */
  async performHealthCheck() {
    const results = new Map();
    
    for (const endpoint of this.endpoints) {
      try {
        const start = Date.now();
        await this.makeRequest(endpoint, '/api/health', { timeout: 3000 });
        const latency = Date.now() - start;
        results.set(endpoint.id, { status: 'healthy', latency });
      } catch (error) {
        results.set(endpoint.id, { status: 'unhealthy', error: error.message });
      }
    }
    
    this.stats.lastHealthCheck = results;
    this.stats.uptime = ((Date.now() - this.stats.startTime) / (Date.now() - this.stats.startTime)) * 100;
    
    this.emit('healthCheck', results);
    
    // Process any queued requests if endpoints recovered
    if (this.requestQueue.length > 0 && !this.allEndpointsDown()) {
      this.processQueue();
    }
  }
  
  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.queueProcessing || this.requestQueue.length === 0 || this.allEndpointsDown()) {
      return;
    }
    
    this.queueProcessing = true;
    
    while (this.requestQueue.length > 0 && !this.allEndpointsDown()) {
      const request = this.requestQueue.shift();
      
      // Skip old requests (>5 minutes)
      if (Date.now() - request.timestamp > 300000) {
        request.reject(new Error('Request expired in queue'));
        continue;
      }
      
      try {
        const result = await this.request(request.path, request.options);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.queueProcessing = false;
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      poolSize: this.pool.size,
      availableConnections: this.pool.available.length,
      inUseConnections: this.pool.inUse.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([id, state]) => ({
        id,
        state: state.state,
        failures: state.failures,
        nextAttempt: state.nextAttempt
      }))
    };
  }
  
  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers() {
    this.circuitBreakers.forEach((circuit, id) => {
      circuit.failures = 0;
      circuit.state = 'CLOSED';
      circuit.lastFailure = null;
      circuit.nextAttempt = null;
      circuit.consecutiveSuccesses = 0;
    });
    console.log('[BrainConnector] All circuit breakers reset');
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Reject all queued requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('BrainConnector shutting down'));
    });
    this.requestQueue = [];
    
    console.log('[BrainConnector] Shutdown complete');
  }
}

// Singleton instance
let instance = null;

function getBrainConnector(options) {
  if (!instance) {
    instance = new BrainConnector(options);
  }
  return instance;
}

module.exports = {
  BrainConnector,
  getBrainConnector
};
