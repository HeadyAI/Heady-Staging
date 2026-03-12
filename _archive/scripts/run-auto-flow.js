/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
/**
 * ═══ HEADY FULL-THROTTLE AUTO-FLOW SUCCESS MODE PIPELINE ═══
 *
 * After production go-live, this pipeline runs CONTINUOUSLY.
 * It unifies the AutoSuccessEngine (160+ internal tasks) with
 * the auto-flow-200-tasks.json pipeline (382 external tasks)
 * for a single, high-throughput execution loop.
 *
 * Modes:
 *   HEADY_THROTTLE=full  → 100ms interval, batch 50 (directive spec)
 *   default              → φ-aligned 16.18s interval, batch 13
 */

const { AutoSuccessEngine } = require('../src/hc_auto_success');
const { loadPipeline } = require('../src/hcfp/task-dispatcher');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'production-go-live.log');
const NOW = new Date().toISOString();
const FULL_THROTTLE = process.env.HEADY_THROTTLE === 'full';

// ═══ Config ═══
const interval = FULL_THROTTLE ? 100 : 16180;   // 100ms hyper-speed or φ × 10000
const batchSize = FULL_THROTTLE ? 50 : 13;       // 50 per batch or Fibonacci 13

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 HEADY FULL-THROTTLE AUTO-FLOW SUCCESS MODE              ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  Mode: ${FULL_THROTTLE ? 'FULL-THROTTLE (100ms, 50/batch)' : 'φ-ALIGNED (16.18s, 13/batch)   '}    ║
║  Started: ${NOW}                                             ║
║  Pipeline: HCFP Auto-Success + Auto-Flow-200                 ║
╚══════════════════════════════════════════════════════════════╝
`);

// ─── Log production go-live timestamp ───────────────────────────────
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const goLiveEntry = [
    `═══════════════════════════════════════════════════`,
    `AUTO-FLOW PIPELINE STARTED: ${NOW}`,
    `Initiated by: HeadyMe (e@headyconnection.org)`,
    `Mode: ${FULL_THROTTLE ? 'Full-Throttle' : 'φ-Aligned'} Auto-Flow Success`,
    `Interval: ${interval}ms | Batch: ${batchSize}`,
    `Status: ALL SYSTEMS LIVE`,
    `═══════════════════════════════════════════════════`,
    ''
].join('\n');

fs.appendFileSync(LOG_FILE, goLiveEntry);
console.log(`📋 Pipeline go-live logged to: ${LOG_FILE}`);

// ─── Start the engine ───────────────────────────────────────────────
const engine = new AutoSuccessEngine({ interval, batchSize });

// ─── Load auto-flow-200 external tasks ──────────────────────────────
try {
    const externalTasks = loadPipeline({ pool: 'all', minWeight: 1, limit: 1000 });
    const added = engine.loadExternalTasks(externalTasks);
    console.log(`📦 Auto-flow-200 pipeline: ${externalTasks.length} tasks loaded, ${added} new merged`);
} catch (err) {
    console.warn(`⚠ Auto-flow-200 pipeline load failed (engine continues with internal catalog): ${err.message}`);
}

// ─── Start execution loop ───────────────────────────────────────────
engine.start();

const status = engine.getStatus();
console.log(`\n∞ Engine: ${status.totalTasks} tasks across ${Object.keys(status.categories).length} categories`);
console.log(`🐝 HeadySwarm ready — HeadyBees standing by for task dispatch.`);
console.log(`♾️  Pipeline running continuously. Press Ctrl+C to stop.\n`);

// ─── Keep alive ─────────────────────────────────────────────────────
process.on('SIGINT', () => {
    console.log('\n🛑 Pipeline stopped by operator.');
    engine.stop();
    fs.appendFileSync(LOG_FILE, `PIPELINE STOPPED: ${new Date().toISOString()}\n`);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Pipeline terminated.');
    engine.stop();
    fs.appendFileSync(LOG_FILE, `PIPELINE TERMINATED: ${new Date().toISOString()}\n`);
    process.exit(0);
});
