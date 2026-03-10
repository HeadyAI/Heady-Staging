/**
 * Heady™ WebSocket Authentication Middleware
 * Per-connection AND per-frame token validation
 * © 2026 HeadySystems Inc.
 */

const admin = require('firebase-admin');

const PHI = 1.618033988749895;
const TOKEN_REVALIDATE_MS = 89 * 1000; // Fibonacci: revalidate every 89 seconds

/**
 * Authenticate WebSocket upgrade request
 */
async function authenticateUpgrade(req) {
    const token = req.headers['authorization']?.replace('Bearer ', '') ||
        req.url?.split('token=')[1]?.split('&')[0];

    if (!token) throw new Error('No authentication token provided');

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return {
            uid: decoded.uid,
            email: decoded.email,
            isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
            lastValidated: Date.now(),
            token,
        };
    } catch (err) {
        throw new Error(`Token verification failed: ${err.message}`);
    }
}

/**
 * Per-frame authentication check
 * Re-validates token on Fibonacci interval (89s)
 */
async function validateFrame(ws, authState) {
    const now = Date.now();

    if (now - authState.lastValidated > TOKEN_REVALIDATE_MS) {
        try {
            await admin.auth().verifyIdToken(authState.token);
            authState.lastValidated = now;
        } catch {
            ws.close(4401, 'Authentication expired');
            return false;
        }
    }
    return true;
}

/**
 * WebSocket server middleware for ws library
 */
function wsAuthMiddleware(wss) {
    wss.on('connection', async (ws, req) => {
        try {
            const authState = await authenticateUpgrade(req);
            ws._headyAuth = authState;

            // Wrap message handler for per-frame auth
            const origOn = ws.on.bind(ws);
            ws.on = function (event, handler) {
                if (event === 'message') {
                    return origOn(event, async (data) => {
                        const valid = await validateFrame(ws, ws._headyAuth);
                        if (valid) handler(data);
                    });
                }
                return origOn(event, handler);
            };

            ws.send(JSON.stringify({
                type: 'auth_success',
                uid: authState.uid,
            }));

        } catch (err) {
            ws.close(4401, err.message);
        }
    });
}

module.exports = { authenticateUpgrade, validateFrame, wsAuthMiddleware };
