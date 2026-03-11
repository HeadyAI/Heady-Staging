/**
 * Heady™ Onboarding Stage Definitions
 * 
 * Each stage has validation rules, API endpoints, and phi-scaled timing.
 * The flow enforces sequential completion — no skipping to API key.
 */

const PHI = 1.6180339887;

export interface StageConfig {
  id: string;
  index: number;
  title: string;
  description: string;
  path: string;
  apiEndpoint: string;
  requiredFields: string[];
  estimatedSeconds: number; // phi-scaled per stage
  canGoBack: boolean;
}

export const ONBOARDING_STAGES: StageConfig[] = [
  {
    id: 'create-account',
    index: 0,
    title: 'Create Your Heady™ Account',
    description: 'Choose your username to get your @headyme.com identity',
    path: '/onboarding/create-account',
    apiEndpoint: '/api/onboarding/create-account',
    requiredFields: ['username'],
    estimatedSeconds: Math.round(30 * PHI), // ~49s
    canGoBack: false,
  },
  {
    id: 'email-config',
    index: 1,
    title: 'Email Configuration',
    description: 'Set up your @headyme.com email — use our secure client or forward to your provider',
    path: '/onboarding/email-config',
    apiEndpoint: '/api/onboarding/email-config',
    requiredFields: ['emailMode', 'forwardTo'],
    estimatedSeconds: Math.round(30 * PHI ** 2), // ~78s
    canGoBack: true,
  },
  {
    id: 'permissions',
    index: 2,
    title: 'Permissions & Runtime',
    description: 'Choose how Heady™ operates — cloud-only or hybrid with your filesystem',
    path: '/onboarding/permissions',
    apiEndpoint: '/api/onboarding/permissions',
    requiredFields: ['runtimeMode'],
    estimatedSeconds: Math.round(30 * PHI), // ~49s
    canGoBack: true,
  },
  {
    id: 'buddy-setup',
    index: 3,
    title: 'Customize HeadyBuddy',
    description: 'Personalize your AI companion — themes, contexts, and quick-switch profiles',
    path: '/onboarding/buddy-setup',
    apiEndpoint: '/api/onboarding/buddy-setup',
    requiredFields: ['buddyName', 'theme'],
    estimatedSeconds: Math.round(30 * PHI ** 3), // ~127s
    canGoBack: true,
  },
  {
    id: 'complete',
    index: 4,
    title: 'Welcome to Heady™',
    description: 'Your workspace is ready — API key available in Settings',
    path: '/onboarding/complete',
    apiEndpoint: '/api/onboarding/complete',
    requiredFields: [],
    estimatedSeconds: Math.round(30 / PHI), // ~19s
    canGoBack: false,
  },
];

/**
 * Get next stage after completing current one
 */
export function getNextStage(currentId: string): StageConfig | null {
  const currentIndex = ONBOARDING_STAGES.findIndex(s => s.id === currentId);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_STAGES.length - 1) {
    return null;
  }
  return ONBOARDING_STAGES[currentIndex + 1];
}

/**
 * Get stage by ID
 */
export function getStage(id: string): StageConfig | null {
  return ONBOARDING_STAGES.find(s => s.id === id) ?? null;
}

/**
 * Validate that all required fields are present for a stage
 */
export function validateStageData(
  stageId: string,
  data: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const stage = getStage(stageId);
  if (!stage) return { valid: false, missing: ['UNKNOWN_STAGE'] };

  const missing = stage.requiredFields.filter(
    field => !data[field] || (typeof data[field] === 'string' && (data[field] as string).trim() === '')
  );

  return { valid: missing.length === 0, missing };
}

/**
 * Email configuration modes
 */
export enum EmailMode {
  SECURE_CLIENT = 'secure-client',    // Use Heady's built-in encrypted email
  FORWARD_PROVIDER = 'forward-provider', // Forward to the OAuth provider's email
  FORWARD_CUSTOM = 'forward-custom',  // Forward to a custom address
}

/**
 * Runtime permission modes
 */
export enum RuntimeMode {
  CLOUD_ONLY = 'cloud-only',          // All compute in HeadyCloud
  HYBRID = 'hybrid',                   // Cloud + local filesystem access
}

/**
 * Progress calculation using phi ratio
 */
export function calculateProgress(currentStageIndex: number): number {
  const total = ONBOARDING_STAGES.length;
  // Phi-weighted progress feels faster at the start, slower at customization
  const linearProgress = (currentStageIndex + 1) / total;
  const phiWeighted = Math.pow(linearProgress, 1 / PHI);
  return Math.round(phiWeighted * 100);
}
