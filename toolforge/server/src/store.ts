// server/src/store.ts — in-memory project registry (single source of runtime state).
// Owned by the integration layer; imported by pipeline + generated-api. Do not redefine elsewhere.
import type { PipelineState } from './shared';
import { AGENT_GROUPS } from './shared';

let counter = 1;
const projects = new Map<string, PipelineState>();
const apiKeyToProject = new Map<string, string>();

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
}

export function createProject(opts: {
  projectName: string;
  appName: string;
  mode?: 'demo' | 'live';
  authorized?: boolean;
}): PipelineState {
  const id = uid('proj');
  const now = Date.now();
  const stages = {} as PipelineState['stages'];
  for (const g of AGENT_GROUPS) {
    stages[g.id] = { id: g.id, status: 'queued', progress: 0, message: 'Queued' };
  }
  const state: PipelineState = {
    id,
    projectName: opts.projectName,
    appName: opts.appName,
    phase: 'created',
    authorized: !!opts.authorized,
    mode: opts.mode ?? 'demo',
    stages,
    artifacts: [],
    createdAt: now,
    updatedAt: now,
  };
  projects.set(id, state);
  return state;
}

export function getProject(id: string): PipelineState | undefined {
  return projects.get(id);
}

export function listProjects(): PipelineState[] {
  return [...projects.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function updateProject(state: PipelineState): PipelineState {
  state.updatedAt = Date.now();
  projects.set(state.id, state);
  return state;
}

export function setApiKey(projectId: string, apiKey: string): void {
  apiKeyToProject.set(apiKey, projectId);
}

export function projectIdForApiKey(apiKey: string): string | undefined {
  return apiKeyToProject.get(apiKey);
}
