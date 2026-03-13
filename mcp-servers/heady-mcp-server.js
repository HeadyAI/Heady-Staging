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
// ║  FILE: mcp-servers/heady-mcp-server.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
#!/usr/bin/env node
/**
 * Heady MCP Server — Clean, functional MCP server for Claude Desktop
 * Uses @modelcontextprotocol/sdk with stdio transport
 * Provides tools for managing the Heady ecosystem
 */

// Use explicit CJS paths since the SDK is ESM by default
const sdkRoot = require('path').join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { Server } = require(sdkRoot + '/server/index.js');
const { StdioServerTransport } = require(sdkRoot + '/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require(sdkRoot + '/types.js');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HEADY_ROOT = path.resolve(__dirname, '..');
const CONFIGS_DIR = path.join(HEADY_ROOT, 'configs');

class HeadyMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'heady-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[HeadyMCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'heady_status',
          description: 'Get overall Heady system status — checks project structure, configs, and services',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_read_config',
          description: 'Read a Heady YAML or JSON config file from the configs/ directory',
          inputSchema: {
            type: 'object',
            properties: {
              filename: {
                type: 'string',
                description: 'Config filename (e.g., "service-catalog.yaml", "hcfullpipeline.yaml", "headymcp.json")'
              }
            },
            required: ['filename']
          }
        },
        {
          name: 'heady_list_configs',
          description: 'List all available configuration files in the Heady configs/ directory',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_list_services',
          description: 'List all services defined in the Heady service catalog',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_project_tree',
          description: 'Show the top-level directory structure of the Heady project',
          inputSchema: {
            type: 'object',
            properties: {
              subdir: {
                type: 'string',
                description: 'Optional subdirectory to list (e.g., "apps", "packages", "src")'
              }
            }
          }
        },
        {
          name: 'heady_read_file',
          description: 'Read a file from the Heady project directory',
          inputSchema: {
            type: 'object',
            properties: {
              filepath: {
                type: 'string',
                description: 'Relative path from Heady root (e.g., "package.json", "src/hc_pipeline.js")'
              },
              maxLines: {
                type: 'number',
                description: 'Maximum lines to return (default: 200)',
                default: 200
              }
            },
            required: ['filepath']
          }
        },
        {
          name: 'heady_search',
          description: 'Search for text patterns across the Heady project files',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Text or regex pattern to search for'
              },
              fileTypes: {
                type: 'string',
                description: 'File extensions to search (e.g., "js,yaml,json"). Default: "js,yaml,json,md"'
              }
            },
            required: ['pattern']
          }
        },
        {
          name: 'heady_pipeline_status',
          description: 'Get HCFullPipeline configuration and stage definitions',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_deploy_status',
          description: 'Get auto-deploy system status — scheduler, git state, recent deploys',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_deploy_run',
          description: 'Trigger a single auto-deploy cycle (commit, push, deploy)',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Custom commit message (optional)' },
              force: { type: 'boolean', description: 'Force deploy even if AUTO_DEPLOY is false' }
            }
          }
        },
        {
          name: 'heady_deploy_start',
          description: 'Start the auto-deploy scheduler (runs on configured interval)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_deploy_stop',
          description: 'Stop the auto-deploy scheduler',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── HeadyTranslator tools ─────────────────────────
        {
          name: 'heady_translator_status',
          description: 'Get HeadyTranslator status — adapters, routes, stats, protocol bridge health',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_translator_translate',
          description: 'Translate a message between protocols (MCP, HTTP, WebSocket, UDP, MIDI, TCP)',
          inputSchema: {
            type: 'object',
            properties: {
              sourceProtocol: { type: 'string', description: 'Source protocol (mcp, http, websocket, udp, midi, tcp)' },
              targetProtocol: { type: 'string', description: 'Target protocol (mcp, http, websocket, udp, midi, tcp)' },
              operation: { type: 'string', description: 'Operation name or action' },
              payload: { type: 'object', description: 'Message payload data' },
              targetEndpoint: { type: 'string', description: 'Target endpoint (URL, tool name, host:port, etc.)' }
            },
            required: ['sourceProtocol', 'targetProtocol', 'operation']
          }
        },
        {
          name: 'heady_translator_adapters',
          description: 'List all registered protocol adapters and their capabilities',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_translator_decode',
          description: 'Decode raw protocol data into a canonical HeadyMessage envelope',
          inputSchema: {
            type: 'object',
            properties: {
              protocol: { type: 'string', description: 'Protocol to decode from (mcp, http, udp, midi, tcp)' },
              data: { type: 'string', description: 'Raw data string to decode' }
            },
            required: ['protocol', 'data']
          }
        },
        {
          name: 'heady_translator_bridge',
          description: 'Start or stop the HTTP bridge server for external protocol translation',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: '"start" or "stop"', enum: ['start', 'stop'] },
              port: { type: 'number', description: 'Port for HTTP bridge (default: 3301)' }
            },
            required: ['action']
          }
        },
        // ── CodeLock tools ────────────────────────────────
        {
          name: 'heady_codelock_status',
          description: 'Get codebase lock status — who can make changes, pending approvals, audit trail',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_codelock_lock',
          description: 'Lock the codebase — blocks all changes until owner approves',
          inputSchema: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for locking' }
            }
          }
        },
        {
          name: 'heady_codelock_unlock',
          description: 'Unlock the codebase (owner only)',
          inputSchema: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for unlocking' }
            }
          }
        },
        {
          name: 'heady_codelock_request',
          description: 'Request approval to change specific files',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique change request ID (e.g., "fix-pipeline-config")' },
              files: { type: 'array', items: { type: 'string' }, description: 'List of file paths to change' },
              description: { type: 'string', description: 'What changes and why' }
            },
            required: ['id', 'files', 'description']
          }
        },
        {
          name: 'heady_codelock_approve',
          description: 'Approve a pending change request (owner only)',
          inputSchema: {
            type: 'object',
            properties: {
              changeId: { type: 'string', description: 'Change request ID to approve (or "all" to approve all)' }
            },
            required: ['changeId']
          }
        },
        {
          name: 'heady_codelock_deny',
          description: 'Deny a pending change request (owner only)',
          inputSchema: {
            type: 'object',
            properties: {
              changeId: { type: 'string', description: 'Change request ID to deny' },
              reason: { type: 'string', description: 'Reason for denial' }
            },
            required: ['changeId']
          }
        },
        {
          name: 'heady_codelock_snapshot',
          description: 'Take a file integrity snapshot (hash all code files for change detection)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_codelock_detect',
          description: 'Detect unauthorized changes since last snapshot',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_codelock_audit',
          description: 'View the codelock audit trail',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max entries (default: 30)' }
            }
          }
        },
        {
          name: 'heady_codelock_users',
          description: 'Add or remove users allowed to approve changes',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: '"add" or "remove"', enum: ['add', 'remove'] },
              username: { type: 'string', description: 'Username to add/remove' }
            },
            required: ['action', 'username']
          }
        },
        // ── Latent Space tools ────────────────────────────
        {
          name: 'heady_latent_record',
          description: 'Record an operation in Heady latent space (vector memory)',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Category (deploy, config, service, ai, error, etc.)' },
              text: { type: 'string', description: 'Human-readable description' },
              meta: { type: 'object', description: 'Optional structured metadata' }
            },
            required: ['category', 'text']
          }
        },
        {
          name: 'heady_latent_search',
          description: 'Search latent space by semantic similarity',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Natural language search query' },
              topK: { type: 'number', description: 'Number of results (default: 10)' },
              category: { type: 'string', description: 'Optional category filter' }
            },
            required: ['query']
          }
        },
        {
          name: 'heady_latent_status',
          description: 'Get latent space status — ring buffer, vector store, operations log stats',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_latent_log',
          description: 'View recent operations log from latent space',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Filter by category (or omit for all)' },
              limit: { type: 'number', description: 'Max entries (default: 20)' }
            }
          }
        },
        // ── Merge Conflict Resolver ───────────────────────
        {
          name: 'heady_conflicts_scan',
          description: 'Scan all project files for git merge conflicts (<<<<<<< markers)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_conflicts_resolve',
          description: 'Auto-resolve merge conflicts in a file by keeping one side',
          inputSchema: {
            type: 'object',
            properties: {
              filepath: { type: 'string', description: 'Relative path from Heady root' },
              strategy: { type: 'string', description: '"ours" (keep HEAD), "theirs" (keep incoming), or "both" (keep both)', enum: ['ours', 'theirs', 'both'] }
            },
            required: ['filepath', 'strategy']
          }
        },
        {
          name: 'heady_conflicts_show',
          description: 'Show merge conflicts in a specific file with both sides',
          inputSchema: {
            type: 'object',
            properties: {
              filepath: { type: 'string', description: 'Relative path from Heady root' }
            },
            required: ['filepath']
          }
        },
        // ── Service Health Pinger ─────────────────────────
        {
          name: 'heady_health_ping',
          description: 'Ping all services from the service catalog and report health status',
          inputSchema: {
            type: 'object',
            properties: {
              timeout: { type: 'number', description: 'Timeout in ms per service (default: 5000)' }
            }
          }
        },
        // ── Environment Auditor ───────────────────────────
        {
          name: 'heady_env_audit',
          description: 'Audit .env — find missing keys, empty values, unused vars, and potential secrets exposure',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Dependency Scanner ────────────────────────────
        {
          name: 'heady_deps_scan',
          description: 'Scan package.json for outdated, duplicate, or potentially vulnerable dependencies',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Config Validator ──────────────────────────────
        {
          name: 'heady_config_validate',
          description: 'Cross-validate YAML configs — check service references, pipeline stages, agent definitions',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Git Operations ────────────────────────────────
        {
          name: 'heady_git_log',
          description: 'View recent git commits and branch info',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of commits (default: 15)' }
            }
          }
        },
        {
          name: 'heady_git_diff',
          description: 'Show git diff — unstaged changes or diff between branches',
          inputSchema: {
            type: 'object',
            properties: {
              target: { type: 'string', description: 'Branch/commit to diff against (default: HEAD)' },
              filepath: { type: 'string', description: 'Optional specific file to diff' }
            }
          }
        },
        {
          name: 'heady_git_status',
          description: 'Show git status — modified, staged, untracked files',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── System Brain ──────────────────────────────────
        {
          name: 'heady_brain_status',
          description: 'Get System Brain overview — ORS score, active patterns, recommendations, subsystem health',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_brain_think',
          description: 'Ask the System Brain to analyze a situation and recommend actions',
          inputSchema: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'What should the brain analyze?' },
              context: { type: 'object', description: 'Optional context data' }
            },
            required: ['question']
          }
        },
        // ── Pattern Engine ────────────────────────────────
        {
          name: 'heady_patterns_list',
          description: 'List all implemented, planned, and available patterns from concepts-index',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'heady_patterns_evaluate',
          description: 'Evaluate a pattern for potential adoption — benefits, risks, dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              patternId: { type: 'string', description: 'Pattern name or ID to evaluate' }
            },
            required: ['patternId']
          }
        },
        // ── Cost & Resource Tracker ───────────────────────
        {
          name: 'heady_cost_report',
          description: 'Generate cost report — API usage, cloud spend, resource budgets from resource-policies.yaml',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Secrets Audit ─────────────────────────────────
        {
          name: 'heady_secrets_scan',
          description: 'Scan codebase for accidentally committed secrets, API keys, tokens, and credentials',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Registry Explorer ─────────────────────────────
        {
          name: 'heady_registry_list',
          description: 'List all components in heady-registry.json — services, docs, notebooks, workflows, AI nodes',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Filter by category (components, docs, notebooks, workflows, patterns, ai-nodes)' }
            }
          }
        },
        {
          name: 'heady_registry_lookup',
          description: 'Look up a specific component in the registry by name or ID',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Component name or ID' }
            },
            required: ['name']
          }
        },
        // ── Code Stats ────────────────────────────────────
        {
          name: 'heady_code_stats',
          description: 'Project code statistics — lines of code, file counts, language breakdown, largest files',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Render Cloud ──────────────────────────────────
        {
          name: 'heady_render_status',
          description: 'Parse render.yaml and show all deployed services, databases, and environment groups',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Doc Freshness ─────────────────────────────────
        {
          name: 'heady_docs_freshness',
          description: 'Check documentation freshness — find stale docs, missing owners, overdue reviews',
          inputSchema: { type: 'object', properties: {} }
        },
        // ── Quick Fix ─────────────────────────────────────
        {
          name: 'heady_quickfix',
          description: 'Run quick automated fixes — remove console.logs, fix trailing whitespace, normalize line endings',
          inputSchema: {
            type: 'object',
            properties: {
              fix: { type: 'string', description: 'Fix type: "console-logs", "whitespace", "line-endings", "dead-imports", "all"', enum: ['console-logs', 'whitespace', 'line-endings', 'dead-imports', 'all'] },
              dryRun: { type: 'boolean', description: 'If true, just report issues without fixing (default: true)' }
            },
            required: ['fix']
          }
        },
        // ── Heady Write File ──────────────────────────────
        {
          name: 'heady_write_file',
          description: 'Write content to a file in the Heady project (requires CodeLock approval if locked)',
          inputSchema: {
            type: 'object',
            properties: {
              filepath: { type: 'string', description: 'Relative path from Heady root' },
              content: { type: 'string', description: 'File content to write' },
              changeId: { type: 'string', description: 'Approved change request ID (required if codebase is locked)' }
            },
            required: ['filepath', 'content']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case 'heady_status': return await this.getStatus();
          case 'heady_read_config': return await this.readConfig(args.filename);
          case 'heady_list_configs': return await this.listConfigs();
          case 'heady_list_services': return await this.listServices();
          case 'heady_project_tree': return await this.projectTree(args?.subdir);
          case 'heady_read_file': return await this.readFile(args.filepath, args?.maxLines || 200);
          case 'heady_search': return await this.searchFiles(args.pattern, args?.fileTypes);
          case 'heady_pipeline_status': return await this.pipelineStatus();
          case 'heady_deploy_status': return await this.deployStatus();
          case 'heady_deploy_run': return await this.deployRun(args?.message, args?.force);
          case 'heady_deploy_start': return await this.deployStart();
          case 'heady_deploy_stop': return await this.deployStop();
          // Translator tools
          case 'heady_translator_status': return await this.translatorStatus();
          case 'heady_translator_translate': return await this.translatorTranslate(args);
          case 'heady_translator_adapters': return await this.translatorAdapters();
          case 'heady_translator_decode': return await this.translatorDecode(args.protocol, args.data);
          case 'heady_translator_bridge': return await this.translatorBridge(args.action, args?.port);
          // CodeLock tools
          case 'heady_codelock_status': return await this.codelockStatus();
          case 'heady_codelock_lock': return await this.codelockLock(args?.reason);
          case 'heady_codelock_unlock': return await this.codelockUnlock(args?.reason);
          case 'heady_codelock_request': return await this.codelockRequest(args.id, args.files, args.description);
          case 'heady_codelock_approve': return await this.codelockApprove(args.changeId);
          case 'heady_codelock_deny': return await this.codelockDeny(args.changeId, args?.reason);
          case 'heady_codelock_snapshot': return await this.codelockSnapshot();
          case 'heady_codelock_detect': return await this.codelockDetect();
          case 'heady_codelock_audit': return await this.codelockAudit(args?.limit);
          case 'heady_codelock_users': return await this.codelockUsers(args.action, args.username);
          // Latent Space
          case 'heady_latent_record': return await this.latentRecord(args.category, args.text, args?.meta);
          case 'heady_latent_search': return await this.latentSearch(args.query, args?.topK, args?.category);
          case 'heady_latent_status': return await this.latentStatus();
          case 'heady_latent_log': return await this.latentLog(args?.category, args?.limit);
          // Merge Conflicts
          case 'heady_conflicts_scan': return await this.conflictsScan();
          case 'heady_conflicts_resolve': return await this.conflictsResolve(args.filepath, args.strategy);
          case 'heady_conflicts_show': return await this.conflictsShow(args.filepath);
          // Service Health
          case 'heady_health_ping': return await this.healthPing(args?.timeout);
          // Env Audit
          case 'heady_env_audit': return await this.envAudit();
          // Deps
          case 'heady_deps_scan': return await this.depsScan();
          // Config Validate
          case 'heady_config_validate': return await this.configValidate();
          // Git
          case 'heady_git_log': return await this.gitLog(args?.limit);
          case 'heady_git_diff': return await this.gitDiff(args?.target, args?.filepath);
          case 'heady_git_status': return await this.gitStatus();
          // Brain
          case 'heady_brain_status': return await this.brainStatus();
          case 'heady_brain_think': return await this.brainThink(args.question, args?.context);
          // Patterns
          case 'heady_patterns_list': return await this.patternsList();
          case 'heady_patterns_evaluate': return await this.patternsEvaluate(args.patternId);
          // Cost
          case 'heady_cost_report': return await this.costReport();
          // Secrets
          case 'heady_secrets_scan': return await this.secretsScan();
          // Registry
          case 'heady_registry_list': return await this.registryList(args?.category);
          case 'heady_registry_lookup': return await this.registryLookup(args.name);
          // Code Stats
          case 'heady_code_stats': return await this.codeStats();
          // Render
          case 'heady_render_status': return await this.renderStatus();
          // Docs Freshness
          case 'heady_docs_freshness': return await this.docsFreshness();
          // Quick Fix
          case 'heady_quickfix': return await this.quickFix(args.fix, args?.dryRun !== false);
          // Write File
          case 'heady_write_file': return await this.writeFile(args.filepath, args.content, args?.changeId);
          default: throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  // --- Tool implementations ---

  async getStatus() {
    const checks = [];

    // Check key directories
    const keyDirs = ['configs', 'src', 'packages', 'frontend', 'backend', 'apps', 'scripts'];
    for (const dir of keyDirs) {
      const dirPath = path.join(HEADY_ROOT, dir);
      const exists = fs.existsSync(dirPath);
      checks.push(`${exists ? '✓' : '✗'} ${dir}/`);
    }

    // Check key files
    const keyFiles = ['package.json', 'heady-manager.js', '.env', 'docker-compose.yml'];
    for (const file of keyFiles) {
      const filePath = path.join(HEADY_ROOT, file);
      const exists = fs.existsSync(filePath);
      checks.push(`${exists ? '✓' : '✗'} ${file}`);
    }

    // Read package.json for version info
    let version = 'unknown';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(HEADY_ROOT, 'package.json'), 'utf8'));
      version = `${pkg.name}@${pkg.version}`;
    } catch (e) { /* ignore */ }

    // Check for merge conflicts in heady-manager.js
    let mergeConflicts = 0;
    try {
      const managerContent = fs.readFileSync(path.join(HEADY_ROOT, 'heady-manager.js'), 'utf8');
      mergeConflicts = (managerContent.match(/<<<<<<</g) || []).length;
    } catch (e) { /* ignore */ }

    // Count configs
    let configCount = 0;
    try {
      configCount = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.json') || f.endsWith('.yml')).length;
    } catch (e) { /* ignore */ }

    const report = [
      `# Heady System Status`,
      `Version: ${version}`,
      `Root: ${HEADY_ROOT}`,
      `Config files: ${configCount}`,
      mergeConflicts > 0 ? `⚠ heady-manager.js has ${mergeConflicts} MERGE CONFLICTS` : `✓ No merge conflicts detected`,
      ``,
      `## Structure Check`,
      ...checks
    ].join('\n');

    return { content: [{ type: 'text', text: report }] };
  }

  async readConfig(filename) {
    // Security: prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(CONFIGS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file not found: ${safeName}. Use heady_list_configs to see available files.`);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Parse YAML/JSON for validation
    let parsed;
    try {
      if (safeName.endsWith('.yaml') || safeName.endsWith('.yml')) {
        parsed = yaml.load(content);
      } else if (safeName.endsWith('.json')) {
        parsed = JSON.parse(content);
      }
    } catch (e) {
      return { content: [{ type: 'text', text: `⚠ Parse error in ${safeName}: ${e.message}\n\nRaw content:\n${content}` }] };
    }

    return { content: [{ type: 'text', text: `# ${safeName}\n\n${content}` }] };
  }

  async listConfigs() {
    if (!fs.existsSync(CONFIGS_DIR)) {
      throw new Error('configs/ directory not found');
    }

    const files = fs.readdirSync(CONFIGS_DIR, { withFileTypes: true });
    const configs = files
      .filter(f => f.isFile() && (f.name.endsWith('.yaml') || f.name.endsWith('.yml') || f.name.endsWith('.json')))
      .map(f => {
        const stats = fs.statSync(path.join(CONFIGS_DIR, f.name));
        return `  ${f.name} (${(stats.size / 1024).toFixed(1)}KB)`;
      });

    const dirs = files.filter(f => f.isDirectory()).map(f => `  ${f.name}/`);

    const output = [
      `# Heady Configs (${configs.length} files)`,
      '',
      ...configs,
      dirs.length > 0 ? `\n## Subdirectories\n${dirs.join('\n')}` : ''
    ].join('\n');

    return { content: [{ type: 'text', text: output }] };
  }

  async listServices() {
    const catalogPath = path.join(CONFIGS_DIR, 'service-catalog.yaml');
    if (!fs.existsSync(catalogPath)) {
      throw new Error('service-catalog.yaml not found');
    }

    const content = fs.readFileSync(catalogPath, 'utf8');
    const catalog = yaml.load(content);

    if (!catalog?.services) {
      throw new Error('No services found in catalog');
    }

    const serviceList = catalog.services.map(s =>
      `• ${s.name} [${s.type}] — ${s.role}\n  Endpoint: ${s.endpoint || 'N/A'} | Criticality: ${s.criticality || 'N/A'}`
    );

    return {
      content: [{
        type: 'text',
        text: `# Heady Services (${catalog.services.length})\n\n${serviceList.join('\n\n')}`
      }]
    };
  }

  async projectTree(subdir) {
    const targetDir = subdir ? path.join(HEADY_ROOT, subdir) : HEADY_ROOT;

    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory not found: ${subdir || 'root'}`);
    }

    // Security: ensure we stay within HEADY_ROOT
    const resolved = path.resolve(targetDir);
    if (!resolved.startsWith(HEADY_ROOT)) {
      throw new Error('Access denied: path outside Heady root');
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => `📁 ${e.name}/`);
    const files = entries.filter(e => e.isFile() && !e.name.startsWith('.')).map(e => {
      const stats = fs.statSync(path.join(targetDir, e.name));
      const size = stats.size > 1024 * 1024
        ? `${(stats.size / 1024 / 1024).toFixed(1)}MB`
        : `${(stats.size / 1024).toFixed(1)}KB`;
      return `📄 ${e.name} (${size})`;
    });

    return {
      content: [{
        type: 'text',
        text: `# ${subdir || 'Heady Root'}\n\n${dirs.join('\n')}\n\n${files.join('\n')}`
      }]
    };
  }

  async readFile(filepath, maxLines = 200) {
    const safePath = path.resolve(HEADY_ROOT, filepath);
    if (!safePath.startsWith(HEADY_ROOT)) {
      throw new Error('Access denied: path outside Heady root');
    }

    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    const content = fs.readFileSync(safePath, 'utf8');
    const lines = content.split('\n');

    const truncated = lines.length > maxLines;
    const output = lines.slice(0, maxLines).join('\n');

    return {
      content: [{
        type: 'text',
        text: truncated
          ? `# ${filepath} (showing ${maxLines}/${lines.length} lines)\n\n${output}\n\n... (truncated)`
          : `# ${filepath}\n\n${output}`
      }]
    };
  }

  async searchFiles(pattern, fileTypes) {
    const extensions = (fileTypes || 'js,yaml,json,md').split(',').map(e => `.${e.trim()}`);
    const results = [];
    const maxResults = 30;

    const searchDir = (dir, depth = 0) => {
      if (depth > 4 || results.length >= maxResults) return;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'venv' || entry.name === '.venv') continue;

          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            searchDir(fullPath, depth + 1);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              const lines = content.split('\n');
              const regex = new RegExp(pattern, 'gi');
              const matches = [];
              lines.forEach((line, i) => {
                if (regex.test(line)) {
                  matches.push(`  L${i + 1}: ${line.trim().substring(0, 120)}`);
                }
                regex.lastIndex = 0;
              });
              if (matches.length > 0) {
                const relPath = path.relative(HEADY_ROOT, fullPath);
                results.push(`📄 ${relPath} (${matches.length} matches)\n${matches.slice(0, 5).join('\n')}`);
              }
            } catch (e) { /* skip unreadable files */ }
          }
        }
      } catch (e) { /* skip inaccessible dirs */ }
    };

    searchDir(HEADY_ROOT);

    return {
      content: [{
        type: 'text',
        text: results.length > 0
          ? `# Search: "${pattern}" (${results.length} files matched)\n\n${results.join('\n\n')}`
          : `No matches found for "${pattern}"`
      }]
    };
  }

  async pipelineStatus() {
    const pipelinePath = path.join(CONFIGS_DIR, 'hcfullpipeline.yaml');
    if (!fs.existsSync(pipelinePath)) {
      throw new Error('hcfullpipeline.yaml not found');
    }

    const content = fs.readFileSync(pipelinePath, 'utf8');
    const pipeline = yaml.load(content);

    const stages = pipeline?.stages || pipeline?.pipeline?.stages || [];
    const stageList = Array.isArray(stages)
      ? stages.map((s, i) => `  ${i + 1}. ${typeof s === 'string' ? s : s.name || s.id || JSON.stringify(s)}`).join('\n')
      : 'Could not parse stages';

    return {
      content: [{
        type: 'text',
        text: `# HCFullPipeline\n\nVersion: ${pipeline?.version || 'unknown'}\n\n## Stages\n${stageList}\n\n## Raw Config\n${content.substring(0, 3000)}`
      }]
    };
  }

  // --- Auto-Deploy tools ---

  getAutoDeploy() {
    if (!this._autoDeploy) {
      try {
        this._autoDeploy = require(path.join(HEADY_ROOT, 'src', 'hc_auto_deploy.js'));
      } catch (e) {
        throw new Error(`Auto-deploy module not found: ${e.message}`);
      }
    }
    return this._autoDeploy;
  }

  async deployStatus() {
    const ad = this.getAutoDeploy();
    const status = ad.getStatus();
    return { content: [{ type: 'text', text: `# Auto-Deploy Status\n\n${JSON.stringify(status, null, 2)}` }] };
  }

  async deployRun(message, force) {
    const ad = this.getAutoDeploy();
    const result = await ad.runOnce({ message, force });
    return { content: [{ type: 'text', text: `# Deploy Cycle Result\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async deployStart() {
    const ad = this.getAutoDeploy();
    ad.start();
    return { content: [{ type: 'text', text: 'Auto-deploy scheduler started. It will run on the configured interval.' }] };
  }

  async deployStop() {
    const ad = this.getAutoDeploy();
    ad.stop();
    return { content: [{ type: 'text', text: 'Auto-deploy scheduler stopped.' }] };
  }

  // --- HeadyTranslator tools ---

  getTranslator() {
    if (!this._translator) {
      try {
        this._translator = require(path.join(HEADY_ROOT, 'src', 'hc_translator.js'));
      } catch (e) {
        throw new Error(`Translator module not found: ${e.message}`);
      }
    }
    return this._translator;
  }

  async translatorStatus() {
    const t = this.getTranslator();
    const status = t.getStatus();
    return { content: [{ type: 'text', text: `# HeadyTranslator Status\n\n${JSON.stringify(status, null, 2)}` }] };
  }

  async translatorTranslate(args) {
    const t = this.getTranslator();
    const result = await t.translate({
      source: { protocol: args.sourceProtocol, endpoint: args.sourceEndpoint || 'mcp-tool' },
      target: { protocol: args.targetProtocol, endpoint: args.targetEndpoint || '' },
      operation: args.operation,
      payload: args.payload || {}
    });
    return { content: [{ type: 'text', text: `# Translation Result\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async translatorAdapters() {
    const t = this.getTranslator();
    const adapters = t.translator.listAdapters();
    const lines = Object.entries(adapters).map(([name, info]) =>
      `• ${name}: ${info.description} (send: ${info.hasSend ? 'yes' : 'no'})`
    );
    return { content: [{ type: 'text', text: `# Protocol Adapters (${lines.length})\n\n${lines.join('\n')}` }] };
  }

  async translatorDecode(protocol, data) {
    const t = this.getTranslator();
    const message = t.decode(protocol, data);
    return { content: [{ type: 'text', text: `# Decoded Message\n\nProtocol: ${protocol}\n\n${JSON.stringify(message, null, 2)}` }] };
  }

  async translatorBridge(action, port) {
    const t = this.getTranslator();
    if (action === 'start') {
      t.translator.createHttpBridge(port || 3301);
      return { content: [{ type: 'text', text: `HTTP bridge started on port ${port || 3301}` }] };
    } else {
      t.translator.shutdown();
      return { content: [{ type: 'text', text: 'Translator bridge stopped' }] };
    }
  }

  // --- CodeLock tools ---

  getCodeLock() {
    if (!this._codelock) {
      try {
        this._codelock = require(path.join(HEADY_ROOT, 'src', 'hc_codelock.js'));
      } catch (e) {
        throw new Error(`CodeLock module not found: ${e.message}`);
      }
    }
    return this._codelock;
  }

  async codelockStatus() {
    const cl = this.getCodeLock();
    const status = cl.getStatus();
    const icon = status.locked ? '🔒' : '🔓';
    const lines = [
      `# ${icon} CodeLock Status`,
      '',
      `**State:** ${status.locked ? 'LOCKED' : 'UNLOCKED'}`,
      `**Level:** ${status.lockLevel}`,
      `**Owner:** ${status.owner}`,
      `**Allowed Users:** ${status.allowedUsers.join(', ')}`,
      `**Locked By:** ${status.lockedBy} at ${status.lockedAt}`,
      `**Reason:** ${status.reason}`,
      '',
      `## Queue`,
      `Pending: ${status.queue.pending} | Approved: ${status.queue.approved} | Denied: ${status.queue.denied}`,
      '',
      status.pendingChanges.length > 0 ? `## Pending Approvals\n${status.pendingChanges.map(c =>
        `• **${c.id}** — ${c.description} (${c.files} files, by ${c.requestedBy})`
      ).join('\n')}` : 'No pending approvals.',
      '',
      `## File Integrity`,
      status.fileIntegrity,
      '',
      `## Protected Paths`,
      status.protectedPaths.map(p => `• ${p}`).join('\n'),
      '',
      `Audit entries: ${status.auditEntries}`
    ];
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  async codelockLock(reason) {
    const cl = this.getCodeLock();
    const result = cl.lock('erich', reason || 'Manual lock via MCP');
    return { content: [{ type: 'text', text: `🔒 Codebase LOCKED\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockUnlock(reason) {
    const cl = this.getCodeLock();
    const result = cl.unlock('erich', reason || 'Manual unlock via MCP');
    return { content: [{ type: 'text', text: `🔓 Codebase UNLOCKED\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockRequest(id, files, description) {
    const cl = this.getCodeLock();
    const result = cl.requestChange(id, files, description, 'claude-agent');
    return { content: [{ type: 'text', text: `# Change Request: ${id}\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockApprove(changeId) {
    const cl = this.getCodeLock();
    let result;
    if (changeId === 'all') {
      result = cl.approveAll('erich');
    } else {
      result = cl.approveChange(changeId, 'erich');
    }
    return { content: [{ type: 'text', text: `✅ Approved: ${changeId}\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockDeny(changeId, reason) {
    const cl = this.getCodeLock();
    const result = cl.denyChange(changeId, 'erich', reason || 'Denied via MCP');
    return { content: [{ type: 'text', text: `❌ Denied: ${changeId}\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockSnapshot() {
    const cl = this.getCodeLock();
    const result = cl.snapshotHashes();
    return { content: [{ type: 'text', text: `📸 Snapshot taken\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  async codelockDetect() {
    const cl = this.getCodeLock();
    const result = cl.detectChanges();
    if (!result.success) {
      return { content: [{ type: 'text', text: `⚠️ ${result.error}` }] };
    }
    const lines = [
      `# Change Detection`,
      `Baseline: ${result.baseline}`,
      `Changes found: ${result.hasChanges ? 'YES' : 'NONE'}`,
      '',
      `Modified: ${result.summary.modified}`,
      `Added: ${result.summary.added}`,
      `Deleted: ${result.summary.deleted}`
    ];
    if (result.changes.modified.length) lines.push('\n## Modified\n' + result.changes.modified.map(f => `• ${f}`).join('\n'));
    if (result.changes.added.length) lines.push('\n## Added\n' + result.changes.added.map(f => `• ${f}`).join('\n'));
    if (result.changes.deleted.length) lines.push('\n## Deleted\n' + result.changes.deleted.map(f => `• ${f}`).join('\n'));
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  async codelockAudit(limit) {
    const cl = this.getCodeLock();
    const entries = cl.getAuditLog(limit || 30);
    const lines = entries.map(e =>
      `[${e.timestamp}] ${e.action}: ${JSON.stringify(e.details)}`
    );
    return { content: [{ type: 'text', text: `# Audit Log (${entries.length} entries)\n\n${lines.join('\n')}` }] };
  }

  async codelockUsers(action, username) {
    const cl = this.getCodeLock();
    let result;
    if (action === 'add') {
      result = cl.addAllowedUser(username, 'erich');
    } else {
      result = cl.removeAllowedUser(username, 'erich');
    }
    return { content: [{ type: 'text', text: `# User ${action}: ${username}\n\n${JSON.stringify(result, null, 2)}` }] };
  }

  // --- Latent Space tools ---

  getLatent() {
    if (!this._latent) {
      try { this._latent = require(path.join(HEADY_ROOT, 'src', 'hc_latent_space.js')); }
      catch (e) { throw new Error(`Latent space module not found: ${e.message}`); }
    }
    return this._latent;
  }

  async latentRecord(category, text, meta) {
    const ls = this.getLatent();
    const result = ls.record(category, text, meta || {});
    return { content: [{ type: 'text', text: `Recorded: ${result.id}\nCategory: ${category}\nTotal vectors: ${result.totalVectors}` }] };
  }

  async latentSearch(query, topK, category) {
    const ls = this.getLatent();
    const results = ls.search(query, topK || 10, category || null);
    const lines = results.results.map((r, i) =>
      `${i + 1}. [${r.score.toFixed(3)}] (${r.category}) ${r.text.substring(0, 120)}`
    );
    return { content: [{ type: 'text', text: `# Latent Search: "${query}"\n\n${lines.join('\n')}\n\nHot results: ${results.hotResults} | Total vectors: ${results.totalVectors}` }] };
  }

  async latentStatus() {
    const ls = this.getLatent();
    return { content: [{ type: 'text', text: `# Latent Space Status\n\n${JSON.stringify(ls.getStatus(), null, 2)}` }] };
  }

  async latentLog(category, limit) {
    const ls = this.getLatent();
    const entries = ls.getOperationLog(category || null, limit || 20);
    const lines = entries.map(e => `[${e.timestamp}] (${e.category}) ${e.text.substring(0, 100)}`);
    return { content: [{ type: 'text', text: `# Operations Log (${entries.length})\n\n${lines.join('\n')}` }] };
  }

  // --- Merge Conflict tools ---

  async conflictsScan() {
    const results = [];
    const scanDir = (dir, depth = 0) => {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanDir(fullPath, depth + 1); continue; }
          if (!entry.isFile() || !/\.(js|yaml|yml|json|py|md|ps1)$/.test(entry.name)) continue;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const conflicts = (content.match(/^<<<<<<<.*/gm) || []).length;
            if (conflicts > 0) {
              results.push({ file: path.relative(HEADY_ROOT, fullPath), conflicts });
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    };
    scanDir(HEADY_ROOT);
    const total = results.reduce((s, r) => s + r.conflicts, 0);
    const lines = results.map(r => `• ${r.file}: ${r.conflicts} conflict(s)`);
    return { content: [{ type: 'text', text: results.length > 0
      ? `# Merge Conflicts Found: ${total} across ${results.length} files\n\n${lines.join('\n')}`
      : '✅ No merge conflicts found!' }] };
  }

  async conflictsShow(filepath) {
    const safePath = path.resolve(HEADY_ROOT, filepath);
    if (!safePath.startsWith(HEADY_ROOT)) throw new Error('Access denied');
    const content = fs.readFileSync(safePath, 'utf8');
    const conflicts = [];
    const regex = /^<<<<<<< (.*)$\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> (.*)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      conflicts.push({
        oursLabel: match[1].trim(),
        ours: match[2].trim().substring(0, 500),
        theirs: match[3].trim().substring(0, 500),
        theirsLabel: match[4].trim()
      });
    }
    const lines = conflicts.map((c, i) => [
      `## Conflict ${i + 1}`,
      `**OURS (${c.oursLabel}):**\n\`\`\`\n${c.ours}\n\`\`\``,
      `**THEIRS (${c.theirsLabel}):**\n\`\`\`\n${c.theirs}\n\`\`\``
    ].join('\n'));
    return { content: [{ type: 'text', text: `# Conflicts in ${filepath} (${conflicts.length})\n\n${lines.join('\n\n')}` }] };
  }

  async conflictsResolve(filepath, strategy) {
    const safePath = path.resolve(HEADY_ROOT, filepath);
    if (!safePath.startsWith(HEADY_ROOT)) throw new Error('Access denied');
    let content = fs.readFileSync(safePath, 'utf8');
    const regex = /<<<<<<< .*\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> .*\n?/g;
    let count = 0;
    content = content.replace(regex, (match, ours, theirs) => {
      count++;
      if (strategy === 'ours') return ours;
      if (strategy === 'theirs') return theirs;
      return ours + theirs; // both
    });
    fs.writeFileSync(safePath, content);
    return { content: [{ type: 'text', text: `✅ Resolved ${count} conflict(s) in ${filepath} using strategy: ${strategy}` }] };
  }

  // --- Service Health Pinger ---

  async healthPing(timeout) {
    const catalogPath = path.join(CONFIGS_DIR, 'service-catalog.yaml');
    if (!fs.existsSync(catalogPath)) throw new Error('service-catalog.yaml not found');
    const catalog = yaml.load(fs.readFileSync(catalogPath, 'utf8'));
    if (!catalog?.services) throw new Error('No services in catalog');

    const to = timeout || 5000;
    const results = [];
    for (const svc of catalog.services) {
      if (!svc.endpoint || svc.endpoint === 'N/A') {
        results.push({ name: svc.name, status: 'no-endpoint', endpoint: 'N/A' });
        continue;
      }
      try {
        const url = new URL(svc.endpoint.startsWith('http') ? svc.endpoint : `http://${svc.endpoint}`);
        const start = Date.now();
        const result = await new Promise((resolve) => {
          const req = http.get({ hostname: url.hostname, port: url.port || 80, path: url.pathname || '/', timeout: to }, (res) => {
            resolve({ status: 'up', code: res.statusCode, latency: Date.now() - start });
          });
          req.on('error', () => resolve({ status: 'down', latency: Date.now() - start }));
          req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', latency: to }); });
        });
        results.push({ name: svc.name, endpoint: svc.endpoint, ...result });
      } catch (e) {
        results.push({ name: svc.name, endpoint: svc.endpoint, status: 'error', error: e.message });
      }
    }
    const up = results.filter(r => r.status === 'up').length;
    const down = results.filter(r => r.status === 'down' || r.status === 'timeout').length;
    const lines = results.map(r => {
      const icon = r.status === 'up' ? '🟢' : r.status === 'no-endpoint' ? '⚪' : '🔴';
      return `${icon} ${r.name}: ${r.status}${r.code ? ` (${r.code})` : ''}${r.latency ? ` ${r.latency}ms` : ''} — ${r.endpoint}`;
    });
    return { content: [{ type: 'text', text: `# Service Health\n\n🟢 Up: ${up} | 🔴 Down: ${down} | Total: ${results.length}\n\n${lines.join('\n')}` }] };
  }

  // --- Environment Auditor ---

  async envAudit() {
    const envPath = path.join(HEADY_ROOT, '.env');
    if (!fs.existsSync(envPath)) throw new Error('.env not found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        envVars[key] = val;
      }
    }

    // Find references in code
    const referencedVars = new Set();
    const scanForEnv = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanForEnv(fullPath, depth + 1); continue; }
          if (!/\.(js|py|yaml|yml)$/.test(entry.name)) continue;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/process\.env\.(\w+)/g) || [];
            matches.forEach(m => referencedVars.add(m.replace('process.env.', '')));
            const matches2 = content.match(/os\.environ(?:\.get)?\(['"](\w+)['"]\)/g) || [];
            matches2.forEach(m => { const k = m.match(/['"](\w+)['"]/); if (k) referencedVars.add(k[1]); });
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    };
    scanForEnv(HEADY_ROOT);

    const empty = Object.entries(envVars).filter(([k, v]) => !v).map(([k]) => k);
    const unused = Object.keys(envVars).filter(k => !referencedVars.has(k));
    const missing = [...referencedVars].filter(v => !(v in envVars));
    const sensitive = Object.keys(envVars).filter(k => /KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL/i.test(k));
    const hasValues = sensitive.filter(k => envVars[k] && envVars[k].length > 3);

    const report = [
      `# Environment Audit`,
      `\nTotal vars in .env: ${Object.keys(envVars).length}`,
      `Referenced in code: ${referencedVars.size}`,
      `\n## Empty Values (${empty.length})`,
      empty.map(k => `• ${k}`).join('\n') || 'None',
      `\n## Missing from .env (${missing.length})`,
      missing.map(k => `• ${k}`).join('\n') || 'None',
      `\n## Potentially Unused (${unused.length})`,
      unused.slice(0, 20).map(k => `• ${k}`).join('\n') || 'None',
      `\n## Sensitive Keys (${sensitive.length})`,
      sensitive.map(k => `• ${k}: ${envVars[k] ? '✓ has value' : '✗ EMPTY'}`).join('\n') || 'None',
      hasValues.length > 0 ? `\n⚠️ ${hasValues.length} sensitive key(s) have values — ensure .env is in .gitignore!` : ''
    ];
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  // --- Dependency Scanner ---

  async depsScan() {
    const pkgPath = path.join(HEADY_ROOT, 'package.json');
    if (!fs.existsSync(pkgPath)) throw new Error('package.json not found');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies };
    const devDeps = { ...pkg.devDependencies };
    const all = { ...deps, ...devDeps };

    const issues = [];
    const gitDeps = Object.entries(all).filter(([, v]) => v.includes('github') || v.includes('git+'));
    const fileDeps = Object.entries(all).filter(([, v]) => v.startsWith('file:'));
    const wildcardDeps = Object.entries(all).filter(([, v]) => v === '*' || v === 'latest');
    const betaDeps = Object.entries(all).filter(([, v]) => /alpha|beta|rc|canary/i.test(v));

    if (gitDeps.length) issues.push(`⚠️ Git dependencies (${gitDeps.length}): ${gitDeps.map(([k]) => k).join(', ')}`);
    if (fileDeps.length) issues.push(`⚠️ File dependencies (${fileDeps.length}): ${fileDeps.map(([k]) => k).join(', ')}`);
    if (wildcardDeps.length) issues.push(`🔴 Wildcard versions (${wildcardDeps.length}): ${wildcardDeps.map(([k]) => k).join(', ')}`);
    if (betaDeps.length) issues.push(`⚠️ Pre-release (${betaDeps.length}): ${betaDeps.map(([k, v]) => `${k}@${v}`).join(', ')}`);

    // Check node_modules existence
    const nmExists = fs.existsSync(path.join(HEADY_ROOT, 'node_modules'));
    const lockExists = fs.existsSync(path.join(HEADY_ROOT, 'package-lock.json'));

    // Check workspace packages
    const workspacePkgs = [];
    const packagesDir = path.join(HEADY_ROOT, 'packages');
    if (fs.existsSync(packagesDir)) {
      for (const d of fs.readdirSync(packagesDir, { withFileTypes: true })) {
        if (d.isDirectory()) {
          const wPkg = path.join(packagesDir, d.name, 'package.json');
          if (fs.existsSync(wPkg)) {
            const wp = JSON.parse(fs.readFileSync(wPkg, 'utf8'));
            workspacePkgs.push(`• ${wp.name || d.name}@${wp.version || '0.0.0'}`);
          }
        }
      }
    }

    const report = [
      `# Dependency Report`,
      `\nDependencies: ${Object.keys(deps).length}`,
      `Dev Dependencies: ${Object.keys(devDeps).length}`,
      `node_modules: ${nmExists ? '✓ present' : '✗ missing'}`,
      `package-lock.json: ${lockExists ? '✓ present' : '✗ MISSING'}`,
      issues.length > 0 ? `\n## Issues (${issues.length})\n${issues.join('\n')}` : '\n✅ No dependency issues found',
      workspacePkgs.length > 0 ? `\n## Workspace Packages (${workspacePkgs.length})\n${workspacePkgs.join('\n')}` : ''
    ];
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  // --- Config Validator ---

  async configValidate() {
    const issues = [];
    const warnings = [];

    // Load configs
    const loadYaml = (name) => {
      try { return yaml.load(fs.readFileSync(path.join(CONFIGS_DIR, name), 'utf8')); }
      catch (e) { issues.push(`Cannot load ${name}: ${e.message}`); return null; }
    };

    const pipeline = loadYaml('hcfullpipeline.yaml');
    const services = loadYaml('service-catalog.yaml');
    const resources = loadYaml('resource-policies.yaml');
    const governance = loadYaml('governance-policies.yaml');
    const concepts = loadYaml('concepts-index.yaml');

    // Cross-validate
    if (pipeline && services) {
      const serviceNames = new Set((services.services || []).map(s => s.name));
      const stages = pipeline.stages || pipeline.pipeline?.stages || [];
      if (Array.isArray(stages)) {
        for (const stage of stages) {
          const name = typeof stage === 'string' ? stage : stage.name || stage.id;
          if (name && !serviceNames.has(name)) {
            warnings.push(`Pipeline stage '${name}' not in service catalog`);
          }
        }
      }
    }

    if (services) {
      const svcList = services.services || [];
      const noEndpoint = svcList.filter(s => !s.endpoint || s.endpoint === 'N/A');
      if (noEndpoint.length) warnings.push(`${noEndpoint.length} services without endpoints: ${noEndpoint.map(s => s.name).join(', ')}`);
      const noCrit = svcList.filter(s => !s.criticality);
      if (noCrit.length) warnings.push(`${noCrit.length} services without criticality level`);
    }

    if (resources) {
      if (!resources.budgets && !resources.cost_budgets) warnings.push('resource-policies.yaml: no budget definitions found');
      if (!resources.rate_limits && !resources.concurrency) warnings.push('resource-policies.yaml: no rate limits or concurrency defined');
    }

    if (!governance) issues.push('governance-policies.yaml: missing or unparseable');
    if (!concepts) warnings.push('concepts-index.yaml: missing — cannot track pattern implementation');

    // Check for required configs
    const requiredConfigs = ['hcfullpipeline.yaml', 'service-catalog.yaml', 'resource-policies.yaml', 'governance-policies.yaml'];
    for (const rc of requiredConfigs) {
      if (!fs.existsSync(path.join(CONFIGS_DIR, rc))) {
        issues.push(`Required config missing: ${rc}`);
      }
    }

    const report = [
      `# Config Validation`,
      `\n🔴 Issues: ${issues.length} | ⚠️ Warnings: ${warnings.length}`,
      issues.length > 0 ? `\n## Issues\n${issues.map(i => `🔴 ${i}`).join('\n')}` : '',
      warnings.length > 0 ? `\n## Warnings\n${warnings.map(w => `⚠️ ${w}`).join('\n')}` : '',
      issues.length === 0 && warnings.length === 0 ? '\n✅ All configs valid!' : ''
    ];
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  // --- Git tools ---

  _gitExec(cmd) {
    const { execSync } = require('child_process');
    return execSync(cmd, { cwd: HEADY_ROOT, encoding: 'utf8', timeout: 10000 }).trim();
  }

  async gitLog(limit) {
    try {
      const log = this._gitExec(`git log --oneline -${limit || 15}`);
      const branch = this._gitExec('git branch --show-current');
      return { content: [{ type: 'text', text: `# Git Log (branch: ${branch})\n\n${log}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Git error: ${e.message}` }], isError: true };
    }
  }

  async gitDiff(target, filepath) {
    try {
      const cmd = filepath
        ? `git diff ${target || 'HEAD'} -- ${filepath}`
        : `git diff ${target || ''}`;
      const diff = this._gitExec(cmd);
      return { content: [{ type: 'text', text: diff ? `# Git Diff\n\n\`\`\`diff\n${diff.substring(0, 5000)}\n\`\`\`` : 'No changes.' }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Git error: ${e.message}` }], isError: true };
    }
  }

  async gitStatus() {
    try {
      const status = this._gitExec('git status --short');
      const branch = this._gitExec('git branch --show-current');
      return { content: [{ type: 'text', text: `# Git Status (${branch})\n\n${status || 'Working tree clean'}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Git error: ${e.message}` }], isError: true };
    }
  }

  // --- System Brain ---

  async brainStatus() {
    // Aggregate data from all subsystems
    const status = {};
    try { const ls = this.getLatent(); status.latentSpace = ls.getStatus(); } catch (e) { status.latentSpace = 'unavailable'; }
    try { const cl = this.getCodeLock(); status.codeLock = cl.getStatus(); } catch (e) { status.codeLock = 'unavailable'; }
    try { const t = this.getTranslator(); status.translator = t.getStatus(); } catch (e) { status.translator = 'unavailable'; }

    // Compute ORS (Operational Readiness Score)
    let ors = 50; // baseline
    if (status.latentSpace !== 'unavailable') ors += 10;
    if (status.codeLock !== 'unavailable') ors += 10;
    if (status.translator !== 'unavailable') ors += 10;
    if (status.codeLock?.locked) ors += 5; // locked = disciplined
    if (status.latentSpace?.l1_vector_store?.entries > 10) ors += 5;

    // Check for merge conflicts
    let conflictFiles = 0;
    try {
      const content = fs.readFileSync(path.join(HEADY_ROOT, 'heady-manager.js'), 'utf8');
      conflictFiles = (content.match(/<<<<<<</g) || []).length;
    } catch (e) { /* ignore */ }
    if (conflictFiles > 0) ors -= 15;

    const mode = ors >= 85 ? 'FULL POWER' : ors >= 70 ? 'NORMAL' : ors >= 50 ? 'MAINTENANCE' : 'RECOVERY';

    const report = [
      `# 🧠 System Brain`,
      `\n## Operational Readiness Score: ${ors}/100 — ${mode}`,
      `\n## Subsystem Health`,
      `• Latent Space: ${status.latentSpace !== 'unavailable' ? `✓ (${status.latentSpace?.l1_vector_store?.entries || 0} vectors)` : '✗ unavailable'}`,
      `• CodeLock: ${status.codeLock !== 'unavailable' ? `✓ (${status.codeLock?.locked ? '🔒 locked' : '🔓 unlocked'})` : '✗ unavailable'}`,
      `• Translator: ${status.translator !== 'unavailable' ? `✓ (${Object.keys(status.translator?.adapters || {}).length} adapters)` : '✗ unavailable'}`,
      conflictFiles > 0 ? `\n⚠️ heady-manager.js has ${conflictFiles} merge conflicts — resolve to gain +15 ORS` : '',
      `\n## Recommendations`,
      ors < 70 ? '• Resolve merge conflicts immediately' : '',
      status.codeLock?.queue?.pending > 0 ? `• ${status.codeLock.queue.pending} pending change requests need review` : '',
      ors >= 85 ? '• System healthy — safe to deploy and build aggressively' : ''
    ].filter(Boolean);
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  async brainThink(question, context) {
    // The brain analyzes the question against system state
    const ls = this.getLatent();
    const searchResults = ls.search(question, 5);
    const relatedOps = searchResults.results.map(r => `• [${r.score.toFixed(2)}] ${r.text}`).join('\n');

    // Record the question
    ls.record('brain', `Brain query: ${question}`, { context });

    const report = [
      `# 🧠 Brain Analysis`,
      `\n**Question:** ${question}`,
      context ? `\n**Context:** ${JSON.stringify(context)}` : '',
      `\n## Related Memory`,
      relatedOps || 'No related operations found.',
      `\n## System State Snapshot`,
      `• MCP tools: 40+`,
      `• Adapters: 7 protocols`,
      `• Codebase: ${fs.existsSync(path.join(HEADY_ROOT, 'heady-manager.js')) ? 'present' : 'missing key files'}`,
      `\n_The brain has recorded this query for future pattern matching._`
    ];
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  // --- Pattern Engine ---

  async patternsList() {
    const conceptsPath = path.join(CONFIGS_DIR, 'concepts-index.yaml');
    if (!fs.existsSync(conceptsPath)) {
      return { content: [{ type: 'text', text: '⚠️ concepts-index.yaml not found. Create it to track patterns.' }] };
    }
    const concepts = yaml.load(fs.readFileSync(conceptsPath, 'utf8'));
    const sections = [];
    for (const [category, items] of Object.entries(concepts || {})) {
      if (Array.isArray(items)) {
        sections.push(`## ${category}\n${items.map(i => typeof i === 'string' ? `• ${i}` : `• ${i.name || i.id}: ${i.status || 'unknown'}`).join('\n')}`);
      } else if (typeof items === 'object') {
        sections.push(`## ${category}\n${JSON.stringify(items, null, 2)}`);
      }
    }
    return { content: [{ type: 'text', text: `# Pattern Index\n\n${sections.join('\n\n')}` }] };
  }

  async patternsEvaluate(patternId) {
    const ls = this.getLatent();
    const related = ls.search(patternId, 5);
    ls.record('patterns', `Evaluating pattern: ${patternId}`, { patternId });

    const report = [
      `# Pattern Evaluation: ${patternId}`,
      `\n## Related History`,
      related.results.length > 0
        ? related.results.map(r => `• [${r.score.toFixed(2)}] ${r.text}`).join('\n')
        : 'No previous evaluations found.',
      `\n## Recommendation`,
      `Pattern '${patternId}' evaluation recorded. Check concepts-index.yaml for implementation status.`
    ];
    return { content: [{ type: 'text', text: report.join('\n') }] };
  }

  // --- Cost Report ---

  async costReport() {
    const resourcesPath = path.join(CONFIGS_DIR, 'resource-policies.yaml');
    if (!fs.existsSync(resourcesPath)) {
      return { content: [{ type: 'text', text: '⚠️ resource-policies.yaml not found' }] };
    }
    const resources = yaml.load(fs.readFileSync(resourcesPath, 'utf8'));
    return { content: [{ type: 'text', text: `# Cost & Resource Report\n\n${JSON.stringify(resources, null, 2).substring(0, 5000)}` }] };
  }

  // --- Secrets Scan ---

  async secretsScan() {
    const patterns = [
      { name: 'API Key', regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi },
      { name: 'Secret', regex: /(?:secret|private[_-]?key)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi },
      { name: 'Token', regex: /(?:token|bearer)\s*[:=]\s*['"]?([A-Za-z0-9_\-\.]{20,})['"]?/gi },
      { name: 'Password', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi },
      { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
      { name: 'Private Key', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
    ];
    const findings = [];
    const scanDir = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data' || entry.name === '.env') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanDir(fullPath, depth + 1); continue; }
          if (!/\.(js|py|yaml|yml|json|md|ps1|sh|env\.example)$/.test(entry.name)) continue;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const p of patterns) {
              if (p.regex.test(content)) {
                p.regex.lastIndex = 0;
                findings.push({ file: path.relative(HEADY_ROOT, fullPath), type: p.name });
              }
              p.regex.lastIndex = 0;
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    };
    scanDir(HEADY_ROOT);
    const lines = findings.map(f => `🔑 ${f.type} in ${f.file}`);
    return { content: [{ type: 'text', text: findings.length > 0
      ? `# Secrets Scan: ${findings.length} potential exposure(s)\n\n${lines.join('\n')}\n\n⚠️ Review each finding — some may be config templates.`
      : '✅ No hardcoded secrets found!' }] };
  }

  // --- Registry Explorer ---

  async registryList(category) {
    const regPath = path.join(HEADY_ROOT, 'heady-registry.json');
    if (!fs.existsSync(regPath)) {
      return { content: [{ type: 'text', text: '⚠️ heady-registry.json not found' }] };
    }
    const registry = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    if (category) {
      const data = registry[category];
      return { content: [{ type: 'text', text: `# Registry: ${category}\n\n${JSON.stringify(data, null, 2).substring(0, 5000)}` }] };
    }
    const sections = Object.keys(registry).map(k => {
      const count = Array.isArray(registry[k]) ? registry[k].length : Object.keys(registry[k] || {}).length;
      return `• ${k}: ${count} entries`;
    });
    return { content: [{ type: 'text', text: `# Heady Registry\n\n${sections.join('\n')}` }] };
  }

  async registryLookup(name) {
    const regPath = path.join(HEADY_ROOT, 'heady-registry.json');
    if (!fs.existsSync(regPath)) throw new Error('heady-registry.json not found');
    const registry = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    const found = [];
    const search = (obj, path = '') => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === 'object' && item) {
            const match = Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(name.toLowerCase()));
            if (match) found.push({ path, item });
          }
        }
      } else if (typeof obj === 'object' && obj) {
        for (const [k, v] of Object.entries(obj)) {
          if (k.toLowerCase().includes(name.toLowerCase())) found.push({ path: k, item: v });
          else search(v, path ? `${path}.${k}` : k);
        }
      }
    };
    search(registry);
    const lines = found.map(f => `## ${f.path}\n\`\`\`json\n${JSON.stringify(f.item, null, 2).substring(0, 1000)}\n\`\`\``);
    return { content: [{ type: 'text', text: found.length > 0 ? `# Registry: "${name}" (${found.length} matches)\n\n${lines.join('\n\n')}` : `No matches for "${name}"` }] };
  }

  // --- Code Stats ---

  async codeStats() {
    const stats = { byExt: {}, totalFiles: 0, totalLines: 0, largest: [] };
    const scanDir = (dir, depth = 0) => {
      if (depth > 4) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data' || entry.name === 'venv') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanDir(fullPath, depth + 1); continue; }
          const ext = path.extname(entry.name) || 'no-ext';
          if (!/\.(js|py|yaml|yml|json|md|ps1|sh|jsx|tsx|ts|css|html|sql)$/.test(entry.name)) continue;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').length;
            stats.totalFiles++;
            stats.totalLines += lines;
            stats.byExt[ext] = stats.byExt[ext] || { files: 0, lines: 0 };
            stats.byExt[ext].files++;
            stats.byExt[ext].lines += lines;
            stats.largest.push({ file: path.relative(HEADY_ROOT, fullPath), lines });
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    };
    scanDir(HEADY_ROOT);
    stats.largest.sort((a, b) => b.lines - a.lines);
    const extLines = Object.entries(stats.byExt)
      .sort(([, a], [, b]) => b.lines - a.lines)
      .map(([ext, s]) => `• ${ext}: ${s.files} files, ${s.lines.toLocaleString()} lines`);
    const top10 = stats.largest.slice(0, 10).map((f, i) => `${i + 1}. ${f.file} (${f.lines.toLocaleString()} lines)`);
    return { content: [{ type: 'text', text: `# Code Statistics\n\nTotal: ${stats.totalFiles.toLocaleString()} files, ${stats.totalLines.toLocaleString()} lines\n\n## By Language\n${extLines.join('\n')}\n\n## Largest Files\n${top10.join('\n')}` }] };
  }

  // --- Render Status ---

  async renderStatus() {
    const renderPath = path.join(HEADY_ROOT, 'render.yaml');
    if (!fs.existsSync(renderPath)) {
      return { content: [{ type: 'text', text: '⚠️ render.yaml not found' }] };
    }
    const render = yaml.load(fs.readFileSync(renderPath, 'utf8'));
    const services = (render.services || []).map(s => `• ${s.name} [${s.type}] — ${s.env || 'no env'} — ${s.plan || 'free'}`);
    const dbs = (render.databases || []).map(d => `• ${d.name} [${d.plan || 'free'}]`);
    const envGroups = (render.envVarGroups || []).map(g => `• ${g.name} (${(g.envVars || []).length} vars)`);
    return { content: [{ type: 'text', text: `# Render Deployment\n\n## Services (${services.length})\n${services.join('\n')}\n\n## Databases (${dbs.length})\n${dbs.join('\n') || 'None'}\n\n## Env Groups (${envGroups.length})\n${envGroups.join('\n') || 'None'}` }] };
  }

  // --- Docs Freshness ---

  async docsFreshness() {
    const docsDir = path.join(HEADY_ROOT, 'docs');
    const ownersPath = path.join(docsDir, 'DOC_OWNERS.yaml');
    const results = [];

    // Check docs directory
    if (fs.existsSync(docsDir)) {
      const docFiles = fs.readdirSync(docsDir, { withFileTypes: true })
        .filter(e => e.isFile() && /\.(md|yaml|yml|json)$/.test(e.name));
      for (const f of docFiles) {
        const stat = fs.statSync(path.join(docsDir, f.name));
        const daysSince = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
        const stale = daysSince > 60;
        results.push({ file: f.name, days: daysSince, stale, size: stat.size });
      }
    }

    // Check DOC_OWNERS
    let owners = null;
    if (fs.existsSync(ownersPath)) {
      owners = yaml.load(fs.readFileSync(ownersPath, 'utf8'));
    }

    const stale = results.filter(r => r.stale);
    const lines = results.map(r =>
      `${r.stale ? '🔴' : '🟢'} ${r.file} — ${r.days}d ago (${(r.size / 1024).toFixed(1)}KB)`
    );
    return { content: [{ type: 'text', text: `# Documentation Freshness\n\nTotal: ${results.length} docs | Stale (>60d): ${stale.length}\n\n${lines.join('\n')}\n\n${owners ? `DOC_OWNERS: ✓ (${Object.keys(owners).length} entries)` : '⚠️ DOC_OWNERS.yaml not found'}` }] };
  }

  // --- Quick Fix ---

  async quickFix(fix, dryRun) {
    const fixes = [];
    const scanDir = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'data') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) { scanDir(fullPath, depth + 1); continue; }
          if (!/\.(js|py)$/.test(entry.name)) continue;
          try {
            let content = fs.readFileSync(fullPath, 'utf8');
            const relPath = path.relative(HEADY_ROOT, fullPath);
            let changed = false;

            if (fix === 'console-logs' || fix === 'all') {
              const count = (content.match(/console\.log\(/g) || []).length;
              if (count > 0) {
                fixes.push(`${relPath}: ${count} console.log(s)`);
                if (!dryRun) { content = content.replace(/^\s*console\.log\(.*\);\s*\n?/gm, ''); changed = true; }
              }
            }
            if (fix === 'whitespace' || fix === 'all') {
              const trailing = (content.match(/[ \t]+$/gm) || []).length;
              if (trailing > 0) {
                fixes.push(`${relPath}: ${trailing} trailing whitespace`);
                if (!dryRun) { content = content.replace(/[ \t]+$/gm, ''); changed = true; }
              }
            }
            if (fix === 'line-endings' || fix === 'all') {
              if (content.includes('\r\n')) {
                fixes.push(`${relPath}: CRLF line endings`);
                if (!dryRun) { content = content.replace(/\r\n/g, '\n'); changed = true; }
              }
            }
            if (changed && !dryRun) fs.writeFileSync(fullPath, content);
          } catch (e) { /* skip */ }
        }
      } catch (e) { /* skip */ }
    };
    scanDir(HEADY_ROOT);
    return { content: [{ type: 'text', text: `# Quick Fix: ${fix} (${dryRun ? 'DRY RUN' : 'APPLIED'})\n\nFound ${fixes.length} issue(s):\n${fixes.join('\n') || 'None!'}` }] };
  }

  // --- Write File ---

  async writeFile(filepath, content, changeId) {
    const safePath = path.resolve(HEADY_ROOT, filepath);
    if (!safePath.startsWith(HEADY_ROOT)) throw new Error('Access denied: path outside Heady root');

    // Check CodeLock
    try {
      const cl = this.getCodeLock();
      if (cl.isLocked()) {
        const check = cl.preCommitCheck([filepath]);
        if (!check.allowed) {
          return { content: [{ type: 'text', text: `🔒 BLOCKED: Codebase is locked.\n${check.reason}\nUnapproved: ${(check.unapproved || []).join(', ')}\n\nRequest approval first with heady_codelock_request.` }] };
        }
      }
    } catch (e) { /* CodeLock not available, proceed */ }

    // Ensure directory exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(safePath, content);
    try { this.getLatent().record('write', `File written: ${filepath}`, { size: content.length }); } catch (e) { /* ignore */ }
    return { content: [{ type: 'text', text: `✅ Written: ${filepath} (${content.length} bytes)` }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Heady MCP Server running on stdio');
  }
}

const server = new HeadyMCPServer();
server.run().catch(console.error);
