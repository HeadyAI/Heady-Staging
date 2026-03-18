---
name: heady-intelligence
description: "Deep analysis, pattern detection, and risk assessment using Heady™ AI Intelligence services. Use this skill when the user asks to analyze code, scan a project, detect patterns, assess risks, or perform deep reasoning. Triggers on: 'analyze this', 'scan my project', 'find patterns', 'risk assessment', 'deep scan', 'what's wrong with this code', 'review architecture', 'security audit', 'vulnerability scan', 'code quality'. Always use this skill for any analytical or investigative task — it connects to heady_deep_scan, heady_analyze, heady_risks, heady_patterns, and heady_refactor MCP tools."
---

# Heady™ Intelligence Skill

You are connected to the Heady™ Intelligence tier — the analytical brain of a sovereign AI operating system. This skill gives you access to deep scanning, pattern detection, risk analysis, and refactoring capabilities via MCP tools.

## Available MCP Tools

You have access to these HeadyMCP tools. Call them directly:

### heady_deep_scan
Deep project scanning — maps file structure, extracts code patterns, generates embeddings into 3D vector memory.

```json
{
  "directory": "/path/to/project",
  "maxDepth": 10
}
```

**When to use:** The user wants to understand a codebase, map dependencies, or index a project for the first time.

### heady_analyze
Multi-dimensional code analysis — complexity, maintainability, architecture patterns, dependency graphs.

```json
{
  "code": "function example() { ... }",
  "language": "javascript",
  "analysis_type": "full"
}
```

**When to use:** User asks for code review, quality assessment, or architecture analysis.

### heady_risks
Vulnerability scanning and risk assessment — security, performance, reliability, scalability.

```json
{
  "code": "...",
  "scope": "security",
  "severity_threshold": "medium"
}
```

**When to use:** User asks about security, vulnerabilities, risks, or production readiness.

### heady_patterns
Pattern detection — identifies design patterns, anti-patterns, code smells, architectural patterns.

```json
{
  "code": "...",
  "pattern_types": ["design", "anti", "architectural"]
}
```

**When to use:** User wants to identify patterns or anti-patterns in their code.

### heady_refactor
Intelligent refactoring suggestions — extracts methods, simplifies logic, applies best practices.

```json
{
  "code": "...",
  "strategy": "extract_method",
  "target": "function_name"
}
```

**When to use:** User wants refactoring suggestions or code improvements.

## Workflow

1. **Understand scope** — Ask what the user wants analyzed (file, directory, specific concern)
2. **Scan first** — Use `heady_deep_scan` to index the project if not already scanned
3. **Analyze** — Use `heady_analyze` for code quality, `heady_risks` for security, `heady_patterns` for architecture
4. **Report** — Present findings with severity ratings and actionable recommendations
5. **Refactor** — If requested, use `heady_refactor` to generate improvement suggestions

## φ-Scaled Confidence

All results include CSL (Confidence Signal Logic) scores:
- **≥ 0.718** (INJECT) — Critical finding, must address
- **≥ 0.618** (BOOST) — Important finding, should address
- **≥ 0.382** (INCLUDE) — Notable finding, consider addressing
- **< 0.236** (SUPPRESS) — Low confidence, informational only

Present confidence scores to the user to help them prioritize findings.

## Connection

This skill connects to the HeadyMCP server. Ensure the MCP server is running:
- **stdio:** `HEADY_MCP_TRANSPORT=stdio node services/heady-mcp-server/src/index.js`
- **HTTP:** `HEADY_MCP_TRANSPORT=http node services/heady-mcp-server/src/index.js` (port 3310)
