'use strict';

/**
 * HEADY™ Text Index Engine
 * HeadySystems Inc. - Proprietary
 * 
 * Full-text search with TF-IDF scoring and Porter stemming
 */

// φ-scaled constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// CSL Gates
const CSL = {
  SUPPRESS: 0.236,
  INCLUDE: 0.382,
  BOOST: 0.618,
  INJECT: 0.718,
  HIGH: 0.882,
  CRITICAL: 0.927
};

// English stop words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'so',
  'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'to', 'too', 'under', 'until',
  'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'will', 'with', 'you', 'your', 'yours', 'yourself',
  'yourselves'
]);

/**
 * Porter Stemmer implementation (simplified)
 * Reduces words to their root form
 */
class PorterStemmer {
  stem(word) {
    const w = word.toLowerCase();
    if (w.length <= 2) return w;

    // Step 1a
    if (w.endsWith('sses')) return w.slice(0, -2);
    if (w.endsWith('ies')) return w.slice(0, -3) + 'i';
    if (w.endsWith('ss')) return w;
    if (w.endsWith('s') && !w.endsWith('us')) return w.slice(0, -1);

    // Step 1b
    if (w.endsWith('eed')) {
      const stem = w.slice(0, -3);
      if (this._hasVowel(stem)) return stem + 'ee';
      return w;
    }
    if ((w.endsWith('ed') || w.endsWith('ing')) && this._hasVowel(w.slice(0, -3))) {
      let stem = w.slice(0, -3);
      if (w.endsWith('ed')) stem = w.slice(0, -2);
      if (stem.endsWith('at') || stem.endsWith('bl') || stem.endsWith('iz')) {
        return stem + 'e';
      }
      const last = stem[stem.length - 1];
      if (stem.length > 1 && last === stem[stem.length - 2] && !['l', 's', 'z'].includes(last)) {
        return stem.slice(0, -1);
      }
      return stem;
    }

    // Step 1c
    if ((w.endsWith('y') || w.endsWith('Y')) && this._hasVowel(w.slice(0, -1))) {
      return w.slice(0, -1) + 'i';
    }

    return w;
  }

  _hasVowel(word) {
    return /[aeiouy]/.test(word);
  }
}

/**
 * TextIndex - Full-text search engine with TF-IDF scoring
 */
class TextIndex {
  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
    this.documentFrequency = new Map();
    this.termFrequency = new Map();
    this.stemmer = new PorterStemmer();
    this.maxDocuments = FIB[13]; // 233 thousand
  }

  /**
   * Index a document
   * @param {string} docId - Document identifier
   * @param {string} content - Document content to index
   * @param {Object} metadata - Document metadata
   */
  indexDocument(docId, content, metadata = {}) {
    if (this.documents.size >= this.maxDocuments) {
      throw new Error(`Index capacity (${this.maxDocuments}) exceeded`);
    }

    // Remove existing document if present
    if (this.documents.has(docId)) {
      this._removeDocument(docId);
    }

    // Tokenize and process content
    const tokens = this._tokenize(content);
    const stems = tokens.map(t => this.stemmer.stem(t));

    // Store document
    this.documents.set(docId, {
      originalTokens: tokens,
      stems: stems,
      content: content,
      metadata: metadata,
      length: stems.length,
      timestamp: Date.now()
    });

    // Update inverted index
    stems.forEach((stem, index) => {
      if (!this.invertedIndex.has(stem)) {
        this.invertedIndex.set(stem, new Set());
      }
      this.invertedIndex.get(stem).add(docId);

      // Track document frequency
      if (!this.documentFrequency.has(stem)) {
        this.documentFrequency.set(stem, 0);
      }
      this.documentFrequency.set(stem, this.documentFrequency.get(stem) + 1);

      // Track term frequency
      const tfKey = `${docId}:${stem}`;
      this.termFrequency.set(tfKey, (this.termFrequency.get(tfKey) || 0) + 1);
    });
  }

  /**
   * Remove document from index
   * @param {string} docId - Document identifier
   */
  _removeDocument(docId) {
    const doc = this.documents.get(docId);
    if (!doc) return;

    doc.stems.forEach(stem => {
      const docSet = this.invertedIndex.get(stem);
      if (docSet) {
        docSet.delete(docId);
        if (docSet.size === 0) {
          this.invertedIndex.delete(stem);
        }
      }

      const tfKey = `${docId}:${stem}`;
      this.termFrequency.delete(tfKey);
      this.documentFrequency.set(stem, Math.max(0, (this.documentFrequency.get(stem) || 1) - 1));
    });

    this.documents.delete(docId);
  }

  /**
   * Delete document from index
   * @param {string} docId - Document identifier
   */
  deleteDocument(docId) {
    this._removeDocument(docId);
  }

  /**
   * Search documents using TF-IDF scoring
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Ranked results
   */
  search(query, options = {}) {
    const { limit = FIB[7] } = options; // Default top 13 results

    const queryStems = this._tokenize(query).map(t => this.stemmer.stem(t));
    if (queryStems.length === 0) return [];

    const scores = new Map();
    const docMatches = new Set();

    // Find documents containing query terms
    queryStems.forEach(stem => {
      const docIds = this.invertedIndex.get(stem) || new Set();
      docIds.forEach(docId => {
        docMatches.add(docId);
      });
    });

    // Calculate TF-IDF scores
    const totalDocs = this.documents.size;
    docMatches.forEach(docId => {
      let score = 0;

      queryStems.forEach(stem => {
        const tf = this.termFrequency.get(`${docId}:${stem}`) || 0;
        const df = this.documentFrequency.get(stem) || 0;
        const idf = Math.log(totalDocs / (df + 1));
        score += tf * idf;
      });

      // Normalize by document length
      const doc = this.documents.get(docId);
      score = doc.length > 0 ? score / Math.sqrt(doc.length) : 0;

      scores.set(docId, score);
    });

    // Sort by score and return top results
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([docId, score]) => ({
        docId: docId,
        score: score,
        document: this.documents.get(docId),
        type: 'text'
      }));

    return results;
  }

  /**
   * Phrase search - finds exact phrase matches
   * @param {string} phrase - Phrase to search for
   * @param {Object} options - Search options
   * @returns {Array} Matching documents
   */
  phraseSearch(phrase, options = {}) {
    const { limit = FIB[7] } = options;

    const tokens = this._tokenize(phrase);
    if (tokens.length === 0) return [];

    const stems = tokens.map(t => this.stemmer.stem(t));
    const results = [];

    // Find documents containing all terms
    let docCandidates = null;
    stems.forEach(stem => {
      const docs = this.invertedIndex.get(stem) || new Set();
      if (docCandidates === null) {
        docCandidates = new Set(docs);
      } else {
        docCandidates = new Set([...docCandidates].filter(d => docs.has(d)));
      }
    });

    if (!docCandidates || docCandidates.size === 0) return [];

    // Check for actual phrase presence
    docCandidates.forEach(docId => {
      const doc = this.documents.get(docId);
      const docStems = doc.stems;

      // Look for consecutive stems in document
      for (let i = 0; i <= docStems.length - stems.length; i++) {
        const match = stems.every((s, idx) => docStems[i + idx] === s);
        if (match) {
          results.push({
            docId: docId,
            score: CSL.BOOST,
            document: doc,
            type: 'phrase',
            position: i
          });
          break;
        }
      }
    });

    return results.slice(0, limit);
  }

  /**
   * Get autocomplete suggestions
   * @param {string} prefix - Prefix to match
   * @param {Object} options - Options
   * @returns {Array} Suggestion terms
   */
  getAutocomplete(prefix, options = {}) {
    const { limit = FIB[6] } = options; // Default 8 suggestions

    if (!prefix || prefix.length === 0) return [];

    const stemmedPrefix = this.stemmer.stem(prefix.toLowerCase());
    const suggestions = [];

    for (const [term] of this.invertedIndex.entries()) {
      if (term.startsWith(stemmedPrefix)) {
        suggestions.push(term);
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions.sort();
  }

  /**
   * Tokenize text into terms
   * @param {string} text - Text to tokenize
   * @returns {Array} Tokens
   */
  _tokenize(text) {
    return text
      .toLowerCase()
      .match(/\b\w+\b/g)
      ?.filter(token => !STOP_WORDS.has(token)) || [];
  }

  /**
   * Get index statistics
   * @returns {Object} Index stats
   */
  getStats() {
    return {
      documentCount: this.documents.size,
      uniqueTerms: this.invertedIndex.size,
      maxCapacity: this.maxDocuments,
      utilization: (this.documents.size / this.maxDocuments) * 100
    };
  }
}

module.exports = TextIndex;
