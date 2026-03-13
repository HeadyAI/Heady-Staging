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
// ║  FILE: HeadyAI-IDE/src/components/Editor.jsx                   ║
// ║  LAYER: frontend/src/components                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { Save, FileText, Code } from 'lucide-react';

const CodeEditor = ({ file, onFileChange }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (file) {
      setCode(file.content || '');
      // Determine language from file extension
      const extension = file.path?.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'js':
        case 'jsx':
          setLanguage('javascript');
          break;
        case 'ts':
        case 'tsx':
          setLanguage('typescript');
          break;
        case 'py':
          setLanguage('python');
          break;
        case 'java':
          setLanguage('java');
          break;
        case 'cpp':
        case 'cc':
        case 'cxx':
          setLanguage('cpp');
          break;
        case 'c':
          setLanguage('c');
          break;
        case 'html':
          setLanguage('html');
          break;
        case 'css':
        case 'scss':
        case 'sass':
          setLanguage('css');
          break;
        case 'json':
          setLanguage('json');
          break;
        case 'md':
          setLanguage('markdown');
          break;
        case 'sql':
          setLanguage('sql');
          break;
        case 'ps1':
          setLanguage('powershell');
          break;
        case 'sh':
        case 'bash':
          setLanguage('shell');
          break;
        default:
          setLanguage('plaintext');
      }
    }
  }, [file]);

  const handleEditorChange = (value) => {
    setCode(value);
    setIsDirty(true);
    if (onFileChange) {
      onFileChange(value);
    }
  };

  const handleSave = () => {
    if (file && onFileChange) {
      onFileChange(code);
      setIsDirty(false);
    }
  };

  if (!file) {
    return (
      <div className="editor-placeholder">
        <FileText size={48} />
        <h3>No file selected</h3>
        <p>Select a file from the file explorer to start editing</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="file-info">
          <Code size={16} />
          <span className="file-name">{file.name}</span>
          <span className="file-path">{file.path}</span>
          {isDirty && <span className="dirty-indicator">●</span>}
        </div>
        <div className="editor-actions">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="save-btn"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <Save size={16} />
            Save
          </motion.button>
        </div>
      </div>
      
      <div className="editor-content">
        <Editor
          height="calc(100vh - 120px)"
          language={language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              indentation: true,
              bracketPairs: true
            }
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
