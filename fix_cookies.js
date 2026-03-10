const fs = require('fs');

const file = 'backend/src/index.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add cookie-parser to index.js
  if (!content.includes("const cookieParser = require('cookie-parser');")) {
    content = content.replace('const express = require("express");', 'const express = require("express");\nconst cookieParser = require("cookie-parser");');
    content = content.replace('app.use(express.json());', 'app.use(express.json());\napp.use(cookieParser());');
  }

  // Create an auth route to set the cookie
  const authRoute = `
// Heady Auth Route (Sets HttpOnly cookie)
app.post('/api/auth/session', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    // In a real implementation, verify the Firebase token here
    res.cookie('__heady_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });
    
    res.json({ success: true });
});

// Middleware to check session cookie
const requireAuth = (req, res, next) => {
    const token = req.cookies.__heady_session;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Missing __heady_session cookie' });
    }
    // Verify token here
    req.user = { id: 'admin' }; // Mock user
    next();
};

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('__heady_session');
    res.json({ success: true });
});
`;

  if (!content.includes('/api/auth/session')) {
    content = content.replace('const PORT = process.env.PORT || 3300;', authRoute + '\nconst PORT = process.env.PORT || 3300;');
  }

  fs.writeFileSync(file, content);
  console.log('Fixed cookies in backend/src/index.js');
} else {
  console.log('backend/src/index.js not found');
}
