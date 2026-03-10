/**
 * Heady™ Prompt Injection Defense Middleware
 * Parameterized templates, input sanitization, output validation
 * OWASP Top 10 for AI: LLM01 (Prompt Injection), LLM05 (Output Handling)
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.618033988749895;
const MAX_PROMPT_LENGTH = 987 * 4; // Fibonacci × 4 ≈ 3948 chars
const MAX_OUTPUT_LENGTH = 987 * 13; // Fibonacci × 13 ≈ 12831 chars

// Known jailbreak patterns (simplified — production uses ML classifier)
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(all\s+)?(previous|prior|above)/i,
    /you\s+are\s+now\s+(a|an|DAN|evil|unrestricted)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(a|an)/i,
    /system\s*:\s*you\s+are/i,
    /\[SYSTEM\]/i,
    /\{\{.*\}\}/g, // Template injection
    /<script[\s>]/i, // XSS via prompt
    /javascript:/i,
    /data:text\/html/i,
    /on(error|load|click|mouseover)\s*=/i,
];

// Characters that should never appear in clean prompts
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitize user input before LLM invocation
 */
function sanitizePromptInput(input) {
    if (typeof input !== 'string') return '';

    let clean = input
        .replace(CONTROL_CHARS, '') // Strip control characters
        .trim();

    // Enforce max length
    if (clean.length > MAX_PROMPT_LENGTH) {
        clean = clean.substring(0, MAX_PROMPT_LENGTH);
    }

    return clean;
}

/**
 * Check for prompt injection attempts
 * Returns { safe: boolean, reason?: string, pattern?: string }
 */
function detectInjection(input) {
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                safe: false,
                reason: 'Potential prompt injection detected',
                pattern: pattern.source,
            };
        }
    }
    return { safe: true };
}

/**
 * Validate LLM output against expected schema
 */
function validateOutput(output, schema = {}) {
    if (typeof output !== 'string') return { valid: false, reason: 'Output is not a string' };
    if (output.length > MAX_OUTPUT_LENGTH) return { valid: false, reason: 'Output exceeds maximum length' };

    // Strip any HTML/script tags from output
    const sanitized = output
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on(error|load|click|mouseover)\s*=/gi, '');

    // If schema expects JSON, validate structure
    if (schema.type === 'json') {
        try {
            const parsed = JSON.parse(sanitized);
            if (schema.requiredFields) {
                for (const field of schema.requiredFields) {
                    if (!(field in parsed)) {
                        return { valid: false, reason: `Missing required field: ${field}` };
                    }
                }
            }
        } catch {
            return { valid: false, reason: 'Output is not valid JSON' };
        }
    }

    return { valid: true, sanitized };
}

/**
 * Express middleware for prompt injection defense
 */
function promptInjectionDefense(req, res, next) {
    // Only apply to endpoints that process LLM prompts
    const promptFields = ['prompt', 'message', 'query', 'input', 'content'];
    const body = req.body || {};

    for (const field of promptFields) {
        if (body[field] && typeof body[field] === 'string') {
            // Sanitize
            body[field] = sanitizePromptInput(body[field]);

            // Detect injection
            const check = detectInjection(body[field]);
            if (!check.safe) {
                return res.status(400).json({
                    error: 'prompt_injection_detected',
                    message: check.reason,
                    field,
                });
            }
        }
    }

    // Attach sanitized body
    req.body = body;
    next();
}

/**
 * Parameterized prompt template — prevents injection via string concat
 */
function createPromptTemplate(template, variables = {}) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const sanitized = sanitizePromptInput(String(value));
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), sanitized);
    }
    return result;
}

module.exports = {
    sanitizePromptInput,
    detectInjection,
    validateOutput,
    promptInjectionDefense,
    createPromptTemplate,
};
