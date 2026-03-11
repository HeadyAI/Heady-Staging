const express = require('express');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {
  process.stdout.write(JSON.stringify({level:'warn',msg:'Firebase Admin failed to init, missing creds.'})+'\n');
}

const app = express();
app.use(express.json());
app.use(cookieParser());

const CSL_CONFIDENCE = { include: 0.382, boost: 0.618, inject: 0.718 };
const PHI_INTERVAL = 1.618033988749895 * 1000 * 60 * 60 * 24;

app.post('/api/auth/sessionLogin', async (req, res) => {
  const idToken = req.body.idToken;
  const expiresIn = Math.round(PHI_INTERVAL);

  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    const options = { maxAge: expiresIn, httpOnly: true, secure: true, sameSite: 'Strict' };
    res.cookie('__heady_session', sessionCookie, options);
    res.end(JSON.stringify({ status: 'success', csl_gate: CSL_CONFIDENCE.boost }));
  } catch (error) {
    res.status(401).send(JSON.stringify({ status: 'UNAUTHORIZED' }));
  }
});

app.post('/api/auth/sessionLogout', (req, res) => {
  res.clearCookie('__heady_session');
  res.end(JSON.stringify({ status: 'success', csl_gate: CSL_CONFIDENCE.include }));
});

const port = process.env.PORT || 3310;
app.listen(port, () => {
  process.stdout.write(JSON.stringify({level:'info',msg:`auth-session-server running on port ${port}`,time:Date.now()})+'\n');
});
