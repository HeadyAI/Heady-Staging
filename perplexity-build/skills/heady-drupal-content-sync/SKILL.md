---
name: heady-drupal-content-sync
title: Heady Drupal Content Sync
description: Skill for syncing Drupal CMS content with HeadyAutoContext vector memory
triggers: drupal, CMS, content sync, JSON:API, headless
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Drupal Content Sync

Skill for syncing Drupal CMS content with HeadyAutoContext vector memory

## Purpose
Synchronize headless Drupal CMS content with HeadyAutoContext's 384-dimensional vector memory for semantic search across all content.

## Architecture
- Drupal at cms.headysystems.com serves JSON:API
- Content types: article, documentation, case_study, patent, event, grant_program, agent_listing, investor_update, faq, product_catalog, news_release, testimonial, media_asset
- Webhook: hook_entity_update fires on every content change
- Polling fallback: check for updates every 5-15 minutes (φ-scaled)
- Vector indexing: embed content via heady-embed service (384-dim)
- Storage: pgvector with HNSW indexing

## Sync Flow
1. Drupal webhook fires on entity create/update/delete
2. heady-drupal-fetch.js retrieves full entity via JSON:API
3. Content extracted, cleaned, chunked (Fibonacci-sized chunks)
4. Each chunk embedded via heady-embed (384-dim vectors)
5. Vectors stored in pgvector with source metadata
6. HeadyAutoContext cache invalidated for affected pages
7. CSL relevance gates updated for new content

## Content Type Mapping
```javascript
const DRUPAL_CONTENT_TYPES = [
  'article', 'documentation', 'case_study', 'patent',
  'event', 'grant_program', 'agent_listing', 'investor_update',
  'faq', 'product_catalog', 'news_release', 'testimonial', 'media_asset'
];
```


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
