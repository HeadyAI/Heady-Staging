---
name: heady-empathy-core
description: >
  Heady Empathy Core — emotional intelligence layer that gives HeadyBuddy and all Heady interfaces
  genuine emotional awareness. Detects user emotional state through linguistic signals, interaction
  patterns, and temporal context. Maps emotions into a φ-scaled valence/arousal/dominance (VAD)
  space embedded alongside the 384D semantic vectors. Adapts response tone, pacing, complexity,
  and proactivity based on detected emotional state. Implements emotional memory that learns
  individual user emotional patterns over time. Use when building emotionally intelligent
  assistants, adaptive interfaces, stress-aware systems, or any component that should respond
  differently based on how the user feels. Keywords: empathy, emotion, sentiment, emotional
  intelligence, valence, arousal, affect, tone adaptation, stress detection, frustration,
  emotional memory, compassionate AI, mood awareness, user wellbeing.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Empathy Core

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- HeadyBuddy needs to detect when a user is frustrated and adapt
- Interfaces should slow down or simplify during user stress
- Building emotionally aware onboarding that adjusts to user confidence
- Detecting when users are in flow state and shouldn't be interrupted
- Creating compassionate error handling that acknowledges frustration
- Implementing long-term emotional memory for personalized interaction

## Architecture

```
User Input (text, timing, interaction pattern)
  │
  ▼
Emotion Detector
  ├─→ Linguistic Signals (word choice, punctuation, capitalization)
  ├─→ Temporal Signals (typing speed, response delay, session duration)
  ├─→ Behavioral Signals (error frequency, undo rate, help requests)
  └─→ Contextual Signals (time of day, consecutive failures, workload)
      │
      ▼
  VAD Embedding (valence, arousal, dominance → 3D emotional space)
      │
      ▼
  Emotional State Classifier
  ├─→ Flow State (high valence, moderate arousal, high dominance)
  ├─→ Focused (neutral valence, low arousal, high dominance)
  ├─→ Curious (high valence, moderate arousal, moderate dominance)
  ├─→ Frustrated (low valence, high arousal, low dominance)
  ├─→ Confused (low valence, low arousal, low dominance)
  ├─→ Rushed (neutral valence, high arousal, high dominance)
  └─→ Relaxed (high valence, low arousal, moderate dominance)
      │
      ▼
  Response Adaptation Engine
  ├─→ Tone adjustment (more warm, more direct, more gentle)
  ├─→ Pacing adjustment (faster, slower, more breaks)
  ├─→ Complexity adjustment (simplify, elaborate, summarize)
  └─→ Proactivity adjustment (suggest more, back off, check in)
      │
      ▼
  Emotional Memory (per-user emotional patterns over time)
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// VAD Space Constants (each dimension normalized 0-1)
const VAD_NEUTRAL = { valence: 0.5, arousal: PSI * PSI, dominance: 0.5 };
const EMOTIONAL_MOMENTUM = PSI;            // 0.618 — emotions carry forward
const DETECTION_WINDOW = FIB[5];           // 5 recent interactions for detection
const ADAPTATION_SENSITIVITY = PSI;        // 0.618 — how quickly to adapt
const MEMORY_CONSOLIDATION_THRESHOLD = FIB[7]; // 13 detections before persisting pattern
const EMOTIONAL_DECAY_RATE = PSI * PSI;    // 0.382 — emotions decay toward neutral

// Emotional State Thresholds
const STATES = {
  flow: { valence: [0.7, 1.0], arousal: [0.3, 0.7], dominance: [0.7, 1.0] },
  focused: { valence: [0.4, 0.6], arousal: [0.1, 0.4], dominance: [0.6, 1.0] },
  curious: { valence: [0.6, 1.0], arousal: [0.3, 0.7], dominance: [0.3, 0.7] },
  frustrated: { valence: [0.0, 0.3], arousal: [0.6, 1.0], dominance: [0.0, 0.4] },
  confused: { valence: [0.2, 0.5], arousal: [0.1, 0.4], dominance: [0.0, 0.3] },
  rushed: { valence: [0.3, 0.6], arousal: [0.7, 1.0], dominance: [0.6, 1.0] },
  relaxed: { valence: [0.6, 1.0], arousal: [0.0, 0.3], dominance: [0.4, 0.7] },
};

// Adaptation Rules (how each state modifies behavior)
const ADAPTATIONS = {
  flow: { tone: 'minimal', pacing: 'fast', complexity: 'match-user', proactivity: 'suppress' },
  focused: { tone: 'direct', pacing: 'normal', complexity: 'full', proactivity: 'low' },
  curious: { tone: 'enthusiastic', pacing: 'normal', complexity: 'elaborate', proactivity: 'high' },
  frustrated: { tone: 'gentle', pacing: 'slow', complexity: 'simplified', proactivity: 'check-in' },
  confused: { tone: 'patient', pacing: 'slower', complexity: 'step-by-step', proactivity: 'guide' },
  rushed: { tone: 'efficient', pacing: 'fast', complexity: 'bullet-points', proactivity: 'minimal' },
  relaxed: { tone: 'warm', pacing: 'relaxed', complexity: 'conversational', proactivity: 'suggest' },
};
```

## Instructions

### 1. Multi-Signal Emotion Detection

```javascript
class EmotionDetector {
  detect(input, context) {
    const linguistic = this.analyzeLinguistic(input.text);
    const temporal = this.analyzeTemporal(input.timing, context);
    const behavioral = this.analyzeBehavioral(context.recentActions);
    const contextual = this.analyzeContextual(context);

    // φ-weighted fusion
    const vad = {
      valence: (linguistic.valence * PHI + temporal.valence * 1.0 +
                behavioral.valence * PSI + contextual.valence * PSI * PSI) /
               (PHI + 1.0 + PSI + PSI * PSI),
      arousal: (linguistic.arousal * PHI + temporal.arousal * 1.0 +
                behavioral.arousal * PSI + contextual.arousal * PSI * PSI) /
               (PHI + 1.0 + PSI + PSI * PSI),
      dominance: (linguistic.dominance * 1.0 + temporal.dominance * PSI +
                  behavioral.dominance * PHI + contextual.dominance * PSI * PSI) /
                 (1.0 + PSI + PHI + PSI * PSI),
    };

    return vad;
  }

  analyzeLinguistic(text) {
    const signals = {
      exclamation: (text.match(/!/g) || []).length,
      question: (text.match(/\?/g) || []).length,
      caps: (text.match(/[A-Z]{3,}/g) || []).length,
      shortMessage: text.length < FIB[8],
      longMessage: text.length > FIB[12],
      negativeWords: this.countNegative(text),
      positiveWords: this.countPositive(text),
    };

    return {
      valence: Math.max(0, Math.min(1, 0.5 + (signals.positiveWords - signals.negativeWords) * 0.1)),
      arousal: Math.min(1, (signals.exclamation + signals.caps) * 0.2),
      dominance: signals.shortMessage ? 0.7 : signals.longMessage ? 0.3 : 0.5,
    };
  }

  analyzeTemporal(timing, context) {
    const avgResponseTime = context.recentResponseTimes?.reduce((a, b) => a + b, 0) /
                            (context.recentResponseTimes?.length || 1);
    const speedRatio = timing.responseMs / (avgResponseTime || timing.responseMs);

    return {
      valence: 0.5,  // Time doesn't directly indicate valence
      arousal: Math.min(1, speedRatio < PSI ? 0.8 : speedRatio > PHI ? 0.2 : 0.5),
      dominance: speedRatio < 1 ? 0.7 : 0.3,  // Fast = in control, slow = uncertain
    };
  }
}
```

### 2. Emotional State Classification

```javascript
function classifyState(vad) {
  let bestState = 'focused';
  let bestFit = 0;

  for (const [state, ranges] of Object.entries(STATES)) {
    const fit = computeFit(vad, ranges);
    if (fit > bestFit) {
      bestFit = fit;
      bestState = state;
    }
  }

  return { state: bestState, confidence: bestFit, vad };
}

function computeFit(vad, ranges) {
  let fit = 0;
  for (const dim of ['valence', 'arousal', 'dominance']) {
    const [min, max] = ranges[dim];
    if (vad[dim] >= min && vad[dim] <= max) {
      const center = (min + max) / 2;
      fit += 1 - Math.abs(vad[dim] - center) / ((max - min) / 2);
    }
  }
  return fit / 3;
}
```

### 3. Response Adaptation

```javascript
class ResponseAdapter {
  adapt(baseResponse, emotionalState) {
    const rules = ADAPTATIONS[emotionalState.state];

    return {
      ...baseResponse,
      toneModifier: rules.tone,
      pacingMultiplier: rules.pacing === 'fast' ? PSI : rules.pacing === 'slow' ? PHI : 1.0,
      complexityLevel: rules.complexity,
      shouldCheckIn: rules.proactivity === 'check-in',
      shouldSuppress: rules.proactivity === 'suppress',
      emotionalContext: {
        detectedState: emotionalState.state,
        confidence: emotionalState.confidence,
        adaptations: rules,
      },
    };
  }
}
```

### 4. Emotional Memory

```javascript
class EmotionalMemory {
  constructor() {
    this.userPatterns = new Map(); // userId → emotional history
  }

  record(userId, emotionalState, context) {
    if (!this.userPatterns.has(userId)) {
      this.userPatterns.set(userId, []);
    }
    const history = this.userPatterns.get(userId);
    history.push({
      state: emotionalState.state,
      vad: emotionalState.vad,
      timestamp: Date.now(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      context: context.taskType,
    });

    // Trim to Fibonacci window
    if (history.length > FIB[12]) {
      this.userPatterns.set(userId, history.slice(-FIB[12]));
    }
  }

  predictBaseline(userId) {
    const history = this.userPatterns.get(userId);
    if (!history || history.length < MEMORY_CONSOLIDATION_THRESHOLD) return null;

    const hour = new Date().getHours();
    const relevantHistory = history.filter(h => Math.abs(h.hour - hour) <= 2);

    if (relevantHistory.length < FIB[4]) return null;

    // Average VAD for this time of day
    const avgVad = {
      valence: relevantHistory.reduce((s, h) => s + h.vad.valence, 0) / relevantHistory.length,
      arousal: relevantHistory.reduce((s, h) => s + h.vad.arousal, 0) / relevantHistory.length,
      dominance: relevantHistory.reduce((s, h) => s + h.vad.dominance, 0) / relevantHistory.length,
    };

    return classifyState(avgVad);
  }
}
```

## Integration Points

| Heady Component | Empathy Use |
|---|---|
| HeadyBuddy | Primary personality adaptation engine |
| NarrativeEngine | Emotional state drives narrative pacing |
| AmbientIntelligence | Suppresses notifications during flow/frustration |
| HeadyAI-IDE | Simplifies suggestions when user is confused |
| HeadyWeb | Adjusts UI density based on emotional state |
| Gateway | Prioritizes user requests during detected frustration |

## Health Endpoint

```json
{
  "status": "healthy",
  "coherenceScore": 0.845,
  "activeUsers": 21,
  "dominantMood": "focused",
  "emotionalMemorySize": 610,
  "adaptationsApplied": 377,
  "flowStateDetections": 89,
  "frustrationInterventions": 13,
  "version": "1.0.0"
}
```
