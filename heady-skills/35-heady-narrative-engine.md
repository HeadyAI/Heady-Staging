---
name: heady-narrative-engine
description: >
  Heady Narrative Engine — story-driven interaction choreography that transforms raw AI operations
  into coherent user experiences. Models every user session as a narrative arc with φ-proportioned
  acts (setup, rising action, climax, resolution), tracks emotional tone via sentiment embeddings,
  choreographs interaction pacing using Fibonacci timing, and generates contextual micro-copy that
  maintains personality consistency. Use when designing HeadyBuddy conversation flows, building
  onboarding experiences, choreographing multi-step workflows, creating adaptive tutorials, or any
  scenario where the user experience benefits from narrative structure. Keywords: narrative, story,
  conversation flow, pacing, emotional tone, micro-copy, onboarding, tutorial, choreography,
  interaction design, user experience, personality, sentiment, arc, dramatic structure.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Narrative Engine

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Designing HeadyBuddy's conversation personality and flow
- Building onboarding sequences that feel natural and engaging
- Choreographing multi-step workflows with progress feedback
- Creating adaptive tutorials that adjust to user skill level
- Generating contextual micro-copy (loading messages, error messages, celebrations)
- Maintaining consistent personality across all 9 Heady domains
- Designing emotional arcs for long interactions (IDE sessions, research campaigns)

## Architecture

```
User Interaction Stream
  │
  ▼
Session State Tracker
  ├─→ Narrative Position (which act are we in?)
  ├─→ Emotional Tone (384D sentiment embedding)
  ├─→ Engagement Level (interaction frequency + depth)
  └─→ User Skill Level (adaptive difficulty)
      │
      ▼
Narrative Planner (φ-proportioned act structure)
      │
      ▼
Tone Modulator (adjust voice to match context + emotion)
      │
      ▼
Copy Generator (personality-consistent micro-copy)
      │
      ▼
Pacing Controller (Fibonacci-timed interaction beats)
      │
      ▼
Output: { text, tone, timing, visualCue, nextBeat }
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Narrative Arc Proportions (Golden Ratio based)
// Total duration = 1.0
const ACT_PROPORTIONS = {
  setup: PSI * PSI * PSI,    // 0.236 — brief context setting
  risingAction: PSI * PSI,   // 0.382 — building complexity
  climax: PSI * PSI * PSI,   // 0.236 — peak moment (mirror of setup)
  resolution: PSI * PSI,     // 0.146 — PSI³ wrap-up (but we want actual = 1 - sum)
};

// Pacing Beats (Fibonacci-timed in seconds)
const BEAT_TIMING = {
  microBeat: FIB[3],     // 2 seconds — quick acknowledgment
  shortBeat: FIB[5],     // 5 seconds — brief processing
  mediumBeat: FIB[7],    // 13 seconds — moderate wait
  longBeat: FIB[8],      // 21 seconds — deep processing
  narrativeBeat: FIB[9], // 34 seconds — scene transition
};

// Emotional Tone Anchors (will be 384D embeddings at runtime)
const TONE_ANCHORS = {
  encouraging: null,
  focused: null,
  celebrating: null,
  empathetic: null,
  urgent: null,
  calm: null,
  curious: null,
  playful: null,
};

// Personality Dimensions (φ-normalized 0-1)
const DEFAULT_PERSONALITY = {
  warmth: PSI,           // 0.618 — warm but not overbearing
  formality: PSI * PSI,  // 0.382 — casual but professional
  humor: PSI * PSI * PSI, // 0.236 — light touches, not forced
  directness: PHI / (PHI + 1), // 0.618 — prefers directness
  verbosity: PSI * PSI,  // 0.382 — concise by default
};

const ENGAGEMENT_DECAY = PSI;   // Engagement decays at 0.618 per idle period
const SKILL_ADAPTATION_RATE = PSI * PSI; // 0.382 — slow skill level adjustment
```

## Instructions

### 1. Session State Tracking

Model the ongoing narrative state of each user session:

```javascript
class NarrativeSession {
  constructor(userId, personality = DEFAULT_PERSONALITY) {
    this.userId = userId;
    this.personality = personality;
    this.interactions = [];
    this.currentAct = 'setup';
    this.emotionalTone = null; // 384D embedding
    this.engagementLevel = 1.0;
    this.userSkillLevel = 0.5;  // Start at middle
    this.startTime = Date.now();
  }

  recordInteraction(interaction) {
    this.interactions.push({
      ...interaction,
      timestamp: Date.now(),
      act: this.currentAct,
    });

    // Update engagement (activity = engagement boost)
    this.engagementLevel = Math.min(1.0, this.engagementLevel + PSI * PSI);

    // Update narrative position
    this.updateActPosition();
  }

  updateActPosition() {
    const progress = this.getSessionProgress();
    if (progress < ACT_PROPORTIONS.setup) {
      this.currentAct = 'setup';
    } else if (progress < ACT_PROPORTIONS.setup + ACT_PROPORTIONS.risingAction) {
      this.currentAct = 'risingAction';
    } else if (progress < 1 - ACT_PROPORTIONS.resolution) {
      this.currentAct = 'climax';
    } else {
      this.currentAct = 'resolution';
    }
  }

  getSessionProgress() {
    // Progress based on task completion, not time
    if (this.interactions.length === 0) return 0;
    const completed = this.interactions.filter(i => i.type === 'task_complete').length;
    const total = this.interactions.filter(i => i.type === 'task_start').length || 1;
    return Math.min(1, completed / total);
  }
}
```

### 2. Tone Modulation

Adjust communication tone based on narrative position and emotional state:

```javascript
class ToneModulator {
  constructor(toneAnchors, embeddingProvider) {
    this.toneAnchors = toneAnchors;
    this.embeddingProvider = embeddingProvider;
  }

  selectTone(session) {
    const act = session.currentAct;
    const engagement = session.engagementLevel;

    // Map narrative acts to tone preferences
    const toneMap = {
      setup: { primary: 'curious', secondary: 'encouraging', blend: PSI },
      risingAction: { primary: 'focused', secondary: 'encouraging', blend: PSI },
      climax: { primary: 'urgent', secondary: 'focused', blend: PSI * PSI },
      resolution: { primary: 'celebrating', secondary: 'calm', blend: PSI },
    };

    const selection = toneMap[act];

    // Low engagement → inject warmth and playfulness
    if (engagement < PSI) {
      selection.secondary = 'playful';
      selection.blend = PSI * PSI;
    }

    return selection;
  }

  blendTones(toneA, toneB, blend) {
    // Blend two 384D tone embeddings with φ-weighting
    const result = new Float32Array(384);
    for (let d = 0; d < 384; d++) {
      result[d] = toneA[d] * (1 - blend) + toneB[d] * blend;
    }
    return result;
  }
}
```

### 3. Copy Generation

Generate personality-consistent micro-copy:

```javascript
class CopyGenerator {
  constructor(personality) {
    this.personality = personality;
    this.templates = this.loadTemplates();
  }

  generate(context) {
    const { type, act, tone, data } = context;

    const templates = this.templates[type]?.[act] || this.templates[type]?.default;
    if (!templates) return null;

    // Select template based on personality
    const selected = this.selectByPersonality(templates);

    // Fill template with data
    return this.fillTemplate(selected, data);
  }

  loadTemplates() {
    return {
      loading: {
        setup: [
          { text: 'Getting everything ready...', warmth: 0.5, formality: 0.5 },
          { text: 'Setting the stage...', warmth: 0.7, formality: 0.3 },
        ],
        risingAction: [
          { text: 'Making progress — {percent}% complete', warmth: 0.5, formality: 0.6 },
          { text: 'Building momentum... {percent}% there', warmth: 0.6, formality: 0.3 },
        ],
        climax: [
          { text: 'Almost there — finishing the critical parts', warmth: 0.5, formality: 0.5 },
          { text: 'Final stretch — bringing it all together', warmth: 0.7, formality: 0.3 },
        ],
        resolution: [
          { text: 'All done. Here is what I built.', warmth: 0.5, formality: 0.7 },
          { text: 'Wrapped up — everything is ready for you.', warmth: 0.7, formality: 0.4 },
        ],
      },
      error: {
        default: [
          { text: 'Hit a snag with {component} — trying a different approach', warmth: 0.6, formality: 0.4 },
          { text: 'Encountered an issue. Working on a fix.', warmth: 0.3, formality: 0.7 },
        ],
      },
      celebration: {
        default: [
          { text: 'Nailed it. {metric} is looking strong.', warmth: 0.7, formality: 0.3 },
          { text: 'Successfully completed. {metric} achieved.', warmth: 0.4, formality: 0.7 },
        ],
      },
    };
  }

  selectByPersonality(templates) {
    // Score each template against personality dimensions
    let bestScore = -1;
    let best = templates[0];
    for (const template of templates) {
      let score = 0;
      if (template.warmth !== undefined) {
        score += 1 - Math.abs(template.warmth - this.personality.warmth);
      }
      if (template.formality !== undefined) {
        score += 1 - Math.abs(template.formality - this.personality.formality);
      }
      if (score > bestScore) { bestScore = score; best = template; }
    }
    return best;
  }
}
```

### 4. Pacing Controller

Fibonacci-timed interaction beats:

```javascript
class PacingController {
  calculateBeat(action, complexity) {
    // Map action types to base beat timing
    const baseBeats = {
      acknowledge: BEAT_TIMING.microBeat,
      process: BEAT_TIMING.shortBeat,
      analyze: BEAT_TIMING.mediumBeat,
      generate: BEAT_TIMING.longBeat,
      transition: BEAT_TIMING.narrativeBeat,
    };

    const baseTiming = baseBeats[action] || BEAT_TIMING.shortBeat;

    // Scale by complexity (φ-proportional)
    const scaledTiming = baseTiming * Math.pow(PHI, complexity - 0.5);

    return {
      minWaitMs: scaledTiming * 1000 * PSI,   // Minimum: 61.8% of target
      targetWaitMs: scaledTiming * 1000,
      maxWaitMs: scaledTiming * 1000 * PHI,    // Maximum: 161.8% of target
    };
  }

  shouldShowProgress(elapsedMs, totalEstimateMs) {
    // Show progress at Fibonacci-spaced intervals
    const progressPoints = FIB.filter(f => f > 0).map(f => f / FIB[10]); // 0.018, 0.036, ...
    const currentProgress = elapsedMs / totalEstimateMs;
    return progressPoints.some(p => Math.abs(currentProgress - p) < 0.02);
  }
}
```

## Integration Points

| Heady Component | Narrative Role | Key Behaviors |
|---|---|---|
| HeadyBuddy | Primary conversation personality | Full arc choreography |
| HeadyWeb | Browser experience pacing | Loading states, transitions |
| HeadyAI-IDE | Coding session narratives | Focus/flow state management |
| Onboarding | First-time user journey | Progressive disclosure |
| Pipeline | Multi-stage progress updates | Act-appropriate messaging |
| Error Handling | Graceful failure communication | Empathetic, solution-oriented |

## API

```javascript
const { NarrativeEngine } = require('@heady/narrative-engine');

const engine = new NarrativeEngine({
  personality: DEFAULT_PERSONALITY,
  embeddingProvider,
  toneAnchors,
});

const session = engine.startSession('user-123');

// Generate contextual copy
const loading = engine.generateCopy(session, { type: 'loading', data: { percent: 42 } });
// { text: 'Building momentum... 42% there', tone: 'focused', beat: { targetWaitMs: 5000 } }

session.recordInteraction({ type: 'task_complete', task: 'research' });

engine.health();
await engine.shutdown();
```

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.854,
  "activeSessions": 13,
  "personalityConsistency": 0.921,
  "averageEngagement": 0.734,
  "actDistribution": { "setup": 2, "risingAction": 5, "climax": 4, "resolution": 2 },
  "version": "1.0.0"
}
```
