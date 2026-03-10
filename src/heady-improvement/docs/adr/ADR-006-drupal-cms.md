# ADR-006: Drupal 11 for CMS

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Heady needs a content management system supporting 13 structured content types (article, documentation, case_study, patent, event, grant_program, agent_listing, investor_update, testimonial, faq, product_catalog, news_release, media_asset) with taxonomy, REST API, and webhook support.

## Decision

Use Drupal 11 with custom modules (heady_content, heady_cms, heady_admin, heady_control, heady_config, heady_sites, heady_tasks) for content management at admin.headysystems.com.

## Consequences

**Positive:** Powerful content modeling, built-in REST/JSON:API, taxonomy system, mature ecosystem, VectorIndexer webhook on CRUD  
**Negative:** PHP dependency alongside Node.js stack, heavier than headless CMS alternatives  
**Mitigations:** Drupal runs in isolated Docker container, communicates via REST API only, no PHP in the critical inference path
