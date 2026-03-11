/**
 * ContextSwitcher — Quick-switch between HeadyBuddy context profiles
 * 
 * Configured during onboarding Stage 4 (Buddy Setup).
 * Accessible from the dashboard header after onboarding is complete.
 * 
 * Each context profile has its own:
 * - System prompt overlay
 * - UI theme variant
 * - Tool preferences
 * - Memory scope
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

const PHI = 1.6180339887;

interface ContextProfile {
  id: string;
  name: string;
  description?: string;
  color: string;
  systemPrompt?: string;
  tools?: string[];
  active: boolean;
}

interface ContextSwitcherProps {
  profiles?: ContextProfile[];
  onSwitch?: (profileId: string) => void;
  compact?: boolean;
}

const DEFAULT_PROFILES: ContextProfile[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'General-purpose assistant',
    color: '#00d4ff',
    active: true,
  },
];

export function ContextSwitcher({
  profiles = DEFAULT_PROFILES,
  onSwitch,
  compact = false,
}: ContextSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState(
    profiles.find(p => p.active) ?? profiles[0]
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSwitch = async (profile: ContextProfile) => {
    setActiveProfile(profile);
    setIsOpen(false);

    // Notify HeadyBuddy of context switch
    try {
      await fetch('/api/buddy/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId: profile.id }),
      });
    } catch {
      console.warn('Context switch API unreachable');
    }

    onSwitch?.(profile.id);
  };

  return (
    <div className="ctx-switcher" ref={dropdownRef}>
      <button
        className="ctx-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch context"
      >
        <span
          className="ctx-dot"
          style={{ background: activeProfile.color }}
        />
        {!compact && <span className="ctx-name">{activeProfile.name}</span>}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
          stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="ctx-dropdown">
          <div className="ctx-header">Context Profiles</div>
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`ctx-option ${p.id === activeProfile.id ? 'active' : ''}`}
              onClick={() => handleSwitch(p)}
            >
              <span className="ctx-dot" style={{ background: p.color }} />
              <div className="ctx-info">
                <span className="ctx-option-name">{p.name}</span>
                {p.description && (
                  <span className="ctx-option-desc">{p.description}</span>
                )}
              </div>
              {p.id === activeProfile.id && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                  stroke="currentColor" strokeWidth="2" className="ctx-check">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
          <a href="/settings/buddy" className="ctx-manage">
            Manage Profiles
          </a>
        </div>
      )}

      <style jsx>{`
        .ctx-switcher { position: relative; }
        .ctx-trigger {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.375rem 0.75rem; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: #e8e8f0; cursor: pointer; font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        .ctx-trigger:hover { border-color: rgba(255,255,255,0.2); }
        .ctx-dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .ctx-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ctx-dropdown {
          position: absolute; top: calc(100% + 4px); right: 0;
          min-width: 240px; background: rgba(20,20,50,0.95);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          backdrop-filter: blur(20px); overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          z-index: 1000;
        }
        .ctx-header {
          padding: 0.75rem 1rem; font-size: 0.75rem;
          color: #8888aa; text-transform: uppercase; letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ctx-option {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 0.75rem 1rem; background: none;
          border: none; color: #e8e8f0; cursor: pointer; text-align: left;
          transition: background 0.15s;
        }
        .ctx-option:hover { background: rgba(255,255,255,0.05); }
        .ctx-option.active { background: rgba(0,212,255,0.05); }
        .ctx-info { flex: 1; display: flex; flex-direction: column; }
        .ctx-option-name { font-size: 0.875rem; }
        .ctx-option-desc { font-size: 0.75rem; color: #8888aa; }
        .ctx-check { color: #00d4ff; flex-shrink: 0; }
        .ctx-manage {
          display: block; padding: 0.75rem 1rem; font-size: 0.8rem;
          color: #8888aa; text-decoration: none; text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          transition: color 0.15s;
        }
        .ctx-manage:hover { color: #00d4ff; }
      `}</style>
    </div>
  );
}
