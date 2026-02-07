/**
 * Heady Chrome Extension - Popup UI
 */

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const endpointSelect = document.getElementById('endpoint');

// Load saved endpoint
chrome.storage.sync.get('endpoint', ({ endpoint }) => {
  if (endpoint) {
    const option = Array.from(endpointSelect.options).find(opt => 
      opt.value === Object.keys({
        'http://manager.dev.local.heady.internal:3300': 'local',
        'https://cloud-me.heady.io': 'cloud-me',
        'https://cloud-sys.heady.io': 'cloud-sys',
        'https://cloud-conn.heady.io': 'cloud-conn',
      }).find(k => k === endpoint)
    );
    if (option) {
      endpointSelect.value = option.value;
    }
  }
});

// Endpoint change
endpointSelect.addEventListener('change', async () => {
  const result = await chrome.runtime.sendMessage({
    action: 'switchEndpoint',
    endpoint: endpointSelect.value,
  });
  
  if (result.success) {
    updateHealth();
  }
});

// Update health status
async function updateHealth() {
  statusText.textContent = 'Checking...';
  
  const health = await chrome.runtime.sendMessage({ action: 'checkHealth' });
  
  const activeEndpoint = endpointSelect.value;
  const activeHealth = health[activeEndpoint];
  
  if (activeHealth?.status === 'healthy') {
    statusDot.classList.remove('offline');
    statusText.textContent = `Connected to ${activeEndpoint}`;
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = `Offline - ${activeHealth?.error || 'Connection failed'}`;
  }
}

// Quick actions
document.getElementById('openDashboard').addEventListener('click', () => {
  const endpoints = {
    'local': 'http://manager.dev.local.heady.internal:3300',
    'cloud-me': 'https://cloud-me.heady.io',
    'cloud-sys': 'https://cloud-sys.heady.io',
    'cloud-conn': 'https://cloud-conn.heady.io',
  };
  
  chrome.tabs.create({ url: endpoints[endpointSelect.value] });
});

document.getElementById('captureTab').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const result = await chrome.runtime.sendMessage({
    action: 'sendToHeady',
    data: {
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString(),
    },
  });
  
  if (result.success) {
    statusText.textContent = 'Tab captured successfully!';
    setTimeout(updateHealth, 2000);
  }
});

document.getElementById('viewTasks').addEventListener('click', () => {
  const endpoints = {
    'local': 'http://manager.dev.local.heady.internal:3300/tasks',
    'cloud-me': 'https://cloud-me.heady.io/tasks',
    'cloud-sys': 'https://cloud-sys.heady.io/tasks',
    'cloud-conn': 'https://cloud-conn.heady.io/tasks',
  };
  
  chrome.tabs.create({ url: endpoints[endpointSelect.value] });
});

document.getElementById('refreshHealth').addEventListener('click', updateHealth);

// Initial health check
updateHealth();
