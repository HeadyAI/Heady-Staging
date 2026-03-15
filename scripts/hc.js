#!/usr/bin/env node
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
const isWindows = process.platform === 'win32';

// ─── ANSI Color Palette — Sacred Geometry Tones ──────────────────────────────

const C = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  italic:   '\x1b[3m',
  // Sacred Geometry palette
  gold:     '\x1b[38;5;220m',   // Golden ratio warmth
  violet:   '\x1b[38;5;141m',   // Crown chakra
  teal:     '\x1b[38;5;80m',    // Throat chakra
  rose:     '\x1b[38;5;204m',   // Heart energy
  emerald:  '\x1b[38;5;48m',    // Growth / success
  amber:    '\x1b[38;5;214m',   // Warning / solar plexus
  sky:      '\x1b[38;5;117m',   // Clarity
  white:    '\x1b[37m',
  gray:     '\x1b[38;5;243m',
  red:      '\x1b[38;5;196m',
  green:    '\x1b[38;5;82m',
  cyan:     '\x1b[38;5;51m',
  // Background
  bgDark:   '\x1b[48;5;234m',
};

// ─── Sacred Geometry ASCII Art ───────────────────────────────────────────────

function printBanner() {
  const b = C.bold;
  const g = C.gold;
  const v = C.violet;
  const t = C.teal;
  const r = C.reset;
  const d = C.dim;
  const s = C.sky;

  console.log('');
  console.log(`${v}    ╔══════════════════════════════════════════════════════════════╗${r}`);
  console.log(`${v}    ║${r}  ${g}${b}██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗${r}                ${v}║${r}`);
  console.log(`${v}    ║${r}  ${g}${b}██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝${r}                ${v}║${r}`);
  console.log(`${v}    ║${r}  ${g}${b}███████║█████╗  ███████║██║  ██║ ╚████╔╝${r}                 ${v}║${r}`);
  console.log(`${v}    ║${r}  ${g}${b}██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝${r}                  ${v}║${r}`);
  console.log(`${v}    ║${r}  ${g}${b}██║  ██║███████╗██║  ██║██████╔╝   ██║${r}                   ${v}║${r}`);
  console.log(`${v}    ║${r}  ${g}${b}╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝${r}                   ${v}║${r}`);
  console.log(`${v}    ║${r}                                                              ${v}║${r}`);
  console.log(`${v}    ║${r}  ${t}∞ SACRED GEOMETRY ∞${r}  ${d}Organic Systems · Breathing Interfaces${r}  ${v}║${r}`);
  console.log(`${v}    ╠══════════════════════════════════════════════════════════════╣${r}`);
  console.log(`${v}    ║${r}  ${s}HC CLI${r} ${d}v3.0.0${r}  ${d}·${r}  ${t}Command Interface${r}  ${d}·${r}  ${v}◈ ◇ ◆${r}              ${v}║${r}`);
  console.log(`${v}    ╚══════════════════════════════════════════════════════════════╝${r}`);
  console.log('');
}

function printSmallBanner() {
  const v = C.violet;
  const g = C.gold;
  const t = C.teal;
  const r = C.reset;
  const d = C.dim;
  console.log('');
  console.log(`  ${v}◈${r} ${g}${C.bold}HEADY${r} ${d}·${r} ${t}Sacred Geometry CLI${r} ${d}v3.0.0${r} ${v}◈${r}`);
  console.log(`  ${v}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${r}`);
}

function printSectionHeader(title, icon) {
  const v = C.violet;
  const t = C.teal;
  const r = C.reset;
  const d = C.dim;
  icon = icon || '◇';
  console.log(`\n  ${v}${icon}${r} ${t}${C.bold}${title}${r}`);
  console.log(`  ${d}${'─'.repeat(40)}${r}`);
}

function printSuccess(msg) {
  console.log(`  ${C.emerald}✔${C.reset} ${msg}`);
}

function printWarning(msg) {
  console.log(`  ${C.amber}⚠${C.reset} ${msg}`);
}

function printError(msg) {
  console.log(`  ${C.red}✖${C.reset} ${msg}`);
}

function printInfo(msg) {
  console.log(`  ${C.sky}◈${C.reset} ${msg}`);
}

function printKeyValue(key, value, color) {
  color = color || C.white;
  console.log(`  ${C.dim}${key.padEnd(12)}${C.reset} ${color}${value}${C.reset}`);
}

function printFlowerOfLife() {
  const v = C.violet;
  const g = C.gold;
  const t = C.teal;
  const d = C.dim;
  const r = C.reset;
  console.log(`  ${d}        ·${r}`);
  console.log(`  ${d}      ·${r} ${v}◈${r} ${d}·${r}`);
  console.log(`  ${d}    ·${r} ${t}◇${r} ${g}◆${r} ${t}◇${r} ${d}·${r}`);
  console.log(`  ${d}      ·${r} ${v}◈${r} ${d}·${r}`);
  console.log(`  ${d}        ·${r}`);
}

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

function killPort(port) {
  port = port || 3300;
  if (isWindows) {
    runShell(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`, { silent: true });
  } else {
    // Try fuser first, fall back to lsof
    let result = runShell(`fuser -k ${port}/tcp 2>/dev/null`, { silent: true });
    if (!result.ok) {
      runShell(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { silent: true });
    }
  }
}

function removeGitLock() {
  const lockFile = path.join(ROOT, '.git', 'index.lock');
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      return true;
    }
  } catch {}
  return false;
}

function fixPermissions() {
  if (isWindows) {
    runShell('icacls . /grant Everyone:F /T /C /Q', { silent: true });
  } else {
    runShell('chmod -R u+rwX .', { silent: true });
  }
}

// ─── Help ───────────────────────────────────────────────────────────────────

const COMMANDS = {
  'help':          'Show this help menu',
  'status':        'System health check (manager + services)',
  'start':         'Start heady-manager server',
  'dev':           'Start in development mode (nodemon)',
  'build':         'Build frontend',
  'deploy':        'Run auto-deploy',
  'sync':          'Sync all git remotes',
  'scan':          'Run security + lint scan',
  'train':         'Trigger model training',
  'test':          'Run test suite',
  'lint':          'Run ESLint with auto-fix',
  'pipeline':      'Run HC pipeline',
  'realmonitor':   'Start real-time system monitoring',
  '--rx "<task>"': 'Rapid-execute: match or learn a fix',
  '--rx list':     'List all learned rx patterns',
  '--rx clear':    'Clear rx history',
};

function showHelp() {
  printBanner();
  console.log(`  ${C.teal}${C.bold}Usage:${C.reset} ${C.white}hc <command> [options]${C.reset}`);
  console.log('');

  const maxLen = Math.max(...Object.keys(COMMANDS).map(k => k.length));
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    const isRx = cmd.startsWith('--rx');
    const cmdColor = isRx ? C.rose : C.gold;
    console.log(`    ${cmdColor}${cmd.padEnd(maxLen + 2)}${C.reset} ${C.dim}${desc}${C.reset}`);
  }

  console.log('');
  printFlowerOfLife();
  console.log('');
}

// ─── RX (Rapid Execute) ────────────────────────────────────────────────────
// hc --rx "the error or task description"
// Learns from repeated tasks, builds shortcuts, runs through hcautoflow.

function handleRx() {
  const rxArgs = args.slice(1);
  const rxInput = rxArgs.join(' ').trim();

  if (!rxInput || rxInput === 'help') {
    printSmallBanner();
    printSectionHeader('RX — Rapid Execute (Learn & Fix)', '⚡');
    console.log(`  ${C.dim}Usage:${C.reset}`);
    console.log(`    ${C.gold}hc --rx "port 3300 already in use"${C.reset}    ${C.dim}Match or learn a fix${C.reset}`);
    console.log(`    ${C.gold}hc --rx list${C.reset}                          ${C.dim}Show all learned patterns${C.reset}`);
    console.log(`    ${C.gold}hc --rx clear${C.reset}                         ${C.dim}Clear history${C.reset}`);
    console.log(`    ${C.gold}hc --rx add "pattern" "fix command"${C.reset}   ${C.dim}Manually add a pattern${C.reset}`);
    console.log('');
    return;
  }

  const history = loadRxHistory();

  // Sub-commands
  if (rxInput === 'list') {
    printSmallBanner();
    if (history.patterns.length === 0) {
      printInfo('No rx patterns learned yet. Use: hc --rx "error message"');
      console.log('');
      return;
    }
    printSectionHeader(`Learned RX Patterns (${history.patterns.length})`, '⚡');
    history.patterns.forEach((p, i) => {
      console.log(`  ${C.gold}${i + 1}.${C.reset} ${C.teal}Pattern:${C.reset} "${p.match}"`);
      console.log(`     ${C.violet}Fix:${C.reset}     ${p.fix}`);
      console.log(`     ${C.dim}Hits: ${p.hits || 0}  |  Last: ${p.lastUsed || 'never'}${C.reset}`);
      console.log('');
    });
    return;
  }

  if (rxInput === 'clear') {
    saveRxHistory({ patterns: [], shortcuts: {} });
    printSuccess('RX history cleared.');
    console.log('');
    return;
  }

  if (rxInput.startsWith('add ')) {
    const addMatch = rxInput.match(/^add\s+"([^"]+)"\s+"([^"]+)"$/);
    if (!addMatch) {
      printWarning('Usage: hc --rx add "pattern to match" "command to run"');
      console.log('');
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
    printSuccess(`Added RX pattern: "${addMatch[1]}" -> "${addMatch[2]}"`);
    console.log('');
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
    printSectionHeader('RX MATCH FOUND', '⚡');
    console.log(`  ${C.dim}Score:${C.reset}   ${C.emerald}${(bestScore * 100).toFixed(0)}%${C.reset}`);
    console.log(`  ${C.dim}Pattern:${C.reset} ${C.teal}"${bestMatch.match}"${C.reset}`);
    console.log(`  ${C.dim}Fix:${C.reset}     ${C.gold}${bestMatch.fix}${C.reset}`);
    console.log(`  ${C.violet}Executing...${C.reset}`);
    console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}\n`);

    bestMatch.hits = (bestMatch.hits || 0) + 1;
    bestMatch.lastUsed = new Date().toISOString();
    saveRxHistory(history);

    const result = runShell(bestMatch.fix);
    if (result.ok) {
      printSuccess('RX fix applied successfully.');
    } else {
      printError(`RX fix failed: ${result.error}`);
    }
    console.log('');
    return;
  }

  // ─── No match — check built-in patterns (cross-platform) ─────────────

  const BUILTIN_PATTERNS = [
    { match: 'port.*in use|address already in use|eaddrinuse', fix: '__killport__', desc: 'Kill process on blocked port' },
    { match: 'cannot find module|module not found|err_module_not_found', fix: 'npm install', desc: 'Reinstall node dependencies' },
    { match: 'eslint|lint error|linting', fix: 'npm run lint:fix', desc: 'Auto-fix lint errors' },
    { match: 'git.*index.lock|lock file|index.lock', fix: '__gitlock__', desc: 'Remove git lock file' },
    { match: 'permission denied|eacces', fix: '__fixperms__', desc: 'Fix file permissions' },
    { match: 'out of memory|heap|javascript heap', fix: 'node --max-old-space-size=8192 heady-manager.js', desc: 'Restart with more memory' },
    { match: 'connection refused|econnrefused|timeout', fix: 'npm start', desc: 'Restart heady-manager' },
    { match: 'build.*fail|compilation error|webpack', fix: 'npm run build', desc: 'Rebuild frontend' },
    { match: 'test.*fail|jest|assertion', fix: 'npm test', desc: 'Re-run tests' },
  ];

  for (const bp of BUILTIN_PATTERNS) {
    if (new RegExp(bp.match, 'i').test(inputLower)) {
      printSectionHeader(`BUILTIN RX: ${bp.desc}`, '⚡');

      let actualFix = bp.fix;
      // Handle cross-platform special actions
      if (bp.fix === '__killport__') {
        const portMatch = rxInput.match(/(\d{4,5})/);
        const port = portMatch ? parseInt(portMatch[1]) : 3300;
        printInfo(`Killing process on port ${port}...`);
        killPort(port);
        printSuccess('Port cleared.');
        // Learn the actual command for history
        actualFix = isWindows ? `netstat -aon | findstr :${port}` : `fuser -k ${port}/tcp`;
      } else if (bp.fix === '__gitlock__') {
        printInfo('Removing git lock file...');
        if (removeGitLock()) {
          printSuccess('Git lock file removed.');
        } else {
          printInfo('No lock file found.');
        }
        actualFix = 'rm .git/index.lock';
      } else if (bp.fix === '__fixperms__') {
        printInfo('Fixing file permissions...');
        fixPermissions();
        printSuccess('Permissions updated.');
        actualFix = isWindows ? 'icacls . /grant Everyone:F /T' : 'chmod -R u+rwX .';
      } else {
        console.log(`  ${C.dim}Fix:${C.reset} ${C.gold}${bp.fix}${C.reset}`);
        console.log(`  ${C.violet}Executing...${C.reset}\n`);
        runShell(bp.fix);
      }

      // Learn it for next time
      history.patterns.push({
        match: rxInput,
        fix: actualFix,
        hits: 1,
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        source: 'builtin'
      });
      saveRxHistory(history);
      console.log('');
      return;
    }
  }

  // ─── No match at all — prompt user ────────────────────────────────────

  printWarning(`No RX pattern found for: "${rxInput}"`);
  console.log(`  ${C.dim}To teach a fix:${C.reset}`);
  console.log(`    ${C.gold}hc --rx add "${rxInput}" "command to fix it"${C.reset}`);
  console.log('');

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
    printSectionHeader('System Status', '◆');
    const nodeV = runShell('node -v', { silent: true });
    const npmV = runShell('npm -v', { silent: true });
    const gitV = runShell('git --version', { silent: true });
    const dockerV = runShell('docker --version', { silent: true });

    printKeyValue('Node', nodeV.ok ? nodeV.output.trim() : 'NOT FOUND', nodeV.ok ? C.emerald : C.red);
    printKeyValue('npm', npmV.ok ? npmV.output.trim() : 'NOT FOUND', npmV.ok ? C.emerald : C.red);
    printKeyValue('Git', gitV.ok ? gitV.output.trim().replace('git version ', '') : 'NOT FOUND', gitV.ok ? C.emerald : C.red);
    printKeyValue('Docker', dockerV.ok ? dockerV.output.trim().split(',')[0].replace('Docker version ', '') : 'NOT FOUND', dockerV.ok ? C.emerald : C.amber);

    printSectionHeader('Hardware', '◇');
    printKeyValue('OS', `${os.type()} ${os.release()} (${os.arch()})`, C.sky);
    printKeyValue('RAM', `${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)}GB free / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB total`, C.teal);
    printKeyValue('CPUs', `${os.cpus().length} cores`, C.teal);
    printKeyValue('Platform', isWindows ? 'Windows' : process.platform, C.sky);

    // Check if heady-manager.js exists
    printSectionHeader('Heady Services', '◈');
    const managerExists = fs.existsSync(path.join(ROOT, 'heady-manager.js'));
    printKeyValue('Manager', managerExists ? 'heady-manager.js found' : 'MISSING', managerExists ? C.emerald : C.red);

    const configExists = fs.existsSync(path.join(ROOT, 'configs', 'hcfullpipeline.yaml'));
    printKeyValue('Pipeline', configExists ? 'hcfullpipeline.yaml found' : 'MISSING', configExists ? C.emerald : C.amber);

    const pkgExists = fs.existsSync(path.join(ROOT, 'package.json'));
    if (pkgExists) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
        printKeyValue('Version', pkg.version || 'unknown', C.gold);
      } catch {}
    }

    console.log('');
    printFlowerOfLife();
    console.log('');
    break;
  }

  case 'start':
    printSmallBanner();
    printInfo('Starting heady-manager on port 3300...');
    console.log('');
    runShell('node heady-manager.js');
    break;

  case 'dev':
    printSmallBanner();
    printInfo('Starting development mode (nodemon)...');
    console.log('');
    runShell('npx nodemon heady-manager.js');
    break;

  case 'build':
    printSmallBanner();
    printInfo('Building frontend...');
    console.log('');
    runShell('npm run build');
    break;

  case 'deploy':
    printSmallBanner();
    printInfo('Running auto-deploy...');
    console.log('');
    runShell('npm run deploy:auto');
    break;

  case 'sync':
    printSmallBanner();
    printInfo('Syncing all git remotes...');
    console.log('');
    runShell('npm run sync');
    break;

  case 'scan': {
    printBanner();
    printSectionHeader('Security + Lint Scan', '🔍');

    console.log(`\n  ${C.gold}[1/3]${C.reset} ${C.teal}ESLint Analysis${C.reset}`);
    console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
    runShell('npm run lint');

    console.log(`\n  ${C.gold}[2/3]${C.reset} ${C.teal}npm Audit${C.reset}`);
    console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
    runShell('npm audit --omit=dev', { silent: false });

    console.log(`\n  ${C.gold}[3/3]${C.reset} ${C.teal}Secret Pattern Scan${C.reset}`);
    console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
    const grepResult = runShell(
      'git grep -n -E "(password|secret|api_key)\\s*[=:]\\s*[\'\\"][^\'\\"\\$]{8,}[\'\\"]" -- "*.js" "*.yaml" "*.yml" "*.json" ":!package-lock.json" ":!*.example" ":!ventoy/"',
      { silent: true }
    );
    if (grepResult.ok && grepResult.output.trim()) {
      printError('POTENTIAL HARDCODED SECRETS FOUND:');
      console.log(grepResult.output);
    } else {
      printSuccess('No hardcoded secrets detected.');
    }
    console.log('');
    break;
  }

  case 'train':
    printSmallBanner();
    printInfo('Triggering model training...');
    console.log('');
    // Cross-platform: try node-based training first, fall back to script
    if (fs.existsSync(path.join(ROOT, 'scripts', 'train-model.js'))) {
      runShell('node scripts/train-model.js --auto --non-interactive');
    } else if (fs.existsSync(path.join(ROOT, 'src', 'heady_project', 'heady_conductor.py'))) {
      runShell('python src/heady_project/heady_conductor.py train --auto');
    } else {
      printWarning('No training script found. Available options:');
      console.log(`    ${C.dim}· Create scripts/train-model.js${C.reset}`);
      console.log(`    ${C.dim}· Create src/heady_project/heady_conductor.py${C.reset}`);
    }
    break;

  case 'test':
    printSmallBanner();
    printInfo('Running test suite...');
    console.log('');
    runShell('npm test');
    break;

  case 'lint':
    printSmallBanner();
    printInfo('Running ESLint with auto-fix...');
    console.log('');
    runShell('npm run lint:fix');
    break;

  case 'pipeline':
    printSmallBanner();
    printInfo('Running HC pipeline...');
    console.log('');
    runShell('npm run pipeline');
    break;

  case 'realmonitor': {
    printBanner();
    printSectionHeader('Real-Time System Monitor', '◈');
    console.log(`  ${C.dim}Press Ctrl+C to stop${C.reset}\n`);

    const startTime = Date.now();
    const monitor = setInterval(() => {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const memUsage = process.memoryUsage();
      const loadAvg = os.loadavg();
      const freeMem = os.freemem();
      const heapMB = (memUsage.heapUsed / 1048576).toFixed(1);
      const freeGB = (freeMem / 1073741824).toFixed(1);
      const load = loadAvg[0].toFixed(2);

      const ts = new Date().toISOString().split('T')[1].split('.')[0];
      const loadColor = loadAvg[0] < 2 ? C.emerald : loadAvg[0] < 5 ? C.amber : C.red;
      const heapColor = memUsage.heapUsed < 100 * 1048576 ? C.emerald : C.amber;

      console.log(`  ${C.dim}${ts}${C.reset} ${C.violet}◈${C.reset} Up:${C.teal}${uptime}s${C.reset} ${C.dim}│${C.reset} Heap:${heapColor}${heapMB}MB${C.reset} ${C.dim}│${C.reset} Load:${loadColor}${load}${C.reset} ${C.dim}│${C.reset} Free:${C.sky}${freeGB}GB${C.reset}`);
    }, 1000);
    process.on('SIGINT', () => {
      clearInterval(monitor);
      console.log(`\n  ${C.violet}◈${C.reset} Monitor stopped.`);
      console.log('');
      process.exit(0);
    });
    break;
  }

  default:
    printSmallBanner();
    printError(`Unknown command: ${command}`);
    console.log(`  ${C.dim}Run "${C.gold}hc help${C.reset}${C.dim}" for available commands.${C.reset}`);
    console.log('');
    process.exit(1);
}
