/**
 * Heady Chrome Extension — Background Service Worker
 * Sets up context menus, keyboard shortcuts, and side panel
 */

const HEADY_API = "http://127.0.0.1:3301/api";

// ── Context Menus ──
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "heady-ask",
        title: "🐝 Ask Heady",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "heady-explain",
        title: "🧠 Explain with Heady",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "heady-code",
        title: "⚡ Refactor with Heady",
        contexts: ["selection"],
    });
    chrome.contextMenus.create({
        id: "heady-battle",
        title: "⚔️ Battle-validate with Heady",
        contexts: ["selection"],
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const text = info.selectionText;
    if (!text) return;

    const prompts = {
        "heady-ask": text,
        "heady-explain": `[INTELLIGENCE] Explain the following in detail:\n\n${text}`,
        "heady-code": `[CODE TASK] Refactor and improve this code:\n\n${text}`,
        "heady-battle": `[BATTLE] Validate the following for regressions, security issues, and quality:\n\n${text}`,
    };

    const message = prompts[info.menuItemId] || text;

    // Open side panel and send the message
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
        // Small delay for panel to initialize
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "heady-query", message, source: info.menuItemId });
        }, 500);
    } catch (e) {
        // Fallback: open popup
        chrome.action.openPopup();
    }
});

// ── Message Relay ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "heady-api") {
        fetch(`${HEADY_API}/brain/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg.message, model: "auto" }),
        })
            .then(r => r.json())
            .then(data => sendResponse({ ok: true, data }))
            .catch(err => sendResponse({ ok: false, error: err.message }));
        return true; // async response
    }
});
