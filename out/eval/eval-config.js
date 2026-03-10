/**
 * eval-config.js — External Evaluation Tool Integration for Heady™
 * Integrates promptfoo, wandb/weave, autogen, and langchain for
 * agent evaluation, hallucination detection, and multi-agent benchmarks.
 * © 2024-2026 HeadySystems Inc. 51 Provisional Patents.
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

/**
 * promptfoo configuration for Heady™ agent evaluation
 * Run: npx promptfoo eval --config infrastructure/eval/promptfoo.yaml
 */
export const promptfooConfig = {
    description: 'Heady™ Agent Evaluation Suite',
    providers: [
        {
            id: 'heady-brain',
            config: {
                url: 'https://heady-brain.headysystems.com/execute',
                headers: { 'Content-Type': 'application/json' },
                body: { task: { type: 'eval', domain: 'inference' }, context: '{{prompt}}' },
                responseParser: 'json.result',
            },
        },
    ],
    tests: [
        {
            description: 'CSL gate accuracy — include gate fires at ≥ 0.382',
            vars: { prompt: 'Calculate CSL include gate for cosine similarity 0.4' },
            assert: [
                { type: 'contains', value: 'include' },
                { type: 'not-contains', value: 'priority' },
                { type: 'not-contains', value: 'ranking' },
            ],
        },
        {
            description: 'No priority language in any response',
            vars: { prompt: 'How should tasks be ordered in Heady?' },
            assert: [
                { type: 'not-contains', value: 'priority' },
                { type: 'not-contains', value: 'critical' },
                { type: 'not-contains', value: 'high priority' },
                { type: 'contains', value: 'concurrent' },
            ],
        },
        {
            description: 'HeadyAutoContext is referenced as mandatory',
            vars: { prompt: 'What middleware is required on every endpoint?' },
            assert: [
                { type: 'contains', value: 'HeadyAutoContext' },
                { type: 'contains', value: 'mandatory' },
            ],
        },
        {
            description: 'φ-scaled constants used correctly',
            vars: { prompt: 'What timeout should a Heady service use?' },
            assert: [
                { type: 'javascript', value: 'output.includes("1.618") || output.includes("φ") || output.includes("phi")' },
            ],
        },
    ],
    defaultTest: {
        assert: [
            { type: 'not-contains', value: 'I don\'t know' },
            { type: 'cost', threshold: 0.05 },
            { type: 'latency', threshold: 5000 },
        ],
    },
};

/**
 * Weights & Biases (wandb/weave) agent metrics configuration
 */
export const wandbConfig = {
    project: 'heady-agent-eval',
    entity: 'headysystems',
    metrics: {
        task_completion_rate: { target: 0.95, description: 'Percentage of tasks completed successfully' },
        tool_accuracy: { target: PSI, description: 'Correct tool selection rate (≥ 0.618)' },
        trajectory_quality: { target: PSI, description: 'Optimal path efficiency (≥ 0.618)' },
        hallucination_rate: { target: 0.02, description: 'Max 2% hallucination rate' },
        step_utility: { target: PSI * PSI, description: 'Value per step (≥ 0.382)' },
        latency_p95_ms: { target: Math.round(PHI * PHI * PHI * 1000), description: 'P95 latency ≤ 4236ms' },
        cost_per_task: { target: 0.05, description: 'Average cost per task in USD' },
        autocontext_hit_rate: { target: PSI, description: 'HeadyAutoContext cache hit rate (≥ 0.618)' },
    },
};

/**
 * AutoGen multi-agent benchmark configuration
 */
export const autogenConfig = {
    benchmarks: [
        {
            name: 'concurrent-equals-dispatch',
            description: 'Verify all 17 swarms execute concurrently with no priority ordering',
            agents: 17,
            expected: 'All agents complete within 1 φ³ timeout of each other',
            maxDurationMs: Math.round(PHI * PHI * PHI * PHI * 1000), // ≈ 6854ms
        },
        {
            name: 'csl-domain-routing',
            description: 'Verify CSL gates route by domain similarity, not priority',
            testCases: 50,
            expected: 'Zero priority-based routing decisions',
        },
        {
            name: 'autocontext-injection',
            description: 'Verify HeadyAutoContext enriches every request',
            endpoints: 50,
            expected: 'All responses contain X-Heady-Service and X-Correlation-Id headers',
        },
        {
            name: 'cross-domain-auth',
            description: 'Verify auth relay works across all 9 domains',
            domains: 9,
            expected: 'Sign in on one domain propagates to all via relay iframe',
        },
    ],
};

export default { promptfooConfig, wandbConfig, autogenConfig };
