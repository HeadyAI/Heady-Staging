const fs = require('fs');
const path = require('path');

// Simple search and replace for console logs in main JS files
function replaceConsole(filePath, loggerPath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if it has console calls
    if (!content.includes('console.')) return;

    // We replace console.log -> logger.info, console.error -> logger.error, console.warn -> logger.warn
    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.error\(/g, 'logger.error(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');

    // Add import
    if (!content.includes('const logger')) {
        content = `const logger = require('${loggerPath}');\n` + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

replaceConsole('heady-manager.js', './src/utils/logger.js');
replaceConsole('src/routes/auth-routes.js', '../utils/logger.js');
replaceConsole('services/core-api/app.js', '../../src/utils/logger.js');
replaceConsole('quick-server.js', './src/utils/logger.js');
