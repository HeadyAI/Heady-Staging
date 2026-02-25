# Heady AI Nodes — Complete Roster

20 specialized AI nodes, each with a distinct role and provider backbone.

| # | Node | Provider | Role | Specialty |
|---|------|----------|------|-----------|
| 1 | **HeadyCoder** | Multi | Code generation & orchestration | Full-stack development, scaffolding |
| 2 | **HeadyClaude** | Anthropic Claude | Deep reasoning | Complex analysis, long-context tasks |
| 3 | **HeadyGemini** | Google Gemini | Multimodal generation | Text + image + video understanding |
| 4 | **HeadyGroq** | Groq | Ultra-fast inference | Speed-critical tasks, real-time chat |
| 5 | **HeadyOpenAI** | OpenAI GPT | General chat & function calling | Versatile tasks, tool use |
| 6 | **HeadyCodex** | OpenAI Codex | Code transformation | Legacy code modernization, docs |
| 7 | **HeadyCopilot** | Multi | Inline suggestions | Context-aware completions |
| 8 | **HeadyVinci** | Multi | Pattern recognition & prediction | ML, forecasting, trend analysis |
| 9 | **HeadyLens** | Multi | Visual analysis | Image processing, object detection |
| 10 | **HeadyPerplexity** | Perplexity Sonar | Deep research | Web research, academic, news |
| 11 | **HeadyBuddy** | Multi | Personal AI companion | Cross-device assistant, memory |
| 12 | **HeadyAnalyze** | Heady Brain | Code/text/security analysis | Review, security scanning |
| 13 | **HeadyRisks** | Heady Brain | Risk assessment | Vulnerability scanning, mitigation |
| 14 | **HeadyPatterns** | Heady Brain | Design pattern detection | Architecture analysis |
| 15 | **HeadySoul** | Heady Brain | Intelligence & learning | Optimization, continuous learning |
| 16 | **HeadyBattle** | Orchestrator | Arena Mode | Multi-node competition scoring |
| 17 | **HeadyJules** | Background Agent | Async background tasks | Long-running code tasks |
| 18 | **HeadyHuggingFace** | HuggingFace | Model inference & search | Open-source model access |
| 19 | **HeadyEdgeAI** | Cloudflare Workers AI | Edge inference | Sub-50ms latency AI at edge |
| 20 | **HeadyOrchestrator** | Internal | Trinity communication | Node coordination & alignment |

## Node Selection Strategy

Arena Mode selects nodes based on task type:

| Task Type | Primary Nodes | Fallback |
|-----------|---------------|----------|
| Code generation | HeadyCoder, HeadyClaude, HeadyCodex | HeadyOpenAI |
| Research | HeadyPerplexity, HeadyClaude | HeadyGemini |
| Visual analysis | HeadyLens, HeadyGemini | HeadyOpenAI |
| Speed-critical | HeadyGroq, HeadyEdgeAI | HeadyOpenAI |
| Security review | HeadyRisks, HeadyAnalyze | HeadyClaude |
| Creative | HeadyGemini, HeadyVinci | HeadyClaude |

## Leaderboard Tracking

Each node's performance is tracked across all Arena battles:

- **Win rate** — Percentage of battles won
- **Average score** — Mean score across all criteria
- **Speed rank** — Latency per token generated
- **Cost efficiency** — Quality-per-dollar ratio
- **Specialty score** — Performance within its designated domain
