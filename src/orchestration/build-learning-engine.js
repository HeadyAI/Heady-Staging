/**
 * @fileoverview Build Learning Engine
 * 
 * Orchestrates parallel AI agents on complex build tasks with:
 * 1. Build spec → subtask DAG decomposition via LLM
 * 2. Parallel agent execution with mid-build context propagation
 * 3. Determinism measurement across repeated runs (SHA-256 hashing)
 * 4. Pattern learning — records what works for future builds
 * 
 * © 2026 Heady™Systems Inc.
 */

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// ─── Constants ────────────────────────────────────────────────────────────────

const PHI = 1.618033988749895;
const PSI = 1 / PHI; // ≈ 0.618
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const DECOMPOSITION_PROMPT = `You are a build architect. Decompose this project spec into concrete implementation subtasks.

RULES:
1. Each subtask produces ONE file or ONE logical unit
2. Mark dependencies between subtasks (which must complete first)  
3. Mark which subtasks can run in PARALLEL (independent of each other)
4. Each subtask must have: id, description, file_path, dependencies[], parallel_group
5. Order subtasks so foundational files (configs, types, schemas) come first

Respond ONLY with valid JSON array. No markdown, no explanation.

Example format:
[
  {"id": "t1", "description": "Create package.json with dependencies", "file_path": "package.json", "dependencies": [], "parallel_group": 0, "type": "config"},
  {"id": "t2", "description": "Create database schema", "file_path": "src/db/schema.js", "dependencies": ["t1"], "parallel_group": 1, "type": "data"},
  {"id": "t3", "description": "Create auth middleware", "file_path": "src/middleware/auth.js", "dependencies": ["t1"], "parallel_group": 1, "type": "logic"},
  {"id": "t4", "description": "Create API routes using auth and db", "file_path": "src/routes/api.js", "dependencies": ["t2", "t3"], "parallel_group": 2, "type": "logic"}
]

PROJECT SPEC:
`;

const SUBTASK_EXECUTION_PROMPT = `You are an expert developer implementing ONE specific file/component of a larger project.

IMPORTANT: You have access to the BUILD CONTEXT below — these are files already completed by other agents working on the same project. USE THEM to ensure consistency (same variable names, same API contracts, same patterns).

Produce ONLY the file content. No markdown fences, no explanation — just the pure code/content for this file.`;

// ─── Build Context (shared state between parallel agents) ────────────────────

class BuildContext {
    constructor(spec) {
        this.spec = spec;
        this.files = new Map();  // filePath → { content, hash, subtaskId, completedAt }
        this.events = [];        // chronological event log
        this.startedAt = Date.now();
    }

    /** Record a completed subtask's output and make it available to dependent agents */
    addFile(filePath, content, subtaskId) {
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        this.files.set(filePath, {
            content,
            hash,
            subtaskId,
            completedAt: Date.now(),
        });
        this.events.push({
            type: 'file_complete',
            subtaskId,
            filePath,
            hash: hash.slice(0, 16),
            ts: Date.now(),
        });
        return hash;
    }

    /** Build the context string to inject into dependent agents' prompts */
    getContextForAgent(dependencyIds) {
        const relevantFiles = [];
        this.files.forEach((file, filePath) => {
            if (dependencyIds.includes(file.subtaskId)) {
                relevantFiles.push({ filePath, content: file.content });
            }
        });

        if (relevantFiles.length === 0) return '';

        return '\n\n=== BUILD CONTEXT (completed files from other agents) ===\n' +
            relevantFiles.map(f =>
                `--- ${f.filePath} ---\n${f.content.slice(0, 3000)}\n`
            ).join('\n');
    }

    /** Get full accumulated context for later-stage agents */
    getFullContext() {
        if (this.files.size === 0) return '';
        const entries = [];
        this.files.forEach((file, filePath) => {
            entries.push(`--- ${filePath} ---\n${file.content.slice(0, 2000)}`);
        });
        return '\n\n=== FULL BUILD CONTEXT ===\n' + entries.join('\n\n');
    }

    /** Get a snapshot of all file hashes for determinism comparison */
    getHashSnapshot() {
        const snapshot = {};
        this.files.forEach((file, filePath) => {
            snapshot[filePath] = file.hash.slice(0, 16);
        });
        return snapshot;
    }
}

// ─── Build Learning Engine ───────────────────────────────────────────────────

class BuildLearningEngine extends EventEmitter {

    /**
     * @param {Object} opts
     * @param {Object} opts.gateway - InferenceGateway instance
     * @param {string} [opts.dataDir] - Directory to store learning data
     */
    constructor(opts = {}) {
        super();
        if (!opts.gateway) throw new Error('BuildLearningEngine requires gateway');

        this._gateway = opts.gateway;
        this._dataDir = opts.dataDir || path.join(process.cwd(), '.heady', 'build-learning');
        this._runs = [];     // All build run records
        this._patterns = {}; // Learned patterns

        // Ensure data directory exists
        try { fs.mkdirSync(this._dataDir, { recursive: true }); } catch (_) { }

        // Load existing learning data
        this._loadPatterns();
    }

    // ─── Main Entry: Practice Build ──────────────────────────────────────────

    /**
     * Execute a full practice build from a project spec.
     * 1. Decompose spec into subtasks
     * 2. Build dependency DAG
     * 3. Execute in parallel with context propagation
     * 4. Record results for learning
     * 
     * @param {string} spec - Project specification
     * @param {Object} [opts]
     * @param {number} [opts.runs=1] - Number of runs for determinism measurement
     * @param {string} [opts.provider] - Force specific provider
     * @returns {Object} Build result with determinism data
     */
    async build(spec, opts = {}) {
        const buildId = `build-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const numRuns = opts.runs || 1;

        logger.info('[BuildLearning] Starting build', { buildId, spec: spec.slice(0, 100), runs: numRuns });
        this.emit('build:start', { buildId, spec: spec.slice(0, 100) });

        // ── Step 1: Decompose ───────────────────────────────────────────────
        const subtasks = await this._decompose(spec);
        if (!subtasks || subtasks.length === 0) {
            return { ok: false, error: 'Failed to decompose build spec' };
        }

        this.emit('build:decomposed', { buildId, subtaskCount: subtasks.length });

        // ── Step 2: Build dependency DAG ────────────────────────────────────
        const groups = this._buildExecutionGroups(subtasks);

        // ── Step 3: Execute (potentially multiple runs for determinism) ─────
        const allRuns = [];
        for (let run = 0; run < numRuns; run++) {
            const runResult = await this._executeRun(buildId, spec, subtasks, groups, run, opts);
            allRuns.push(runResult);
            this.emit('build:run_complete', { buildId, run: run + 1, total: numRuns });
        }

        // ── Step 4: Compute determinism (if multiple runs) ─────────────────
        let determinism = null;
        if (numRuns > 1) {
            determinism = this._computeDeterminism(allRuns);
        }

        // ── Step 5: Learn from this build ──────────────────────────────────
        const buildRecord = {
            buildId,
            spec: spec.slice(0, 500),
            subtaskCount: subtasks.length,
            parallelGroups: groups.length,
            runs: allRuns.map(r => ({
                runIndex: r.runIndex,
                totalMs: r.totalMs,
                success: r.success,
                filesProduced: r.filesProduced,
                hashSnapshot: r.hashSnapshot,
            })),
            determinism,
            learnedPatterns: this._extractPatterns(subtasks, allRuns),
            ts: new Date().toISOString(),
        };

        this._runs.push(buildRecord);
        this._savePatterns(buildRecord);

        this.emit('build:complete', buildRecord);

        return {
            ok: true,
            buildId,
            subtasks: subtasks.map(t => ({
                id: t.id,
                description: t.description,
                file_path: t.file_path,
                parallel_group: t.parallel_group,
                dependencies: t.dependencies,
            })),
            groups: groups.map((g, i) => ({
                group: i,
                subtasks: g.map(t => t.id),
                parallel: g.length > 1,
            })),
            runs: allRuns.map(r => ({
                run: r.runIndex + 1,
                totalMs: r.totalMs,
                success: r.success,
                files: r.filesProduced,
            })),
            determinism,
            patterns: buildRecord.learnedPatterns,
        };
    }

    // ─── Decomposition ──────────────────────────────────────────────────────

    async _decompose(spec) {
        try {
            const result = await this._gateway.complete(
                [
                    { role: 'system', content: DECOMPOSITION_PROMPT },
                    { role: 'user', content: spec },
                ],
                { temperature: 0 } // Deterministic decomposition
            );

            const text = result.content || '';
            // Extract JSON from response (handle markdown fences if present)
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                logger.warn('[BuildLearning] Failed to parse decomposition JSON');
                return null;
            }

            const subtasks = JSON.parse(jsonMatch[0]);
            logger.info('[BuildLearning] Decomposed into subtasks', {
                count: subtasks.length,
                model: result.model,
            });
            return subtasks;
        } catch (err) {
            logger.error('[BuildLearning] Decomposition failed', { error: err.message });
            return null;
        }
    }

    // ─── Dependency DAG → Execution Groups ──────────────────────────────────

    /**
     * Group subtasks into execution layers based on dependencies.
     * Group 0 has no dependencies (can all run in parallel).
     * Group 1 depends on Group 0, etc.
     */
    _buildExecutionGroups(subtasks) {
        const subtaskMap = new Map(subtasks.map(t => [t.id, t]));
        const groups = [];

        // Use parallel_group if provided, otherwise compute from dependencies
        if (subtasks.every(t => typeof t.parallel_group === 'number')) {
            const maxGroup = Math.max(...subtasks.map(t => t.parallel_group));
            for (let g = 0; g <= maxGroup; g++) {
                groups.push(subtasks.filter(t => t.parallel_group === g));
            }
        } else {
            // Topological sort into layers
            const completed = new Set();
            let remaining = [...subtasks];

            while (remaining.length > 0) {
                const ready = remaining.filter(t =>
                    (t.dependencies || []).every(d => completed.has(d))
                );
                if (ready.length === 0) {
                    // Cycle detected — force remaining into final group
                    groups.push(remaining);
                    break;
                }
                groups.push(ready);
                ready.forEach(t => completed.add(t.id));
                remaining = remaining.filter(t => !completed.has(t.id));
            }
        }

        return groups;
    }

    // ─── Execute a Single Run ──────────────────────────────────────────────

    async _executeRun(buildId, spec, subtasks, groups, runIndex, opts) {
        const ctx = new BuildContext(spec);
        const startTime = Date.now();
        const subtaskResults = {};

        for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
            const group = groups[groupIdx];

            this.emit('build:group_start', {
                buildId, runIndex, groupIdx,
                subtasks: group.map(t => t.id),
                parallel: group.length > 1,
            });

            // Execute all subtasks in this group IN PARALLEL
            const parallelResults = await Promise.allSettled(
                group.map(subtask => this._executeSubtask(subtask, ctx, opts))
            );

            // Process results and add to context for next group
            for (let i = 0; i < group.length; i++) {
                const subtask = group[i];
                const result = parallelResults[i];

                if (result.status === 'fulfilled' && result.value.ok) {
                    const output = result.value;
                    subtaskResults[subtask.id] = {
                        ok: true,
                        file_path: subtask.file_path,
                        contentLength: output.content.length,
                        hash: output.hash.slice(0, 16),
                        latencyMs: output.latencyMs,
                        model: output.model,
                    };

                    // KEY: Add to BuildContext — this propagates to dependent agents
                    ctx.addFile(subtask.file_path, output.content, subtask.id);

                    this.emit('build:subtask_complete', {
                        buildId, runIndex, subtaskId: subtask.id,
                        file: subtask.file_path,
                        hash: output.hash.slice(0, 16),
                    });
                } else {
                    const error = result.reason?.message || result.value?.error || 'unknown';
                    subtaskResults[subtask.id] = {
                        ok: false,
                        error,
                        file_path: subtask.file_path,
                    };

                    this.emit('build:subtask_failed', {
                        buildId, runIndex, subtaskId: subtask.id, error,
                    });
                }
            }
        }

        return {
            runIndex,
            totalMs: Date.now() - startTime,
            success: Object.values(subtaskResults).every(r => r.ok),
            filesProduced: Object.values(subtaskResults).filter(r => r.ok).length,
            subtaskResults,
            hashSnapshot: ctx.getHashSnapshot(),
            events: ctx.events,
        };
    }

    // ─── Execute a Single Subtask ──────────────────────────────────────────

    async _executeSubtask(subtask, ctx, opts) {
        const startMs = Date.now();

        // Build the prompt WITH context from completed dependencies
        const depContext = ctx.getContextForAgent(subtask.dependencies || []);
        const fullContext = ctx.files.size > 0 ? ctx.getFullContext() : '';

        // Choose the more specific context (dependency-based) or full if available
        const contextBlock = depContext || fullContext;

        const prompt = `PROJECT: ${ctx.spec.slice(0, 500)}

CURRENT TASK: ${subtask.description}
FILE TO PRODUCE: ${subtask.file_path}
${contextBlock}

Produce the complete file content for ${subtask.file_path}. Use patterns and imports consistent with the build context above.`;

        try {
            const result = await this._gateway.complete(
                [
                    { role: 'system', content: SUBTASK_EXECUTION_PROMPT },
                    { role: 'user', content: prompt },
                ],
                {
                    provider: opts.provider,
                    temperature: 0, // Maximum determinism
                }
            );

            const content = result.content || '';
            const hash = crypto.createHash('sha256').update(content).digest('hex');

            return {
                ok: true,
                content,
                hash,
                latencyMs: Date.now() - startMs,
                model: result.model,
                provider: result.provider,
            };
        } catch (err) {
            return {
                ok: false,
                error: err.message,
                latencyMs: Date.now() - startMs,
            };
        }
    }

    // ─── Determinism Computation ────────────────────────────────────────────

    _computeDeterminism(runs) {
        if (runs.length < 2) return null;

        const fileKeys = new Set();
        runs.forEach(r => Object.keys(r.hashSnapshot).forEach(k => fileKeys.add(k)));

        const perFile = {};
        let totalFiles = 0;
        let deterministicFiles = 0;

        for (const file of fileKeys) {
            const hashes = runs.map(r => r.hashSnapshot[file]).filter(Boolean);
            const unique = new Set(hashes);
            const score = hashes.length > 1
                ? 1 - ((unique.size - 1) / (hashes.length - 1))
                : 1;

            perFile[file] = {
                hashes: [...unique].map(h => h.slice(0, 12)),
                uniqueCount: unique.size,
                score: parseFloat(score.toFixed(4)),
                deterministic: unique.size === 1,
            };

            totalFiles++;
            if (unique.size === 1) deterministicFiles++;
        }

        return {
            overall: totalFiles > 0
                ? parseFloat((deterministicFiles / totalFiles).toFixed(4))
                : 0,
            deterministicFiles,
            totalFiles,
            perFile,
            runs: runs.length,
        };
    }

    // ─── Pattern Learning ──────────────────────────────────────────────────

    _extractPatterns(subtasks, runs) {
        const avgMs = runs.reduce((s, r) => s + r.totalMs, 0) / runs.length;
        const successRate = runs.filter(r => r.success).length / runs.length;
        const totalSubtasks = subtasks.length;
        const maxParallel = Math.max(
            ...this._buildExecutionGroups(subtasks).map(g => g.length)
        );

        return {
            totalSubtasks,
            maxParallelism: maxParallel,
            avgBuildTimeMs: Math.round(avgMs),
            successRate: parseFloat(successRate.toFixed(4)),
            contextPropagation: subtasks.some(t => (t.dependencies || []).length > 0),
            recommendation: maxParallel > 1
                ? `Parallel execution effective: ${maxParallel} concurrent agents used`
                : 'Sequential build — consider splitting into parallel-ready subtasks',
        };
    }

    // ─── Persistence ────────────────────────────────────────────────────────

    _loadPatterns() {
        const file = path.join(this._dataDir, 'patterns.json');
        try {
            if (fs.existsSync(file)) {
                this._patterns = JSON.parse(fs.readFileSync(file, 'utf8'));
            }
        } catch (_) {
            this._patterns = {};
        }
    }

    _savePatterns(buildRecord) {
        const file = path.join(this._dataDir, 'patterns.json');
        this._patterns[buildRecord.buildId] = {
            spec: buildRecord.spec,
            subtaskCount: buildRecord.subtaskCount,
            parallelGroups: buildRecord.parallelGroups,
            determinism: buildRecord.determinism?.overall ?? null,
            avgBuildMs: buildRecord.learnedPatterns.avgBuildTimeMs,
            successRate: buildRecord.learnedPatterns.successRate,
            ts: buildRecord.ts,
        };
        try {
            fs.writeFileSync(file, JSON.stringify(this._patterns, null, 2), 'utf8');
        } catch (err) {
            logger.warn('[BuildLearning] Failed to save patterns', { error: err.message });
        }
    }

    // ─── Report ─────────────────────────────────────────────────────────────

    getReport() {
        const entries = Object.values(this._patterns);
        if (entries.length === 0) return { builds: 0, message: 'No builds recorded yet' };

        const avgDeterminism = entries.filter(e => e.determinism !== null);
        return {
            builds: entries.length,
            avgSubtasks: Math.round(entries.reduce((s, e) => s + e.subtaskCount, 0) / entries.length),
            avgParallelGroups: Math.round(entries.reduce((s, e) => s + e.parallelGroups, 0) / entries.length),
            avgBuildMs: Math.round(entries.reduce((s, e) => s + e.avgBuildMs, 0) / entries.length),
            avgDeterminism: avgDeterminism.length > 0
                ? parseFloat((avgDeterminism.reduce((s, e) => s + e.determinism, 0) / avgDeterminism.length).toFixed(4))
                : null,
            recentBuilds: entries.slice(-5).map(e => ({
                spec: e.spec.slice(0, 80),
                subtasks: e.subtaskCount,
                determinism: e.determinism,
                buildMs: e.avgBuildMs,
                ts: e.ts,
            })),
        };
    }
}

module.exports = { BuildLearningEngine, BuildContext };
