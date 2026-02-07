#!/usr/bin/env node

/**
 * Localhost-to-Domain Migration Automation
 * 
 * Systematically replaces all localhost references with proper internal domains
 * across the entire Heady codebase and configurations.
 * 
 * Usage:
 *   node scripts/migrate-localhost-to-domains.js [--dry-run] [--verify-only]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify-only');

// Mapping of localhost patterns to domain replacements
const LOCALHOST_MAPPINGS = {
  // HTTP/HTTPS patterns
  'http://localhost:3300': 'http://manager.dev.local.heady.internal:3300',
  'https://localhost:3300': 'https://manager.dev.local.heady.internal:3300',
  'http://127.0.0.1:3300': 'http://manager.dev.local.heady.internal:3300',
  'https://127.0.0.1:3300': 'https://manager.dev.local.heady.internal:3300',
  'http://0.0.0.0:3300': 'http://manager.dev.local.heady.internal:3300',
  'http://localhost:3000': 'http://app-web.dev.local.heady.internal:3000',
  'http://localhost:3001': 'http://tools-mcp.dev.local.heady.internal:3001',
  'http://localhost:3301': 'http://app-buddy.dev.local.heady.internal:3301',
  'http://localhost:3302': 'http://bridge-browser.dev.local.heady.internal:3302',
  'http://localhost:3303': 'http://io-voice.dev.local.heady.internal:3303',
  'http://localhost:3304': 'http://svc-billing.dev.local.heady.internal:3304',
  'http://localhost:3305': 'http://svc-telemetry.dev.local.heady.internal:3305',
  'http://localhost:5432': 'postgresql://db-postgres.dev.local.heady.internal:5432',
  'http://localhost:6379': 'redis://db-redis.dev.local.heady.internal:6379',
  'http://localhost:8080': 'http://admin-postgres.dev.local.heady.internal:8080',
  'http://localhost:8081': 'http://admin-redis.dev.local.heady.internal:8081',
  'http://localhost:9090': 'http://debug-manager.dev.local.heady.internal:9090',
  'http://localhost:11434': 'http://ai-ollama.dev.local.heady.internal:11434',

  // Database connection strings
  'localhost:5432': 'db-postgres.dev.local.heady.internal:5432',
  '127.0.0.1:5432': 'db-postgres.dev.local.heady.internal:5432',
  'localhost:6379': 'db-redis.dev.local.heady.internal:6379',
  '127.0.0.1:6379': 'db-redis.dev.local.heady.internal:6379',

  // Plain localhost patterns
  'localhost': 'manager.dev.local.heady.internal',
  '127.0.0.1': 'manager.dev.local.heady.internal',
};

// File patterns to search
const FILE_PATTERNS = [
  '**/*.js',
  '**/*.ts',
  '**/*.json',
  '**/*.yaml',
  '**/*.yml',
  '**/*.md',
  '**/*.sh',
  '**/*.ps1',
  'Dockerfile',
  'docker-compose.yml',
  '.env*',
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.heady_cache',
  '.next',
  'out',
];

let filesProcessed = 0;
let replacementsMade = 0;
let violations = [];

/**
 * Check if a file should be processed
 */
function shouldProcessFile(filePath) {
  // Check if in excluded directory
  for (const excludeDir of EXCLUDE_DIRS) {
    if (filePath.includes(path.sep + excludeDir + path.sep) || filePath.includes(path.sep + excludeDir)) {
      return false;
    }
  }
  return true;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (!shouldProcessFile(filePath)) return;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileReplacements = 0;

    // Apply replacements (longest patterns first to avoid partial replacements)
    const sortedMappings = Object.entries(LOCALHOST_MAPPINGS)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [oldPattern, newPattern] of sortedMappings) {
      // Use word boundaries for plain localhost to avoid false positives
      let regex;
      if (oldPattern === 'localhost' || oldPattern === '127.0.0.1') {
        regex = new RegExp(`\\b${oldPattern.replace(/\./g, '\\.')}\\b`, 'g');
      } else {
        regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      }

      const matches = content.match(regex);
      if (matches) {
        fileReplacements += matches.length;
        content = content.replace(regex, newPattern);
      }
    }

    if (fileReplacements > 0) {
      replacementsMade += fileReplacements;
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filePath}: ${fileReplacements} replacements`);
      } else {
        console.log(`📝 [DRY-RUN] ${filePath}: ${fileReplacements} replacements`);
      }
    }

    filesProcessed++;
  } catch (err) {
    console.warn(`⚠️ Error processing ${filePath}: ${err.message}`);
  }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          processDirectory(fullPath);
        }
      } else {
        processFile(fullPath);
      }
    }
  } catch (err) {
    console.warn(`⚠️ Error reading directory ${dirPath}: ${err.message}`);
  }
}

/**
 * Verify no localhost references remain
 */
function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  const localhostPattern = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/gi;
  let violationCount = 0;

  function checkDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(entry.name)) {
            checkDirectory(fullPath);
          }
        } else if (shouldProcessFile(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(localhostPattern);
            if (matches) {
              violationCount += matches.length;
              violations.push({
                file: fullPath,
                count: matches.length,
                matches: [...new Set(matches)],
              });
            }
          } catch (err) {
            // Ignore binary files
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }

  checkDirectory(process.cwd());

  if (violations.length > 0) {
    console.log(`\n❌ Found ${violationCount} localhost references in ${violations.length} files:`);
    violations.forEach((v) => {
      console.log(`  ${v.file}: ${v.count} matches (${v.matches.join(', ')})`);
    });
    return false;
  } else {
    console.log('✅ No localhost references found!');
    return true;
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('LOCALHOST-TO-DOMAIN MIGRATION REPORT');
  console.log('='.repeat(70));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Total replacements: ${replacementsMade}`);
  console.log(`Localhost violations remaining: ${violations.length}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY-RUN MODE: No files were actually modified');
  }
  
  console.log('\nMapping Summary:');
  console.log('  localhost:3300 → manager.dev.local.heady.internal:3300');
  console.log('  localhost:3000 → app-web.dev.local.heady.internal:3000');
  console.log('  localhost:5432 → db-postgres.dev.local.heady.internal:5432');
  console.log('  localhost:6379 → db-redis.dev.local.heady.internal:6379');
  console.log('  (and 14 more service mappings)');
  
  console.log('\nNext Steps:');
  console.log('  1. Review changes: git diff');
  console.log('  2. Test locally: npm run dev');
  console.log('  3. Run clean build: npm run clean-build');
  console.log('  4. Commit changes: git commit -m "refactor: migrate localhost to internal domains"');
  console.log('='.repeat(70) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Heady Localhost-to-Domain Migration');
  console.log('=' .repeat(70));

  if (VERIFY_ONLY) {
    console.log('Running verification only...\n');
    const success = verifyMigration();
    process.exit(success ? 0 : 1);
  }

  if (DRY_RUN) {
    console.log('⚠️  DRY-RUN MODE: No files will be modified\n');
  }

  console.log('Starting migration...\n');
  processDirectory(process.cwd());

  const success = verifyMigration();
  generateReport();

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
