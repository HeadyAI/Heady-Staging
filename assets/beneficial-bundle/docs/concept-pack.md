
# Heady concept pack

This pack is intentionally biased toward animated, interactive, user-facing surfaces because Hugging Face Spaces is useful for interactive AI demos, visual experiences, and browser-based apps ([Hugging Face Spaces](https://huggingface.co/spaces)).

The visual motion direction also leans into animated data storytelling because Vizzu is built specifically for animated data visualizations and data stories with seamless transitions ([Vizzu](https://github.com/vizzuhq/vizzu-lib)).

For time-series storytelling, the pack borrows the idea of fast, expressive motion layers because sjvisualizer focuses on animated time-series visuals and easy output of motion-based data stories ([sjvisualizer](https://github.com/SjoerdTilmans/sjvisualizer)).

The widget concepts also assume small, powerful, composable dashboard surfaces because AWS CloudWatch Custom Widgets demonstrate that compact HTML, SVG, and lightweight controls can produce highly flexible custom data views ([CloudWatch Custom Widgets Samples](https://github.com/aws-samples/cloudwatch-custom-widgets-samples)).

The MCP service ideas lean toward protocol-native servers, SDK-aware tools, inspector-style testing, auth extensions, and UI-facing app layers because the Model Context Protocol organization explicitly centers its work around servers, SDKs, conformance, inspector tooling, auth extensions, and app-facing protocol components ([Model Context Protocol on GitHub](https://github.com/modelcontextprotocol)).

## MCP services

### Signal Weave MCP
- Purpose: merges system metrics, event streams, and user state into one UI-ready event feed.
- Why it is useful: gives Discord bots, dashboards, and HeadyBuddy a single live stream for beautiful status surfaces.
- Inputs: service health, agent lifecycle events, queue depth, user session context.
- Outputs: normalized event cards, sparkline data, severity labels, icon hints, color-state recommendations.

### Skill Graph MCP
- Purpose: exposes skills, triggers, overlaps, related repos, and recommended compositions as a graph.
- Why it is useful: turns scattered skills into discoverable building blocks for operators and agents.
- Inputs: skill manifests, trigger vocabularies, dependency hints.
- Outputs: graph edges, recommended bundles, missing-skill gaps, auto-suggested next skills.

### Tool Witness MCP
- Purpose: records tool invocations, outcomes, latency, and confidence receipts into a visual audit stream.
- Why it is useful: perfect for glass-box status walls and trust receipts inside Heady UIs.
- Inputs: tool calls, timestamps, result hashes, user-facing summaries.
- Outputs: signed event traces, confidence badges, replayable timelines.

### Repo Radar MCP
- Purpose: watches target repos for issue clusters, stale areas, hot files, and pattern emergence.
- Why it is useful: gives the swarm a living map of where attention is needed next.
- Inputs: issues, labels, pull request metadata, changelog signals.
- Outputs: heatmaps, refactor candidates, swarm task seeds.

### Discord Resonance MCP
- Purpose: translates system state into Discord-native messages, role badge updates, banner states, and embed payloads.
- Why it is useful: lets Heady feel alive in Discord instead of posting plain text.
- Inputs: incidents, releases, uptime deltas, skill launches, swarm milestones.
- Outputs: embed themes, server banner states, badge toggles, message packs.

### Pattern Forge MCP
- Purpose: mines successful workflows and turns them into reusable patterns, templates, and starter prompts.
- Why it is useful: compounds what works and lowers friction for new builds.
- Inputs: completed tasks, outputs, timing, validation notes.
- Outputs: pattern cards, starter templates, risk notes, recommended adaptations.

### Context Diffuser MCP
- Purpose: splits a large context into reusable micro-context capsules for specialized bees and services.
- Why it is useful: better handoffs, less repetition, easier multi-agent coordination.
- Inputs: project brief, artifacts, repo metadata, user preferences.
- Outputs: role-tuned context slices and relevance scores.

### Presence Mesh MCP
- Purpose: tracks where the user is active across browser, IDE, Discord, dashboard, and mobile surfaces.
- Why it is useful: lets Heady route the right amount of UI and messaging to the right surface.
- Inputs: session pings, focus events, device identity, active tasks.
- Outputs: presence model, interruption budget, preferred delivery surface.

### Demo Forge MCP
- Purpose: generates demo-ready payloads, screenshots, embed previews, and launch snippets for new ideas.
- Why it is useful: reduces the distance between concept and impressive shareable artifact.
- Inputs: feature spec, theme pack, target platform.
- Outputs: preview bundles, seed data, hero copy, asset manifests.

### Memory Mosaic MCP
- Purpose: turns persistent memory into visual narrative blocks for onboarding, companion state, and project continuity.
- Why it is useful: makes long-term memory visible and user-beneficial.
- Inputs: memory facts, events, preferences, project milestones.
- Outputs: timeline cards, topic clusters, briefing summaries.

### Multi-Source Confidence MCP
- Purpose: compares signals from web, repos, docs, dashboards, and connectors and returns a visual confidence map.
- Why it is useful: keeps high-energy UIs grounded instead of decorative.
- Inputs: retrieved evidence and source weights.
- Outputs: confidence overlays, disagreement flags, source bundles.

### Effect Composer MCP
- Purpose: chooses the right motion layer, gradient mode, density, and accessibility profile for a given UI surface.
- Why it is useful: gives all Heady interfaces a coherent motion language.
- Inputs: component type, urgency, density, device context, accessibility settings.
- Outputs: effect tokens, CSS variables, animation presets, reduced-motion fallback.

## HeadyBees

### Signal Bee
- Owns user-facing pulse states, hero cards, badge glow, and quick insight surfaces.

### Tool Bee
- Translates tool activity into visualized progress and safe-action cues.

### Recall Bee
- Surfaces memory snapshots and continuity hints at exactly the right moment.

### Pattern Bee
- Spots repeatable wins and drafts reusable system patterns automatically.

### Lens Bee
- Builds little glass dashboards, sidecars, and overlays from normalized data.

### Guard Bee
- Adds trust, consent, and state clarity before high-impact actions.

### Scout Bee
- Gathers new external signals and prepares them for the swarm.

### Comms Bee
- Packages updates for Discord, email, dashboards, and user-facing summaries.

### Forge Bee
- Creates preview assets, banners, icons, screenshots, and launch visuals.

### Judge Bee
- Runs a compact consensus pass when multiple sources or agents disagree.

### Echo Bee
- Rephrases technical state into concise, emotionally clean user language.

### Pulse Bee
- Watches for shifts worth notifying users about and suppresses the rest.

## HeadySwarms

### Onboarding Swarm
- Converts a first-time user from curiosity to useful setup in one guided arc.

### Presence Swarm
- Coordinates device state, focus, companion surfaces, and interruption control.

### Signal Swarm
- Owns dashboards, embeds, badges, alerts, and telemetry art direction.

### Build Swarm
- Moves from concept to asset pack to live demo with minimal friction.

### Protocol Swarm
- Designs, tests, and evolves MCP services, SDK hooks, and app bridges.

### Skill Swarm
- Generates, reviews, refines, and bundles new Perplexity skills.

### Continuity Swarm
- Maintains long-lived project memory, summaries, and resumption packets.

### Trust Swarm
- Handles receipts, audit trails, confirmations, and user-safe framing.

## Perplexity skill ideas

### discord-ops-designer
- Creates Discord embed packs, banners, role badges, launch kits, and moderation visuals.
- Trigger words: discord, community, embed, badge, banner, launch kit.

### live-signal-surface-builder
- Builds animated status surfaces from metrics, logs, and event streams.
- Trigger words: status wall, telemetry, dashboard, glass UI, live signals.

### mcp-service-inventor
- Generates practical MCP service concepts, schemas, and rollout ideas.
- Trigger words: MCP, tool server, protocol, integration, service idea.

### swarm-role-cartographer
- Maps agent roles into bees, swarms, states, and handoff diagrams.
- Trigger words: swarm, bee, orchestration, agent roles, handoff.

### visual-memory-stylist
- Turns memory or project history into timelines, profile cards, and continuity UIs.
- Trigger words: memory, timeline, continuity, project state, profile surface.

### demo-launch-forge
- Produces demo bundles with hero copy, mock data, preview assets, and screenshots.
- Trigger words: demo, launch, showcase, preview, teaser.

### connector-experience-architect
- Designs how connector-backed data should feel inside UI, not just how it should function.
- Trigger words: connector, integration UX, data surface, workflow UI.

### protocol-observability-designer
- Creates visual patterns for receipts, traces, conformance, and safe-action status.
- Trigger words: observability, trace, receipt, audit, protocol testing.

### discord-presence-director
- Plans how bots, channels, banners, and status cards shift with real system state.
- Trigger words: Discord presence, bot persona, community ops, status cards.

### skill-ecosystem-expander
- Finds gaps in an existing skill library and proposes high-leverage additions.
- Trigger words: skill gap, prompt library, automation skill, new skill ideas.

### artifact-packager
- Bundles images, SVGs, docs, previews, manifests, and zips into shareable packs.
- Trigger words: pack, zip, bundle, assets, distribution.

### ui-motion-conductor
- Picks tasteful color-shift motion and accessibility-safe animation for interfaces.
- Trigger words: motion system, glow, effect, color-shift, animated UI.

## Visual direction notes

- Use dark surfaces with restrained glass depth so the glow feels intentional, not noisy.
- Use color change to signal state, freshness, or confidence rather than pure decoration.
- Favor SVG and lightweight HTML over heavyweight stacks for fast reuse.
- Keep motion meaningful and provide reduced-motion fallbacks.
