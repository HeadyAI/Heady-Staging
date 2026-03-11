/**
 * OnboardingWizard — Reusable wrapper component
 * 
 * Wraps the onboarding page with auth state detection and
 * automatic stage routing based on cookie state.
 */

'use client';

import React, { useEffect, useState } from 'react';

interface WizardProps {
  children: React.ReactNode;
}

interface OnboardingState {
  stage: string;
  stageIndex: number;
  complete: boolean;
  provider: string;
}

export function OnboardingWizard({ children }: WizardProps) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkState() {
      try {
        const res = await fetch('/api/onboarding');
        if (res.ok) {
          const data = await res.json();
          setState(data);
          
          // If complete, redirect to dashboard
          if (data.complete) {
            window.location.href = '/dashboard';
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check onboarding state:', err);
      }
      setLoading(false);
    }
    checkState();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a1a',
        color: '#00d4ff',
      }}>
        <div className="loading-spinner">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          </svg>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
