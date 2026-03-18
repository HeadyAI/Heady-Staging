
# MCP starter specs

These service starters assume protocol-native, testable services because the Model Context Protocol org centers its ecosystem around servers, SDKs, inspector tooling, auth extensions, and examples ([Model Context Protocol on GitHub](https://github.com/modelcontextprotocol)).

They also assume visual testing should be part of the design loop because MCP Inspector is explicitly a visual testing and debugging tool for MCP servers with transport-aware exploration and config export support ([MCP Inspector](https://github.com/modelcontextprotocol/inspector)).

For UI-bearing services, these specs assume embedded interactive surfaces because MCP Apps extends MCP with `ui://` resources for inline sandboxed UIs inside chat hosts ([MCP Apps](https://github.com/modelcontextprotocol/ext-apps)).

For hosted demos and fast user-visible prototypes, these specs assume Hugging Face Spaces is practical because Spaces supports Gradio, Docker, and static HTML plus repository-based deployment ([Hugging Face Spaces overview](https://huggingface.co/docs/hub/spaces-overview)).

## Signal Weave MCP starter
- Mission: normalize service health, event flow, queue state, and user attention into one consumable live signal model.
- Tool groups:
  - `get_signal_snapshot`
  - `list_signal_channels`
  - `stream_signal_events`
  - `get_ui_theme_recommendation`
- Resource ideas:
  - `ui://signal/board`
  - `ui://signal/card`
  - `ui://signal/timeline`
- Data contracts:
  - channel id, label, freshness, severity, source count, confidence, accent color, sparkline points
- First UI surface:
  - glass telemetry panel, top channels list, confidence badges, user-facing summary rail

## Skill Graph MCP starter
- Mission: expose skill relationships, overlaps, triggers, and suggested compositions as a graph and explorer.
- Tool groups:
  - `search_skills`
  - `get_skill_neighbors`
  - `suggest_skill_bundle`
  - `find_skill_gaps`
- Resource ideas:
  - `ui://skills/graph`
  - `ui://skills/card-grid`
  - `ui://skills/gap-report`
- Data contracts:
  - skill id, summary, trigger words, upstream dependencies, sibling skills, confidence, status

## Discord Resonance MCP starter
- Mission: translate system state into Discord-native surfaces and publishable payloads.
- Tool groups:
  - `get_discord_embed_pack`
  - `get_role_badge_state`
  - `get_banner_state`
  - `get_release_message_pack`
- Resource ideas:
  - `ui://discord/banner-preview`
  - `ui://discord/embed-preview`
- Data contracts:
  - tone, urgency, accent mode, message templates, badge labels, image asset references

## Pattern Forge MCP starter
- Mission: turn successful workflows into reusable patterns, templates, and starter prompts.
- Tool groups:
  - `draft_pattern_card`
  - `extract_pattern_candidates`
  - `suggest_pattern_variants`
  - `package_pattern_bundle`
- Resource ideas:
  - `ui://patterns/card`
  - `ui://patterns/compare`
  - `ui://patterns/lineage`

## Presence Mesh MCP starter
- Mission: decide where and how Heady should surface state based on user context and device activity.
- Tool groups:
  - `get_presence_summary`
  - `get_interruption_budget`
  - `select_surface`
  - `explain_surface_choice`
- Resource ideas:
  - `ui://presence/map`
  - `ui://presence/timeline`
