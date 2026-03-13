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
// ║  FILE: HeadyAI-IDE/src/App.jsx                                   ║
// ║  LAYER: frontend/src                                             ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Code, Folder, Settings, Sparkles } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import AIChat from './components/AIChat';
import ModelSelector from './components/ModelSelector';
import SacredGeometryBackground from './components/SacredGeometryBackground';

const App = () => {
  const [activeFile, setActiveFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState('heady-brain');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiChatOpen, setAiChatOpen] = useState(true);

  useEffect(() => {
    // Initialize with welcome file
    const welcomeFile = {
      name: 'Welcome to HeadyAI-IDE',
      path: '/welcome.md',
      content: `# Welcome to HeadyAI-IDE 🧠

## Next Generation AI-Powered Development Environment

HeadyAI-IDE integrates the power of Heady AI models directly into your development workflow.

### Features:
- 🧠 **Heady Brain Integration** - Advanced AI assistance
- 🎨 **Sacred Geometry UI** - Beautiful, organic interface
- ⚡ **Real-time Collaboration** - Work with AI seamlessly
- 📁 **Smart File Management** - Intelligent project organization
- 🔧 **Extensible Architecture** - Plugin-based system

### Getting Started:
1. Select an AI model from the dropdown
2. Open or create a file
3. Start coding with AI assistance
4. Enjoy the sacred geometry experience!

### Available Models:
- **Heady Brain** - Primary Heady AI model
- **Heady Conductor** - Task orchestration
- **Heady Pattern** - Code pattern recognition
- **Heady Critique** - Code review and analysis

---
*Built with ❤️ by HeadySystems*`
    };
    setFiles([welcomeFile]);
    setActiveFile(welcomeFile);
  }, []);

  const handleFileSelect = (file) => {
    setActiveFile(file);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
  };

  return (
    <div className="app-container">
      <SacredGeometryBackground />
      
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        >
          <div className="sidebar-content">
            <div className="logo-section">
              <Brain className="logo-icon" size={32} />
              <h1>HeadyAI-IDE</h1>
            </div>
            
            <ModelSelector 
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
            
            <FileExplorer 
              files={files}
              onFileSelect={handleFileSelect}
              activeFile={activeFile}
            />
          </div>
        </Sidebar>

        {/* Main Content Area */}
        <div className="main-content">
          <header className="app-header">
            <div className="header-left">
              <Code className="header-icon" size={20} />
              <h2>HeadyAI Development Environment</h2>
            </div>
            <div className="header-right">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="ai-toggle-btn"
                onClick={() => setAiChatOpen(!aiChatOpen)}
              >
                <Sparkles size={16} />
                AI Assistant
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="settings-btn"
              >
                <Settings size={16} />
              </motion.button>
            </div>
          </header>

          <div className="content-area">
            <Editor 
              file={activeFile}
              onFileChange={(content) => {
                if (activeFile) {
                  setActiveFile({ ...activeFile, content });
                  setFiles(files.map(f => 
                    f.path === activeFile.path 
                      ? { ...f, content }
                      : f
                  ));
                }
              }}
            />
          </div>
        </div>

        {/* AI Chat Panel */}
        {aiChatOpen && (
          <AIChat 
            model={selectedModel}
            onClose={() => setAiChatOpen(false)}
            activeFile={activeFile}
          />
        )}
      </div>
    </div>
  );
};

export default App;
