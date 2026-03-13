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
// ║  FILE: scripts/hc.js                                                    ║
// ║  LAYER: automation                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RX_HISTORY_FILE = path.join(ROOT, '.heady', 'rx-history.json');
const args = process.argv.slice(2);
const command = args[0];

// ─── Utility ────────────────────────────────────────────────────────────────

function loadRxHistory() {
  try {
    const dir = path.dirname(RX_HISTORY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(RX_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(RX_HISTORY_FILE, 'utf8'));
    }
  } catch {}
  return { patterns: [], shortcuts: {} };
}

function saveRxHistory(history) {
  const dir = path.dirname(RX_HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RX_HISTORY_FILE, JSON.stringify(history, null, 2));
}

function runShell(cmd, opts = {}) {
  try {
    const result = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
    return { ok: true, output: result };
  } catch (err) {
    return { ok: false, output: err.stdout || '', error: err.stderr || err.message };
  }
}

function printBanner() {
  console.log('');
  console.log('  ∞ Heady CLI — Sacred Geometry Command Interface v3.0.0');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ─── Help ───────────────────────────────────────────────────────────────────

const COMMANDS = {
  'help':         'Show this help menu',
  'status':       'System health check (manager + services)',
  'start':        'Start heady-manager server',
  'dev':          'Start in development mode (nodemon)',
  'build':        'Build frontend',
  'deploy':       'Run auto-deploy',
  'sync':         'Sync all git remotes',
  'scan':         'Run security + lint scan',
  'train':        'Trigger model training',
  'test':         'Run test suite',
  'lint':         'Run ESLint with auto-fix',
  'pipeline':     'Run HC pipeline',
  'realmonitor':  'Start real-time system monitoring',
  '--rx "<task>"':'Rapid-execute: match or learn a fix for repeated errors/tasks',
  '--rx list':    'List all learned rx patterns',
  '--rx clear':   'Clear rx history',
};

function showHelp() {
  printBanner();
  console.log('');
  console.log('  Usage: hc <command> [options]');
  console.log('');
  const maxLen = Math.max(...Object.keys(COMMANDS).map(k => k.length));
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`    ${cmd.padEnd(maxLen + 2)} ${desc}`);
  }
  console.log('');
}

// ─── RX (Rapid Execute) ────────────────────────────────────────────────────
// hc --rx "the error or task description"
// Learns from repeated tasks, builds shortcuts, runs through hcautoflow.

function handleRx() {
  const rxArgs = args.slice(1);
  const rxInput = rxArgs.join(' ').trim();

  if (!rxInput || rxInput === 'help') {
    console.log('\n  hc --rx — Rapid Execute (Learn & Fix)');
    console.log('  ─────────────────────────────────────');
    console.log('  Usage:');
    console.log('    hc --rx "port 3300 already in use"    Match or learn a fix');
    console.log('    hc --rx list                          Show all learned patterns');
    console.log('    hc --rx clear                         Clear history');
    console.log('    hc --rx add "pattern" "fix command"   Manually add a pattern\n');
    return;
  }

  const history = loadRxHistory();

  // Sub-commands
  if (rxInput === 'list') {
    if (history.patterns.length === 0) {
      console.log('\n  No rx patterns learned yet. Use: hc --rx "error message"\n');
      return;
    }
    console.log(`\n  Learned RX Patterns (${history.patterns.length}):`);
    console.log('  ─────────────────────────────────────');
    history.patterns.forEach((p, i) => {
      console.log(`  ${i + 1}. Pattern: "${p.match}"`);
      console.log(`     Fix:     ${p.fix}`);
      console.log(`     Hits:    ${p.hits || 0}  |  Last: ${p.lastUsed || 'never'}`);
      console.log('');
    });
    return;
  }

  if (rxInput === 'clear') {
    saveRxHistory({ patterns: [], shortcuts: {} });
    console.log('\n  RX history cleared.\n');
    return;
  }

  if (rxInput.startsWith('add ')) {
    const addMatch = rxInput.match(/^add\s+"([^"]+)"\s+"([^"]+)"$/);
    if (!addMatch) {
      console.log('\n  Usage: hc --rx add "pattern to match" "command to run"\n');
      return;
    }
    history.patterns.push({
      match: addMatch[1],
      fix: addMatch[2],
      hits: 0,
      created: new Date().toISOString(),
      lastUsed: null
    });
    saveRxHistory(history);
    console.log(`\n  Added RX pattern: "${addMatch[1]}" -> "${addMatch[2]}"\n`);
    return;
  }

  // ─── Pattern Matching: find the best match for the input ─────────────

  const inputLower = rxInput.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of history.patterns) {
    const patLower = pattern.match.toLowerCase();
    // Exact substring match
    if (inputLower.includes(patLower) || patLower.includes(inputLower)) {
      const score = patLower.length / Math.max(inputLower.length, 1);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    }
    // Word overlap scoring
    const inputWords = new Set(inputLower.split(/\s+/));
    const patWords = patLower.split(/\s+/);
    const overlap = patWords.filter(w => inputWords.has(w)).length;
    const wordScore = overlap / Math.max(patWords.length, 1);
    if (wordScore > 0.5 && wordScore > bestScore) {
      bestScore = wordScore;
      bestMatch = pattern;
    }
  }

  if (bestMatch && bestScore > 0.3) {
    console.log(`\n  RX MATCH FOUND (score: ${(bestScore * 100).toFixed(0)}%)`);
    console.log(`  Pattern: "${bestMatch.match}"`);
    console.log(`  Fix:     ${bestMatch.fix}`);
    console.log(`  Executing...`);
    console.log('  ─────────────────────────────────────\n');

    bestMatch.hits = (bestMatch.hits || 0) + 1;
    bestMatch.lastUsed = new Date().toISOString();
    saveRxHistory(history);

    const result = runShell(bestMatch.fix);
    if (result.ok) {
      console.log('\n  RX fix applied successfully.\n');
    } else {
      console.log(`\n  RX fix failed: ${result.error}\n`);
    }
    return;
  }

  // ─── No match — check built-in patterns ──────────────────────────────

  const BUILTIN_PATTERNS = [
    { match: 'port.*in use|address already in use|eaddrinuse', fix: 'pwsh -Command "& ./scripts/kill-port.ps1"', desc: 'Kill process on blocked port' },
    { match: 'cannot find module|module not found|err_module_not_found', fix: 'npm install', desc: 'Reinstall node dependencies' },
    { match: 'eslint|lint error|linting', fix: 'npm run lint:fix', desc: 'Auto-fix lint errors' },
    { match: 'git.*index.lock|lock file|index.lock', fix: 'pwsh -Command "Remove-Item .git/index.lock -Force -ErrorAction SilentlyContinue"', desc: 'Remove git lock file' },
    { match: 'permission denied|eacces', fix: 'pwsh -Command "icacls . /grant Everyone:F /T /C /Q"', desc: 'Fix file permissions' },
    { match: 'out of memory|heap|javascript heap', fix: 'node --max-old-space-size=8192 heady-manager.js', desc: 'Restart with more memory' },
    { match: 'connection refused|econnrefused|timeout', fix: 'npm start', desc: 'Restart heady-manager' },
    { match: 'build.*fail|compilation error|webpack', fix: 'npm run build', desc: 'Rebuild frontend' },
    { match: 'test.*fail|jest|assertion', fix: 'npm test', desc: 'Re-run tests' },
    { match: 'docker.*not running|daemon.*not running', fix: 'pwsh -Command "Start-Service docker"', desc: 'Start Docker daemon' },
  ];

  for (const bp of BUILTIN_PATTERNS) {
    if (new RegExp(bp.match, 'i').test(inputLower)) {
      console.log(`\n  BUILTIN RX MATCH: ${bp.desc}`);
      console.log(`  Fix: ${bp.fix}`);
      console.log(`  Executing...`);
      console.log('  ─────────────────────────────────────\n');

      // Learn it for next time
      history.patterns.push({
        match: rxInput,
        fix: bp.fix,
        hits: 1,
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        source: 'builtin'
      });
      saveRxHistory(history);

      runShell(bp.fix);
      return;
    }
  }

  // ─── No match at all — prompt user ────────────────────────────────────

  console.log(`\n  No RX pattern found for: "${rxInput}"`);
  console.log('  ─────────────────────────────────────');
  console.log('  To teach a fix:');
  console.log(`    hc --rx add "${rxInput}" "command to fix it"`);
  console.log('');

  // Still log it so we can see frequent unmatched patterns
  if (!history.unmatched) history.unmatched = [];
  history.unmatched.push({ input: rxInput, ts: new Date().toISOString() });
  if (history.unmatched.length > 50) history.unmatched = history.unmatched.slice(-50);
  saveRxHistory(history);
}

// ─── Command Router ─────────────────────────────────────────────────────────

if (!command) {
  showHelp();
  process.exit(0);
}

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  case '--rx':
  case '-rx':
  case 'rx':
    handleRx();
    break;

  case 'status': {
    printBanner();
    console.log('\n  Checking system status...\n');
    const nodeV = runShell('node -v', { silent: true });
    const npmV = runShell('npm -v', { silent: true });
    const gitV = runShell('git --version', { silent: true });
    const dockerV = runShell('docker --version', { silent: true });
    console.log(`  Node:    ${nodeV.ok ? nodeV.output.trim() : 'NOT FOUND'}`);
    console.log(`  npm:     ${npmV.ok ? npmV.output.trim() : 'NOT FOUND'}`);
    console.log(`  Git:     ${gitV.ok ? gitV.output.trim() : 'NOT FOUND'}`);
    console.log(`  Docker:  ${dockerV.ok ? dockerV.output.trim() : 'NOT FOUND'}`);
    console.log(`  OS:      ${os.type()} ${os.release()} (${os.arch()})`);
    console.log(`  RAM:     ${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)}GB free / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB total`);
    console.log(`  CPUs:    ${os.cpus().length}`);
    console.log('');
    break;
  }

  case 'start':
    runShell('node heady-manager.js');
    break;

  case 'dev':
    runShell('npx nodemon heady-manager.js');
    break;

  case 'build':
    runShell('npm run build');
    break;

  case 'deploy':
    runShell('npm run deploy:auto');
    break;

  case 'sync':
    runShell('npm run sync');
    break;

  case 'scan':
    printBanner();
    console.log('\n  Running security + lint scan...\n');
    console.log('  [1/3] ESLint...');
    runShell('npm run lint');
    console.log('  [2/3] npm audit...');
    runShell('npm audit --omit=dev', { silent: false });
    console.log('  [3/3] Secret pattern scan...');
    const grepResult = runShell(
      'git grep -n -E "(password|secret|api_key)\\s*[=:]\\s*[\'\\"][^\'\\"\\$]{8,}[\'\\"]" -- "*.js" "*.yaml" "*.yml" "*.json" ":!package-lock.json" ":!*.example" ":!ventoy/"',
      { silent: true }
    );
    if (grepResult.ok && grepResult.output.trim()) {
      console.log('  POTENTIAL HARDCODED SECRETS FOUND:');
      console.log(grepResult.output);
    } else {
      console.log('  No hardcoded secrets detected.');
    }
    console.log('');
    break;

  case 'train':
    runShell('pwsh -File ./scripts/train-model-simple.ps1 -auto -nonInteractive');
    break;

  case 'test':
    runShell('npm test');
    break;

  case 'lint':
    runShell('npm run lint:fix');
    break;

  case 'pipeline':
    runShell('npm run pipeline');
    break;

  case 'realmonitor': {
    console.log('\n  Heady Real-Time Monitor — OBSERVER Daemon Active');
    console.log('  Press Ctrl+C to stop\n');
    const startTime = Date.now();
    const monitor = setInterval(() => {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAvg = os.loadavg();
      const freeMem = os.freemem();
      console.log(`  [${new Date().toISOString()}] Up:${uptime}s CPU:${(cpuUsage.user / 1e6).toFixed(2)}s Heap:${(memUsage.heapUsed / 1048576).toFixed(1)}MB Load:${loadAvg[0].toFixed(2)} FreeRAM:${(freeMem / 1073741824).toFixed(1)}GB`);
    }, 1000);
    process.on('SIGINT', () => { clearInterval(monitor); console.log('\n  Monitor stopped'); process.exit(0); });
    break;
  }

  default:
    console.log(`\n  Unknown command: ${command}`);
    console.log('  Run "hc help" for available commands.\n');
    process.exit(1);
}
