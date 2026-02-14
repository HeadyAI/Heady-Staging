#!/usr/bin/env node

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
// ║  FILE: hc-rx.js                                                    ║
// ║  LAYER: scripts                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🚀 HC --RX (Rapid Execute) - Intelligent Task Automation                      ║
 * ║  🎯 Learns from repeated tasks • Executes via HCAutoflow                        ║
 * ║  🧠 Pattern Recognition • Smart Fixing • Auto-Execution                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

const RX_CONFIG_PATH = path.join(__dirname, '..', '.heady', 'rx-patterns.json');
const RX_HISTORY_PATH = path.join(__dirname, '..', '.heady', 'rx-history.json');
const RX_LEARN_PATH = path.join(__dirname, '..', '.heady', 'rx-learned.json');

class HCRapidExecute {
  constructor() {
    this.patterns = this.loadPatterns();
    this.history = this.loadHistory();
    this.learned = this.loadLearned();
    this.setupDirectories();
  }

  setupDirectories() {
    const headyDir = path.join(__dirname, '..', '.heady');
    if (!fs.existsSync(headyDir)) {
      fs.mkdirSync(headyDir, { recursive: true });
    }
  }

  loadPatterns() {
    if (fs.existsSync(RX_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(RX_CONFIG_PATH, 'utf8'));
    }
    return this.getDefaultPatterns();
  }

  loadHistory() {
    if (fs.existsSync(RX_HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(RX_HISTORY_PATH, 'utf8'));
    }
    return [];
  }

  loadLearned() {
    if (fs.existsSync(RX_LEARN_PATH)) {
      return JSON.parse(fs.readFileSync(RX_LEARN_PATH, 'utf8'));
    }
    return {};
  }

  getDefaultPatterns() {
    return {
      "port-conflict": {
        triggers: ["port already in use", "address already in use", "EADDRINUSE"],
        solution: "kill-port",
        command: "pwsh ./scripts/kill-port.ps1",
        description: "Kill processes using specified ports"
      },
      "dependency-error": {
        triggers: ["module not found", "cannot find module", "ERR_MODULE_NOT_FOUND"],
        solution: "install-deps",
        command: "npm install",
        description: "Install missing dependencies"
      },
      "permission-error": {
        triggers: ["permission denied", "EACCES", "EPERM"],
        solution: "fix-permissions",
        command: "pwsh -Command \"Start-Process PowerShell -Verb RunAs -ArgumentList '-Command', 'npm install'\"",
        description: "Run with elevated permissions"
      },
      "build-error": {
        triggers: ["build failed", "compilation error", "syntax error"],
        solution: "clean-build",
        command: "npm run clean && npm run build",
        description: "Clean and rebuild project"
      },
      "test-failure": {
        triggers: ["test failed", "tests failing", "jest failed"],
        solution: "run-tests-fix",
        command: "npm run lint:fix && npm test",
        description: "Fix linting and run tests"
      },
      "git-conflict": {
        triggers: ["merge conflict", "CONFLICT", "git failed"],
        solution: "git-resolve",
        command: "git status && echo 'Resolve conflicts then run: git add . && git commit'",
        description: "Show git status for conflict resolution"
      },
      "docker-error": {
        triggers: ["docker error", "container failed", "docker-compose error"],
        solution: "docker-restart",
        command: "docker-compose down && docker-compose up --build",
        description: "Restart Docker services"
      },
      "database-error": {
        triggers: ["database error", "connection failed", "ECONNREFUSED"],
        solution: "db-reconnect",
        command: "npm run db:reset && npm run db:migrate",
        description: "Reset and migrate database"
      },
      "memory-error": {
        triggers: ["out of memory", "heap out of memory", "JavaScript heap out of memory"],
        solution: "increase-memory",
        command: "export NODE_OPTIONS='--max-old-space-size=4096' && npm start",
        description: "Increase Node.js memory limit"
      },
      "eslint-error": {
        triggers: ["eslint error", "linting error", "lint failed"],
        solution: "eslint-fix",
        command: "npm run lint:fix",
        description: "Auto-fix ESLint errors"
      }
    };
  }

  async execute(task, options = {}) {
    const timestamp = new Date().toISOString();
    const taskId = crypto.randomBytes(8).toString('hex');
    
    console.log(`🚀 HC --RX Executing: ${task}`);
    console.log(`📝 Task ID: ${taskId}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    
    // Record in history
    this.history.push({
      id: taskId,
      task,
      timestamp,
      status: 'executing'
    });
    
    try {
      // Check if task matches known patterns
      const pattern = this.findPattern(task);
      
      if (pattern) {
        console.log(`🎯 Pattern detected: ${pattern.solution}`);
        return await this.executePattern(pattern, task, options);
      }
      
      // Check if learned solution exists
      const learned = this.findLearnedSolution(task);
      if (learned) {
        console.log(`🧠 Using learned solution`);
        return await this.executeLearned(learned, task, options);
      }
      
      // Try to auto-detect and fix
      console.log(`🔍 Analyzing task for auto-fix...`);
      const autoFix = await this.autoDetectAndFix(task);
      if (autoFix) {
        return autoFix;
      }
      
      // Default: run through HCAutoflow
      console.log(`🔄 Running through HCAutoflow...`);
      return await this.runHCAutoflow(task, options);
      
    } catch (error) {
      console.error(`❌ Execution failed:`, error.message);
      
      // Update history
      const historyEntry = this.history.find(h => h.id === taskId);
      if (historyEntry) {
        historyEntry.status = 'failed';
        historyEntry.error = error.message;
      }
      
      // Learn from failure
      await this.learnFromFailure(task, error);
      
      throw error;
    } finally {
      this.saveHistory();
    }
  }

  findPattern(task) {
    const taskLower = task.toLowerCase();
    
    for (const [key, pattern] of Object.entries(this.patterns)) {
      for (const trigger of pattern.triggers) {
        if (taskLower.includes(trigger.toLowerCase())) {
          return { ...pattern, key };
        }
      }
    }
    
    return null;
  }

  findLearnedSolution(task) {
    const taskLower = task.toLowerCase();
    
    for (const [key, learned] of Object.entries(this.learned)) {
      if (taskLower.includes(key.toLowerCase())) {
        return learned;
      }
    }
    
    return null;
  }

  async executePattern(pattern, originalTask, options) {
    console.log(`🔧 Executing pattern: ${pattern.solution}`);
    console.log(`📝 Command: ${pattern.command}`);
    
    try {
      const result = await this.runCommand(pattern.command);
      
      // Learn from success
      this.learnSuccess(originalTask, pattern);
      
      return {
        success: true,
        pattern: pattern.key,
        solution: pattern.solution,
        command: pattern.command,
        result,
        description: pattern.description
      };
    } catch (error) {
      // Pattern failed, try alternative
      console.log(`⚠️ Pattern failed, trying alternative...`);
      return await this.tryAlternative(pattern, originalTask, options);
    }
  }

  async executeLearned(learned, originalTask, options) {
    console.log(`🧠 Executing learned solution`);
    
    try {
      const result = await this.runCommand(learned.command);
      
      // Reinforce learning
      learned.successCount = (learned.successCount || 0) + 1;
      learned.lastUsed = new Date().toISOString();
      this.saveLearned();
      
      return {
        success: true,
        learned: true,
        command: learned.command,
        result,
        confidence: learned.confidence || 0.8
      };
    } catch (error) {
      // Learned solution failed, reduce confidence
      learned.successCount = Math.max(0, (learned.successCount || 0) - 1);
      learned.confidence = Math.max(0.1, (learned.confidence || 0.8) - 0.2);
      this.saveLearned();
      
      throw error;
    }
  }

  async autoDetectAndFix(task) {
    const taskLower = task.toLowerCase();
    
    // Detect common issues
    if (taskLower.includes('port') && taskLower.includes('use')) {
      const portMatch = task.match(/port\s*(\d+)/i);
      if (portMatch) {
        const port = portMatch[1];
        console.log(`🔧 Auto-detected port conflict: ${port}`);
        return await this.runCommand(`pwsh ./scripts/kill-port.ps1 -Port ${port}`);
      }
    }
    
    if (taskLower.includes('module') && taskLower.includes('found')) {
      const moduleMatch = task.match(/module\s*['"]?([^'"\s]+)/i);
      if (moduleMatch) {
        const module = moduleMatch[1];
        console.log(`📦 Auto-detected missing module: ${module}`);
        return await this.runCommand(`npm install ${module}`);
      }
    }
    
    if (taskLower.includes('eslint') && taskLower.includes('error')) {
      console.log(`🔧 Auto-detected ESLint error`);
      return await this.runCommand('npm run lint:fix');
    }
    
    return null;
  }

  async tryAlternative(pattern, originalTask, options) {
    const alternatives = this.getAlternatives(pattern.key);
    
    for (const alt of alternatives) {
      console.log(`🔄 Trying alternative: ${alt.description}`);
      
      try {
        const result = await this.runCommand(alt.command);
        
        // Learn the alternative works better
        this.learnAlternative(originalTask, alt);
        
        return {
          success: true,
          alternative: true,
          command: alt.command,
          result,
          description: alt.description
        };
      } catch (error) {
        console.log(`⚠️ Alternative failed: ${alt.description}`);
        continue;
      }
    }
    
    throw new Error(`All solutions failed for pattern: ${pattern.key}`);
  }

  getAlternatives(patternKey) {
    const alternatives = {
      "port-conflict": [
        { command: "netstat -ano | findstr :3000", description: "Check port usage" },
        { command: "taskkill /F /IM node.exe", description: "Kill all Node processes" }
      ],
      "dependency-error": [
        { command: "npm ci", description: "Clean install from package-lock.json" },
        { command: "rm -rf node_modules && npm install", description: "Fresh install" }
      ],
      "build-error": [
        { command: "npm run clean", description: "Clean build artifacts only" },
        { command: "npm run build --verbose", description: "Verbose build for debugging" }
      ]
    };
    
    return alternatives[patternKey] || [];
  }

  async runHCAutoflow(task, options) {
    console.log(`🔄 Running HCAutoflow for: ${task}`);
    
    // Check if HCAutoflow script exists
    const autoflowScript = path.join(__dirname, 'hcautoflow.ps1');
    
    if (fs.existsSync(autoflowScript)) {
      const command = `pwsh -File "${autoflowScript}" -Task "${task}"`;
      return await this.runCommand(command);
    }
    
    // Fallback to pipeline
    const pipelineScript = path.join(__dirname, '..', 'src', 'hc_pipeline.js');
    if (fs.existsSync(pipelineScript)) {
      const command = `node -e "const {pipeline}=require('${pipelineScript}');pipeline.run().then(s=>console.log(JSON.stringify(s,null,2))).catch(e=>console.error(e.message))"`;
      return await this.runCommand(command);
    }
    
    throw new Error('HCAutoflow script not found');
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`💻 Executing: ${command}`);
      
      const child = spawn(command, [], {
        shell: true,
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ exitCode: code, success: true });
        } else {
          reject(new Error(`Command failed with exit code: ${code}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  learnSuccess(task, pattern) {
    const key = pattern.key;
    
    if (!this.learned[key]) {
      this.learned[key] = {
        command: pattern.command,
        description: pattern.description,
        successCount: 0,
        failureCount: 0,
        confidence: 0.5,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
    }
    
    this.learned[key].successCount++;
    this.learned[key].lastUsed = new Date().toISOString();
    this.learned[key].confidence = Math.min(1.0, this.learned[key].confidence + 0.1);
    
    this.saveLearned();
  }

  learnAlternative(task, alternative) {
    const key = `alt_${Date.now()}`;
    
    this.learned[key] = {
      command: alternative.command,
      description: alternative.description,
      successCount: 1,
      failureCount: 0,
      confidence: 0.7,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      originalTask: task
    };
    
    this.saveLearned();
  }

  async learnFromFailure(task, error) {
    // Analyze failure and create new learning
    const errorLower = error.message.toLowerCase();
    
    // Check if this is a new pattern
    let newPattern = null;
    
    if (errorLower.includes('port') && errorLower.includes('use')) {
      newPattern = {
        triggers: [error.message],
        solution: "custom-port-fix",
        command: "pwsh ./scripts/kill-port.ps1",
        description: "Custom port conflict fix"
      };
    } else if (errorLower.includes('permission')) {
      newPattern = {
        triggers: [error.message],
        solution: "custom-permission-fix",
        command: "pwsh -Command \"Start-Process PowerShell -Verb RunAs\"",
        description: "Custom permission fix"
      };
    }
    
    if (newPattern) {
      const key = `learned_${Date.now()}`;
      this.patterns[key] = newPattern;
      this.savePatterns();
      
      console.log(`🧕 Learned new pattern: ${key}`);
    }
  }

  savePatterns() {
    fs.writeFileSync(RX_CONFIG_PATH, JSON.stringify(this.patterns, null, 2));
  }

  saveHistory() {
    // Keep only last 100 entries
    const trimmed = this.history.slice(-100);
    fs.writeFileSync(RX_HISTORY_PATH, JSON.stringify(trimmed, null, 2));
  }

  saveLearned() {
    fs.writeFileSync(RX_LEARN_PATH, JSON.stringify(this.learned, null, 2));
  }

  showHistory() {
    console.log('\n📜 HC --RX Execution History');
    console.log('━'.repeat(50));
    
    this.history.slice(-10).forEach(entry => {
      const status = entry.status === 'completed' ? '✅' : 
                    entry.status === 'failed' ? '❌' : '⏳';
      console.log(`${status} ${entry.timestamp} - ${entry.task}`);
      if (entry.error) {
        console.log(`   Error: ${entry.error}`);
      }
    });
  }

  showPatterns() {
    console.log('\n🎯 Known Patterns');
    console.log('━'.repeat(50));
    
    Object.entries(this.patterns).forEach(([key, pattern]) => {
      console.log(`🔧 ${key}: ${pattern.description}`);
      console.log(`   Triggers: ${pattern.triggers.join(', ')}`);
      console.log(`   Command: ${pattern.command}`);
      console.log('');
    });
  }

  showLearned() {
    console.log('\n🧠 Learned Solutions');
    console.log('━'.repeat(50));
    
    Object.entries(this.learned).forEach(([key, learned]) => {
      const confidence = (learned.confidence * 100).toFixed(1);
      console.log(`🧠 ${key} (${confidence}% confidence)`);
      console.log(`   Description: ${learned.description}`);
      console.log(`   Command: ${learned.command}`);
      console.log(`   Success Rate: ${learned.successCount}/${learned.successCount + (learned.failureCount || 0)}`);
      console.log('');
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const rx = new HCRapidExecute();
  
  if (args.length === 0) {
    console.log(`
🚀 HC --RX (Rapid Execute) - Intelligent Task Automation

Usage:
  hc --rx "error message or task description"
  hc --rx --history
  hc --rx --patterns
  hc --rx --learned

Examples:
  hc --rx "port 3000 is already in use"
  hc --rx "eslint found too many errors"
  hc --rx "module 'lodash' not found"
  hc --rx "build failed with syntax error"

The system will:
1. Detect patterns in your error/task
2. Apply known fixes automatically
3. Learn from successes and failures
4. Fall back to HCAutoflow for unknown issues
`);
    process.exit(0);
  }
  
  const task = args.join(' ');
  
  if (task === '--history') {
    rx.showHistory();
    return;
  }
  
  if (task === '--patterns') {
    rx.showPatterns();
    return;
  }
  
  if (task === '--learned') {
    rx.showLearned();
    return;
  }
  
  try {
    const result = await rx.execute(task);
    console.log('\n✅ Task completed successfully!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Task failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = HCRapidExecute;
