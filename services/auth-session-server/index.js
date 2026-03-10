const pino = require('pino');
const logger = pino();
// auth-session-server/index.js
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

const corsOptions = {
    origin: (origin, callback) => {
        const whitelist = [
            'https://headyme.com',
            'https://headysystems.com',
            'https://auth.headysystems.com',
            'https://admin.headysystems.com',
            'https://heady-ai.com',
            'https://headyos.com',
            'https://headyconnection.org',
            'https://headyconnection.com',
            'https://headyex.com',
            'https://headyfinance.com',
            'https://headybuddy.com',
        ];
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

const PHI = 1.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// Initialize Firebase Admin SDK using the default credential
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

app.post('/api/session', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(401).json({ error: 'UNAUTHORIZED', code: 'HEADY-AUTH-001' });
    }

    try {
        const expiresIn = FIB[10] * 60 * 60 * 1000; // 89 hours

        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

        const cookieOptions = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        };

        const cookieName = process.env.NODE_ENV === 'production' ? '__Host-heady_session' : '__heady_session';
        res.cookie(cookieName, sessionCookie, cookieOptions);

        res.status(200).json({ status: 'success' });
    } catch (error) {
        logger.error('Session creation failed:', error);
        res.status(401).json({ error: 'UNAUTHORIZED', code: 'HEADY-AUTH-002' });
    }
});

app.get('/api/session/verify', async (req, res) => {
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-heady_session' : '__heady_session';
    const sessionCookie = req.cookies[cookieName] || '';

    if (!sessionCookie) {
        return res.status(401).json({ error: 'UNAUTHORIZED', code: 'HEADY-AUTH-003' });
    }

    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        res.status(200).json({ status: 'valid', uid: decodedClaims.uid });
    } catch (error) {
        res.status(401).json({ error: 'UNAUTHORIZED', code: 'HEADY-AUTH-004' });
    }
});

app.post('/api/session/logout', (req, res) => {
    const cookieName = process.env.NODE_ENV === 'production' ? '__Host-heady_session' : '__heady_session';
    res.clearCookie(cookieName, { path: '/', secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ status: 'success' });
});

app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));

const PORT = process.env.PORT || 3397;
app.listen(PORT, () => {
    logger.info(`[auth-session-server] Running on port ${PORT}`);
});
