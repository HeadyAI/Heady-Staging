/**
 * ═══ Event Stream — SSE for Pipeline Lifecycle — SPEC-1 ═══
 *
 * Server-Sent Events (SSE) endpoint that streams pipeline events in real-time.
 * Consumers connect to /api/events/pipeline and receive stage transitions,
 * completions, failures, and receipts as they happen.
 */

class EventStream {
    constructor() {
        this.clients = new Map();  // clientId → { res, filters }
        this.eventHistory = [];
        this.maxHistory = 500;
    }

    // ─── Register SSE route ──────────────────────────────────────
    registerRoute(app) {
        app.get("/api/events/pipeline", (req, res) => {
            const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            // SSE headers
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  // Disable nginx buffering
            });

            // Send initial connection event
            res.write(`event: connected\ndata: ${JSON.stringify({ clientId, ts: new Date().toISOString() })}\n\n`);

            // Register client
            this.clients.set(clientId, {
                res,
                filters: {
                    runId: req.query.runId || null,
                    stages: req.query.stages ? req.query.stages.split(",") : null,
                },
            });

            // Send recent history if requested
            if (req.query.replay === "true") {
                const history = this._getFilteredHistory(this.clients.get(clientId).filters);
                for (const event of history.slice(-50)) {
                    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
                }
            }

            // Heartbeat every 30s
            const heartbeat = setInterval(() => {
                try { res.write(`:heartbeat ${new Date().toISOString()}\n\n`); }
                catch { clearInterval(heartbeat); }
            }, 30000);

            // Cleanup on disconnect
            req.on("close", () => {
                clearInterval(heartbeat);
                this.clients.delete(clientId);
            });
        });

        // Status endpoint
        app.get("/api/events/status", (_req, res) => {
            res.json(this.status());
        });

        console.log("📡 SSE event stream registered: /api/events/pipeline");
    }

    // ─── Connect pipeline events to SSE ──────────────────────────
    connectPipeline(pipeline) {
        const events = [
            "run:created", "run:started", "run:completed", "run:failed", "run:paused",
            "stage:started", "stage:completed", "stage:failed", "stage:skipped", "stage:rolledback",
        ];

        for (const eventName of events) {
            pipeline.on(eventName, (data) => {
                this.broadcast(eventName, data);
            });
        }
    }

    // ─── Broadcast to all connected clients ──────────────────────
    broadcast(type, data) {
        const event = {
            type,
            data: { ...data, ts: new Date().toISOString() },
            broadcastedAt: new Date().toISOString(),
        };

        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistory) this.eventHistory.shift();

        // Send to all matching clients
        for (const [clientId, client] of this.clients) {
            if (this._matchesFilter(client.filters, data)) {
                try {
                    client.res.write(`event: ${type}\ndata: ${JSON.stringify(event.data)}\n\n`);
                } catch {
                    this.clients.delete(clientId);
                }
            }
        }
    }

    // ─── Filter matching ─────────────────────────────────────────
    _matchesFilter(filters, data) {
        if (filters.runId && data.runId !== filters.runId) return false;
        if (filters.stages && data.stage && !filters.stages.includes(data.stage)) return false;
        return true;
    }

    _getFilteredHistory(filters) {
        return this.eventHistory.filter(e => this._matchesFilter(filters, e.data));
    }

    // ─── Status ──────────────────────────────────────────────────
    status() {
        return {
            connectedClients: this.clients.size,
            eventsInHistory: this.eventHistory.length,
            lastEvent: this.eventHistory[this.eventHistory.length - 1] || null,
        };
    }
}

module.exports = EventStream;
