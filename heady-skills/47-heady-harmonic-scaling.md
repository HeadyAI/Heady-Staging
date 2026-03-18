---
name: heady-harmonic-scaling
description: >-
  Heady Harmonic Scaling — audio and frequency-driven system orchestration mapping computational load to musical frequencies and MIDI signals. Scaling decisions follow the overtone series and harmonic intervals. Uses phi-harmonic frequencies, dissonance detection for imbalance, Ableton Link tempo sync, and Sacred Geometry topology for harmonic node placement. Use when implementing frequency-based autoscaling, musical system monitoring, MIDI-driven operations, or sonification of metrics. Keywords: harmonic, scaling, frequency, MIDI, audio, overtone, sonification, resonance, dissonance, chord, autoscale, load balancing, musical orchestration.
metadata:
  author: HeadySystems
  version: '1.0'
  patents: 60+
  phi-compliant: true
---

# Heady Harmonic Scaling

> **© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents**
> Sacred Geometry v4.0 | PHI-math foundation | CSL gates throughout

## When to Use This Skill

Use when:

- Designing autoscaling that follows natural harmonic ratios instead of arbitrary percentages
- Sonifying system metrics so operators can literally hear system health
- Integrating MIDI devices for real-time system tuning (knobs → scaling parameters)
- Building frequency-domain analysis of service load patterns to detect resonance/dissonance
- Mapping the Sacred Geometry topology to musical chord structures
- Creating an operations experience that is both functional and aesthetically resonant
- Extending Heady's MIDI bridge for bidirectional system-to-music communication

## Architecture

```
System Metrics Stream (load, latency, error rate, queue depth)
  │
  ▼
Frequency Mapper (metrics → musical frequencies)
  │ Base frequency A4 = 432 Hz (φ-tuning, not 440)
  │ Load 0% = rest (silence), Load 100% = octave above root
  │ Each service maps to a note in the Sacred Geometry chord
  │
  ▼
Harmonic Analyzer
  ├─→ Consonance Detector: services in harmonic ratios = healthy
  ├─→ Dissonance Detector: beating frequencies = imbalance
  ├─→ Overtone Analysis: harmonic series reveals hidden correlations
  └─→ Tempo Tracker: request rate maps to BPM
        │
        ▼
Scaling Decision Engine (frequency-domain decisions)
  ├─→ Octave Rule: scale up at 2x load (perfect octave)
  ├─→ Fifth Rule: add replicas at 3:2 load ratio (perfect fifth)
  ├─→ Third Rule: rebalance at 5:4 load ratio (major third)
  └─→ Dissonance Rule: immediate intervention when frequency ratio
      doesn't simplify to a ratio with small integers
        │
        ▼
MIDI Output (bidirectional)
  ├─→ To Ableton/DAW: sonified metrics for monitoring
  ├─→ To MIDI Controller: LED feedback showing system state
  └─→ From MIDI Controller: knob/fader input adjusts scaling
        │
        ▼
Scaling Executor
  ├─→ Cloud Run: adjust container counts
  ├─→ Cloudflare Workers: route distribution
  └─→ Agent Swarm: spawn/retire agents
```

## Phi-Math Constants

```javascript
const PHI = 1.618033988749895;
const PSI = 0.6180339887498949;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Harmonic Constants (φ-tuned)
const BASE_FREQUENCY_HZ = 432;                    // A4 in φ-tuning (Verdi tuning)
const PHI_FREQUENCY = BASE_FREQUENCY_HZ * PHI;    // 698.8 Hz — φ harmonic
const PSI_FREQUENCY = BASE_FREQUENCY_HZ * PSI;    // 267.0 Hz — ψ sub-harmonic
const OCTAVE_RATIO = 2;                           // Perfect octave — scale-up boundary
const FIFTH_RATIO = 3 / 2;                        // Perfect fifth — replica threshold
const FOURTH_RATIO = 4 / 3;                       // Perfect fourth — rebalance point
const MAJOR_THIRD_RATIO = 5 / 4;                  // Major third — warning zone
const MINOR_THIRD_RATIO = 6 / 5;                  // Minor third — attention zone

// Scaling Constants
const SCALE_UP_LOAD = PSI;                         // 0.618 — scale up at 61.8% load
const SCALE_DOWN_LOAD = PSI * PSI;                 // 0.382 — scale down below 38.2%
const DISSONANCE_THRESHOLD = 0.809;                // CSL MEDIUM — dissonance triggers alert
const CONSONANCE_MINIMUM = 0.691;                  // CSL LOW — minimum consonance for health
const TEMPO_BPM_MIN = FIB[6] * FIB[4];            // 24 BPM — lowest operational tempo
const TEMPO_BPM_MAX = FIB[8] * FIB[6];            // 168 BPM — maximum healthy tempo
const HARMONIC_ANALYSIS_WINDOW_MS = FIB[6] * 1000; // 8s analysis window
const MIDI_CHANNEL_SERVICES = 1;                   // MIDI channel 1 for service metrics
const MIDI_CHANNEL_AGENTS = 2;                     // MIDI channel 2 for agent metrics
const MIDI_CHANNEL_CONTROL = 3;                    // MIDI channel 3 for control input
const MAX_POLYPHONY = FIB[7];                      // 13 simultaneous service voices
```

## Instructions

### 1. Frequency Mapper

Maps system metrics to musical frequencies:

```javascript
class FrequencyMapper {
  constructor() {
    this.serviceNotes = new Map(); // serviceId → MIDI note assignment
    this.noteAssignmentIndex = 0;
  }

  mapLoadToFrequency(loadPercent) {
    // Load 0-1 maps to frequency range using harmonic series
    // 0% = rest, 25% = sub-harmonic, 50% = root, 75% = fifth, 100% = octave
    if (loadPercent < 0.01) return 0; // Silence
    return BASE_FREQUENCY_HZ * Math.pow(OCTAVE_RATIO, loadPercent);
  }

  mapLatencyToNote(latencyMs) {
    // Low latency = high notes (bright, happy), high latency = low notes (dark, heavy)
    const maxLatency = FIB[10] * 100; // 5500ms max
    const normalized = Math.min(1, latencyMs / maxLatency);
    const midiNote = Math.round(89 - normalized * FIB[8] * 2); // MIDI 47-89 range
    return Math.max(21, Math.min(108, midiNote));
  }

  mapErrorRateToDissonance(errorRate) {
    // 0% errors = perfect consonance, 100% = maximum dissonance
    // Returns interval ratio — closer to simple ratio = more consonant
    if (errorRate < 0.01) return OCTAVE_RATIO;          // Perfect octave — pure
    if (errorRate < PSI * PSI) return FIFTH_RATIO;       // Perfect fifth — healthy
    if (errorRate < PSI) return FOURTH_RATIO;            // Perfect fourth — strained
    if (errorRate < 0.809) return MAJOR_THIRD_RATIO;     // Major third — warning
    return Math.sqrt(2);                                  // Tritone (devil's interval) — critical
  }

  mapQueueDepthToTempo(queueDepth) {
    // Empty queue = slow tempo (relaxed), deep queue = fast tempo (urgent)
    const maxQueue = FIB[8] * FIB[5]; // 105
    const normalized = Math.min(1, queueDepth / maxQueue);
    return TEMPO_BPM_MIN + normalized * (TEMPO_BPM_MAX - TEMPO_BPM_MIN);
  }

  assignServiceNote(serviceId) {
    if (!this.serviceNotes.has(serviceId)) {
      // Assign notes from a φ-spaced scale
      const scaleNotes = [60, 64, 67, 69, 72, 76, 79, 81, 84, 88, 91, 93, 96];
      const note = scaleNotes[this.noteAssignmentIndex % scaleNotes.length];
      this.serviceNotes.set(serviceId, note);
      this.noteAssignmentIndex += 1;
    }
    return this.serviceNotes.get(serviceId);
  }
}
```

### 2. Harmonic Analyzer

Detects consonance, dissonance, and harmonic patterns in system behavior:

```javascript
class HarmonicAnalyzer {
  constructor({ frequencyMapper, logger }) {
    this.frequencyMapper = frequencyMapper;
    this.logger = logger;
    this.metricsWindow = [];
  }

  analyze(serviceMetrics) {
    // Convert all service loads to frequencies
    const frequencies = serviceMetrics.map(s => ({
      serviceId: s.id,
      frequency: this.frequencyMapper.mapLoadToFrequency(s.load),
      load: s.load,
      latency: s.latencyMs,
      errorRate: s.errorRate,
    }));

    // Analyze frequency ratios between services
    const intervals = this.computeIntervals(frequencies);
    const consonance = this.measureConsonance(intervals);
    const dissonance = this.measureDissonance(intervals);
    const tempo = this.frequencyMapper.mapQueueDepthToTempo(
      serviceMetrics.reduce((sum, s) => sum + (s.queueDepth || 0), 0)
    );

    return {
      frequencies,
      intervals,
      consonanceScore: consonance,
      dissonanceScore: dissonance,
      tempo,
      isHealthy: consonance >= CONSONANCE_MINIMUM,
      needsIntervention: dissonance >= DISSONANCE_THRESHOLD,
      chord: this.identifyChord(frequencies),
    };
  }

  computeIntervals(frequencies) {
    const intervals = [];
    const active = frequencies.filter(f => f.frequency > 0);

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const ratio = active[i].frequency / active[j].frequency;
        const normalizedRatio = ratio > 1 ? ratio : 1 / ratio;

        intervals.push({
          serviceA: active[i].serviceId,
          serviceB: active[j].serviceId,
          ratio: normalizedRatio,
          intervalName: this.nameInterval(normalizedRatio),
          consonance: this.intervalConsonance(normalizedRatio),
        });
      }
    }

    return intervals;
  }

  nameInterval(ratio) {
    const tolerance = 0.05;
    if (Math.abs(ratio - 1) < tolerance) return 'unison';
    if (Math.abs(ratio - MINOR_THIRD_RATIO) < tolerance) return 'minor-third';
    if (Math.abs(ratio - MAJOR_THIRD_RATIO) < tolerance) return 'major-third';
    if (Math.abs(ratio - FOURTH_RATIO) < tolerance) return 'perfect-fourth';
    if (Math.abs(ratio - Math.sqrt(2)) < tolerance) return 'tritone';
    if (Math.abs(ratio - FIFTH_RATIO) < tolerance) return 'perfect-fifth';
    if (Math.abs(ratio - PHI) < tolerance) return 'phi-interval';
    if (Math.abs(ratio - OCTAVE_RATIO) < tolerance) return 'octave';
    return 'non-harmonic';
  }

  intervalConsonance(ratio) {
    // Consonance based on simplicity of frequency ratio
    // Euler's gradus function approximation
    const simpleRatios = [1, 2, 1.5, 4/3, 5/4, 6/5, 5/3, 8/5, PHI];
    let minDistance = Infinity;
    for (const simple of simpleRatios) {
      const dist = Math.abs(ratio - simple);
      if (dist < minDistance) minDistance = dist;
    }
    return Math.max(0, 1 - minDistance * PHI);
  }

  measureConsonance(intervals) {
    if (intervals.length === 0) return 1.0;
    return intervals.reduce((sum, i) => sum + i.consonance, 0) / intervals.length;
  }

  measureDissonance(intervals) {
    return 1 - this.measureConsonance(intervals);
  }

  identifyChord(frequencies) {
    const active = frequencies.filter(f => f.frequency > 0).sort((a, b) => a.frequency - b.frequency);
    if (active.length < 2) return 'single-note';
    if (active.length < 3) return 'interval';

    // Check for common chord patterns
    const root = active[0].frequency;
    const intervals = active.map(f => f.frequency / root);

    const hasMajorThird = intervals.some(r => Math.abs(r - MAJOR_THIRD_RATIO) < 0.1);
    const hasMinorThird = intervals.some(r => Math.abs(r - MINOR_THIRD_RATIO) < 0.1);
    const hasFifth = intervals.some(r => Math.abs(r - FIFTH_RATIO) < 0.1);

    if (hasMajorThird && hasFifth) return 'major';
    if (hasMinorThird && hasFifth) return 'minor';
    if (hasFifth) return 'power';
    return 'cluster';
  }
}
```

### 3. Harmonic Scaling Engine

Makes scaling decisions based on harmonic analysis:

```javascript
class HarmonicScalingEngine {
  constructor({ analyzer, scalingExecutor, midiOutput, logger }) {
    this.analyzer = analyzer;
    this.executor = scalingExecutor;
    this.midi = midiOutput;
    this.logger = logger;
    this.scalingHistory = [];
  }

  async evaluate(serviceMetrics) {
    const analysis = this.analyzer.analyze(serviceMetrics);
    const decisions = [];

    for (const svc of serviceMetrics) {
      const decision = this.decideForService(svc, analysis);
      if (decision.action !== 'hold') decisions.push(decision);
    }

    // Execute all scaling decisions
    for (const decision of decisions) {
      await this.executor.execute(decision);
      this.scalingHistory.push({ ...decision, timestamp: Date.now() });
    }

    // Send MIDI feedback
    await this.sendMIDIState(analysis);

    return { analysis, decisions };
  }

  decideForService(service, analysis) {
    const load = service.load;
    const errorRate = service.errorRate || 0;

    // Octave Rule — double capacity at φ load threshold
    if (load >= SCALE_UP_LOAD) {
      return {
        serviceId: service.id,
        action: 'scale-up',
        rule: 'octave',
        factor: OCTAVE_RATIO,
        reason: `Load ${(load * 100).toFixed(1)}% exceeds φ threshold (${(SCALE_UP_LOAD * 100).toFixed(1)}%)`,
      };
    }

    // Scale down when load drops below ψ² threshold
    if (load < SCALE_DOWN_LOAD && service.replicas > 1) {
      return {
        serviceId: service.id,
        action: 'scale-down',
        rule: 'rest',
        factor: PSI,
        reason: `Load ${(load * 100).toFixed(1)}% below rest threshold (${(SCALE_DOWN_LOAD * 100).toFixed(1)}%)`,
      };
    }

    // Dissonance intervention — error rate creating dissonant intervals
    if (analysis.needsIntervention) {
      const svcIntervals = analysis.intervals.filter(
        i => i.serviceA === service.id || i.serviceB === service.id
      );
      const worstInterval = svcIntervals.sort((a, b) => a.consonance - b.consonance)[0];
      if (worstInterval && worstInterval.consonance < CONSONANCE_MINIMUM) {
        return {
          serviceId: service.id,
          action: 'rebalance',
          rule: 'dissonance-resolution',
          targetRatio: FIFTH_RATIO,
          reason: `Dissonant interval (${worstInterval.intervalName}) with ${worstInterval.serviceA === service.id ? worstInterval.serviceB : worstInterval.serviceA}`,
        };
      }
    }

    return { serviceId: service.id, action: 'hold', rule: 'consonant' };
  }

  async sendMIDIState(analysis) {
    if (!this.midi) return;

    // Send frequency data as MIDI notes
    for (const freq of analysis.frequencies) {
      const note = this.analyzer.frequencyMapper.assignServiceNote(freq.serviceId);
      const velocity = Math.round(freq.load * 127); // Velocity = load intensity
      await this.midi.noteOn(MIDI_CHANNEL_SERVICES, note, velocity);
    }

    // Send consonance as CC message
    const consonanceCC = Math.round(analysis.consonanceScore * 127);
    await this.midi.controlChange(MIDI_CHANNEL_SERVICES, 1, consonanceCC); // CC1 = mod wheel

    // Send tempo
    await this.midi.setTempo(analysis.tempo);
  }
}
```

### 4. MIDI Control Input

Accept MIDI hardware input for live system tuning:

```javascript
class MIDIControlInput {
  constructor({ scalingEngine, logger }) {
    this.scalingEngine = scalingEngine;
    this.logger = logger;
    this.ccMappings = {
      7:  'master-scale-factor',    // Volume fader → global scale multiplier
      1:  'consonance-target',      // Mod wheel → target consonance level
      74: 'dissonance-tolerance',   // Filter cutoff → how much dissonance to allow
      71: 'tempo-override',         // Resonance → override detected tempo
      73: 'attack-speed',           // Attack → how fast scaling responds
      72: 'release-speed',          // Release → how fast scale-down happens
    };
  }

  handleControlChange(channel, cc, value) {
    if (channel !== MIDI_CHANNEL_CONTROL) return;

    const param = this.ccMappings[cc];
    if (!param) return;

    const normalized = value / 127; // MIDI 0-127 → 0-1

    switch (param) {
      case 'master-scale-factor':
        // Fader up = allow more replicas, down = constrain
        this.scalingEngine.setMaxScaleFactor(1 + normalized * (PHI - 1));
        break;
      case 'consonance-target':
        // Mod wheel adjusts target consonance
        this.scalingEngine.setConsonanceTarget(0.500 + normalized * (0.927 - 0.500));
        break;
      case 'dissonance-tolerance':
        // Filter = how much dissonance before intervention
        this.scalingEngine.setDissonanceTolerance(0.500 + normalized * (0.927 - 0.500));
        break;
      default:
        this.logger.info({ param, value: normalized }, 'midi-control-mapped');
    }
  }

  handleNoteOn(channel, note, velocity) {
    if (channel !== MIDI_CHANNEL_CONTROL) return;
    // Notes trigger manual scaling actions
    // C4 (60) = force rebalance, D4 (62) = snapshot, E4 (64) = reset
    if (note === 60) this.scalingEngine.forceRebalance();
    if (note === 62) this.scalingEngine.snapshot();
    if (note === 64) this.scalingEngine.reset();
  }
}
```

## Integration Points

| Heady Component | Harmonic Role |
|---|---|
| MIDI Bridge | Native integration — extends existing UDP/TCP/MCP MIDI pathways |
| Sacred Geometry | Node topology maps to chord voicings — Center=root, Inner=third, Outer=fifth |
| HeadyBuddy | Ambient sonification gives users an audio sense of system health |
| AutoSuccess | Pipeline tempo drives execution urgency |
| DreamEngine | Dream cycles follow circadian rhythm patterns mapped to harmonic cycles |
| SwarmEvolution | Agent populations resonate at swarm-level frequencies |

## API

```javascript
const { HarmonicScaling } = require('@heady/harmonic-scaling');

const harmonic = new HarmonicScaling({
  serviceRegistry,
  scalingExecutor,
  midiInput,
  midiOutput,
  logger: pinoLogger,
});

await harmonic.start();                   // Begin harmonic monitoring
const analysis = harmonic.analyze();       // Current harmonic state
harmonic.setConsonanceTarget(0.882);       // Adjust target consonance

harmonic.health();
await harmonic.shutdown();
```

## Health Endpoint

```json
{
  "status": "resonating",
  "coherenceScore": 0.891,
  "consonanceScore": 0.847,
  "dissonanceScore": 0.153,
  "currentChord": "major",
  "tempoBPM": 72,
  "activeVoices": 8,
  "scalingDecisionsLast24h": 34,
  "midiInputConnected": true,
  "midiOutputConnected": true,
  "baseFrequencyHz": 432,
  "version": "1.0.0"
}
```
