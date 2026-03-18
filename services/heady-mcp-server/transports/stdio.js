/**
 * transports/stdio.js — MCP stdio transport
 * Reads JSON-RPC messages from stdin, writes responses to stdout
 * Fully compliant with MCP spec (2024-11-05)
 */
'use strict';

class StdioTransport {
  constructor(protocol) {
    this.protocol = protocol;
    this.buffer = '';
  }

  start() {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => this._onData(chunk));
    process.stdin.on('end', () => process.exit(0));
    process.stdin.resume();
  }

  _onData(chunk) {
    this.buffer += chunk;
    // Process all complete lines
    let newlineIdx;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (line) this._processLine(line);
    }
  }

  async _processLine(line) {
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      this._write({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
      return;
    }

    const response = await this.protocol.handleRequest(request);
    if (response) {
      this._write(response);
    }
  }

  _write(obj) {
    const json = JSON.stringify(obj);
    process.stdout.write(json + '\n');
  }
}

module.exports = { StdioTransport };
