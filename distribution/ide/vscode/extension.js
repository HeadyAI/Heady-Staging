/**
 * Heady Dev Companion - VS Code Extension
 * Integrates Heady/Petty AI assistant into VS Code
 * 
 * Features:
 * - Inline completions
 * - Chat sidebar
 * - Code explain, test generation, doc generation
 * - Agent mode with voice input
 * - Direct connection to Heady Manager
 */

const vscode = require('vscode');
const http = require('http');

let statusBarItem;
let chatPanel;
let heady Manager Url = 'http://manager.dev.local.heady.internal:3300';

/**
 * Activate the extension
 */
async function activate(context) {
  console.log('🎨 Heady Dev Companion activating...');

  // Get Heady Manager URL from settings or environment
  const config = vscode.workspace.getConfiguration('heady');
  headyManagerUrl = config.get('managerUrl') || process.env.HEADY_MANAGER_URL || headyManagerUrl;

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'heady.openChat';
  statusBarItem.text = '$(sparkle) Heady';
  statusBarItem.tooltip = 'Open Heady Chat';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('heady.openChat', openChatPanel),
    vscode.commands.registerCommand('heady.explain', explainCode),
    vscode.commands.registerCommand('heady.generateTests', generateTests),
    vscode.commands.registerCommand('heady.generateDocs', generateDocs),
    vscode.commands.registerCommand('heady.refactor', refactorCode),
    vscode.commands.registerCommand('heady.debug', debugCode),
    vscode.commands.registerCommand('heady.optimize', optimizeCode),
    vscode.commands.registerCommand('heady.agentMode', agentMode),
    vscode.commands.registerCommand('heady.voiceInput', voiceInput),
    vscode.commands.registerCommand('heady.checkHealth', checkHealth)
  );

  // Register inline completion provider
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      new HeadyInlineCompletionProvider()
    )
  );

  // Check health on startup
  await checkHealth();

  console.log('✅ Heady Dev Companion activated');
}

/**
 * Open chat panel
 */
async function openChatPanel() {
  if (chatPanel) {
    chatPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  chatPanel = vscode.window.createWebviewPanel(
    'heady-chat',
    'Heady Chat',
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  chatPanel.webview.html = getChatHtml();

  chatPanel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'sendMessage') {
      const response = await queryHeady(message.text);
      chatPanel.webview.postMessage({ command: 'response', text: response });
    }
  });

  chatPanel.onDidDispose(() => {
    chatPanel = null;
  });
}

/**
 * Explain selected code
 */
async function explainCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showErrorMessage('No code selected');
    return;
  }

  const response = await queryHeady(`Explain this code:\n\n${code}`);
  showResult('Code Explanation', response);
}

/**
 * Generate tests for selected code
 */
async function generateTests() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showErrorMessage('No code selected');
    return;
  }

  const response = await queryHeady(`Generate comprehensive tests for this code:\n\n${code}`);
  
  // Insert tests in a new file
  const testDoc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: response
  });
  
  await vscode.window.showTextDocument(testDoc, vscode.ViewColumn.Beside);
}

/**
 * Generate documentation
 */
async function generateDocs() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const code = editor.document.getText();
  const response = await queryHeady(`Generate comprehensive documentation for this code:\n\n${code}`);
  showResult('Generated Documentation', response);
}

/**
 * Refactor code
 */
async function refactorCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showErrorMessage('No code selected');
    return;
  }

  const response = await queryHeady(`Refactor this code to be more maintainable and efficient:\n\n${code}`);
  
  // Replace selected code with refactored version
  editor.edit((editBuilder) => {
    editBuilder.replace(selection, response);
  });
}

/**
 * Debug code
 */
async function debugCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showErrorMessage('No code selected');
    return;
  }

  const response = await queryHeady(`Find and explain bugs in this code:\n\n${code}`);
  showResult('Debug Analysis', response);
}

/**
 * Optimize code
 */
async function optimizeCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No file open');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);

  if (!code) {
    vscode.window.showErrorMessage('No code selected');
    return;
  }

  const response = await queryHeady(`Optimize this code for performance:\n\n${code}`);
  showResult('Optimization Suggestions', response);
}

/**
 * Agent mode - continuous assistance
 */
async function agentMode() {
  vscode.window.showInformationMessage('🤖 Heady Agent Mode activated');
  openChatPanel();
}

/**
 * Voice input
 */
async function voiceInput() {
  vscode.window.showInformationMessage('🎤 Voice input not yet implemented');
}

/**
 * Check health of Heady Manager
 */
async function checkHealth() {
  try {
    const health = await makeRequest('/api/health');
    if (health.ok) {
      statusBarItem.text = '$(sparkle) Heady ✓';
      statusBarItem.color = '#4ec9b0';
    } else {
      statusBarItem.text = '$(sparkle) Heady ✗';
      statusBarItem.color = '#f48771';
    }
  } catch (err) {
    statusBarItem.text = '$(sparkle) Heady ✗';
    statusBarItem.color = '#f48771';
    console.warn('Heady health check failed:', err.message);
  }
}

/**
 * Query Heady Manager API
 */
async function queryHeady(prompt) {
  try {
    const response = await makeRequest('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: prompt })
    });
    return response.reply || 'No response from Heady';
  } catch (err) {
    vscode.window.showErrorMessage(`Heady error: ${err.message}`);
    return '';
  }
}

/**
 * Make HTTP request to Heady Manager
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(headyManagerUrl + path);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Show result in output panel
 */
function showResult(title, content) {
  const panel = vscode.window.createWebviewPanel(
    'heady-result',
    title,
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        pre { background: #252526; padding: 10px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <pre>${escapeHtml(content)}</pre>
    </body>
    </html>
  `;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get chat HTML
 */
function getChatHtml() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1e1e; color: #d4d4d4; }
        #chat { display: flex; flex-direction: column; height: 100vh; }
        #messages { flex: 1; overflow-y: auto; padding: 20px; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background: #0e639c; }
        .assistant { background: #252526; }
        #input-area { padding: 20px; border-top: 1px solid #3e3e42; }
        input { width: 100%; padding: 10px; background: #3c3c3c; color: #d4d4d4; border: 1px solid #555; border-radius: 5px; }
        button { margin-top: 10px; padding: 10px 20px; background: #0e639c; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #1177bb; }
      </style>
    </head>
    <body>
      <div id="chat">
        <div id="messages"></div>
        <div id="input-area">
          <input type="text" id="input" placeholder="Ask Heady..." />
          <button onclick="sendMessage()">Send</button>
        </div>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        
        function sendMessage() {
          const input = document.getElementById('input');
          const text = input.value.trim();
          if (!text) return;
          
          const messagesDiv = document.getElementById('messages');
          const userMsg = document.createElement('div');
          userMsg.className = 'message user';
          userMsg.textContent = text;
          messagesDiv.appendChild(userMsg);
          
          input.value = '';
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          
          vscode.postMessage({ command: 'sendMessage', text });
        }
        
        window.addEventListener('message', (event) => {
          if (event.data.command === 'response') {
            const messagesDiv = document.getElementById('messages');
            const assistantMsg = document.createElement('div');
            assistantMsg.className = 'message assistant';
            assistantMsg.textContent = event.data.text;
            messagesDiv.appendChild(assistantMsg);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }
        });
        
        document.getElementById('input').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Inline completion provider
 */
class HeadyInlineCompletionProvider {
  async provideInlineCompletionItems(document, position, context, token) {
    const line = document.lineAt(position.line).text;
    const beforeCursor = line.substring(0, position.character);

    try {
      const response = await makeRequest('/api/complete', {
        method: 'POST',
        body: JSON.stringify({
          code: document.getText(),
          line: position.line,
          column: position.character,
          context: beforeCursor
        })
      });

      if (response.completions && response.completions.length > 0) {
        return response.completions.map((completion) => ({
          insertText: completion.text,
          range: new vscode.Range(position, position)
        }));
      }
    } catch (err) {
      console.warn('Inline completion error:', err.message);
    }

    return [];
  }
}

function deactivate() {
  console.log('Heady Dev Companion deactivated');
}

module.exports = { activate, deactivate };
