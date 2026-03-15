# System topology

## Surfaces
- 10 app surfaces live under `apps/`, including the central auth surface.
- 53 service packages live under `services/` across intelligence, agent, routing, integration, security, health, user-facing, pipeline, and specialized domains.

## Core flows
1. Browser surfaces load shared design, auth, AutoContext, sacred-geometry, navigation, and bee-injector packages.
2. User or service requests enter a service created with `services/shared/service-base.js`.
3. The shared base attaches correlation IDs, health endpoints, AutoContext middleware, bulkhead controls, and graceful shutdown behavior.
4. The AutoContext service enriches requests using indexed source material and CSL-style relevance scoring.
5. Domain services respond with operational metadata, dependency fanout, and context summaries.

## Critical boundaries
- Central auth runs on `auth.headysystems.com` and issues signed, httpOnly, Secure, SameSite=Strict cookies.
- Redirects are constrained by `ALLOWED_REDIRECT_HOSTS`.
- OAuth provider launch and callback handling stays inside `services/user-facing/heady-auth/index.js`.
- Drupal content indexing relies on the AutoContext API routes used by `services/external-integrations/drupal-sync/drupal-vector-sync.js`.
