# 🤖 HeadyBuddy: Universal AI Companion & Task Manager

## 🎯 Overview

HeadyBuddy is an intelligent AI companion that floats above all applications (like iPhone's Dynamic Island), sees your screen, understands what you're doing, and executes tasks autonomously - both visible (clicks, typing) and invisible (API calls, file operations).

**Think: Jarvis from Iron Man meets Apple Dynamic Island with Sacred Geometry aesthetics**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│      FLOATING OVERLAY (Always Visible)  │
│  • Compact pill at top of screen       │
│  • Expands to full task dashboard      │
│  • Voice: "Hey Heady"                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         INTELLIGENCE LAYER              │
│  Vision AI → Context AI → Action AI    │
│  (See)       (Understand)   (Execute)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         EXECUTION LAYER                 │
│  UI Automation | API Control | System   │
│  (Visible)     | (Invisible)  | (Bgnd)  │
└─────────────────────────────────────────┘
```

---

## 💻 Desktop Implementation (Electron)

### Core Features

- **Always-on-top floating widget** with Sacred Geometry design
- **Transparent, draggable pill UI** that expands to full dashboard
- **Screen capture every 5 seconds** for context awareness
- **Claude Vision integration** for understanding what you're doing
- **RobotJS for UI automation** (click, type, copy/paste)
- **Background task executor** for file operations, API calls, database queries
- **Voice activation** with "Hey Heady" wake word
- **Cross-device sync** with mobile companion

### File Structure

```
headybuddy/
├── src/
│   ├── main.js                 # Electron main process
│   ├── overlay/
│   │   ├── pill.jsx           # Floating pill component
│   │   ├── dashboard.jsx      # Expanded dashboard
│   │   └── voice-handler.js   # Voice activation
│   ├── ai/
│   │   ├── vision-analyzer.js # Screen analysis
│   │   ├── context-engine.js  # Context understanding
│   │   └── action-executor.js # Task execution
│   ├── automation/
│   │   ├── ui-robot.js        # UI automation
│   │   ├── api-client.js      # API calls
│   │   └── file-ops.js        # File operations
│   └── sync/
│       ├── device-sync.js     # Cross-device sync
│       └── state-manager.js   # State persistence
├── package.json
├── electron-builder.yml
└── README.md
```

### Quick Start

```bash
cd headybuddy
npm install
npm run server &  # Start AI backend
npm start         # Launch overlay
```

---

## 📱 Mobile Implementation (React Native)

### iOS Features

- **Background tasks** with BGTaskScheduler
- **Siri integration** for "Hey Heady" voice activation
- **Widget on home screen** for quick access
- **Share sheet extension** for context sharing

### Android Features

- **Foreground service** (always running)
- **Overlay permission** for floating bubble
- **Accessibility service** for screen reading
- **Share target** for content sharing

### File Structure

```
headybuddy-mobile/
├── android/
├── ios/
├── src/
│   ├── components/
│   │   ├── FloatingBubble.jsx
│   │   ├── ChatInterface.jsx
│   │   └── TaskDashboard.jsx
│   ├── services/
│   │   ├── VoiceService.js
│   │   ├── ScreenCapture.js
│   │   └── SyncService.js
│   └── utils/
│       ├── Permissions.js
│       └── BackgroundTasks.js
├── package.json
└── metro.config.js
```

---

## 🧠 AI Capabilities

### 1. Vision AI - Sees Your Screen

```javascript
// Every 5 seconds, captures screen and asks Claude:
const analyzeScreen = async (screenshot) => {
  const analysis = await claude.vision.analyze({
    image: screenshot,
    prompt: `
      What is the user doing?
      Are there any errors?
      What can I help with?
      What tasks can I automate?
    `
  });
  
  return {
    activity: analysis.activity,
    errors: analysis.errors,
    suggestions: analysis.suggestions,
    context: analysis.context
  };
};
```

### 2. Context AI - Understands Intent

```javascript
class ContextEngine {
  constructor() {
    this.workPatterns = new Map();
    this.userPreferences = new Map();
    this.currentTask = null;
  }
  
  trackUserActivity(activity) {
    // Learn work patterns
    this.workPatterns.set(activity.type, {
      frequency: (this.workPatterns.get(activity.type)?.frequency || 0) + 1,
      lastSeen: Date.now(),
      context: activity.context
    });
  }
  
  predictNextAction() {
    // Based on patterns and current context
    const predictions = [];
    
    for (const [activity, data] of this.workPatterns) {
      if (data.frequency > 5 && Date.now() - data.lastSeen < 3600000) {
        predictions.push({
          action: activity,
          confidence: data.frequency / 100,
          suggestion: this.getSuggestion(activity)
        });
      }
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }
}
```

### 3. Action AI - Executes Tasks

#### Visible Tasks (UI Automation)

```javascript
const executeVisibleTask = async (task) => {
  switch (task.type) {
    case 'click':
      await robot.moveMouse(task.x, task.y);
      await robot.mouseClick();
      break;
      
    case 'type':
      await robot.typeString(task.text);
      break;
      
    case 'copy':
      await robot.keyTap('c', 'control');
      break;
      
    case 'navigate':
      await robot.keyTap('l', 'control');
      await robot.typeString(task.url);
      await robot.keyTap('enter');
      break;
  }
};
```

#### Invisible Tasks (Background Operations)

```javascript
const executeInvisibleTask = async (task) => {
  switch (task.type) {
    case 'api_call':
      const response = await fetch(task.url, {
        method: task.method,
        headers: task.headers,
        body: task.body
      });
      return response.json();
      
    case 'file_operation':
      if (task.operation === 'copy') {
        await fs.copyFile(task.source, task.destination);
      } else if (task.operation === 'move') {
        await fs.rename(task.source, task.destination);
      }
      break;
      
    case 'database_query':
      const result = await db.query(task.sql, task.params);
      return result;
      
    case 'web_scraping':
      const page = await puppeteer.newPage();
      await page.goto(task.url);
      const data = await page.evaluate(task.script);
      await page.close();
      return data;
  }
};
```

---

## 🎤 Voice Activation

```javascript
class VoiceHandler {
  constructor() {
    this.wakeWord = 'hey heady';
    this.isListening = false;
    this.speechRecognizer = new SpeechRecognition();
  }
  
  startListening() {
    this.speechRecognizer.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      if (transcript.includes(this.wakeWord)) {
        await this.handleWakeWord(transcript);
      }
    };
    
    this.speechRecognizer.start();
  }
  
  async handleWakeWord(transcript) {
    // Extract command after wake word
    const command = transcript.replace(this.wakeWord, '').trim();
    
    if (command) {
      await this.executeVoiceCommand(command);
    } else {
      // Just "Hey Heady" - show dashboard
      this.showDashboard();
    }
  }
  
  async executeVoiceCommand(command) {
    const intent = await this.parseIntent(command);
    const task = await this.createTaskFromIntent(intent);
    const result = await this.executeTask(task);
    
    // Speak response
    this.speak(result.response);
  }
}
```

---

## 🔄 Cross-Device Sync

### Desktop-Mobile Continuity

```javascript
class DeviceSync {
  constructor() {
    this.devices = new Map();
    this.activeDevice = null;
    this.syncChannel = new WebSocket('wss://headysystems.com/sync');
  }
  
  async registerDevice(deviceInfo) {
    this.devices.set(deviceInfo.id, {
      ...deviceInfo,
      lastSeen: Date.now(),
      capabilities: deviceInfo.capabilities
    });
    
    await this.syncChannel.send({
      type: 'device_register',
      device: deviceInfo
    });
  }
  
  async syncTask(task, targetDevice) {
    const device = this.devices.get(targetDevice);
    
    if (device) {
      await this.syncChannel.send({
        type: 'task_transfer',
        from: this.activeDevice,
        to: targetDevice,
        task: task
      });
    }
  }
  
  async handleIncomingTask(data) {
    const { task, from } = data;
    
    // Execute task on current device
    const result = await this.executeTask(task);
    
    // Send result back
    await this.syncChannel.send({
      type: 'task_result',
      to: from,
      result: result
    });
  }
}
```

---

## 📊 Learning Analytics

### Pattern Recognition

```javascript
class LearningEngine {
  constructor() {
    this.patterns = new Map();
    this.successRate = new Map();
    this.userFeedback = new Map();
  }
  
  recordExecution(task, result, feedback) {
    const pattern = this.extractPattern(task);
    
    if (!this.patterns.has(pattern)) {
      this.patterns.set(pattern, {
        count: 0,
        successes: 0,
        failures: 0,
        avgTime: 0
      });
    }
    
    const data = this.patterns.get(pattern);
    data.count++;
    data.successes += result.success ? 1 : 0;
    data.failures += result.success ? 0 : 1;
    data.avgTime = (data.avgTime * (data.count - 1) + result.duration) / data.count;
    
    // Store user feedback
    this.userFeedback.set(task.id, feedback);
  }
  
  getOptimalSolution(task) {
    const pattern = this.extractPattern(task);
    const data = this.patterns.get(pattern);
    
    if (data && data.successes / data.count > 0.8) {
      return {
        solution: data.bestSolution,
        confidence: data.successes / data.count,
        estimatedTime: data.avgTime
      };
    }
    
    return null;
  }
}
```

---

## 🔒 Privacy & Security

### Data Protection

```javascript
class PrivacyManager {
  constructor() {
    this.sensitiveData = new Set(['password', 'token', 'key', 'secret']);
    this.encryptionKey = this.generateKey();
  }
  
  sanitizeData(data) {
    const sanitized = { ...data };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (this.sensitiveData.has(key.toLowerCase())) {
        sanitized[key] = this.encrypt(value);
      }
    }
    
    return sanitized;
  }
  
  encrypt(data) {
    return crypto.createCipher('aes-256-cbc', this.encryptionKey)
                 .update(data, 'utf8', 'hex') + 
                 crypto.createCipher('aes-256-cbc', this.encryptionKey)
                 .final('hex');
  }
  
  getUserConsent(dataType) {
    // Check user consent settings
    const settings = this.loadPrivacySettings();
    return settings[dataType] || false;
  }
}
```

### Local Processing

```javascript
class LocalProcessor {
  constructor() {
    this.localModels = new Map();
    this.cache = new Map();
  }
  
  async processLocally(data, type) {
    // Try to process locally first
    if (this.localModels.has(type)) {
      const model = this.localModels.get(type);
      return await model.process(data);
    }
    
    // Fall back to cloud if needed
    if (this.getUserConsent('cloud_processing')) {
      return await this.processInCloud(data, type);
    }
    
    throw new Error('Processing not available locally and cloud consent denied');
  }
}
```

---

## 🎨 Sacred Geometry UI Design

### Visual Principles

```css
/* Sacred Geometry proportions */
:root {
  --phi: 1.618;
  --golden-ratio: calc(1rem * var(--phi));
  --primary-hue: 280; /* Purple spectrum */
  --breathing-duration: 4s;
}

.breathing-animation {
  animation: breathe var(--breathing-duration) ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(calc(1 / var(--phi))); opacity: 1; }
}

.floating-pill {
  width: calc(var(--golden-ratio) * 60px);
  height: calc(var(--golden-ratio) * 30px);
  background: linear-gradient(
    135deg,
    hsl(var(--primary-hue), 70%, 50%),
    hsl(calc(var(--primary-hue) + 60), 70%, 60%)
  );
  border-radius: calc(var(--golden-ratio) * 15px);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

---

## 📦 Installation & Setup

### Desktop (Electron)

```bash
# Clone the repository
git clone https://github.com/headysystems/headybuddy.git
cd headybuddy

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Create installer
npm run dist
```

### Mobile (React Native)

```bash
# Clone the repository
git clone https://github.com/headysystems/headybuddy-mobile.git
cd headybuddy-mobile

# Install dependencies
npm install
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env file
HEADY_API_KEY=your_api_key_here
CLAUDE_API_KEY=your_claude_key_here
SYNC_SERVER=wss://headysystems.com/sync
VOICE_SERVICE_KEY=your_voice_service_key
ENCRYPTION_KEY=your_encryption_key_here
```

### Settings File

```json
{
  "voice": {
    "wakeWord": "hey heady",
    "language": "en-US",
    "sensitivity": 0.7
  },
  "privacy": {
    "localProcessing": true,
    "cloudProcessing": false,
    "dataRetention": 30
  },
  "ui": {
    "theme": "sacred-geometry",
    "opacity": 0.9,
    "position": "top-center"
  },
  "automation": {
    "autoExecute": false,
    "confirmBeforeAction": true,
    "learnFromUser": true
  }
}
```

---

## 🚀 Usage Examples

### Voice Commands

```bash
# Basic commands
"Hey Heady, what's on my screen?"
"Hey Heady, click the save button"
"Hey Heady, open my calendar"
"Hey Heady, summarize this email"

# Complex tasks
"Hey Heady, organize my desktop files"
"Hey Heady, reply to the last message"
"Hey Heady, create a meeting for tomorrow"
"Hey Heady, find all files with 'report' in the name"
```

### API Integration

```javascript
// Use HeadyBuddy in your own apps
const HeadyBuddy = require('headybuddy-sdk');

const buddy = new HeadyBuddy({
  apiKey: 'your_api_key',
  capabilities: ['vision', 'automation', 'voice']
});

// Ask HeadyBuddy to help with a task
await buddy.ask('Organize my downloads folder');

// Get screen analysis
const analysis = await buddy.analyzeScreen();

// Execute automation
await buddy.execute({
  type: 'click',
  selector: '.save-button'
});
```

---

## 🛠️ Development Guide

### Adding New Capabilities

```javascript
// Create a new capability
class CalendarCapability {
  constructor() {
    this.name = 'calendar';
    this.version = '1.0.0';
  }
  
  async execute(task) {
    switch (task.action) {
      case 'create_event':
        return await this.createEvent(task.data);
      case 'list_events':
        return await this.listEvents(task.data);
      case 'update_event':
        return await this.updateEvent(task.data);
    }
  }
  
  async createEvent(data) {
    // Implementation here
  }
}

// Register the capability
headybuddy.registerCapability(new CalendarCapability());
```

### Testing

```javascript
// Test suite for HeadyBuddy
describe('HeadyBuddy', () => {
  let buddy;
  
  beforeEach(() => {
    buddy = new HeadyBuddy({
      testMode: true
    });
  });
  
  test('should analyze screen correctly', async () => {
    const mockScreenshot = 'base64-image-data';
    const analysis = await buddy.analyzeScreen(mockScreenshot);
    
    expect(analysis).toHaveProperty('activity');
    expect(analysis).toHaveProperty('suggestions');
  });
  
  test('should execute voice command', async () => {
    const result = await buddy.executeVoiceCommand('click save button');
    
    expect(result.success).toBe(true);
    expect(result.action).toBe('click');
  });
});
```

---

## 📈 Performance Optimization

### Memory Management

```javascript
class MemoryManager {
  constructor() {
    this.cache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 15 // 15 minutes
    });
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  set(key, value) {
    this.cache.set(key, value);
  }
  
  cleanup() {
    // Clean up old data
    this.cache.purge();
  }
}
```

### CPU Optimization

```javascript
class TaskQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 4;
  }
  
  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      
      await Promise.all(
        batch.map(({ task, resolve, reject }) => 
          this.executeTask(task).then(resolve).catch(reject)
        )
      );
    }
    
    this.processing = false;
  }
}
```

---

## 🔍 Troubleshooting

### Common Issues

1. **Voice Recognition Not Working**
   - Check microphone permissions
   - Ensure voice service is running
   - Verify wake word detection sensitivity

2. **Screen Capture Fails**
   - Check screen recording permissions (macOS)
   - Verify display capture permissions (Windows)
   - Ensure accessibility permissions are enabled

3. **UI Automation Not Working**
   - Check accessibility permissions
   - Verify RobotJS is installed correctly
   - Ensure target application is accessible

4. **Cross-Device Sync Issues**
   - Check network connection
   - Verify sync server is reachable
   - Ensure devices are paired correctly

### Debug Mode

```bash
# Enable debug logging
DEBUG=headybuddy:* npm start

# Enable verbose logging
HEADY_LOG_LEVEL=verbose npm start

# Enable performance profiling
HEADY_PROFILE=true npm start
```

---

## 📚 API Reference

### Core Methods

```javascript
// Initialize HeadyBuddy
const buddy = new HeadyBuddy(options);

// Screen analysis
const analysis = await buddy.analyzeScreen();

// Execute task
const result = await buddy.execute(task);

// Voice command
const response = await buddy.voiceCommand(command);

// Sync with devices
await buddy.sync(task, deviceId);

// Learn from user
await buddy.learn(task, result, feedback);
```

### Events

```javascript
// Listen for events
buddy.on('screen_analyzed', (analysis) => {
  console.log('Screen analyzed:', analysis);
});

buddy.on('task_completed', (result) => {
  console.log('Task completed:', result);
});

buddy.on('voice_command', (command) => {
  console.log('Voice command received:', command);
});
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/headybuddy.git
cd headybuddy

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run dev
```

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- Claude AI for vision and language understanding
- Electron for cross-platform desktop support
- React Native for mobile development
- RobotJS for UI automation
- The Sacred Geometry community for design inspiration

---

**Built with ❤️ using Sacred Geometry principles**

*HeadyBuddy - Your intelligent companion for a more productive digital life*
