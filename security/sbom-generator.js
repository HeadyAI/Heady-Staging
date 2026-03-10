/**
 * Heady SBOM Generator — Software Bill of Materials
 * Dependency tracking, vulnerability scanning, license compliance
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate } from '../shared/csl-engine-v2.js';

const MAX_DEPENDENCIES   = fibonacci(17);  // 1597
const VULN_CACHE_SIZE    = fibonacci(14);  // 377
const LICENSE_WHITELIST  = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0', 'Unlicense', '0BSD'];
const LICENSE_BLACKLIST  = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'];

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

const dependencies = new Map();
const vulnerabilities = new Map();
const metrics = { scanned: 0, vulnerabilities: 0, licenseIssues: 0 };

function registerDependency(spec) {
  if (dependencies.size >= MAX_DEPENDENCIES) return { error: 'max_dependencies' };
  const dep = {
    name: spec.name,
    version: spec.version,
    license: spec.license || 'UNKNOWN',
    type: spec.type || 'production',
    source: spec.source || 'npm',
    hash: sha256(spec.name + '@' + spec.version),
    integrity: spec.integrity || sha256(spec.name + spec.version),
    transitive: spec.transitive || false,
    parent: spec.parent || null,
    registered: Date.now(),
  };
  dependencies.set(dep.name + '@' + dep.version, dep);
  return { registered: dep.name + '@' + dep.version, hash: dep.hash };
}

function checkLicenseCompliance(depKey) {
  const dep = dependencies.get(depKey);
  if (!dep) return { error: 'dependency_not_found' };
  const isWhitelisted = LICENSE_WHITELIST.includes(dep.license);
  const isBlacklisted = LICENSE_BLACKLIST.includes(dep.license);
  const complianceScore = isWhitelisted ? 1.0 : (isBlacklisted ? 0.0 : PSI);
  const gate = cslGate(complianceScore, complianceScore, phiThreshold(2), PSI * PSI * PSI);

  if (isBlacklisted) metrics.licenseIssues++;
  return {
    dependency: depKey,
    license: dep.license,
    whitelisted: isWhitelisted,
    blacklisted: isBlacklisted,
    complianceScore,
    gateScore: gate,
    compliant: gate > phiThreshold(1),
  };
}

function reportVulnerability(depKey, vuln) {
  const dep = dependencies.get(depKey);
  if (!dep) return { error: 'dependency_not_found' };
  const id = sha256(depKey + vuln.cve + Date.now());
  const entry = {
    id, dependency: depKey,
    cve: vuln.cve || 'UNKNOWN',
    severity: vuln.severity || 'MEDIUM',
    description: vuln.description || '',
    fixedIn: vuln.fixedIn || null,
    published: vuln.published || Date.now(),
    hash: sha256(depKey + JSON.stringify(vuln)),
  };
  if (vulnerabilities.size >= VULN_CACHE_SIZE) {
    const oldest = vulnerabilities.keys().next().value;
    vulnerabilities.delete(oldest);
  }
  vulnerabilities.set(id, entry);
  metrics.vulnerabilities++;
  return { id, cve: entry.cve, severity: entry.severity };
}

function generateSbom(format) {
  const fmt = format || 'cyclonedx';
  const deps = [...dependencies.values()];
  const vulns = [...vulnerabilities.values()];
  metrics.scanned++;

  if (fmt === 'cyclonedx') {
    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: sha256('heady-sbom-' + Date.now()),
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ name: 'heady-sbom-generator', version: '1.0.0' }],
        component: { type: 'application', name: 'heady-latent-os', version: '1.0.0', author: 'Eric Haywood' },
      },
      components: deps.map(d => ({
        type: 'library', name: d.name, version: d.version,
        licenses: [{ license: { id: d.license } }],
        hashes: [{ alg: 'SHA-256', content: d.hash }],
        purl: 'pkg:npm/' + d.name + '@' + d.version,
      })),
      vulnerabilities: vulns.map(v => ({
        id: v.cve, source: { name: 'heady-scanner' },
        ratings: [{ severity: v.severity.toLowerCase() }],
        description: v.description,
        affects: [{ ref: v.dependency }],
      })),
    };
  }

  return {
    spdxVersion: 'SPDX-2.3',
    name: 'heady-latent-os',
    packages: deps.map(d => ({
      name: d.name, versionInfo: d.version,
      licenseConcluded: d.license,
      checksumSha256: d.hash,
    })),
  };
}

function getSecuritySummary() {
  const deps = [...dependencies.values()];
  const vulns = [...vulnerabilities.values()];
  const licenseBreaches = deps.filter(d => LICENSE_BLACKLIST.includes(d.license));
  const criticalVulns = vulns.filter(v => v.severity === 'CRITICAL');
  const highVulns = vulns.filter(v => v.severity === 'HIGH');

  return {
    totalDependencies: deps.length,
    productionDeps: deps.filter(d => d.type === 'production').length,
    devDeps: deps.filter(d => d.type === 'dev').length,
    transitiveDeps: deps.filter(d => d.transitive).length,
    vulnerabilities: { total: vulns.length, critical: criticalVulns.length, high: highVulns.length },
    licenseBreaches: licenseBreaches.map(d => ({ name: d.name, license: d.license })),
    metrics: { ...metrics },
  };
}

function createServer(port = 3393) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
      const readBody = () => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString())); } catch { r({}); } }); });

      if (url.pathname === '/sbom/dependency' && req.method === 'POST') respond(201, registerDependency(await readBody()));
      else if (url.pathname === '/sbom/license-check' && req.method === 'GET') respond(200, checkLicenseCompliance(url.searchParams.get('dep')));
      else if (url.pathname === '/sbom/vulnerability' && req.method === 'POST') { const b = await readBody(); respond(201, reportVulnerability(b.dependency, b)); }
      else if (url.pathname === '/sbom/generate' && req.method === 'GET') respond(200, generateSbom(url.searchParams.get('format')));
      else if (url.pathname === '/sbom/summary' && req.method === 'GET') respond(200, getSecuritySummary());
      else if (url.pathname === '/health') respond(200, { service: 'sbom-generator', status: 'healthy', dependencies: dependencies.size, vulnerabilities: vulnerabilities.size, metrics });
      else respond(404, { error: 'not_found' });
    });
    server.listen(port);
    return server;
  });
}

export default { createServer, registerDependency, checkLicenseCompliance, reportVulnerability, generateSbom, getSecuritySummary };
export { createServer, registerDependency, checkLicenseCompliance, reportVulnerability, generateSbom, getSecuritySummary };
