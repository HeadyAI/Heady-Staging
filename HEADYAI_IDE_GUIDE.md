# 🚀 HeadyAI-IDE: Custom IDE with Windsurf-Next Base

## 🎯 Overview

HeadyAI-IDE is a custom IDE built on the Windsurf-Next foundation, featuring integrated HeadyBuddy AI companion, Sacred Geometry design principles, and advanced AI-powered development tools.

**Built for developers who want AI assistance that understands their code and workflow**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│        HeadyAI-IDE (Windsurf-Next)      │
│  • Custom Heady branding & themes       │
│  • Built-in HeadyBuddy sidebar          │
│  • AI-powered code assistance          │
│  • Sacred Geometry UI design            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         AI INTEGRATION LAYER            │
│  • Claude Code Integration              │
│  • Local LLM Support                    │
│  • Code Analysis & Understanding        │
│  • Smart Autocomplete                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         EXTENSION SYSTEM                │
│  • HeadyBuddy Extension                 │
│  • Custom Language Support              │
│  • Development Tools                    │
│  • Project Templates                    │
└─────────────────────────────────────────┘
```

---

## 📦 Installation & Setup

### Prerequisites

```bash
# System requirements
Node.js >= 18.0.0
Python >= 3.9
Git >= 2.30
8GB+ RAM
SSD recommended
```

### Quick Install

```bash
# Clone the repository
git clone https://github.com/headysystems/headyai-ide.git
cd headyai-ide

# Install dependencies
npm install

# Build the IDE
npm run build

# Launch HeadyAI-IDE
npm run start
```

### Development Setup

```bash
# Fork and clone your version
git clone https://github.com/yourusername/headyai-ide.git
cd headyai-ide

# Install development dependencies
npm install --dev

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build:prod
```

---

## 🎨 Sacred Geometry UI Design

### Theme System

```json
{
  "name": "Heady Sacred Geometry",
  "type": "dark",
  "colors": {
    "editor.background": "#0a0a0f",
    "editor.foreground": "#e0e0ff",
    "editor.lineHighlightBackground": "#1a1a2e",
    "editor.selectionBackground": "#16213e",
    "editorCursor.foreground": "#7c3aed",
    "editorIndentGuide.background": "#2a2a3e",
    "activityBar.background": "#0f0f1e",
    "sideBar.background": "#1a1a2e",
    "titleBar.activeBackground": "#16213e",
    "statusBar.background": "#1e1e3e"
  },
  "tokenColors": [
    {
      "name": "Heady Purple",
      "scope": ["keyword", "storage.type", "support.type"],
      "settings": { "foreground": "#7c3aed" }
    },
    {
      "name": "Heady Blue",
      "scope": ["string", "support.constant"],
      "settings": { "foreground": "#3b82f6" }
    },
    {
      "name": "Heady Green",
      "scope": ["entity.name.function", "support.function"],
      "settings": { "foreground": "#10b981" }
    }
  ]
}
```

### Breathing Animations

```css
/* Sacred Geometry breathing effect */
.heady-breathing {
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.9; 
  }
  50% { 
    transform: scale(1.05); 
    opacity: 1; 
  }
}

/* Golden ratio proportions */
:root {
  --phi: 1.618;
  --golden-ratio: calc(1rem * var(--phi));
  --primary-hue: 280;
}

.heady-panel {
  border-radius: calc(var(--golden-ratio) * 8px);
  background: linear-gradient(
    135deg,
    hsl(var(--primary-hue), 20%, 10%),
    hsl(calc(var(--primary-hue) + 30), 20%, 15%)
  );
  border: 1px solid hsl(var(--primary-hue), 30%, 30%);
}
```

---

## 🤖 HeadyBuddy Integration

### Sidebar Extension

```typescript
// src/extensions/headybuddy/src/HeadyBuddyPanel.ts
import * as vscode from 'vscode';

export class HeadyBuddyPanel {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.createPanel();
    this.setupEventHandlers();
  }

  private createPanel() {
    this.panel = vscode.window.createWebviewPanel(
      'headybuddy',
      'HeadyBuddy AI Assistant',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    this.setupMessageHandlers();
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HeadyBuddy</title>
        <style>
          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a0a0f, #1a1a2e);
            color: #e0e0ff;
            margin: 0;
            padding: 20px;
          }
          .chat-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
          }
          .input-area {
            display: flex;
            gap: 10px;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
          }
          .message {
            margin: 10px 0;
            padding: 12px;
            border-radius: 8px;
            animation: fadeIn 0.3s ease-in;
          }
          .user-message {
            background: #7c3aed;
            margin-left: 20%;
          }
          .buddy-message {
            background: #1e1e3e;
            margin-right: 20%;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
      </head>
      <body>
        <div class="chat-container">
          <div class="messages" id="messages"></div>
          <div class="input-area">
            <input type="text" id="messageInput" placeholder="Ask HeadyBuddy anything..." />
            <button id="sendButton">Send</button>
          </div>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          const messagesDiv = document.getElementById('messages');
          const input = document.getElementById('messageInput');
          const sendBtn = document.getElementById('sendButton');

          function addMessage(content, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'buddy-message'}\`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }

          function sendMessage() {
            const message = input.value.trim();
            if (message) {
              addMessage(message, true);
              vscode.postMessage({
                command: 'chat',
                text: message
              });
              input.value = '';
            }
          }

          sendBtn.addEventListener('click', sendMessage);
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
          });

          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'response':
                addMessage(message.text, false);
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private setupMessageHandlers() {
    this.panel?.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'chat':
            const response = await this.handleChatMessage(message.text);
            this.panel?.webview.postMessage({
              command: 'response',
              text: response
            });
            break;
        }
      },
      undefined,
      this.disposables
    );
  }

  private async handleChatMessage(text: string): Promise<string> {
    // Get current editor context
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    const document = editor?.document;
    
    const context = {
      message: text,
      language: document?.languageId,
      selection: selection ? {
        start: selection.start,
        end: selection.end,
        text: document?.getText(selection)
      } : null,
      file: document?.uri.fsPath,
      workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    };

    // Send to HeadyBuddy AI service
    const response = await fetch('https://api.headysystems.com/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.HEADY_API_KEY}\`
      },
      body: JSON.stringify(context)
    });

    const result = await response.json();
    return result.response;
  }

  dispose() {
    this.panel?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
```

### AI Code Actions

```typescript
// src/extensions/headybuddy/src/CodeActions.ts
import * as vscode from 'vscode';

export class HeadyCodeActions {
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.registerCodeActions();
  }

  private registerCodeActions() {
    // Explain code
    const explainAction = vscode.commands.registerCommand(
      'heady.explainCode',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const code = editor.document.getText(selection);
        
        if (!code) {
          vscode.window.showErrorMessage('Please select code to explain');
          return;
        }

        const explanation = await this.explainCode(code);
        this.showExplanation(explanation);
      }
    );

    // Generate tests
    const testAction = vscode.commands.registerCommand(
      'heady.generateTests',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = editor.document.getText(editor.selection);
        const tests = await this.generateTests(code);
        this.insertTests(tests);
      }
    );

    // Fix code
    const fixAction = vscode.commands.registerCommand(
      'heady.fixCode',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = editor.document.getText(editor.selection);
        const fixed = await this.fixCode(code);
        this.replaceSelection(fixed);
      }
    );

    // Optimize code
    const optimizeAction = vscode.commands.registerCommand(
      'heady.optimizeCode',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = editor.document.getText(editor.selection);
        const optimized = await this.optimizeCode(code);
        this.replaceSelection(optimized);
      }
    );

    this.disposables.push(explainAction, testAction, fixAction, optimizeAction);
  }

  private async explainCode(code: string): Promise<string> {
    const response = await fetch('https://api.headysystems.com/ai/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.HEADY_API_KEY}\`
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    return result.explanation;
  }

  private async generateTests(code: string): Promise<string> {
    const response = await fetch('https://api.headysystems.com/ai/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.HEADY_API_KEY}\`
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    return result.tests;
  }

  private async fixCode(code: string): Promise<string> {
    const response = await fetch('https://api.headysystems.com/ai/fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.HEADY_API_KEY}\`
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    return result.fixed;
  }

  private async optimizeCode(code: string): Promise<string> {
    const response = await fetch('https://api.headysystems.com/ai/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.HEADY_API_KEY}\`
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();
    return result.optimized;
  }

  private showExplanation(explanation: string) {
    const panel = vscode.window.createWebviewPanel(
      'codeExplanation',
      'Code Explanation',
      vscode.ViewColumn.Beside,
      {}
    );

    panel.webview.html = \`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Inter', sans-serif; 
            padding: 20px; 
            background: #1a1a2e; 
            color: #e0e0ff; 
          }
          pre { 
            background: #0a0a0f; 
            padding: 15px; 
            border-radius: 8px; 
            overflow-x: auto; 
          }
        </style>
      </head>
      <body>
        <h2>Code Explanation</h2>
        <div>\${explanation}</div>
      </body>
      </html>
    \`;
  }

  private insertTests(tests: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const position = editor.selection.end;
    editor.edit(editBuilder => {
      editBuilder.insert(position, \`\n\n\${tests}\`);
    });
  }

  private replaceSelection(newCode: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    editor.edit(editBuilder => {
      editBuilder.replace(editor.selection, newCode);
    });
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
  }
}
```

---

## 🔧 Configuration

### Settings

```json
{
  "heady.ai.apiKey": "your-api-key-here",
  "heady.ai.model": "claude-3-sonnet",
  "heady.ai.contextWindow": 100000,
  "heady.ai.temperature": 0.7,
  "heady.ui.theme": "sacred-geometry",
  "heady.ui.breathingAnimations": true,
  "heady.ui.showLineNumbers": true,
  "heady.code.autoComplete": true,
  "heady.code.explainOnHover": true,
  "heady.code.generateTests": true,
  "heady.code.optimizeOnSave": false,
  "heady.sync.enabled": true,
  "heady.sync.server": "wss://headysystems.com/sync"
}
```

### Keybindings

```json
{
  "key": "ctrl+shift+h",
  "command": "heady.explainCode",
  "when": "editorTextFocus"
},
{
  "key": "ctrl+shift+t",
  "command": "heady.generateTests",
  "when": "editorTextFocus"
},
{
  "key": "ctrl+shift+f",
  "command": "heady.fixCode",
  "when": "editorTextFocus"
},
{
  "key": "ctrl+shift+o",
  "command": "heady.optimizeCode",
  "when": "editorTextFocus"
},
{
  "key": "ctrl+shift+b",
  "command": "heady.openChat",
  "when": "!headyChatVisible"
}
```

---

## 📚 Language Support

### Custom Languages

```typescript
// src/extensions/headybuddy/src/LanguageSupport.ts
export class HeadyLanguageSupport {
  private languages: Map<string, LanguageConfig> = new Map();

  constructor() {
    this.registerLanguages();
  }

  private registerLanguages() {
    // HeadyScript (custom DSL)
    this.registerLanguage('headyscript', {
      id: 'headyscript',
      aliases: ['hs', 'heady'],
      extensions: ['.hs'],
      configuration: './language-configuration.json',
      tokenizer: this.createHeadyscriptTokenizer()
    });

    // Sacred Geometry Markup
    this.registerLanguage('sgml', {
      id: 'sgml',
      aliases: ['sgml'],
      extensions: ['.sgml'],
      configuration: './sgml-configuration.json',
      tokenizer: this.createSGMLTokenizer()
    });
  }

  private createHeadyscriptTokenizer() {
    return {
      tokenizer: {
        root: [
          // Keywords
          [/\b(sacred|geometry|breathing|phi|golden|ratio)\b/, 'keyword'],
          // Functions
          [/\b(create|transform|evolve|manifest)\b/, 'functions'],
          // Numbers
          [/\b\d+\.?\d*\b/, 'number'],
          // Strings
          [/"([^"\\]|\\.)*"/, 'string'],
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment']
        ]
      }
    };
  }

  private createSGMLTokenizer() {
    return {
      tokenizer: {
        root: [
          // Tags
          [/<\/?[\w-]+>/, 'tag'],
          // Attributes
          [/\w+\s*=\s*"[^"]*"/, 'attribute'],
          // Sacred geometry keywords
          [/\b(phi|golden|sacred|breathing|organic)\b/, 'keyword'],
          // Values
          [/\b\d+(?:\.\d+)?(?:%|px|em|rem|vh|vw)?\b/, 'number']
        ]
      }
    };
  }
}
```

---

## 🚀 Performance Optimization

### Memory Management

```typescript
// src/core/PerformanceManager.ts
export class PerformanceManager {
  private memoryMonitor: MemoryMonitor;
  private cacheManager: CacheManager;
  private taskQueue: TaskQueue;

  constructor() {
    this.memoryMonitor = new MemoryMonitor();
    this.cacheManager = new CacheManager();
    this.taskQueue = new TaskQueue();
    this.setupOptimizations();
  }

  private setupOptimizations() {
    // Monitor memory usage
    this.memoryMonitor.onThresholdExceeded((usage) => {
      if (usage > 80) {
        this.performCleanup();
      }
    });

    // Optimize AI responses
    this.cacheManager.onEviction((key) => {
      console.log(\`Cache evicted: \${key}\`);
    });
  }

  private performCleanup() {
    // Clear unused caches
    this.cacheManager.clearExpired();
    
    // Garbage collect
    if (global.gc) {
      global.gc();
    }

    // Notify user
    vscode.window.showInformationMessage(
      'HeadyAI-IDE performed memory cleanup for optimal performance'
    );
  }
}

class MemoryMonitor {
  private threshold = 80; // 80% memory usage
  private interval = 30000; // Check every 30 seconds

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const percentage = (heapUsedMB / heapTotalMB) * 100;

      if (percentage > this.threshold) {
        this.onThresholdExceeded?.(percentage);
      }
    }, this.interval);
  }

  onThresholdExceeded?: (usage: number) => void;
}
```

---

## 🔄 Build System

### Custom Build Configuration

```json
{
  "name": "headyai-ide",
  "version": "1.0.0",
  "description": "HeadyAI-IDE - AI-powered development environment",
  "main": "out/main.js",
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package",
    "build": "npm run compile && npm run package",
    "dev": "npm run watch"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.74.0",
    "vscode": "^1.85.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "20.x",
    "typescript": "^5.3.0",
    "@vscode/test-electron": "^2.3.0",
    "eslint": "^8.55.0",
    "vsce": "^2.19.0"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "activationEvents": [
    "onCommand:heady.explainCode",
    "onCommand:heady.generateTests",
    "onCommand:heady.fixCode",
    "onCommand:heady.optimizeCode"
  ],
  "contributes": {
    "commands": [
      {
        "command": "heady.explainCode",
        "title": "Explain Code",
        "category": "HeadyAI"
      },
      {
        "command": "heady.generateTests",
        "title": "Generate Tests",
        "category": "HeadyAI"
      },
      {
        "command": "heady.fixCode",
        "title": "Fix Code",
        "category": "HeadyAI"
      },
      {
        "command": "heady.optimizeCode",
        "title": "Optimize Code",
        "category": "HeadyAI"
      }
    ],
    "views": {
      "explorer": [
        {
          "id": "headybuddy",
          "name": "HeadyBuddy",
          "when": "workspaceHasPackageJson"
        }
      ]
    },
    "configuration": {
      "title": "HeadyAI-IDE",
      "properties": {
        "heady.ai.apiKey": {
          "type": "string",
          "default": "",
          "description": "API key for HeadyAI services"
        },
        "heady.ai.model": {
          "type": "string",
          "enum": ["claude-3-sonnet", "claude-3-haiku", "claude-3-opus"],
          "default": "claude-3-sonnet",
          "description": "AI model to use"
        }
      }
    }
  }
}
```

---

## 📊 Analytics & Telemetry

### Usage Tracking

```typescript
// src/core/Analytics.ts
export class HeadyAnalytics {
  private events: AnalyticsEvent[] = [];
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.setupEventTracking();
  }

  private setupEventTracking() {
    // Track code actions
    vscode.workspace.onDidSaveTextDocument((doc) => {
      this.trackEvent('file_saved', {
        language: doc.languageId,
        size: doc.getText().length
      });
    });

    // Track AI usage
    vscode.commands.onDidExecuteCommand((e) => {
      if (e.command.startsWith('heady.')) {
        this.trackEvent('ai_command_used', {
          command: e.command,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  trackEvent(name: string, data: any) {
    const event: AnalyticsEvent = {
      name,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };

    this.events.push(event);
    this.flushEvents();
  }

  private async flushEvents() {
    if (this.events.length === 0) return;

    try {
      await fetch('https://api.headysystems.com/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${this.apiKey}\`
        },
        body: JSON.stringify({ events: this.events })
      });

      this.events = [];
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = vscode.workspace.getConfiguration('heady')
      .get('sessionId') as string;
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      vscode.workspace.getConfiguration('heady')
        .update('sessionId', sessionId, vscode.ConfigurationTarget.Global);
    }
    
    return sessionId;
  }
}

interface AnalyticsEvent {
  name: string;
  data: any;
  timestamp: string;
  sessionId: string;
}
```

---

## 🧪 Testing

### Unit Tests

```typescript
// src/test/HeadyBuddy.test.ts
import * as assert from 'assert';
import { HeadyBuddyPanel } from '../extensions/headybuddy/src/HeadyBuddyPanel';

suite('HeadyBuddy Extension Test Suite', () => {
  let panel: HeadyBuddyPanel;

  setup(() => {
    panel = new HeadyBuddyPanel();
  });

  teardown(() => {
    panel.dispose();
  });

  test('Panel should be created', () => {
    assert.ok(panel);
  });

  test('Should handle chat messages', async () => {
    const response = await panel.handleChatMessage('Hello');
    assert.ok(response);
    assert.strictEqual(typeof response, 'string');
  });

  test('Should explain code correctly', async () => {
    const code = 'const x = 42;';
    const explanation = await panel.explainCode(code);
    assert.ok(explanation.includes('variable'));
    assert.ok(explanation.includes('42'));
  });
});
```

### Integration Tests

```typescript
// src/test/integration.test.ts
import * as vscode from 'vscode';
import { HeadyCodeActions } from '../extensions/headybuddy/src/CodeActions';

suite('Integration Test Suite', () => {
  let actions: HeadyCodeActions;

  setup(async () => {
    actions = new HeadyCodeActions();
    
    // Open a test file
    const document = await vscode.workspace.openTextDocument({
      content: 'function test() { return 42; }',
      language: 'javascript'
    });
    await vscode.window.showTextDocument(document);
  });

  teardown(() => {
    actions.dispose();
  });

  test('Should generate tests for JavaScript function', async () => {
    await vscode.commands.executeCommand('heady.generateTests');
    
    // Check if tests were inserted
    const editor = vscode.window.activeTextEditor;
    const text = editor?.document.getText() || '';
    assert.ok(text.includes('describe'));
    assert.ok(text.includes('test'));
  });

  test('Should explain selected code', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, 25)
      );
    }
    
    await vscode.commands.executeCommand('heady.explainCode');
    
    // Check if explanation panel opened
    // (This would require mocking the webview panel)
  });
});
```

---

## 📦 Distribution

### VS Marketplace

```bash
# Package for VS Marketplace
npm run package

# Publish to marketplace
vsce publish

# Create insider build
vsce publish --pre-release
```

### Standalone Build

```bash
# Build standalone version
npm run build:standalone

# Create installer
npm run create:installer

# Build for all platforms
npm run build:all
```

---

## 🔧 Troubleshooting

### Common Issues

1. **AI Not Responding**
   - Check API key configuration
   - Verify network connectivity
   - Check rate limits

2. **Extension Not Loading**
   - Check VS Code version compatibility
   - Verify dependencies are installed
   - Check extension logs

3. **Performance Issues**
   - Clear cache: `Heady: Clear Cache`
   - Restart VS Code
   - Check memory usage

### Debug Mode

```bash
# Enable debug logging
HEADY_DEBUG=true code --inspect

# Enable verbose logging
HEADY_LOG_LEVEL=verbose code

# Profile performance
code --prof-startup
```

---

## 📚 API Reference

### Core API

```typescript
// Main extension API
export interface HeadyAPI {
  // Chat with AI
  chat(message: string, context?: CodeContext): Promise<string>;
  
  // Code analysis
  explain(code: string, language: string): Promise<string>;
  fix(code: string, language: string): Promise<string>;
  optimize(code: string, language: string): Promise<string>;
  
  // Test generation
  generateTests(code: string, language: string): Promise<string>;
  
  // Documentation
  generateDocs(code: string, language: string): Promise<string>;
}

// Code context interface
interface CodeContext {
  file: string;
  language: string;
  selection?: string;
  workspace: string;
  symbols?: Symbol[];
}

// Symbol information
interface Symbol {
  name: string;
  kind: SymbolKind;
  location: Location;
  documentation?: string;
}
```

### Extension API

```typescript
// Register custom commands
export function registerCommand(name: string, handler: CommandHandler): void;

// Register language provider
export function registerLanguageProvider(config: LanguageConfig): void;

// Register code action provider
export function registerCodeActionProvider(provider: CodeActionProvider): void;

// Register completion provider
export function registerCompletionProvider(provider: CompletionProvider): void;
```

---

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

### Code Style

```typescript
// Use TypeScript strict mode
// Follow Heady naming conventions
// Add JSDoc comments
// Include unit tests

// Example:
/**
 * Explains the given code snippet
 * @param code The code to explain
 * @param language The programming language
 * @returns Promise<string> The explanation
 */
export async function explainCode(code: string, language: string): Promise<string> {
  // Implementation
}
```

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- VS Code team for the excellent extension API
- Claude AI for intelligent code assistance
- Windsurf-Next for the solid foundation
- Sacred Geometry community for design inspiration

---

**Built with ❤️ using Sacred Geometry principles**

*HeadyAI-IDE - Where AI meets development excellence*
