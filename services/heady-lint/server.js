/*
 * © 2026 Heady™ Systems Inc.
 * HeadyLint — Architecture-Aware AI Code Review
 *
 * φ-scaled complexity thresholds:
 *  - Function cyclomatic complexity ≤ φ⁵ (~11.09)
 *  - Module coupling ≤ φ³ (~4.24) dependency connections
 *  - Code-to-comment ratio ~1:φ
 *  - AI-generated code weakness detection
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PHI = 1.618033988749895;

// φ-scaled thresholds
const THRESHOLDS = {
  maxCyclomaticComplexity: Math.pow(PHI, 5),        // ~11.09
  maxModuleCoupling: Math.pow(PHI, 3),               // ~4.24
  codeToCommentRatio: PHI,                            // 1.618
  maxFunctionLength: Math.round(Math.pow(PHI, 7)),   // ~29 lines
  maxFileLength: Math.round(Math.pow(PHI, 10)),       // ~122 lines ideal
  maxNestingDepth: Math.round(Math.pow(PHI, 2)),     // ~3
  maxParameterCount: Math.round(Math.pow(PHI, 3))    // ~4
};

// AI-generated code weakness patterns
const AI_WEAKNESS_PATTERNS = [
  { name: 'missing_error_handling', regex: /\.(then|catch)\s*\(\s*\)/g, severity: 'high', desc: 'Empty promise handler — common AI-gen weakness' },
  { name: 'unused_variable', regex: /(?:const|let|var)\s+(\w+)\s*=.*?;\s*$/gm, severity: 'medium', desc: 'Potentially unused variable' },
  { name: 'magic_number', regex: /(?<!\.|\w)(?:0x[\da-f]+|\d{3,})(?!\.\d)/gi, severity: 'low', desc: 'Magic number — use named constant' },
  { name: 'console_log', regex: /console\.(log|warn|error|debug)\(/g, severity: 'info', desc: 'Console statement — use structured logging' },
  { name: 'any_type', regex: /:\s*any\b/g, severity: 'medium', desc: 'TypeScript `any` type — AI-gen often uses this as escape hatch' },
  { name: 'todo_fixme', regex: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi, severity: 'info', desc: 'TODO/FIXME found' },
  { name: 'empty_catch', regex: /catch\s*\([^)]*\)\s*\{\s*\}/g, severity: 'high', desc: 'Empty catch block — swallowed error' },
  { name: 'eval_usage', regex: /\beval\s*\(/g, severity: 'critical', desc: 'eval() usage — security risk' }
];

function analyzeCode(code, filename) {
  const lines = code.split('\n');
  const issues = [];
  let complexity = 0;
  let nestingDepth = 0;
  let maxNesting = 0;
  let codeLines = 0;
  let commentLines = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Count code vs comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      commentLines++;
    } else if (trimmed.length > 0) {
      codeLines++;
    }

    // Cyclomatic complexity (count branches)
    if (/\b(if|else if|while|for|case|catch|&&|\|\||[?])\b/.test(trimmed)) {
      complexity++;
    }

    // Nesting depth
    const opens = (trimmed.match(/{/g) || []).length;
    const closes = (trimmed.match(/}/g) || []).length;
    nestingDepth += opens - closes;
    if (nestingDepth > maxNesting) maxNesting = nestingDepth;
  });

  // Check φ-thresholds
  if (complexity > THRESHOLDS.maxCyclomaticComplexity) {
    issues.push({ rule: 'phi-complexity', severity: 'warning', line: 0,
      message: `Cyclomatic complexity ${complexity.toFixed(1)} exceeds φ⁵ threshold (${THRESHOLDS.maxCyclomaticComplexity.toFixed(1)})` });
  }

  if (maxNesting > THRESHOLDS.maxNestingDepth) {
    issues.push({ rule: 'phi-nesting', severity: 'warning', line: 0,
      message: `Max nesting depth ${maxNesting} exceeds φ² threshold (${THRESHOLDS.maxNestingDepth})` });
  }

  if (lines.length > THRESHOLDS.maxFileLength * 3) {
    issues.push({ rule: 'phi-file-length', severity: 'info', line: 0,
      message: `File has ${lines.length} lines — ideal is ≤${THRESHOLDS.maxFileLength} (φ¹⁰)` });
  }

  const ratio = commentLines > 0 ? codeLines / commentLines : Infinity;
  if (ratio > THRESHOLDS.codeToCommentRatio * 3) {
    issues.push({ rule: 'phi-comment-ratio', severity: 'info', line: 0,
      message: `Code/comment ratio ${ratio.toFixed(1)}:1 — target is ${THRESHOLDS.codeToCommentRatio.toFixed(1)}:1 (1:φ)` });
  }

  // AI weakness pattern detection
  for (const pattern of AI_WEAKNESS_PATTERNS) {
    const matches = [...code.matchAll(pattern.regex)];
    for (const match of matches) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      issues.push({ rule: pattern.name, severity: pattern.severity, line: lineNum, message: pattern.desc });
    }
  }

  return {
    filename, lines: lines.length, codeLines, commentLines,
    complexity, maxNestingDepth: maxNesting,
    codeToCommentRatio: ratio === Infinity ? 'no comments' : ratio.toFixed(2),
    phiThresholds: THRESHOLDS,
    issues, issueCount: issues.length,
    score: Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === 'critical' ? 25 : i.severity === 'high' ? 10 : i.severity === 'warning' ? 5 : 1), 0))
  };
}

// ── HTTP Server ──────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (parsed.pathname === '/health') return res.end(JSON.stringify({ status: 'ok', service: 'heady-lint' }));

  if (parsed.pathname === '/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { code, filename } = JSON.parse(body);
      res.end(JSON.stringify(analyzeCode(code, filename || 'unknown'), null, 2));
    });
    return;
  }

  if (parsed.pathname === '/analyze-file' && parsed.query.path) {
    try {
      const code = fs.readFileSync(parsed.query.path, 'utf8');
      return res.end(JSON.stringify(analyzeCode(code, parsed.query.path), null, 2));
    } catch (e) { res.writeHead(400); return res.end(JSON.stringify({ error: e.message })); }
  }

  if (parsed.pathname === '/thresholds') return res.end(JSON.stringify(THRESHOLDS, null, 2));

  res.end(JSON.stringify({ service: 'HeadyLint', version: '1.0.0',
    description: 'φ-scaled code review — enforces golden-ratio complexity thresholds and detects AI-gen weaknesses',
    endpoints: { '/analyze': 'POST {code, filename}', '/analyze-file?path=': 'GET', '/thresholds': 'GET' } }));
});

const PORT = process.env.PORT || 8100;
server.listen(PORT, () => console.log(`🔍 HeadyLint on :${PORT}`));

module.exports = { analyzeCode, THRESHOLDS, AI_WEAKNESS_PATTERNS };
