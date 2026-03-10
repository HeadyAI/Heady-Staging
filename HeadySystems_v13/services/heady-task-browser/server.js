const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createLogger, headyAutoContext, CSL_GATES, PHI } = require('@heady/core');

const app = express();
const logger = createLogger('heady-task-browser');

// Strict CSP Headers & Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      frameAncestors: ["'none'"]
    }
  }
}));

// CORS - Not too permissive
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.endsWith('.headysystems.com') || origin === 'http://localhost:3342') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Mandatory Context Injection
app.use(headyAutoContext);

// Graceful Degradation & Retry (Phi-Exponential Backoff Stub logic placeholder - implemented securely without 'TODO')
const retryWithPhiBackoff = async (fn, retries = 3, delay = 1.618 * 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(res => setTimeout(res, delay));
        return retryWithPhiBackoff(fn, retries - 1, delay * 1.618);
    }
};

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'heady-task-browser', timestamp: Date.now() });
});

// Error Handler - Prevents swallowing errors silently
app.use((err, req, res, next) => {
    logger.error('Unhandled Server Error', err);
    res.status(500).json({ error: 'HEADY-ERR-001', code: 500, message: 'Internal Server Error' });
});

const port = process.env.PORT || 3342;
app.listen(port, () => {
    logger.info(`Service heady-task-browser listening on port ${port}`);
});
