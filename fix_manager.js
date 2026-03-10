const fs = require('fs');

const file = 'heady-manager.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("const cookieParser = require('cookie-parser');")) {
    content = content.replace("const express = require('express');", "const express = require('express');\nconst cookieParser = require('cookie-parser');");
    content = content.replace("app.use(express.json({ limit: '50mb' }));", "app.use(express.json({ limit: '50mb' }));\napp.use(cookieParser());");
  }

  const authRoute = `
// Heady Auth Route (Sets HttpOnly cookie)
app.post('/api/auth/session', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    // Set the cookie
    res.cookie('__heady_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });
    
    res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('__heady_session');
    res.json({ success: true });
});
`;

  if (!content.includes('/api/auth/session')) {
    content = content.replace("const PORT = process.env.PORT || 3300;", authRoute + "\nconst PORT = process.env.PORT || 3300;");
  }

  content = content.replace("const token = req.headers['x-admin-token'];", "const token = (req.cookies && req.cookies.__heady_session) ? req.cookies.__heady_session : req.headers['x-admin-token'];");

  fs.writeFileSync(file, content);
  console.log('Fixed cookies in heady-manager.js');
} else {
  console.log('heady-manager.js not found');
}
