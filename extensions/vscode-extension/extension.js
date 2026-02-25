/**
 * Heady AI — VS Code Extension
 * Connects every editor action to the Heady Intelligence Layer.
 */
const vscode = require("vscode");
const http = require("http");

function getApiUrl() {
    return vscode.workspace.getConfiguration("heady").get("apiUrl") || "http://127.0.0.1:3301";
}

async function callHeady(message) {
    const url = new URL(getApiUrl());
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ message, model: "auto" });
        const req = http.request({
            hostname: url.hostname, port: url.port || 3301,
            path: "/api/brain/chat", method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
            timeout: 30000,
        }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try { const j = JSON.parse(data); resolve(j.response || j.text || JSON.stringify(j)); }
                catch { resolve(data); }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.write(body); req.end();
    });
}

function activate(context) {
    // ── Status Bar ──
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = "$(hubot) Heady AI";
    statusBar.tooltip = "Heady Intelligence Layer — Click to chat";
    statusBar.command = "heady.chat";
    statusBar.show();
    context.subscriptions.push(statusBar);

    // Check health on startup
    http.get(`${getApiUrl()}/api/pulse`, (res) => {
        statusBar.text = "$(hubot) Heady ✓";
        statusBar.color = "#57F287";
    }).on("error", () => {
        statusBar.text = "$(hubot) Heady ✗";
        statusBar.color = "#ED4245";
    });

    // ── Chat Command ──
    context.subscriptions.push(
        vscode.commands.registerCommand("heady.chat", async () => {
            const input = await vscode.window.showInputBox({
                prompt: "🐝 Ask Heady anything",
                placeHolder: "What would you like to know?",
            });
            if (!input) return;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: "🐝 Heady is thinking...", cancellable: false },
                async () => {
                    try {
                        const res = await callHeady(input);
                        const doc = await vscode.workspace.openTextDocument({ content: res, language: "markdown" });
                        await vscode.window.showTextDocument(doc, { preview: true });
                    } catch (e) {
                        vscode.window.showErrorMessage(`Heady: ${e.message}`);
                    }
                }
            );
        })
    );

    // ── Selection Commands ──
    function registerSelectionCommand(cmdId, tag, label) {
        context.subscriptions.push(
            vscode.commands.registerCommand(cmdId, async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                const selection = editor.document.getText(editor.selection);
                if (!selection) return vscode.window.showWarningMessage("Select some text first.");
                const lang = editor.document.languageId;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `🐝 Heady ${label}...`, cancellable: false },
                    async () => {
                        try {
                            const res = await callHeady(`${tag} (language: ${lang})\n\n${selection}`);
                            const doc = await vscode.workspace.openTextDocument({ content: `# Heady ${label}\n\n${res}`, language: "markdown" });
                            await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preview: true });
                        } catch (e) {
                            vscode.window.showErrorMessage(`Heady: ${e.message}`);
                        }
                    }
                );
            })
        );
    }

    registerSelectionCommand("heady.explain", "[INTELLIGENCE] Explain this code in detail:", "Explain");
    registerSelectionCommand("heady.refactor", "[CODE TASK] Refactor and improve this code:", "Refactor");
    registerSelectionCommand("heady.battle", "[BATTLE] Validate for regressions, security issues, and quality:", "Battle Validate");
    registerSelectionCommand("heady.swarm", "[SWARM TASK] Research and provide multiple perspectives on:", "Swarm");
    registerSelectionCommand("heady.creative", "[CREATIVE] Generate creative alternatives for:", "Creative");
    registerSelectionCommand("heady.audit", "[AUDIT] Security and compliance audit:", "Audit");
    registerSelectionCommand("heady.simulate", "[SIMULATION] Monte Carlo analysis of:", "Simulate");

    // ── Sidebar Webview ──
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("heady.chatView", {
            resolveWebviewView(view) {
                view.webview.options = { enableScripts: true };
                view.webview.html = getSidebarHtml();
                view.webview.onDidReceiveMessage(async (msg) => {
                    if (msg.type === "chat") {
                        try {
                            const res = await callHeady(msg.message);
                            view.webview.postMessage({ type: "response", text: res });
                        } catch (e) {
                            view.webview.postMessage({ type: "response", text: `⚠️ ${e.message}` });
                        }
                    }
                });
            },
        })
    );

    vscode.window.showInformationMessage("🐝 Heady AI activated — Ctrl+Shift+H to chat");
}

function getSidebarHtml() {
    return `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:var(--vscode-font-family);background:var(--vscode-sideBar-background);color:var(--vscode-foreground);display:flex;flex-direction:column;height:100vh;}
    .msgs{flex:1;overflow-y:auto;padding:8px;}
    .msg{margin-bottom:8px;padding:6px 10px;border-radius:6px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;}
    .msg.bot{background:var(--vscode-textBlockQuote-background);}
    .msg.user{background:var(--vscode-button-background);color:var(--vscode-button-foreground);text-align:right;}
    .input-area{padding:8px;border-top:1px solid var(--vscode-panel-border);}
    .input-area input{width:100%;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;padding:6px 8px;font-size:12px;outline:none;}
    .typing{padding:4px 8px;font-size:11px;color:var(--vscode-descriptionForeground);min-height:16px;}
  </style></head><body>
    <div class="msgs" id="msgs"><div class="msg bot">🐝 Heady AI ready. Type anything to chat.</div></div>
    <div class="typing" id="typing"></div>
    <div class="input-area"><input id="input" placeholder="Ask Heady..." autofocus></div>
    <script>
      const vscode=acquireVsCodeApi();const msgs=document.getElementById('msgs');const input=document.getElementById('input');const typing=document.getElementById('typing');
      function addMsg(t,r){const e=document.createElement('div');e.className='msg '+r;e.textContent=t;msgs.appendChild(e);msgs.scrollTop=msgs.scrollHeight;}
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){const t=input.value.trim();if(!t)return;input.value='';addMsg(t,'user');typing.textContent='🐝 Thinking...';vscode.postMessage({type:'chat',message:t});}});
      window.addEventListener('message',e=>{if(e.data.type==='response'){typing.textContent='';addMsg(e.data.text,'bot');}});
    </script>
  </body></html>`;
}

function deactivate() { }
module.exports = { activate, deactivate };
