# HEADY™ Search Service - Quick Start Guide

## Installation

### Prerequisites
- Node.js >= 20.0.0
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start the service
npm start

# The service will listen on http://localhost:3391
```

## Docker Deployment

### Build
```bash
docker build -t heady-search-service:latest .
```

### Run
```bash
docker run -p 3391:3391 heady-search-service:latest
```

### Verify
```bash
curl http://localhost:3391/health
```

## Basic Usage

### 1. Index a Document

```bash
curl -X POST http://localhost:3391/index \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "doc-1",
    "content": "This is a sample document about artificial intelligence.",
    "metadata": {
      "domain": "ai",
      "tags": ["ml", "ai"]
    }
  }'
```

### 2. Search Documents

```bash
curl -X POST http://localhost:3391/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "limit": 13
  }'
```

### 3. Get Suggestions

```bash
curl "http://localhost:3391/suggest?prefix=arti&limit=8"
```

### 4. Index with Vector Embedding

```bash
curl -X POST http://localhost:3391/index \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "doc-2",
    "content": "Machine learning and deep learning",
    "embedding": [0.1, 0.2, 0.3, ... /* 384 values total */],
    "metadata": {"domain": "ml"}
  }'
```

### 5. Hybrid Search (Text + Vector)

```bash
curl -X POST http://localhost:3391/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "embedding": [0.1, 0.2, 0.3, ... /* 384 values total */],
    "textWeight": 0.5,
    "vectorWeight": 0.5,
    "limit": 13
  }'
```

### 6. Get Service Statistics

```bash
curl http://localhost:3391/stats
```

### 7. Delete a Document

```bash
curl -X DELETE http://localhost:3391/index/doc-1
```

## API Reference

### POST /search - Hybrid Search
Search documents using text and/or vector embeddings.

**Request:**
```json
{
  "query": "search query text",
  "embedding": [/* optional 384-dim array */],
  "domain": "optional domain filter",
  "textWeight": 0.5,
  "vectorWeight": 0.5,
  "limit": 13,
  "includeMetadata": true
}
```

**Response:**
```json
{
  "success": true,
  "query": "search query text",
  "resultCount": 5,
  "results": [
    {
      "docId": "doc-1",
      "score": 0.75,
      "normalizedScore": 0.81,
      "textScore": 0.68,
      "vectorScore": 0.82,
      "inBoth": true,
      "metadata": {...}
    }
  ],
  "domain": null,
  "timestamp": "2026-03-09T12:00:00Z"
}
```

### POST /index - Index Document
Add or update a document in the search index.

**Request:**
```json
{
  "docId": "unique-id",
  "content": "document text content",
  "metadata": {
    "domain": "example",
    "tags": ["tag1", "tag2"]
  },
  "embedding": [/* optional 384-dim array */]
}
```

**Response:**
```json
{
  "success": true,
  "docId": "unique-id",
  "indexed": {
    "text": true,
    "vector": true
  },
  "stats": {
    "textDocs": 10,
    "vectorDocs": 8
  },
  "timestamp": "2026-03-09T12:00:00Z"
}
```

### DELETE /index/:docId - Remove Document
Remove a document from all indices.

**Response:**
```json
{
  "success": true,
  "docId": "unique-id",
  "deleted": true,
  "timestamp": "2026-03-09T12:00:00Z"
}
```

### GET /suggest - Autocomplete
Get autocomplete suggestions based on indexed terms.

**Query Parameters:**
- `prefix` (string) - Prefix to match
- `limit` (number) - Max suggestions (default: 8)

**Response:**
```json
{
  "suggestions": ["machine", "making", "management"],
  "prefix": "mak",
  "count": 3,
  "timestamp": "2026-03-09T12:00:00Z"
}
```

### GET /health - Health Check
Check service health and get basic statistics.

**Response:**
```json
{
  "service": "heady-search-service",
  "version": "1.0.0",
  "status": "operational",
  "uptime": 3600,
  "timestamp": "2026-03-09T12:00:00Z",
  "indices": {
    "text": {
      "documentCount": 10,
      "uniqueTerms": 50,
      "maxCapacity": 233000,
      "utilization": 0.0043
    },
    "vector": {
      "vectorCount": 8,
      "vectorDimension": 384,
      "memoryMB": 0.024
    }
  }
}
```

### GET /stats - Service Statistics
Get comprehensive statistics about the service.

**Response:**
```json
{
  "service": "heady-search-service",
  "version": "1.0.0",
  "uptime": 3600,
  "indices": {
    "text": {...},
    "vector": {...}
  },
  "ranker": {
    "k": 100,
    "includeGate": 0.382,
    "boostMultiplier": 1.618,
    "domainBoost": 0.618
  },
  "constants": {
    "PHI": 1.618033988749895,
    "PSI": 0.618033988749895,
    "FIB": [0, 1, 1, 2, 3, 5, 8, 13, ...],
    "CSL": {
      "SUPPRESS": 0.236,
      "INCLUDE": 0.382,
      "BOOST": 0.618,
      "INJECT": 0.718,
      "HIGH": 0.882,
      "CRITICAL": 0.927
    }
  },
  "timestamp": "2026-03-09T12:00:00Z"
}
```

## Example Workflow

```bash
# Start service
npm start

# In another terminal:

# 1. Index some documents
curl -X POST http://localhost:3391/index \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "doc-1",
    "content": "Artificial intelligence is transforming the world"
  }'

curl -X POST http://localhost:3391/index \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "doc-2",
    "content": "Machine learning enables predictive analytics"
  }'

# 2. Search
curl -X POST http://localhost:3391/search \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence"}'

# 3. Get suggestions
curl "http://localhost:3391/suggest?prefix=art"

# 4. View statistics
curl http://localhost:3391/stats

# 5. Delete document
curl -X DELETE http://localhost:3391/index/doc-1
```

## Performance Tips

1. **Batch Operations:** Use `/vector-batch` for indexing multiple vectors
2. **Weighted Search:** Adjust `textWeight` and `vectorWeight` based on use case
3. **Limit Results:** Use `limit` parameter to reduce response size
4. **Domain Filtering:** Use `domain` parameter for faster result filtering
5. **Vector Quality:** Use high-quality 384-dimensional embeddings for better results

## Troubleshooting

### Service won't start
```bash
# Check Node.js version
node --version  # Should be >=20.0.0

# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm start
```

### Port already in use
```bash
# Use different port
PORT=3392 npm start
```

### Docker build fails
```bash
# Clear Docker cache
docker system prune -a
docker build --no-cache -t heady-search-service:latest .
```

## Support

For issues or questions, contact HeadySystems Inc.

Service: HEADY™ Search Service v1.0.0
Status: Proprietary - All Rights Reserved
