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
    // Archive actions
    this.registerAction('archive_to_preproduction', async (params) => {
      console.log('Archiving to pre-production:', params);
      // Implementation would copy current state to archive
      return { success: true, archived: true };
    });

    // Build actions
    this.registerAction('clean_build_dirs', async (params) => {
      console.log('Cleaning build directories:', params.dirs);
      // Implementation would clean specified directories
      return { success: true, cleaned: params.dirs };
    });

    this.registerAction('npm_install', async (params) => {
      console.log('Running npm install:', params);
      // Implementation would run npm install
      return { success: true, installed: true };
    });

    // Pipeline actions
    this.registerAction('execute_pipeline', async (params) => {
      console.log('Executing pipeline:', params.pipeline);
      // Implementation would trigger pipeline execution
      return { success: true, pipeline: params.pipeline };
    });

    // Deployment actions
    this.registerAction('deploy_production', async (params) => {
      console.log('Deploying to production:', params);
      // Implementation would deploy to production
      return { success: true, deployed: true, verified: params.verify };
    });

    // Analysis actions
    this.registerAction('analyze_requirements', async (params) => {
      console.log('Analyzing requirements:', params);
      return { success: true, analyzed: true, depth: params.depth };
    });

    // Validation actions
    this.registerAction('validate_state', async (params) => {
      console.log('Validating state:', params);
      return { success: true, valid: true, integrity: params.check_integrity };
    });

    // Sync actions
    this.registerAction('update_registry', async (params) => {
      console.log('Updating registry:', params.file);
      return { success: true, updated: params.file };
    });

    this.registerAction('sync_docs', async (params) => {
      console.log('Syncing documentation:', params.targets);
      return { success: true, synced: params.targets };
    });

    // Git actions
    this.registerAction('git_commit', async (params) => {
      console.log('Git commit:', params.message);
      return { success: true, committed: true, message: params.message };
    });

    this.registerAction('git_fetch_all', async (params) => {
      console.log('Git fetch all remotes:', params);
      return { success: true, fetched: true };
    });

    // Research actions
    this.registerAction('search_implementations', async (params) => {
      console.log('Searching implementations:', params.sources);
      return { success: true, found: [], sources: params.sources };
    });

    this.registerAction('analyze_patterns', async (params) => {
      console.log('Analyzing patterns:', params);
      return { success: true, patterns: [], extracted: params.extract_best_practices };
    });

    // Monte Carlo actions
    this.registerAction('run_monte_carlo', async (params) => {
      console.log('Running Monte Carlo simulations:', params);
      return { success: true, iterations: params.iterations, optimal: {} };
    });

    // Intelligence actions
    this.registerAction('generate_concepts', async (params) => {
      console.log('Generating concepts:', params);
      return { success: true, concepts: [], count: params.count };
    });

    // Infrastructure actions
    this.registerAction('setup_domains', async (params) => {
      console.log('Setting up domains:', params.config);
      return { success: true, domains: [] };
    });

    this.registerAction('configure_dns', async (params) => {
      console.log('Configuring DNS:', params.provider);
      return { success: true, provider: params.provider };
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
