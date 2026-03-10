/**
 * ip-anomaly-detector.js — CSL-Gated IP Anomaly Detection
 *
 * Detects anomalous IP patterns using φ-scaled sliding windows,
 * exponential decay scoring, and CSL gate thresholds for threat classification.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold, fibSequence } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const WINDOW_SIZE_MS    = 34 * 1000;     // fib(9) = 34s sliding window
const MAX_REQUESTS      = 89;            // fib(11) per window
const BURST_THRESHOLD   = 13;            // fib(7) requests in 1s = burst
const HISTORY_SIZE      = 987;           // fib(16) tracked IPs
const DECAY_RATE        = PSI;           // ≈ 0.618 exponential decay factor
const BAN_DURATION_MS   = 233 * 1000;   // fib(13) = 233s ban
const FINGERPRINT_CACHE = 377;           // fib(14)

// ── IP Tracking Store ────────────────────────────────────
const ipStore = new Map();
const banList = new Map();

function hashIP(ip) {
  return createHash('sha256').update(ip + 'heady-anomaly-salt').digest('hex').slice(0, 21);
}

function getIPRecord(ip) {
  const hash = hashIP(ip);
  let record = ipStore.get(hash);
  if (!record) {
    record = {
      hash,
      requests: [],
      anomalyScore: 0,
      threatLevel: 'NOMINAL',
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      totalRequests: 0,
      blockedCount: 0,
      patterns: { methods: {}, paths: {}, userAgents: new Set() },
    };
    // Evict oldest if over limit
    if (ipStore.size >= HISTORY_SIZE) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of ipStore) {
        if (v.lastSeen < oldestTime) { oldestTime = v.lastSeen; oldestKey = k; }
      }
      if (oldestKey) ipStore.delete(oldestKey);
    }
    ipStore.set(hash, record);
  }
  return record;
}

// ── CSL Gate ────────────────────────────────────────────
function cslGate(value, score, threshold, temperature = PSI * PSI * PSI) {
  const sigmoid = 1 / (1 + Math.exp(-(score - threshold) / temperature));
  return value * sigmoid;
}

// ── Anomaly Scoring ──────────────────────────────────────
function computeAnomalyScore(record) {
  const now = Date.now();
  
  // Clean old requests outside window
  record.requests = record.requests.filter(r => now - r.time < WINDOW_SIZE_MS);
  
  const requestCount = record.requests.length;
  
  // Factor 1: Request rate (φ-weighted: 0.486)
  const rateScore = Math.min(1, requestCount / MAX_REQUESTS);
  
  // Factor 2: Burst detection (φ-weighted: 0.300)
  const lastSecond = record.requests.filter(r => now - r.time < 1000).length;
  const burstScore = Math.min(1, lastSecond / BURST_THRESHOLD);
  
  // Factor 3: Path diversity — many unique paths = scanner (φ-weighted: 0.214)
  const uniquePaths = Object.keys(record.patterns.paths).length;
  const diversityScore = Math.min(1, uniquePaths / 55); // fib(10)
  
  // φ-weighted fusion
  const anomaly = (rateScore * 0.486) + (burstScore * 0.300) + (diversityScore * 0.214);
  
  // Exponential decay blending with previous score
  record.anomalyScore = (record.anomalyScore * DECAY_RATE) + (anomaly * (1 - DECAY_RATE));
  
  return record.anomalyScore;
}

function classifyThreat(anomalyScore) {
  if (cslGate(1, anomalyScore, CSL_THRESHOLDS.CRITICAL) > CSL_THRESHOLDS.MINIMUM) return 'CRITICAL';
  if (cslGate(1, anomalyScore, CSL_THRESHOLDS.HIGH) > CSL_THRESHOLDS.MINIMUM) return 'HIGH';
  if (cslGate(1, anomalyScore, CSL_THRESHOLDS.MEDIUM) > CSL_THRESHOLDS.MINIMUM) return 'ELEVATED';
  if (cslGate(1, anomalyScore, CSL_THRESHOLDS.LOW) > CSL_THRESHOLDS.MINIMUM) return 'WATCHING';
  return 'NOMINAL';
}

// ── Public API ──────────────────────────────────────────
/**
 * Record a request from an IP and return threat assessment
 */
export function recordRequest(ip, meta = {}) {
  const now = Date.now();
  
  // Check ban list
  const banned = banList.get(hashIP(ip));
  if (banned && now < banned.expiresAt) {
    return {
      allowed: false,
      reason: 'IP_BANNED',
      threatLevel: 'CRITICAL',
      expiresIn: banned.expiresAt - now,
    };
  } else if (banned) {
    banList.delete(hashIP(ip));
  }

  const record = getIPRecord(ip);
  record.lastSeen = now;
  record.totalRequests++;
  record.requests.push({ time: now });
  
  // Update patterns
  if (meta.method) record.patterns.methods[meta.method] = (record.patterns.methods[meta.method] || 0) + 1;
  if (meta.path) record.patterns.paths[meta.path] = (record.patterns.paths[meta.path] || 0) + 1;
  if (meta.userAgent) record.patterns.userAgents.add(meta.userAgent.slice(0, 144)); // fib(12) char limit
  
  const anomalyScore = computeAnomalyScore(record);
  const threatLevel = classifyThreat(anomalyScore);
  record.threatLevel = threatLevel;
  
  // Auto-ban at CRITICAL
  if (threatLevel === 'CRITICAL') {
    banList.set(record.hash, { expiresAt: now + BAN_DURATION_MS, reason: 'ANOMALY_CRITICAL' });
    record.blockedCount++;
    return {
      allowed: false,
      reason: 'ANOMALY_DETECTED',
      threatLevel,
      anomalyScore,
      bannedFor: BAN_DURATION_MS,
    };
  }

  return {
    allowed: true,
    threatLevel,
    anomalyScore,
    requestsInWindow: record.requests.length,
    totalRequests: record.totalRequests,
  };
}

/**
 * Get current threat status for an IP
 */
export function getStatus(ip) {
  const hash = hashIP(ip);
  const record = ipStore.get(hash);
  if (!record) return { threatLevel: 'UNKNOWN', anomalyScore: 0 };
  return {
    threatLevel: record.threatLevel,
    anomalyScore: record.anomalyScore,
    totalRequests: record.totalRequests,
    blockedCount: record.blockedCount,
    firstSeen: record.firstSeen,
    lastSeen: record.lastSeen,
    isBanned: banList.has(hash) && Date.now() < (banList.get(hash)?.expiresAt || 0),
  };
}

/**
 * Manually ban an IP
 */
export function banIP(ip, durationMs = BAN_DURATION_MS, reason = 'MANUAL') {
  const hash = hashIP(ip);
  banList.set(hash, { expiresAt: Date.now() + durationMs, reason });
}

/**
 * Unban an IP
 */
export function unbanIP(ip) {
  banList.delete(hashIP(ip));
}

/**
 * Get summary statistics
 */
export function getSummary() {
  const threats = { NOMINAL: 0, WATCHING: 0, ELEVATED: 0, HIGH: 0, CRITICAL: 0 };
  for (const [, record] of ipStore) {
    threats[record.threatLevel] = (threats[record.threatLevel] || 0) + 1;
  }
  return {
    trackedIPs: ipStore.size,
    bannedIPs: banList.size,
    threatDistribution: threats,
  };
}

/**
 * Express/Connect middleware
 */
export function middleware(options = {}) {
  const getIP = options.getIP || ((req) => req.ip || req.connection?.remoteAddress || '0.0.0.0');
  
  return (req, res, next) => {
    const ip = getIP(req);
    const result = recordRequest(ip, {
      method: req.method,
      path: req.path || req.url,
      userAgent: req.headers?.['user-agent'],
    });
    
    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.bannedFor || BAN_DURATION_MS) / 1000));
      res.statusCode = 429;
      res.end(JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((result.bannedFor || BAN_DURATION_MS) / 1000) }));
      return;
    }
    
    res.setHeader('X-Heady-Threat-Level', result.threatLevel);
    next();
  };
}

export default { recordRequest, getStatus, banIP, unbanIP, getSummary, middleware };
