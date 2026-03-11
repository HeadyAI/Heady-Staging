/**
 * Heady™ Edge Proxy - Cloudflare Workers
 * Implements streaming, service bindings, and best practices
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: Date.now(),
        version: '3.2.3',
        edge: 'cloudflare-workers'
      }), {
        headers: { 
          'content-type': 'application/json',
          'x-heady-version': '3.2.3'
        }
      });
    }

    // Route to appropriate service using bindings (NOT REST)
    if (url.pathname.startsWith('/api/')) {
      return env.HEADY_MANAGER.fetch(request);
    }

    if (url.pathname.startsWith('/mcp/')) {
      return env.HEADY_MCP.fetch(request);
    }

    // Stream large responses (don't buffer in memory)
    if (url.pathname.startsWith('/stream/')) {
      return handleStreamingRequest(request, env);
    }

    // Queue background work
    if (url.pathname.startsWith('/queue/')) {
      return handleQueuedTask(request, env, ctx);
    }

    return new Response('Heady™ Edge Proxy', {
      headers: { 'x-heady-version': '3.2.3' }
    });
  }
};

async function handleStreamingRequest(request, env) {
  // DON'T: await response.text() or response.arrayBuffer()
  // DO: Stream the response body

  const upstream = await fetch('https://api.example.com/large-payload');

  // Stream directly - no buffering
  return new Response(upstream.body, {
    headers: upstream.headers
  });
}

async function handleQueuedTask(request, env, ctx) {
  const task = await request.json();

  // Send to queue for background processing
  await env.HEADY_TASKS.send({
    ...task,
    timestamp: Date.now()
  });

  return new Response(JSON.stringify({
    queued: true,
    taskId: task.id
  }), {
    headers: { 'content-type': 'application/json' }
  });
}

// Queue consumer handler
export async function queue(batch, env) {
  for (const message of batch.messages) {
    try {
      await processTask(message.body, env);
      message.ack();
    } catch (err) {
      message.retry();
    }
  }
}

async function processTask(task, env) {
  // Background task processing
  console.log('Processing task:', task.id);

  // Use KV for caching (binding, not REST)
  await env.HEADY_CACHE.put(
    `task:${task.id}`,
    JSON.stringify(task),
    { expirationTtl: 3600 }
  );
}
