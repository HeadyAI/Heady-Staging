/**
 * Heady Onboarding Wizard — Main Page
 * 
 * 5-stage sequential flow:
 * 1. Create Account (username → @headyme.com)
 * 2. Email Config (secure client vs forwarding)
 * 3. Permissions (cloud-only vs hybrid)
 * 4. Buddy Setup (custom UI, context switcher)
 * 5. Complete (welcome → dashboard, API key in Settings)
 * 
 * NO API KEY is displayed during onboarding.
 */

'use client';

import React, { useState, useEffect } from 'react';

const PHI = 1.6180339887;

// ── Types ────────────────────────────────────────────────

interface StageData {
  [key: string]: unknown;
}

// ── Stage Components ─────────────────────────────────────

function StageCreateAccount({
  onComplete,
}: {
  onComplete: (data: StageData) => void;
}) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    const cleaned = username.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(cleaned)) {
      setError('3-30 characters, start with letter/number');
      setChecking(false);
      return;
    }

    onComplete({ username: cleaned });
  };

  return (
    <div className="stage-content">
      <div className="stage-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h2>Create Your Heady Identity</h2>
      <p className="stage-desc">
        Choose a username. This becomes your <strong>@headyme.com</strong> address
        and your identity across all Heady services.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            autoFocus
            className="heady-input"
          />
          <span className="input-suffix">@headyme.com</span>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={checking || username.length < 3} className="heady-btn">
          {checking ? 'Checking...' : 'Claim Username'}
        </button>
      </form>
    </div>
  );
}

function StageEmailConfig({
  onComplete,
  onBack,
}: {
  onComplete: (data: StageData) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState('secure-client');
  const [forwardTo, setForwardTo] = useState('');

  return (
    <div className="stage-content">
      <div className="stage-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
      <h2>Email Configuration</h2>
      <p className="stage-desc">
        How should your @headyme.com email work?
      </p>
      <div className="option-cards">
        <label className={`option-card ${mode === 'secure-client' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="emailMode"
            value="secure-client"
            checked={mode === 'secure-client'}
            onChange={() => setMode('secure-client')}
          />
          <strong>Secure Heady Email</strong>
          <span>Built-in encrypted email client. Full privacy.</span>
        </label>
        <label className={`option-card ${mode === 'forward-provider' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="emailMode"
            value="forward-provider"
            checked={mode === 'forward-provider'}
            onChange={() => setMode('forward-provider')}
          />
          <strong>Forward to Provider</strong>
          <span>Forward to your Google/GitHub/etc. email.</span>
        </label>
        <label className={`option-card ${mode === 'forward-custom' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="emailMode"
            value="forward-custom"
            checked={mode === 'forward-custom'}
            onChange={() => setMode('forward-custom')}
          />
          <strong>Forward to Custom</strong>
          <span>Send to any email address you choose.</span>
        </label>
      </div>
      {(mode === 'forward-provider' || mode === 'forward-custom') && (
        <input
          type="email"
          value={forwardTo}
          onChange={(e) => setForwardTo(e.target.value)}
          placeholder="your@email.com"
          className="heady-input"
        />
      )}
      <div className="btn-row">
        <button onClick={onBack} className="heady-btn-ghost">Back</button>
        <button
          onClick={() => onComplete({ emailMode: mode, forwardTo: forwardTo || null })}
          className="heady-btn"
          disabled={
            (mode !== 'secure-client' && !forwardTo)
          }
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StagePermissions({
  onComplete,
  onBack,
}: {
  onComplete: (data: StageData) => void;
  onBack: () => void;
}) {
  const [runtimeMode, setRuntimeMode] = useState('cloud-only');

  return (
    <div className="stage-content">
      <div className="stage-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      </div>
      <h2>Permissions &amp; Runtime</h2>
      <p className="stage-desc">
        Should Heady operate entirely in the cloud, or also access your local filesystem?
      </p>
      <div className="option-cards">
        <label className={`option-card ${runtimeMode === 'cloud-only' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="runtime"
            value="cloud-only"
            checked={runtimeMode === 'cloud-only'}
            onChange={() => setRuntimeMode('cloud-only')}
          />
          <strong>Cloud Only</strong>
          <span>All compute and storage in HeadyCloud. No local access needed.</span>
        </label>
        <label className={`option-card ${runtimeMode === 'hybrid' ? 'selected' : ''}`}>
          <input
            type="radio"
            name="runtime"
            value="hybrid"
            checked={runtimeMode === 'hybrid'}
            onChange={() => setRuntimeMode('hybrid')}
          />
          <strong>Hybrid (Cloud + Device)</strong>
          <span>Cloud compute with optional local filesystem access via HeadyOS agent.</span>
        </label>
      </div>
      <div className="btn-row">
        <button onClick={onBack} className="heady-btn-ghost">Back</button>
        <button onClick={() => onComplete({ runtimeMode })} className="heady-btn">
          Continue
        </button>
      </div>
    </div>
  );
}

function StageBuddySetup({
  onComplete,
  onBack,
}: {
  onComplete: (data: StageData) => void;
  onBack: () => void;
}) {
  const [buddyName, setBuddyName] = useState('Buddy');
  const [theme, setTheme] = useState('sacred-geometry');
  const [contexts, setContexts] = useState<string[]>(['default']);
  const [newContext, setNewContext] = useState('');

  const addContext = () => {
    if (newContext.trim() && !contexts.includes(newContext.trim())) {
      setContexts([...contexts, newContext.trim()]);
      setNewContext('');
    }
  };

  const themes = [
    { id: 'sacred-geometry', name: 'Sacred Geometry', color: '#00d4ff' },
    { id: 'midnight', name: 'Midnight', color: '#4c8fff' },
    { id: 'aurora', name: 'Aurora', color: '#8b5cf6' },
    { id: 'ember', name: 'Ember', color: '#f97316' },
    { id: 'forest', name: 'Forest', color: '#22c55e' },
  ];

  return (
    <div className="stage-content">
      <div className="stage-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
      </div>
      <h2>Customize HeadyBuddy</h2>
      <p className="stage-desc">
        Name your AI companion, pick a theme, and create context profiles
        for quick-switching between work modes.
      </p>

      <div className="form-section">
        <label>Buddy Name</label>
        <input
          type="text"
          value={buddyName}
          onChange={(e) => setBuddyName(e.target.value)}
          className="heady-input"
          placeholder="Name your companion"
        />
      </div>

      <div className="form-section">
        <label>Theme</label>
        <div className="theme-grid">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-btn ${theme === t.id ? 'selected' : ''}`}
              style={{ '--theme-color': t.color } as React.CSSProperties}
              onClick={() => setTheme(t.id)}
            >
              <span className="theme-dot" />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label>Context Profiles</label>
        <p className="hint">Create switchable contexts (e.g., "coding", "research", "writing")</p>
        <div className="context-list">
          {contexts.map((c) => (
            <span key={c} className="context-tag">
              {c}
              {c !== 'default' && (
                <button onClick={() => setContexts(contexts.filter(x => x !== c))}>×</button>
              )}
            </span>
          ))}
        </div>
        <div className="input-group">
          <input
            type="text"
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addContext())}
            className="heady-input"
            placeholder="Add context..."
          />
          <button onClick={addContext} className="heady-btn-sm">Add</button>
        </div>
      </div>

      <div className="btn-row">
        <button onClick={onBack} className="heady-btn-ghost">Back</button>
        <button
          onClick={() => onComplete({ buddyName, theme, contexts })}
          className="heady-btn"
          disabled={!buddyName.trim()}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StageComplete() {
  return (
    <div className="stage-content stage-complete">
      <div className="stage-icon success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h2>Welcome to Heady</h2>
      <p className="stage-desc">
        Your workspace is fully configured. Your API key is available in
        <strong> Settings → API</strong> whenever you need it.
      </p>
      <div className="quick-links">
        <a href="/dashboard" className="heady-btn">Go to Dashboard</a>
        <a href="/settings/api" className="heady-btn-ghost">View API Key</a>
      </div>
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStage, setCurrentStage] = useState(0);
  const [stageData, setStageData] = useState<Record<string, StageData>>({});
  const [loading, setLoading] = useState(false);

  const stages = [
    { id: 'create-account', label: 'Account' },
    { id: 'email-config', label: 'Email' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'buddy-setup', label: 'Buddy' },
    { id: 'complete', label: 'Complete' },
  ];

  const handleStageComplete = async (stageId: string, data: StageData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageId, data }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('Stage failed:', err);
        setLoading(false);
        return;
      }

      setStageData((prev) => ({ ...prev, [stageId]: data }));
      setCurrentStage((prev) => Math.min(prev + 1, stages.length - 1));
    } catch (error) {
      console.error('Onboarding error:', error);
    }

    setLoading(false);
  };

  const goBack = () => setCurrentStage((prev) => Math.max(prev - 1, 0));

  // Phi-weighted progress
  const progress = Math.pow((currentStage + 1) / stages.length, 1 / PHI) * 100;

  return (
    <div className="onboarding-container">
      {/* Background effects */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage indicators */}
      <div className="stage-indicators">
        {stages.map((s, i) => (
          <div
            key={s.id}
            className={`stage-indicator ${
              i < currentStage ? 'done' : i === currentStage ? 'active' : ''
            }`}
          >
            <span className="stage-num">{i + 1}</span>
            <span className="stage-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Stage content */}
      <div className={`stage-panel ${loading ? 'loading' : ''}`}>
        {currentStage === 0 && (
          <StageCreateAccount
            onComplete={(data) => handleStageComplete('create-account', data)}
          />
        )}
        {currentStage === 1 && (
          <StageEmailConfig
            onComplete={(data) => handleStageComplete('email-config', data)}
            onBack={goBack}
          />
        )}
        {currentStage === 2 && (
          <StagePermissions
            onComplete={(data) => handleStageComplete('permissions', data)}
            onBack={goBack}
          />
        )}
        {currentStage === 3 && (
          <StageBuddySetup
            onComplete={(data) => handleStageComplete('buddy-setup', data)}
            onBack={goBack}
          />
        )}
        {currentStage === 4 && <StageComplete />}
      </div>

      <style jsx>{`
        .onboarding-container {
          min-height: 100vh;
          background: #0a0a1a;
          color: #e8e8f0;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }
        .bg-grid {
          position: fixed; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 61.8px 61.8px;
          z-index: 0;
        }
        .bg-glow {
          position: fixed; top: -30%; left: -10%; width: 60%; height: 60%;
          background: radial-gradient(circle, rgba(0,212,255,0.1), transparent 60%);
          z-index: 0; animation: drift 20s ease-in-out infinite alternate;
        }
        @keyframes drift { to { transform: translate(20%, 10%); } }
        .progress-bar {
          position: fixed; top: 0; left: 0; right: 0; height: 3px;
          background: rgba(255,255,255,0.05); z-index: 100;
        }
        .progress-fill {
          height: 100%; background: linear-gradient(90deg, #00d4ff, #4c8fff);
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 0 2px 2px 0;
        }
        .stage-indicators {
          display: flex; gap: 2rem; margin: 2rem 0 3rem;
          position: relative; z-index: 1;
        }
        .stage-indicator {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          opacity: 0.3; transition: opacity 0.3s;
        }
        .stage-indicator.active { opacity: 1; }
        .stage-indicator.done { opacity: 0.7; }
        .stage-num {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.2); font-size: 0.875rem;
        }
        .stage-indicator.active .stage-num {
          background: linear-gradient(135deg, #00d4ff, #4c8fff);
          border-color: transparent;
        }
        .stage-indicator.done .stage-num {
          background: rgba(0,212,255,0.2); border-color: #00d4ff;
        }
        .stage-label { font-size: 0.75rem; color: #8888aa; }
        .stage-panel {
          max-width: 540px; width: 100%; position: relative; z-index: 1;
          background: rgba(20,20,50,0.6); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 2.5rem; backdrop-filter: blur(20px);
        }
        .stage-panel.loading { opacity: 0.6; pointer-events: none; }
        .stage-content h2 { font-size: 1.5rem; margin: 1rem 0 0.5rem; }
        .stage-desc { color: #8888aa; margin-bottom: 1.5rem; line-height: 1.6; }
        .stage-icon {
          width: 48px; height: 48px; color: #00d4ff;
        }
        .stage-icon svg { width: 100%; height: 100%; }
        .success-icon { color: #22c55e; }
        .heady-input {
          width: 100%; padding: 0.75rem 1rem; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: #e8e8f0; font-size: 1rem; outline: none;
          transition: border-color 0.2s;
        }
        .heady-input:focus { border-color: #00d4ff; }
        .input-group { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .input-suffix { color: #8888aa; white-space: nowrap; }
        .heady-btn {
          padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #00d4ff, #4c8fff);
          border: none; border-radius: 8px; color: white; font-size: 1rem;
          cursor: pointer; transition: opacity 0.2s; text-decoration: none;
          display: inline-block;
        }
        .heady-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .heady-btn:hover:not(:disabled) { opacity: 0.9; }
        .heady-btn-ghost {
          padding: 0.75rem 1.5rem; background: transparent;
          border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
          color: #e8e8f0; font-size: 1rem; cursor: pointer;
          text-decoration: none; display: inline-block;
        }
        .heady-btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }
        .btn-row { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .error-text { color: #ef4444; font-size: 0.875rem; margin: 0.5rem 0; }
        .option-cards { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
        .option-card {
          padding: 1rem; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; gap: 0.25rem;
        }
        .option-card:hover { border-color: rgba(255,255,255,0.2); }
        .option-card.selected {
          border-color: #00d4ff; background: rgba(0,212,255,0.05);
        }
        .option-card input { display: none; }
        .option-card strong { font-size: 0.95rem; }
        .option-card span { font-size: 0.85rem; color: #8888aa; }
        .form-section { margin-bottom: 1.5rem; }
        .form-section label { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; display: block; }
        .hint { font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; }
        .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem; }
        .theme-btn {
          padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: #e8e8f0; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.85rem;
        }
        .theme-btn.selected { border-color: var(--theme-color); background: rgba(255,255,255,0.08); }
        .theme-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--theme-color);
        }
        .context-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
        .context-tag {
          padding: 0.25rem 0.75rem; background: rgba(0,212,255,0.1);
          border: 1px solid rgba(0,212,255,0.3); border-radius: 16px;
          font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .context-tag button {
          background: none; border: none; color: #8888aa; cursor: pointer;
          font-size: 1rem; padding: 0;
        }
        .quick-links { display: flex; gap: 1rem; margin-top: 1.5rem; }
      `}</style>
    </div>
  );
}
