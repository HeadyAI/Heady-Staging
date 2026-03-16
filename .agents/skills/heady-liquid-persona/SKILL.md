---
name: heady-liquid-persona
description: Use when managing AI companion personality, empathic adaptation, persona switching, or biometric-synced mood alignment. Implements the 5-persona empathic masking system absorbed from OpenClaw's SOUL.md identity. Keywords include persona, personality, empathy, mood, companion behavior, soul, identity masking, biometric sync.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidPersona
  absorption_source: "OpenClaw SOUL.md identity → 5-persona empathic masking"
  super_prompt_section: "§5.1"
---

# Heady™ Liquid Persona (LiquidPersona)

## When to Use This Skill

Use this skill when:
- Configuring HeadyBuddy's personality for a user
- Switching between persona presets (analytical, balanced, creative, guardian, sage)
- Implementing empathic adaptation based on user interaction patterns
- Syncing companion behavior with biometric signals (heart rate, stress)

## Architecture

### 5 Persona Presets

| Preset | Traits | Communication Style |
|---|---|---|
| **Analytical** | Data-first, precise, structured | Short sentences, tables, metrics |
| **Balanced** | Default mix of all traits | Conversational, clear, helpful |
| **Creative** | Narrative, exploratory, generative | Long-form, metaphorical, expressive |
| **Guardian** | Security-conscious, privacy-first | Cautious, explicit about risks |
| **Sage** | Philosophical, long-context reasoning | Deep, reflective, Socratic |

### Persona Selection Logic

```
User interaction pattern → CSL classify intent category
  → Match to persona trait weights
  → Blend active persona with detected need
  → Apply communication style modifiers
  → Emit persona-adjusted response
```

### Biometric Sync (Optional)

When wearable data available:
- Elevated heart rate → Guardian mode (reduce complexity)
- Low stress + high focus → Analytical mode (increase detail)
- Creative flow state → Creative mode (expand associations)

## Instructions

### Setting a Persona

1. Check user's `buddy_configs` table for saved preference
2. Apply persona preset as base layer
3. Layer dynamic adjustments from interaction patterns
4. Store active persona in Redis session for sub-ms switching

### Persona Masking

Multiple personas can be active simultaneously with weighted blending:
- Primary persona: 0.618 weight (φ ratio)
- Secondary persona: 0.382 weight
- Emergency override (Guardian) always available at full weight

## Output Format

- Active Persona Configuration (JSON)
- Interaction Pattern Analysis
- Persona Transition Log
