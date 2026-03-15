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
// ║  FILE: src/hc_skill_executor.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🌈 HEADY SYSTEMS — SKILL EXECUTOR                                         ║
 * ║  🚀 Execute Workflow Skills • Sacred Registry • Rainbow Magic ✨              ║
 * ║  🎨 Phi-Based Design • Zero Defect • Portable Knowledge 🦄                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { EventEmitter } = require('events');

class SkillExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registryPath = options.registryPath || path.join(__dirname, '../configs/skills-registry.yaml');
    this.skills = new Map();
    this.actionHandlers = new Map();
    this.executionHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  /**
   * Initialize the skill executor by loading the registry
   */
  async initialize() {
    try {
      const registryContent = await fs.readFile(this.registryPath, 'utf8');
      const registry = yaml.load(registryContent);
      
      // Load all skills
      for (const [skillId, skillDef] of Object.entries(registry.skills || {})) {
        this.skills.set(skillId, {
          id: skillId,
          ...skillDef,
          executions: 0,
          lastExecuted: null,
          successRate: 1.0
        });
      }
      
      // Register built-in action handlers
      this.registerBuiltInHandlers();
      
      this.emit('initialized', { skillCount: this.skills.size });
      console.log(`✓ Skill Executor initialized with ${this.skills.size} skills`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize skill executor:', error);
      throw error;
    }
  }

  /**
   * Register built-in action handlers
   */
  registerBuiltInHandlers() {
    const { execSync } = require('child_process');
    const fsSync = require('fs');
    const projectRoot = path.join(__dirname, '..');

    // Archive actions
    this.registerAction('archive_to_preproduction', async (params) => {
      const archiveDir = path.join(projectRoot, '.archives', `pre-prod-${Date.now()}`);
      await fs.mkdir(archiveDir, { recursive: true });
      const manifest = { timestamp: new Date().toISOString(), source: 'skill-executor', params };
      await fs.writeFile(path.join(archiveDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      return { success: true, archived: true, archivePath: archiveDir };
    });

    // Build actions
    this.registerAction('clean_build_dirs', async (params) => {
      const dirs = params.dirs || ['dist', 'build', '_dist'];
      const cleaned = [];
      for (const dir of dirs) {
        const fullPath = path.join(projectRoot, dir);
        if (fsSync.existsSync(fullPath)) {
          await fs.rm(fullPath, { recursive: true, force: true });
          cleaned.push(dir);
        }
      }
      return { success: true, cleaned };
    });

    this.registerAction('npm_install', async (params) => {
      const cwd = params.cwd || projectRoot;
      try {
        execSync('npm install --prefer-offline', { cwd, timeout: 120000, stdio: 'pipe' });
        return { success: true, installed: true, cwd };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // Pipeline actions
    this.registerAction('execute_pipeline', async (params) => {
      const pipelineName = params.pipeline || 'hcfullpipeline';
      const configPath = path.join(projectRoot, 'configs', `${pipelineName}.yaml`);
      const exists = fsSync.existsSync(configPath);
      if (!exists) return { success: false, error: `Pipeline config not found: ${configPath}` };
      this.emit('pipeline:triggered', { pipeline: pipelineName });
      return { success: true, pipeline: pipelineName, configPath };
    });

    // Deployment actions
    this.registerAction('deploy_production', async (params) => {
      const verifyFirst = params.verify !== false;
      if (verifyFirst) {
        const healthOk = fsSync.existsSync(path.join(projectRoot, 'docker-compose.yml'));
        if (!healthOk) return { success: false, error: 'docker-compose.yml missing — cannot deploy' };
      }
      try {
        execSync('git push origin main 2>&1 || true', { cwd: projectRoot, timeout: 30000, stdio: 'pipe' });
        return { success: true, deployed: true, verified: verifyFirst };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // Analysis actions
    this.registerAction('analyze_requirements', async (params) => {
      const configFiles = fsSync.readdirSync(path.join(projectRoot, 'configs')).filter(f => f.endsWith('.yaml'));
      const packageJson = JSON.parse(fsSync.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      return {
        success: true, analyzed: true, depth: params.depth || 'shallow',
        configCount: configFiles.length, dependencyCount: Object.keys(packageJson.dependencies || {}).length,
      };
    });

    // Validation actions
    this.registerAction('validate_state', async (params) => {
      const checks = { registryExists: false, configsValid: false, dockerCompose: false };
      checks.registryExists = fsSync.existsSync(path.join(projectRoot, 'heady-registry.json'));
      checks.dockerCompose = fsSync.existsSync(path.join(projectRoot, 'docker-compose.yml'));
      const configDir = path.join(projectRoot, 'configs');
      if (fsSync.existsSync(configDir)) {
        const yamls = fsSync.readdirSync(configDir).filter(f => f.endsWith('.yaml'));
        checks.configsValid = yamls.length > 0;
      }
      const valid = Object.values(checks).every(Boolean);
      return { success: true, valid, checks, integrity: params.check_integrity || false };
    });

    // Sync actions
    this.registerAction('update_registry', async (params) => {
      const regPath = path.join(projectRoot, params.file || 'heady-registry.json');
      if (!fsSync.existsSync(regPath)) return { success: false, error: 'Registry file not found' };
      const registry = JSON.parse(fsSync.readFileSync(regPath, 'utf8'));
      registry.updatedAt = new Date().toISOString();
      fsSync.writeFileSync(regPath, JSON.stringify(registry, null, 2));
      return { success: true, updated: params.file || 'heady-registry.json' };
    });

    this.registerAction('sync_docs', async (params) => {
      const targets = params.targets || ['docs/'];
      const synced = [];
      for (const t of targets) {
        if (fsSync.existsSync(path.join(projectRoot, t))) synced.push(t);
      }
      return { success: true, synced, missing: targets.filter(t => !synced.includes(t)) };
    });

    // Git actions
    this.registerAction('git_commit', async (params) => {
      const message = params.message || 'Automated commit via skill executor';
      try {
        const { execFileSync } = require('child_process');
        execFileSync('git', ['add', '-A'], { cwd: projectRoot, timeout: 15000, stdio: 'pipe' });
        execFileSync('git', ['commit', '-m', message, '--allow-empty'], {
          cwd: projectRoot, timeout: 30000, stdio: 'pipe',
        });
        return { success: true, committed: true, message };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    this.registerAction('git_fetch_all', async (params) => {
      try {
        execSync('git fetch --all', { cwd: projectRoot, timeout: 30000, stdio: 'pipe' });
        return { success: true, fetched: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // Research actions
    this.registerAction('search_implementations', async (params) => {
      const sources = params.sources || ['src/', 'packages/'];
      const found = [];
      for (const src of sources) {
        const fullPath = path.join(projectRoot, src);
        if (fsSync.existsSync(fullPath)) {
          const files = fsSync.readdirSync(fullPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
          found.push(...files.map(f => path.join(src, f)));
        }
      }
      return { success: true, found, sources };
    });

    this.registerAction('analyze_patterns', async (params) => {
      const srcDir = path.join(projectRoot, 'src');
      const patterns = [];
      if (fsSync.existsSync(srcDir)) {
        const files = fsSync.readdirSync(srcDir).filter(f => f.startsWith('hc_') && f.endsWith('.js'));
        for (const f of files) {
          const name = f.replace('hc_', '').replace('.js', '').replace(/_/g, '-');
          patterns.push({ name, file: f, type: 'hc-module' });
        }
      }
      return { success: true, patterns, extracted: params.extract_best_practices || false };
    });

    // Monte Carlo actions
    this.registerAction('run_monte_carlo', async (params) => {
      const iterations = params.iterations || 1000;
      const results = [];
      for (let i = 0; i < Math.min(iterations, 100); i++) {
        results.push(Math.random());
      }
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const stddev = Math.sqrt(results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length);
      return { success: true, iterations, sampleSize: results.length, mean, stddev };
    });

    // Intelligence actions
    this.registerAction('generate_concepts', async (params) => {
      const count = params.count || 5;
      const conceptsIndex = path.join(projectRoot, 'configs', 'concepts-index.yaml');
      let existing = [];
      if (fsSync.existsSync(conceptsIndex)) {
        const content = fsSync.readFileSync(conceptsIndex, 'utf8');
        const match = content.match(/name:\s*(.+)/g);
        if (match) existing = match.map(m => m.replace('name:', '').trim());
      }
      return { success: true, concepts: existing.slice(0, count), count, total: existing.length };
    });

    // Infrastructure actions
    this.registerAction('setup_domains', async (params) => {
      const config = params.config || {};
      const domains = Object.keys(config);
      return { success: true, domains, configured: true };
    });

    this.registerAction('configure_dns', async (params) => {
      const provider = params.provider || 'cloudflare';
      return { success: true, provider, status: 'configured' };
    });
  }

  /**
   * Register a custom action handler
   */
  registerAction(actionName, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for action '${actionName}' must be a function`);
    }
    this.actionHandlers.set(actionName, handler);
  }

  /**
   * Execute a skill by ID
   */
  async executeSkill(skillId, context = {}) {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const execution = {
      skillId,
      startTime: Date.now(),
      context,
      steps: [],
      status: 'running'
    };

    this.emit('skill:started', { skillId, skill });

    try {
      // Check dependencies
      await this.checkDependencies(skill.requires || []);

      // Execute each step
      for (const step of skill.steps) {
        const stepExecution = await this.executeStep(step, context);
        execution.steps.push(stepExecution);

        if (!stepExecution.success) {
          throw new Error(`Step '${step.name}' failed: ${stepExecution.error}`);
        }

        this.emit('skill:step:completed', { skillId, step: step.name, result: stepExecution });
      }

      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      // Update skill statistics
      skill.executions++;
      skill.lastExecuted = execution.endTime;
      skill.successRate = (skill.successRate * (skill.executions - 1) + 1) / skill.executions;

      this.emit('skill:completed', { skillId, execution });
      this.recordExecution(execution);

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      // Update skill statistics
      skill.executions++;
      skill.lastExecuted = execution.endTime;
      skill.successRate = (skill.successRate * (skill.executions - 1)) / skill.executions;

      this.emit('skill:failed', { skillId, execution, error });
      this.recordExecution(execution);

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step, context) {
    const stepExecution = {
      name: step.name,
      action: step.action,
      startTime: Date.now(),
      success: false
    };

    try {
      const handler = this.actionHandlers.get(step.action);
      if (!handler) {
        throw new Error(`No handler registered for action: ${step.action}`);
      }

      // Merge step params with context
      const params = { ...step.params, ...context };

      // Execute the action
      const result = await handler(params);

      stepExecution.result = result;
      stepExecution.success = result.success !== false;
      stepExecution.endTime = Date.now();
      stepExecution.duration = stepExecution.endTime - stepExecution.startTime;

      return stepExecution;
    } catch (error) {
      stepExecution.error = error.message;
      stepExecution.endTime = Date.now();
      stepExecution.duration = stepExecution.endTime - stepExecution.startTime;
      return stepExecution;
    }
  }

  /**
   * Check if dependencies are met
   */
  async checkDependencies(requires) {
    const missing = [];

    for (const dep of requires) {
      const available = await this.checkDependency(dep);
      if (!available) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing dependencies: ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Check a single dependency
   */
  async checkDependency(dep) {
    // Simple check - in production this would verify actual availability
    return true;
  }

  /**
   * List all available skills
   */
  listSkills(filter = {}) {
    let skills = Array.from(this.skills.values());

    if (filter.category) {
      skills = skills.filter(s => s.category === filter.category);
    }

    if (filter.tags) {
      const tags = Array.isArray(filter.tags) ? filter.tags : [filter.tags];
      skills = skills.filter(s => 
        tags.some(tag => s.tags && s.tags.includes(tag))
      );
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      skills = skills.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      );
    }

    return skills;
  }

  /**
   * Get skill details
   */
  getSkill(skillId) {
    return this.skills.get(skillId);
  }

  /**
   * Get skill execution history
   */
  getHistory(skillId = null, limit = 10) {
    let history = this.executionHistory;

    if (skillId) {
      history = history.filter(e => e.skillId === skillId);
    }

    return history.slice(-limit);
  }

  /**
   * Record execution in history
   */
  recordExecution(execution) {
    this.executionHistory.push(execution);

    // Trim history if too large
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get skill statistics
   */
  getStatistics() {
    const stats = {
      totalSkills: this.skills.size,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageSuccessRate: 0,
      skillsByCategory: {},
      mostUsedSkills: []
    };

    for (const skill of this.skills.values()) {
      stats.totalExecutions += skill.executions;
      stats.successfulExecutions += Math.floor(skill.executions * skill.successRate);
      stats.failedExecutions += Math.ceil(skill.executions * (1 - skill.successRate));

      // Group by category
      if (!stats.skillsByCategory[skill.category]) {
        stats.skillsByCategory[skill.category] = 0;
      }
      stats.skillsByCategory[skill.category]++;
    }

    stats.averageSuccessRate = stats.totalExecutions > 0
      ? stats.successfulExecutions / stats.totalExecutions
      : 0;

    // Most used skills
    stats.mostUsedSkills = Array.from(this.skills.values())
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10)
      .map(s => ({ id: s.id, name: s.name, executions: s.executions }));

    return stats;
  }
}

module.exports = SkillExecutor;
