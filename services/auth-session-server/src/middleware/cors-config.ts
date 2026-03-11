import cors from 'cors';
import type { Request } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CORS');

/**
 * All ~60 HEADY ecosystem domains
 * Pattern-based matching for scalability
 */
const HEADY_DOMAIN_PATTERNS = [
  // Primary domains
  /^https?:\/\/(?:.*\.)?headysystems\.com$/i,
  /^https?:\/\/(?:.*\.)?headyme\.com$/i,
  /^https?:\/\/headyconnection\.org$/i,
  /^https?:\/\/headyconnection\.com$/i,
  /^https?:\/\/(?:.*\.)?heady-ai\.com$/i,
  /^https?:\/\/(?:.*\.)?headyos\.com$/i,
  /^https?:\/\/(?:.*\.)?headyex\.com$/i,
  /^https?:\/\/(?:.*\.)?headyfinance\.com$/i,

  // Product-specific domains
  /^https?:\/\/(?:.*\.)?headyanalytics\.com$/i,
  /^https?:\/\/(?:.*\.)?headycloud\.com$/i,
  /^https?:\/\/(?:.*\.)?headypay\.com$/i,
  /^https?:\/\/(?:.*\.)?headyapi\.com$/i,
  /^https?:\/\/(?:.*\.)?headycms\.com$/i,
  /^https?:\/\/(?:.*\.)?headycrm\.com$/i,
  /^https?:\/\/(?:.*\.)?headydms\.com$/i,
  /^https?:\/\/(?:.*\.)?headyhr\.com$/i,
  /^https?:\/\/(?:.*\.)?headypos\.com$/i,
  /^https?:\/\/(?:.*\.)?headyedu\.com$/i,
  /^https?:\/\/(?:.*\.)?headyhospital\.com$/i,
  /^https?:\/\/(?:.*\.)?headylogistics\.com$/i,
  /^https?:\/\/(?:.*\.)?headymedical\.com$/i,
  /^https?:\/\/(?:.*\.)?headyrealestate\.com$/i,
  /^https?:\/\/(?:.*\.)?headyretail\.com$/i,
  /^https?:\/\/(?:.*\.)?headysocial\.com$/i,
  /^https?:\/\/(?:.*\.)?headytickets\.com$/i,
  /^https?:\/\/(?:.*\.)?headytravel\.com$/i,
  /^https?:\/\/(?:.*\.)?headyacademy\.com$/i,
  /^https?:\/\/(?:.*\.)?headymarketplace\.com$/i,
  /^https?:\/\/(?:.*\.)?headypartner\.com$/i,
  /^https?:\/\/(?:.*\.)?headyconsult\.com$/i,

  // Regional variants
  /^https?:\/\/(?:.*\.)?heady\.io$/i,
  /^https?:\/\/(?:.*\.)?headyai\.io$/i,
  /^https?:\/\/(?:.*\.)?headyapps\.io$/i,
  /^https?:\/\/(?:.*\.)?headydev\.io$/i,
  /^https?:\/\/(?:.*\.)?headystaging\.io$/i,
  /^https?:\/\/(?:.*\.)?heady\.co$/i,
  /^https?:\/\/(?:.*\.)?heady\.uk$/i,
  /^https?:\/\/(?:.*\.)?heady\.de$/i,
  /^https?:\/\/(?:.*\.)?heady\.fr$/i,
  /^https?:\/\/(?:.*\.)?heady\.jp$/i,
  /^https?:\/\/(?:.*\.)?heady\.cn$/i,
  /^https?:\/\/(?:.*\.)?heady\.in$/i,
  /^https?:\/\/(?:.*\.)?heady\.br$/i,
  /^https?:\/\/(?:.*\.)?heady\.au$/i,

  // Development and testing
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/\[::1\](?::\d+)?$/i, // IPv6 localhost
  /^https?:\/\/(?:.*\.)?headydev\.local$/i,
  /^https?:\/\/(?:.*\.)?heady\.local$/i,
];

/**
 * Validate origin against HEADY domain patterns
 */
function isHeadyOrigin(origin: string): boolean {
  if (!origin) {
    return false;
  }

  return HEADY_DOMAIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * CORS middleware configuration for HEADY auth service
 * Allows cross-origin requests from all ~60 HEADY ecosystem domains
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests without origin (e.g., same-origin requests)
    if (!origin) {
      return callback(null, true);
    }

    if (isHeadyOrigin(origin)) {
      logger.debug('CORS allowed', { origin });
      callback(null, true);
    } else {
      logger.warn('CORS rejected', { origin });
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Firebase-Token',
  ],
  exposedHeaders: ['X-Request-Id', 'X-Retry-After'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
});

/**
 * Preflight handler for complex requests
 */
export function handlePreflightRequest(req: Request, origin: string | undefined) {
  if (!origin) {
    return { allowed: true };
  }

  const allowed = isHeadyOrigin(origin);
  if (!allowed) {
    logger.warn('Preflight CORS rejected', { origin, method: req.method });
  }

  return { allowed };
}

/**
 * Get allowed origins list (for documentation/debugging)
 */
export function getAllowedDomainPatterns(): RegExp[] {
  return HEADY_DOMAIN_PATTERNS;
}

/**
 * Validate origin for relay iframe postMessage
 * Stricter validation for iframe security
 */
export function validateRelayFrameOrigin(origin: string): boolean {
  // Relay frames require exact origin match with HTTPS
  if (!origin.startsWith('https://')) {
    return false;
  }

  return isHeadyOrigin(origin);
}

export default {
  corsMiddleware,
  handlePreflightRequest,
  getAllowedDomainPatterns,
  validateRelayFrameOrigin,
};
