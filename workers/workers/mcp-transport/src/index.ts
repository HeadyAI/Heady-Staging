import { MCPServer, MCPRequest } from '@heady-ai/mcp-server';

const ALLOWED_ORIGINS = ['https://heady-ai.com', 'https://app.heady-ai.com'];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders(request),
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    if (request.method === 'POST') {
      const server = new MCPServer();
      const mcpRequest: MCPRequest = await request.json();
      const response = await server.handleRequest(mcpRequest);

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request),
        }
      });
    }

    if (request.method === 'GET' && request.headers.get('Accept') === 'text/event-stream') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        await writer.write(encoder.encode('event: ping\ndata: {"status":"connected"}\n\n'));

        const interval = setInterval(async () => {
          await writer.write(encoder.encode('event: heartbeat\ndata: {"timestamp":' + Date.now() + '}\n\n'));
        }, 30000);

        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          writer.close();
        });
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders(request),
        }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }
};
