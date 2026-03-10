const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fib } = require('../shared/phi-math');

const overlayRoot = path.join(__dirname, '..');
const backupRoot = path.join(overlayRoot, 'backups');
fs.mkdirSync(backupRoot, { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  retentionDays: fib(8),
  pointInTimeRecoveryWindowHours: fib(9),
  strategy: 'nightly logical snapshot + WAL archival manifest',
  datasets: [
    'services/auth-session-server/data/sessions.json',
    'services/search-service/data/index.json',
    'services/scheduler-service/data/jobs.json',
    'services/migration-service/data/migration-state.json'
  ]
};

const raw = JSON.stringify(payload, null, 2);
const digest = crypto.createHash('sha256').update(raw).digest('hex');
const file = path.join(backupRoot, `pgvector-backup-plan-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify({ ...payload, digest }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ ok: true, dryRun: process.argv.includes('--dry-run'), file, digest }, null, 2) + '\n');
