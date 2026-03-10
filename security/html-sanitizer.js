/**
 * html-sanitizer.js — CSL-Gated HTML Sanitization Engine
 *
 * φ-scaled tag whitelist scoring, attribute filtering, and
 * deep-nested content sanitization using CSL gates instead of boolean allow/deny.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),  // ≈ 0.927
  HIGH:     phiThreshold(3),  // ≈ 0.882
  MEDIUM:   phiThreshold(2),  // ≈ 0.809
  LOW:      phiThreshold(1),  // ≈ 0.691
  MINIMUM:  phiThreshold(0),  // ≈ 0.500
};

const MAX_NESTING_DEPTH = 13;          // fib(7)
const MAX_ATTR_LENGTH   = 987;         // fib(16)
const MAX_INPUT_LENGTH  = 1597 * 100;  // fib(17) × 100 = 159700 chars
const CACHE_SIZE        = 233;         // fib(13)

// ── Tag Safety Scores (0..1, φ-scaled) ──────────────────
const TAG_SAFETY = new Map([
  // Safe content tags (HIGH+)
  ['p', 0.95], ['span', 0.95], ['div', 0.92], ['br', 0.98],
  ['strong', 0.95], ['em', 0.95], ['b', 0.95], ['i', 0.95],
  ['h1', 0.93], ['h2', 0.93], ['h3', 0.93], ['h4', 0.93], ['h5', 0.93], ['h6', 0.93],
  ['ul', 0.92], ['ol', 0.92], ['li', 0.92],
  ['blockquote', 0.90], ['pre', 0.90], ['code', 0.90],
  ['table', 0.88], ['thead', 0.88], ['tbody', 0.88], ['tr', 0.88], ['th', 0.88], ['td', 0.88],
  ['a', 0.82], ['img', 0.78],
  // Risky tags (below MEDIUM)
  ['form', 0.45], ['input', 0.40], ['textarea', 0.42],
  ['iframe', 0.15], ['script', 0.0], ['style', 0.10],
  ['object', 0.08], ['embed', 0.08], ['link', 0.20],
  ['meta', 0.25], ['base', 0.05],
]);

const SAFE_ATTRS = new Map([
  ['href', 0.80], ['src', 0.75], ['alt', 0.95], ['title', 0.95],
  ['class', 0.90], ['id', 0.85], ['width', 0.88], ['height', 0.88],
  ['colspan', 0.90], ['rowspan', 0.90], ['target', 0.70],
  ['rel', 0.82], ['aria-label', 0.95], ['role', 0.90],
  ['data-id', 0.85], ['data-type', 0.85],
]);

const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:text/html'];

// ── CSL Gate ────────────────────────────────────────────
function cslGate(value, score, threshold, temperature = PSI * PSI * PSI) {
  const sigmoid = 1 / (1 + Math.exp(-(score - threshold) / temperature));
  return value * sigmoid;
}

function isAllowed(score, threshold) {
  return cslGate(1, score, threshold) > CSL_THRESHOLDS.MINIMUM;
}

// ── Sanitization Cache (LRU, fib-sized) ──────────────────
const cache = new Map();
function cacheGet(key) {
  const v = cache.get(key);
  if (v !== undefined) { cache.delete(key); cache.set(key, v); }
  return v;
}
function cacheSet(key, val) {
  if (cache.size >= CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, val);
}

// ── Core Sanitizer ──────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function sanitizeAttrValue(name, value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.slice(0, MAX_ATTR_LENGTH).trim();
  if (name === 'href' || name === 'src') {
    const lower = trimmed.toLowerCase().replace(/\s+/g, '');
    for (const proto of DANGEROUS_PROTOCOLS) {
      if (lower.startsWith(proto)) return '';
    }
  }
  // Strip event handlers embedded in attr values
  return trimmed.replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
}

function sanitizeTag(tag, attrs, threshold = CSL_THRESHOLDS.MEDIUM) {
  const tagLower = tag.toLowerCase();
  const tagScore = TAG_SAFETY.get(tagLower) ?? 0;

  if (!isAllowed(tagScore, threshold)) return null;

  const safeAttrs = {};
  for (const [name, value] of Object.entries(attrs)) {
    const nameLower = name.toLowerCase();
    // Block event handlers unconditionally
    if (nameLower.startsWith('on')) continue;
    if (nameLower === 'style') continue; // XSS vector
    
    const attrScore = SAFE_ATTRS.get(nameLower) ?? (nameLower.startsWith('data-') ? 0.80 : 0.20);
    if (isAllowed(attrScore, CSL_THRESHOLDS.LOW)) {
      const sanitized = sanitizeAttrValue(nameLower, value);
      if (sanitized || sanitized === '') safeAttrs[nameLower] = sanitized;
    }
  }
  
  return { tag: tagLower, attrs: safeAttrs };
}

/**
 * Sanitize an HTML string, returning safe markup.
 * Uses regex-based parsing (no DOM dependency for server-side).
 */
export function sanitize(html, options = {}) {
  if (typeof html !== 'string') return '';
  if (html.length > MAX_INPUT_LENGTH) {
    html = html.slice(0, MAX_INPUT_LENGTH);
  }

  const threshold = options.threshold ?? CSL_THRESHOLDS.MEDIUM;
  const stripAll = options.stripAll ?? false;

  // Check cache
  const hashInput = createHash('sha256').update(html + threshold).digest('hex').slice(0, 21);
  const cached = cacheGet(hashInput);
  if (cached !== undefined) return cached;

  if (stripAll) {
    const result = html.replace(/<[^>]*>/g, '').trim();
    cacheSet(hashInput, result);
    return result;
  }

  // Parse and sanitize
  let result = '';
  let depth = 0;
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    // Add text between tags (escaped)
    if (match.index > lastIndex) {
      result += escapeHtml(html.slice(lastIndex, match.index));
    }
    lastIndex = match.index + match[0].length;

    const [, isClosing, tagName, attrStr, selfClosing] = match;

    if (isClosing) {
      depth = Math.max(0, depth - 1);
      const tagScore = TAG_SAFETY.get(tagName.toLowerCase()) ?? 0;
      if (isAllowed(tagScore, threshold)) {
        result += `</${tagName.toLowerCase()}>`;
      }
      continue;
    }

    if (depth >= MAX_NESTING_DEPTH) continue;

    // Parse attributes
    const attrs = {};
    const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
    }

    const sanitized = sanitizeTag(tagName, attrs, threshold);
    if (!sanitized) continue;

    const attrString = Object.entries(sanitized.attrs)
      .map(([k, v]) => v ? `${k}="${escapeHtml(v)}"` : k)
      .join(' ');

    result += `<${sanitized.tag}${attrString ? ' ' + attrString : ''}${selfClosing ? ' /' : ''}>`;
    if (!selfClosing) depth++;
  }

  // Remaining text
  if (lastIndex < html.length) {
    result += escapeHtml(html.slice(lastIndex));
  }

  cacheSet(hashInput, result);
  return result;
}

/**
 * Validate that a string contains no dangerous HTML
 */
export function isClean(html) {
  const sanitized = sanitize(html);
  return sanitized === html;
}

export { TAG_SAFETY, SAFE_ATTRS, CSL_THRESHOLDS, sanitizeTag };
export default { sanitize, isClean, sanitizeTag, TAG_SAFETY, SAFE_ATTRS };
