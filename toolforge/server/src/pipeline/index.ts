// server/src/pipeline/index.ts — public API + the A→B→C→D orchestrator.
//
// runAnalysis() drives the four agent groups, animating per-stage progress and
// streaming progress by mutating the project's PipelineState (via the store) and
// emitting {type:'state'} / {type:'log'} events. It ends in phase 'awaiting_review'.
//
// deploy() is called after a human approves draft endpoints: it builds the final
// Deliverables from the approved subset, mints + registers an API key, and flips
// the project to phase 'deployed'.
import type {
  PipelineEvent,
  PipelineState,
  StageState,
  GroupId,
  LogLevel,
  Artifact,
  Deliverables,
  GeneratedEndpoint,
} from '../shared';
import { APP_META } from '../shared';
import { getProject, updateProject, setApiKey, uid } from '../store';
import {
  proposeEndpoints,
  buildOpenApi,
  buildMcpManifest,
  buildDocs,
} from '../generators';
import { mockSpec, behaviorSpec, internalSpec, synthesisSpec } from './artifacts';
import { liveModeAvailable, generateArtifact, modelId } from '../llm';

/* ----------------------------- helpers ----------------------------- */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Per-group metadata used by the orchestrator: artifact filename, kind, llm kind. */
interface GroupPlan {
  id: GroupId;
  artifactName: string;
  llmKind: 'mock' | 'behavior' | 'internal' | 'synthesis';
  /** Believable streaming log lines, emitted between progress steps. */
  logs: { level: LogLevel; message: string }[];
  /** Demo-mode markdown generator (used unless live generation succeeds). */
  demo: (endpoints: GeneratedEndpoint[]) => string;
}

/** Build a fresh Artifact (uid keeps ids unique across a run). */
function makeArtifact(
  groupId: GroupId,
  name: string,
  kind: Artifact['kind'],
  content: string,
): Artifact {
  return { id: uid('art'), groupId, name, kind, content };
}

/**
 * Resolve the markdown for a group: try live generation when in live mode and
 * available, otherwise (or on any null/throw) use the deterministic demo spec.
 */
async function resolveMarkdown(
  state: PipelineState,
  plan: GroupPlan,
  endpoints: GeneratedEndpoint[],
  emit: (e: PipelineEvent) => void,
): Promise<string> {
  const demoMarkdown = plan.demo(endpoints);

  if (state.mode === 'live' && liveModeAvailable()) {
    try {
      const live = await generateArtifact(plan.llmKind, buildLiveContext());
      if (live && live.trim().length > 0) {
        emit({
          type: 'log',
          groupId: plan.id,
          level: 'ok',
          message: `Live generation (${modelId()}) produced ${plan.artifactName}.`,
          ts: Date.now(),
        });
        return live;
      }
      emit({
        type: 'log',
        groupId: plan.id,
        level: 'warn',
        message: `Live generation unavailable for ${plan.artifactName}; using demo spec.`,
        ts: Date.now(),
      });
    } catch {
      emit({
        type: 'log',
        groupId: plan.id,
        level: 'warn',
        message: `Live generation failed for ${plan.artifactName}; using demo spec.`,
        ts: Date.now(),
      });
    }
  }

  return demoMarkdown;
}

/** Compact context string handed to the LLM in live mode. */
function buildLiveContext(): string {
  return mockSpec(); // the vision mock is the richest single description of the captured app
}

/* ----------------------------- group plans ----------------------------- */

function groupPlans(): GroupPlan[] {
  return [
    {
      id: 'A',
      artifactName: 'mock-spec.md',
      llmKind: 'mock',
      demo: () => mockSpec(),
      logs: [
        { level: 'info', message: 'OCR pass on ‘Customer Maintenance’ — 5 fields, 5 actions detected' },
        { level: 'info', message: 'OCR pass on ‘Invoice Entry’ — 6 fields, 4 actions detected' },
        { level: 'info', message: 'Vision flagged 3 lookup fields as low-confidence (targets unknown)' },
        { level: 'ok', message: 'Mock spec drafted from 5 screens + 2 recordings' },
      ],
    },
    {
      id: 'B',
      artifactName: 'behavior-spec.md',
      llmKind: 'behavior',
      demo: () => behaviorSpec(),
      logs: [
        { level: 'info', message: 'Drove Customer Maintenance: Add→Save round-trips in 1.2s' },
        { level: 'info', message: "Validated 'Credit Limit' rejects non-numeric ('abc' → error)" },
        { level: 'info', message: 'Confirmed SST = 6% fixed; partial payments are allowed' },
        { level: 'ok', message: 'Behaviour spec captured from live sandbox runs' },
      ],
    },
    {
      id: 'C',
      artifactName: 'internal-spec.md',
      llmKind: 'internal',
      demo: () => internalSpec(),
      logs: [
        {
          level: 'info',
          message:
            'Observed UI-state transitions; inferred entities: Customer, Invoice, StockItem, Payment (no DB access)',
        },
        { level: 'info', message: 'Passive capture: app is fully local — no outbound HTTP observed' },
        { level: 'warn', message: 'Observational only — no binary decompilation performed' },
        { level: 'ok', message: 'Internal model inferred from UI + I/O observation' },
      ],
    },
    {
      id: 'D',
      artifactName: 'synthesis-spec.md',
      llmKind: 'synthesis',
      demo: (endpoints) => synthesisSpec(endpoints),
      logs: [
        { level: 'info', message: 'Reconciling B+C: 11 candidate operations, 2 conflicts resolved, 0 gaps' },
        { level: 'info', message: 'Adopted B over vision: SST fixed 6%, partial payments allowed' },
        { level: 'ok', message: 'Generated REST surface + MCP manifest (pending human review)' },
      ],
    },
  ];
}

/* ----------------------------- public API ----------------------------- */

/**
 * Run Groups A→B→C→D. Streams progress by mutating the project's state and
 * emitting events. Ends in phase 'awaiting_review'. Total wall-clock ≈ 10–16s.
 */
export async function runAnalysis(
  projectId: string,
  emit: (e: PipelineEvent) => void,
): Promise<void> {
  const state = getProject(projectId);
  if (!state) {
    emit({ type: 'error', message: `Project ${projectId} not found.` });
    return;
  }

  // ---- 1. Ingest -------------------------------------------------------
  state.phase = 'ingesting';
  updateProject(state);
  emit({ type: 'state', state });

  emit({
    type: 'log',
    level: 'info',
    message: `Authorized capture of ‘${state.appName}’ (${APP_META.platform}).`,
    ts: Date.now(),
  });
  emit({
    type: 'log',
    level: 'info',
    message: 'Captured 5 screens, 2 screen recordings (4m12s).',
    ts: Date.now(),
  });
  emit({
    type: 'log',
    level: 'ok',
    message: 'Ingest complete — no API/SDK/DB available; observational pipeline engaged.',
    ts: Date.now(),
  });
  await sleep(1200);

  // ---- 2. Analyze (A → B → C → D) -------------------------------------
  state.phase = 'analyzing';
  updateProject(state);
  emit({ type: 'state', state });

  // Draft endpoints are proposed once (all approved:false) and used by Group D's
  // synthesis spec; deploy() rebuilds from the approved subset later.
  const draftEndpoints = proposeEndpoints();

  for (const plan of groupPlans()) {
    const stage: StageState = state.stages[plan.id];
    stage.status = 'running';
    stage.progress = 0;
    stage.startedAt = Date.now();
    stage.message = 'Running';
    updateProject(state);
    emit({ type: 'state', state });

    // Animate progress 0→100 over ~2–4s, interleaving group-specific logs.
    const steps = plan.logs.length;
    for (let i = 0; i < steps; i++) {
      await sleep(550 + Math.floor(Math.random() * 350));
      const log = plan.logs[i];
      emit({ type: 'log', groupId: plan.id, level: log.level, message: log.message, ts: Date.now() });
      stage.progress = Math.min(100, Math.round(((i + 1) / steps) * 100));
      stage.message = log.message;
      updateProject(state);
      emit({ type: 'state', state });
    }

    // Produce this group's primary artifact (live or demo markdown).
    const markdown = await resolveMarkdown(state, plan, draftEndpoints, emit);
    state.artifacts.push(makeArtifact(plan.id, plan.artifactName, 'markdown', markdown));

    // ---- Group D also produces the draft deliverables + viewer artifacts ----
    if (plan.id === 'D') {
      const openapi = buildOpenApi(state.appName, draftEndpoints);
      const mcpManifest = buildMcpManifest(state.appName, state.id, draftEndpoints);
      const docsMarkdown = buildDocs(state.appName, draftEndpoints);

      state.draft = {
        endpoints: draftEndpoints,
        openapi,
        mcpManifest,
        docsMarkdown,
      };

      state.artifacts.push(
        makeArtifact('D', 'openapi.json', 'openapi', JSON.stringify(openapi, null, 2)),
      );
      state.artifacts.push(
        makeArtifact('D', 'mcp-manifest.json', 'mcp-manifest', JSON.stringify(mcpManifest, null, 2)),
      );
      state.artifacts.push(makeArtifact('D', 'auto-docs.md', 'docs', docsMarkdown));

      emit({
        type: 'log',
        groupId: 'D',
        level: 'ok',
        message: `Proposed ${draftEndpoints.length} endpoints (awaiting approval).`,
        ts: Date.now(),
      });
    }

    stage.status = 'done';
    stage.progress = 100;
    stage.finishedAt = Date.now();
    stage.message = `${plan.artifactName} ready`;
    updateProject(state);
    emit({ type: 'state', state });
  }

  // ---- 3. Hand off to human review ------------------------------------
  state.phase = 'awaiting_review';
  updateProject(state);
  emit({ type: 'state', state });
  emit({
    type: 'log',
    level: 'ok',
    message: 'Analysis complete — review the proposed endpoints, then approve to deploy.',
    ts: Date.now(),
  });
}

/**
 * Build final Deliverables from the approved draft endpoints, mint + register an
 * API key, set phase 'deployed', and return the Deliverables.
 */
export async function deploy(projectId: string): Promise<Deliverables> {
  const state = getProject(projectId);
  if (!state) {
    throw new Error(`Project ${projectId} not found.`);
  }
  if (!state.draft) {
    throw new Error(`Project ${projectId} has no draft to deploy. Run analysis first.`);
  }

  state.phase = 'deploying';
  updateProject(state);

  // Keep only approved endpoints; if none were approved, treat all as approved
  // (safety fallback so deploy is never a no-op).
  const all = state.draft.endpoints;
  const approvedSubset = all.filter((e) => e.approved === true);
  const effective = approvedSubset.length > 0 ? approvedSubset : all.map((e) => ({ ...e, approved: true }));

  // Rebuild generated outputs from the approved subset only.
  const openapi = buildOpenApi(state.appName, effective);
  const mcpManifest = buildMcpManifest(state.appName, state.id, effective);
  const docsMarkdown = buildDocs(state.appName, effective);

  const apiKey = uid('key');
  const id = state.id;

  const deliverables: Deliverables = {
    endpoints: effective,
    openapi,
    mcpManifest,
    docsMarkdown,
    apiKey,
    apiBaseUrl: '/g/' + id,
    mcpUrl: '/api/mcp/' + id + '/manifest',
    mcpCommand:
      'npm run mcp -- --project ' + id + ' --server http://localhost:8787 --key ' + apiKey,
    deployedAt: Date.now(),
  };

  setApiKey(id, apiKey);
  state.deliverables = deliverables;
  state.phase = 'deployed';
  updateProject(state);

  return deliverables;
}
