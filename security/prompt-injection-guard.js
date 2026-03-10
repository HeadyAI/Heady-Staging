/**
 * Heady Prompt Injection Guard — Multi-layer LLM input sanitization
 * Pattern matching, CSL-gated scoring, canary token detection
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate, cosineSimilarity } from '../shared/csl-engine-v2.js';

const MAX_INPUT_LENGTH   = fibonacci(17) * 10; // 15970 chars
const PATTERN_CACHE      = fibonacci(14);       // 377
const CANARY_LENGTH      = fibonacci(7);        // 13

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

const detectionLog = [];
const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/gi, severity: 'CRITICAL', name: 'override_instructions' },
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/gi, severity: 'HIGH', name: 'role_reassignment' },
  { pattern: /system\s*:\s*/gi, severity: 'HIGH', name: 'system_prompt_injection' },
  { pattern: /\[\s*INST\s*\]/gi, severity: 'HIGH', name: 'instruction_tag_injection' },
  { pattern: /\<\|?(im_start|im_end|system|user|assistant)\|?\>/gi, severity: 'CRITICAL', name: 'chat_template_injection' },
  { pattern: /pretend\s+(you('re|\s+are)|to\s+be)/gi, severity: 'MEDIUM', name: 'pretend_attack' },
  { pattern: /forget\s+(everything|all|your)/gi, severity: 'HIGH', name: 'memory_wipe' },
  { pattern: /do\s+not\s+follow\s+(any|your|the)/gi, severity: 'HIGH', name: 'rule_override' },
  { pattern: /\{\{.*\}\}/g, severity: 'MEDIUM', name: 'template_injection' },
  { pattern: /\$\{.*\}/g, severity: 'MEDIUM', name: 'variable_injection' },
  { pattern: /base64_decode|eval\s*\(|exec\s*\(/gi, severity: 'CRITICAL', name: 'code_execution' },
  { pattern: /DAN\s*(mode|prompt|jailbreak)/gi, severity: 'CRITICAL', name: 'dan_jailbreak' },
  { pattern: /output\s+(your|the)\s+(system|initial|original)\s+prompt/gi, severity: 'CRITICAL', name: 'prompt_extraction' },
  { pattern: /what\s+(is|are)\s+your\s+(instructions|rules|prompt|system)/gi, severity: 'HIGH', name: 'prompt_disclosure' },
];

function scanInput(input) {
  if (typeof input !== 'string') return { safe: true, score: 1.0, threats: [] };
  if (input.length > MAX_INPUT_LENGTH) {
    return { safe: false, score: 0.0, threats: [{ name: 'input_too_long', severity: 'HIGH', length: input.length, max: MAX_INPUT_LENGTH }] };
  }

  const threats = [];
  let maxSeverityScore = 0;

  for (const rule of INJECTION_PATTERNS) {
    const matches = input.match(rule.pattern);
    if (matches) {
      const severityScore = rule.severity === 'CRITICAL' ? phiThreshold(4) :
                            rule.severity === 'HIGH' ? phiThreshold(3) :
                            rule.severity === 'MEDIUM' ? phiThreshold(2) : phiThreshold(1);
      maxSeverityScore = Math.max(maxSeverityScore, severityScore);
      threats.push({
        name: rule.name,
        severity: rule.severity,
        matches: matches.length,
        score: severityScore,
      });
    }
  }

  const safetyScore = 1.0 - maxSeverityScore;
  const safeGate = cslGate(safetyScore, safetyScore, phiThreshold(2), PSI * PSI * PSI);
  const isSafe = threats.length === 0 || safeGate > phiThreshold(1);

  const result = {
    safe: isSafe,
    score: safetyScore,
    threats,
    inputHash: sha256(input),
    scannedAt: Date.now(),
  };

  if (threats.length > 0) {
    if (detectionLog.length >= PATTERN_CACHE) detectionLog.shift();
    detectionLog.push(result);
  }

  return result;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  let sanitized = input.slice(0, MAX_INPUT_LENGTH);
  for (const rule of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(rule.pattern, '[REDACTED]');
  }
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized;
}

function generateCanaryToken(sessionId) {
  const canary = sha256(sessionId + 'canary' + Date.now()).slice(0, CANARY_LENGTH);
  return { token: canary, instruction: 'If you see this token in output, prompt leakage occurred: ' + canary };
}

function checkCanaryLeakage(output, canaryToken) {
  if (!output || !canaryToken) return { leaked: false };
  const leaked = output.includes(canaryToken);
  if (leaked) {
    detectionLog.push({ type: 'canary_leak', token: canaryToken, timestamp: Date.now() });
  }
  return { leaked, token: canaryToken };
}

function getDetectionAnalytics() {
  const byType = {};
  const bySeverity = {};
  for (const entry of detectionLog) {
    for (const t of (entry.threats || [])) {
      byType[t.name] = (byType[t.name] || 0) + 1;
      bySeverity[t.severity] = (bySeverity[t.severity] || 0) + 1;
    }
    if (entry.type === 'canary_leak') {
      byType['canary_leak'] = (byType['canary_leak'] || 0) + 1;
    }
  }
  return { total: detectionLog.length, byType, bySeverity, recent: detectionLog.slice(-fibonacci(8)) };
}

function createServer(port = 3391) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
      const readBody = () => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString())); } catch { r({}); } }); });

      if (url.pathname === '/guard/scan' && req.method === 'POST') { const b = await readBody(); respond(200, scanInput(b.input || b.text || '')); }
      else if (url.pathname === '/guard/sanitize' && req.method === 'POST') { const b = await readBody(); respond(200, { sanitized: sanitizeInput(b.input || b.text || '') }); }
      else if (url.pathname === '/guard/canary' && req.method === 'POST') { const b = await readBody(); respond(200, generateCanaryToken(b.sessionId || 'default')); }
      else if (url.pathname === '/guard/check-canary' && req.method === 'POST') { const b = await readBody(); respond(200, checkCanaryLeakage(b.output, b.token)); }
      else if (url.pathname === '/guard/analytics' && req.method === 'GET') respond(200, getDetectionAnalytics());
      else if (url.pathname === '/health') respond(200, { service: 'prompt-injection-guard', status: 'healthy', patterns: INJECTION_PATTERNS.length, detections: detectionLog.length });
      else respond(404, { error: 'not_found' });
    });
    server.listen(port);
    return server;
  });
}

export default { createServer, scanInput, sanitizeInput, generateCanaryToken, checkCanaryLeakage, getDetectionAnalytics };
export { createServer, scanInput, sanitizeInput, generateCanaryToken, checkCanaryLeakage, getDetectionAnalytics };
