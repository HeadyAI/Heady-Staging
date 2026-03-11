/**
 * Battle-Sim Task Orchestrator
 *
 * Bridges HeadyBattle, HeadySims, HeadyMC, HeadyBees, and HeadySwarms
 * into a unified deterministic task pipeline.
 *
 * Pipeline:  Task → Sim → CSL Gate → Battle/MC → Bee → Swarm → Result → Drift → Audit
 *
 * © 2026 Heady™Systems Inc. PROPRIETARY AND CONFIDENTIAL.
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');

// ─── Constants ────────────────────────────────────────────────────────────────

const PHI = 1.6180339887;
const PSI = 1 / PHI;           // ≈ 0.618
const PSI_SQ = PSI * PSI;      // ≈ 0.382

const PIPELINE_STAGES = [
    'sim_preflight',   // HeadySims: predict resource needs, estimate success
    'csl_gate',        // CSL confidence check
    'battle_race',     // HeadyBattle: model racing with contestants
    'mc_sampling',     // HeadyMC: Monte Carlo determinism boundary finding
    'bee_dispatch',    // HeadyBees: spawn domain-specific worker
    'swarm_route',     // HeadySwarms: route to optimal swarm
    'result_capture',  // Capture and hash output
    'drift_check',     // Drift detection
    'audit_log',       // Immutable audit trail
];

// ─── BattleSimTaskOrchestrator ────────────────────────────────────────────────

class BattleSimTaskOrchestrator extends EventEmitter {

    /**
     * @param {Object} opts
     * @param {Object} [opts.battleService]  - HeadyBattleService instance
     * @param {Object} [opts.simsService]    - HeadySimsService instance
     * @param {Object} [opts.arena]          - BattleArena instance (from battle-arena-protocol)
     * @param {Object} [opts.confidenceGate] - CSLConfidenceGate instance
     * @param {Object} [opts.actionAnalyzer] - ContinuousActionAnalyzer instance
     * @param {number} [opts.mcIterations]   - Monte Carlo iterations (default: 5)
     * @param {number} [opts.simConfidenceThreshold] - Min sim score to proceed (default: PSI ≈ 0.618)
     */
    constructor(opts = {}) {
        super();
        this.battleService = opts.battleService || null;
        this.simsService = opts.simsService || null;
        this.arena = opts.arena || null;
        this.confidenceGate = opts.confidenceGate || null;
        this.actionAnalyzer = opts.actionAnalyzer || null;
        this._gateway = opts.gateway || null;
        this.mcIterations = opts.mcIterations || 5;
        this.simConfidenceThreshold = opts.simConfidenceThreshold || PSI;
        this._auditLog = [];
        this._stats = {
            tasksProcessed: 0,
            simPasses: 0,
            simFails: 0,
            battleRaces: 0,
            mcRuns: 0,
            beeDispatches: 0,
            swarmRoutes: 0,
            halts: 0,
            driftAlerts: 0,
        };

        // Auto-create battle service with gateway if not provided
        if (!this.battleService && this._gateway) {
            try {
                const { HeadyBattleService } = require('../services/HeadyBattle-service.js');
                this.battleService = new HeadyBattleService({ gateway: this._gateway });
            } catch (_) { }
        }
    }

    // ─── Main Pipeline ────────────────────────────────────────────────────────

    /**
     * Execute a task through the full battle-sim pipeline.
     *
     * @param {Object} task - { id, prompt, domain, keywords, variables, contestants?, beeType? }
     * @param {Object} [opts] - { skipSim, skipBattle, skipMC, force }
     * @returns {Object} Pipeline result with stage outputs and determinism metrics
     */
    async execute(task, opts = {}) {
        const pipelineId = crypto.randomUUID();
        const startTime = Date.now();
        const stages = {};

        this._stats.tasksProcessed++;
        this._audit('pipeline_start', { pipelineId, taskId: task.id, task: task.prompt?.slice(0, 100) });

        try {
            // ─── Stage 1: HeadySims Pre-Flight ──────────────────────────────────
            if (!opts.skipSim) {
                stages.sim_preflight = this._simPreflight(task);
                if (stages.sim_preflight.score < this.simConfidenceThreshold && !opts.force) {
                    this._stats.simFails++;
                    this._stats.halts++;
                    this._audit('sim_halt', { pipelineId, score: stages.sim_preflight.score });
                    this.emit('pipeline:halt', { pipelineId, stage: 'sim_preflight', reason: 'sim score below threshold' });
                    return {
                        pipelineId, halted: true, haltStage: 'sim_preflight',
                        reason: `Sim score ${stages.sim_preflight.score.toFixed(4)} < threshold ${this.simConfidenceThreshold.toFixed(4)}`,
                        stages, durationMs: Date.now() - startTime,
                    };
                }
                this._stats.simPasses++;
            }

            // ─── Stage 2: CSL Confidence Gate ───────────────────────────────────
            if (this.confidenceGate) {
                const interpolated = task.prompt || '';
                stages.csl_gate = this.confidenceGate.preFlightCheck(
                    task.id || '', task.variables || {}, interpolated
                );
                if (stages.csl_gate.decision === 'HALT' && !opts.force) {
                    this._stats.halts++;
                    this._audit('csl_halt', { pipelineId, decision: stages.csl_gate.decision });
                    this.emit('pipeline:halt', { pipelineId, stage: 'csl_gate', reason: 'CSL confidence below threshold' });
                    return {
                        pipelineId, halted: true, haltStage: 'csl_gate',
                        reason: `CSL decision: HALT (confidence ${stages.csl_gate.confidence.toFixed(4)})`,
                        stages, durationMs: Date.now() - startTime,
                    };
                }
            }

            // ─── Stage 3: HeadyBattle Model Racing ─────────────────────────────
            if (!opts.skipBattle && this.arena) {
                stages.battle_race = await this._battleRace(task);
                this._stats.battleRaces++;
            } else {
                // Direct execution without racing
                stages.battle_race = { skipped: true, output: task.prompt || '' };
            }

            // ─── Stage 4: HeadyMC Monte Carlo Sampling ─────────────────────────
            if (!opts.skipMC) {
                stages.mc_sampling = this._mcSampling(task, stages.battle_race);
                this._stats.mcRuns++;
            }

            // ─── Stage 5: HeadyBees Worker Dispatch ────────────────────────────
            stages.bee_dispatch = this._beeDispatch(task);
            this._stats.beeDispatches++;

            // ─── Stage 6: HeadySwarms Route ────────────────────────────────────
            stages.swarm_route = this._swarmRoute(task);
            this._stats.swarmRoutes++;

            // ─── Stage 7: Result Capture ───────────────────────────────────────
            const winnerOutput = stages.battle_race.winnerOutput || stages.battle_race.output || task.prompt;
            const outputHash = crypto.createHash('sha256')
                .update(JSON.stringify({ output: winnerOutput, taskId: task.id }))
                .digest('hex');
            stages.result_capture = { output: winnerOutput, outputHash };

            // ─── Stage 8: Drift Check ──────────────────────────────────────────
            if (this.confidenceGate) {
                stages.drift_check = this.confidenceGate.trackDrift(outputHash);
                if (stages.drift_check.drifting) {
                    this._stats.driftAlerts++;
                    this.emit('pipeline:drift', { pipelineId, driftScore: stages.drift_check.driftScore });
                }
            }

            // ─── Stage 9: Continuous Action Analysis ───────────────────────────
            if (this.actionAnalyzer) {
                this.actionAnalyzer.record({
                    taskId: task.id,
                    domain: task.domain || 'unknown',
                    inputHash: crypto.createHash('sha256').update(JSON.stringify(task)).digest('hex').slice(0, 16),
                    outputHash: outputHash.slice(0, 16),
                    provider: stages.battle_race.winnerProvider || 'local',
                    model: stages.battle_race.winnerModel || 'deterministic',
                    latencyMs: Date.now() - startTime,
                    confidence: stages.csl_gate?.confidence || 1.0,
                    simScore: stages.sim_preflight?.score || 1.0,
                    battleWon: !!stages.battle_race.winner,
                    mcDeterminism: stages.mc_sampling?.determinismScore || 1.0,
                });
            }

            // ─── Audit ─────────────────────────────────────────────────────────
            const result = {
                pipelineId,
                halted: false,
                taskId: task.id,
                output: winnerOutput,
                outputHash,
                stages,
                determinismMetrics: {
                    simScore: stages.sim_preflight?.score || null,
                    cslConfidence: stages.csl_gate?.confidence || null,
                    battleWinner: stages.battle_race?.winner || null,
                    mcDeterminism: stages.mc_sampling?.determinismScore || null,
                    drifting: stages.drift_check?.drifting || false,
                },
                durationMs: Date.now() - startTime,
            };

            this._audit('pipeline_complete', { pipelineId, durationMs: result.durationMs });
            this.emit('pipeline:complete', result);
            return result;

        } catch (err) {
            this._audit('pipeline_error', { pipelineId, error: err.message });
            this.emit('pipeline:error', { pipelineId, error: err });
            throw err;
        }
    }

    // ─── Stage Implementations ──────────────────────────────────────────────

    /** HeadySims: Pre-task simulation to predict success probability */
    _simPreflight(task) {
        // Factors: prompt length, variable completeness, domain alignment, keyword density
        const promptLen = (task.prompt || '').length;
        const hasKeywords = (task.keywords || []).length > 0;
        const hasDomain = !!(task.domain);
        const varCount = Object.keys(task.variables || {}).length;

        const lengthScore = Math.min(1.0, promptLen / 200);          // normalized to ~200 chars
        const keywordScore = hasKeywords ? 1.0 : 0.3;
        const domainScore = hasDomain ? 1.0 : 0.3;
        const varScore = varCount > 0 ? Math.min(1.0, varCount / 4) : 0.5;

        // Phi-weighted composite
        const score = (
            lengthScore * PSI +            // 0.618 weight
            keywordScore * PSI_SQ +        // 0.382 weight
            domainScore * (1 - PSI) +      // 0.382 weight
            varScore * (PSI_SQ * PSI)      // 0.236 weight
        ) / (PSI + PSI_SQ + (1 - PSI) + (PSI_SQ * PSI));

        const resources = {
            estimatedTokens: Math.ceil(promptLen * 1.3),
            estimatedLatencyMs: Math.ceil(promptLen * 2 + 500),
            recommendedModel: score >= PSI ? 'sonar-pro' : 'sonar',
        };

        return { score: +score.toFixed(4), resources, factors: { lengthScore, keywordScore, domainScore, varScore } };
    }

    /** HeadyBattle: Run task through arena contestants, pick winner */
    async _battleRace(task) {
        if (!this.arena) return { skipped: true, output: task.prompt };

        try {
            const summary = await this.arena.runRound({
                id: task.id || crypto.randomUUID(),
                prompt: task.prompt || 'default task',
                keywords: task.keywords || [],
                maxOutputLen: task.maxOutputLen || 500,
            });

            const winnerContestant = this.arena._contestants.get(summary.winner);
            return {
                winner: summary.winner,
                winnerOutput: summary.outputs[summary.winner] || '',
                winnerProvider: winnerContestant?.provider || 'unknown',
                winnerModel: winnerContestant?.model || 'unknown',
                finalScores: summary.finalScores,
                durationMs: summary.durationMs,
                allOutputs: summary.outputs,
            };
        } catch (err) {
            return { error: err.message, skipped: true, output: task.prompt };
        }
    }

    /** HeadyMC: Monte Carlo sampling — measure determinism across N iterations */
    async _mcSampling(task, battleResult) {
        // If we have a real battle service with gateway, use real determinism test
        if (this.battleService && this.battleService._gateway) {
            try {
                const result = await this.battleService.determinismTest(
                    task.prompt || JSON.stringify(task),
                    { iterations: this.mcIterations, temperature: 0 }
                );
                if (result.ok) {
                    // Find best provider determinism score
                    const scores = Object.values(result.providers).map(p => p.determinismScore);
                    const avgScore = scores.length > 0
                        ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
                    return {
                        iterations: this.mcIterations,
                        realMC: true,
                        providerResults: result.providers,
                        determinismScore: +avgScore.toFixed(4),
                        overallDeterminism: result.overallDeterminism,
                        prediction: avgScore >= PSI ? 'deterministic' :
                            avgScore >= PSI_SQ ? 'marginal' : 'non_deterministic',
                    };
                }
            } catch (_) {
                // Fall through to local hash-based MC
            }
        }

        // Fallback: structural hash-based MC (no real AI calls)
        const hashes = new Set();
        const baseInput = JSON.stringify({
            prompt: task.prompt,
            variables: task.variables,
            domain: task.domain,
        });

        for (let i = 0; i < this.mcIterations; i++) {
            const hash = crypto.createHash('sha256')
                .update(baseInput + `|iter=${i}|seed=42`)
                .digest('hex')
                .slice(0, 16);
            hashes.add(hash);
        }

        const determinismScore = 1.0 - ((hashes.size - 1) / this.mcIterations);
        const boundary = Math.floor(this.mcIterations * PSI);

        return {
            iterations: this.mcIterations,
            realMC: false,
            uniqueHashes: hashes.size,
            determinismScore: +Math.max(0, determinismScore).toFixed(4),
            boundary,
            prediction: determinismScore >= PSI ? 'deterministic' :
                determinismScore >= PSI_SQ ? 'marginal' : 'non_deterministic',
        };
    }

    /** HeadyBees: Identify and dispatch domain-specific bee */
    _beeDispatch(task) {
        const domain = task.domain || 'general';
        const beeMap = {
            code: 'refactor-bee',
            deploy: 'deployment-bee',
            research: 'documentation-bee',
            security: 'governance-bee',
            data: 'template-bee',
            creative: 'creative-bee',
            health: 'health-bee',
            memory: 'memory-bee',
            general: 'orchestration-bee',
        };

        const bee = beeMap[domain] || beeMap.general;
        return { domain, bee, dispatched: true };
    }

    /** HeadySwarms: Route task to optimal swarm by domain */
    _swarmRoute(task) {
        const domain = task.domain || 'general';
        const swarmMap = {
            code: 'code-weaver',
            deploy: 'deploy-shepherd',
            research: 'research-herald',
            security: 'security-warden',
            data: 'data-sculptor',
            creative: 'creative-forge',
            general: 'heady-soul',
        };

        const swarm = swarmMap[domain] || swarmMap.general;
        const priority = task.priority || 40; // NORMAL

        return { targetSwarm: swarm, priority, routed: true };
    }

    // ─── Public API ─────────────────────────────────────────────────────────

    /** Get pipeline stats */
    getStats() {
        return { ...this._stats };
    }

    /** Get audit log */
    getAuditLog() {
        return this._auditLog.slice();
    }

    /** Get determinism report */
    getDeterminismReport() {
        const total = this._stats.tasksProcessed;
        const halted = this._stats.halts;
        const drifts = this._stats.driftAlerts;
        return {
            totalTasks: total,
            successRate: total > 0 ? `${((total - halted) / total * 100).toFixed(1)}%` : 'N/A',
            haltRate: total > 0 ? `${(halted / total * 100).toFixed(1)}%` : 'N/A',
            driftRate: total > 0 ? `${(drifts / total * 100).toFixed(1)}%` : 'N/A',
            phi: PHI,
            psi: PSI,
        };
    }

    // ─── Comparison Framework ───────────────────────────────────────────────

    /**
     * Compare Heady™ output against external output (e.g., Perplexity Computer)
     * Measures determinism divergence between two systems on the same task.
     *
     * @param {Object} headyResult - Result from this.execute()
     * @param {string} externalOutput - Output from Perplexity/other system
     * @returns {Object} Comparison metrics
     */
    compareOutputs(headyResult, externalOutput) {
        const headyHash = headyResult.outputHash;
        const externalHash = crypto.createHash('sha256')
            .update(JSON.stringify({ output: externalOutput, taskId: headyResult.taskId }))
            .digest('hex');

        const headyOutput = headyResult.output || '';

        // Jaccard similarity on word sets
        const headyWords = new Set(headyOutput.toLowerCase().split(/\W+/).filter(Boolean));
        const extWords = new Set(externalOutput.toLowerCase().split(/\W+/).filter(Boolean));
        const intersection = new Set([...headyWords].filter(w => extWords.has(w)));
        const union = new Set([...headyWords, ...extWords]);
        const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

        // Hash match (perfect determinism)
        const hashMatch = headyHash === externalHash;

        // Length ratio
        const lengthRatio = headyOutput.length > 0 && externalOutput.length > 0
            ? Math.min(headyOutput.length, externalOutput.length) / Math.max(headyOutput.length, externalOutput.length)
            : 0;

        // Composite determinism score (phi-weighted)
        const determinismScore = (
            (hashMatch ? 1.0 : 0.0) * PSI +
            jaccardSimilarity * PSI_SQ +
            lengthRatio * (1 - PSI - PSI_SQ)
        );

        return {
            headyHash: headyHash.slice(0, 16),
            externalHash: externalHash.slice(0, 16),
            hashMatch,
            jaccardSimilarity: +jaccardSimilarity.toFixed(4),
            lengthRatio: +lengthRatio.toFixed(4),
            determinismScore: +determinismScore.toFixed(4),
            verdict: determinismScore >= PSI ? 'deterministic' :
                determinismScore >= PSI_SQ ? 'marginal_divergence' : 'non_deterministic',
            recommendation: determinismScore >= PSI ? 'Systems aligned — no action needed' :
                determinismScore >= PSI_SQ ? 'Minor divergence — review prompts for ambiguity' :
                    'Significant divergence — lock LLM params: temperature=0, seed=42, top_p=1',
        };
    }

    /** Compare two pipeline runs for self-consistency */
    comparePipelineRuns(resultA, resultB) {
        return {
            hashMatch: resultA.outputHash === resultB.outputHash,
            latencyDelta: Math.abs(resultA.durationMs - resultB.durationMs),
            confidenceDelta: Math.abs(
                (resultA.determinismMetrics.cslConfidence || 0) -
                (resultB.determinismMetrics.cslConfidence || 0)
            ),
            sameWinner: resultA.determinismMetrics.battleWinner === resultB.determinismMetrics.battleWinner,
            selfConsistent: resultA.outputHash === resultB.outputHash,
        };
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    _audit(action, data) {
        this._auditLog.push({ action, data, ts: Date.now() });
        if (this._auditLog.length > 10000) this._auditLog.shift();
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    BattleSimTaskOrchestrator,
    PIPELINE_STAGES,
    PHI, PSI, PSI_SQ,
};
