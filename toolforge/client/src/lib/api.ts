// lib/api.ts — thin typed wrappers around the ToolForge control API.
// Vite proxies /api and /g to the backend, so all URLs are relative.
import {
  API,
  type PipelineState,
  type Deliverables,
  type McpManifest,
} from '@shared/types';

export interface TestResult {
  request: { method: string; url: string };
  status: number;
  data: unknown;
}

async function asJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && body !== null && 'error' in body
        ? String((body as Record<string, unknown>).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export interface CreateProjectBody {
  projectName?: string;
  appName?: string;
  mode?: 'demo' | 'live';
  authorized?: boolean;
}

export const apiClient = {
  createProject(body: CreateProjectBody): Promise<PipelineState> {
    return fetch(API.projects, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => asJson<PipelineState>(r));
  },

  getProject(id: string): Promise<PipelineState> {
    return fetch(API.project(id)).then((r) => asJson<PipelineState>(r));
  },

  run(id: string): Promise<{ ok: true }> {
    return fetch(API.run(id), { method: 'POST' }).then((r) =>
      asJson<{ ok: true }>(r),
    );
  },

  approve(id: string, approvedPaths?: string[]): Promise<Deliverables> {
    return fetch(API.approve(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(approvedPaths ? { approvedPaths } : {}),
    }).then((r) => asJson<Deliverables>(r));
  },

  test(id: string, tool: string, args: Record<string, unknown>): Promise<TestResult> {
    return fetch(API.test(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tool, args }),
    }).then((r) => asJson<TestResult>(r));
  },

  mcpManifest(id: string): Promise<McpManifest> {
    return fetch(API.mcpManifest(id)).then((r) => asJson<McpManifest>(r));
  },
};
