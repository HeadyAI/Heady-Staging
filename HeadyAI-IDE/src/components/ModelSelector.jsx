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
// ║  FILE: HeadyAI-IDE/src/components/ModelSelector.jsx              ║
// ║  LAYER: frontend/src/components                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React from 'react';
import { Brain, Cpu, Eye, MessageSquare } from 'lucide-react';

const ModelSelector = ({ selectedModel, onModelChange }) => {
  const models = [
    {
      id: 'heady-brain',
      name: 'Heady Brain',
      description: 'Primary AI model for general coding assistance',
      icon: Brain,
      color: '#6366f1'
    },
    {
      id: 'heady-conductor',
      name: 'Heady Conductor',
      description: 'Task orchestration and workflow management',
      icon: Cpu,
      color: '#8b5cf6'
    },
    {
      id: 'heady-pattern',
      name: 'Heady Pattern',
      description: 'Code pattern recognition and analysis',
      icon: Eye,
      color: '#ec4899'
    },
    {
      id: 'heady-critique',
      name: 'Heady Critique',
      description: 'Code review and quality assessment',
      icon: MessageSquare,
      color: '#fbbf24'
    }
  ];

  return (
    <div className="model-selector">
      <h3>AI Model Selection</h3>
      <div className="model-grid">
        {models.map((model) => {
          const Icon = model.icon;
          return (
            <div
              key={model.id}
              className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
              onClick={() => onModelChange(model.id)}
            >
              <div 
                className="model-icon"
                style={{ color: model.color }}
              >
                <Icon size={24} />
              </div>
              <div className="model-info">
                <h4>{model.name}</h4>
                <p>{model.description}</p>
              </div>
              {selectedModel === model.id && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModelSelector;
