# MODULE 10 — UI ENGINEERING

> **ID:** `UI_ENGINEERING` | **Deps:** `CORE_IDENTITY`, `VERIFICATION_ENGINE`, `QUALITY_STANDARDS`  
> **Required by:** Frontend compositions, full-stack compositions  
> **Deterministic role:** Visual output is deterministic when every spacing value, color, and animation parameter is derived from the design system. Page delivery is deterministic when Drupal entities + Heady context always produce the same rendered output for the same inputs.

---

## Stack: Drupal 11+ / Heady / Vanilla Web Platform

Every UI component, page, and interactive element is built with:

- **Drupal 11+** — content types, entity system, Views, Twig templating, Form API, routing, permissions, JSON:API/GraphQL where needed, config management via `drush cex/cim`
- **Twig templates** — server-rendered HTML via Drupal's theme layer, extended with Heady Twig functions
- **Vanilla HTML5** — semantic elements, native `<dialog>`, `<details>`, `<popover>`, Web Components for encapsulation
- **Vanilla CSS3** — custom properties, `@layer`, `@scope`, `@container`, CSS nesting, view transitions, scroll-driven animations, subgrid
- **Vanilla JS (ES2024+)** — native modules via `<script type="module">`, Drupal behaviors (attach/detach lifecycle), Proxy for reactivity, Navigation API, Temporal API

**No React. No Vue. No Svelte. No Angular. No build tools. No bundlers. No transpilers.** The browser is the runtime. Drupal's Twig is the component model. The web platform is the interactivity framework. Drupal's `*.libraries.yml` manages CSS/JS assets natively.

**Drupal is the skeleton — structural, tested, permission-aware.** Heady is the nervous system — context-aware, adaptive, intelligent. The web platform is the skin — what the user sees and touches.

---

## Heady Dynamic Page Delivery

Pages are not static files. They are composed at request time by Heady's context-aware layer on top of Drupal's rendering pipeline.

```
REQUEST FLOW:
  Browser request
    → Drupal routing (path → content entity or view)
    → Drupal access check (permissions, roles, session)
    → Heady context resolver (enriches with 3D persistence state)
    → Drupal Twig rendering (assembles HTML via themed templates)
    → Heady page enhancer (injects dynamic blocks, capability-adapted code paths)
    → Heady state hydrator (embeds 3D persistence data for client-side JS)
    → Complete HTML document (fully rendered, functional without JS, zero build step)
```

**Server-composed, client-enhanced.** Initial HTML is complete and functional. JavaScript enhances interactivity but the page works without it. This is not SSR of a client app — it's a server-composed document that optionally upgrades.

**No build step.** JS modules loaded natively via `<script type="module">`. CSS loaded via `<link>` or `<style>`. The source IS the artifact.

**Three progressive layers:** HTML (semantic content — works alone), CSS (presentation — enhances HTML), JS (interactivity — enhances CSS+HTML). Each layer is independently functional.

### Heady ↔ Drupal Integration

A custom Drupal module (`heady_core`) provides:

**Twig functions** for template authors:
```twig
{% set prefs = heady_persist('user', current_user.id, 'preferences') %}
{% if heady_supports('view-transitions') %}
  <meta name="view-transition" content="same-origin">
{% endif %}
{{ heady_block('dashboard_summary', {context: 'workspace'}) }}
```

**Event subscribers** for request enrichment (`KernelEvents::REQUEST` for context injection, `KernelEvents::RESPONSE` for capability headers, entity lifecycle hooks for 3D persistence sync).

**Drupal behaviors** for client-side JS:
```javascript
Drupal.behaviors.headyWidget = {
  attach(context, settings) {
    const widgets = once('heady-widget', '[data-heady-widget]', context);
    widgets.forEach(async (el) => {
      const state = await Heady.persistence.resolve(el.dataset.headyPersist);
      // Cutting-edge first, fallback gracefully
      if (CSS.supports('view-transition-name', 'widget')) {
        document.startViewTransition(() => render(el, state));
      } else {
        render(el, state);
      }
      Heady.persistence.subscribe(el.dataset.headyPersist, (s) => render(el, s));
    });
  },
  detach(context) {
    once.find('heady-widget', context).forEach(
      el => Heady.persistence.unsubscribe(el.dataset.headyPersist)
    );
  }
};
```

---

## 3D Persistence Storage

User state lives in a three-dimensional vector-addressable persistence layer organized along three axes.

**Dimension 1 — Identity (WHO).** The entity: user, org, team, service account, or anonymous session. Hierarchical: `org.acme → team.eng → user.alice`.

**Dimension 2 — Context (WHAT).** The domain or task. Maps to Drupal taxonomy and content types: `workspace.projectX → dashboard.analytics → widget.throughput`. Same user, different state in different contexts, no collision.

**Dimension 3 — Time (WHEN/VERSION).** Every write appends a new time-versioned entry. Nothing is overwritten. Full version history, point-in-time recovery, rewind to any prior state.

### Addressing

```
[identity].[context].[key]@[time]

user.alice.workspace.projectX.dashboard.layout@latest
user.alice.auth.github.credentials@latest
team.eng.preferences.theme@2025-06-15T10:00:00Z
org.acme.config.integrations.slack@latest
```

`@latest` → most recent. Timestamps → state at that point. Ranges (`@2025-01..2025-06`) → version history.

### Drupal Integration

```
Field storage plugin   → entity fields backed by 3D persistence vectors
Views data plugin      → query persistence in Drupal Views UI
JSON:API resource      → HTTP read/write with Drupal auth/permissions
Event subscriber       → sync entity changes to persistence layer
Twig function          → read persistence data in templates
Form handler           → write persistence data from Drupal forms
Migration source       → import existing Drupal data into 3D persistence
```

---

## Cross-Site Task Execution

Heady-delivered Drupal pages can perform tasks on external sites through authenticated schemas stored in 3D persistence.

**Auth schema storage:**
```
Vector: user.[userId].auth.[serviceId]@latest
Payload: {
  type: "oauth2" | "apikey" | "session" | "webhook",
  credentials: { /* encrypted at rest */ },
  scopes: [...],
  expiry: timestamp,
  refreshMechanism: { /* type-specific */ },
  lastUsed: timestamp,
  lastVerified: timestamp
}
```

**Execution flow:**
1. User authenticates to Drupal (session, Heady resolves 3D context)
2. User initiates external action via Drupal form or Heady UI block
3. Heady resolves auth from `user.[id].auth.[service]@latest`
4. OAuth2 → retrieve/refresh token | API key → decrypt | Session → proxy | Webhook → sign
5. Heady executes via appropriate protocol
6. Response back to browser via SSE or WebSocket
7. 3D persistence updated (new time-versioned entry)
8. Drupal behavior re-renders affected region (View Transitions if supported)
9. Drupal watchdog logs action with correlation ID

---

## Design System

Implemented as CSS custom properties in the Drupal theme's base stylesheet. Every visual value comes from these tokens — zero one-off values in component styles.

```css
/* heady_theme/css/tokens.css */
:root {
  /* Spacing — Fibonacci */
  --space-3xs: 2px;  --space-2xs: 3px;  --space-xs: 5px;
  --space-sm: 8px;   --space-md: 13px;  --space-lg: 21px;
  --space-xl: 34px;  --space-2xl: 55px; --space-3xl: 89px;

  /* Typography — Golden Ratio from 1rem */
  --text-xs: 0.618rem; --text-sm: 0.786rem; --text-base: 1rem;
  --text-lg: 1.272rem; --text-xl: 1.618rem; --text-2xl: 2.618rem;
  --text-3xl: 4.236rem;

  /* Semantic Colors */
  --color-action-primary: #00d4aa;
  --color-action-secondary: #6366f1;
  --color-action-destructive: #ef4444;
  --color-action-disabled: #4a4a5a;
  --color-feedback-success: #22c55e;
  --color-feedback-warning: #f59e0b;
  --color-feedback-error: #ef4444;
  --color-feedback-info: #3b82f6;
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-elevated: rgba(255,255,255,0.03);
  --color-bg-glass: rgba(255,255,255,0.05);
  --color-text-primary: #e8e8f0;
  --color-text-secondary: #9898a8;
  --color-text-muted: #68687a;
  --color-border-default: rgba(255,255,255,0.08);
  --color-border-focus: var(--color-action-primary);

  /* Motion — φ-derived easing */
  --ease: cubic-bezier(0.618, 0, 0.382, 1);
  --dur-fast: 150ms; --dur-normal: 300ms; --dur-slow: 500ms;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-normal: 0ms; --dur-slow: 0ms; }
}

.glass {
  background: var(--color-bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border-default);
  border-radius: var(--space-md);
}
```

## The Five States

Every component handles all five. Incomplete state coverage is a bug.

**Empty** — guidance or call-to-action, never blank. Use Drupal Views "no results" template.  
**Loading** — CSS skeleton screens within 200ms. Drupal BigPipe handles slow blocks natively.  
**Error** — clear message + recovery action. Never raw exceptions. Drupal custom error pages.  
**Populated** — the happy path.  
**Edge** — 1 item vs 10,000. 2-char names vs 200. Unicode, emoji, RTL text.

## Accessibility (WCAG AA, Non-Negotiable)

Semantic HTML — correct elements, Drupal Form API's accessible output preserved. Keyboard navigation — all interactive elements reachable, tab order follows visual order. Screen readers — `Drupal.announce()` for dynamic changes, `<label>` on all fields, `aria-describedby` for errors. Color contrast — 4.5:1 text, 3:1 components. Motion — `prefers-reduced-motion` zeroes durations.

## Cutting-Edge-First Technology Selection

```
1. Does the newest platform API solve this? → Use it.
   (View Transitions, @scope, Popover, <dialog>, subgrid,
    scroll-driven animations, CSS nesting, @container)
2. Does the browser support it? → Feature-detect (@supports, typeof)
3. Not supported? → Graceful fallback to nearest stable equivalent.
4. NEVER start with the fallback. Start with the frontier.
```

## UI Verification Extension

Added to MODULE 04:

```
□ All five states render correctly per component
□ All form fields validate on blur with specific messages
□ All interactive elements have hover/focus/active/disabled states
□ 100% design system token usage (0 one-off values)
□ WCAG AA: color contrast, keyboard nav, screen reader, reduced motion
□ Responsive at 320, 768, 1024, 1440px
□ Pages functional without JavaScript (progressive enhancement)
□ Drupal behaviors attach/detach correctly on dynamic content
□ 3D persistence read/write/subscribe verified
□ Cross-site execution: auth resolved, actions completed, UI updated
□ Zero React/framework/build-tool artifacts in delivered output
□ Drupal config export (drush cex) clean and deployable
□ Cutting-edge features detected, fallback paths tested
```

**Affirmation:** `UI: VERIFIED — 5/5 states, WCAG AA, 100% tokens, 0 framework deps, Drupal+Heady delivery confirmed`
