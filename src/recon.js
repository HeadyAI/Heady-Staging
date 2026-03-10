const pino = require('pino');
const logger = pino();
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/recon.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyRecon :: System Reconnaissance Module
 * Sacred Geometry :: Organic Systems :: Breathing Interfaces
 * Flow: Files → Scan → Analyze → Optimize
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitStatus() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    
    return {
      branch,
      commit: commit.substring(0, 7),
      modifiedFiles: status.split('\n').filter(Boolean).length,
      isClean: !status,
    };
  } catch {
    return { error: 'Not a git repository' };
  }
}

function getNodeVersion() {
  try {
    return process.version;
  } catch {
    return 'unknown';
  }
}

function getPackageInfo() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return {
        name: pkg.name,
        version: pkg.version,
        scripts: Object.keys(pkg.scripts || {}),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getFileStructure(rootDir, maxDepth = 3, currentDepth = 0) {
  const result = {
    name: path.basename(rootDir),
    type: 'directory',
    children: [],
  };
  
  if (currentDepth >= maxDepth) return result;
  
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.heady') continue;
      
      const fullPath = path.join(rootDir, entry.name);
      
      if (entry.isDirectory()) {
        result.children.push(getFileStructure(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        result.children.push({
          name: entry.name,
          type: 'file',
          size: fs.statSync(fullPath).size,
        });
      }
    }
  } catch {
    result.error = 'Permission denied';
  }
  
  return result;
}

function checkServiceHealth() {
  const services = [
    { name: 'heady-manager', port: 3300, endpoint: 'api/health' },
  ];
  
  return services.map(service => ({
    ...service,
    status: 'unknown',
    lastChecked: new Date().toISOString(),
  }));
}

function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: getNodeVersion(),
      platform: process.platform,
      arch: process.arch,
    },
    repository: getGitStatus(),
    package: getPackageInfo(),
    services: checkServiceHealth(),
    structure: getFileStructure(process.cwd()),
  };
  
  return report;
}

function printReport(report) {
  logger.info('\n=== Heady System Recon Report ===');
  logger.info(`Timestamp: ${report.timestamp}`);
  logger.info(`Node: ${report.system.nodeVersion} | ${report.system.platform}`);
  
  if (report.repository.error) {
    logger.info(`Git: ${report.repository.error}`);
  } else {
    logger.info(`Git: ${report.repository.branch} @ ${report.repository.commit}`);
    logger.info(`Modified: ${report.repository.modifiedFiles} files`);
  }
  
  if (report.package) {
    logger.info(`Package: ${report.package.name} v${report.package.version}`);
  }
  
  logger.info('================================\n');
  
  return report;
}

async function runRecon() {
  const report = generateReport();
  printReport(report);
  return report;
}

module.exports = {
  getGitStatus,
  getNodeVersion,
  getPackageInfo,
  getFileStructure,
  checkServiceHealth,
  generateReport,
  printReport,
  runRecon,
};
