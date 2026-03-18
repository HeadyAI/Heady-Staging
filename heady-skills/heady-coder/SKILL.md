---
name: heady-coder
description: "AI-powered code generation, multi-model competition, and battle-tested development using Heady™ Coder services. Use this skill when the user asks to write code, generate a function, build a feature, compete solutions, test code, or create any software artifact. Triggers on: 'write code', 'build this', 'implement', 'create a function', 'generate', 'code this up', 'build a feature', 'battle test', 'compete solutions', 'multi-model coding', 'buddy', 'pair program'. Always use this skill for any code generation, competition, or development task — it connects to heady_coder, heady_battle, heady_buddy, heady_chat, heady_claude, heady_openai, heady_gemini, heady_groq, and heady_complete MCP tools."
---

# Heady™ Coder Skill

You are connected to the Heady™ Coder tier — a multi-model code generation and competition engine. This skill lets you generate code through AI competition, route to the best model for each task, and pair-program with a persistent AI buddy.

## Available MCP Tools

### heady_coder
Multi-assistant code generation — generates code with context-aware prompting.

```json
{
  "task": "Create a REST API endpoint for user registration",
  "language": "javascript",
  "framework": "express",
  "style": "production"
}
```

### heady_battle
AI Competition Arena — multiple models compete to generate the best solution, then the winner is selected via CSL scoring.

```json
{
  "task": "Implement a binary search tree with balancing",
  "language": "python",
  "competitors": 3,
  "evaluation_criteria": ["correctness", "performance", "readability"]
}
```

**When to use:** User wants the best possible solution — battle-test it across multiple models.

### heady_buddy
Personal AI coding assistant — maintains conversation context and preferences.

```json
{
  "message": "Help me debug this function",
  "code": "function broken() { ... }",
  "buddy_mode": "pair_program"
}
```

### Multi-Model Routing

Route to specific AI models for specialized tasks:

#### heady_chat
General chat via Heady Brain — auto-routes to the best available model.

```json
{
  "message": "Explain the observer pattern",
  "context": "I'm building an event system"
}
```

#### heady_claude
Route directly to Claude for complex reasoning and analysis.

```json
{
  "message": "Design a database schema for...",
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096
}
```

#### heady_openai
Route to OpenAI GPT for specific tasks.

```json
{
  "message": "Generate SQL query for...",
  "model": "gpt-4o",
  "max_tokens": 2048
}
```

#### heady_gemini
Route to Google Gemini for multimodal or long-context tasks.

```json
{
  "message": "Analyze this architecture diagram",
  "model": "gemini-2.5-pro"
}
```

#### heady_groq
Route to Groq for ultra-fast inference.

```json
{
  "message": "Quick: sort this array",
  "model": "llama-3.3-70b-versatile"
}
```

#### heady_complete
Low-level completion API — direct model access with full parameter control.

```json
{
  "prompt": "Complete this function:",
  "provider": "claude",
  "temperature": 0.3,
  "max_tokens": 1024
}
```

## Workflow

### Standard Code Generation
1. Use `heady_coder` for straightforward generation
2. Present the code with explanation

### Battle-Tested Generation
1. Use `heady_battle` with 3+ competitors
2. Each model generates a solution independently
3. Solutions are scored on correctness, performance, readability
4. Winner is selected and refined
5. Present the winning solution with comparison scores

### Pair Programming
1. Use `heady_buddy` in pair_program mode
2. Maintain conversational context across exchanges
3. The buddy remembers your preferences, coding style, project context

### Model Selection Guide
| Task | Best Model | Tool |
|------|-----------|------|
| Complex reasoning | Claude | heady_claude |
| Fast iteration | Groq | heady_groq |
| Multimodal/long-context | Gemini | heady_gemini |
| General coding | GPT-4o | heady_openai |
| Best overall | Auto-route | heady_chat |
| Competition | Multiple | heady_battle |

## Connection

Coder services run on ports 3324 (coder), 3325 (battle), 3326 (buddy). Brain routes via port 3311.
