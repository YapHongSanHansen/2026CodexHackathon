// server/src/index.ts — ToolForge control plane.
// Wires together the project registry, the 4-group pipeline, the generators, the generated REST
// API, SSE live progress, and the MCP manifest endpoint.
import './env'; // MUST be first: loads .env before any module reads process.env
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { SERVER_PORT, type PipelineEvent, type PipelineState, type McpManifest } from './shared';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from './store';
import { runAnalysis, deploy } from './pipeline';
import { createGeneratedApiRouter } from './generated-api';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

/* ----------------------------- SSE plumbing ----------------------------- */
const subscribers = new Map<string, Set<Response>>();

function broadcast(projectId: string, event: PipelineEvent): void {
  const set = subscribers.get(projectId);
  if (!set) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      /* client gone; cleaned up on close */
    }
  }
}

function emitterFor(projectId: string) {
  return (event: PipelineEvent) => broadcast(projectId, event);
}

/* ----------------------------- Control API ----------------------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'toolforge', port: SERVER_PORT }));

app.get('/api/projects', (_req, res) => res.json(listProjects()));

app.post('/api/projects', (req: Request, res: Response) => {
  const { projectName, appName, mode, authorized } = req.body ?? {};
  const state = createProject({
    projectName: projectName || 'UBS Acct v9',
    appName: appName || 'Sage UBS Accounting v9',
    mode: mode === 'live' ? 'live' : 'demo',
    authorized: !!authorized,
  });
  res.json(state);
});

app.get('/api/projects/:id', (req, res) => {
  const state = getProject(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });
  res.json(state);
});

// SSE stream of pipeline events. Sends the current state immediately on connect.
app.get('/api/projects/:id/events', (req, res) => {
  const state = getProject(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  let set = subscribers.get(req.params.id);
  if (!set) {
    set = new Set();
    subscribers.set(req.params.id, set);
  }
  set.add(res);

  // initial snapshot
  res.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);

  const keepalive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* noop */
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepalive);
    set?.delete(res);
  });
});

// Kick off the 4-group pipeline (fire-and-forget; progress streams over SSE).
app.post('/api/projects/:id/run', (req, res) => {
  const state = getProject(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });
  if (!state.authorized) {
    return res.status(400).json({ error: 'Authorization required: confirm you may integrate this app.' });
  }
  if (state.phase === 'analyzing' || state.phase === 'ingesting') {
    return res.status(409).json({ error: 'Pipeline already running' });
  }

  const emit = emitterFor(state.id);
  runAnalysis(state.id, emit).catch((err: unknown) => {
    const fresh = getProject(state.id);
    if (fresh) {
      fresh.phase = 'error';
      updateProject(fresh);
      emit({ type: 'state', state: fresh });
    }
    emit({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  });

  res.status(202).json({ ok: true });
});

// Human-in-the-loop approval gate → deploy.
app.post('/api/projects/:id/approve', async (req, res) => {
  const state = getProject(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });
  if (!state.draft) return res.status(400).json({ error: 'Nothing to approve yet — run the pipeline first.' });

  const approvedPaths: string[] | undefined = Array.isArray(req.body?.approvedPaths)
    ? req.body.approvedPaths
    : undefined;

  for (const ep of state.draft.endpoints) {
    ep.approved =
      !approvedPaths || approvedPaths.length === 0
        ? true
        : approvedPaths.includes(ep.path) || approvedPaths.includes(ep.mcpTool);
  }
  state.phase = 'deploying';
  updateProject(state);
  broadcast(state.id, { type: 'state', state });

  try {
    const deliverables = await deploy(state.id);
    const fresh = getProject(state.id)!;
    broadcast(state.id, { type: 'state', state: fresh });
    res.json(deliverables);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// MCP manifest for the standalone MCP server / external clients.
app.get('/api/mcp/:id/manifest', (req, res) => {
  const state = getProject(req.params.id);
  const manifest: McpManifest | undefined = state?.deliverables?.mcpManifest ?? state?.draft?.mcpManifest;
  if (!manifest) return res.status(404).json({ error: 'No MCP manifest — deploy the project first.' });
  res.json(manifest);
});

// Test playground proxy: resolves an MCP tool to a generated-API call using the project's key.
app.post('/api/projects/:id/test', async (req, res) => {
  const state = getProject(req.params.id);
  if (!state) return res.status(404).json({ error: 'Project not found' });
  if (!state.deliverables) return res.status(400).json({ error: 'Deploy the project before testing.' });

  const toolName: string = req.body?.tool;
  const args: Record<string, unknown> = { ...(req.body?.args ?? {}) };
  const tool = state.deliverables.mcpManifest.tools.find((t) => t.name === toolName);
  if (!tool) return res.status(400).json({ error: `Unknown tool: ${toolName}` });

  const method = tool.rest.method.toUpperCase();
  let path = tool.rest.path;
  // substitute {param} path segments
  path = path.replace(/\{([^}]+)\}/g, (_m, key: string) => {
    const v = args[key];
    delete args[key];
    return encodeURIComponent(v == null ? '' : String(v));
  });

  let url = `http://localhost:${SERVER_PORT}/g/${state.id}${path}`;
  const init: RequestInit = { method, headers: { 'x-api-key': state.deliverables.apiKey } };

  if (method === 'GET' || method === 'DELETE') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v == null) continue;
      qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    const q = qs.toString();
    if (q) url += `?${q}`;
  } else {
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
    init.body = JSON.stringify(args);
  }

  try {
    const r = await fetch(url, init);
    const text = await r.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    res.json({ request: { method, url }, status: r.status, data });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/* ----------------------------- Generated data plane ----------------------------- */
app.use('/g/:projectId', createGeneratedApiRouter());

/* ----------------------------- Boot ----------------------------- */
app.listen(SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ToolForge control plane on http://localhost:${SERVER_PORT}`);
});

export type { PipelineState };
