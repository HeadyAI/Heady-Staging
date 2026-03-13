// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: HeadyAI-IDE/main.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Set up cache directory
const cacheDir = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}
process.env.ELECTRON_CACHE_DIR = cacheDir;

console.log('[HeadyAI-IDE] Starting HeadyAI-IDE Electron app');

function createWindow() {
  console.log('[HeadyAI-IDE] Creating HeadyAI-IDE browser window');
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
  });

  // Show window when ready
  win.once('ready-to-show', () => {
    win.show();
    console.log('[HeadyAI-IDE] Window ready and shown');
  });

  // In development, load the Vite dev server, in production, load index.html from the dist directory
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://internal.headyio.com:5173');
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
    console.log('[HeadyAI-IDE] Dev tools opened');
  }
}

app.whenReady().then(() => {
  console.log('[HeadyAI-IDE] App ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file system operations
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath);
    const fileDetails = await Promise.all(files.map(async (file) => {
      const filePath = path.join(dirPath, file);
      const stats = await fs.promises.stat(filePath);
      return {
        name: file,
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
      };
    }));
    return fileDetails;
  } catch (error) {
    console.error('[HeadyAI-IDE] Error reading directory:', error);
    throw error;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('[HeadyAI-IDE] Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('[HeadyAI-IDE] Error writing file:', error);
    throw error;
  }
});

// Heady AI integration
ipcMain.handle('heady-ai-chat', async (event, message, context) => {
  try {
    // Integration with Heady AI service
    const response = await fetch('https://headysystems.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        model: 'heady-brain',
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[HeadyAI-IDE] Error calling Heady AI:', error);
    throw error;
  }
});

console.log('[HeadyAI-IDE] HeadyAI-IDE main process initialized');

