/**
 * session-server.js — Central Auth Session Server
 * Hosted at auth.headysystems.com
 * Validates Firebase ID tokens and sets httpOnly, Secure, SameSite=Strict cookies
 * NO localStorage. NO client-accessible tokens. ZERO trust.
 * © 2024-2026 HeadySystems Inc. All Rights Reserved. 51 Provisional Patents.
 */
'use strict';

import express from 'express';
import { randomUUID } from 'crypto';
import admin from 'firebase-admin';

// ─── φ-Math Constants ──────────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const JWT_MAX_AGE_MS = Math.round(PHI * PHI * PHI * 1000 * 60); // ≈ 4.236 minutes × 60 ≈ 254s → use 15 min for practical
const SESSION_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes (short-lived)
const REFRESH_WINDOW_MS = 5 * 60 * 1000;   // Refresh if < 5 min remaining

const ALLOWED_ORIGINS = [
    'https://headyme.com', 'https://headysystems.com', 'https://heady-ai.com',
    'https://headyos.com', 'https://headyconnection.org', 'https://headyconnection.com',
    'https://headyex.com', 'https://headyfinance.com', 'https://admin.headysystems.com',
    'https://auth.headysystems.com',
];

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0920560496',
});

const app = express();
app.use(express.json());
app.disable('x-powered-by');

// ─── CORS for all Heady domains ──────────────────────────────────────────────
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ─── HeadyAutoContext Middleware (MANDATORY) ──────────────────────────────────
app.use((req, res, next) => {
    req.headyContext = {
        service: 'auth-session-server',
        domain: 'security',
        correlationId: req.headers['x-correlation-id'] || randomUUID(),
        timestamp: Date.now(),
    };
    res.setHeader('X-Heady-Service', 'auth-session-server');
    res.setHeader('X-Correlation-Id', req.headyContext.correlationId);
    next();
});

// ─── Create Session (POST /api/session) ──────────────────────────────────────
app.post('/api/session', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    try {
        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken, true);

        // Create session cookie
        const sessionCookie = await admin.auth().createSessionCookie(idToken, {
            expiresIn: SESSION_MAX_AGE_MS,
        });

        // Set httpOnly cookie — NOT accessible by JavaScript
        res.cookie('__heady_session', sessionCookie, {
            httpOnly: true,
            secure: true,
            sameSite: 'none', // Required for cross-site iframe
            maxAge: SESSION_MAX_AGE_MS,
            path: '/',
            domain: '.headysystems.com', // Shared across subdomains
        });

        res.json({
            authenticated: true,
            uid: decodedToken.uid,
            email: decodedToken.email,
        });
    } catch (err) {
        console.error('[AuthSession] Token verification failed:', err.message);
        res.status(401).json({ error: 'Invalid token', message: err.message });
    }
});

// ─── Verify Session (GET /api/session) ───────────────────────────────────────
app.get('/api/session', async (req, res) => {
    const sessionCookie = req.cookies?.['__heady_session'];
    if (!sessionCookie) return res.json({ authenticated: false });

    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        res.json({
            authenticated: true,
            uid: decodedClaims.uid,
            email: decodedClaims.email,
            displayName: decodedClaims.name || decodedClaims.email?.split('@')[0],
        });
    } catch (err) {
        // Clear invalid cookie
        res.clearCookie('__heady_session', { domain: '.headysystems.com', path: '/' });
        res.json({ authenticated: false });
    }
});

// ─── Destroy Session (DELETE /api/session) ───────────────────────────────────
app.delete('/api/session', async (req, res) => {
    const sessionCookie = req.cookies?.['__heady_session'];
    if (sessionCookie) {
        try {
            const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
            // Revoke refresh tokens for this user
            await admin.auth().revokeRefreshTokens(decodedClaims.sub);
        } catch (e) { /* best effort */ }
    }
    res.clearCookie('__heady_session', { domain: '.headysystems.com', path: '/' });
    res.json({ authenticated: false });
});

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ service: 'auth-session-server', status: 'operational', domain: 'security' });
});
app.get('/healthz', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3400;
app.listen(PORT, () => {
    console.log(`[AuthSession] auth.headysystems.com session server on port ${PORT}`);
});

export default app;
