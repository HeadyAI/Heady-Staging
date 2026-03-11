export interface ServiceManifest {
  name: string;
  version: string;
  port: number;
  summary: string;
  routes: string[];
  dependencies: string[];
}

export interface HealthSnapshot {
  service: string;
  healthy: boolean;
  readinessScore: number;
  driftScore: number;
  checkedAt: string;
}

export interface RouteDecision {
  taskType: string;
  pool: 'hot' | 'warm' | 'cold';
  service: string;
  confidence: number;
}
