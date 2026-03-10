const pino = require('pino');
const logger = pino();
// notification-service/index.js
const express = require('express');
const { WebSocketServer, OPEN } = require('ws');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(helmet());

const whitelist = ['https://headysystems.com', 'https://headyme.com'];
app.use(cors({
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Origin Validation during HTTP Upgrade to prevent CSWSH
server.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    if (origin && !whitelist.includes(origin)) {
        logger.warn(`Blocked WebSocket connection from unauthorized origin: ${origin}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }
    
    // Otherwise handle upgrade through the wsServer
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', async (message) => {
        try {
            const parsed = JSON.parse(message);
            if (!parsed.token) {
                ws.close(4001, 'Unauthorized Frame: Missing Token');
                return;
            }

            const isValid = await validateToken(parsed.token);
            if (!isValid) {
                ws.close(4001, 'Unauthorized Frame: Invalid Token');
                return;
            }

            broadcastWithBackoff(parsed.data, 0, [ws]);

        } catch (err) {
            logger.error('Message processing error:', err);
        }
    });

    ws.on('close', () => {
        logger.info('Client disconnected');
    });
});

const sendToClientWithBackoff = (client, message, attempt) => {
    if (attempt >= FIB[4]) {
        logger.warn('Max broadcast attempts reached for client');
        return;
    }
    
    if (client.readyState === OPEN) {
        client.send(JSON.stringify(message), (err) => {
            if (err) {
                const backoffTime = Math.pow(PHI, attempt) * 1000;
                setTimeout(() => sendToClientWithBackoff(client, message, attempt + 1), backoffTime);
            }
        });
    }
};

const broadcastWithBackoff = (message, attempt, ignoreClients = []) => {
    wss.clients.forEach(client => {
        if (!ignoreClients.includes(client)) {
            sendToClientWithBackoff(client, message, attempt);
        }
    });
}

const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(pingInterval));

async function validateToken(token) {
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return !!decodedToken.uid;
    } catch (error) {
        return false;
    }
}

app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

const PORT = process.env.PORT || 3398;
server.listen(PORT, () => {
    logger.info(`[notification-service] Listening on port ${PORT}`);
});
