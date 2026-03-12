'use strict';

/**
 * HEADY™ Analytics Service Constants
 * Privacy-first analytics for HEADY OS by HeadySystems Inc.
 * Copyright (c) HeadySystems Inc. Eric Haywood, founder. All rights reserved.
 */

// φ-Scaling Constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// Service Configuration
const PORT = process.env.PORT || 3392;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Event Storage Configuration
const MAX_EVENTS_IN_BUFFER = FIB[12]; // 144 thousand events
const EVENT_PERSISTENCE_INTERVAL = Math.round(1 * PHI * 1000); // ~1.618 seconds
const BUFFER_FLUSH_INTERVAL = Math.round(PHI * 1000); // ~1.618 seconds

// Rolling Window Intervals (in milliseconds)
const ROLLING_WINDOWS = {
  WINDOW_1: 60 * 1000, // 1 minute
  WINDOW_2: Math.round(2.618 * 60 * 1000), // ~2.618 minutes (~157 seconds)
  WINDOW_3: Math.round(4.236 * 60 * 1000), // ~4.236 minutes (~254 seconds)
  WINDOW_4: Math.round(6.854 * 60 * 1000), // ~6.854 minutes (~411 seconds)
};

// CSL (Cognitive Scaling Level) Gates
const CSL_GATES = {
  SUPPRESS: 0.236, // Below 23.6% - suppress event
  INCLUDE: 0.382, // 38.2% - include event
  BOOST: 0.618, // 61.8% - boost priority
};

// Privacy & Security
const SESSION_ID_HASH_ALGORITHM = 'sha256';
const ANONYMIZATION_ENABLED = true;
const PII_STORAGE_ALLOWED = false;
const COOKIE_STORAGE_ALLOWED = false;
const FINGERPRINTING_ALLOWED = false;

// Event Retention (hours)
const EVENT_RETENTION_HOURS = 24 * 7; // 7 days

// Aggregation Configuration
const LATENCY_PERCENTILES = [50, 95, 99];
const FUNNEL_CONVERSION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Event Types (Anonymous)
const EVENT_TYPES = {
  PAGE_VIEW: 'page_view',
  ACTION: 'action',
  API_CALL: 'api_call',
  ERROR: 'error',
  CONVERSION: 'conversion',
  FUNNEL_STEP: 'funnel_step',
  AGENT_INTERACTION: 'agent_interaction',
  SKILL_USAGE: 'skill_usage',
};

// Service Names
const SERVICE_NAMES = [
  'api-gateway',
  'auth-session-server',
  'heady-brain',
  'billing-service',
  'discord-bot',
];

module.exports = {
  // φ-Scaling
  PHI,
  PSI,
  FIB,

  // Service
  PORT,
  NODE_ENV,

  // Storage
  MAX_EVENTS_IN_BUFFER,
  EVENT_PERSISTENCE_INTERVAL,
  BUFFER_FLUSH_INTERVAL,

  // Windows
  ROLLING_WINDOWS,

  // CSL Gates
  CSL_GATES,

  // Privacy
  SESSION_ID_HASH_ALGORITHM,
  ANONYMIZATION_ENABLED,
  PII_STORAGE_ALLOWED,
  COOKIE_STORAGE_ALLOWED,
  FINGERPRINTING_ALLOWED,

  // Retention
  EVENT_RETENTION_HOURS,

  // Aggregation
  LATENCY_PERCENTILES,
  FUNNEL_CONVERSION_WINDOW,

  // Event Types
  EVENT_TYPES,

  // Services
  SERVICE_NAMES,
};
