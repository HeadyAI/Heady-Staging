---
name: heady-liquid-conversation
description: Use when implementing conversation-as-coordination patterns where agents coordinate through structured multi-turn dialogue rather than direct function calls. Absorbed from AutoGen's GroupChat pattern. Keywords include conversation, group chat, coordination, multi-turn, dialogue, AutoGen, agent conversation.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidConversation
  absorption_source: "AutoGen → conversation-as-coordination with GroupChat"
  super_prompt_section: "§5.4"
---

# Heady™ Liquid Conversation (LiquidConversation)

## When to Use This Skill

Use this skill when:
- Coordinating agents through structured conversation rather than function calls
- Implementing GroupChat patterns with dynamic speaker selection
- Building debate/critique/refine loops between agents
- Creating human-in-the-loop approval via conversation

## Architecture

### GroupChat Model

```
GroupChat Manager
  ├─ Speaker Selection (round-robin / CSL-scored / manual)  
  ├─ Message History (shared conversation context)
  ├─ Termination Conditions (max turns / consensus / explicit stop)
  └─ Agents:
      ├─ Agent A (Architect) — proposes solutions
      ├─ Agent B (Critic) — identifies flaws
      ├─ Agent C (Implementer) — writes code
      └─ Agent D (Reviewer) — validates output
```

### Speaker Selection Strategies

| Strategy | Logic |
|---|---|
| **Round Robin** | Each agent speaks in order |
| **CSL-Scored** | Agent with highest relevance score speaks next |
| **Auto** | LLM decides who should speak based on context |
| **Manual** | Human selects next speaker |
| **Priority** | Critic always follows Architect |

### Conversation Termination

- Max turns reached (default: fib(8) = 21)
- Consensus marker emitted by all agents
- Human approval received
- CSL confidence exceeds 0.9 across all agents

## Instructions

### Setting Up a GroupChat

1. Define participating agents with roles
2. Choose speaker selection strategy
3. Set termination conditions
4. Provide initial message / task description
5. Start conversation loop
6. Monitor for consensus or intervention needs
7. Collect final agreed output

## Output Format

- Full Conversation Transcript
- Consensus Report
- Per-Agent Contribution Summary
- Decision Trace
