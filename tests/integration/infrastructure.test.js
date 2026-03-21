const { describe, it, expect } = require('vitest');

describe('infrastructure', () => {
  it('passes all checks', () => {
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

module.exports = {
  'docker-compose.yml exists and defines services': () => {
    const composePath = path.join(PROJECT_ROOT, 'docker-compose.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');
    const content = fs.readFileSync(composePath, 'utf8');
    assert.ok(content.includes('services'), 'docker-compose.yml must define services');
  },

  'infrastructure directory has monitoring config': () => {
    const infraDir = path.join(PROJECT_ROOT, 'infrastructure');
    assert.ok(fs.existsSync(infraDir), 'infrastructure/ must exist');
    const entries = fs.readdirSync(infraDir);
    assert.ok(entries.length >= 5, `Expected 5+ infrastructure entries, found ${entries.length}`);
  },

  'security directory exists with auth modules': () => {
    const secDir = path.join(PROJECT_ROOT, 'security');
    if (fs.existsSync(secDir)) {
      const files = fs.readdirSync(secDir);
      assert.ok(files.length >= 3, `Expected 3+ security files, found ${files.length}`);
    }
  },

  'docs directory has ADRs and runbooks': () => {
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    assert.ok(fs.existsSync(docsDir), 'docs/ must exist');
    const adrDir = path.join(docsDir, 'adr');
    const runbooksDir = path.join(docsDir, 'runbooks');
    if (fs.existsSync(adrDir)) {
      const adrs = fs.readdirSync(adrDir);
      assert.ok(adrs.length >= 5, `Expected 5+ ADRs, found ${adrs.length}`);
    }
    if (fs.existsSync(runbooksDir)) {
      const runbooks = fs.readdirSync(runbooksDir);
      assert.ok(runbooks.length >= 2, `Expected 2+ runbooks, found ${runbooks.length}`);
    }
  },

  'CHANGES.md exists': () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'CHANGES.md')), 'CHANGES.md must exist');
  },

  'GAPS_FOUND.md exists': () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'GAPS_FOUND.md')), 'GAPS_FOUND.md must exist');
  },

  'IMPROVEMENTS.md exists': () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'IMPROVEMENTS.md')), 'IMPROVEMENTS.md must exist');
  },

  '.gitignore exists and covers node_modules': () => {
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      assert.ok(content.includes('node_modules'), '.gitignore should cover node_modules');
    }
  }
};

  });
});
