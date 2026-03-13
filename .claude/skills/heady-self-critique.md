# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Self-Critique & Improvement Loop
# HEADY_BRAND:END

# /heady-critique — Self-Critique & Continuous Improvement

Triggered when user says `/heady-critique` or asks for self-analysis,
bottleneck diagnostics, or improvement suggestions.

## Instructions

You are executing the Heady Self-Critique protocol — the system's
self-awareness loop that identifies weaknesses and proposes improvements.

### Self-Critique Loop (answer → critique → refine → learn)

#### Step 1: Record Run Critique
Analyze the current state of the codebase:
1. Review recent changes (git log, git diff)
2. Identify patterns in what's working vs what's not
3. Check if previous improvement suggestions were implemented
4. Rate current system health based on observable signals

#### Step 2: Diagnose Bottlenecks
Scan for all 7 bottleneck categories from `configs/system-self-awareness.yaml`:

| Category | Question to Ask |
|----------|----------------|
| Hidden bottlenecks | Is one step, role, or file throttling everything? |
| Fuzzy goals | Are we busy but not aligned on specific outcomes? |
| Bad work sequencing | Are tasks in wrong order? Dependencies unmapped? |
| Communication drag | Too many async threads? Unclear ownership? |
| Under/over-utilization | Some modules overloaded while others are idle? |
| Process creep | Adding overhead without pruning old processes? |
| Cultural blockers | Perfectionism preventing shipping? |

#### Step 3: Identify Improvement Candidates
For each bottleneck found:
- Name the specific improvement
- Rate impact (1-10)
- Rate effort (1-10)
- Determine if it can be auto-applied or needs approval
- Map to pipeline stage and responsible agent

#### Step 4: Run Meta-Analysis
Every 5 interactions, summarize:
1. What is working well in assisting this user
2. What is NOT working well (verbosity, missing context, weak structure)
3. Concrete micro-upgrades to instructions, tool-use, or workflow

#### Step 5: Propose Experiments
Per the Monte Carlo mindset:
- Propose 2-3 small, cheap, reversible experiments
- State resource cost (time, effort, infra)
- State expected signal/learning
- State how learning feeds back into HCFullPipeline

### Standing Self-Check Questions
- What patterns am I currently using to shape behavior?
- Which patterns is the user signaling that I am NOT learning from?
- What one new rule or heuristic would improve pattern recognition?
- Are we using time and attention well?
- Are we spending tokens on low-value branches?
- Are we capturing learnings or letting them evaporate?

### Non-Optimization Assumption
Default stance: current behavior is NOT fully optimized.
- Rate confidence 1-10 per major claim
- Identify internal contradictions
- Flag vague or unsupported statements
- If answer to "what patterns am I using" is "none" → pattern recognition is failing

### Output Format
```
HEADY SELF-CRITIQUE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Health: [assessment]
Confidence: [1-10]

Bottlenecks Found:
1. [name] — Impact: [n]/10, Effort: [n]/10
   Fix: [specific action]

Weaknesses Identified:
1. [weakness]
2. [weakness]
3. [weakness]

Experiments Proposed:
1. [experiment] — Cost: [low/med/high], Signal: [what we'd learn]

Improvements Applied:
- [what was improved since last critique]

Meta-Analysis:
- Working well: [what]
- Not working: [what]
- Micro-upgrades: [specific changes]
```
