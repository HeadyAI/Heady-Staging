---
name: heady-mcp-gateway
description: Blueprints and patterns for building MCP (Model Context Protocol) servers that connect Heady agents to external trading APIs, data feeds, and infrastructure services. Use this skill whenever building, configuring, or debugging MCP servers for the Heady ecosystem — including the central MCP Gateway, Tradovate/Rithmic API bridges, market data MCP servers, MIDI UMP translation layers, or any tool that exposes external functionality to Heady agents. Triggers on mentions of "MCP server", "MCP gateway", "tool use", "JSON-RPC", "Tradovate MCP", "Rithmic MCP", "market data MCP", "MIDI MCP", or any integration between Heady agents and external APIs through MCP. Also use when the user asks about connecting Claude/LLMs to trading infrastructure via MCP.
---

# Heady MCP Gateway

The MCP Gateway is the architectural bridge that transitions Heady AI agents from isolated text-generation models into active, deterministic participants capable of executing precise commands against external financial infrastructure. Every external service the agents interact with is exposed through a well-typed MCP tool.

## Gateway Architecture

The Heady MCP Gateway is a central routing server that multiplexes tool calls from all 8 agents to their target external services. It handles authentication, rate limiting, request validation, and response formatting.

```
┌─────────────────────────────────────────────┐
│              Heady MCP Gateway               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Tradovate│  │ Rithmic  │  │ Market   │  │
│  │ Bridge   │  │ Bridge   │  │ Data     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│  ┌────┴──────────────┴──────────────┴────┐  │
│  │        Unified Tool Registry          │  │
│  └────┬──────────────┬──────────────┬────┘  │
│       │              │              │        │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  │
│  │ Auth &   │  │ Rate     │  │ Request  │  │
│  │ Secrets  │  │ Limiter  │  │ Validator│  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────────────────┬──────────────────────┘
                       │ JSON-RPC 2.0 / Streamable HTTP
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
    │  Alpha  │  │  Risk   │  │  Exec   │
    │  Agent  │  │  Agent  │  │  Agent  │
    └─────────┘  └─────────┘  └─────────┘
```

## MCP Server Template (TypeScript)

Every Heady MCP server follows this template. Read the MCP SDK docs at `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md` for the latest API.

```typescript
// heady-mcp-trading/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "heady-trading",
  version: "1.0.0",
});

// ========================
// TOOL: Get Account State
// ========================
server.tool(
  "get_account_state",
  "Retrieve the current account state including balance, equity, open positions, and drawdown status. This is the primary tool for the Risk Agent to assess account health.",
  {
    account_id: z.string().describe("The Apex account identifier"),
  },
  async ({ account_id }) => {
    // Validate account_id format
    if (!account_id.match(/^APEX-[A-Z0-9]+$/)) {
      return {
        content: [{ type: "text", text: "Invalid account ID format. Expected APEX-XXXXXXXX" }],
        isError: true,
      };
    }

    try {
      const state = await tradovateClient.getAccountState(account_id);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            account_id: state.id,
            balance: state.cashBalance,
            equity: state.totalEquity,
            unrealized_pnl: state.unrealizedPnL,
            open_positions: state.positions.length,
            drawdown_level: state.drawdownLevel,
            drawdown_cushion: state.totalEquity - state.drawdownLevel,
            max_contracts: state.maxContracts,
            contracts_used: state.contractsUsed,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to fetch account state: ${error.message}` }],
        isError: true,
      };
    }
  },
  { readOnlyHint: true, destructiveHint: false }
);

// ========================
// TOOL: Place Order
// ========================
server.tool(
  "place_order",
  "Place a trading order on the exchange. CRITICAL: This tool MUST only be called after the Risk Agent and Compliance Agent have both approved the trade signal. The Execution Agent is the only agent authorized to use this tool.",
  {
    instrument: z.string().describe("Trading instrument symbol (e.g., 'NQH6', 'ESH6')"),
    side: z.enum(["BUY", "SELL"]).describe("Order side"),
    quantity: z.number().int().positive().describe("Number of contracts"),
    order_type: z.enum(["MARKET", "LIMIT", "STOP"]).describe("Order type"),
    price: z.number().optional().describe("Limit/stop price (required for LIMIT and STOP orders)"),
    stop_loss: z.number().optional().describe("Stop loss price"),
    take_profit: z.number().optional().describe("Take profit price"),
    correlation_id: z.string().describe("Correlation ID from the original trade signal for tracing"),
  },
  async ({ instrument, side, quantity, order_type, price, stop_loss, take_profit, correlation_id }) => {
    // Pre-execution validation
    const validation = await validateOrder({ instrument, side, quantity, order_type, price });
    if (!validation.valid) {
      return {
        content: [{ type: "text", text: `Order validation failed: ${validation.reason}` }],
        isError: true,
      };
    }

    try {
      const result = await tradovateClient.placeOrder({
        instrument, side, quantity, order_type, price, stop_loss, take_profit
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            order_id: result.orderId,
            status: result.status,
            filled_quantity: result.filledQty,
            avg_fill_price: result.avgFillPrice,
            correlation_id,
            timestamp: new Date().toISOString(),
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Order execution failed: ${error.message}` }],
        isError: true,
      };
    }
  },
  { readOnlyHint: false, destructiveHint: true }
);

// ========================
// TOOL: Emergency Flatten
// ========================
server.tool(
  "emergency_flatten_all",
  "EMERGENCY: Flatten ALL open positions immediately using market orders. Only the Risk Agent should call this tool, and only when a drawdown breach is imminent or detected. This is the nuclear option.",
  {
    reason: z.string().describe("Why emergency flatten was triggered"),
    correlation_id: z.string().describe("Correlation ID for audit trail"),
  },
  async ({ reason, correlation_id }) => {
    const startTime = performance.now();

    try {
      const positions = await tradovateClient.getAllPositions();
      const closeOrders = positions.map(pos =>
        tradovateClient.placeOrder({
          instrument: pos.instrument,
          side: pos.side === "LONG" ? "SELL" : "BUY",
          quantity: Math.abs(pos.quantity),
          order_type: "MARKET",
        })
      );

      const results = await Promise.allSettled(closeOrders);
      const elapsed = performance.now() - startTime;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            action: "EMERGENCY_FLATTEN",
            reason,
            correlation_id,
            positions_closed: positions.length,
            elapsed_ms: Math.round(elapsed),
            results: results.map((r, i) => ({
              instrument: positions[i].instrument,
              status: r.status,
              detail: r.status === 'fulfilled' ? r.value : r.reason?.message,
            })),
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `CRITICAL: Emergency flatten failed: ${error.message}. MANUAL INTERVENTION REQUIRED.`,
        }],
        isError: true,
      };
    }
  },
  { readOnlyHint: false, destructiveHint: true }
);

// ========================
// TOOL: Get Market Data
// ========================
server.tool(
  "get_market_data",
  "Retrieve current market data for an instrument including bid/ask, last price, volume, and order book depth. Used by the Alpha Agent for signal generation and the Data Agent for enrichment.",
  {
    instrument: z.string().describe("Trading instrument symbol"),
    depth: z.number().int().min(1).max(20).default(5).describe("Order book depth levels"),
  },
  async ({ instrument, depth }) => {
    try {
      const data = await marketDataClient.getSnapshot(instrument, depth);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            instrument,
            last_price: data.lastPrice,
            bid: data.bestBid,
            ask: data.bestAsk,
            spread: data.bestAsk - data.bestBid,
            volume: data.volume,
            book: {
              bids: data.bids.slice(0, depth),
              asks: data.asks.slice(0, depth),
            },
            timestamp: data.timestamp,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Market data fetch failed: ${error.message}` }],
        isError: true,
      };
    }
  },
  { readOnlyHint: true }
);
```

## MCP Server Template (Python / FastMCP)

For Python-based MCP servers (useful for ML-heavy operations running on Colab):

```python
# heady-mcp-ml/server.py
from mcp.server.fastmcp import FastMCP
import numpy as np

mcp = FastMCP(
    name="heady-ml",
    version="1.0.0",
)

@mcp.tool()
async def generate_embeddings(
    texts: list[str],
    model: str = "all-MiniLM-L6-v2"
) -> dict:
    """
    Generate vector embeddings for a list of texts using the specified model.
    Used by the Data Agent for RAG pipeline and context enrichment.
    Returns embeddings as JSON-serializable lists.
    """
    from sentence_transformers import SentenceTransformer
    encoder = SentenceTransformer(model)
    embeddings = encoder.encode(texts, normalize_embeddings=True)
    return {
        "model": model,
        "dimension": embeddings.shape[1],
        "count": len(texts),
        "embeddings": embeddings.tolist(),
    }

@mcp.tool()
async def vector_search(
    query_embedding: list[float],
    top_k: int = 10,
    index_name: str = "default"
) -> dict:
    """
    Search the FAISS vector index for the nearest neighbors to the query embedding.
    Used by the Data Agent to retrieve relevant historical context for agent decisions.
    """
    query = np.array([query_embedding], dtype='float32')
    distances, indices = faiss_indices[index_name].search(query, top_k)
    return {
        "top_k": top_k,
        "results": [
            {"index": int(idx), "distance": float(dist)}
            for idx, dist in zip(indices[0], distances[0])
            if idx >= 0
        ],
    }

@mcp.tool()
async def run_inference(
    prompt: str,
    model_id: str = "default",
    max_tokens: int = 512,
    temperature: float = 0.7
) -> dict:
    """
    Run inference on a locally-loaded model. Used for specialized agent reasoning
    that requires fine-tuned models not available through commercial APIs.
    Only available on Cortex runtime (A100 80GB).
    """
    # Implementation depends on loaded model (vLLM, TGI, or raw transformers)
    result = await inference_engine.generate(
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return {
        "model": model_id,
        "text": result.text,
        "tokens_used": result.token_count,
        "runtime": "cortex",
    }
```

## MCP Server Inventory for Heady

These are the MCP servers the Heady ecosystem needs:

| MCP Server | Language | Purpose | Agents That Use It |
|-----------|----------|---------|-------------------|
| `heady-trading` | TypeScript | Order execution, account state, position management | Execution, Risk |
| `heady-market-data` | TypeScript | Real-time quotes, order book, historical data | Alpha, Data |
| `heady-ml` | Python | Embeddings, vector search, local model inference | Data, Alpha |
| `heady-compliance` | TypeScript | Apex rule validation, audit logging, regulatory checks | Compliance, Risk |
| `heady-monitoring` | TypeScript | Health checks, metrics, alerting | Sentinel |
| `heady-midi` | TypeScript | MIDI UMP packet translation, binary vector encoding | Bridge Builder |

## Connecting MCP Servers to Colab Runtimes

MCP servers running on Colab need to be accessible by the agents (which may run on different runtimes or on external infrastructure).

```python
# Start MCP server on a Colab runtime with Streamable HTTP transport
import asyncio
from mcp.server.fastmcp import FastMCP

async def start_mcp_on_colab(mcp_server: FastMCP, port: int = 8080):
    """Start an MCP server on Colab and expose it via Cloudflare Tunnel."""

    # Start the MCP server
    from starlette.applications import Starlette
    from starlette.routing import Mount
    app = Starlette(routes=[Mount("/mcp", app=mcp_server.streamable_http_app())])

    # Run with uvicorn
    import uvicorn
    config = uvicorn.Config(app, host="0.0.0.0", port=port, log_level="info")
    server = uvicorn.Server(config)

    # Start Cloudflare Tunnel in parallel
    tunnel_url, tunnel_proc = start_cloudflare_tunnel(port)
    print(f"MCP Server accessible at: {tunnel_url}/mcp")

    await server.serve()
```

## Security Requirements for MCP Servers

All Heady MCP servers MUST implement these security measures:

1. **Authentication** — All tool calls require a valid JWT bearer token. Tokens are issued by the Bridge Builder agent and have short expiry (15 minutes) with refresh.

2. **Rate Limiting** — Each agent has per-tool rate limits. The emergency_flatten tool has no rate limit. Order placement is limited to 10 per second per agent.

3. **Input Validation** — All tool inputs are validated against Zod (TypeScript) or Pydantic (Python) schemas before processing.

4. **Audit Logging** — Every tool call is logged as an immutable audit event with correlation ID, agent ID, timestamp, inputs, outputs, and latency.

5. **No Hardcoded Secrets** — All API keys, passwords, and tokens come from environment variables or a secret manager.
