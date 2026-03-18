/**
 * tools/registry.js — Re-export from tool-registry.js
 * Adapts the ToolRegistry class to the createToolRegistry() interface expected by index.js
 */
'use strict';

const { ToolRegistry, TOOL_CSL_GATES, TOOL_CATEGORIES, TOOL_MODULES } = require('./tool-registry');

/**
 * Create and initialize a tool registry with all tools pre-registered.
 * Returns { tools: Array<ToolSchema>, handlers: Map<string, ToolDef> }
 */
function createToolRegistry() {
  const reg = new ToolRegistry();
  reg.registerAll();

  // Convert to the format expected by index.js
  const tools = reg.listSchemas();
  const handlers = new Map();

  for (const [name, tool] of reg.tools) {
    handlers.set(name, {
      handler: tool.handler,
      phiTier: tool.csl_gate,
    });
  }

  return { tools, handlers };
}

module.exports = { createToolRegistry, ToolRegistry, TOOL_CSL_GATES, TOOL_CATEGORIES };
