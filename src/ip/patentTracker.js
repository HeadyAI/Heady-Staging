/**
 * patentTracker.js — Patent Portfolio Triage Engine
 * © 2026 HeadySystems Inc. All Rights Reserved.
 *
 * Manages Heady's 60+ provisional patent portfolio.
 * Calculates PCT deadlines, urgency tiers, and generates Markdown triage reports.
 *
 * Patent timeline:
 *   Provisional filed → 12 months → PCT or US non-provisional must be filed
 *   PCT filed         → 30 months from original priority date → national phase entry
 *
 * φ-scaled urgency thresholds:
 *   URGENT:  ≤ φ × 30 ≈ 49 days to deadline
 *   WARNING: ≤ φ² × 30 ≈ 79 days to deadline
 *   MONITOR: ≤ φ³ × 30 ≈ 127 days to deadline
 *   OK:       > 127 days
 *   EXPIRED:  deadline passed
 *
 * Neon Postgres schema: PATENTS_DDL (exported below)
 *
 * Usage:
 *   import { triagePortfolio, generateTriageReport, calculateDeadlines } from './src/ip/patentTracker.js';
 *   const report = generateTriageReport(myPatents);
 *   console.log(report);
 */
'use strict';

const PHI = 1.618033988749895;
const MS_PER_DAY = 86_400_000;

// φ-scaled urgency day thresholds
const URGENCY_DAYS = Object.freeze({
  URGENT:  Math.round(PHI * 30),       // 49 days
  WARNING: Math.round(PHI * PHI * 30), // 79 days
  MONITOR: Math.round(PHI * PHI * PHI * 30), // 127 days
});

// Patent tiers
export const PatentTier = Object.freeze({
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
});

// Urgency levels
export const UrgencyLevel = Object.freeze({
  EXPIRED: 'EXPIRED',
  URGENT:  'URGENT',
  WARNING: 'WARNING',
  MONITOR: 'MONITOR',
  OK:      'OK',
});

/**
 * Calculate key deadlines for a provisional patent.
 * @param {Object} patent - { id, title, filedDate: ISO string, pctFiled?: bool, pctFiledDate?: ISO string }
 * @returns {Object} deadline details
 */
export function calculateDeadlines(patent) {
  const filed       = new Date(patent.filedDate);
  const now         = new Date();
  const pctDeadline = new Date(filed);
  pctDeadline.setFullYear(pctDeadline.getFullYear() + 1); // 12 months from filing

  const nationalPhaseDeadline = new Date(filed);
  nationalPhaseDeadline.setMonth(nationalPhaseDeadline.getMonth() + 30); // 30 months

  const daysToPCT = Math.ceil((pctDeadline - now) / MS_PER_DAY);
  const daysToNationalPhase = Math.ceil((nationalPhaseDeadline - now) / MS_PER_DAY);

  let urgency;
  if (!patent.pctFiled) {
    // PCT not yet filed — urgency based on PCT deadline
    if (daysToPCT < 0)                  urgency = UrgencyLevel.EXPIRED;
    else if (daysToPCT <= URGENCY_DAYS.URGENT)  urgency = UrgencyLevel.URGENT;
    else if (daysToPCT <= URGENCY_DAYS.WARNING)  urgency = UrgencyLevel.WARNING;
    else if (daysToPCT <= URGENCY_DAYS.MONITOR)  urgency = UrgencyLevel.MONITOR;
    else                                urgency = UrgencyLevel.OK;
  } else {
    // PCT filed — urgency based on national phase deadline
    if (daysToNationalPhase < 0)        urgency = UrgencyLevel.EXPIRED;
    else if (daysToNationalPhase <= URGENCY_DAYS.URGENT) urgency = UrgencyLevel.URGENT;
    else if (daysToNationalPhase <= URGENCY_DAYS.WARNING) urgency = UrgencyLevel.WARNING;
    else if (daysToNationalPhase <= URGENCY_DAYS.MONITOR) urgency = UrgencyLevel.MONITOR;
    else                                urgency = UrgencyLevel.OK;
  }

  return {
    id:                   patent.id,
    title:                patent.title,
    filedDate:            patent.filedDate,
    pctDeadline:          pctDeadline.toISOString().split('T')[0],
    nationalPhaseDeadline: nationalPhaseDeadline.toISOString().split('T')[0],
    daysToPCT,
    daysToNationalPhase,
    pctFiled:             !!patent.pctFiled,
    pctFiledDate:         patent.pctFiledDate || null,
    urgency,
    tier:                 patent.tier || PatentTier.MEDIUM,
  };
}

/**
 * Triage the full portfolio — sort by urgency × tier priority.
 * @param {Array} patents - array of patent objects
 * @returns {Array} sorted and enriched patent records
 */
export function triagePortfolio(patents) {
  const urgencyOrder = { EXPIRED: 0, URGENT: 1, WARNING: 2, MONITOR: 3, OK: 4 };
  const tierOrder    = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return patents
    .map(calculateDeadlines)
    .sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
}

/**
 * Generate a Markdown triage report ready for patent counsel.
 * @param {Array} patents
 * @returns {string} Markdown
 */
export function generateTriageReport(patents) {
  const triaged = triagePortfolio(patents);
  const now     = new Date().toISOString().split('T')[0];

  const grouped = {
    EXPIRED: triaged.filter(p => p.urgency === UrgencyLevel.EXPIRED),
    URGENT:  triaged.filter(p => p.urgency === UrgencyLevel.URGENT),
    WARNING: triaged.filter(p => p.urgency === UrgencyLevel.WARNING),
    MONITOR: triaged.filter(p => p.urgency === UrgencyLevel.MONITOR),
    OK:      triaged.filter(p => p.urgency === UrgencyLevel.OK),
  };

  const table = (patents) => {
    if (!patents.length) return '_None_\n';
    return [
      '| ID | Title | Tier | Filed | PCT Deadline | Days to PCT | PCT Filed |',
      '|----|-------|------|-------|--------------|-------------|-----------|',
      ...patents.map(p =>
        `| ${p.id} | ${p.title} | **${p.tier}** | ${p.filedDate} | ${p.pctDeadline} | ${p.daysToPCT > 0 ? p.daysToPCT : '**EXPIRED**'} | ${p.pctFiled ? `✅ ${p.pctFiledDate}` : '❌'} |`
      ),
    ].join('\n') + '\n';
  };

  return `# Heady™ Patent Portfolio Triage Report
Generated: ${now} | φ-scaled urgency thresholds: URGENT ≤${URGENCY_DAYS.URGENT}d · WARNING ≤${URGENCY_DAYS.WARNING}d · MONITOR ≤${URGENCY_DAYS.MONITOR}d

## ⚠️ EXPIRED (${grouped.EXPIRED.length} patents)
> **CRITICAL: Priority date lost. Consult counsel immediately.**

${table(grouped.EXPIRED)}

## 🔴 URGENT — File PCT within ${URGENCY_DAYS.URGENT} days (${grouped.URGENT.length} patents)
> **Action: Engage patent counsel THIS WEEK. File PCT or US non-provisional.**

${table(grouped.URGENT)}

## 🟡 WARNING — File PCT within ${URGENCY_DAYS.WARNING} days (${grouped.WARNING.length} patents)
> **Action: Brief counsel, prepare application, schedule filing.**

${table(grouped.WARNING)}

## 🔵 MONITOR — File PCT within ${URGENCY_DAYS.MONITOR} days (${grouped.MONITOR.length} patents)
> **Action: Queue for filing, confirm tier classification with counsel.**

${table(grouped.MONITOR)}

## ✅ OK — More than ${URGENCY_DAYS.MONITOR} days remaining (${grouped.OK.length} patents)

${table(grouped.OK)}

---

## Priority Filing Strategy

| Tier | Criteria | Recommended Action |
|------|----------|--------------------|
| **HIGH** | CSL core claims, HeadySoul governance, DAG scheduler | PCT file immediately — these are the moat |
| **HIGH** | Post-quantum cryptography integration | PCT file — NIST PQC standards adoption accelerating |
| **MEDIUM** | Swarm intelligence routing, Arena Mode evaluation | PCT if budget allows; else US non-provisional |
| **MEDIUM** | Sacred geometry scheduling constants | US non-provisional; PCT optional |
| **LOW** | Vertical domain applications | Evaluate ROI; may abandon to preserve budget |

**Preferred strategy (HIGH/MEDIUM):** File US non-provisional + PCT simultaneously at 12-month mark.
This gives the US application a head start while preserving all 148 PCT member countries.

---
*φ-urgency constants: URGENT=${URGENCY_DAYS.URGENT}d (φ×30) · WARNING=${URGENCY_DAYS.WARNING}d (φ²×30) · MONITOR=${URGENCY_DAYS.MONITOR}d (φ³×30)*
*Total portfolio: ${triaged.length} provisionals | Expired: ${grouped.EXPIRED.length} | Urgent: ${grouped.URGENT.length} | Warning: ${grouped.WARNING.length}*
`;
}

/**
 * Neon Postgres schema for the patent portfolio database.
 * Apply with: psql $DATABASE_URL -f schema.sql
 */
export const PATENTS_DDL = `
-- Heady™ Patent Portfolio — Neon Postgres Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS patents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patent_number         TEXT UNIQUE,                    -- Provisional app number
  title                 TEXT NOT NULL,
  abstract              TEXT,
  inventors             TEXT[],
  filed_date            DATE NOT NULL,
  tier                  TEXT NOT NULL CHECK (tier IN ('HIGH', 'MEDIUM', 'LOW')),
  category              TEXT,                            -- CSL/HeadySoul/Arena/etc.
  pct_filed             BOOLEAN DEFAULT FALSE,
  pct_filed_date        DATE,
  pct_application_number TEXT,
  us_nonprovisional_filed BOOLEAN DEFAULT FALSE,
  us_nonprovisional_date  DATE,
  status                TEXT DEFAULT 'provisional',     -- provisional/pct/nonprovisional/granted/abandoned
  notes                 TEXT,
  counsel_assigned      TEXT,
  estimated_filing_cost NUMERIC(10,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patents_filed_date ON patents (filed_date);
CREATE INDEX idx_patents_tier       ON patents (tier);
CREATE INDEX idx_patents_status     ON patents (status);

-- Computed view: urgency triage
CREATE OR REPLACE VIEW patent_triage AS
SELECT
  id, patent_number, title, tier, status,
  filed_date,
  (filed_date + INTERVAL '12 months')::DATE AS pct_deadline,
  (filed_date + INTERVAL '30 months')::DATE AS national_phase_deadline,
  ((filed_date + INTERVAL '12 months') - CURRENT_DATE) AS days_to_pct,
  pct_filed, pct_filed_date,
  CASE
    WHEN NOT pct_filed AND (filed_date + INTERVAL '12 months') < CURRENT_DATE THEN 'EXPIRED'
    WHEN NOT pct_filed AND (filed_date + INTERVAL '12 months') - CURRENT_DATE <= INTERVAL '${URGENCY_DAYS.URGENT} days' THEN 'URGENT'
    WHEN NOT pct_filed AND (filed_date + INTERVAL '12 months') - CURRENT_DATE <= INTERVAL '${URGENCY_DAYS.WARNING} days' THEN 'WARNING'
    WHEN NOT pct_filed AND (filed_date + INTERVAL '12 months') - CURRENT_DATE <= INTERVAL '${URGENCY_DAYS.MONITOR} days' THEN 'MONITOR'
    ELSE 'OK'
  END AS urgency
FROM patents
WHERE status NOT IN ('granted', 'abandoned')
ORDER BY pct_deadline ASC;
`;

export { URGENCY_DAYS, PHI };
