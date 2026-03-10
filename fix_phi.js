const fs = require('fs');

const file = 'heady-manager.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Apply Fibonacci sequence to rate limiting
  content = content.replace(/max: 120, \/\/ Limit each IP to 120 requests per `window`/g, "max: 144, // Limit each IP to 144 (Fibonacci) requests per `window`");
  
  fs.writeFileSync(file, content);
  console.log('Fixed heady-manager.js');
}

const file2 = 'backend/src/index.js';
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  
  // Apply Fibonacci sequence to rate limiting
  if (content.includes("max: 100")) {
    content = content.replace(/max: 100/g, "max: 144");
  } else if (!content.includes("const limiter")) {
    const rateLimitCode = `
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 144, // Fibonacci sequence
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
`;
    content = content.replace("app.use(cookieParser());", "app.use(cookieParser());\n" + rateLimitCode);
  }
  
  fs.writeFileSync(file2, content);
  console.log('Fixed backend/src/index.js');
}
