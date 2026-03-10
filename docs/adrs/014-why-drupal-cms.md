# ADR-014: Why Drupal CMS

## Status
Accepted

## Context
The Heady platform requires structured content management for 13 content types (articles, documentation, case studies, patents, events, grant programs, agent listings, investor updates, testimonials, FAQs, product catalogs, news releases, media assets). The CMS must support:
- Granular content modeling with custom fields
- REST/JSON:API for headless consumption
- Webhook integration for vector memory indexing
- RBAC with role-based editorial workflows
- Multilingual readiness (i18n)

## Decision
Use Drupal 10+ as the headless CMS backend. Content is authored in Drupal and consumed via JSON:API by all 9 websites. The VectorIndexer module fires webhooks on create/update/delete to trigger embedding via heady-embed.

## Consequences
**Benefits:**
- 13 content types with custom field configurations, revisions, and moderation workflows
- JSON:API module provides standards-compliant headless API with zero custom code
- Mature RBAC with roles: admin, editor, reviewer, author, authenticated, anonymous
- VectorIndexer webhook enables real-time content → embedding pipeline
- Multilingual module provides i18n without custom infrastructure
- 20+ year track record for enterprise content management

**Costs:**
- PHP runtime alongside Node.js services (isolated in its own container)
- Drupal updates require testing against custom modules
- Learning curve for developers unfamiliar with Drupal architecture

**Alternatives Considered:**
- Strapi: Lighter but weaker content modeling for 13 types
- Contentful: SaaS dependency conflicts with sovereign architecture
- Custom CMS: Reinventing solved problems; time better spent on AI capabilities

## References
- Drupal JSON:API specification
- HeadySystems VectorIndexer module documentation
- ADR-001: φ-Math Foundation (webhook intervals use φ-backoff)
