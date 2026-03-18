---
name: heady-feature-forge
description: Design and spec new Heady platform features end-to-end. Use when brainstorming, scoping, or writing feature specifications for any Heady service — HeadyWeb, HeadyBuddy, HeadyAI-IDE, or the Latent OS layer. Covers user stories, architecture sketches, API surface, data models, and acceptance criteria.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Feature Forge

Use this skill when you need to **design, scope, or write a specification for a new Heady platform feature**. It provides a structured framework for going from rough idea to shippable feature spec.

## When to Use This Skill

- A new Heady capability needs to be defined before implementation begins
- You are brainstorming feature ideas for HeadyWeb, HeadyBuddy, HeadyAI-IDE, or the Latent OS layer
- You need to produce a feature spec document with user stories, architecture, API surface, and acceptance criteria
- You want to evaluate the feasibility and scope of a proposed feature

## Instructions

### 1. Capture the Feature Intent

Start by clearly articulating:

- **Feature name** — concise, descriptive
- **Target surface** — which Heady product or layer (HeadyWeb, HeadyBuddy, HeadyAI-IDE, Latent OS, cross-cutting)
- **Problem statement** — what user pain or gap does this solve?
- **One-line value prop** — a single sentence describing the benefit

### 2. Define User Stories

Write 3-7 user stories in standard format:

```
As a [persona], I want to [action] so that [outcome].
```

Cover at least:
- The primary happy path
- One administrative or configuration story
- One edge-case or error-recovery story

### 3. Sketch the Architecture

Produce a concise architecture overview:

- **Components involved** — list existing Heady services and any new ones required
- **Data flow** — describe how data moves between components
- **Storage requirements** — new tables, vector collections, or caches needed
- **External dependencies** — third-party APIs, models, or services

### 4. Define the API Surface

For each new endpoint or tool:

| Field | Description |
|-------|-------------|
| Name | Tool or endpoint name |
| Parameters | Required and optional params with types |
| Returns | Response shape |
| Auth | Permission level required |

### 5. Specify Data Models

List new data entities with their fields, types, and relationships. Call out indexes and constraints.

### 6. Write Acceptance Criteria

For each user story, write testable acceptance criteria:

```
GIVEN [precondition]
WHEN [action]
THEN [expected result]
```

### 7. Identify Risks and Open Questions

- Technical risks (performance, security, compatibility)
- Product risks (adoption, complexity, scope creep)
- Open questions that need stakeholder input

### 8. Produce the Feature Spec Document

Compile everything into a single markdown document with these sections:

1. Overview
2. User Stories
3. Architecture
4. API Surface
5. Data Models
6. Acceptance Criteria
7. Risks and Open Questions
8. Implementation Notes

## Output Format

The final deliverable is a markdown feature spec document. Keep it actionable — every section should give an implementer enough detail to start coding without guessing.

## Tips

- **Stay grounded in the Heady ecosystem** — reference existing services (HeadyMemory, HeadyCoder, HeadyBattle, etc.) rather than proposing redundant new ones
- **Think about permissions early** — every feature should define who can do what via the Heady permission model
- **Consider cross-device** — Heady runs on Android, desktop, and web; features should account for all surfaces or explicitly scope to one
- **Keep specs lean** — a 2-page spec that ships beats a 20-page spec that stalls
