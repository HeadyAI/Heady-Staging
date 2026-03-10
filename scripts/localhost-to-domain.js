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
// ║  FILE: scripts/internal.headyio.com-to-domain.js                                                    ║
// ║  LAYER: automation                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

/**
 * Enhanced Localhost to Domain Migration Tool
 * 
 * Features:
 * - Parallel processing for large codebases
 * - Advanced pattern matching and validation
 * - Comprehensive logging and reporting
 * - Rollback capabilities
 * - Performance monitoring
 * - Configuration management
 */

// Enhanced configuration
const CONFIG = {
    // Performance settings
    maxWorkers: require('os').cpus().length,
    batchSize: 100,
    parallelProcessing: true,
    
    // File processing
    maxFileSize: 20 * 1024 * 1024, // 20MB
    excludedDirs: [
        'node_modules', '.git', '__pycache__', '.next', 'dist', 
        'build', 'coverage', '.heady_cache', '.vscode', '.idea'
    ],
    excludedFiles: [
        'package-lock.json', 'yarn.lock', '.env', '.env.local',
        'service-discovery.yaml', 'internal.headyio.com-inventory.json',
        'localhost-to-domain.js'
    ],
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: path.join(process.env.USERPROFILE || require('os').homedir(), '.heady', 'logs', 'migration.log'),
    
    // Backup and rollback
    backupEnabled: true,
    backupPath: path.join(process.env.USERPROFILE || require('os').homedir(), '.heady', 'backups'),
    
    // Validation
    validateAfterMigration: true,
    strictMode: false
};

// Logging system
class Logger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
        this.ensureLogDirectory();
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(CONFIG.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    log(level, message, metadata = {}) {
        if (this.levels[level] < this.levels[this.level]) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...metadata
        };
        
        // Console output
        const colors = { debug: 'gray', info: 'blue', warn: 'yellow', error: 'red' };
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        
        // File logging
        fs.appendFileSync(CONFIG.logFile, JSON.stringify(logEntry) + '\n');
    }
    
    debug(message, metadata) { this.log('debug', message, metadata); }
    info(message, metadata) { this.log('info', message, metadata); }
    warn(message, metadata) { this.log('warn', message, metadata); }
    error(message, metadata) { this.log('error', message, metadata); }
}

// Service discovery with caching
class ServiceDiscovery {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    load() {
        const now = Date.now();
        
        if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheTimeout) {
            return this.cache;
        }
        
        const discoveryPath = path.join(__dirname, '..', 'configs', 'service-discovery.yaml');
        
        if (fs.existsSync(discoveryPath)) {
            try {
                const content = fs.readFileSync(discoveryPath, 'utf8');
                this.cache = yaml.load(content);
                this.cacheTimestamp = now;
                logger.debug('Service discovery loaded from cache', { path: discoveryPath });
                return this.cache;
            } catch (err) {
                logger.warn('Failed to load service-discovery.yaml', { error: err.message });
            }
        }
        
        // Fallback configuration
        this.cache = {
            services: {
                manager: { port: 3300, domain: 'manager.headysystems.com' },
                api: { port: 3000, domain: 'api.headyio.com' },
                redis: { port: 6379, domain: 'redis.headysystems.com' },
                postgres: { port: 5432, domain: 'db.headysystems.com' }
            }
        };
        this.cacheTimestamp = now;
        
        return this.cache;
    }
    
    getMappings() {
        const discovery = this.load();
        const mappings = {};
        
        if (discovery && discovery.services) {
            for (const [serviceName, config] of Object.entries(discovery.services)) {
                const port = config.port;
                const domain = config.domain || `${serviceName}.headysystems.com`;
                
                // Create comprehensive mappings
                const internal.headyio.comPatterns = [
                    `localhost:${port}`,
                    `internal.headyio.com:${port}`,
                    `0.0.0.0:${port}`,
                    `::1:${port}`,
                    `[::1]:${port}`
                ];
                
                localhostPatterns.forEach(pattern => {
                    mappings[pattern] = `${domain}:${port}`;
                });
                
                // Map without port for common services
                if ([3300, 3000].includes(port)) {
                    mappings['internal.headyio.com'] = domain;
                    mappings['internal.headyio.com'] = domain;
                    mappings['0.0.0.0'] = domain;
                }
            }
        }
        
        return mappings;
    }
}

// Advanced pattern matcher
class PatternMatcher {
    constructor(mappings) {
        this.mappings = mappings;
        this.regexCache = new Map();
    }
    
    getRegex(pattern) {
        if (this.regexCache.has(pattern)) {
            return this.regexCache.get(pattern);
        }
        
        // Escape special regex characters
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        
        this.regexCache.set(pattern, regex);
        return regex;
    }
    
    replaceInContent(content, filePath) {
        let modified = content;
        let changes = [];
        
        for (const [pattern, replacement] of Object.entries(this.mappings)) {
            const regex = this.getRegex(pattern);
            const matches = modified.match(regex);
            
            if (matches) {
                const before = modified;
                modified = modified.replace(regex, replacement);
                
                if (before !== modified) {
                    changes.push({
                        pattern,
                        replacement,
                        count: matches.length,
                        context: this.extractContext(content, pattern, matches.length)
                    });
                }
            }
        }
        
        return { content: modified, changes };
    }
    
    extractContext(content, pattern, maxMatches = 3) {
        const lines = content.split('\n');
        const contexts = [];
        let found = 0;
        
        for (let i = 0; i < lines.length && found < maxMatches; i++) {
            if (lines[i].includes(pattern)) {
                const start = Math.max(0, i - 1);
                const end = Math.min(lines.length - 1, i + 1);
                contexts.push({
                    line: i + 1,
                    context: lines.slice(start, end + 1).join('\n')
                });
                found++;
            }
        }
        
        return contexts;
    }
}

// File processor with parallel capabilities
class FileProcessor {
    constructor(patternMatcher) {
        this.patternMatcher = patternMatcher;
        this.stats = {
            processed: 0,
            modified: 0,
            errors: 0,
            skipped: 0,
            totalChanges: 0
        };
    }
    
    shouldProcessFile(filePath) {
        // Validate file path to prevent path traversal
        if (!filePath || typeof filePath !== 'string') return false;
        if (filePath.includes('..') || filePath.includes('~')) return false;
        
        const ext = path.extname(filePath);
        const validExts = ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml', '.md', '.html', '.py', '.go', '.sh', '.ps1', '.bat'];
        
        if (!validExts.includes(ext)) return false;
        
        const basename = path.basename(filePath);
        if (CONFIG.excludedFiles.includes(basename)) return false;
        
        // Check file size
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > CONFIG.maxFileSize) {
                logger.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
                return false;
            }
        } catch (err) {
            logger.error(`Error checking file size: ${filePath}`, { error: err.message });
            return false;
        }
        
        return true;
    }
    
    processFile(filePath, dryRun = false) {
        try {
            if (!this.shouldProcessFile(filePath)) {
                this.stats.skipped++;
                return { success: true, changes: [] };
            }
            
            this.stats.processed++;
            const content = fs.readFileSync(filePath, 'utf8');
            const { content: modified, changes } = this.patternMatcher.replaceInContent(content, filePath);
            
            if (changes.length > 0) {
                this.stats.modified++;
                this.stats.totalChanges += changes.reduce((sum, c) => sum + c.count, 0);
                
                if (!dryRun) {
                    // Create backup before modification
                    if (CONFIG.backupEnabled) {
                        this.createBackup(filePath, content);
                    }
                    
                    fs.writeFileSync(filePath, modified, 'utf8');
                    logger.info(`Updated: ${filePath}`, { changes: changes.length });
                } else {
                    logger.debug(`Would update: ${filePath} (${changes.length} replacements)`);
                }
                
                return { success: true, changes, filePath };
            }
            
            return { success: true, changes: [] };
        } catch (err) {
            this.stats.errors++;
            logger.error(`Error processing file: ${filePath}`, { error: err.message });
            return { success: false, error: err.message, filePath };
        }
    }
    
    createBackup(filePath, originalContent) {
        // Validate inputs
        if (!filePath || typeof filePath !== 'string' || !originalContent || typeof originalContent !== 'string') {
            throw new Error('Invalid backup parameters');
        }
        
        // Prevent path traversal in backup path
        const relativePath = path.relative(process.cwd(), filePath);
        if (relativePath.includes('..') || relativePath.includes('~')) {
            throw new Error('Invalid file path for backup');
        }
        
        const backupDir = CONFIG.backupPath;
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `${relativePath}.${timestamp}.backup`);
        const backupDirPath = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDirPath)) {
            fs.mkdirSync(backupDirPath, { recursive: true });
        }
        
        fs.writeFileSync(backupPath, originalContent, 'utf8');
    }
    
    async processDirectory(dir, dryRun = false) {
        const files = this.findFiles(dir);
        logger.info(`Found ${files.length} files to process`);
        
        if (CONFIG.parallelProcessing && files.length > CONFIG.batchSize) {
            return this.processFilesParallel(files, dryRun);
        } else {
            return this.processFilesSequential(files, dryRun);
        }
    }
    
    findFiles(dir) {
        const files = [];
        
        function walk(currentPath) {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                
                if (entry.isDirectory()) {
                    if (!CONFIG.excludedDirs.includes(entry.name)) {
                        walk(fullPath);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldProcessFile(fullPath)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        
        walk.call(this, dir);
        return files;
    }
    
    async processFilesParallel(files, dryRun) {
        const results = [];
        const workerCount = Math.min(CONFIG.maxWorkers, Math.ceil(files.length / CONFIG.batchSize));
        
        logger.info(`Processing files in parallel with ${workerCount} workers`);
        
        const batches = [];
        for (let i = 0; i < files.length; i += CONFIG.batchSize) {
            batches.push(files.slice(i, i + CONFIG.batchSize));
        }
        
        const workers = [];
        const promises = [];
        
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(__filename, {
                workerData: {
                    type: 'process',
                    batch: batches[i] || [],
                    dryRun,
                    mappings: this.patternMatcher.mappings,
                    config: CONFIG
                }
            });
            
            workers.push(worker);
            
            const promise = new Promise((resolve, reject) => {
                worker.on('message', resolve);
                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });
            });
            
            promises.push(promise);
        }
        
        const workerResults = await Promise.all(promises);
        
        // Combine results
        for (const result of workerResults) {
            results.push(...result.results);
            this.stats.processed += result.stats.processed;
            this.stats.modified += result.stats.modified;
            this.stats.errors += result.stats.errors;
            this.stats.skipped += result.stats.skipped;
            this.stats.totalChanges += result.stats.totalChanges;
        }
        
        // Clean up workers
        workers.forEach(worker => worker.terminate());
        
        return results;
    }
    
    processFilesSequential(files, dryRun) {
        const results = [];
        
        for (const filePath of files) {
            const result = this.processFile(filePath, dryRun);
            if (result.changes && result.changes.length > 0) {
                results.push(result);
            }
        }
        
        return results;
    }
}

// Validation system
class Validator {
    constructor(patternMatcher) {
        this.patternMatcher = patternMatcher;
    }
    
    validateMigration(results) {
        const validationResults = {
            success: true,
            issues: [],
            warnings: [],
            summary: {
                filesValidated: 0,
                issuesFound: 0,
                warningsFound: 0
            }
        };
        
        for (const result of results) {
            if (!result.success) continue;
            
            validationResults.summary.filesValidated++;
            
            // Validate each change
            for (const change of result.changes) {
                const issues = this.validateChange(change, result.filePath);
                
                if (issues.issues.length > 0) {
                    validationResults.success = false;
                    validationResults.issues.push(...issues.issues);
                    validationResults.summary.issuesFound += issues.issues.length;
                }
                
                if (issues.warnings.length > 0) {
                    validationResults.warnings.push(...issues.warnings);
                    validationResults.summary.warningsFound += issues.warnings.length;
                }
            }
        }
        
        return validationResults;
    }
    
    validateChange(change, filePath) {
        const issues = { issues: [], warnings: [] };
        
        // Check for potential broken URLs
        if (change.pattern.includes('http') && change.replacement.includes('headysystems.com')) {
            // This might be a public URL that shouldn't be changed
            if (filePath.includes('docs') || filePath.includes('README')) {
                issues.warnings.push(`Possible public URL modification in ${filePath}: ${change.pattern} → ${change.replacement}`);
            }
        }
        
        // Check for environment variable conflicts
        if (change.pattern.includes('internal.headyio.com') && change.replacement.includes('headysystems.com')) {
            if (filePath.includes('.env') || filePath.includes('config')) {
                issues.warnings.push(`Environment variable modification in ${filePath}: ${change.pattern} → ${change.replacement}`);
            }
        }
        
        // Validate replacement format
        if (!change.replacement.includes('.')) {
            issues.issues.push(`Invalid replacement format in ${filePath}: ${change.replacement}`);
        }
        
        return issues;
    }
}

// Worker thread handler
if (!isMainThread) {
    const { type, batch, dryRun, mappings, config } = workerData;
    
    // Validate worker data
    if (!type || !Array.isArray(batch) || typeof dryRun !== 'boolean' || !mappings || !config) {
        parentPort.postMessage({ error: 'Invalid worker data received' });
        process.exit(1);
    }
    
    if (type === 'process') {
        const patternMatcher = new PatternMatcher(mappings);
        const processor = new FileProcessor(patternMatcher);
        
        const results = [];
        const stats = { processed: 0, modified: 0, errors: 0, skipped: 0, totalChanges: 0 };
        
        for (const filePath of batch) {
            const result = processor.processFile(filePath, dryRun);
            if (result.changes && result.changes.length > 0) {
                results.push(result);
            }
            
            stats.processed++;
            if (result.changes && result.changes.length > 0) stats.modified++;
            if (!result.success) stats.errors++;
            if (result.changes && result.changes.length === 0) stats.skipped++;
            if (result.changes) stats.totalChanges += result.changes.reduce((sum, c) => sum + c.count, 0);
        }
        
        parentPort.postMessage({ results, stats });
    }
}

// Main application
class EnhancedLocalhostToDomain {
    constructor() {
        this.logger = new Logger(CONFIG.logLevel);
        this.serviceDiscovery = new ServiceDiscovery();
        this.patternMatcher = new PatternMatcher(this.serviceDiscovery.getMappings());
        this.fileProcessor = new FileProcessor(this.patternMatcher);
        this.validator = new Validator(this.patternMatcher);
    }
    
    async run(command, target = './distribution', options = {}) {
        const startTime = Date.now();
        
        try {
            switch (command) {
                case 'inventory':
                    return await this.runInventory(target, options);
                case 'migrate':
                    return await this.runMigration(target, options);
                case 'validate':
                    return await this.runValidation(target, options);
                case 'rollback':
                    return await this.runRollback(options);
                case 'hosts':
                    return this.generateHostsFile();
                default:
                    this.showHelp();
            }
        } catch (err) {
            this.logger.error('Command failed', { command, error: err.message });
            throw err;
        } finally {
            const duration = Date.now() - startTime;
            this.logger.info(`Command completed in ${duration}ms`, { command, duration });
        }
    }
    
    async runInventory(target, options) {
        this.logger.info('Starting inventory scan', { target });
        
        const results = await this.fileProcessor.processDirectory(path.resolve(target), true);
        
        const report = {
            summary: {
                filesScanned: this.fileProcessor.stats.processed,
                filesWithChanges: this.fileProcessor.stats.modified,
                totalReplacements: this.fileProcessor.stats.totalChanges,
                filesSkipped: this.fileProcessor.stats.skipped,
                errors: this.fileProcessor.stats.errors
            },
            changes: results.map(r => ({
                file: r.filePath,
                changes: r.changes.map(c => ({
                    pattern: c.pattern,
                    replacement: c.replacement,
                    count: c.count,
                    contexts: c.context
                }))
            }))
        };
        
        this.displayInventoryReport(report);
        return report;
    }
    
    async runMigration(target, options) {
        const dryRun = options.dryRun || false;
        
        this.logger.info(`Starting migration ${dryRun ? '(dry run)' : ''}`, { target });
        
        if (!dryRun && CONFIG.backupEnabled) {
            this.logger.info('Creating backups before migration');
        }
        
        const results = await this.fileProcessor.processDirectory(path.resolve(target), dryRun);
        
        if (CONFIG.validateAfterMigration && !dryRun) {
            this.logger.info('Validating migration results');
            const validation = this.validator.validateMigration(results);
            
            if (!validation.success) {
                this.logger.error('Migration validation failed', { issues: validation.issues.length });
                
                if (CONFIG.strictMode) {
                    throw new Error('Migration validation failed in strict mode');
                }
            }
            
            this.displayValidationReport(validation);
        }
        
        const report = {
            summary: {
                filesProcessed: this.fileProcessor.stats.processed,
                filesModified: this.fileProcessor.stats.modified,
                totalReplacements: this.fileProcessor.stats.totalChanges,
                filesSkipped: this.fileProcessor.stats.skipped,
                errors: this.fileProcessor.stats.errors,
                dryRun
            },
            results
        };
        
        this.displayMigrationReport(report);
        
        if (!dryRun && this.fileProcessor.stats.modified > 0) {
            this.logger.info('Migration completed successfully');
            console.log('\n✅ Migration completed!');
            console.log('Next steps:');
            console.log('  1. Test your applications with the new domains');
            console.log('  2. Update DNS records if needed');
            console.log('  3. Remove old internal.headyio.com references from documentation');
        }
        
        return report;
    }
    
    async runValidation(target, options) {
        this.logger.info('Starting validation', { target });
        
        // First run inventory to get current state
        const inventory = await this.runInventory(target, { dryRun: true });
        
        // Validate the potential changes
        const validation = this.validator.validateMigration(inventory.changes);
        
        this.displayValidationReport(validation);
        return validation;
    }
    
    async runRollback(options) {
        this.logger.info('Starting rollback process');
        
        const backupDir = CONFIG.backupPath;
        if (!fs.existsSync(backupDir)) {
            throw new Error('No backup directory found');
        }
        
        // This would implement rollback logic
        // For now, just list available backups
        const backups = fs.readdirSync(backupDir, { recursive: true })
            .filter(file => file.endsWith('.backup'))
            .slice(0, 10); // Show last 10 backups
        
        console.log('\nAvailable backups:');
        backups.forEach(backup => console.log(`  ${backup}`));
        console.log('\nRollback functionality to be implemented');
        
        return { backups };
    }
    
    generateHostsFile() {
        const mappings = this.serviceDiscovery.getMappings();
        const hosts = [
            '# Heady Internal DNS - Enhanced Migration',
            '# Generated by enhanced-internal.headyio.com-to-domain migration tool',
            `# Generated on: ${new Date().toISOString()}`,
            ''
        ];
        
        // Extract unique domains
        const domains = new Set();
        for (const [pattern, replacement] of Object.entries(mappings)) {
            const domain = replacement.split(':')[0];
            domains.add(domain);
        }
        
        // Add internal.headyio.com mapping for each domain
        for (const domain of Array.from(domains).sort()) {
            hosts.push(`internal.headyio.com ${domain}`);
        }
        
        hosts.push('');
        hosts.push('# Service-specific mappings');
        for (const [pattern, replacement] of Object.entries(mappings)) {
            if (pattern.includes(':')) {
                const domain = replacement.split(':')[0];
                hosts.push(`internal.headyio.com ${domain}`);
            }
        }
        
        return hosts.join('\n');
    }
    
    displayInventoryReport(report) {
        console.log('\n📊 Inventory Results:');
        console.log(`  Files scanned: ${report.summary.filesScanned}`);
        console.log(`  Files with changes: ${report.summary.filesWithChanges}`);
        console.log(`  Total replacements needed: ${report.summary.totalReplacements}`);
        console.log(`  Files skipped: ${report.summary.filesSkipped}`);
        console.log(`  Errors: ${report.summary.errors}`);
        
        if (report.changes.length > 0) {
            console.log('\n📝 Changes needed:');
            report.changes.forEach(change => {
                console.log(`  ${change.file}:`);
                change.changes.forEach(c => {
                    console.log(`    ${c.pattern} → ${c.replacement} (${c.count}x)`);
                });
            });
        }
    }
    
    displayMigrationReport(report) {
        const action = report.summary.dryRun ? 'Would modify' : 'Modified';
        console.log('\n📊 Migration Results:');
        console.log(`  Files processed: ${report.summary.filesProcessed}`);
        console.log(`  Files ${action.toLowerCase()}: ${report.summary.filesModified}`);
        console.log(`  Total replacements: ${report.summary.totalReplacements}`);
        console.log(`  Files skipped: ${report.summary.filesSkipped}`);
        console.log(`  Errors: ${report.summary.errors}`);
        
        if (report.summary.errors > 0) {
            console.log('\n⚠️  Some files had errors during processing');
        }
    }
    
    displayValidationReport(validation) {
        console.log('\n🔍 Validation Results:');
        console.log(`  Files validated: ${validation.summary.filesValidated}`);
        console.log(`  Issues found: ${validation.summary.issuesFound}`);
        console.log(`  Warnings found: ${validation.summary.warningsFound}`);
        
        if (validation.issues.length > 0) {
            console.log('\n❌ Issues:');
            validation.issues.forEach(issue => {
                console.log(`  ${issue}`);
            });
        }
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warning => {
                console.log(`  ${warning}`);
            });
        }
        
        if (validation.success) {
            console.log('\n✅ Validation passed');
        } else {
            console.log('\n❌ Validation failed');
        }
    }
    
    showHelp() {
        console.log('Enhanced Localhost to Domain Migration Tool v2.0');
        console.log('');
        console.log('Usage: node localhost-to-domain.js <command> [target] [options]');
        console.log('');
        console.log('Commands:');
        console.log('  inventory [dir]    Scan for localhost references (dry run)');
        console.log('  migrate [dir]      Replace localhost with domain names');
        console.log('  validate [dir]    Validate potential changes');
        console.log('  rollback           Rollback from backups');
        console.log('  hosts              Generate hosts file content');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run, -d      Show changes without applying');
        console.log('  --parallel, -p     Use parallel processing');
        console.log('  --strict, -s       Enable strict validation mode');
        console.log('  --no-backup        Skip backup creation');
        console.log('');
        console.log('Environment Variables:');
        console.log('  LOG_LEVEL          Set logging level (debug, info, warn, error)');
        console.log('');
        console.log('Examples:');
        console.log('  node localhost-to-domain.js inventory ./distribution');
        console.log('  node internal.headyio.com-to-domain.js migrate ./src --dry-run');
        console.log('  node internal.headyio.com-to-domain.js migrate ./src --parallel');
        console.log('  LOG_LEVEL=debug node internal.headyio.com-to-domain.js migrate ./src');
        console.log('  node internal.headyio.com-to-domain.js hosts > hosts.txt');
    }
}

// CLI interface
if (isMainThread) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const target = args[1] || './distribution';
    
    const options = {
        dryRun: args.includes('--dry-run') || args.includes('-d'),
        parallel: args.includes('--parallel') || args.includes('-p'),
        strict: args.includes('--strict') || args.includes('-s'),
        noBackup: args.includes('--no-backup')
    };
    
    // Update config based on options
    if (options.parallel) CONFIG.parallelProcessing = true;
    if (options.strict) CONFIG.strictMode = true;
    if (options.noBackup) CONFIG.backupEnabled = false;
    
    const app = new EnhancedLocalhostToDomain();
    
    app.run(command, target, options).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}

module.exports = { EnhancedLocalhostToDomain, CONFIG };
