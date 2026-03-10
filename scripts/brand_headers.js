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
// ║  FILE: scripts/brand_headers.js                                                    ║
// ║  LAYER: automation                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HEADY SYSTEMS - Sacred Geometry Branding Engine               ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
 * ║  ∞ Organic Systems · Breathing Interfaces ∞                    ║
 * ║                                                                ║
 * ║  brand_headers.js - Automatic Sacred Geometry branding         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Sacred Geometry banner template
const HEADY_BANNER = `╔══════════════════════════════════════════════════════════════════╗
║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
║                                                                  ║
║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  FILE: {file}                                                    ║
║  LAYER: {layer}                                                  ║
╚══════════════════════════════════════════════════════════════════╝`;

// File type configurations
const FILE_TYPES = {
  // JavaScript/TypeScript
  js: { prefix: '//', suffix: '' },
  jsx: { prefix: '//', suffix: '' },
  ts: { prefix: '//', suffix: '' },
  tsx: { prefix: '//', suffix: '' },
  cjs: { prefix: '//', suffix: '' },
  mjs: { prefix: '//', suffix: '' },
  
  // Python
  py: { prefix: '#', suffix: '' },
  
  // PowerShell
  ps1: { prefix: '<#', suffix: '#>' },
  
  // Shell
  sh: { prefix: '#', suffix: '' },
  
  // Markdown
  md: { prefix: '<!--', suffix: '-->' },
  
  // YAML
  yml: { prefix: '#', suffix: '' },
  yaml: { prefix: '#', suffix: '' },
  
  // Config files with hash comments
  dockerfile: { prefix: '#', suffix: '' },
  'docker-compose.yml': { prefix: '#', suffix: '' },
  'docker-compose.yaml': { prefix: '#', suffix: '' },
  'render.yml': { prefix: '#', suffix: '' },
  'render.yaml': { prefix: '#', suffix: '' },
  'gitignore': { prefix: '#', suffix: '' },
  'gitattributes': { prefix: '#', suffix: '' },
  'requirements.txt': { prefix: '#', suffix: '' },
  'env.example': { prefix: '#', suffix: '' },
  'env.local': { prefix: '#', suffix: '' },
  'env.production': { prefix: '#', suffix: '' }
};

// Layer mapping based on directory structure
function getLayer(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('public/')) return 'ui/public';
  if (normalizedPath.includes('frontend/')) return 'ui/frontend';
  if (normalizedPath.includes('backend/')) return 'backend';
  if (normalizedPath.includes('src/')) return 'backend/src';
  if (normalizedPath.includes('tests/')) return 'tests';
  if (normalizedPath.includes('docs/')) return 'docs';
  if (normalizedPath.includes('scripts/')) return 'automation';
  if (normalizedPath.includes('configs/')) return 'config';
  if (normalizedPath.includes('extensions/')) return 'extensions';
  if (normalizedPath.includes('headybuddy/')) return 'headybuddy';
  if (normalizedPath.includes('headybrowser/')) return 'headybrowser';
  if (normalizedPath.includes('notebooks/')) return 'notebooks';
  
  return 'root';
}

// Get file type configuration
function getFileType(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  
  // Check exact filename matches first (for files like Dockerfile, .gitignore)
  if (FILE_TYPES[basename]) {
    return FILE_TYPES[basename];
  }
  
  // Check extension
  if (FILE_TYPES[ext]) {
    return FILE_TYPES[ext];
  }
  
  return null;
}

// Check if file should be processed
function shouldProcessFile(filePath) {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  // Skip binary/non-commentable files
  const skipExtensions = ['.json', '.lock', '.ipynb', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.exe', '.svg', '.ico', '.webp'];
  if (skipExtensions.includes(ext)) return false;
  
  // Skip generated/minified files
  if (basename.includes('.min.') || basename.includes('.map')) return false;
  
  // Skip large files
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 1024 * 1024) return false; // > 1MB
  } catch (err) {
    return false;
  }
  
  // Skip vendor/build directories
  const skipDirs = ['.git', 'node_modules', 'dist', 'build', 'venv', '__pycache__', '.pytest_cache', '.next', '.nuxt'];
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (skipDirs.some(dir => normalizedPath.includes(`/${dir}/`) || normalizedPath.endsWith(`/${dir}`))) return false;
  
  return true;
}

// Generate branded header
function generateHeader(filePath, fileType) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const layer = getLayer(relativePath);
  
  let banner = HEADY_BANNER
    .replace('{file}', relativePath)
    .replace('{layer}', layer);
  
  // Wrap with appropriate comment syntax
  const lines = banner.split('\n');
  const wrappedLines = [
    `${fileType.prefix} HEADY_BRAND:BEGIN`,
    ...lines.map(line => `${fileType.prefix} ${line}`),
    `${fileType.prefix} HEADY_BRAND:END`
  ];
  
  if (fileType.suffix) {
    wrappedLines.push(fileType.suffix);
  }
  
  return wrappedLines.join('\n') + '\n';
}

// Check if file already has branding
function hasBranding(content, fileType) {
  const beginMarker = `${fileType.prefix} HEADY_BRAND:BEGIN`;
  const endMarker = fileType.suffix ? 
    `${fileType.suffix}` : 
    `${fileType.prefix} HEADY_BRAND:END`;
  
  return content.includes(beginMarker) && content.includes(endMarker);
}

// Remove existing branding
function removeBranding(content, fileType) {
  const beginMarker = `${fileType.prefix} HEADY_BRAND:BEGIN`;
  const endMarker = fileType.suffix ? 
    fileType.suffix : 
    `${fileType.prefix} HEADY_BRAND:END`;
  
  const beginIndex = content.indexOf(beginMarker);
  if (beginIndex === -1) return content;
  
  const endIndex = content.indexOf(endMarker, beginIndex);
  if (endIndex === -1) return content;
  
  const afterEndIndex = endIndex + endMarker.length;
  const nextLineIndex = content.indexOf('\n', afterEndIndex);
  
  return content.slice(0, beginIndex) + 
         (nextLineIndex !== -1 ? content.slice(nextLineIndex + 1) : '');
}

// Process a single file
function processFile(filePath, options = {}) {
  if (!shouldProcessFile(filePath)) {
    return { status: 'skipped', reason: 'File type excluded' };
  }
  
  const fileType = getFileType(filePath);
  if (!fileType) {
    return { status: 'skipped', reason: 'Unsupported file type' };
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove existing branding if present
    content = removeBranding(content, fileType);
    
    // Handle special cases for Python (preserve shebang/encoding)
    let prefix = '';
    if (fileType.prefix === '#' && content.startsWith('#!')) {
      const shebangEnd = content.indexOf('\n');
      if (shebangEnd !== -1) {
        prefix = content.slice(0, shebangEnd + 1);
        content = content.slice(shebangEnd + 1);
      }
    }
    
    // Add new branding
    const brandedContent = prefix + generateHeader(filePath, fileType) + content;
    
    // Check if anything changed
    if (brandedContent === originalContent) {
      return { status: 'unchanged', reason: 'Already branded' };
    }
    
    if (options.dryRun) {
      return { status: 'would_change', reason: 'Would add branding' };
    }
    
    fs.writeFileSync(filePath, brandedContent, 'utf8');
    return { status: 'branded', reason: 'Added Sacred Geometry branding' };
    
  } catch (error) {
    return { status: 'error', reason: error.message };
  }
}

// Get staged files from git
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Print colored banner
function printBanner() {
  console.log(`${colors.cyan}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║');
  console.log('║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║');
  console.log('║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║');
  console.log('║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║');
  console.log('║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║');
  console.log('║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║');
  console.log('║                                                                  ║');
  console.log('║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║');
  console.log('║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║');
  console.log('║  Heady Branding Engine - Sacred Geometry File Headers          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const options = {
    check: args.includes('--check'),
    fix: args.includes('--fix'),
    staged: args.includes('--staged'),
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run')
  };
  
  printBanner();
  
  let filesToProcess = [];
  
  if (options.staged) {
    filesToProcess = getStagedFiles();
    if (filesToProcess.length === 0) {
      console.log(`${colors.yellow}No staged files to process.${colors.reset}`);
      return;
    }
    console.log(`${colors.cyan}Processing ${filesToProcess.length} staged files...${colors.reset}`);
  } else {
    // Get all files in the project
    const getAllFiles = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.')) {
          getAllFiles(filePath, fileList);
        } else if (stat.isFile()) {
          fileList.push(filePath);
        }
      }
      
      return fileList;
    };
    
    filesToProcess = getAllFiles(process.cwd());
    console.log(`${colors.cyan}Scanning ${filesToProcess.length} files...${colors.reset}`);
  }
  
  const results = {
    branded: 0,
    unchanged: 0,
    skipped: 0,
    error: 0,
    would_change: 0
  };
  
  for (const filePath of filesToProcess) {
    const result = processFile(filePath, options);
    results[result.status.replace('-', '_')] = (results[result.status.replace('-', '_')] || 0) + 1;
    
    if (options.verbose || result.status === 'error' || result.status === 'branded' || result.status === 'would_change') {
      const colorMap = {
        branded: colors.green,
        unchanged: colors.gray,
        skipped: colors.gray,
        error: colors.red,
        would_change: colors.yellow
      };
      
      const iconMap = {
        branded: '✓',
        unchanged: '○',
        skipped: '○',
        error: '✗',
        would_change: '◇'
      };
      
      console.log(
        `${colorMap[result.status] || colors.reset}` +
        `${iconMap[result.status] || '○'} ` +
        `${result.status.toUpperCase().padEnd(12)} ` +
        `${path.relative(process.cwd(), filePath)}` +
        (result.reason ? ` ${colors.gray}(${result.reason})${colors.reset}` : '')
      );
    }
  }
  
  // Summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}SUMMARY:${colors.reset}`);
  
  if (results.branded > 0) {
    console.log(`${colors.green}✓ Branded: ${results.branded} files${colors.reset}`);
  }
  if (results.unchanged > 0) {
    console.log(`${colors.gray}○ Unchanged: ${results.unchanged} files${colors.reset}`);
  }
  if (results.skipped > 0) {
    console.log(`${colors.gray}○ Skipped: ${results.skipped} files${colors.reset}`);
  }
  if (results.would_change > 0) {
    console.log(`${colors.yellow}◇ Would change: ${results.would_change} files${colors.reset}`);
  }
  if (results.error > 0) {
    console.log(`${colors.red}✗ Errors: ${results.error} files${colors.reset}`);
  }
  
  // Exit codes
  if (options.check && (results.branded > 0 || results.would_change > 0)) {
    console.log(`\n${colors.red}✗ Some files need branding. Run 'npm run brand:fix' to fix.${colors.reset}`);
    process.exit(1);
  }
  
  if (results.error > 0) {
    process.exit(1);
  }
  
  console.log(`\n${colors.green}∞ Sacred Geometry branding complete! ∞${colors.reset}`);
}

if (require.main === module) {
  main();
}

module.exports = { processFile, generateHeader, getLayer };
