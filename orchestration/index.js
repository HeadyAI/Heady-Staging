'use strict';
/**
 * Orchestration Module — Barrel Export
 * Provides arena-mode-enhanced, hcfp-runner, socratic-loop, swarm-definitions,
 * and heady-distiller (wired to HCFPRunner via hookPipeline).
 */
const HeadyDistiller = require('../src/hc_distiller');
const HCFPRunner = require('./hcfp-runner');

// Wire distiller to the default runner instance so all pipeline runs are traced
const _defaultRunner = new (HCFPRunner.default || HCFPRunner.HCFPRunner || HCFPRunner)();
const _distiller = new HeadyDistiller();
_distiller.initialize();
_distiller.hookPipeline(_defaultRunner);

module.exports = {
    ArenaModeEnhanced: require('./arena-mode-enhanced'),
    HCFPRunner: HCFPRunner.default || HCFPRunner.HCFPRunner || HCFPRunner,
    SocraticLoop: require('./socratic-loop'),
    SwarmDefinitions: require('./swarm-definitions'),
    HeadyDistiller,
    // Pre-wired instances for consumers that want the hooked runner
    defaultRunner: _defaultRunner,
    distiller: _distiller,
};
