const fs = require('fs');

const file = 'heady-manager.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add helmet and CSP headers
  if (!content.includes("const helmet = require('helmet');")) {
    content = content.replace("const express = require('express');", "const express = require('express');\nconst helmet = require('helmet');");
    
    const helmetConfig = `
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.headysystems.com", "https://auth.headysystems.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  }
}));
`;
    content = content.replace("app.use(express.json({ limit: '50mb' }));", "app.use(express.json({ limit: '50mb' }));\n" + helmetConfig);
  }

  // LLM prompt injection defenses
  if (!content.includes("verifyPromptInjection")) {
    const promptInjectionDefenses = `
const verifyPromptInjection = (req, res, next) => {
  const { prompt, text, query } = req.body;
  const input = prompt || text || query;
  if (!input) return next();

  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /you are now/i,
    /jailbreak/i,
    /DAN/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      return res.status(403).json({ error: 'HEADY-GUARD-001: Prompt injection detected' });
    }
  }

  next();
};
`;
    
    content = content.replace("const { exec } = require('child_process');", promptInjectionDefenses + "\nconst { exec } = require('child_process');");
    content = content.replace("app.post('/api/hf/generate', checkAuth,", "app.post('/api/hf/generate', checkAuth, verifyPromptInjection,");
    content = content.replace("app.post('/api/hf/infer', checkAuth,", "app.post('/api/hf/infer', checkAuth, verifyPromptInjection,");
  }

  fs.writeFileSync(file, content);
  console.log('Fixed OWASP in heady-manager.js');
}

