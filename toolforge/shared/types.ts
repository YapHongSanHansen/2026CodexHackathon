// shared/types.ts — ToolForge contract.
// SINGLE SOURCE OF TRUTH for both client and server. Do not fork these shapes.

/* ----------------------------- Agent groups ----------------------------- */
export type GroupId = 'A' | 'B' | 'C' | 'D';

export interface AgentGroupMeta {
  id: GroupId;
  name: string;
  short: string;
  input: string;
  output: string; // artifact filename
  description: string;
}

export const AGENT_GROUPS: AgentGroupMeta[] = [
  {
    id: 'A',
    name: 'Vision / OCR',
    short: 'Vision',
    input: 'Screenshots + recordings',
    output: 'mock-spec.md',
    description:
      'OCR + vision analysis of screens, fields, buttons and flows; drafts how the app appears to work.',
  },
  {
    id: 'B',
    name: 'Interaction',
    short: 'Interact',
    input: 'Live app (sandbox VM)',
    output: 'behavior-spec.md',
    description:
      'Operates the app like a human (computer-use), exploring menus/forms; documents observed inputs/outputs. Independent of A.',
  },
  {
    id: 'C',
    name: 'Observation',
    short: 'Observe',
    input: 'Network traffic + UI states',
    output: 'internal-spec.md',
    description:
      'Observational reverse-engineering: network/protocol capture + UI-state mapping. No binary decompilation by default.',
  },
  {
    id: 'D',
    name: 'Synthesis & Generation',
    short: 'Synthesise',
    input: 'behavior + internal (+ mock)',
    output: 'synthesis-spec.md',
    description:
      'Reconciles B + C (A as vision context), fills gaps, and generates the REST API + API key and MCP server manifest.',
  },
];

/* ----------------------------- Pipeline runtime ----------------------------- */
export type StageStatus = 'queued' | 'running' | 'done' | 'error';

export interface StageState {
  id: GroupId;
  status: StageStatus;
  progress: number; // 0..100
  message: string;
  startedAt?: number;
  finishedAt?: number;
}

export type PipelinePhase =
  | 'created'
  | 'ingesting'
  | 'analyzing'
  | 'awaiting_review'
  | 'deploying'
  | 'deployed'
  | 'error';

export interface PipelineState {
  id: string;
  projectName: string;
  appName: string;
  phase: PipelinePhase;
  authorized: boolean;
  mode: 'demo' | 'live';
  stages: Record<GroupId, StageState>;
  artifacts: Artifact[];
  draft?: DraftDeliverables; // proposed before approval
  deliverables?: Deliverables; // active after approval
  createdAt: number;
  updatedAt: number;
}

export type ArtifactKind = 'markdown' | 'openapi' | 'mcp-manifest' | 'docs';

export interface Artifact {
  id: string;
  groupId: GroupId;
  name: string; // e.g. mock-spec.md
  kind: ArtifactKind;
  content: string;
}

/* ----------------------------- Deliverables (Group D output) ----------------------------- */
export interface GeneratedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string; // e.g. /invoices
  summary: string;
  mcpTool: string; // e.g. create_invoice
  approved: boolean;
  sourceScreen?: string;
  confidence: number; // 0..1 triangulation confidence
}

export interface DraftDeliverables {
  endpoints: GeneratedEndpoint[];
  openapi: any; // OpenAPI 3.0 document
  mcpManifest: McpManifest;
  docsMarkdown: string;
}

export interface Deliverables extends DraftDeliverables {
  apiKey: string;
  apiBaseUrl: string; // /g/:id
  mcpUrl: string; // /api/mcp/:id/manifest
  mcpCommand: string; // shell command to launch the MCP server
  deployedAt: number;
}

/* ----------------------------- MCP ----------------------------- */
export type JsonSchema = Record<string, any>;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema; // JSON Schema (object)
  rest: { method: string; path: string };
}

export interface McpManifest {
  name: string;
  version: string;
  description: string;
  tools: McpTool[];
}

/* ----------------------------- SSE events ----------------------------- */
export type LogLevel = 'info' | 'warn' | 'ok';

export type PipelineEvent =
  | { type: 'state'; state: PipelineState }
  | { type: 'log'; groupId?: GroupId; level?: LogLevel; message: string; ts: number }
  | { type: 'error'; message: string };

/* ----------------------------- Legacy domain (Sage UBS Accounting v9) ----------------------------- */
export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
  balance: number;
}

export interface StockItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  unitPrice: number;
  qtyOnHand: number;
}

export interface InvoiceLine {
  stockCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerCode: string;
  date: string; // ISO yyyy-mm-dd
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'unpaid' | 'partial' | 'paid';
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  customerCode: string;
  date: string;
  amount: number;
  method: string;
}

export interface CapturedScreen {
  id: string;
  title: string;
  kind: string;
  fields: { label: string; type: string; sample?: string }[];
  actions: string[];
  notes?: string;
}

/* ----------------------------- Control API routes ----------------------------- */
export const API = {
  projects: '/api/projects',
  project: (id: string) => `/api/projects/${id}`,
  run: (id: string) => `/api/projects/${id}/run`,
  events: (id: string) => `/api/projects/${id}/events`,
  approve: (id: string) => `/api/projects/${id}/approve`,
  test: (id: string) => `/api/projects/${id}/test`,
  generatedBase: (id: string) => `/g/${id}`,
  mcpManifest: (id: string) => `/api/mcp/${id}/manifest`,
};

export const SERVER_PORT = 8787;
export const CLIENT_PORT = 5173;
