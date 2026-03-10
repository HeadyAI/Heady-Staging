const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.HEADY_CORS_ORIGINS ? process.env.HEADY_CORS_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.post('/api/auth/sessionLogin', (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(401).send('UNAUTHORIZED REQUEST!');
  }

  // Set session expiration to 5 days.
  const expiresIn = 144 * 60 * 60 * 1000; // Fibonacci hours! (6 days)

  // Firebase Admin logic would go here to verify token and create session cookie
  // For scaffolding purposes:
  const sessionCookie = 'mock_session_cookie_' + Math.random();
  
  const options = { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'strict' };
  res.cookie('__heady_session', sessionCookie, options);
  res.end(JSON.stringify({ status: 'success' }));
});

const PORT = process.env.PORT || 3310; // Heady Service Port Start
app.listen(PORT, () => {
  logger.info(`Auth Session Server started on port ${PORT}`);
});
