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
// ║  FILE: HeadyAI-IDE/src/components/FileExplorer.jsx               ║
// ║  LAYER: frontend/src/components                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, File, FileText, Code, Image, Music, Video, Archive } from 'lucide-react';

const FileExplorer = ({ files, onFileSelect, activeFile }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (!extension) return <Folder size={16} />;
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code size={16} />;
      case 'txt':
      case 'md':
      case 'readme':
        return <FileText size={16} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return <Image size={16} />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'ogg':
        return <Music size={16} />;
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
        return <Video size={16} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <Archive size={16} />;
      default:
        return <File size={16} />;
    }
  };

  const handleFileClick = (file) => {
    if (!file.isDirectory) {
      onFileSelect(file);
    }
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="file-explorer">
      <h3>Files</h3>
      <div className="file-tree">
        {files.map((file) => (
          <motion.div
            key={file.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`file-item ${activeFile?.path === file.path ? 'active' : ''}`}
            onClick={() => handleFileClick(file)}
          >
            <div className="file-item-content">
              <div className="file-icon">
                {getFileIcon(file.name)}
              </div>
              <span className="file-name">{file.name}</span>
            </div>
            {activeFile?.path === file.path && (
              <div className="active-indicator">●</div>
            )}
          </motion.div>
        ))}
        
        {files.length === 0 && (
          <div className="empty-state">
            <FileText size={32} />
            <p>No files open</p>
            <small>Create or open a file to get started</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
