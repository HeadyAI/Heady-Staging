#!/usr/bin/env node
// © 2026 Heady™Systems Inc.
// MCP Server: Document Stores — Obsidian Vault + Dropbox integration
// Usage:
//   node document-stores.js --provider obsidian
//   node document-stores.js --provider dropbox

const path = require('path');
const fs = require('fs');

const sdkRoot = path.join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { Server } = require(sdkRoot + '/server/index.js');
const { StdioServerTransport } = require(sdkRoot + '/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require(sdkRoot + '/types.js');

// ── CLI args ─────────────────────────────────────────────────
const providerArg = process.argv.find((a, i) => process.argv[i - 1] === '--provider') || 'obsidian';

// ── Obsidian Provider ────────────────────────────────────────

class ObsidianProvider {
  constructor() {
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH || path.join(__dirname, '..', 'obsidian-vault');
  }

  get tools() {
    return [
      { name: 'vault_search', description: 'Search notes in the Obsidian vault by keyword', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, limit: { type: 'number', description: 'Max results (default 20)' } }, required: ['query'] } },
      { name: 'vault_read', description: 'Read a note from the Obsidian vault', inputSchema: { type: 'object', properties: { notePath: { type: 'string', description: 'Relative path to the note (e.g. projects/my-project.md)' } }, required: ['notePath'] } },
      { name: 'vault_create', description: 'Create or update a note in the Obsidian vault', inputSchema: { type: 'object', properties: { notePath: { type: 'string', description: 'Relative path for the note' }, content: { type: 'string', description: 'Markdown content' } }, required: ['notePath', 'content'] } },
      { name: 'vault_link_graph', description: 'Get the wiki-link graph from the vault index', inputSchema: { type: 'object', properties: { note: { type: 'string', description: 'Optional: filter to links from/to a specific note' } } } },
      { name: 'vault_index', description: 'Get the full vault index (notes, tags, links)', inputSchema: { type: 'object', properties: {} } },
      { name: 'vault_recent', description: 'Get recently modified notes', inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Look back N days (default 7)' } } } },
      { name: 'vault_tags', description: 'Get all tags used across the vault with counts', inputSchema: { type: 'object', properties: {} } },
    ];
  }

  _indexPath() {
    return path.join(this.vaultPath, '.vault-index.json');
  }

  _loadIndex() {
    const indexFile = this._indexPath();
    if (fs.existsSync(indexFile)) {
      return JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    }
    return { notes: [], tags: {}, link_graph: {}, total_notes: 0, total_links: 0 };
  }

  _walkNotes(dir, base, results) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._walkNotes(full, base, results);
      } else if (entry.name.endsWith('.md')) {
        results.push({ path: path.relative(base, full), full });
      }
    }
  }

  async dispatch(name, args) {
    if (name === 'vault_search') return this.search(args.query, args.limit);
    if (name === 'vault_read') return this.read(args.notePath);
    if (name === 'vault_create') return this.create(args.notePath, args.content);
    if (name === 'vault_link_graph') return this.linkGraph(args?.note);
    if (name === 'vault_index') return this.index();
    if (name === 'vault_recent') return this.recent(args?.days);
    if (name === 'vault_tags') return this.tags();
    throw new Error(`Unknown tool: ${name}`);
  }

  async search(query, limit = 20) {
    const q = query.toLowerCase();
    const notes = [];
    this._walkNotes(this.vaultPath, this.vaultPath, notes);

    const results = [];
    for (const note of notes) {
      const content = fs.readFileSync(note.full, 'utf8');
      if (content.toLowerCase().includes(q) || note.path.toLowerCase().includes(q)) {
        const lines = content.split('\n');
        const matchLine = lines.findIndex(l => l.toLowerCase().includes(q));
        results.push({
          path: note.path,
          title: path.basename(note.path, '.md'),
          matchLine: matchLine >= 0 ? matchLine + 1 : null,
          excerpt: matchLine >= 0 ? lines.slice(Math.max(0, matchLine - 1), matchLine + 3).join('\n') : lines.slice(0, 3).join('\n'),
        });
        if (results.length >= limit) break;
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify({ query, total: results.length, results }, null, 2) }] };
  }

  async read(notePath) {
    const full = path.join(this.vaultPath, notePath);
    if (!full.startsWith(this.vaultPath)) {
      return { content: [{ type: 'text', text: 'Error: path traversal not allowed' }], isError: true };
    }
    if (!fs.existsSync(full)) {
      return { content: [{ type: 'text', text: `Note not found: ${notePath}` }], isError: true };
    }
    const content = fs.readFileSync(full, 'utf8');
    const stat = fs.statSync(full);
    return { content: [{ type: 'text', text: JSON.stringify({ path: notePath, modified: stat.mtime.toISOString(), size: stat.size, content }, null, 2) }] };
  }

  async create(notePath, content) {
    const full = path.join(this.vaultPath, notePath);
    if (!full.startsWith(this.vaultPath)) {
      return { content: [{ type: 'text', text: 'Error: path traversal not allowed' }], isError: true };
    }
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const existed = fs.existsSync(full);
    fs.writeFileSync(full, content, 'utf8');
    return { content: [{ type: 'text', text: JSON.stringify({ path: notePath, action: existed ? 'updated' : 'created', size: Buffer.byteLength(content) }, null, 2) }] };
  }

  async linkGraph(note) {
    const index = this._loadIndex();
    let graph = index.link_graph || {};
    if (note) {
      const outgoing = graph[note] || [];
      const incoming = Object.entries(graph).filter(([, links]) => links.includes(note)).map(([k]) => k);
      return { content: [{ type: 'text', text: JSON.stringify({ note, outgoing, incoming }, null, 2) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ total_nodes: Object.keys(graph).length, graph }, null, 2) }] };
  }

  async index() {
    const index = this._loadIndex();
    return { content: [{ type: 'text', text: JSON.stringify(index, null, 2) }] };
  }

  async recent(days = 7) {
    const index = this._loadIndex();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recent = (index.notes || []).filter(n => new Date(n.modified) > cutoff);
    return { content: [{ type: 'text', text: JSON.stringify({ days, count: recent.length, notes: recent }, null, 2) }] };
  }

  async tags() {
    const index = this._loadIndex();
    const sorted = Object.entries(index.tags || {}).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
    return { content: [{ type: 'text', text: JSON.stringify({ total_tags: sorted.length, tags: sorted }, null, 2) }] };
  }
}

// ── Dropbox Provider ─────────────────────────────────────────

class DropboxProvider {
  constructor() {
    this.token = process.env.DROPBOX_TOKEN;
  }

  get tools() {
    return [
      { name: 'dropbox_list', description: 'List files in a Dropbox folder', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Folder path (e.g. /Documents)' } }, required: ['path'] } },
      { name: 'dropbox_search', description: 'Search files in Dropbox', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } },
      { name: 'dropbox_read', description: 'Read a file from Dropbox', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path' } }, required: ['path'] } },
      { name: 'dropbox_upload', description: 'Upload a file to Dropbox', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Destination path' }, content: { type: 'string', description: 'File content' } }, required: ['path', 'content'] } },
    ];
  }

  async dispatch(name, args) {
    if (!this.token) {
      return { content: [{ type: 'text', text: 'Error: DROPBOX_TOKEN not set' }], isError: true };
    }
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    if (name === 'dropbox_list') return this._list(fetch, args.path);
    if (name === 'dropbox_search') return this._search(fetch, args.query);
    if (name === 'dropbox_read') return this._read(fetch, args.path);
    if (name === 'dropbox_upload') return this._upload(fetch, args.path, args.content);
    throw new Error(`Unknown tool: ${name}`);
  }

  async _apiCall(fetch, endpoint, body) {
    const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async _list(fetch, folderPath) {
    const data = await this._apiCall(fetch, 'files/list_folder', { path: folderPath === '/' ? '' : folderPath });
    const entries = (data.entries || []).map(e => ({ name: e.name, type: e['.tag'], path: e.path_display, size: e.size }));
    return { content: [{ type: 'text', text: JSON.stringify({ path: folderPath, entries }, null, 2) }] };
  }

  async _search(fetch, query) {
    const data = await this._apiCall(fetch, 'files/search_v2', { query });
    const matches = (data.matches || []).map(m => ({ name: m.metadata?.metadata?.name, path: m.metadata?.metadata?.path_display }));
    return { content: [{ type: 'text', text: JSON.stringify({ query, matches }, null, 2) }] };
  }

  async _read(fetch, filePath) {
    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Dropbox-API-Arg': JSON.stringify({ path: filePath }) },
    });
    const text = await res.text();
    return { content: [{ type: 'text', text: JSON.stringify({ path: filePath, content: text }, null, 2) }] };
  }

  async _upload(fetch, filePath, content) {
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: filePath, mode: 'overwrite', autorename: false }),
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify({ path: filePath, action: 'uploaded', size: data.size }, null, 2) }] };
  }
}

// ── Server bootstrap ─────────────────────────────────────────

const providers = { obsidian: ObsidianProvider, dropbox: DropboxProvider };
const ProviderClass = providers[providerArg];
if (!ProviderClass) {
  console.error(`Unknown provider: ${providerArg}. Available: ${Object.keys(providers).join(', ')}`);
  process.exit(1);
}

const provider = new ProviderClass();

const server = new Server(
  { name: `heady-document-stores-${providerArg}`, version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: provider.tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await provider.dispatch(name, args);
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

server.onerror = (error) => console.error(`[document-stores:${providerArg}]`, error);
process.on('SIGINT', async () => { await server.close(); process.exit(0); });

(async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Heady Document Stores MCP (${providerArg}) running on stdio`);
})().catch(console.error);
