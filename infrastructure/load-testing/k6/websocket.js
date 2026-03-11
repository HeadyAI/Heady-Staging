import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const connectionDuration = new Trend('connection_duration');
const messageLatency = new Trend('message_latency');
const connectionErrors = new Counter('connection_errors');
const messageErrors = new Counter('message_errors');
const activeConnections = new Gauge('active_connections');
const messagesReceived = new Counter('messages_received');
const messagesSent = new Counter('messages_sent');

// Configuration
const BASE_URL = __ENV.WS_URL || 'ws://localhost:3325';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-token';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    'connection_duration': ['p(95)<2000', 'p(99)<4000'],
    'message_latency': ['p(95)<500', 'p(99)<1000'],
    'connection_errors': ['rate<0.01'],
    'message_errors': ['rate<0.01'],
    'ws_connecting': ['rate<0.01'],
    'ws_session_duration': ['p(95)<300000'],
  },
};

export default function () {
  activeConnections.add(1);

  const url = `${BASE_URL}/ws?token=${AUTH_TOKEN}`;
  const params = {
    tags: { name: 'WebSocketConnection' },
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'X-Request-ID': generateRequestId(),
    },
  };

  const startTime = new Date().getTime();

  const res = ws.connect(url, params, function (socket) {
    // Connection successful
    const connectionTime = new Date().getTime() - startTime;
    connectionDuration.add(connectionTime);

    // Send initial subscription
    sendSubscriptionMessage(socket);

    // Set up message handlers
    socket.on('open', () => {
      console.log(`WebSocket connected from VU ${__VU}`);
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(socket, message);
        messagesReceived.add(1);
      } catch (e) {
        messageErrors.add(1);
        console.error(`Failed to parse message: ${e}`);
      }
    });

    socket.on('close', () => {
      console.log(`WebSocket closed for VU ${__VU}`);
    });

    socket.on('error', (e) => {
      connectionErrors.add(1);
      console.error(`WebSocket error: ${e}`);
    });

    // Simulate user activity
    const sessionDuration = 30000 + Math.random() * 30000; // 30-60 seconds per user
    const startSession = new Date().getTime();

    while (new Date().getTime() - startSession < sessionDuration && socket.readyState === ws.OPEN) {
      // Send message every 1-3 seconds
      const messageInterval = 1000 + Math.random() * 2000;
      __VU % 3 === 0 ? sendChatMessage(socket) : sendPresenceUpdate(socket);
      messagesSent.add(1);

      socket.setTimeout(() => {}, messageInterval);
    }

    // Close connection gracefully
    socket.close();
  });

  check(res, {
    'WebSocket connection status is 101': (r) => r && r.status === 101,
    'connection established': () => res !== null,
  }) || connectionErrors.add(1);

  activeConnections.add(-1);
}

function sendSubscriptionMessage(socket) {
  const subscription = {
    type: 'subscribe',
    channel: 'notifications',
    filters: {
      userId: `user-${__VU}`,
      includeSystemMessages: true,
    },
  };

  socket.send(JSON.stringify(subscription));
  messagesSent.add(1);
}

function sendChatMessage(socket) {
  const channels = ['general', 'random', 'announcements', 'support'];
  const channel = channels[Math.floor(Math.random() * channels.length)];

  const message = {
    type: 'message',
    channel: channel,
    content: `Load test message from VU ${__VU} at ${new Date().toISOString()}`,
    timestamp: Date.now(),
  };

  const startTime = new Date().getTime();
  socket.send(JSON.stringify(message));
  messageLatency.add(new Date().getTime() - startTime);
}

function sendPresenceUpdate(socket) {
  const presence = {
    type: 'presence',
    status: Math.random() > 0.5 ? 'online' : 'away',
    userId: `user-${__VU}`,
    timestamp: Date.now(),
  };

  socket.send(JSON.stringify(presence));
}

function handleMessage(socket, message) {
  const messageLatencyTime = new Date().getTime() - message.timestamp;
  messageLatency.add(messageLatencyTime);

  switch (message.type) {
    case 'notification':
      handleNotification(message);
      break;
    case 'message_ack':
      // Message was delivered
      break;
    case 'presence_update':
      // User presence changed
      break;
    case 'error':
      messageErrors.add(1);
      console.error(`Server error: ${message.message}`);
      break;
    case 'ping':
      // Respond to ping with pong
      const pong = {
        type: 'pong',
        timestamp: Date.now(),
      };
      socket.send(JSON.stringify(pong));
      break;
    default:
      // Unknown message type
      break;
  }
}

function handleNotification(message) {
  const severities = ['info', 'warning', 'error', 'success'];
  check(message, {
    'notification has type': (m) => m.type !== undefined,
    'notification has content': (m) => m.content !== undefined,
    'notification has timestamp': (m) => m.timestamp !== undefined,
  });
}

function generateRequestId() {
  return `ws-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// WebSocket load test scenarios
export function webSocketBroadcast() {
  activeConnections.add(1);

  ws.connect(`${BASE_URL}/ws?token=${AUTH_TOKEN}`, {}, function (socket) {
    // Join broadcast channel
    socket.send(JSON.stringify({
      type: 'subscribe',
      channel: 'broadcast',
    }));

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'broadcast message has content': (m) => m.content !== undefined,
      });
      messagesReceived.add(1);
    });

    // Stay connected for 1 minute
    socket.setTimeout(() => {
      socket.close();
    }, 60000);
  });

  activeConnections.add(-1);
}

// Test multiple simultaneous connections from single VU
export function webSocketMultiple() {
  activeConnections.add(3);

  const socketPromises = [];

  for (let i = 0; i < 3; i++) {
    const socketPromise = new Promise((resolve) => {
      ws.connect(`${BASE_URL}/ws?token=${AUTH_TOKEN}-${i}`, {}, function (socket) {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel: `channel-${i}`,
        }));

        socket.on('message', (data) => {
          messagesReceived.add(1);
        });

        socket.setTimeout(() => {
          socket.close();
          resolve();
        }, 30000);
      });
    });

    socketPromises.push(socketPromise);
  }

  // Wait for all connections to close
  Promise.all(socketPromises).then(() => {
    activeConnections.add(-3);
  });
}

// Test high-frequency message scenario
export function webSocketHighFrequency() {
  activeConnections.add(1);

  ws.connect(`${BASE_URL}/ws?token=${AUTH_TOKEN}`, {}, function (socket) {
    // Send messages as fast as possible
    const startTime = new Date().getTime();
    let messageCount = 0;

    while (new Date().getTime() - startTime < 10000) { // 10 second burst
      socket.send(JSON.stringify({
        type: 'message',
        content: `High frequency message ${messageCount}`,
        timestamp: Date.now(),
      }));

      messageCount++;
      messagesSent.add(1);
    }

    socket.on('message', (data) => {
      messagesReceived.add(1);
    });

    socket.setTimeout(() => {
      socket.close();
    }, 15000);
  });

  activeConnections.add(-1);
}
