/**
 * dompurify-wrapper.js — Server-Side HTML Sanitization via DOMPurify Pattern
 *
 * Production wrapper around the html-sanitizer with DOMPurify-compatible API,
 * CSL-gated policy profiles, and LLM output sanitization.
 * Specifically designed for sanitizing LLM outputs before downstream consumption.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { sanitize as baseSanitize, isClean, CSL_THRESHOLDS as BASE_THRESHOLDS } from './html-sanitizer.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const MAX_LLM_OUTPUT_LENGTH = 1597 * 55;  // fib(17) × fib(10) ≈ 87,835 chars
const SANITIZE_CACHE_SIZE   = 233;        // fib(13)
const JSON_MAX_DEPTH        = 13;         // fib(7) max nesting for JSON validation

// ── Policy Profiles ─────────────────────────────────────
const PROFILES = {
  // Strict: text only, no HTML at all
  STRICT: {
    name: 'strict',
    threshold: CSL_THRESHOLDS.CRITICAL,
    stripAll: true,
  },
  // Standard: safe HTML tags only
  STANDARD: {
    name: 'standard',
    threshold: CSL_THRESHOLDS.MEDIUM,
    stripAll: false,
  },
  // Permissive: most tags except script/iframe
  PERMISSIVE: {
    name: 'permissive',
    threshold: CSL_THRESHOLDS.LOW,
    stripAll: false,
  },
};

// ── LLM Output Sanitizer ────────────────────────────────
/**
 * Sanitize LLM output before passing to downstream APIs.
 * Strips injection attempts, validates structure, enforces length limits.
 */
export function sanitizeLLMOutput(output, options = {}) {
  const profile = PROFILES[options.profile?.toUpperCase()] || PROFILES.STANDARD;
  
  if (typeof output !== 'string') {
    return { clean: '', violations: [{ type: 'INVALID_TYPE', detail: typeof output }], sanitized: true };
  }
  
  // Enforce length limit
  let text = output;
  const violations = [];
  
  if (text.length > MAX_LLM_OUTPUT_LENGTH) {
    text = text.slice(0, MAX_LLM_OUTPUT_LENGTH);
    violations.push({ type: 'LENGTH_EXCEEDED', original: output.length, limit: MAX_LLM_OUTPUT_LENGTH });
  }
  
  // Strip prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(previous|above|all)\s+instructions/gi,
    /you\s+are\s+now\s+(?:a|an|the)\s+/gi,
    /system\s*:\s*/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
    /<\|im_start\|>/gi,
    /\bhuman:\s/gi,
    /\bassistant:\s/gi,
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      violations.push({ type: 'PROMPT_INJECTION', pattern: pattern.source });
      text = text.replace(pattern, '[FILTERED]');
    }
  }
  
  // HTML sanitization
  const cleanHtml = baseSanitize(text, {
    threshold: profile.threshold,
    stripAll: profile.stripAll,
  });
  
  if (cleanHtml !== text) {
    violations.push({ type: 'HTML_SANITIZED', profile: profile.name });
  }
  
  return {
    clean: cleanHtml,
    violations,
    sanitized: violations.length > 0,
    profile: profile.name,
    hash: createHash('sha256').update(cleanHtml).digest('hex').slice(0, 21),
  };
}

/**
 * Validate LLM JSON output against a schema shape.
 * Prevents injection via malformed JSON.
 */
export function validateLLMJson(jsonString, expectedKeys = []) {
  const violations = [];
  
  try {
    // Length check
    if (typeof jsonString !== 'string' || jsonString.length > MAX_LLM_OUTPUT_LENGTH) {
      return { valid: false, data: null, violations: [{ type: 'INVALID_INPUT' }] };
    }
    
    const parsed = JSON.parse(jsonString);
    
    // Depth check
    function checkDepth(obj, depth = 0) {
      if (depth > JSON_MAX_DEPTH) {
        violations.push({ type: 'EXCESSIVE_DEPTH', depth });
        return false;
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const val of Object.values(obj)) {
          if (!checkDepth(val, depth + 1)) return false;
        }
      }
      return true;
    }
    checkDepth(parsed);
    
    // Key validation
    if (expectedKeys.length > 0) {
      const actualKeys = Object.keys(parsed);
      const unexpected = actualKeys.filter(k => !expectedKeys.includes(k));
      if (unexpected.length > 0) {
        violations.push({ type: 'UNEXPECTED_KEYS', keys: unexpected });
      }
    }
    
    // Sanitize all string values
    function sanitizeStrings(obj) {
      if (typeof obj === 'string') {
        return baseSanitize(obj, { stripAll: true });
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeStrings);
      }
      if (typeof obj === 'object' && obj !== null) {
        const clean = {};
        for (const [k, v] of Object.entries(obj)) {
          clean[baseSanitize(k, { stripAll: true })] = sanitizeStrings(v);
        }
        return clean;
      }
      return obj;
    }
    
    const sanitized = sanitizeStrings(parsed);
    
    return {
      valid: violations.length === 0,
      data: sanitized,
      violations,
      hash: createHash('sha256').update(JSON.stringify(sanitized)).digest('hex').slice(0, 21),
    };
  } catch (err) {
    return {
      valid: false,
      data: null,
      violations: [{ type: 'INVALID_JSON', error: err.message }],
    };
  }
}

/**
 * DOMPurify-compatible sanitize API.
 */
export function sanitize(dirty, config = {}) {
  return baseSanitize(dirty, {
    threshold: config.threshold || CSL_THRESHOLDS.MEDIUM,
    stripAll: config.RETURN_DOM_FRAGMENT === false || config.stripAll,
  });
}

export { PROFILES, CSL_THRESHOLDS };
export default { sanitize, sanitizeLLMOutput, validateLLMJson, PROFILES };
