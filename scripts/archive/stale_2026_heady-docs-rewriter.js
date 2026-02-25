const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
}

const STALE_TERMS = ['HeadyStack', 'Parrot', 'Windsurf', 'Claude', 'OpenAI', 'Gemini', 'headysystems.local'];
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const ARCHIVE_DIR = path.join(DOCS_DIR, 'archive');

if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

async function openaiRewrite(content, filePath) {
    const isCode = filePath.includes('/scripts/') || filePath.endsWith('.js');
    const systemPrompt = isCode
        ? `You are a Heady Systems engineer. Your job is to update this script for the 2026 architecture.
CRITICAL: DO NOT change the runtime logic, imports, or functional behavior.
ONLY update top-level comments, console.log messages, and string formats.
Replace dead terms (HeadyStack, Windsurf, Claude, OpenAI, Parrot) with HeadyConductor, HeadyBrain, HeadyAI-IDE, etc.
Output ONLY the raw script code. No markdown blocks, no \`\`\`javascript, no introductory text.`

        : `You are the CPO of Heady AI Platform (2026).
Your job is to rewrite this documentation file entirely from scratch, bringing it up to the current production state.
- REMOVE all mentions of: HeadyStack, Parrot, Windsurf, Claude, OpenAI, Gemini, Ollama, HuggingFace.
- REPLACE WITH: HeadyConductor (federated liquid router with 19 service groups), HeadyBrain (intelligence engine), DuckDB V2 (vector memory), Redis (rate limiting/caching), Cloudflare (Edge/WAF), PQC (ML-KEM/ML-DSA security), HeadyAI-IDE.
- Keep the same general purpose of the file, but make it read like a premium, proprietary Heady Systems document.
- ALWAYS add the proprietary watermark at the very top:
<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
Output ONLY the raw markdown content. No conversational text, no \`\`\`markdown wrappers.`;

    const payload = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Rewrite the following file:\n\n${content}` }
        ],
        temperature: 0.2
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) return reject(parsed.error);
                    let text = parsed.choices[0].message.content.trim();
                    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
                    resolve(text);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    let staleFiles = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file !== 'archive' && file !== 'node_modules' && file !== '.git') {
                staleFiles = staleFiles.concat(scanDirectory(fullPath));
            }
        } else if (fullPath.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const isStale = STALE_TERMS.some(term => content.includes(term));
            if (isStale) {
                staleFiles.push(fullPath);
            }
        }
    }
    return staleFiles;
}

async function run() {
    console.log("🔍 Scanning for stale documentation...");
    const staleDocs = scanDirectory(DOCS_DIR);
    console.log(`Found ${staleDocs.length} stale documents. Proceeding with Archive & Rewrite...`);

    for (const docPath of staleDocs) {
        const fileName = path.basename(docPath);
        const archivePath = path.join(ARCHIVE_DIR, `stale_2026_${fileName}`);

        console.log(`\n⏳ Processing: ${docPath}`);
        try {
            const originalContent = fs.readFileSync(docPath, 'utf8');

            // 1. Archive original
            fs.copyFileSync(docPath, archivePath);
            console.log(`  └─ Archived to: ${archivePath}`);

            // 2. Rewrite with OpenAI
            console.log(`  └─ Rewriting via GPT-4o-mini...`);
            const rewrittenContent = await openaiRewrite(originalContent, docPath);

            // 3. Save new file
            fs.writeFileSync(docPath, rewrittenContent);
            console.log(`  └─ ✅ Successfully rewrote and saved.`);

            // Artificial delay to respect rate limits
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.error(`  └─ ❌ Failed to rewrite ${fileName}:`, err.message || err);
        }
    }

    console.log("\n✅ Document Rewrite Pipeline Complete.");
}

run();
