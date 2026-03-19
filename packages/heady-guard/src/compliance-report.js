/**
 * © 2026 HeadySystems Inc. All Rights Reserved.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ComplianceReport — SOC 2 compliance report generator from audit trail data.
 *
 * Generates structured compliance reports covering the five SOC 2 Trust Service Criteria:
 *   1. Security         — access controls, kill-switch events, policy violations
 *   2. Availability     — uptime, circuit breaker events, system health
 *   3. Processing Integrity — governance decisions, hallucination checks, data integrity
 *   4. Confidentiality  — data access logs, token revocations, encryption events
 *   5. Privacy          — PII access, consent records, data retention
 *
 * Each report includes:
 *   - Executive summary with risk score
 *   - Per-criteria findings and evidence
 *   - Chain integrity verification result
 *   - Remediation recommendations
 *   - SHA-256 report hash for tamper detection
 */

'use strict';

const { EventEmitter } = require('events');
const crypto = require('crypto');
const { AuditEntryType } = require('./audit-trail');

// ─── SOC 2 Trust Service Criteria ────────────────────────────────────────────
const TrustCriteria = Object.freeze({
  SECURITY:             'SECURITY',
  AVAILABILITY:         'AVAILABILITY',
  PROCESSING_INTEGRITY: 'PROCESSING_INTEGRITY',
  CONFIDENTIALITY:      'CONFIDENTIALITY',
  PRIVACY:              'PRIVACY',
});

// ─── Risk Levels ─────────────────────────────────────────────────────────────
const RiskLevel = Object.freeze({
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
});

// ─── Mapping: AuditEntryType → Trust Criteria ────────────────────────────────
const CRITERIA_MAP = {
  [AuditEntryType.GOVERNANCE_DECISION]: [TrustCriteria.PROCESSING_INTEGRITY],
  [AuditEntryType.KILL_SWITCH_EVENT]:   [TrustCriteria.SECURITY, TrustCriteria.AVAILABILITY],
  [AuditEntryType.ACCESS_GRANT]:        [TrustCriteria.SECURITY, TrustCriteria.CONFIDENTIALITY],
  [AuditEntryType.ACCESS_REVOKE]:       [TrustCriteria.SECURITY, TrustCriteria.CONFIDENTIALITY],
  [AuditEntryType.CONFIG_CHANGE]:       [TrustCriteria.SECURITY, TrustCriteria.PROCESSING_INTEGRITY],
  [AuditEntryType.DEPLOYMENT]:          [TrustCriteria.AVAILABILITY, TrustCriteria.PROCESSING_INTEGRITY],
  [AuditEntryType.DATA_ACCESS]:         [TrustCriteria.CONFIDENTIALITY, TrustCriteria.PRIVACY],
  [AuditEntryType.POLICY_VIOLATION]:    [TrustCriteria.SECURITY, TrustCriteria.PROCESSING_INTEGRITY],
  [AuditEntryType.HALLUCINATION]:       [TrustCriteria.PROCESSING_INTEGRITY],
  [AuditEntryType.SYSTEM_EVENT]:        [TrustCriteria.AVAILABILITY],
  [AuditEntryType.MANUAL_ENTRY]:        [TrustCriteria.PROCESSING_INTEGRITY],
};

// ─── Severity weights for risk scoring ───────────────────────────────────────
const SEVERITY_WEIGHTS = {
  [AuditEntryType.POLICY_VIOLATION]:  10,
  [AuditEntryType.KILL_SWITCH_EVENT]:  8,
  [AuditEntryType.HALLUCINATION]:      7,
  [AuditEntryType.ACCESS_REVOKE]:      5,
  [AuditEntryType.CONFIG_CHANGE]:      4,
  [AuditEntryType.GOVERNANCE_DECISION]: 2,
  [AuditEntryType.ACCESS_GRANT]:       2,
  [AuditEntryType.DEPLOYMENT]:         3,
  [AuditEntryType.DATA_ACCESS]:        3,
  [AuditEntryType.SYSTEM_EVENT]:       1,
  [AuditEntryType.MANUAL_ENTRY]:       1,
};

class ComplianceReport extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string} [options.organizationName] - Name for report headers
   * @param {string} [options.auditorName]      - Auditor or system generating the report
   * @param {string} [options.reportingPeriod]  - Human-readable period description
   */
  constructor(options = {}) {
    super();

    this._organizationName = options.organizationName || 'HeadySystems Inc.';
    this._auditorName = options.auditorName || 'HeadyGuard Automated Compliance';
    this._reportingPeriod = options.reportingPeriod || null;
    this._generatedReports = [];
  }

  // ─── Getters ──────────────────────────────────────────────────────────────────

  get reportCount() { return this._generatedReports.length; }

  get stats() {
    return {
      totalReports: this._generatedReports.length,
      organization: this._organizationName,
      auditor: this._auditorName,
    };
  }

  // ─── Primary: Generate SOC 2 Report ───────────────────────────────────────────

  /**
   * Generate a full SOC 2 compliance report from an AuditTrail instance.
   *
   * @param {AuditTrail} auditTrail          - The AuditTrail to analyze
   * @param {object}     [options]
   * @param {number}     [options.startMs]   - Start of reporting period (timestamp)
   * @param {number}     [options.endMs]     - End of reporting period (timestamp)
   * @param {string}     [options.scope]     - Report scope description
   * @param {boolean}    [options.includeEvidence] - Include raw audit entries as evidence (default true)
   * @returns {SOC2Report}
   */
  generate(auditTrail, options = {}) {
    const startMs = options.startMs || 0;
    const endMs = options.endMs || Date.now();
    const includeEvidence = options.includeEvidence !== undefined ? options.includeEvidence : true;
    const scope = options.scope || 'Full system audit';

    const reportId = `soc2-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const generatedAt = Date.now();

    this.emit('report:generating', { reportId, startMs, endMs });

    // 1. Gather entries within the reporting period
    const entries = auditTrail.queryByTimeRange(startMs, endMs);

    // 2. Verify chain integrity
    const chainVerification = auditTrail.verify();

    // 3. Classify entries by trust criteria
    const criteriaFindings = this._classifyByCriteria(entries);

    // 4. Compute risk scores per criteria
    const criteriaScores = this._computeCriteriaScores(criteriaFindings, entries.length);

    // 5. Compute overall risk score and level
    const overallRiskScore = this._computeOverallRisk(criteriaScores);
    const overallRiskLevel = this._riskScoreToLevel(overallRiskScore);

    // 6. Generate findings per criteria
    const findings = this._generateFindings(criteriaFindings, criteriaScores);

    // 7. Generate remediation recommendations
    const remediations = this._generateRemediations(criteriaFindings, criteriaScores);

    // 8. Build executive summary
    const executiveSummary = this._buildExecutiveSummary(
      entries, criteriaScores, overallRiskScore, overallRiskLevel, chainVerification
    );

    // 9. Assemble the report
    const report = {
      reportId,
      type: 'SOC2_TYPE_II',
      version: '1.0.0',
      organization: this._organizationName,
      auditor: this._auditorName,
      scope,
      reportingPeriod: {
        description: this._reportingPeriod || `${new Date(startMs).toISOString()} to ${new Date(endMs).toISOString()}`,
        startMs,
        endMs,
        durationDays: Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)),
      },
      generatedAt,
      generatedAtISO: new Date(generatedAt).toISOString(),

      executiveSummary,

      chainIntegrity: {
        verified: chainVerification.valid,
        entries: chainVerification.entries,
        brokenAt: chainVerification.brokenAt,
        detail: chainVerification.detail,
        headHash: auditTrail.headHash,
      },

      overallRisk: {
        score: overallRiskScore,
        level: overallRiskLevel,
      },

      criteriaReports: Object.values(TrustCriteria).map(criteria => ({
        criteria,
        score: criteriaScores[criteria] || { risk: 0, level: RiskLevel.LOW, entryCount: 0 },
        findings: findings[criteria] || [],
        remediations: remediations[criteria] || [],
        evidence: includeEvidence ? (criteriaFindings[criteria] || []).map(e => ({
          sequence: e.sequence,
          type: e.type,
          actor: e.actor,
          action: e.action,
          outcome: e.outcome,
          timestamp: e.timestamp,
          isoTime: e.isoTime,
        })) : [],
      })),

      summary: {
        totalAuditEntries: entries.length,
        entriesByType: this._countByType(entries),
        entriesByOutcome: this._countByOutcome(entries),
        uniqueActors: [...new Set(entries.map(e => e.actor))],
        policyViolations: entries.filter(e => e.type === AuditEntryType.POLICY_VIOLATION).length,
        killSwitchEvents: entries.filter(e => e.type === AuditEntryType.KILL_SWITCH_EVENT).length,
        hallucinationFlags: entries.filter(e => e.type === AuditEntryType.HALLUCINATION).length,
      },

      reportHash: null, // computed below
    };

    // 10. Compute SHA-256 hash of the entire report for tamper detection
    report.reportHash = this._computeReportHash(report);

    // Store and emit
    this._generatedReports.push({
      reportId,
      generatedAt,
      overallRisk: { score: overallRiskScore, level: overallRiskLevel },
      entriesAnalyzed: entries.length,
    });

    this.emit('report:generated', {
      reportId,
      overallRisk: { score: overallRiskScore, level: overallRiskLevel },
      entriesAnalyzed: entries.length,
      generatedAt,
    });

    return report;
  }

  // ─── Report History ────────────────────────────────────────────────────────────

  /**
   * Get metadata for all previously generated reports.
   * @returns {Array}
   */
  getReportHistory() {
    return [...this._generatedReports];
  }

  // ─── Verify Report Integrity ───────────────────────────────────────────────────

  /**
   * Verify that a report has not been tampered with by recomputing its hash.
   *
   * @param {SOC2Report} report
   * @returns {{ valid: boolean, detail: string }}
   */
  verifyReport(report) {
    if (!report || !report.reportHash) {
      return { valid: false, detail: 'Report is null or missing reportHash' };
    }

    const originalHash = report.reportHash;
    const recomputed = this._computeReportHash({ ...report, reportHash: null });

    if (recomputed === originalHash) {
      return { valid: true, detail: `Report ${report.reportId} integrity verified` };
    }

    return {
      valid: false,
      detail: `Report ${report.reportId} has been tampered with: hash mismatch`,
    };
  }

  // ─── Internal: Classification ──────────────────────────────────────────────────

  /**
   * Classify audit entries into trust criteria buckets.
   * @param {Array} entries
   * @returns {Object} criteria → entries[]
   */
  _classifyByCriteria(entries) {
    const buckets = {};
    for (const criteria of Object.values(TrustCriteria)) {
      buckets[criteria] = [];
    }

    for (const entry of entries) {
      const criteria = CRITERIA_MAP[entry.type];
      if (criteria) {
        for (const c of criteria) {
          buckets[c].push(entry);
        }
      }
    }

    return buckets;
  }

  // ─── Internal: Risk Scoring ────────────────────────────────────────────────────

  /**
   * Compute risk scores per trust criteria.
   * Score is 0-100 where higher = more risk.
   *
   * @param {Object} criteriaFindings
   * @param {number} totalEntries
   * @returns {Object} criteria → { risk, level, entryCount }
   */
  _computeCriteriaScores(criteriaFindings, totalEntries) {
    const scores = {};

    for (const [criteria, entries] of Object.entries(criteriaFindings)) {
      if (entries.length === 0) {
        scores[criteria] = { risk: 0, level: RiskLevel.LOW, entryCount: 0 };
        continue;
      }

      // Weighted severity sum
      let severitySum = 0;
      let failureCount = 0;
      let violationCount = 0;

      for (const entry of entries) {
        const weight = SEVERITY_WEIGHTS[entry.type] || 1;
        severitySum += weight;

        if (entry.outcome === 'failure' || entry.outcome === 'denied') {
          failureCount++;
        }
        if (entry.type === AuditEntryType.POLICY_VIOLATION) {
          violationCount++;
        }
      }

      // Normalize: base risk from severity density
      const densityFactor = totalEntries > 0 ? severitySum / totalEntries : 0;
      // Failure ratio amplifier
      const failureRatio = entries.length > 0 ? failureCount / entries.length : 0;
      // Violation bonus
      const violationBonus = Math.min(violationCount * 5, 30);

      // Composite risk score (0-100)
      let risk = Math.min(100, Math.round(
        (densityFactor * 40) + (failureRatio * 30) + violationBonus
      ));

      scores[criteria] = {
        risk,
        level: this._riskScoreToLevel(risk),
        entryCount: entries.length,
        severitySum,
        failureCount,
        violationCount,
      };
    }

    return scores;
  }

  /**
   * Compute overall risk as a weighted average of criteria scores.
   * Security and Processing Integrity are weighted higher.
   *
   * @param {Object} criteriaScores
   * @returns {number} 0-100
   */
  _computeOverallRisk(criteriaScores) {
    const weights = {
      [TrustCriteria.SECURITY]:             0.30,
      [TrustCriteria.AVAILABILITY]:         0.15,
      [TrustCriteria.PROCESSING_INTEGRITY]: 0.30,
      [TrustCriteria.CONFIDENTIALITY]:      0.15,
      [TrustCriteria.PRIVACY]:              0.10,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [criteria, weight] of Object.entries(weights)) {
      const score = criteriaScores[criteria];
      if (score) {
        weightedSum += score.risk * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Convert numeric risk score to RiskLevel.
   * @param {number} score
   * @returns {string}
   */
  _riskScoreToLevel(score) {
    if (score >= 75) return RiskLevel.CRITICAL;
    if (score >= 50) return RiskLevel.HIGH;
    if (score >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  // ─── Internal: Findings Generator ──────────────────────────────────────────────

  /**
   * Generate human-readable findings per criteria.
   * @param {Object} criteriaFindings
   * @param {Object} criteriaScores
   * @returns {Object} criteria → findings[]
   */
  _generateFindings(criteriaFindings, criteriaScores) {
    const findings = {};

    for (const criteria of Object.values(TrustCriteria)) {
      findings[criteria] = [];
      const entries = criteriaFindings[criteria] || [];
      const score = criteriaScores[criteria];

      if (entries.length === 0) {
        findings[criteria].push({
          severity: 'INFO',
          finding: `No audit events recorded for ${criteria} during the reporting period.`,
          recommendation: 'Ensure audit logging is properly configured for this criteria.',
        });
        continue;
      }

      // Security-specific findings
      if (criteria === TrustCriteria.SECURITY) {
        const violations = entries.filter(e => e.type === AuditEntryType.POLICY_VIOLATION);
        if (violations.length > 0) {
          findings[criteria].push({
            severity: violations.length > 5 ? 'HIGH' : 'MEDIUM',
            finding: `${violations.length} policy violation(s) detected during the reporting period.`,
            recommendation: 'Review and remediate all policy violations. Update access controls as needed.',
            count: violations.length,
          });
        }

        const killSwitchEvents = entries.filter(e => e.type === AuditEntryType.KILL_SWITCH_EVENT);
        if (killSwitchEvents.length > 0) {
          findings[criteria].push({
            severity: 'HIGH',
            finding: `${killSwitchEvents.length} kill-switch event(s) triggered during the reporting period.`,
            recommendation: 'Investigate root cause of each kill-switch activation. Document incident response.',
            count: killSwitchEvents.length,
          });
        }

        const accessRevocations = entries.filter(e => e.type === AuditEntryType.ACCESS_REVOKE);
        if (accessRevocations.length > 0) {
          findings[criteria].push({
            severity: 'INFO',
            finding: `${accessRevocations.length} access revocation(s) recorded.`,
            recommendation: 'Verify all revocations were authorized and properly documented.',
            count: accessRevocations.length,
          });
        }
      }

      // Availability-specific findings
      if (criteria === TrustCriteria.AVAILABILITY) {
        const systemEvents = entries.filter(e => e.type === AuditEntryType.SYSTEM_EVENT);
        const failedEvents = systemEvents.filter(e => e.outcome === 'failure');
        if (failedEvents.length > 0) {
          findings[criteria].push({
            severity: failedEvents.length > 3 ? 'HIGH' : 'MEDIUM',
            finding: `${failedEvents.length} system failure event(s) recorded.`,
            recommendation: 'Review system stability. Consider redundancy improvements.',
            count: failedEvents.length,
          });
        }

        const deployments = entries.filter(e => e.type === AuditEntryType.DEPLOYMENT);
        if (deployments.length > 0) {
          const failedDeploys = deployments.filter(e => e.outcome === 'failure');
          findings[criteria].push({
            severity: failedDeploys.length > 0 ? 'MEDIUM' : 'INFO',
            finding: `${deployments.length} deployment(s) recorded; ${failedDeploys.length} failed.`,
            recommendation: failedDeploys.length > 0
              ? 'Investigate failed deployments. Review CI/CD pipeline reliability.'
              : 'Deployment process operating within normal parameters.',
            count: deployments.length,
          });
        }
      }

      // Processing Integrity findings
      if (criteria === TrustCriteria.PROCESSING_INTEGRITY) {
        const hallucinations = entries.filter(e => e.type === AuditEntryType.HALLUCINATION);
        if (hallucinations.length > 0) {
          findings[criteria].push({
            severity: hallucinations.length > 10 ? 'HIGH' : 'MEDIUM',
            finding: `${hallucinations.length} hallucination detection event(s) recorded.`,
            recommendation: 'Review LLM output quality. Consider tightening hallucination thresholds.',
            count: hallucinations.length,
          });
        }

        const governanceDecisions = entries.filter(e => e.type === AuditEntryType.GOVERNANCE_DECISION);
        const denied = governanceDecisions.filter(e => e.outcome === 'denied');
        if (denied.length > 0) {
          findings[criteria].push({
            severity: 'INFO',
            finding: `${denied.length} governance action(s) denied out of ${governanceDecisions.length} total.`,
            recommendation: 'Review denied actions to ensure governance policies are appropriately calibrated.',
            count: denied.length,
          });
        }
      }

      // Confidentiality findings
      if (criteria === TrustCriteria.CONFIDENTIALITY) {
        const dataAccess = entries.filter(e => e.type === AuditEntryType.DATA_ACCESS);
        if (dataAccess.length > 0) {
          const uniqueActors = [...new Set(dataAccess.map(e => e.actor))];
          findings[criteria].push({
            severity: 'INFO',
            finding: `${dataAccess.length} data access event(s) from ${uniqueActors.length} unique actor(s).`,
            recommendation: 'Verify all data access is authorized and follows least-privilege principles.',
            count: dataAccess.length,
          });
        }
      }

      // Privacy findings
      if (criteria === TrustCriteria.PRIVACY) {
        const dataAccess = entries.filter(e => e.type === AuditEntryType.DATA_ACCESS);
        const piiAccess = dataAccess.filter(e =>
          e.detail && (e.detail.containsPII || e.detail.dataClass === 'PII' || e.detail.pii === true)
        );
        if (piiAccess.length > 0) {
          findings[criteria].push({
            severity: 'MEDIUM',
            finding: `${piiAccess.length} PII access event(s) detected.`,
            recommendation: 'Ensure PII handling complies with applicable privacy regulations (GDPR, CCPA).',
            count: piiAccess.length,
          });
        }
        if (dataAccess.length > 0 && piiAccess.length === 0) {
          findings[criteria].push({
            severity: 'INFO',
            finding: `${dataAccess.length} data access event(s) with no PII flags.`,
            recommendation: 'Continue monitoring. Ensure PII classification is correctly applied.',
            count: dataAccess.length,
          });
        }
      }

      // Generic risk-level finding
      if (score && score.risk > 0) {
        findings[criteria].push({
          severity: score.level,
          finding: `Overall risk score for ${criteria}: ${score.risk}/100 (${score.level}).`,
          recommendation: score.risk >= 50
            ? `Elevated risk detected. Prioritize remediation for ${criteria}.`
            : `Risk within acceptable bounds for ${criteria}.`,
        });
      }
    }

    return findings;
  }

  // ─── Internal: Remediation Generator ───────────────────────────────────────────

  /**
   * Generate remediation recommendations per criteria.
   * @param {Object} criteriaFindings
   * @param {Object} criteriaScores
   * @returns {Object} criteria → remediations[]
   */
  _generateRemediations(criteriaFindings, criteriaScores) {
    const remediations = {};

    for (const criteria of Object.values(TrustCriteria)) {
      remediations[criteria] = [];
      const score = criteriaScores[criteria];
      const entries = criteriaFindings[criteria] || [];

      if (!score || score.risk === 0) continue;

      if (criteria === TrustCriteria.SECURITY) {
        if (score.violationCount > 0) {
          remediations[criteria].push({
            priority: 'HIGH',
            action: 'Conduct security incident review for all policy violations.',
            control: 'CC6.1 — Logical and Physical Access Controls',
          });
        }
        if (entries.some(e => e.type === AuditEntryType.KILL_SWITCH_EVENT)) {
          remediations[criteria].push({
            priority: 'HIGH',
            action: 'Document kill-switch incident response procedures. Verify runbooks are current.',
            control: 'CC7.3 — Security Incident Response',
          });
        }
        if (score.risk >= 50) {
          remediations[criteria].push({
            priority: 'MEDIUM',
            action: 'Review and update access control policies. Implement periodic access reviews.',
            control: 'CC6.2 — Prior to Issuing Credentials',
          });
        }
      }

      if (criteria === TrustCriteria.AVAILABILITY) {
        if (score.failureCount > 0) {
          remediations[criteria].push({
            priority: 'HIGH',
            action: 'Implement or review redundancy and failover mechanisms.',
            control: 'A1.2 — Environmental Protections',
          });
        }
        if (score.risk >= 25) {
          remediations[criteria].push({
            priority: 'MEDIUM',
            action: 'Review capacity planning and monitoring thresholds.',
            control: 'A1.1 — System Availability',
          });
        }
      }

      if (criteria === TrustCriteria.PROCESSING_INTEGRITY) {
        const hallucinationEntries = entries.filter(e => e.type === AuditEntryType.HALLUCINATION);
        if (hallucinationEntries.length > 0) {
          remediations[criteria].push({
            priority: 'HIGH',
            action: 'Tighten hallucination detection thresholds. Add retrieval-augmented verification.',
            control: 'PI1.2 — System Processing Accuracy',
          });
        }
        if (score.risk >= 25) {
          remediations[criteria].push({
            priority: 'MEDIUM',
            action: 'Enhance governance decision logging with additional context for root cause analysis.',
            control: 'PI1.4 — Data Processing Integrity',
          });
        }
      }

      if (criteria === TrustCriteria.CONFIDENTIALITY) {
        if (score.risk >= 25) {
          remediations[criteria].push({
            priority: 'MEDIUM',
            action: 'Review data classification and encryption-at-rest policies.',
            control: 'C1.1 — Confidential Information Identification',
          });
        }
      }

      if (criteria === TrustCriteria.PRIVACY) {
        const piiEntries = entries.filter(e =>
          e.detail && (e.detail.containsPII || e.detail.dataClass === 'PII' || e.detail.pii === true)
        );
        if (piiEntries.length > 0) {
          remediations[criteria].push({
            priority: 'HIGH',
            action: 'Audit PII data flows. Verify consent and data retention compliance.',
            control: 'P1.1 — Privacy Notice',
          });
        }
        if (score.risk >= 25) {
          remediations[criteria].push({
            priority: 'MEDIUM',
            action: 'Review data subject access request (DSAR) procedures.',
            control: 'P4.1 — Access to PII',
          });
        }
      }
    }

    return remediations;
  }

  // ─── Internal: Executive Summary ───────────────────────────────────────────────

  /**
   * Build the executive summary section.
   */
  _buildExecutiveSummary(entries, criteriaScores, overallRiskScore, overallRiskLevel, chainVerification) {
    const totalViolations = entries.filter(e => e.type === AuditEntryType.POLICY_VIOLATION).length;
    const totalKillSwitch = entries.filter(e => e.type === AuditEntryType.KILL_SWITCH_EVENT).length;
    const totalHallucinations = entries.filter(e => e.type === AuditEntryType.HALLUCINATION).length;
    const uniqueActors = [...new Set(entries.map(e => e.actor))].length;

    const criticalCriteria = Object.entries(criteriaScores)
      .filter(([, s]) => s.level === RiskLevel.CRITICAL || s.level === RiskLevel.HIGH)
      .map(([c]) => c);

    let narrative = `During the reporting period, ${entries.length} audit events were recorded ` +
      `from ${uniqueActors} unique actor(s). `;

    if (overallRiskLevel === RiskLevel.LOW) {
      narrative += 'The overall risk posture is LOW. All trust criteria are within acceptable bounds.';
    } else if (overallRiskLevel === RiskLevel.MEDIUM) {
      narrative += 'The overall risk posture is MEDIUM. Some areas require attention.';
    } else if (overallRiskLevel === RiskLevel.HIGH) {
      narrative += `The overall risk posture is HIGH. The following criteria require immediate attention: ${criticalCriteria.join(', ')}.`;
    } else {
      narrative += `The overall risk posture is CRITICAL. Immediate remediation required for: ${criticalCriteria.join(', ')}.`;
    }

    if (!chainVerification.valid) {
      narrative += ' WARNING: Audit trail integrity verification FAILED. Chain may have been tampered with.';
    }

    return {
      narrative,
      overallRiskScore,
      overallRiskLevel,
      totalEvents: entries.length,
      uniqueActors,
      policyViolations: totalViolations,
      killSwitchEvents: totalKillSwitch,
      hallucinationFlags: totalHallucinations,
      chainIntegrityVerified: chainVerification.valid,
      criticalCriteria,
    };
  }

  // ─── Internal: Utilities ───────────────────────────────────────────────────────

  /**
   * Count entries grouped by type.
   * @param {Array} entries
   * @returns {Object}
   */
  _countByType(entries) {
    const counts = {};
    for (const entry of entries) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Count entries grouped by outcome.
   * @param {Array} entries
   * @returns {Object}
   */
  _countByOutcome(entries) {
    const counts = {};
    for (const entry of entries) {
      const key = entry.outcome || 'unspecified';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  /**
   * Compute SHA-256 hash of a report for tamper detection.
   * Excludes the reportHash field itself.
   *
   * @param {Object} report
   * @returns {string} hex SHA-256 hash
   */
  _computeReportHash(report) {
    const toHash = { ...report, reportHash: null };
    const payload = JSON.stringify(toHash, (key, value) => {
      // Ensure deterministic serialization: sort object keys
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted = {};
        for (const k of Object.keys(value).sort()) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

module.exports = { ComplianceReport, TrustCriteria, RiskLevel, CRITERIA_MAP };
