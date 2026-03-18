---
name: heady-cms
description: "Drupal CMS content management for all 9 Heady™ websites. Use this skill when the user asks to create, edit, publish, or manage website content, blog posts, articles, documentation, media, or taxonomy across any Heady domain. Triggers on: 'publish a post', 'create content', 'update the website', 'add documentation', 'manage media', 'taxonomy', 'blog post', 'article', 'page', 'Drupal', 'CMS', 'content management', 'website content', 'HeadySystems content', 'HeadyMe page'. Always use this skill for any content creation, publishing, or website management task — it connects to heady_cms_content, heady_cms_taxonomy, heady_cms_media, heady_cms_views, and heady_cms_search MCP tools."
---

# Heady™ CMS Skill

You are connected to the Heady™ CMS — a Drupal-powered content management system serving all 9 HEADY websites via JSON:API.

## Websites Managed

| Site | Domain | Content Types |
|------|--------|--------------|
| HeadySystems | headysystems.com | Enterprise pages, solutions, case studies |
| HeadyMe | headyme.com | Personal AI profiles, dashboard content |
| Heady-AI | heady-ai.com | Research papers, model cards, benchmarks |
| HeadyOS | headyos.com | Documentation, API reference, tutorials |
| HeadyConnection.org | headyconnection.org | Programs, events, impact reports |
| HeadyConnection.com | headyconnection.com | Community posts, forums, discussions |
| HeadyEX | headyex.com | Agent listings, marketplace content |
| HeadyFinance | headyfinance.com | Financial tools, advisors, articles |
| Admin UI | admin.headysystems.com | System pages, dashboards |

## Available MCP Tools

### heady_cms_content
Full CRUD for content across all 9 sites.

**Create content:**
```json
{
  "action": "create",
  "site": "headysystems",
  "content_type": "article",
  "data": {
    "title": "Introducing Heady™ v5.0",
    "body": "Full markdown content here...",
    "status": "draft",
    "tags": ["product", "launch", "v5"]
  }
}
```

**List content:**
```json
{
  "action": "list",
  "site": "heady-ai",
  "content_type": "research_paper",
  "filters": {"status": "published"},
  "limit": 10
}
```

**Update content:**
```json
{
  "action": "update",
  "site": "headysystems",
  "content_id": "node_123",
  "data": {"status": "published"}
}
```

### Content Types by Site

| Content Type | Available On |
|-------------|-------------|
| page | All sites |
| article | headysystems, heady-ai, headyfinance |
| documentation | headyos, heady-ai |
| research_paper | heady-ai |
| agent_listing | headyex |
| program | headyconnection.org |
| event | headyconnection.org, headyconnection.com |
| forum_post | headyconnection.com |

### heady_cms_taxonomy
Manage tags, categories, and classification systems.

```json
{
  "action": "list",
  "vocabulary": "tags",
  "site": "headysystems"
}
```

Vocabularies: tags, categories, research_areas, agent_categories, service_tiers

### heady_cms_media
Upload and manage images, documents, and videos.

```json
{
  "action": "upload",
  "site": "headysystems",
  "media_type": "image",
  "file_path": "/path/to/image.png",
  "alt_text": "Heady Platform Architecture"
}
```

### heady_cms_views
Execute pre-built Drupal Views with contextual filters.

```json
{
  "view_name": "latest_articles",
  "display_id": "page_1",
  "site": "headysystems",
  "arguments": ["technology"]
}
```

### heady_cms_search
Full-text search via Drupal Search API (Solr/Elasticsearch backend).

```json
{
  "query": "phi-scaled architecture",
  "site": "all",
  "content_types": ["article", "documentation"],
  "limit": 20
}
```

## Content Workflow

### Publishing Pipeline
1. **Draft** — Create content with `status: "draft"`
2. **Review** — List drafts for review
3. **Media** — Attach images/documents via `heady_cms_media`
4. **Tag** — Apply taxonomy terms via `heady_cms_taxonomy`
5. **Publish** — Update status to `"published"`

### Cross-Site Publishing
To publish the same content across multiple sites:
1. Create on primary site
2. Use `heady_cms_content` with `action: "create"` on each target site
3. Link content via shared taxonomy terms

### Content Discovery
1. Use `heady_cms_search` for full-text search across all sites
2. Use `heady_cms_views` for pre-built content feeds
3. Filter by site, content type, tags, date range

## Connection

CMS tools connect through the MCP server to the Drupal JSON:API backend. Drupal must be configured with JSON:API module enabled and CORS for MCP server origin.
