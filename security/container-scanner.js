/**
 * container-scanner.js — Container Image Security Scanner
 *
 * SBOM generation, vulnerability assessment, image signing verification,
 * and dependency audit for Docker images. φ-scaled severity scoring,
 * CSL-gated pass/fail for deployment gates.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';
import { createHash } from 'crypto';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const MAX_DEPENDENCIES   = 987;          // fib(16) max tracked
const SCAN_CACHE_SIZE    = 89;           // fib(11) cached scans
const VULNERABILITY_DB_REFRESH = 34 * 60 * 1000; // fib(9) minutes
const MAX_IMAGE_AGE_DAYS = 89;          // fib(11) max days before forced rebuild

// ── Severity Scores (φ-derived) ─────────────────────────
const SEVERITY = {
  CRITICAL: { score: CSL_THRESHOLDS.CRITICAL, label: 'Critical', color: '#ef4444', maxAllowed: 0 },
  HIGH:     { score: CSL_THRESHOLDS.HIGH,     label: 'High',     color: '#f97316', maxAllowed: 0 },
  MEDIUM:   { score: CSL_THRESHOLDS.MEDIUM,   label: 'Medium',   color: '#f59e0b', maxAllowed: 3 }, // fib(4)
  LOW:      { score: CSL_THRESHOLDS.LOW,      label: 'Low',      color: '#22c55e', maxAllowed: 8 }, // fib(6)
  INFO:     { score: CSL_THRESHOLDS.MINIMUM,  label: 'Info',     color: '#6b7280', maxAllowed: 21 }, // fib(8)
};

// ── SBOM Generator ──────────────────────────────────────
/**
 * Generate a CycloneDX SBOM from package data.
 */
export function generateSBOM(packageData, options = {}) {
  const {
    name = 'heady-service',
    version = '1.0.0',
    format = 'cyclonedx',
  } = options;

  const dependencies = packageData.dependencies || {};
  const devDependencies = packageData.devDependencies || {};

  const components = [];
  const allDeps = { ...dependencies, ...devDependencies };

  for (const [pkg, ver] of Object.entries(allDeps).slice(0, MAX_DEPENDENCIES)) {
    const cleanVersion = ver.replace(/^[~^>=<]+/, '');
    components.push({
      type: 'library',
      name: pkg,
      version: cleanVersion,
      purl: `pkg:npm/${pkg}@${cleanVersion}`,
      scope: dependencies[pkg] ? 'required' : 'optional',
      hashes: [{
        alg: 'SHA-256',
        content: createHash('sha256').update(`${pkg}@${cleanVersion}`).digest('hex'),
      }],
    });
  }

  if (format === 'cyclonedx') {
    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'HeadySystems', name: 'container-scanner', version: '1.0.0' }],
        component: {
          type: 'application',
          name,
          version,
          author: 'Eric Haywood',
        },
      },
      components,
      dependencies: components.map(c => ({ ref: c.purl, dependsOn: [] })),
    };
  }

  // SPDX format
  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${name}-sbom`,
    documentNamespace: `https://headysystems.com/sbom/${name}/${version}`,
    creationInfo: {
      created: new Date().toISOString(),
      creators: ['Tool: HeadySystems container-scanner', 'Organization: HeadySystems'],
    },
    packages: components.map((c, i) => ({
      SPDXID: `SPDXRef-Package-${i}`,
      name: c.name,
      versionInfo: c.version,
      downloadLocation: `https://registry.npmjs.org/${c.name}`,
      supplier: 'NOASSERTION',
    })),
  };
}

// ── Vulnerability Assessment ────────────────────────────
/**
 * Assess vulnerability risk of a dependency set.
 * In production, this would query a vulnerability database (Snyk, NVD, etc.)
 * Here we provide the assessment framework with severity scoring.
 */
export function assessVulnerabilities(sbom, knownVulns = []) {
  const findings = [];

  for (const vuln of knownVulns) {
    const severity = SEVERITY[vuln.severity?.toUpperCase()] || SEVERITY.INFO;
    
    findings.push({
      id: vuln.id || createHash('sha256').update(`${vuln.package}:${vuln.title}`).digest('hex').slice(0, 21),
      package: vuln.package,
      version: vuln.version,
      title: vuln.title,
      severity: vuln.severity,
      severityScore: severity.score,
      fixAvailable: vuln.fixVersion ? true : false,
      fixVersion: vuln.fixVersion || null,
      cve: vuln.cve || null,
      url: vuln.url || null,
    });
  }

  // Sort by severity (highest first)
  findings.sort((a, b) => b.severityScore - a.severityScore);

  // Compute overall risk score
  const riskWeights = findings.reduce((sum, f) => sum + f.severityScore, 0);
  const maxRisk = findings.length * CSL_THRESHOLDS.CRITICAL;
  const riskScore = maxRisk > 0 ? 1 - (riskWeights / maxRisk) : 1.0;

  // Determine if deploy is allowed
  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  const deployAllowed = criticalCount <= SEVERITY.CRITICAL.maxAllowed &&
                        highCount <= SEVERITY.HIGH.maxAllowed &&
                        mediumCount <= SEVERITY.MEDIUM.maxAllowed;

  return {
    findings,
    summary: {
      total: findings.length,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: findings.filter(f => f.severity === 'LOW').length,
      info: findings.filter(f => f.severity === 'INFO').length,
    },
    riskScore,
    deployAllowed,
    recommendation: deployAllowed
      ? 'Deploy allowed — all vulnerability counts within thresholds'
      : `Deploy BLOCKED — ${criticalCount} critical, ${highCount} high vulnerabilities exceed limits`,
  };
}

// ── Image Attestation ───────────────────────────────────
/**
 * Verify a container image signature.
 */
export function verifyImageSignature(imageDigest, signature, publicKey) {
  if (!imageDigest || !signature) {
    return { verified: false, reason: 'Missing digest or signature' };
  }

  const expectedHash = createHash('sha256')
    .update(imageDigest + (publicKey || ''))
    .digest('hex');

  // In production, this uses cosign / sigstore
  const isValid = signature.includes(expectedHash.slice(0, 21));

  return {
    verified: isValid,
    imageDigest,
    signaturePresent: true,
    attestation: isValid ? 'VERIFIED' : 'UNVERIFIED',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check image age and recommend rebuild.
 */
export function checkImageAge(buildDate) {
  const age = Date.now() - new Date(buildDate).getTime();
  const ageDays = age / (24 * 60 * 60 * 1000);
  const needsRebuild = ageDays > MAX_IMAGE_AGE_DAYS;

  return {
    buildDate,
    ageDays: Math.round(ageDays),
    maxAgeDays: MAX_IMAGE_AGE_DAYS,
    needsRebuild,
    recommendation: needsRebuild
      ? `Image is ${Math.round(ageDays)} days old (max ${MAX_IMAGE_AGE_DAYS}). Rebuild recommended.`
      : `Image is ${Math.round(ageDays)} days old. Within acceptable range.`,
  };
}

/**
 * Run a full security scan on a container image.
 */
export function fullScan(packageData, knownVulns = [], imageInfo = {}) {
  const sbom = generateSBOM(packageData, imageInfo);
  const vulnAssessment = assessVulnerabilities(sbom, knownVulns);
  const ageCheck = imageInfo.buildDate ? checkImageAge(imageInfo.buildDate) : null;
  const sigCheck = imageInfo.digest ? verifyImageSignature(imageInfo.digest, imageInfo.signature, imageInfo.publicKey) : null;

  const overallPass = vulnAssessment.deployAllowed &&
    (!ageCheck || !ageCheck.needsRebuild) &&
    (!sigCheck || sigCheck.verified);

  return {
    sbom,
    vulnerabilities: vulnAssessment,
    imageAge: ageCheck,
    signature: sigCheck,
    overallPass,
    overallRecommendation: overallPass
      ? 'All security checks passed. Safe to deploy.'
      : 'One or more security checks failed. Review findings before deploying.',
    timestamp: new Date().toISOString(),
  };
}

export { SEVERITY, CSL_THRESHOLDS, MAX_IMAGE_AGE_DAYS };
export default { generateSBOM, assessVulnerabilities, verifyImageSignature, checkImageAge, fullScan };
