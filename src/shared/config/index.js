/**
 * Shared Config — Barrel Export
 * Centralized configuration for the Heady platform.
 */
export { environment, ENV, getEnvVar, requireEnvVar } from './environment.js';
export { HEADY_DOMAINS, getDomainConfig, isHeadyDomain } from './domains.js';
export { FeatureFlags, FLAG_DEFAULTS } from './feature-flags.js';
