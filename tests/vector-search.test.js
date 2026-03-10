const test = require('node:test');
const assert = require('node:assert/strict');
const { addDocument, search, createEmbedding, cosine } = require('../services/search-service/src/search-index');

test('hybrid search returns the semantically closest document first', () => {
  addDocument({ id: 'doc-auth', title: 'Zero Trust Auth', body: 'httpOnly cookies and relay iframe validation', tags: ['auth'], url: 'https://headysystems.com/auth' });
  addDocument({ id: 'doc-search', title: 'Hybrid Search', body: 'vector retrieval with lexical fusion and 384-dimensional embeddings', tags: ['search'], url: 'https://headysystems.com/search' });
  const results = search('vector search embeddings', 2);
  assert.equal(results[0].id, 'doc-search');
  assert.ok(cosine(createEmbedding('vector search'), createEmbedding('vector search')) > 0.99);
});
