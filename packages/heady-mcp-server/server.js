#!/usr/bin/env node
/**
 * ═══ Heady MCP Server ═══
 * Standalone MCP server that connects any MCP client to the Heady Intelligence Layer.
 * Supports stdio and SSE transports.
 *
 * Usage:
 *   npx heady-mcp-server                    # stdio (for IDE integration)
 *   HEADY_TRANSPORT=sse node server.js      # SSE (for web clients)
 */

const http = require("http");
const TOOLS = require("./tools");

const HEADY_API = process.env.HEADY_URL || "http://127.0.0.1:3301";
const TRANSPORT = process.env.HEADY_TRANSPORT || "stdio";
const PORT = parseInt(process.env.HEADY_MCP_PORT || "3302");

// ── Heady API Caller ──
function callHeady(path, body) {
    const url = new URL(HEADY_API);
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: url.hostname, port: url.port || 3301,
            path, method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
            timeout: 30000,
        }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ text: data }); } });
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.write(payload); req.end();
    });
}

// ── MCP Protocol Handler ──
async function handleRequest(request) {
    const { method, params, id } = request;

    if (method === "initialize") {
        return {
            protocolVersion: "2024-11-05",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "heady-mcp-server", version: "1.0.0" },
        };
    }

    if (method === "tools/list") {
        return { tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) };
    }

    if (method === "tools/call") {
        const tool = TOOLS.find(t => t.name === params.name);
        if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${params.name}` }], isError: true };
        try {
            const result = await tool.handler(params.arguments || {}, callHeady);
            return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }] };
        } catch (e) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    }

    if (method === "ping") return {};

    return { error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ── STDIO Transport ──
if (TRANSPORT === "stdio") {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", async (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const req = JSON.parse(line);
                const result = await handleRequest(req);
                const response = { jsonrpc: "2.0", id: req.id };
                if (result.error) response.error = result.error;
                else response.result = result;
                process.stdout.write(JSON.stringify(response) + "\n");
            } catch (e) {
                process.stderr.write(`Parse error: ${e.message}\n`);
            }
        }
    });
    process.stderr.write(`🐝 Heady MCP Server (stdio) — ${TOOLS.length} tools\n`);
}

// ── SSE Transport ──
if (TRANSPORT === "sse") {
    const server = http.createServer(async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

        if (req.url === "/sse") {
            res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
            res.write(`data: ${JSON.stringify({ type: "endpoint", url: "/message" })}\n\n`);
            const keepAlive = setInterval(() => res.write(":ping\n\n"), 15000);
            req.on("close", () => clearInterval(keepAlive));
            return;
        }

        if (req.url === "/message" && req.method === "POST") {
            let body = "";
            req.on("data", c => body += c);
            req.on("end", async () => {
                try {
                    const request = JSON.parse(body);
                    const result = await handleRequest(request);
                    const response = { jsonrpc: "2.0", id: request.id };
                    if (result.error) response.error = result.error;
                    else response.result = result;
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(response));
                } catch (e) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", tools: TOOLS.length, transport: "sse" }));
            return;
        }

        res.writeHead(404); res.end("Not found");
    });
    server.listen(PORT, () => {
        console.log(`🐝 Heady MCP Server (SSE) — ${TOOLS.length} tools on port ${PORT}`);
    });
}
