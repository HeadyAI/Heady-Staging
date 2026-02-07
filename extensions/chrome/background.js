/**
 * Heady Chrome Extension - Background Service Worker
 */

// Get API endpoint from service discovery
const API_ENDPOINTS = {
  local: 'http://manager.dev.local.heady.internal:3300',
  'cloud-me': 'https://cloud-me.heady.io',
  'cloud-sys': 'https://cloud-sys.heady.io',
  'cloud-conn': 'https://cloud-conn.heady.io',
};

let activeEndpoint = API_ENDPOINTS.local;

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Heady] Extension installed:', details.reason);
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'send-to-heady',
    title: 'Send to Heady',
    contexts: ['selection'],
  });
  
  // Load saved endpoint
  const { endpoint } = await chrome.storage.sync.get('endpoint');
  if (endpoint) {
    activeEndpoint = endpoint;
  }
  
  // Check connection health
  checkHealth();
});

// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'send-to-heady') {
    sendToHeady({
      text: info.selectionText,
      url: tab.url,
      title: tab.title,
    });
  }
});

// Command listener
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-heady') {
    chrome.action.openPopup();
  } else if (command === 'capture-selection') {
    captureSelection();
  }
});

// Message listener from content/popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToHeady') {
    sendToHeady(request.data).then(sendResponse);
    return true; // Keep channel open for async response
  } else if (request.action === 'checkHealth') {
    checkHealth().then(sendResponse);
    return true;
  } else if (request.action === 'switchEndpoint') {
    switchEndpoint(request.endpoint).then(sendResponse);
    return true;
  }
});

// Send data to Heady API
async function sendToHeady(data) {
  try {
    const response = await fetch(`${activeEndpoint}/api/inbox/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'chrome-extension',
        timestamp: new Date().toISOString(),
        data,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Sent to Heady',
      message: 'Data successfully captured',
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('[Heady] Send failed:', error);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Heady Connection Error',
      message: `Failed to send: ${error.message}`,
    });
    
    return { success: false, error: error.message };
  }
}

// Health check
async function checkHealth() {
  const results = {};
  
  for (const [name, url] of Object.entries(API_ENDPOINTS)) {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const data = await response.json();
        results[name] = { status: 'healthy', ...data };
      } else {
        results[name] = { status: 'unhealthy', code: response.status };
      }
    } catch (error) {
      results[name] = { status: 'unreachable', error: error.message };
    }
  }
  
  // Update badge based on active endpoint health
  const activeHealth = results[Object.keys(API_ENDPOINTS).find(k => API_ENDPOINTS[k] === activeEndpoint)];
  
  if (activeHealth?.status === 'healthy') {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    chrome.action.setBadgeText({ text: '✓' });
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#FF5722' });
    chrome.action.setBadgeText({ text: '!' });
  }
  
  return results;
}

// Switch endpoint
async function switchEndpoint(endpoint) {
  if (API_ENDPOINTS[endpoint]) {
    activeEndpoint = API_ENDPOINTS[endpoint];
    await chrome.storage.sync.set({ endpoint: activeEndpoint });
    await checkHealth();
    return { success: true, endpoint: activeEndpoint };
  }
  return { success: false, error: 'Invalid endpoint' };
}

// Capture current selection
async function captureSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selection = window.getSelection().toString();
      return {
        text: selection,
        url: window.location.href,
        title: document.title,
      };
    },
  }).then((results) => {
    if (results[0]?.result) {
      sendToHeady(results[0].result);
    }
  });
}

// Periodic health check (every 5 minutes)
setInterval(checkHealth, 5 * 60 * 1000);
