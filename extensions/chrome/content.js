/**
 * Heady Chrome Extension - Content Script
 * Injected into all web pages for quick capture
 */

// Sacred Geometry styling variables
const HEADY_COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#ff6b6b',
  bg: 'rgba(10, 10, 10, 0.95)',
};

// Initialize content script
console.log('[Heady Content] Initialized');

// Listen for selection and keyboard shortcuts
let selectedText = '';

document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    selectedText = selection;
  }
});

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelection') {
    sendResponse({
      text: selectedText || window.getSelection().toString(),
      url: window.location.href,
      title: document.title,
    });
  } else if (request.action === 'showNotification') {
    showHeadyNotification(request.message);
  }
  return true;
});

// Show elegant notification
function showHeadyNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'heady-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${HEADY_COLORS.bg};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    border: 1px solid ${HEADY_COLORS.primary};
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 999999;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `∞ ${message}`;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add quick capture floating button (optional, can be toggled in settings)
function addFloatingButton() {
  const button = document.createElement('div');
  button.id = 'heady-capture-btn';
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${HEADY_COLORS.primary}, ${HEADY_COLORS.secondary});
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    z-index: 999998;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  button.innerHTML = '∞';
  button.title = 'Quick Capture to Heady';
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });
  
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'sendToHeady',
      data: {
        text: selectedText || '',
        url: window.location.href,
        title: document.title,
      },
    });
    showHeadyNotification('Captured to Heady!');
  });
  
  document.body.appendChild(button);
}

// Check if floating button should be shown
chrome.storage.sync.get('showFloatingButton', ({ showFloatingButton }) => {
  if (showFloatingButton !== false) { // Default to true
    addFloatingButton();
  }
});
