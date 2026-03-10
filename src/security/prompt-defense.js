/**
 * Heady™ Prompt Injection Defense
 * Parameterized prompt templates — NEVER string concatenation
 * 
 * OWASP Top 10 for AI: LLM01 Prompt Injection defense
 * 
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 */

'use strict';

const { CSL_THRESHOLDS } = require('../shared/phi-math');

// Prompt templates with parameterized slots
const TEMPLATES = {
  classify: {
    system: 'You are a Heady task classifier. Respond ONLY with valid JSON matching the schema.',
    user: 'Classify the following user input into one of these categories: {{categories}}.\n\nInput: {{input}}\n\nRespond with JSON: {"category": "...", "confidence": 0.0-1.0}',
    schema: { type: 'object', properties: { category: { type: 'string' }, confidence: { type: 'number' } }, required: ['category', 'confidence'] },
  },
  summarize: {
    system: 'You are a Heady text summarizer. Provide concise summaries.',
    user: 'Summarize the following text in {{maxSentences}} sentences or fewer:\n\n{{text}}',
    schema: { type: 'object', properties: { summary: { type: 'string' }, sentenceCount: { type: 'number' } } },
  },
  embed_query: {
    system: 'You are a Heady search query optimizer.',
    user: 'Optimize this search query for semantic search: {{query}}',
    schema: { type: 'object', properties: { optimized: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } } } },
  },
};

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return String(input);
  // Strip control characters
  let clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Limit length (fib(17)=1597 chars max)
  clean = clean.slice(0, 1597);
  return clean;
}

// Detect injection attempts
function detectInjection(input) {
  const patterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?above/i,
    /you\s+are\s+now\s+a/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<\|im_start\|>/i,
    /```system/i,
    /\bprompt\s+injection\b/i,
  ];
  
  for (const p of patterns) {
    if (p.test(input)) return { detected: true, pattern: p.source };
  }
  return { detected: false };
}

// Build prompt from template with parameterized substitution
function buildPrompt(templateName, params = {}) {
  const template = TEMPLATES[templateName];
  if (!template) throw new Error(`Unknown template: ${templateName}`);
  
  let user = template.user;
  for (const [key, value] of Object.entries(params)) {
    const sanitized = sanitizeInput(String(value));
    const injection = detectInjection(sanitized);
    if (injection.detected) {
      throw new Error(`Prompt injection detected in parameter '${key}'`);
    }
    user = user.replace(`{{${key}}}`, sanitized);
  }
  
  return { system: template.system, user, schema: template.schema };
}

// Validate LLM output against schema
function validateOutput(output, schema) {
  if (!schema) return { valid: true, output };
  
  try {
    const parsed = typeof output === 'string' ? JSON.parse(output) : output;
    
    // Basic JSON schema validation
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in parsed)) return { valid: false, error: `Missing required field: ${key}` };
      }
    }
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in parsed && prop.type) {
          const actualType = Array.isArray(parsed[key]) ? 'array' : typeof parsed[key];
          if (actualType !== prop.type) return { valid: false, error: `Field '${key}' expected ${prop.type}, got ${actualType}` };
        }
      }
    }
    
    return { valid: true, output: parsed };
  } catch (err) {
    return { valid: false, error: `Invalid JSON: ${err.message}` };
  }
}

module.exports = { TEMPLATES, sanitizeInput, detectInjection, buildPrompt, validateOutput };
