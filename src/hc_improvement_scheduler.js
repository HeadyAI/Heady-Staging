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
// ║  FILE: src/hc_improvement_scheduler.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class ImprovementScheduler extends EventEmitter {
  constructor({
    interval = 900000, // 15 minutes
    pipeline,
    patternEngine,
    selfCritiqueEngine,
    mcPlanScheduler
  }) {
    super();
    this.interval = interval;
    this.pipeline = pipeline;
    this.patternEngine = patternEngine;
    this.selfCritiqueEngine = selfCritiqueEngine;
    this.mcPlanScheduler = mcPlanScheduler;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    
    // Initial run
    this.runCycle();
    
    // Set up interval
    this.timer = setInterval(() => {
      this.runCycle();
    }, this.interval);
    
    this.emit('started');
  }

  stop() {
    if (!this.running) return;
    clearInterval(this.timer);
    this.running = false;
    this.emit('stopped');
  }

  async runCycle() {
    if (!this.pipeline || !this.patternEngine || !this.selfCritiqueEngine) {
      logger.warn('[ImprovementScheduler] Dependencies not available, skipping cycle');
      return;
    }
    
    try {
      this.emit('cycle_start');
      
      // 1. Check for improvement candidates from pattern engine
      const improvements = await this.getImprovementCandidates();
      
      // 2. Prioritize using Monte Carlo if available
      let prioritized = improvements;
      if (this.mcPlanScheduler && typeof this.mcPlanScheduler.prioritizeImprovements === 'function') {
        prioritized = this.mcPlanScheduler.prioritizeImprovements(improvements);
      } else {
        prioritized = improvements.sort((a, b) => (a.priority || 99) - (b.priority || 99));
      }
      
      // 3. Execute top improvements via pipeline
      for (const improvement of prioritized.slice(0, 3)) {
        await this.executeImprovement(improvement);
      }
      
      this.emit('cycle_complete', { improvements: prioritized.length });
    } catch (error) {
      logger.warn(`[ImprovementScheduler] Cycle error: ${error.message}`);
      this.emit('cycle_error', error);
    }
  }

  async getImprovementCandidates() {
    // Get patterns needing improvement
    const stagnantPatterns = this.patternEngine.getPatternsByState('stagnant');
    const degradingPatterns = this.patternEngine.getPatternsByState('degrading');
    
    // Get self-critique findings
    const critiques = this.selfCritiqueEngine.getRecentCritiques();
    
    // Combine into improvement candidates
    return [
      ...stagnantPatterns.map(p => ({
        type: 'pattern_stagnation',
        target: p.id,
        priority: p.severity === 'critical' ? 1 : 2,
        details: p
      })),
      ...degradingPatterns.map(p => ({
        type: 'pattern_degradation',
        target: p.id,
        priority: 1, // Always high priority
        details: p
      })),
      ...critiques.map(c => ({
        type: 'self_critique',
        target: c.context,
        priority: c.severity === 'high' ? 1 : 2,
        details: c
      }))
    ];
  }

  async executeImprovement(improvement) {
    // Execute via pipeline if available
    if (this.pipeline) {
      return this.pipeline.run({
        type: 'improvement_task',
        improvement,
        lane: 'improvement'
      });
    }
    
    // Fallback direct execution
    switch (improvement.type) {
      case 'pattern_stagnation':
      case 'pattern_degradation':
        return this.handlePatternImprovement(improvement);
      case 'self_critique':
        return this.handleCritiqueImprovement(improvement);
      default:
        throw new Error(`Unknown improvement type: ${improvement.type}`);
    }
  }

  async handlePatternImprovement(improvement) {
    this.emit('improvement_start', improvement);
    
    // Autonomous Application Logic:
    // This translates recognized patterns (e.g. from 'stagnant' or 'degrading' states)
    // into direct codebase optimizations. If pattern details contain exact patch
    // directives generated by HeadyBrain, apply them immediately to vector space or fs.
    
    let applied = false;
    const actions = [];

    // Parse actionable insights safely
    if (improvement.details && Array.isArray(improvement.details.suggestedImprovements)) {
       for (const suggestion of improvement.details.suggestedImprovements) {
          // Detect structured code-replacement commands from engine
          if (typeof suggestion === 'string') {
             try {
                let cmdTarget, targetParam, newParam;

                if (suggestion.startsWith('[')) {
                   // Robust JSON array format: ["FILE_REPLACE:src/config.js", "OLD", "NEW"]
                   const parsed = JSON.parse(suggestion);
                   if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0].includes('FILE_REPLACE:')) {
                      cmdTarget = parsed[0];
                      targetParam = parsed[1];
                      newParam = parsed[2];
                   } else {
                      continue;
                   }
                } else if (suggestion.includes('FILE_REPLACE:')) {
                   // Legacy format: FILE_REPLACE:src/config.js|OLD|NEW
                   console.warn('[ImprovementScheduler] Deprecation Warning: Received legacy pipe-delimited suggestion format.');
                   const parts = suggestion.split('|');
                   if (parts.length >= 3) {
                      cmdTarget = parts[0];
                      targetParam = parts[1];
                      newParam = parts.slice(2).join('|'); // Rejoin in case NEW contained a pipe
                   } else {
                      continue;
                   }
                } else {
                   continue;
                }

                const [cmd, targetPath] = cmdTarget.split(':');
                const rootDir = path.resolve(__dirname, '..');
                const fullPath = path.resolve(rootDir, targetPath.trim());
                if ((fullPath.startsWith(rootDir + path.sep) || fullPath === rootDir) && fs.existsSync(fullPath)) {
                   let content = fs.readFileSync(fullPath, 'utf8');
                   const oldText = targetParam.replace(/\\n/g, '\n');
                   const newText = newParam.replace(/\\n/g, '\n');

                      if (content.includes(oldText)) {
                         content = content.split(oldText).join(newText);
                         fs.writeFileSync(fullPath, content, 'utf8');
                         actions.push(`Replaced text in ${targetPath}`);
                         applied = true;
                      }
                   }
             } catch(err) {
                console.error(`[ImprovementScheduler] Error applying pattern file replacement: ${err.message}`);
             }
          }
       }
    }

    if (this.selfCritiqueEngine && applied) {
       this.selfCritiqueEngine.recordImprovement({
         description: `Auto-applied pattern fix for ${improvement.target}`,
         type: 'code_fix',
         status: 'applied',
         patternId: improvement.target,
         measuredImpact: actions.join(', ')
       });
    } else if (this.selfCritiqueEngine) {
       this.selfCritiqueEngine.recordImprovement({
         description: `Pattern requires review: ${improvement.target}`,
         type: 'manual_review',
         status: 'proposed',
         patternId: improvement.target
       });
    }

    this.emit('improvement_complete', improvement);
    return { success: true, applied, actions };
  }

  async handleCritiqueImprovement(improvement) {
    this.emit('improvement_start', improvement);
    
    let applied = false;
    const actions = [];

    // Directly action critique weaknesses and suggestions
    if (improvement.details && Array.isArray(improvement.details.suggestedImprovements)) {
       for (const suggestion of improvement.details.suggestedImprovements) {
          if (typeof suggestion === 'string') {
             try {
                let cmdTarget, targetParam, newParam;

                if (suggestion.startsWith('[')) {
                   // Robust JSON array format: ["CONFIG_UPDATE:configs/tuning.yaml", "KEY", "VALUE"]
                   const parsed = JSON.parse(suggestion);
                   if (Array.isArray(parsed) && parsed.length >= 3 && parsed[0].includes('CONFIG_UPDATE:')) {
                      cmdTarget = parsed[0];
                      targetParam = parsed[1];
                      newParam = parsed[2];
                   } else {
                      continue;
                   }
                } else if (suggestion.includes('CONFIG_UPDATE:')) {
                   // Legacy format: CONFIG_UPDATE:configs/tuning.yaml|KEY|VALUE
                   console.warn('[ImprovementScheduler] Deprecation Warning: Received legacy pipe-delimited suggestion format.');
                   const parts = suggestion.split('|');
                   if (parts.length >= 3) {
                      cmdTarget = parts[0];
                      targetParam = parts[1];
                      newParam = parts.slice(2).join('|');
                   } else {
                      continue;
                   }
                } else {
                   continue;
                }

                const [cmd, targetPath] = cmdTarget.split(':');
                const rootDir = path.resolve(__dirname, '..');
                const fullPath = path.resolve(rootDir, targetPath.trim());
                if ((fullPath.startsWith(rootDir + path.sep) || fullPath === rootDir) && fs.existsSync(fullPath)) {
                   let content = fs.readFileSync(fullPath, 'utf8');
                   const key = targetParam.trim();
                   const value = newParam.trim();

                      // Safe type coercion
                      let parsedValue = value;
                      try {
                         parsedValue = JSON.parse(value);
                      } catch (err) {
                         // Keep as string if it's not a valid JSON primitive (like numbers, booleans, or null)
                      }

                      // Escape regex characters in key to prevent ReDoS / injection
                      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                      if (fullPath.endsWith('.json')) {
                         const regex = new RegExp(`("${escapedKey}"\\s*:\\s*)([^,}\\n\\r]+)(,?)`, 'g');
                         if (regex.test(content)) {
                            content = content.replace(regex, (match, p1, p2, p3) => {
                               const formattedVal = typeof parsedValue === "string" ? `"${parsedValue}"` : parsedValue;
                               return p1 + formattedVal + p3;
                            });
                            fs.writeFileSync(fullPath, content, 'utf8');
                            actions.push(`Updated JSON ${key} to ${value} in ${targetPath}`);
                            applied = true;
                         }
                      } else if (fullPath.endsWith('.yaml') || fullPath.endsWith('.yml')) {
                         const regex = new RegExp(`^(\\s*${escapedKey}\\s*:\\s*)([^#\\n]+)(.*)$`, 'm');
                         if (regex.test(content)) {
                            content = content.replace(regex, (match, p1, p2, p3) => p1 + value + p3);
                            fs.writeFileSync(fullPath, content, 'utf8');
                            actions.push(`Updated YAML ${key} to ${value} in ${targetPath}`);
                            applied = true;
                         }
                      }
                   }
             } catch(err) {
                console.error(`[ImprovementScheduler] Error applying critique config update: ${err.message}`);
             }
          }
       }
    }

    if (this.selfCritiqueEngine && applied) {
       this.selfCritiqueEngine.recordImprovement({
         description: `Auto-applied critique fix for ${improvement.target}`,
         type: 'config_change',
         status: 'applied',
         critiqueId: improvement.details.id,
         measuredImpact: actions.join(', ')
       });
    }

    this.emit('improvement_complete', improvement);
    return { success: true, applied, actions };
  }
}

function registerImprovementRoutes(app, scheduler) {
  app.get('/api/improvement/status', (req, res) => {
    res.json({
      running: scheduler.running,
      interval: scheduler.interval,
      lastCycle: scheduler.lastCycleTs,
      ts: new Date().toISOString()
    });
  });
  
  app.post('/api/improvement/start', (req, res) => {
    scheduler.start();
    res.json({ success: true, running: scheduler.running });
  });
  
  app.post('/api/improvement/stop', (req, res) => {
    scheduler.stop();
    res.json({ success: true, running: scheduler.running });
  });
  
  app.post('/api/improvement/run-cycle', async (req, res) => {
    try {
      await scheduler.runCycle();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  ImprovementScheduler,
  registerImprovementRoutes
};
