---
name: heady-drupal-content-sync
description: Skill for syncing Drupal headless CMS content with HeadyAutoContext vector memory. Use when setting up Drupal integration, configuring webhook receivers, implementing JSON:API polling, indexing Drupal nodes into vector storage, or troubleshooting content sync issues. Official reference: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module. Triggers on "Drupal", "JSON:API", "CMS sync", "content indexing", "webhook from Drupal", or any Drupal integration task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: cms
---

# Heady Drupal Content Sync

## When to Use This Skill

Use this skill when:

- Setting up the Drupal webhook receiver at `POST /webhook/drupal`
- Configuring JSON:API polling for content change detection
- Indexing any of the 13 Drupal content types into vector memory
- Troubleshooting content sync delays or missed updates
- Configuring Drupal `hook_entity_update` to fire webhooks
- Managing the `drupal-sync` service at port 8809

## Architecture

```
Drupal CMS (cms.headysystems.com)
  │
  ├── hook_entity_update → POST /webhook/drupal (real-time, preferred)
  │     HMAC-SHA256 signature: X-Drupal-Signature: sha256={hex}
  │
  └── JSON:API polling (fallback, 5-15 min phi-adaptive interval)
        GET /jsonapi/node/{type}?filter[changed]>{lastPoll}

Webhook/Polling receiver (drupal-sync service, port 8809)
  │
  ├── Verify HMAC signature (timing-safe comparison)
  ├── Fetch full node via JSON:API
  ├── Extract: title, body, summary, tags, URL, changed
  ├── Batch in groups of 13 (fib(7))
  └── POST to AutoContext /context/index-batch
        → 384-dim embedding
        → CSL gate filtering
        → pgvector persistence
```

## Drupal Content Types

| Content Type | Purpose | Heady Sites |
|-------------|---------|-------------|
| `article` | Blog posts, news | All sites |
| `documentation` | Technical docs | headyio.com, headysystems.com |
| `case_study` | Enterprise case studies | headysystems.com, headyfinance.com |
| `patent` | Patent descriptions | headysystems.com |
| `event` | Community events | headyconnection.com |
| `grant_program` | Nonprofit programs | headyconnection.org |
| `agent_listing` | Marketplace listings | headyex.com |
| `investor_update` | Financial updates | headyfinance.com |
| `testimonial` | Social proof | headyme.com, all |
| `faq` | Knowledge base | All sites |
| `product_catalog` | Service catalog | headyex.com |
| `news_release` | Press releases | headyfinance.com |
| `media_asset` | Images/videos | All sites |

## Instructions

### Step 1 — Drupal Webhook Configuration

In Drupal admin, configure the Webhooks module:

```php
// In a custom module's hook_entity_update():
function mymodule_entity_update(EntityInterface $entity) {
  if ($entity->getEntityTypeId() !== 'node') return;
  
  $bundle = $entity->bundle();
  $tracked = ['article', 'documentation', 'case_study', 'patent', 
              'event', 'grant_program', 'agent_listing', 'investor_update',
              'testimonial', 'faq', 'product_catalog', 'news_release', 'media_asset'];
  
  if (!in_array($bundle, $tracked)) return;
  
  $payload = [
    'entity_type' => 'node',
    'bundle'      => $bundle,
    'uuid'        => $entity->uuid(),
    'operation'   => 'update',
  ];
  
  $hmac = hash_hmac('sha256', json_encode($payload), DRUPAL_WEBHOOK_SECRET);
  
  \Drupal::httpClient()->post('https://drupal-sync.headysystems.com/webhook/drupal', [
    'json'    => $payload,
    'headers' => ['X-Drupal-Signature' => "sha256={$hmac}"],
  ]);
}
```

### Step 2 — JSON:API Query Patterns

```javascript
// Fetch changed nodes since last poll
const url = `${DRUPAL_BASE_URL}/jsonapi/node/${contentType}?` +
  `filter[changed][condition][path]=changed&` +
  `filter[changed][condition][operator]=>&` +
  `filter[changed][condition][value]=${lastPollISO}&` +
  `sort=changed&page[limit]=50&include=field_image,field_tags`;

// Fetch single node by UUID
const url = `${DRUPAL_BASE_URL}/jsonapi/node/${bundle}?filter[id]=${uuid}`;
```

### Step 3 — Content Extraction

Always extract these fields from JSON:API responses:

```javascript
function extractNodeContent(node) {
  return {
    id:       node.id,                         // UUID
    type:     node.type?.replace('node--', ''),
    title:    node.attributes.title,
    body:     node.attributes.body?.value || '',
    summary:  node.attributes.body?.summary || '',
    changed:  node.attributes.changed,
    langcode: node.attributes.langcode || 'en',
    url:      `${DRUPAL_BASE_URL}/node/${node.attributes.drupal_internal__nid}`,
  };
}
```

### Step 4 — Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 401 on webhook | HMAC mismatch | Verify DRUPAL_WEBHOOK_SECRET matches on both sides |
| Missing nodes | polling filter wrong | Check `changed` field format (ISO 8601) |
| Empty body | JSON:API field not enabled | Enable field in Drupal JSON:API resource config |
| Slow indexing | batch too large | Reduce from 13 to fib(6)=8 |

## Environment Variables

```
DRUPAL_BASE_URL=https://cms.headysystems.com
DRUPAL_WEBHOOK_SECRET=<secret — store in secret-gateway>
AUTOCONTEXT_URL=http://heady-auto-context:8907
VECTOR_MEMORY_URL=http://heady-memory:8106
```

## References

- [Drupal JSON:API module](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module)
- [Drupal Webhooks module](https://www.drupal.org/project/webhooks)
- Implementation: `/home/user/workspace/heady-system-build/services/external-integrations/drupal-sync/drupal-vector-sync.js`
