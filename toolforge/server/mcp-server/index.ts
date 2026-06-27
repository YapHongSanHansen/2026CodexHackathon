#!/usr/bin/env node
/**
 * ToolForge — standalone stdio MCP server.
 *
 * Exposes a ToolForge-generated legacy-app REST API as callable MCP tools.
 * It fetches the project's MCP manifest from a running ToolForge backend, then
 * proxies each MCP `CallTool` request to the generated REST API (`/g/:project/...`)
 * using the project's API key.
 *
 * Launched as:
 *   npm run mcp -- --project <projectId> --server <url> --key <apiKey>
 *
 * IMPORTANT: stdout is owned by the stdio transport. All diagnostics go to
 * stderr (console.error) only — never console.log.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { McpManifest, McpTool } from '../../shared/types.ts';

/* ----------------------------- CLI / env config ----------------------------- */

interface Config {
  project: string;
  server: string;
  key: string;
}

const DEFAULT_SERVER = 'http://localhost:8787';

const USAGE = `ToolForge MCP server — expose a generated legacy-app API as MCP tools.

Usage:
  npm run mcp -- --project <projectId> --server <url> --key <apiKey>

Flags:
  --project <id>    ToolForge project id (required)   [env TOOLFORGE_PROJECT]
  --server  <url>   ToolForge backend base URL        [env TOOLFORGE_SERVER]
                    (default ${DEFAULT_SERVER})
  --key     <key>   Generated API key (required)       [env TOOLFORGE_KEY]
`;

/**
 * Parse `--flag value` and `--flag=value` style args from a raw argv slice.
 * Returns a map of the flags we care about.
 */
function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      // --flag=value
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      // --flag value  (consume the next token if it isn't another flag)
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[name] = next;
        i++;
      } else {
        out[name] = 'true';
      }
    }
  }
  return out;
}

function resolveConfig(): Config {
  // process.argv = [node, scriptPath, ...userArgs]
  const flags = parseFlags(process.argv.slice(2));

  const project = flags.project ?? process.env.TOOLFORGE_PROJECT ?? '';
  const server = (flags.server ?? process.env.TOOLFORGE_SERVER ?? DEFAULT_SERVER).replace(
    /\/+$/,
    '',
  );
  const key = flags.key ?? process.env.TOOLFORGE_KEY ?? '';

  const missing: string[] = [];
  if (!project) missing.push('--project');
  if (!key) missing.push('--key');

  if (missing.length > 0) {
    console.error(`Error: missing required argument(s): ${missing.join(', ')}\n`);
    console.error(USAGE);
    process.exit(1);
  }

  return { project, server, key };
}

/* ----------------------------- Manifest fetch ----------------------------- */

async function fetchManifest(cfg: Config): Promise<McpManifest> {
  const url = `${cfg.server}/api/mcp/${encodeURIComponent(cfg.project)}/manifest`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(
      `Failed to reach ToolForge backend at ${url}\n` +
        `Is the ToolForge server running and the project deployed?\n` +
        `Cause: ${errorMessage(err)}`,
    );
    process.exit(1);
  }

  if (!res.ok) {
    console.error(
      `Manifest request failed: ${res.status} ${res.statusText} (${url})\n` +
        `Is the project id correct and the project deployed?`,
    );
    process.exit(1);
  }

  try {
    const manifest = (await res.json()) as McpManifest;
    if (!manifest || !Array.isArray(manifest.tools)) {
      throw new Error('manifest is missing a "tools" array');
    }
    return manifest;
  } catch (err) {
    console.error(`Failed to parse manifest JSON from ${url}\nCause: ${errorMessage(err)}`);
    process.exit(1);
  }
}

/* ----------------------------- Request building ----------------------------- */

interface BuiltRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Build the HTTP request to the generated API for a given tool + arguments.
 *
 * - Substitutes every `{param}` placeholder in `tool.rest.path` with the matching
 *   (URL-encoded) argument value, removing those keys from the leftover args.
 * - GET/DELETE → leftover args become a query string.
 * - POST/PUT   → leftover args become a JSON body.
 */
function buildRequest(
  cfg: Config,
  tool: McpTool,
  rawArgs: Record<string, unknown>,
): BuiltRequest {
  const method = (tool.rest.method || 'GET').toUpperCase();
  const leftover: Record<string, unknown> = { ...rawArgs };

  // Substitute path params, e.g. /customers/{code} -> /customers/ACME01
  const resolvedPath = tool.rest.path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = leftover[name];
    if (value === undefined || value === null) {
      throw new Error(`Missing required path parameter "${name}" for tool "${tool.name}"`);
    }
    delete leftover[name];
    return encodeURIComponent(String(value));
  });

  let url = `${cfg.server}/g/${encodeURIComponent(cfg.project)}${resolvedPath}`;
  const headers: Record<string, string> = { 'x-api-key': cfg.key };
  let body: string | undefined;

  const hasBodyMethod = method === 'POST' || method === 'PUT';

  if (hasBodyMethod) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(leftover ?? {});
  } else {
    // GET / DELETE etc. — remaining args become query params.
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(leftover)) {
      if (v === undefined || v === null) continue;
      qs.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    const query = qs.toString();
    if (query) url += `?${query}`;
  }

  return { method, url, headers, body };
}

/* ----------------------------- Helpers ----------------------------- */

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** MCP text-content result shape (kept local to avoid SDK type coupling). */
function textResult(payload: unknown, isError: boolean) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    isError,
  };
}

/* ----------------------------- Main ----------------------------- */

async function main(): Promise<void> {
  const cfg = resolveConfig();
  const manifest = await fetchManifest(cfg);

  const toolsByName = new Map<string, McpTool>(manifest.tools.map((t) => [t.name, t]));

  const server = new Server(
    { name: manifest.name, version: manifest.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: manifest.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    try {
      const tool = toolsByName.get(name);
      if (!tool) {
        return textResult({ error: `Unknown tool: ${name}` }, true);
      }

      const built = buildRequest(cfg, tool, args);

      const res = await fetch(built.url, {
        method: built.method,
        headers: built.headers,
        body: built.body,
      });

      const status = res.status;
      const raw = await res.text();
      let data: unknown = raw;
      try {
        data = raw.length > 0 ? JSON.parse(raw) : null;
      } catch {
        // Non-JSON response — keep the raw text.
        data = raw;
      }

      return textResult(
        { request: { method: built.method, url: built.url }, status, data },
        status >= 400,
      );
    } catch (err) {
      return textResult({ error: errorMessage(err), tool: name }, true);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`ToolForge MCP server ready: ${manifest.tools.length} tools`);
}

main().catch((err) => {
  console.error(`Fatal: ${errorMessage(err)}`);
  process.exit(1);
});
