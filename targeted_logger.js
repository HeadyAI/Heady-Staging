const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all JS/TS files in src and services ONLY
const cmd = 'find src/ services/ -type f \\( -name "*.js" -o -name "*.ts" \\) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*"';
const files = execSync(cmd).toString().split('\n').filter(Boolean);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Only process if it has console.log, console.error, console.warn, or console.info
    if (content.includes('console.log') || content.includes('console.error') || content.includes('console.warn') || content.includes('console.info')) {

        let newContent = content;
        let needsPino = false;

        // Add require('pino') at the top if it's not already there and there's no custom logger imported
        if (!newContent.includes('const logger') && !newContent.includes('import logger') && !newContent.includes('pino')) {
            needsPino = true;
        }

        // Skip files that seem to be cli tools or have specifically crafted string formatting for CLI
        if (newContent.includes('Usage: ') || newContent.includes('=== EXAMPLE') || newContent.includes('process.exit(')) {
            // Keep CLI tools using console
            return;
        }

        if (needsPino) {
            if (newContent.includes('require(')) {
                newContent = "const pino = require('pino');\nconst logger = pino();\n" + newContent;
            } else if (newContent.includes('import ')) {
                 newContent = "import pino from 'pino';\nconst logger = pino();\n" + newContent;
            } else {
                 newContent = "const pino = require('pino');\nconst logger = pino();\n" + newContent;
            }
        }

        newContent = newContent.replace(/console\.log/g, 'logger.info');
        newContent = newContent.replace(/console\.error/g, 'logger.error');
        newContent = newContent.replace(/console\.warn/g, 'logger.warn');
        newContent = newContent.replace(/console\.info/g, 'logger.info');

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.info('Processed console to pino for', filePath);
    }
}

files.forEach(processFile);
